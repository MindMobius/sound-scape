# 仓库结构与依赖边界

## 目录职责

- `assets/` 是运行时内容的唯一母版入口，包含品牌、场景图片、声音目录与原始音频。Web 由 Vite 直接打包母版；Flutter 由 `tools/sync-runtime-assets.mjs` 生成包内资源，禁止人工维护副本。
- `design/` 保存设计过程材料，包括生成提示词、方向板、质量参考和人工验收图；运行时代码不得依赖该目录。
- `prototypes/` 保存可运行、可替换、可丢弃的实验。每个可运行原型把入口和构建配置留在自身根目录，运行时代码归入 `src/`；原型可以读取 `assets/`，但正式应用不得依赖原型。
- `apps/` 保存面向真实交付平台的应用。`apps/web/` 负责公开发现和试听；`apps/mobile/` 负责本地素材、持续编排、后台播放和系统媒体控制。两端共享契约与内容事实，不共享 UI 或音频运行时代码。
- `contracts/` 保存跨客户端、生成服务和 Agent 的版本化声明式 JSON 契约及共同一致性样例。契约只能描述数据，不能包含脚本、任意写入路径、凭据或动态代码；根检查同时执行标准 Schema 与 Dart 解码验收。
- `packages/` 只保存两个以上应用或实验共同消费的无状态运行时模块。共享模块不能持有产品状态，也不能依赖 `apps/` 或 `prototypes/`。
- `docs/` 保存长期有效的架构说明和研究结论。临时验收日志与构建输出不属于文档。
- `tools/` 保存跨目录校验和开发入口脚本，不放具体原型的构建工具。Flutter 包装器只编排 SDK 命令，不承载客户端业务逻辑。
- `.vscode/` 只提交可移植的推荐扩展、热重载、启动和检查任务；本机 SDK 路径与设备 ID 不进入仓库。
- `.impeccable/` 只保存工具配置、决策答案和 surface brief；截图、日志与状态文件不提交。

## 权威来源

1. 产品定位和能力边界：`PRODUCT.md`。
2. 视觉语言与交互规则：`DESIGN.md`。
3. 静态资源元数据：`assets/catalog.json`。
4. 场景发现、内容与槽位状态：`assets/scenes/index.json` 和各场景的 `scene.json`。
5. 可播放场景、试听绑定与编排：`assets/scenes/playable-scenes.v1.json`。
6. 声音素材、来源与分段：`assets/audio/sound-library.v1.json`。
7. 当前公开 Web：`apps/web/`。

## 依赖方向

```text
PRODUCT.md + DESIGN.md
          |
          v
 assets/ + contracts/ <--------- design/
          |     |
          v     v
       apps/web  apps/mobile
          |
          v
      prototypes/ (仅独立实验，不被应用依赖)
```

`design/` 负责产出和解释资源，但不进入运行时依赖；正式应用只能消费 `assets/` 和 `contracts/` 的受控输出，不能反向成为资源或契约的权威来源。Web 直接连接场景内容、可播放目录和正式资源，Flutter 的 `apps/mobile/assets/generated/` 与 `lib/domain/generated/soundscape_catalog.g.dart` 都由同一来源生成；前者不提交，后者提交并由 CI 检查漂移，任何改动都必须回到根资源清单。

## 提交边界

- 产品定义和设计规范单独提交。
- 静态资源、资源清单、对应提示词和校验脚本作为一个完整边界提交。
- 探索原型与当前产品原型分开提交。
- Flutter 客户端脚手架、音频运行时和对应平台配置作为独立提交边界。
- `node_modules/`、`dist/`、临时截图和工具运行状态不进入历史。
