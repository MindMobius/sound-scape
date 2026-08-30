# 声景

一句话，用声音描述世界。

声景把有限声音素材和声明式配方组织成可持续演化的声音环境。当前仓库包含公开 Web 试听入口和本地优先的 Flutter 客户端开发版：63 份逐文件核验的 CC0 音频、两个默认声景、多层持续编排、系统媒体控制、分类素材库、本地导入、DSP 听感、收藏与用户片刻已经落地；自然语言 Agent、在线声音包、账号同步和正式发布链路仍未接入。

## 接手这个仓库

- 新设备从 [新设备开发环境与迁移](docs/development/new-machine-setup.md) 开始。
- 当前真实能力和未完成项见 [当前开发状态](docs/status/current-development-state.md)。
- 下一阶段的顺序和验收条件见 [后续开发里程碑](docs/status/next-milestones.md)。
- Agent 必须先阅读 [AGENTS.md](AGENTS.md)，不要用历史会话替代仓库事实。

首次检查：

```powershell
npm ci
npm run doctor
git status --short --branch
```

## Web 体验

```powershell
npm ci
npm run doctor:web
npm run dev -- --port 4174
```

打开 `http://127.0.0.1:4174/`。

## Flutter 客户端

```powershell
npm run client:setup
npm run client:dev
```

`client:dev` 使用当前已提交的 Windows 桌面宿主。Android 用 `npm run client:android`；macOS 上的 iOS 用 `npm run client:ios`。包装器会定位 Flutter 3.47.1、校验版本并只为 Flutter 子进程配置国内镜像。完整平台前置条件、VS Code 热重载和分层验收见 [客户端说明](apps/client/README.md)。

## 当前边界

- Web 公开入口负责发现、真实试听、基础调节和客户端下载引导；`?lab=1` 只用于内部验证。
- Flutter 客户端负责本地素材、持续编排、系统媒体控制和后台音频方向。
- Web 与 Flutter 共享 `assets/` 和 `contracts/` 的事实，不共享 UI 或音频运行时代码。
- ComfyUI、MiniMax Music 3 和本机模型环境不是本项目依赖。
- 持续声景不使用歌曲式进度条，后台生成或下载不得打断当前播放。

## 仓库结构

| 路径           | 职责                                             |
| -------------- | ------------------------------------------------ |
| `PRODUCT.md`   | 产品定位、能力边界与不可虚构的事实               |
| `DESIGN.md`    | 视觉语言、组件规则、动效与响应式规范             |
| `assets/`      | 两端共用的场景事实、声音目录、品牌与平台静态资源 |
| `apps/web/`    | 无需安装即可试听的正式 Web 入口                  |
| `apps/client/` | Flutter 本地优先客户端与原生平台配置             |
| `contracts/`   | 客户端、生成服务和 Agent 共用的版本化声明式契约  |
| `design/`      | 提示词、方向稿、质量参考和视觉验收材料           |
| `packages/`    | 多个 Web 入口共同消费的无状态运行时模块          |
| `prototypes/`  | 不进入正式应用依赖的可丢弃渲染实验               |
| `docs/`        | 架构约定和经过保留的研究结论                     |
| `tools/`       | 仓库级资源校验与维护脚本                         |
| `.impeccable/` | Impeccable 的配置与界面 brief，不存放构建产物    |

Node 子项目由根 `package.json` 的 npm workspaces 和唯一 `package-lock.json` 管理；Flutter 客户端保留自己的 `pubspec.lock`。根声音目录、可播放场景、契约和运行时包映射是跨端唯一真相源，`apps/client/assets/generated/` 可重建且不提交。完整依赖方向见 [仓库结构与依赖边界](docs/architecture/repository-layout.md)。

## 校验

```powershell
npm run check
npm run client:test
git diff --check
```

Windows 原生音频变更再运行 `npm run client:integration:windows`。品牌母版、场景清单、授权和素材扩容规则见 [资源库说明](assets/README.md)；所有长期文档入口见 [文档索引](docs/README.md)。
