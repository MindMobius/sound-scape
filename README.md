# 声景

一句话，用声音描述世界。

声景把自然语言描述组织成可持续演化的声音环境。当前仓库已经沉淀产品定义、视觉与场景素材体系，以及用于验证日常聆听、渐进式配置和沉浸场的前端原型；真实生成服务、素材持久化和生产音频运行时仍未接入。

## 快速开始

```powershell
npm ci --prefix prototypes/emotional-player
npm run dev -- --port 4174
```

打开 `http://127.0.0.1:4174/?view=home`。

## 仓库结构

| 路径 | 职责 |
| --- | --- |
| `PRODUCT.md` | 产品定位、能力边界与不可虚构的事实 |
| `DESIGN.md` | 视觉语言、组件规则、动效与响应式规范 |
| `assets/` | 应用可直接消费的品牌、场景和平台静态资源 |
| `design/` | 提示词、方向稿、质量参考和视觉验收材料 |
| `prototypes/` | 可运行但可丢弃的产品与渲染实验 |
| `docs/` | 架构约定和经过保留的研究结论 |
| `tools/` | 仓库级资源校验与维护脚本 |
| `.impeccable/` | Impeccable 的配置与界面 brief，不存放构建产物 |

更完整的依赖方向和新增文件规则见 `docs/architecture/repository-layout.md`。

## 校验

```powershell
npm run validate:assets
npm run build
npm run check
```

品牌母版、场景清单、固定素材槽位和实验隔离规则见 `assets/README.md`；原型状态与启动方式见 `prototypes/README.md`。
