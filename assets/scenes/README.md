# 场景静态资产

一个场景对应一个目录和一份 `scene.json`。场景清单描述声音层、视觉方向和固定素材槽位，应用通过 `assets/scenes/index.json` 发现它们。

## 固定槽位

| 槽位 | 建议尺寸 | 用途 |
| --- | ---: | --- |
| `hero` | 1600 x 800 或更高，2:1 | 聆听主界面和大幅场景页 |
| `banner` | 2160 x 720 或更高，3:1 | 横幅、通知和分享头图 |
| `cover` | 1200 x 1200，1:1 | 场景封面、专辑式入口 |
| `thumbnail` | 960 x 720，4:3 | 列表、搜索和最近播放 |
| `detail` | 1536 x 1024，3:2 | 场景详情和编辑页局部素材 |

文件名采用 `<scene-id>-<slot>-vN.png`。图片必须无文字、无按钮、无伪造透明棋盘格，并在对应 `scene.json` 中登记。没有专属成片时，槽位明确标记 `shared-fallback` 或 `planned`；不得复制共享母版后改名冒充场景资产。

场景生成提示词放在 `design/prompts/scenes/<scene-id>/`，成熟后再把图片登记进总目录。`shared-fallback` 只能引用 `assets/brand/`；`ready` 必须引用当前 `assets/scenes/<scene-id>/` 下的专属文件。

## 首批场景

首批六个场景都已有经过验收的专属 Hero 和方形 Cover，足以支撑聆听主界面、场景库和专辑式入口的第一版。Cover 是独立创作的方形构图，不是 Hero 裁切。Banner 仍使用共享品牌母版，缩略图和详情图在进入对应产品界面时再从同一视觉方向派生。

| ID | 名称 | 当前状态 | 已可用视觉 |
| --- | --- | --- | --- |
| `rain-cabin` | 雨夜木屋 | Starter | 专属 Hero、专属 Cover、共享亮色 Banner |
| `forest-dawn` | 林间清晨 | Starter | 专属 Hero、专属 Cover、共享亮色 Banner |
| `coastal-night` | 深夜海岸 | Starter | 专属 Hero、专属 Cover、共享暗色 Banner |
| `night-train` | 夜行列车 | Starter | 专属 Hero、专属 Cover、共享暗色 Banner |
| `quiet-library` | 闭馆后的图书馆 | Starter | 专属 Hero、专属 Cover、共享亮色 Banner |
| `summer-courtyard` | 夏夜庭院 | Starter | 专属 Hero、专属 Cover、共享亮色 Banner |
