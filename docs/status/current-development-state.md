# 当前开发状态

审计日期：2026-08-31。本文描述 `main` 当前实现边界，不代表客户端已经发布。每次完成里程碑后必须同步更新本文；具体提交以 `git log -1 --oneline` 为准。

## 产品和跨端边界

声景把有限的声音素材和声明式 `SceneRecipe` 编排为持续变化的声音环境。目标入口是自然语言，但当前自然语言 Agent 和后端任务服务尚未实现。

- Web：公开发现、真实试听、基础调节、展开播放器、沉浸聆听和客户端下载引导。
- Flutter：本地优先的完整客户端方向，负责素材、本地状态、持续编排、系统媒体控制和移动端后台能力。
- 共享层：声音目录、可播放场景、SceneRecipe 契约、视觉母版和 Flutter 运行时资源映射。
- 不共享：Web DOM/Web Audio/GSAP 与 Flutter Widget/SoLoud/audio_service 各自独立。

## 已落地能力

| 范围             | 当前能力                                                                               | 证据入口                                                            |
| ---------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 声音内容         | 63 份 bundled、approved、逐文件记录来源和 SHA-256 的 CC0 音频                          | `assets/audio/sound-library.v1.json`、`assets/audio/THIRD_PARTY.md` |
| 默认声景         | 雨夜木屋、深夜海岸两个可播放场景，共享版本化 SceneRecipe                               | `assets/scenes/playable-scenes.v1.json`                             |
| Web 公共体验     | 两个真实试听、全局单例播放器、轻重/简繁、倒计时、音量、沉浸态和七种真实 Web Audio 听感 | `apps/web/`                                                         |
| Web 内部验证     | `?lab=1` 下的本地创建模拟、素材上传、分类、设置与 IndexedDB 持久化                     | `apps/web/README.md`                                                |
| Flutter 音频     | `flutter_soloud` 多总线、确定性调度、动态事件、渐变切换和 DSP 听感                     | `apps/client/lib/audio/`                                            |
| Flutter 系统能力 | `audio_service + audio_session`、睡眠倒计时、音频焦点、中断和耳机拔出处理              | `apps/client/lib/audio/soundscape_audio_handler.dart`               |
| Flutter 本地能力 | 分类素材库、内容寻址导入、收藏、逐层设置、用户片刻和 schema v2 原子状态                | `apps/client/lib/data/`、`apps/client/lib/ui/player/`               |
| 契约             | JSON Schema、共同样例、Dart 生成契约与跨端目录校验                                     | `contracts/`、`tools/validate-contracts.mjs`                        |
| 质量门禁         | Web/资源/契约、Flutter 分析与测试、Windows 原生集成、Android 和 iOS 构建工作流         | `.github/workflows/quality.yml`                                     |

63 份音频母版当前约 228.12 MiB，全部以普通 Git Blob 提交。素材数量不等于成品场景数量；目前只有两个经过绑定的默认声景，其余素材主要通过 Flutter 素材库和动态声层使用。

## 平台状态

| 平台               | 当前状态                                                               | 不能据此声称                                    |
| ------------------ | ---------------------------------------------------------------------- | ----------------------------------------------- |
| Web                | 可在 Vite 本地运行并由根检查构建                                       | 已有生产后端、生成服务或已部署正式站点          |
| Windows            | 有桌面宿主、SoLoud 原生集成测试和调试构建入口                          | 已签名、已安装发布或已完成所有硬件验收          |
| Android            | 有原生工程、前台媒体服务声明、运行/集成/构建入口；历史开发已做原生验证 | 所有厂商机型、锁屏、系统回收和长时间播放已通过  |
| iOS                | 有原生工程、后台音频声明、运行入口和 CI 无签名构建                     | iPhone 真机的来电、蓝牙、锁屏和后台稳定性已通过 |
| macOS / Linux 桌面 | 没有提交 Flutter 桌面宿主                                              | 客户端支持这两个桌面平台                        |

自动测试和构建只证明代码门槛。Android 与 iPhone 的锁屏、来电、耳机、蓝牙、系统回收、发热、耗电和长时间接缝必须保留设备、系统版本和时长证据后才能标记完成。

## 本次交接验证

2026-08-31 在 Windows 开发机完成：

- `npm run doctor`：Node 24.11.0、npm 11.6.1、Flutter 3.47.1、Dart 3.13.1、Android 和 Windows 工具链通过；识别 63 份 approved 素材和 2 个可播放场景。
- `npm run check`：资源同步、仓库边界、静态资源、SceneRecipe 契约、ESLint、Prettier、Web 生产构建、膜片原型构建、Flutter analyze 和测试全部通过。
- `npm run client:test`：38 项领域、组件、响应式、本地导入和配方测试通过。
- `npm run client:integration:windows`：构建 Windows 调试程序，SoLoud 原生运行时展开播放器并播放的集成测试通过。
- `git diff --check`：通过。

本次没有执行 Android/iPhone 真机验收，也没有把 GitHub Actions 的配置当作最新远端运行结果。换机后应重新执行与目标平台相符的门槛。

## 当前未实现

- 自然语言 `描述 -> SceneRecipe` Agent、素材检索、critic 和局部修复。
- 后台生成任务 API、通知结果、可取消任务和失败恢复。
- 在线声音包仓库、增量下载、版本迁移、回滚和 Drift 索引。
- 账号、跨设备同步、正式用户数据导入导出和分享。
- 正式安装包、签名、自动更新、商店隐私资料、崩溃与性能观测。
- Android/iPhone 完整真机矩阵和固定字体的视觉回归基线。
- 仓库级代码开源许可证。音频的 CC0 台账不能代替代码许可证决定。

## 当前数据真相源

| 数据                 | 唯一真相源                              | 消费者                          |
| -------------------- | --------------------------------------- | ------------------------------- |
| 声音素材和授权元数据 | `assets/audio/sound-library.v1.json`    | Web、Flutter 生成目录、校验器   |
| 可播放场景和编排     | `assets/scenes/playable-scenes.v1.json` | Web、Flutter 生成目录、契约校验 |
| Agent/API 配方边界   | `contracts/scene-recipe.v1.schema.json` | 未来服务、Flutter、测试样例     |
| Flutter 包内文件映射 | `assets/runtime-pack.v1.json`           | `tools/sync-runtime-assets.mjs` |
| 产品事实             | `PRODUCT.md`                            | 文档、Web 和客户端文案          |
| 视觉与交互           | `DESIGN.md`                             | Web 与 Flutter 各自实现         |

`apps/client/assets/generated/` 是可重建副本，不是数据源；`apps/client/lib/domain/generated/` 是提交并由 CI 检查漂移的契约输出。用户导入和用户片刻只存在本机 Application Support，不能混入正式资源目录。

## 接手时先验证

```powershell
npm ci
npm run doctor
npm run check
git diff --check
```

如果只做 Web，可以先用 `npm run doctor:web` 和 `npm run check:web`。当前推荐开发顺序见 `next-milestones.md`。
