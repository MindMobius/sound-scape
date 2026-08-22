# Flutter 客户端 MVP

## 目标

客户端 MVP 用一条完整纵切验证声景的核心日常路径：选择预置场景，开始持续聆听，在不中断播放的前提下调节整体感受或单个声音层，并通过系统媒体控件和倒计时继续使用。它不是 Web 原型迁移，也不包含尚未接入的生成、账号或同步能力。

## 模块边界

```text
SoundscapeHomeScreen
        |
        v
SoundscapeController <----- SoundscapeAudioHandler
                              |          |
                              |          +-- AudioSession / AudioService
                              v
                       SoundscapeRuntime
                              |
                              +-- environment bus
                              +-- texture bus
                              +-- event bus
                              |
                              v
        SceneRecipe + SoundLibrary + SoundscapeMix
```

- `domain/` 定义场景、声音层、预设和目录，不依赖 Flutter 页面或 SoLoud 句柄。
- `data/` 读取版本化素材清单、保存本地状态，并把用户音频复制到内容寻址目录。
- `audio/soundscape_mix.dart` 是纯函数混音规则，可独立测试。
- `audio/soundscape_scheduler.dart` 负责确定性随机流、分段选择、随机静默和纹理变化；`audio/soundscape_runtime.dart` 只执行计划并管理句柄。
- `audio/soundscape_audio_handler.dart` 管理系统音频会话、媒体通知、中断、耳机拔出和睡眠倒计时。
- `ui/` 只依赖 `SoundscapeController` 和不可变快照，不持有或销毁原生音频引擎。

## 状态所有权

播放器、展开页和沉浸态始终来自 `SoundscapePlayerSurface` 同一根节点。UI 形态变化不能创建第二个播放条，也不能搬移音频状态。页面销毁或系统锁屏后，倒计时和播放状态仍由 `SoundscapeAudioHandler` 持有。

场景级轻重、简繁、逐层存在感、开关、听感、动态素材、收藏和用户片刻由 `SoundscapeRuntime` 持有，并通过 `SoundscapeStateStore` 保存为 schema v2 的版本化本地状态。音频文件不写入状态：打包素材由声音清单管理，用户素材流式计算 SHA-256 后复制到应用支持目录的 `imports/`，状态只保存受控路径和元数据。

当前目录规模使用单一原子 JSON 文件即可完成可靠恢复，并保留 schema v1 到 v2 迁移。接入下载声音包、增量更新和大量索引后，保持 `SoundscapeStateStore` 接口并将索引迁移到 Drift；这是一条由容量触发的演进边界，不是当前 MVP 的缺失依赖。

加入或移除动态声层时，运行时先淡出当前总线、重建句柄，再淡入恢复。损坏音频导致加载失败时会回滚场景状态并恢复原声景；删除用户素材只允许命中 `Application Support/imports/<sha256>.<ext>` 的精确托管文件，用户原文件不在删除边界内。

## 平台边界

- Android 使用 `AudioServiceActivity`、媒体播放前台服务和预测返回回调。
- iOS 声明 `audio` 后台模式并使用 playback 类型音频会话；仍需 macOS 与真机验收。
- Windows 复用同一运行时，但没有移动端后台服务语义。
- 当前 `LoadMode.disk` 适合打包素材纵切。生产素材库应先下载到应用持久目录，再通过内容寻址文件加载。

## 发布前门槛

1. 在 Android 真机和 iPhone 上完成长时间播放、锁屏、来电、蓝牙切换及系统回收验收。
2. 完成发布签名、包标识、隐私说明、崩溃与性能观测。
3. 为后续新增或替换的每份音频继续建立来源、授权、哈希与可发布范围记录，不能降低当前正式声音包的门槛。
4. 接入下载素材仓库时补齐包版本、增量更新、失败恢复和索引迁移；当前内置与用户素材不依赖该服务。
5. 只有在现有运行时无法满足调度或 DSP 指标时，再引入原生或 Rust 音频层。

## 开发反馈环

客户端采用“桌面热重载、无设备自动测试、移动端阶段验收、真机发布验收”的分层反馈环。日常 UI、动效、状态和编排修改不启动全部模拟器；原生后台音频与系统生命周期也不能被桌面或 Widget Test 代替。命令、覆盖矩阵和升级规则见 `../development/flutter-workflow.md`。
