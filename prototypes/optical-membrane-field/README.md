# 声景实时光学膜片场

> 状态：已暂停。静态资源目录是当前产品基线，本原型仅保留为未来运行时渲染研究记录。

方向 A 的可丢弃技术原型：Image 2 提供灰度厚度 atlas，OGL/WebGL2 负责 3-6 层实时折射、吸收、散射、边缘高光和投影。

## 启动

```powershell
npm install
npm run dev -- --port 10600
```

打开 `http://127.0.0.1:10600/?variant=A`。

- `?variant=A`：浮光，验证白昼/暖冷光场中的悬浮膜片。
- `?variant=B`：夜层，验证深色背景中的吸收、叠色和火光。
- `?variant=C`：近物，验证大尺度材质堆叠与近距离折射。

三种方案共享播放、音量、轻重和简繁状态。鼠标或触摸位置只改变光线与视差，不直接拖动膜片。支持 tablist 方向键、`prefers-reduced-motion`，并在 `EXT_color_buffer_float` 不可用时从 RGBA16F 降级到 RGBA8。

浏览器调试可读取 `window.__soundscapeDebug.snapshot()`，其中包含 WebGL 版本、RenderTarget 格式、画布尺寸、活跃层数、帧耗时和 FPS。
