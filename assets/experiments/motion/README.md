# 模型动态实验

这些文件验证 Image 2 是否能跨相邻状态保留膜片材质。实验已经暂停，静态产品资源不依赖它们。

| File | Native size | Role | Prompt |
| --- | ---: | --- | --- |
| `hero-keyframe-01-v1.png` | 1774 x 887 | Quiet adjacent phase | `design/prompts/experiments/motion/hero-keyframe-01-v1.txt` |
| `hero-keyframe-02-v1.png` | 1774 x 887 | Opposing adjacent phase | `design/prompts/experiments/motion/hero-keyframe-02-v1.txt` |
| `hero-loop-optical-v1.mp4` | 1600 x 800 | 7.5-second optical-flow loop | Derived from the static Hero and both keyframes |

两张相邻帧以 `assets/brand/backgrounds/hero-background-light-right-v1.png` 为不可变参考。视频由 `prototypes/model-authored-motion/tools/build_motion_video.py` 离线生成，仅作为实验记录。
