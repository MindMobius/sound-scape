# Flutter 客户端技术调研

更新时间：2026-08-21

## 结论

Flutter 适合承担声景的 iOS / Android 客户端，但不应替换当前公开 Web。公开 Web 继续负责无需安装的发现和试听；Flutter 客户端负责本地素材、持续编排、后台播放、锁屏控制和离线使用。

第一阶段不直接复刻完整产品，而是先做一个音频纵切原型。推荐组合是：

- `flutter_soloud 4.1.7`：多声部、精确调度、混音总线、滤镜、空间声场和最终混音采集。
- `audio_service 0.18.19`：Android 前台媒体服务、iOS 后台音频、锁屏和耳机控制。
- `audio_session 0.2.4`：音频焦点、中断、拔出耳机、静音键和系统路由策略。
- `drift 2.34.3`：声景清单、素材索引、设置和迁移；音频文件本身不写入数据库。
- `path_provider 2.1.6`：把受管理的音频素材放在应用支持目录，而不是临时缓存。
- `file_selector 1.1.0`：跨桌面与移动端选择用户音频；选中后立即复制，不长期持有外部临时引用。
- `crypto 3.0.7`：流式计算 SHA-256，用于内容寻址、去重和下载校验。

`just_audio 0.10.6` 保留为单轨媒体播放的备选，不作为声景主引擎。它支持多个播放器和无缝播放列表，生态与后台播放路径更成熟，但它的核心抽象仍是媒体播放器，不直接提供声景需要的统一引擎时钟、混音总线、逐层滤镜和程序化事件调度。

当前判断是“值得做 Flutter 纵切原型”，不是“已经证明生产可用”。`flutter_soloud + audio_service` 的官方集成样例在 2026 年才补齐，Android 17 又进一步收紧后台音频，所以后台稳定性必须由真机验收决定。

## 为什么选择 flutter_soloud

| 声景需求 | flutter_soloud | just_audio |
| --- | --- | --- |
| 同时播放多个声音层 | 原生支持多个 voice | 可创建多个 player |
| 无缝循环和局部循环区间 | 原生支持 | 支持单曲/列表循环和 clip |
| 统一时钟上的精确事件调度 | `playScheduled` / `playClocked` | 不以此为核心能力 |
| 分组音量和分组效果 | Mixing Bus | 需要在多个 player 外自行协调 |
| 每层滤镜、染色和空间变化 | 原生滤镜、3D 声音、pan | 平台能力不统一 |
| 生成流式音频接入 | PCM / MP3 / Ogg 流 | 自定义字节流 |
| 导出当前完整混音 | 支持 master mixer output capture | 不是核心能力 |
| 后台和锁屏 | 需要接 `audio_service` | 需要接 `audio_service` 或简化封装 |

`flutter_soloud` 4.1.7 还提供 engine clock、批量计划播放、计划淡化和 mixing bus。它正好能把“轻重、简繁”实现成函数，而不是让 UI 直接操纵一堆播放器。

## 运行时边界

```text
Flutter View
    |
    v
Scene ViewModel -------- Generation API
    |                         |
    v                         v
SceneRepository         Job / Manifest Service
    |                         |
    +----------+--------------+
               v
       SoundscapeAudioHandler       audio_service 拥有后台生命周期
               |
               v
          SceneRuntime              解释 SceneRecipe、调度和切场
          /    |    \
         v     v     v
      Bed Bus Event Bus Media Bus   flutter_soloud 混音总线
               |
               v
          System audio output
```

必须坚持以下边界：

- Widget 不持有 `AudioSource`、`SoundHandle` 或调度计时器。
- `SoundscapeAudioHandler` 拥有引擎初始化、暂停、恢复、中断和销毁；页面 `dispose()` 不能 `deinit()` 音频引擎。
- 锁屏把整处声景表示为一个逻辑 `MediaItem`，不把每一层伪装成歌曲，也不提供进度条和 seek。
- 倒计时由后台 AudioHandler 执行淡出和暂停，不能依赖当前页面仍然存活。
- 新声景先在独立 runtime 中预载，完成校验后再与当前 runtime 做等功率切换；生成和下载不能抢占当前播放。

上游 `flutter_soloud` 的后台示例已经把 `SoLoudAudioHandler` 接入 `AudioService.init()`，但示例仍在页面 `dispose()` 中调用 `SoLoud.instance.deinit()`。正式实现不能照抄这处生命周期安排。

## SceneRecipe

后端输出声明式配方，客户端本地执行。第一版至少需要这些字段：

```json
{
  "schemaVersion": 1,
  "sceneId": "rain-cabin",
  "seed": 41827,
  "macros": {
    "intensity": 0.46,
    "richness": 0.62
  },
  "layers": [
    {
      "id": "roof-rain",
      "kind": "bed",
      "assetHash": "sha256:...",
      "bus": "environment",
      "baseGain": 0.72,
      "loop": { "startMs": 1200, "endMs": 28700 },
      "behavior": {
        "gainRange": [0.58, 0.82],
        "panRange": [-0.08, 0.08],
        "changeSeconds": [12, 28]
      },
      "effects": [
        { "type": "reverb", "mix": 0.16 }
      ]
    }
  ]
}
```

`SceneRuntime` 负责把配方编译为执行计划：

- `bed` 是连续底层，使用循环区间和缓慢包络。
- `event` 按密度、最短间隔、距离和随机种子在 engine clock 上提前排程。
- `media` 是用户添加的歌曲、广播或录音，通过独立 bus 接受收音机、电视、胆机等设备质感。
- `intensity` 和 `richness` 只调用版本化映射函数，分别改变总能量、事件密度、活跃层数和变化幅度；UI 不认识工程参数。
- 相同配方与 seed 应可重现大体一致的编排，但不要求输出成为一条固定长音频。

## 本地素材与数据

推荐布局：

```text
Application Support/
  soundscape.db
  assets/
    <sha256>.<ext>
  artwork/
    <sha256>.<ext>
  imports/
    <sha256>.<ext>
```

- Drift 保存 `SceneRecipe`、素材 hash、来源、授权信息、下载状态、用户设置和最后播放状态。
- 受管理音频保存为内容寻址文件，下载完成后先校验 hash，再原子加入素材索引。
- 用户从文件选择器添加声音后，立即复制进 `imports/`；不能长期依赖外部 picker 返回的临时路径或 `content://` 引用。
- 可重新下载的中间文件才放 cache；离线声景依赖的正式素材放 Application Support。
- 大环境底层用磁盘流式加载，短事件音效可按场景预载到内存。

这也规避了 `flutter_soloud` 文档明确提到的风险：`loadAsset()` / `loadUrl()` 会先创建临时文件，移动系统可能清理它。生产路径应先下载到自己的持久素材库，再通过 `loadFile()` 使用。

## UI 和视觉

- 不把当前 Web DOM 或 GSAP 动画机械翻译成 Flutter；复用的是播放器状态模型、视觉素材和设计 token。
- 播放条、播放页、沉浸模式仍是同一全局播放器的三种披露程度，AudioHandler 是唯一播放状态源。
- 第一版用 Flutter 自带 `AnimationController`、`AnimatedSwitcher` 和自定义曲线即可，不先引入通用动效库。
- 膜片视觉可用 `FragmentProgram` / `FragmentShader` 迁移。Flutter 不支持自定义 vertex shader，但当前 Web 的 vertex shader只是全屏 UV 透传，核心材质逻辑都在 fragment shader 中，不构成结构性阻碍。
- 多 pass 膜片不是音频纵切原型的前置条件；先用正式场景位图和单 pass 片元效果，并保留静态降级，再单独验证完整材质。

## 后台播放的已知风险

### Android

`audio_service` 会声明 `mediaPlayback` 前台服务并连接系统媒体控制。Android 官方要求 `FOREGROUND_SERVICE` 与 `FOREGROUND_SERVICE_MEDIA_PLAYBACK` 权限；Android 12 以后不允许任意从后台重启前台服务，Android 17 又继续收紧后台音频行为。

因此必须验证：

- 用户在前台主动开始播放后锁屏，声景持续运行。
- 暂停后从通知恢复，不触发 `ForegroundServiceStartNotAllowedException`。
- 来电、导航 duck、蓝牙切换和耳机拔出时状态正确。
- UI 进程离开前台后，AudioHandler 仍然拥有完整 SceneRuntime。
- 厂商省电策略下是否需要明确提示，而不是静默失效。

### iOS

iOS 需要 `AVAudioSessionCategory.playback` 和 `UIBackgroundModes = audio`。系统只允许后台时间用于实际播放；声景持续有音频输出，符合这个模型，但不能把后台权限当通用任务执行器。iOS 构建和真机验证需要 macOS、Xcode 和实际设备，当前 Windows 主机无法完成该验收。

## 纵切原型门槛

先只使用仓库已有的雨夜木屋和深夜海岸素材，完成以下验证后再建设正式 UI：

1. 同时运行 6 至 10 个声音层，包含连续底层、随机事件和用户媒体层。
2. 用 mixing bus 实现整体音量、轻重、简繁与至少两种设备质感。
3. 使用 engine clock 排程事件，连续聆听 30 分钟无明显接缝、堆叠或计时漂移。
4. 在 Android 真机完成锁屏、通知播放/暂停、倒计时、来电中断、耳机拔出和蓝牙切换。
5. 在 iPhone 真机重复后台与音频路由测试。
6. 记录 CPU、内存、音频 underrun、发热和耗电基线；先形成设备基线，再决定正式阈值。
7. 验证 SceneRecipe 和素材下载后可完全离线运行，后端不可用不影响当前声景。
8. 验证新声景生成完成只通知，不自动切换或中断正在聆听的内容。

只要第 3、4 或 5 项无法稳定通过，就不继续用纯 Flutter 插件堆补丁，而是把 `SceneRuntime` 接口保留，评估自有 miniaudio / AVAudioEngine / Oboe 原生实现。

## 本机准备状态

- 当前 Windows 主机没有安装 Flutter，也没有发现 `ANDROID_HOME` 或 `ANDROID_SDK_ROOT`。
- Java 21 已安装。
- 2026-08-21 官方 Windows stable 清单为 Flutter `3.47.1` / Dart `3.13.1`，满足 `flutter_soloud` 要求的 Flutter `>= 3.41.0`。
- 国内网络安装时使用 Flutter 官方文档列出的 CFUG 镜像：`PUB_HOSTED_URL=https://pub.flutter-io.cn` 与 `FLUTTER_STORAGE_BASE_URL=https://storage.flutter-io.cn`，并保留官方 SHA-256 校验。

下一步应先安装 Flutter 3.47.1 stable 与 Android SDK，再创建 `apps/mobile/` 纵切原型；在音频门槛通过前，不迁移完整 Web 界面。

## 主要来源

- [Flutter Windows stable 发布清单](https://storage.googleapis.com/flutter_infra_release/releases/releases_windows.json)
- [Flutter 中国网络镜像说明](https://docs.flutter.dev/community/china)
- [Flutter 官方应用架构指南](https://docs.flutter.dev/app-architecture/guide)
- [Flutter 片元着色器](https://docs.flutter.dev/ui/design/graphics/fragment-shaders)
- [flutter_soloud 4.1.7](https://pub.dev/packages/flutter_soloud)
- [flutter_soloud 后台音频集成样例](https://github.com/alnitak/flutter_soloud/blob/main/example/lib/audio_context/audio_context.dart)
- [flutter_soloud Mixing Buses](https://docs.page/alnitak/flutter_soloud_docs/advanced/mixing_bus)
- [flutter_soloud Effects & Filters](https://docs.page/alnitak/flutter_soloud_docs/advanced/filters)
- [flutter_soloud Loading Audio](https://docs.page/alnitak/flutter_soloud_docs/audio/loading)
- [audio_service 0.18.19](https://pub.dev/packages/audio_service)
- [audio_session 0.2.4](https://pub.dev/packages/audio_session)
- [just_audio 0.10.6](https://pub.dev/packages/just_audio)
- [Drift 2.34.3](https://pub.dev/packages/drift)
- [path_provider 2.1.6](https://pub.dev/packages/path_provider)
- [Android 后台媒体播放](https://developer.android.com/media/media3/session/background-playback)
- [Android 17 后台音频收紧](https://developer.android.com/about/versions/17/changes/bg-audio)
- [Apple AVAudioSession](https://developer.apple.com/documentation/avfaudio/avaudiosession)
- [Flutter iOS 工具链](https://docs.flutter.dev/platform-integration/ios/setup)
