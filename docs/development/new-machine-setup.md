# 新设备开发环境与迁移

这份文档从“只有 Git 仓库和一台新设备”开始，目标是恢复 Web、Flutter、声音母版、契约和验证能力。它不要求迁移旧电脑的 `node_modules`、构建缓存、ComfyUI 或模型文件。

## 1. 先同步旧设备

离开旧设备前在仓库根目录执行：

```powershell
git status --short --branch
npm run check
git diff --check
git log --oneline origin/main..HEAD
```

确认所有必要改动已经提交后，再明确执行：

```powershell
git push origin main
```

只有提交到远端的内容才能被新设备直接克隆。浏览器的 `localStorage`、IndexedDB，以及 Flutter Application Support 中的用户导入和 `soundscape-state.v1.json` 不在 Git 中；它们是用户本机状态，不是恢复开发环境的前置条件。

## 2. 工具版本

| 工具    | 仓库要求                       | 用途                                                    |
| ------- | ------------------------------ | ------------------------------------------------------- |
| Git     | 当前稳定版                     | 获取代码和约 228 MiB 的正式音频母版                     |
| Node.js | `24.11.0`                      | Web、资源生成、契约和仓库工具                           |
| npm     | `11.6.1`                       | 唯一 Node 包管理器                                      |
| Flutter | `3.47.1 stable`                | Flutter 客户端；版本来自 `apps/client/.flutter-version` |
| Dart    | Flutter 3.47.1 自带的 `3.13.1` | 客户端编译、分析和测试                                  |

Windows 桌面开发还需要 Visual Studio 2022 的“使用 C++ 的桌面开发”、CMake 和 Windows SDK。Android 需要 Android Studio、Android SDK、Platform Tools、Command-line Tools 和可用的 JDK。iOS 只能在 macOS 上使用 Xcode、Xcode Command Line Tools、CocoaPods 和 Simulator 或 iPhone。

仓库目前只提交了 Windows 桌面宿主，没有 macOS 或 Linux 桌面宿主。macOS 可以开发和构建 iOS，Linux 可以做 Web、Dart 与 Android 工作，但 `npm run client:dev` 只在 Windows 可用。

## 3. 克隆和 Node 初始化

SSH 已配置时：

```powershell
git clone git@github.com:MindMobius/sound-scape.git
cd sound-scape
git fetch --prune
git status --short --branch
npm ci
npm run doctor:web
```

也可以使用 `https://github.com/MindMobius/sound-scape.git`，私有仓库需要在新设备重新配置凭据。SSH 私钥、GitHub Token、npm Token 和签名证书都是机器级凭据，禁止放进仓库。

仓库没有使用 Git LFS；63 份正式音频以普通 Git 二进制文件提交，当前合计约 228.12 MiB。不要只复制源码目录或跳过二进制 Blob，否则资源校验和客户端运行都会失败。

## 4. 先运行 Web

```powershell
npm run dev -- --port 4174
```

打开 `http://127.0.0.1:4174/`。端口 4174 只是本地约定，冲突时可以换端口；仓库当前不依赖本地后端，也不依赖 `127.0.0.1:8188` 的 ComfyUI。

Web 公共入口默认展示两个真实可播放场景。`?lab=1` 只用于内部验证创建、声景集和设置，不代表自然语言生成服务已经接入。

## 5. 初始化 Flutter

把 Flutter 3.47.1 安装到以下任一路径：

1. 仓库 `.fvm/flutter_sdk`。
2. `FLUTTER_ROOT`。
3. 系统 `PATH`。
4. Android `local.properties` 中的 `flutter.sdk`。

随后执行：

```powershell
npm run doctor
npm run client:setup
```

`npm run doctor` 是只读环境诊断；`client:setup` 会同步 Flutter 运行时资源、执行 `flutter pub get` 并运行 `flutter doctor -v`。Flutter 包装器默认只为子进程使用 CFUG 镜像；Android Gradle 配置优先使用阿里云镜像。CI 使用官方源。npm 没有提交仓库级镜像配置，需要时只在本机配置，不能提交凭据或私有 registry。

Windows 日常开发：

```powershell
npm run client:dev
```

Android 阶段验收：

```powershell
npm run client:devices
npm run client:android
```

macOS 上的 iOS 开发：

```powershell
npm run client:devices
npm run client:ios
```

有多个移动设备时使用 `node tools/flutter.mjs run android DEVICE_ID` 或 `node tools/flutter.mjs run ios DEVICE_ID` 明确选择。

## 6. 首次验收

完整开发设备：

```powershell
npm run check
git diff --check
```

Windows 原生音频改动还需运行：

```powershell
npm run client:integration:windows
```

仅做 Web 时运行 `npm run check:web`、`npm run validate:assets`、`npm run validate:contracts` 和 `npm run build:optical`。Android 与 iOS 的后台播放、锁屏、来电、蓝牙和长时间播放仍以真机验收为准。

## 7. 哪些内容需要迁移

| 类型                                                                     | 处理方式                                                   |
| ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `assets/`、`contracts/`、`apps/`、`packages/`、`docs/`、`tools/`、锁文件 | 必须通过 Git 同步                                          |
| `apps/client/lib/domain/generated/`                                      | 提交到 Git，由契约工具检查漂移                             |
| `apps/client/assets/generated/`                                          | 不提交，由 `npm run assets:sync` 重建                      |
| `node_modules/`、`.dart_tool/`、`build/`、`dist/`、Gradle/Xcode 临时文件 | 不迁移，按锁文件重建                                       |
| `apps/client/android/local.properties`                                   | 每台设备自行生成，包含本机 SDK 路径                        |
| Web localStorage / IndexedDB                                             | 浏览器本地状态，开发环境不依赖                             |
| Flutter Application Support / `imports/`                                 | 用户私有状态；只有要保留个人导入时才在应用停止后整目录备份 |
| `.env*`、Token、证书、签名密钥                                           | 不提交；当前基础开发不要求环境变量                         |
| `work/`、`.impeccable/review/`、本地截图和日志                           | 临时工作产物，不迁移                                       |

本地用户数据目前没有正式导入导出协议。跨设备复制 Application Support 只能视为开发期备份，不能把它当成账号同步或已发布迁移能力。

## 8. 常见恢复问题

- `doctor` 报 Node 版本错误：使用 `.nvmrc` 指定的 24.11.0；版本管理器可执行 `nvm use` 或等价命令。
- `doctor` 报 npm 版本错误：执行 `npm install --global npm@11.6.1` 后重开终端。
- Flutter 提示有新版本：不要直接执行 `flutter upgrade`。本仓库锁定 3.47.1，先把 `FLUTTER_ROOT` 或 `PATH` 指向正确 SDK。
- Flutter 找不到 SDK：确认 `flutter --version` 可运行，或把 SDK 放到 `.fvm/flutter_sdk`。
- Android 工具链或许可证失败：在 Android Studio 的 SDK Manager 补齐工具，再执行 `flutter doctor --android-licenses` 和 `npm run doctor`。
- Windows 构建缺少 CMake/MSVC：在 Visual Studio Installer 补装“使用 C++ 的桌面开发”和 Windows SDK。
- Flutter 资源缺失：只执行 `npm run assets:sync`，不要手工复制到 `apps/client/assets/generated/`。
- Web 端口占用：给 `npm run dev -- --port PORT` 传入另一端口；产品代码不依赖 4174。
- 克隆后素材数量不对：确认没有做不完整的手工复制，并用 `npm run validate:assets` 检查 63 份当前基线素材。

## 9. 新 Agent 的接手顺序

1. 阅读根 `AGENTS.md`。
2. 阅读 `PRODUCT.md` 和 `docs/status/current-development-state.md`，不要从历史会话推断当前事实。
3. 阅读 `docs/status/next-milestones.md`，从第一个未完成里程碑继续。
4. 运行 `npm run doctor`、`git status --short --branch` 和 `npm run check`。
5. 只在对应真相源修改资源、场景和契约，修改后同步更新状态文档。
