# 实时半透明膜片渲染调研

> 状态：已暂停。当前产品采用静态资源优先策略；本文仅保留为未来恢复动态研究时的技术记录。

## 结论

方向 A 可行，但素材应当从“透明 PNG 抠图”改成“灰度厚度/透射图”。Image 2 负责不可程序化替代的有机轮廓与微观纹理，GPU 负责颜色、折射、吸收、边缘高光、投影与叠层关系。这样同一张膜片可以在不同场景中重新着色、变形和组合，不会把母版背景一起带入画面。

第一版采用 OGL 1.0.11 + WebGL2 多 pass 合成。OGL 抽象很薄、零依赖、完整模块约 29 KB minzip，包含纹理与 RenderTarget，适合以 shader 为中心的 2D/2.5D 场景；其许可证为 Unlicense。原型依赖通过 npm 锁定，不使用随时间漂移的 CDN latest。

## 方案比较

| 方案 | 适合点 | 当前判断 |
| --- | --- | --- |
| [OGL](https://github.com/oframe/ogl) | 极薄 WebGL 抽象、RenderTarget、shader 直接控制 | 第一版采用 |
| [TWGL](https://twgljs.org/docs/) | 更接近原生 WebGL2，buffer/texture/framebuffer 辅助完整 | 需要更低层控制时替代 OGL |
| [PixiJS v8](https://pixijs.com/8.x/guides/components/filters) | atlas、sprite、filter 和 2D 场景管理成熟 | 产品进入大量 UI 精灵和编辑器阶段再评估 |
| [Three.js](https://threejs.org/manual/en/rendertargets.html) | 3D、相机、网格与材质生态完整 | 当前纯 2.5D 合成过重 |
| GSAP | 高层状态编舞与复杂时间线 | 首版无需引入；shader uniform 由 render loop 驱动 |
| WASM | 轮廓处理、SDF、布局求解、软体物理 | 不参与逐像素合成；浏览器 GPU 更合适 |

## 光学模型

Khronos 的 `KHR_materials_volume` 将厚度纹理、衰减颜色/距离、折射作为体积透射的核心输入，并用 Beer 定律描述透射率。这里不追求完整路径追踪，但沿用同一组可解释参数：亮度作为近似厚度，吸收系数和厚度决定透射，厚度梯度驱动局部折射与边缘法线。

每帧顺序如下：

1. 生成环境光场到 RenderTarget A。
2. 按已知深度从后到前遍历 6-8 个膜片。
3. 当前 pass 读取上一张 RenderTarget，在膜片范围内做折射采样、Beer-Lambert 式衰减、散射着色和边缘高光，写入另一张 RenderTarget。
4. A/B ping-pong，最后做一次统一调色和细颗粒输出。
5. WebGL2 + `EXT_color_buffer_float` 时使用 RGBA16F；否则降级为 RGBA8。

固定数量且可控排序的膜片不需要第一天就上 OIT。Weighted Blended OIT 适合未知顺序的大量透明几何，但它是近似算法；若将来出现数十个自由穿插的动态膜片，再评估这一方向。

## 素材管线

SAM 2、BiRefNet 等方案适合获取对象轮廓，但分割 mask 不包含透明物体内部的真实透射厚度。当前更可靠的方式是直接让 Image 2 生成黑底灰度厚度 atlas，并在导入时验收：纯黑背景、无投影、无重叠、无文字、形状之间有安全间距。

素材库增长到几十 MB 后再引入 [Basis Universal / KTX2](https://github.com/BinomialLLC/basis_universal)；第一张 1.6 MB PNG 不值得提前增加转码和运行时复杂度。

## 第一版风险边界

- 灰度厚度是美术近似，不是扫描得到的物理测量。
- 多 pass 成本随层数线性增长，应限制渲染分辨率、DPR 和活跃层数。
- 半透明排序由产品编排决定；跨层互穿或真实三维自遮挡不在第一版范围内。
- 低端设备应保留静态位图降级，而不是用廉价 CSS 形状冒充同一种材质。
