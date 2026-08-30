# 仓库工具

- `validate-static-assets.mjs`：校验正式 PNG、提示词、SHA-256、场景清单和资源槽位的完整性。
- `sync-runtime-assets.mjs`：校验声音、场景、视觉和分段引用，并从根资源母版确定性生成 Flutter 包内资源与场景目录。
- `validate-contracts.mjs`：使用 JSON Schema 验证共同样例和可播放场景目录，并检查自动生成的 Dart 契约版本和摘要。
- `check-web.mjs`：检查正式 Web 的全部 JavaScript 模块语法。
- `validate-repository-boundaries.mjs`：校验客户端目录、npm workspace、唯一锁文件和正式应用依赖方向，防止结构回退。
- `doctor.mjs`：只读检查 Node、npm、Git、远端跟踪、声音清单、生成资源和 Flutter 工具链，供新设备接手与故障定位使用。
- `flutter.mjs`：同步运行时资源、解析并校验 Flutter SDK，为子进程配置国内镜像，提供桌面热开发、原生验收和跨平台构建入口。

从仓库根目录运行：

```powershell
npm run doctor
npm run doctor:web
npm run validate:assets
npm run validate:contracts
npm run validate:repository
npm run client:check
```
