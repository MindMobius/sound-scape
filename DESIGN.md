---
name: "声景"
description: "一句话，用声音描述世界。"
colors:
  ground: "#f4f6f3"
  surface: "#fafbf8"
  surface-raised: "#ffffff"
  surface-muted: "#e9eeea"
  surface-pressed: "#dde5df"
  ink: "#1d2420"
  ink-secondary: "#59635d"
  ink-tertiary: "#606b64"
  line: "#d5dcd7"
  line-strong: "#afb9b2"
  accent: "#cc604b"
  accent-hover: "#b9503d"
  accent-soft: "#f3ded9"
  active: "#365f54"
  active-soft: "#dce9e3"
  focus: "#2d7160"
  selection: "#d9e8e1"
  dark-ground: "#141918"
  dark-surface: "#191f1d"
  dark-surface-raised: "#222926"
  dark-surface-muted: "#2a322f"
  dark-surface-pressed: "#343e3a"
  dark-ink: "#f1f3ef"
  dark-ink-secondary: "#b6c0b9"
  dark-ink-tertiary: "#8f9a93"
  dark-line: "#37403c"
  dark-line-strong: "#52605a"
  dark-accent: "#dc765f"
  dark-accent-hover: "#e58973"
  dark-accent-soft: "#4a2c27"
  dark-active: "#a9c8bc"
  dark-active-soft: "#243b34"
  dark-focus: "#8cc7b5"
  dark-selection: "#305548"
typography:
  display:
    fontFamily: "Noto Serif SC Variable, Songti SC, SimSun, serif"
    fontSize: "54px"
    fontWeight: 590
    lineHeight: 1.1
    letterSpacing: "0"
  headline:
    fontFamily: "Noto Serif SC Variable, Songti SC, SimSun, serif"
    fontSize: "36px"
    fontWeight: 580
    lineHeight: 1.18
    letterSpacing: "0"
  title:
    fontFamily: "Noto Serif SC Variable, Songti SC, SimSun, serif"
    fontSize: "25px"
    fontWeight: 620
    lineHeight: 1.2
    letterSpacing: "0"
  brand:
    fontFamily: "Noto Serif SC Variable, Songti SC, SimSun, serif"
    fontSize: "18px"
    fontWeight: 690
    lineHeight: 1
    letterSpacing: "0"
  body:
    fontFamily: "HarmonyOS Sans SC, Noto Sans SC, Microsoft YaHei UI, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  composer:
    fontFamily: "HarmonyOS Sans SC, Noto Sans SC, Microsoft YaHei UI, Segoe UI, sans-serif"
    fontSize: "20px"
    fontWeight: 520
    lineHeight: 1.65
    letterSpacing: "0"
  navigation:
    fontFamily: "HarmonyOS Sans SC, Noto Sans SC, Microsoft YaHei UI, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 590
    lineHeight: 1.5
    letterSpacing: "0"
  action:
    fontFamily: "HarmonyOS Sans SC, Noto Sans SC, Microsoft YaHei UI, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 660
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "HarmonyOS Sans SC, Noto Sans SC, Microsoft YaHei UI, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 620
    lineHeight: 1.5
    letterSpacing: "0"
rounded:
  xs: "5px"
  sm: "6px"
  md: "7px"
  lg: "8px"
  round: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "24px"
  2xl: "34px"
  3xl: "48px"
components:
  primary-action:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface-raised}"
    typography: "{typography.action}"
    rounded: "{rounded.md}"
    padding: "0 17px"
    height: "46px"
  primary-action-hover:
    backgroundColor: "{colors.active}"
    textColor: "{colors.surface-raised}"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.md}"
    size: "40px"
  navigation-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.navigation}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "44px"
  navigation-item-active:
    backgroundColor: "{colors.active-soft}"
    textColor: "{colors.active}"
    typography: "{typography.navigation}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "44px"
  filter-tab-selected:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    padding: "0 11px"
    height: "30px"
  prompt-composer:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.composer}"
    rounded: "{rounded.lg}"
    padding: "27px 28px 10px"
  range-control:
    backgroundColor: "{colors.line-strong}"
    textColor: "{colors.ink}"
    rounded: "{rounded.round}"
    height: "28px"
    width: "100%"
  player-button:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.md}"
    size: "44px"
  task-notification:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "11px 12px"
    height: "74px"
  character-option-selected:
    backgroundColor: "{colors.active-soft}"
    textColor: "{colors.active}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "40px"
---

# Design System: 声景

## Overview

**Creative North Star: "安静的声音工作室"**

“安静的声音工作室”把声景塑造成稳定、克制、可长期停留的日常工具：冷白与炭黑构成工作台，矿物灰绿承担选择和持续状态，雾蓝来自正式膜片位图，珊瑚只在需要明确行动时出现。界面以细线、紧凑密度和真实声音素材为主，不把普通使用包装成全屏概念海报。

系统先维持当前聆听，再允许探索、后台生成和明确切换；高级声音层与播放质感只在用户需要时展开。品牌、页面标题和场景名使用自托管衬线体提供文化气质，正文和操作保持无衬线的清晰与效率。

**Key Characteristics:**

- 冷白与炭黑双主题，以矿物灰绿表达状态，珊瑚只标记动作。
- 6 至 8 像素的小圆角、精密细线和低对比层级。
- 正式膜片位图承载场景情绪，界面结构保持工具化。
- 持续播放、后台生成、主动切换与按需高级编排。

## Colors

浅色主题以冷白工作台和绿灰墨色建立安静对比，深色主题把相同语义映射到炭黑表面；雾蓝与更丰富的矿物色留在场景位图及各场景膜片调色板中。

### Primary

- **工作室珊瑚**（浅色 `#cc604b`，深色 `#dc765f`）：只用于需要用户明确决定的动作、输入光标和少量强调；悬停与柔和底色分别使用配套的 hover/soft token。

### Secondary

- **矿物灰绿**（浅色 `#365f54`，深色 `#a9c8bc`）：用于当前导航、正在播放、已选择和连续状态；柔和底色使用 `active-soft` 主题对。

### Neutral

- **冷白工作台**（`#f4f6f3`）：浅色模式的全局底色；表面从 `surface` 到 `surface-raised` 逐级变亮。
- **炭黑工作台**（`#141918`）：深色模式的全局底色；深色表面保持绿灰偏色而不是中性纯黑。
- **工作室墨色**（浅色 `#1d2420`，深色 `#f1f3ef`）：正文和高优先级控件；secondary 与 tertiary 层级承担说明和元数据。
- **精密分隔线**（浅色 `#d5dcd7`，深色 `#37403c`）：1 像素结构分区；strong 变体用于轨道、状态边界和更明确的轮廓。

### Named Rules

**The Coral Action Rule.** 珊瑚只用于需要用户决定的动作；选择、播放与持续状态使用矿物灰绿。

**The Two-Face Theme Rule.** 浅色与深色主题共享语义角色，不把夜间场景重做成另一套品牌。

## Typography

**Display Font:** Noto Serif SC Variable（回退为 Songti SC、SimSun、serif）
**Body Font:** HarmonyOS Sans SC（回退为 Noto Sans SC、Microsoft YaHei UI、Segoe UI、sans-serif）

**Character:** 衬线体只为品牌和声音世界命名，带来安静、正式的文化气质；无衬线体承担持续操作、数据和说明，保持日常工具的效率。所有文本字距固定为 0。

### Hierarchy

- **Display**（590，54px，1.1）：只用于沉浸场中的场景名；移动端实现收至 39px。
- **Headline**（580，36px，1.18）：当前场景名；移动端实现收至 26px。
- **Title**（620，25px，1.2）：页面标题；移动端实现收至 22px。
- **Brand**（690，18px，1）：品牌名称；移动端实现为 17px。
- **Composer**（520，20px，1.65）：自然语言创建输入；移动端实现为 18px。
- **Body**（400，14px，1.5）：正文与默认界面文字；场景说明使用 15px、1.8 的宽松变体。
- **Action**（660，13px，1.5）：明确命令与主操作。
- **Label**（620，11px，1.5）：标签、时间、元数据和紧凑控件，数字使用 tabular-nums。

### Named Rules

**The Serif Identity Rule.** 自托管 Noto Serif SC Variable 只用于品牌、页面标题和场景名；正文、标签与控件保持无衬线。

**The Zero Tracking Rule.** 所有可见文字保持 0 字距，不用负字距制造精致感。

## Layout

当前 emotional-player 应用壳在桌面使用 208px 固定侧栏、最大 1360px 的滚动工作区和 76px 持续播放器；常规页面内边距为上下 34/64px、左右 48px。聆听、创建和高级配置根据任务采用两列网格，间距通过 `clamp()` 在 30 至 84px 范围内响应。

在 821 至 1180px 之间，侧栏收至 184px，工作区左右内边距收至 34px。820px 及以下切换为 60px 顶部品牌、72px 紧凑播放器和 68px 底部导航；内容在三者之间独立滚动，并保留 safe-area。360px 及以下隐藏控制轨封面，为播放与三个必要操作保留触控空间。探索和专注状态才让场景画面扩大，日常界面仍保持工具密度。这些数值描述当前 surface，不替代其他页面自己的 surface brief。

## Elevation & Depth

系统以底色变化和 1px 分隔线为主，阴影只出现在明确抬升的输入面板、封面、浮层、任务通知和专注播放器。浅色通用浮层使用 `0 14px 36px rgba(34, 47, 40, 0.12)`，深色主题切换为 `0 18px 46px rgba(0, 0, 0, 0.3)`；封面使用更宽的 `0 18px 44px rgba(46, 58, 51, 0.14)`，小控件只保留低幅阴影。

### Shadow Vocabulary

- **Ambient Panel**（`0 14px 36px rgba(34, 47, 40, 0.12)`）：浅色输入面板、快速控制和通知。
- **Ambient Panel Dark**（`0 18px 46px rgba(0, 0, 0, 0.3)`）：同一语义在深色主题中的实现。
- **Artwork Lift**（`0 18px 44px rgba(46, 58, 51, 0.14)`）：当前场景正式位图。
- **Compact Control**（`0 2px 8px rgba(37, 47, 41, 0.08)`）：选中 tab 与微型抬升状态。
- **Focus Player**（`0 16px 38px rgba(23, 31, 26, 0.16)`）：沉浸场中的持续播放控件。

### Named Rules

**The Flat-First Rule.** 静态结构靠底色与 1px 分隔线建立层次；阴影只给抬升的输入面板、浮层、通知和媒体。

## Shapes

形状语言克制而精确：标签与小媒体使用 5 至 6px，按钮、导航和控件使用 7px，面板、封面和浮层使用 8px。圆形只用于播放状态点、滑块拇指和旋转等待指示器；大面积胶囊与夸张圆角不属于该系统。位图通过稳定的正方形或 1.48:1 比例裁切，边框统一为 1px 低对比线。

**The Small Radius Rule.** 内容容器保持 6 至 8 像素圆角，只有状态点、滑块拇指和旋转指示器使用圆形。

## Components

组件整体“克制而明确”：静态状态靠字色、底色和细线区分，动作通过图标、文字与焦点环共同说明，不依赖装饰。

### Buttons

- **Shape:** 主操作为 46px 高、7px 圆角和 `0 17px` 内边距；紧凑主操作降至 38px 高。
- **Primary:** 炭色底配抬升表面文字；悬停切换为矿物灰绿，按下下移 1px。
- **Icon:** 标准 40px 方形，紧凑版 34px；透明底在悬停时变为 muted surface。
- **Focus:** 所有按钮使用 2px `focus` 轮廓和 3px offset；禁用状态保留 46% 不透明度并移除可点击光标。

### Chips

- **Style:** 分类筛选使用 3px 内边距的 muted 容器，子项 30px 高、5px 圆角。
- **State:** 未选中为透明底和 secondary 文字；选中为 raised surface、主墨色与轻微阴影。

### Cards / Containers

- **Corner Style:** 场景媒体 7px，输入面板与浮层 8px。
- **Background:** 日常列表保持无卡片底；只有输入、通知和确实抬升的工具使用 raised surface。
- **Shadow Strategy:** 遵循 Flat-First Rule，图片封面与临时浮层例外。
- **Border:** 信息分组优先使用 1px `line` 分隔，而不是包裹每一项。
- **Internal Padding:** 输入面板使用 27px/28px 起始内边距，紧凑通知使用 11px/12px。

### Inputs / Fields

- **Style:** 创建输入置于 8px raised surface 中，文本区本身无边框；滑杆为 3px 轨道和 14px 圆形拇指。
- **Focus:** 文本光标使用珊瑚，键盘焦点使用 2px 矿物绿轮廓；textarea 移除内部 outline，由容器语义承担。
- **Disabled:** 未接入的声音与设备控件保持原布局，以 34% 至 62% 不透明度明确不可用。

### Navigation

桌面导航项为 44px 高、7px 圆角、13px/590 无衬线；默认使用 secondary 文字，悬停使用 muted surface，当前项使用 active-soft 底和 active 文字。当前 surface 在移动端转为顶部品牌与四项底部导航，图标 19px、标签 11px。

### Persistent Player

持续播放器使用 raised surface 与顶部细线横跨整个窗口。左侧到中部是留白充足的当前声景信息入口，点击后展开或收起播放器；右侧依次放置同规格的倒计时、总音量和播放/暂停控件，不另设展开按钮。倒计时默认显示未启动或剩余时间，总音量默认显示百分比，两者点击后通过与按钮等宽的竖向刻度 popover 披露设置。展开态沿用完全相同且不位移的控制轨，在第一屏增加场景画面与轻重/简繁，并在右上角提供明确的收起按钮。播放器表面由底部向上裁切揭示，控制轨封面通过共享几何移动到主图窗；场景素材只以低强度环境色温延伸到工作面。图窗整块作为沉浸聆听入口，桌面悬停或键盘聚焦时才显露扩展图形，触屏保留克制的常驻提示；点击后沉浸场从图窗边界扩张至全屏，关闭时回到原位。第一屏底部只用细线和向下箭头引导继续滚动，声景调节始终顺接在下方；滚动交界只让主画面与文字轻微退后，不添加独立页面或功能标题。窄屏把三个控制项改为图标与紧凑状态上下排列。

### Background Task Notification

后台任务以 74px 高的抬升通知显示阶段、进度和“当前声景继续播放”。完成态才出现“稍后”和“切换”，不会自动抢占播放器；显示/隐藏使用 180 至 240ms 的淡入与 12px 位移，并尊重 reduced-motion。

### Named Rules

**The Progressive Control Rule.** 默认控制轨只暴露播放、音量和定时；展开播放器后才出现轻重/简繁，继续向下滚动才进入单层声音和播放质感，不再要求用户额外打开一个面板。

**The Continuous Scene Rule.** 自然声景没有播放终点；除真正有时长的试听或导出媒体外，持续播放器不得出现进度条、已播放时间或总时长。

**The Explicit Switch Rule.** 后台任务完成只提供结果与切换动作，不自动替换当前正在播放的声景。

## Do's and Don'ts

### Do:

- **Do** 让冷白或炭黑工作台保持主导，并用矿物灰绿表达选择、播放与持续状态。
- **Do** 用正式膜片位图承载场景辨识度，并保持控件层克制。
- **Do** 先呈现普通用户能理解的感受控制，再通过自然滚动抵达更细的声景调节。
- **Do** 为键盘焦点、禁用状态、后台进度和 reduced-motion 提供明确反馈。

### Don't:

- **Don't** 把日常产品壳做成 AI 模板、概念海报或全屏首屏叙事。
- **Don't** 使用米白禅意、水墨竹子、廉价渐变或装饰性手绘 SVG。
- **Don't** 用珊瑚标记被动状态，或用大圆角卡片堆叠替代清楚的信息层级。
- **Don't** 默认暴露音频工程参数，也不要让后台生成打断当前播放或强制切换。
