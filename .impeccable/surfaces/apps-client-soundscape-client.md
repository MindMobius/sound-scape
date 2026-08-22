---
version: 1
slug: "apps-client-soundscape-client"
primary_target: "apps/client/lib/ui/home/soundscape_home_screen.dart"
related_targets: ["apps/client/lib/ui/player/soundscape_player_surface.dart","apps/client/lib/ui/player/player_control_rail.dart","apps/client/lib/ui/theme/soundscape_theme.dart"]
---

# Flutter Soundscape Client Surface Brief

- Scope: Flutter 客户端的精选场景首页、全局持续播放器、展开播放器、单层声音调节与沉浸聆听；覆盖 Android、iOS 和 Windows 的自适应窗口。
- Mode: Experience + Operate。用户先立即听见一处声景，界面再按需要披露整体感受和单层控制。
- Audience and job: 普通用户选择一个预置场景后持续聆听；需要调整的用户在同一播放器中改变轻重、简繁或单层存在感，不进入音频工程页面。
- Primary action: 选择场景并播放。底部全局播放条是收起的播放器；点击信息区向上展开同一根节点，点击画面进入沉浸态。
- Content: 两个可播放预置场景、真实纵切音频、正式 PNG 品牌标记与场景位图、倒计时、总音量、三种整体预设、两条感受滑杆和逐层控制。
- Constraints: 持续自然声没有歌曲进度、seek、上一首或下一首；播放条、播放页和沉浸态不能复制；不用 SVG 手绘场景；不虚构生成、同步、素材授权或发布状态；后台播放不因页面形态变化中断。
- Direction: 延续“安静的声音工作室”：冷白与炭黑工作面、矿物灰绿状态、小圆角、细线和正式位图。动效只沿纵轴温和展开、收起与淡入，尊重系统减少动态效果；原生触控目标、返回手势、安全区和系统字号优先于 Web 像素复刻。
- Memorable moment: 一条克制的播放条安静升起为完整播放器，画面成为沉浸入口；所有状态和控制始终来自同一个播放器，声音持续不断。
- Unresolved: 自然语言生成、用户素材导入、持久化、正式音频授权、发布签名、iOS 真机后台验收、平板与折叠屏专属布局。
