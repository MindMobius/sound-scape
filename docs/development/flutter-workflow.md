# Flutter 开发与调试工作流

## 目标

日常修改必须在一个常驻目标上快速反馈，跨平台差异则在明确的阶段门槛中验证。不能为每次样式调整同时启动 Windows、Android 和 iOS，也不能用桌面运行成功替代后台音频的真机结论。

## 四层反馈环

| 层级 | 运行方式 | 解决的问题 | 频率 |
| --- | --- | --- | --- |
| 桌面热重载 | VS Code“声景：桌面日常开发”或 `npm run client:dev` | UI、动效、状态、声景编排和桌面音频 | 持续 |
| 无设备检查 | `npm run client:check` | 格式、静态分析、领域逻辑、组件行为、溢出和响应式 | 每个改动边界 |
| 原生阶段验收 | `npm run client:integration:windows` 或 `npm run client:integration:android` | 真实音频运行时、展开播放器、播放状态和平台插件 | 完成一段平台能力后 |
| Android 人工验收 | `npm run client:android` | 触控、返回手势、通知和后台切换 | 完成一段移动端能力后 |
| 真机发布验收 | Android 手机与 iPhone | 锁屏、来电、耳机、蓝牙、长播、系统回收和性能 | 发布候选版本 |

## 日常入口

首次运行：

```powershell
npm run client:setup
```

推荐在 VS Code 安装仓库建议的 Dart 与 Flutter 扩展，选择“声景：桌面日常开发”并按 `F5`。工作区会在保存 Dart 文件后执行热重载，保留当前播放器状态。修改原生 Kotlin、Swift、C++、Manifest、插件注册或启动初始化时，必须热重启或完整重启。

纯终端入口为：

```powershell
npm run client:dev
```

终端模式运行期间按 `r` 热重载，按 `R` 热重启。

## SDK 与网络

`apps/client/.flutter-version` 是客户端 SDK 版本的仓库真相。`tools/flutter.mjs` 按以下顺序解析 SDK：

1. 仓库 `.fvm/flutter_sdk`。
2. `FLUTTER_ROOT`。
3. 当前 `PATH`。
4. `apps/client/android/local.properties` 中的 `flutter.sdk`。

包装器默认使用 Flutter 官方列出的 CFUG 镜像，只对当前 Flutter 子进程生效。已有的 `PUB_HOSTED_URL` 与 `FLUTTER_STORAGE_BASE_URL` 会被保留。升级 SDK 时必须同时更新 `.flutter-version`、依赖锁文件，并重新运行分析、测试和两端构建。

每个 setup、run、check、integration 和 build 命令都会先读取根目录 `assets/runtime-pack.v1.json`，重建 `apps/client/assets/generated/`。该目录不提交；声音、图片或目录变更必须修改根 `assets/` 母版和映射，不能直接编辑生成结果。

## 无设备覆盖

Widget Test 固定覆盖以下视口：

- 360 x 640 小屏手机。
- 390 x 844、1.3 倍字号手机。
- 844 x 390 手机横屏。
- 834 x 1112 深色平板。
- 1440 x 900 桌面。

这些测试验证全局播放器保持单例、展开与收起行为、无歌曲式进度条以及布局无异常。原生集成测试另行验证真实 SoLoud 运行时在播放器展开和播放期间保持存活。当前视觉素材与字体尚未形成发布基线，因此暂不提交依赖系统字体渲染的 Golden 图片；形成稳定视觉基线后，再加入固定字体的截图回归。

## 平台门槛

Android 连接一台设备时可直接运行：

```powershell
npm run client:android
```

多设备并存时必须显式传入设备 ID，避免误装或误测。iOS 构建和 Simulator 只能在 macOS 进行；Windows 日常循环不假装覆盖 iOS。GitHub Actions 分别执行 Linux 分析与 Android 构建、Windows 原生集成、macOS iOS 无签名构建。自动测试通过只是合并门槛，后台播放和音频生命周期仍以真机证据为准。
