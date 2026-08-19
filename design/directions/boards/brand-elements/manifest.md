# 声景品牌元素风格保持测试

## Produce

| id | source | output | strategy | dimensions | format | transparency | deviations | qa_status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| logo-exploration-v1 | 用户提供的半透明裁片参考图 | `logo-exploration-v1.png` | 参考图约束下重新生成四枚标志候选，并附单色小尺寸剪影 | 1254 x 1254 | PNG | 画面内模拟半透明，文件无 alpha | 候选共享三片式拓扑；字标仅作构图预览，不能直接定稿 | needs_parent_review |
| banner-v1 | 参考图 + 标志探索页 | `banner-v1.png` | 3:1 宽幅品牌构图 | 2172 x 724 | PNG | 画面内模拟半透明，文件无 alpha | 无 | accepted |
| sticker-sheet-v1 | 参考图 + 标志探索页 | `sticker-sheet-v1.png` | 十二枚统一材质的贴画与状态标记 | 1254 x 1254 | PNG | 画面内模拟半透明，文件无 alpha | 第 09 枚使用熟悉的播放三角，仅作为状态语义，不作为品牌母题 | accepted |
| element-library-v1 | 参考图 + 标志探索页 | `element-library-v1.png` | 声音层、叠层、状态与校准标记的辅助元素板 | 1536 x 1024 | PNG | 画面内模拟半透明，文件无 alpha | 状态标记是探索稿，正式界面需代码重建 | accepted |

每张 PNG 均已嵌入生成时使用的完整提示词。对应的可读提示词保存在 `design/prompts/brand-elements-*.txt`。

## Direct

无。所有图像均由参考图重新生成，未直接裁切参考母版作为交付资产。

## Semantic

| id | implementation | notes | qa_status |
| --- | --- | --- | --- |
| final-logo-vector | 选定候选后，以 SVG 重建外轮廓、负空间、单色版与小尺寸光学修正；材质版作为独立位图或着色器表现 | 当前 PNG 只负责方向与材质验证 | pending |
| final-wordmark | 使用真实中文字库重新排印“声景”，禁止从生成图描摹字形 | 字距保持 0，需单独确认中英组合 | pending |
| interface-states | 播放、生成、就绪、待切换使用 SVG/CSS/canvas 重建，并验证单色和无动画状态 | 不把贴画页中的像素图直接当按钮图标 | pending |

## Execution Order

1. 用户判断这组是否保持住参考风格。
2. 锁定一枚标志拓扑，继续做两到三轮几何收敛。
3. 重建 SVG 标志与正式字标。
4. 从 Banner 和元素库拆出真正需要上线的独立资产。

## Blockers

无生成阻塞。当前唯一待决事项是标志候选选择。

## Assumptions

- 本轮目标是验证视觉语言一致性，不是直接交付生产 Logo。
- 暖白底、蓝灰、矿物灰绿、余烬珊瑚和炭黑是本轮固定色域。
- 半透明应来自材料厚度、微纹理、边缘和叠色，不用玻璃拟态替代。
