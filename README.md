# MAC-POSAIS · 3D 态势大屏 Demo

Vue 3 + three.js 的 3D 态势感知大屏:**舆情态势穹顶** + **知识图谱星云** 双场景,深空战术 HUD 风格。先用 mock 数据跑通,适配层已对齐后端契约,后续接入真实接口只改一处。

> 运行环境要求见 [`requirements.txt`](./requirements.txt)。本项目是 **Node.js 项目**(非 Python),依赖用 `npm` 安装。

## 运行要求

- **Node.js ≥ 20.19**(推荐 22 LTS;Vite 8 要求 `^20.19 || >=22.12`)
- **npm ≥ 9**(随 Node 自带)
- 现代浏览器(Chrome / Edge / Firefox),需 WebGL2
- (可选)Google Chrome / Microsoft Edge —— 仅 `scripts/verify.mjs` 端到端验证用

## 快速开始

```bash
npm install        # 安装依赖
npm run dev        # 开发服务器 → http://localhost:5190/
```

打开后,底栏切换「态势穹顶 / 知识星云」两个场景。

```bash
npm run build      # 生产构建 → dist/
npm run preview    # 预览构建产物
node scripts/verify.mjs   # (可选)无头渲染验证 + 截图 + console 错误检查
```

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Vue 3 + Vite 8 |
| 3D | three.js r184(bloom 后处理)+ 3d-force-graph(知识星云) |
| 动效 | delta-time 驱动的 RAF 循环(与 fps 无关) |
| 验证 | puppeteer-core(接系统 Chrome) |

## 项目结构

```
src/
├── api/                 # 适配层:接口形状对齐后端,mock 现返;换真实后端只改 backend.js
│   ├── backend.js       #   ★ 切换点(createMockApi ↔ createRealApi)
│   ├── dgApi.js graphApi.js simApi.js spiderApi.js
│   └── mock/            #   mock 数据(sessions/graph/sim.json)
├── three/               # 框架无关 3D 逻辑(可整段搬到后端项目)
│   ├── core/createStage.js     # 通用舞台:renderer/scene/camera/bloom/loop/dispose
│   ├── dome/SituationDome.js   # 舆情态势穹顶
│   ├── nebula/KnowledgeNebula.js # 知识星云(3d-force-graph)
│   └── shared/makeTextSprite.js
├── components/          # Vue 外壳 + HUD(DashShell/TopHud/LeftRail/RightRail/BottomBar/SceneCanvas/NebulaPanel)
├── composables/useCountUp.js
├── utils/risk.js
└── assets/style.css     # 设计令牌 + 氛围层 + 动效
scripts/verify.mjs       # 端到端验证
```

## 接入真实后端

适配层 `src/api/` 的接口签名与返回 JSON 形状对齐后端契约。当前走 mock;接入真实后端时,新建 `src/api/real.js` 实现 `createRealApi()`(基于 fetch),并把 `src/api/backend.js` 的 `createMockApi` 换成 `createRealApi` 即可,**场景/组件代码零改动**。

## 关于 three.js

依赖用 npm `three@0.184.0`(见 `package.json`)。早期版本曾用本地 `three.js` 仓库的文件别名,但 `3d-force-graph` 的依赖会 import `three/examples/*`、`three/webgpu` 子路径,文件别名解析不了,故改用 npm three(其 package.json 的 exports 映射可解析全部子路径)。
