# 品牌静态资产

这里保存跨场景复用、已经过视觉验收的 Image 2 位图母版。

- `backgrounds/`：可直接作为 Hero、Banner 或播放器背景的完整 RGB 成片。
- `motifs/`：构图片段和纹章探索图集，使用时必须裁切，不应整张直接展示。
- `atlases/`：材料、叠色与微观质感参考图集，主要用于校准、选材和局部裁切。
- `identity/`：品牌标记的透明 PNG 母版，以及最小尺寸、主题颜色、净空和使用边界。

正式场景位图都登记在 `assets/catalog.json`。除 `identity/` 下明确标注的透明品牌母版外，这些图片没有透明通道，不能把纸面背景当作透明区域进行叠层。品牌标记由 `identity/README.md` 管理。场景专属成片放在 `assets/scenes/<scene-id>/`，不要继续堆进品牌目录。
