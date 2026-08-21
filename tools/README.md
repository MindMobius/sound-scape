# 仓库工具

- `validate-static-assets.mjs`：校验正式 PNG、提示词、SHA-256、场景清单和资源槽位的完整性。
- `flutter.mjs`：解析并校验 Flutter SDK，为子进程配置国内镜像，提供桌面热开发、Android 阶段验收、无设备检查和平台构建入口。

从仓库根目录运行：

```powershell
npm run validate:assets
npm run mobile:check
```
