---
version: 1
slug: "prototypes-emotional-player-index-html"
primary_target: "prototypes/emotional-player/index.html"
related_targets: ["prototypes/emotional-player/styles.css","prototypes/emotional-player/app.js"]
---

# Emotional Player Surface Brief

- Scope: `prototypes/emotional-player/` 的响应式日常产品应用壳。
- Mode: Operate；用户从克制的引导首页进入探索或创建，播放器始终处于全局顶层；展开后先聆听，继续滚动进入声景调节，图窗按需进入沉浸场。
- Audience and job: 普通用户用一句描述得到可持续播放的声景，进阶用户调整声音层和播放质感。
- Primary action: 首页只提供创建与探索两个方向；底部控制轨持续可见，并在不重排自身控件的前提下向上展开完整播放器。创建任务在后台运行，完成后由用户决定是否切换。
- Content: 两个与音频语义一致的可听场景、两段本地自然声素材、网页优化场景位图、正式 PNG 品牌标记和现有 WebGL 专注场域。
- Constraints: 不手绘 SVG，不虚构生产生成能力，不用大画面占据日常工作区，不中断当前播放。
- Direction: 冷白或夜间炭黑应用壳，矿物中性色，珊瑚只标记动作；首页仅作方向引导。持续声景没有歌曲式进度、已播放时间或总时长；收起态以当前声景信息区切换展开状态，右侧仅保留同规格的倒计时、音量和播放控件，前两者通过与按钮等宽的竖向刻度 popover 按需设置。
- Memorable moment: 同一条控制轨保持稳定，完整播放器从控制轨上方向上裁切揭示，缩略封面以共享几何移动到主图窗；第一屏底部只保留细线与箭头，声景调节自然接续在同一滚动面内，滚动交界让主画面与文字轻微退后；图窗点击后以原有边界扩张为全屏实时膜片场，返回时准确收回原位。
- Unresolved: 真实生成 API、素材授权、生产级持续编排与错误恢复；当前上传音频、本地持久化和设备质感仅证明浏览器端交互路径。
