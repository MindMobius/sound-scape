# 声景仓库 Agent 指南

## 开始工作前

1. 运行 `git status --short --branch`，保留并理解已有改动，禁止擅自回退。
2. 依次阅读 `README.md`、`PRODUCT.md`、`docs/status/current-development-state.md` 和 `docs/status/next-milestones.md`。
3. 涉及界面时再完整阅读 `DESIGN.md`；涉及 Flutter、资源或契约时阅读对应架构文档。
4. 新设备先按 `docs/development/new-machine-setup.md` 初始化，并运行 `npm run doctor`。

## 不可混淆的产品事实

- 产品名是“声景”，短句是“一句话，用声音描述世界。”
- 声景是本地优先的持续声景运行时，不是白噪声播放器、歌曲播放器、DAW，也不是 ComfyUI、MiniMax Music 3 或其他生成模型的包装器。
- Flutter 是完整客户端方向；Web 是公开试听、产品发现和客户端引导入口。两端共享内容与契约，不共享 UI 或音频运行时代码。
- 持续声景没有歌曲式进度条。生成和下载必须在后台进行，不得打断当前播放或自动切换。
- 当前自然语言 Agent、在线声音包、账号同步、正式安装包和发布链路尚未完成，不得在文档、界面或验收结论中声称已经具备。

## 权威来源

- 产品定位与能力边界：`PRODUCT.md`。
- 视觉与交互规范：`DESIGN.md`。
- 当前实现与验证状态：`docs/status/current-development-state.md`。
- 后续开发顺序和验收条件：`docs/status/next-milestones.md`。
- 声音目录：`assets/audio/sound-library.v1.json`。
- 可播放场景与 SceneRecipe：`assets/scenes/playable-scenes.v1.json`。
- 跨端契约：`contracts/scene-recipe.v1.schema.json`。
- Flutter 运行时资源映射：`assets/runtime-pack.v1.json`。

不要在 Web、Flutter 或文档中手写这些事实的第二份副本。资源或契约变更必须从根目录真相源生成并通过校验。

## 资源和数据边界

- 新音频必须逐文件核验来源、作者、许可证、实际下载地址和 SHA-256。项目级 MIT、GPL 或 README 不能替代音频授权。
- 不直接复制 Moodist、Noice 等参考项目的资源；可以沿分类和来源路径回到独立原始页面重新选源。
- 用户导入音频是本机私有数据，不进入 Git、发布包或二次分发。
- `apps/client/assets/generated/`、`node_modules/`、构建输出和平台临时文件都可重建，不提交。
- ComfyUI、模型权重和本机 AI 环境不是本仓库依赖，不要写入初始化步骤。

## 验证和提交

- 常规边界：`npm run check`。
- Flutter 逻辑：`npm run client:test`；Windows 原生音频变更再运行 `npm run client:integration:windows`。
- 提交前运行 `git diff --check`，确认生成文件没有漂移。
- 提交必须按职责拆分，提交信息使用精确明确的中文，不能过度简单，也不需要冗长。
- 自动测试通过不等于 Android/iPhone 真机的锁屏、来电、蓝牙和长时间播放已经验收。
- 推送远端、发布安装包或修改外部服务前必须获得项目所有者确认。
