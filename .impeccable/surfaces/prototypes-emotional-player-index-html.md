---
version: 1
slug: "prototypes-emotional-player-index-html"
primary_target: "prototypes/emotional-player/index.html"
related_targets: ["prototypes/emotional-player/styles.css","prototypes/emotional-player/app.js"]
---

# Emotional Player Surface Brief

- Scope: `prototypes/emotional-player/` 的响应式公开 Web 体验入口，以及保持全局顶层的真实播放器。
- Mode: 探索页和播放器为 Experience + Operate，下载页为 Persuade；访客先听见并选择声景，再决定继续聆听或了解客户端。
- Audience and job: 初次访客无需安装即可听见精选声景；已有兴趣的用户继续探索现有内容，或确认规划中的客户端将承载哪些完整能力。
- Primary action: 默认探索页直接播放精选声景或选择另一处声景；下载页在不伪造安装包的前提下说明开发状态，并引导用户返回网页聆听。底部控制轨持续可见，可无缝展开完整播放器和沉浸场。
- Content: 两个与音频语义一致的可听场景、真实音频、网页优化场景位图、PNG 品牌标记、全局播放器、基础调节和现有 WebGL 沉浸场；完整创建、素材库和设置只在 `?lab=1` 内部验证模式出现。
- Constraints: 不手绘 SVG，不虚构客户端上线、下载、生产生成能力、客户或性能声明；公开页面不暴露内部功能导航，播放和沉浸路径不能因路由重构发生位移或复制。
- Direction: 顶部仅保留品牌与下载客户端，品牌负责返回探索；探索即首页，不重复显示当前页 Tab，以一处精选声景建立第一印象，再自然接续其他可听场景和客户端入口。所有页面沿用冷白、炭黑、矿物灰绿、精密细线和小圆角，不堆卡片或功能说明。
- Memorable moment: 访客从全幅声景直接开始聆听，底部同一条控制轨始终保持稳定；它展开为完整播放器，再通过图窗进入沉浸场。公开内容在播放器后方更换，但播放器从不属于某个页面，也不会重复出现。
- Unresolved: 客户端技术栈、发布平台与时间，真实生成 API、素材授权、生产级持续编排与错误恢复；当前上传音频、本地持久化和设备质感仅证明浏览器端交互路径。
