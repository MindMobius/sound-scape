# 声景模型母版运动实验

> 状态：已暂停。静态资源目录是当前产品基线，本原型仅保留为未来动态研究记录。

这是一个可丢弃的 A/B 原型，用来回答一个问题：高质量 Image 2 膜片画面在运动时，应该只移动单张母版，还是播放多个模型生成的相邻帧？

- `?variant=A`：单帧微动。只对一张已验收母版做极低幅度的整体位移和缩放，材质不会漂移。
- `?variant=B`：光流成片。先用双向稠密光流配准母版与两张 Image 2 相邻帧，再编码为约 7.5 秒的无缝 H.264；浏览器只负责播放最终像素。

初版 B 直接交叉淡化，过渡中点会出现双边、颗粒软化和纸色闪帧，因此已被移除。当前 B 专门验证“模型负责材质，离线工具负责时序，前端负责播放”是否成立。

从仓库根目录启动：

```powershell
python -m http.server 10601 --bind 127.0.0.1
```

打开 `http://127.0.0.1:10601/prototypes/model-authored-motion/?variant=A`。

需要重建 B 时，使用 Python 3.12：

```powershell
$motionDeps = Join-Path $env:TEMP "soundscape-motion-deps"
py -3.12 -m pip install --target $motionDeps -r prototypes/model-authored-motion/tools/requirements-motion.txt
$env:PYTHONPATH = $motionDeps
py -3.12 prototypes/model-authored-motion/tools/build_motion_video.py
```
