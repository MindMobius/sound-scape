# 声景

一句话，用声音描述世界。

声景把自然语言描述组织成可持续演化的声音环境。当前仓库包含用于公开体验的 Web 应用，以及可在 Windows 和 Android 运行的 Flutter 客户端 MVP。客户端已经验证多层混音、持续播放、系统媒体控制、渐进式调节和沉浸聆听；真实生成服务、正式素材持久化和发布链路仍未接入。

## Web 体验

```powershell
npm ci --prefix apps/web
npm run dev -- --port 4174
```

打开 `http://127.0.0.1:4174/`。

## Flutter 客户端

```powershell
npm run mobile:setup
npm run mobile:dev
```

脚本会自动找到本机 Flutter SDK、校验项目版本并仅为子进程配置国内镜像。使用 VS Code 的“声景：桌面日常开发”启动配置时，保存 Dart 文件即可热重载；Android、客户端能力边界和分层验收方式见 `apps/mobile/README.md`。

## 仓库结构

| 路径 | 职责 |
| --- | --- |
| `PRODUCT.md` | 产品定位、能力边界与不可虚构的事实 |
| `DESIGN.md` | 视觉语言、组件规则、动效与响应式规范 |
| `assets/` | 两端共用的场景事实、声音目录、品牌与平台静态资源 |
| `apps/web/` | 无需安装即可试听的正式 Web 入口 |
| `apps/mobile/` | Flutter 本地优先客户端 MVP 与原生平台配置 |
| `contracts/` | 客户端、生成服务和 Agent 共用的版本化声明式契约 |
| `design/` | 提示词、方向稿、质量参考和视觉验收材料 |
| `packages/` | 多个 Web 入口共同消费的无状态运行时模块 |
| `prototypes/` | 不进入正式应用依赖的可丢弃渲染实验 |
| `docs/` | 架构约定和经过保留的研究结论 |
| `tools/` | 仓库级资源校验与维护脚本 |
| `.impeccable/` | Impeccable 的配置与界面 brief，不存放构建产物 |

更完整的依赖方向和新增文件规则见 `docs/architecture/repository-layout.md`。

## 校验

```powershell
npm run validate:assets
npm run validate:contracts
npm run build
npm run check

npm run mobile:check
```

品牌母版、场景清单、固定素材槽位和实验隔离规则见 `assets/README.md`；原型状态与启动方式见 `prototypes/README.md`。
