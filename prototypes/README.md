# 原型索引

| 原型 | 状态 | 用途 |
| --- | --- | --- |
| `emotional-player/` | 当前 | 验证日常导航、全局播放器、后台生成和渐进式声景配置 |
| `optical-membrane-field/` | 暂停 | 验证 OGL/WebGL2 多层膜片渲染与降级路径 |
| `product-surface/` | 归档 | 比较早期三种产品界面密度与视觉方向 |
| `model-authored-motion/` | 暂停 | 比较单帧微动与模型相邻帧光流成片 |
| `translucent-membranes/` | 归档 | 验证浏览器程序化膜片的表现上限 |

默认原型从仓库根目录启动：

```powershell
npm ci --prefix prototypes/emotional-player
npm run dev -- --port 4174
```

所有原型都可以被替换，不代表生产后端、授权状态或上线能力。依赖目录和 `dist/` 不提交。
