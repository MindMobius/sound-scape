# 声景 Flutter 客户端 MVP

`apps/client/` 是声景面向 Android、iOS 和 Windows 的本地优先客户端纵切。它验证的不是普通歌单播放器，而是同一条持续声景在首页、展开播放器、沉浸聆听和系统媒体控制之间保持连续。

## 当前能力

- 雨夜木屋、深夜海岸两个可真实播放的预置场景。
- 环境、纹理、随机事件三类 Mixing Bus，以及轻重、简繁和逐层存在感控制。
- 13 份逐文件核验的 CC0 录音，以及版本化声音素材清单、稳定素材与分段 ID、哈希和发布资格校验。
- 每层独立的确定性调度、多片段防连续重复、随机静默和桥接片段插槽。
- 全局单例播放条，同一根节点向上展开为播放器并进入沉浸态。
- 无歌曲式进度条、seek、上一首或下一首。
- 总音量、睡眠倒计时、系统音频焦点、中断恢复和耳机拔出暂停。
- Android/iOS 后台音频声明与系统媒体通知；Windows 使用同一 Flutter 界面和音频运行时。
- 展开播放器内的环境、事件、媒介和“我的声音”素材库，不另建割裂的编辑页。
- 收藏、逐层开关与远近，以及自然、Hi-Fi、胆机、老式收音机、雪花电视、单声道喇叭和耳机空间等真实 DSP 听感。
- 内容寻址音频导入、动态声层和“自己的片刻”保存、应用、重命名与删除；重启后恢复同一份本地状态。

## 本地运行

项目通过 `.flutter-version` 锁定 Flutter `3.47.1`。从仓库根目录初始化一次：

```powershell
npm run client:setup
```

日常开发只运行本机桌面端：

```powershell
npm run client:dev
```

推荐从 VS Code 选择“声景：桌面日常开发”并按 `F5` 启动。仓库已配置保存后自动热重载；终端命令则可在运行期间按 `r` 热重载。Android 模拟器或设备只在阶段验收时运行：

```powershell
npm run client:devices
npm run client:android
```

当连接多台 Android 设备时，可明确指定设备：

```powershell
node tools/flutter.mjs run android YOUR_DEVICE_ID
```

SDK 依次从仓库 `.fvm/flutter_sdk`、`FLUTTER_ROOT`、`PATH` 和 Android `local.properties` 查找。国内镜像只注入 Flutter 子进程，不改写系统级配置。

## 开发与验收

日常修改先运行无设备检查：

```powershell
npm run client:check
```

Widget Test 会批量覆盖小屏、横屏、平板、桌面、深色和 1.3 倍字号。完成一个平台能力阶段后再构建对应产物：

```powershell
npm run client:integration:windows
npm run client:build:windows
npm run client:build:android
npm run client:build:ios
```

连接 Android 设备后可用 `npm run client:integration:android` 运行同一条原生纵切。

后台播放、锁屏媒体控制、音频焦点、耳机拔出、蓝牙切换和系统回收不能由 Widget Test 证明，发布前仍必须在 Android 与 iPhone 真机验收。完整调试分层见 `docs/development/flutter-workflow.md`。

## 运行时边界

- `SoundscapeAudioHandler` 持有系统媒体会话、音频焦点和倒计时生命周期。
- `SoundscapeRuntime` 持有 SoLoud、声音句柄、三类总线和动态事件调度。
- `SoundscapeController` 是界面唯一依赖的播放意图接口。
- `SoundscapeScene` 定义运行时模型；`SoundscapeCatalog` 消费由根场景清单和 `playable-scenes.v1.json` 确定性生成的目录，不在客户端手写场景副本。
- `SoundLibrary` 负责声音来源、许可证、版本、哈希和分段；`SceneRecipe` 只通过稳定 ID 引用它。
- `SoundscapeScheduler` 把配方编译为可复现的纹理变化与事件计划。
- 页面只发送播放、暂停、换景、总音量、轻重、简繁、素材导入、动态声层和逐层听感意图，不持有音频句柄。

## MVP 边界

当前没有自然语言 Agent、在线下载素材仓库、同步、账号或发布安装链路。内置的 13 份录音以 `assets/audio/` 为唯一母版，每份都在 `sound-library.v1.json` 与 `THIRD_PARTY.md` 记录固定上游地址、作者、许可证和 SHA-256；Flutter 包内副本由根工具生成且不提交。用户导入始终视为本机私有素材，不能进入发布包或被再次分发。

当前少量内置素材、导入记录和用户片刻使用 schema v2 的原子 JSON 状态文件。只有接入可下载声音包、增量更新和大量索引后才迁移到 Drift；现有 `SoundscapeStateStore` 与内容寻址文件边界会保持不变，避免为了未来规模提前引入数据库。

开源项目的采纳内容与许可证边界见 `../../docs/research/open-source-reference-adoption.md`。

iOS 已配置后台音频。仓库 CI 在 macOS 执行无签名构建，但 Simulator 与真机的锁屏、来电和蓝牙行为仍必须由真实设备验收。
