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

## 操作台 / Operational Console

底栏切换 **态势 / 操作台**。态势 = 穹顶+星云展示;**操作台把后端全部操作能力做成 6 个 tab 面板**(`src/components/console/`),覆盖 `mac/MAC-POISS/poiss` 的:

| Tab | 能力 | 本机现状 |
|---|---|---|
| 决策生成 | 会话列表/事件理解(上传分析)/三套策略推荐/五维分解/报告下载/策略迭代 | ✅ 会话+策略+分解+报告(真实数据);分析/迭代需 LLM |
| 知识图谱 | 项目列表/上传JSON图谱/构建图谱/本体生成/质量分析 | ✅ 项目+上传;构建/本体/分析需 Neo4j+LLM |
| 策略仿真 | 仿真列表/创建+准备+启停/运行态/Agent采访 | ✅ 列表+运行态;创建/启动/采访需 OASIS+LLM |
| 多智能体推演 | Agent卡/会话/启动-下一轮/干预队列/AI建议 | ✅ 会话+创建+干预(文件);回合/抽取/AI 需 LLM |
| 干预与治理 | 干预类型/手动执行/紧急停止/可追溯因果链 | ✅ 类型+执行+紧急停止(文件,现在可用) |
| 闭环 | DG↔POISS 双向传输/策略套件创建-运行 | ✅ 导航+套件创建;传输/运行需 Neo4j/OASIS |

> 文件类接口(无 LLM/Neo4j/OASIS)**现在就能跑出真实数据**;重依赖类把 UI + 接线做好,后端返回 `config_error` 时用错误芯片优雅降级(不崩、console 零报错)。
> 推演 Agent 列表:后端 Agent 按 `uploads/agents/<session>/` 分目录存,`/agent/list` 的 mgr 作用域查不到该目录(后端 listing 待修),故 Agent 卡列表暂空;会话/创建/干预均正常。
> 验证:`node scripts/verify-console.mjs`(逐 tab 截图 + console 错误检查 + WebGL 往返)。种子:`node scripts/seed-poiss.mjs --http`(起 poiss 后灌图谱+推演会话+Agent)。

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

## 接入真实后端(POISS,端口 5124)

适配层已实现对真实 POISS(`mac/MAC-POISS/poiss`)的接入,契约**对照源码核实**:

| 文件 | 作用 |
|---|---|
| `src/api/real.js` | `createRealApi()` —— fetch 直连 POISS,接口形状对齐源码 |
| `src/api/backend.js` | 切换点:`VITE_USE_REAL_API=true` 走 real,否则 mock(**场景/组件零改动**) |
| `vite.config.js` | `/api`、`/health` 代理到 `VITE_POISS_TARGET`(默认 `127.0.0.1:5124`),规避 CORS |
| `scripts/poiss-stub.mjs` | 契约桩:本机无法起 POISS 时,用「真实契约形状」联调(零依赖) |
| `scripts/seed-poiss.mjs` | 往真实 POISS 灌文件种子(DG 会话 + graphiti 图谱),无需 LLM/Neo4j |

**已实测打通(真实 POISS,本机)**:Python 3.12 venv + 依赖 → `run.py` 起 5124 → 种子数据 → 前端 `VITE_USE_REAL_API=true` → 穹顶/星云由**真实后端数据**驱动(console 零报错、往返切换正常)。

**接入步骤**(POISS 跑起来后):

```bash
# 1. 起 POISS(在它自己目录)。Python 3.12 即可 —— camel-ai/oasis 仅仿真用、按需懒加载,
#    穹顶/星云不需要。穹顶/星云所需依赖:flask flask-cors python-dotenv pydantic openai
#    neo4j graphiti-core PyMuPDF python-docx jieba matplotlib pandas
cd mac/MAC-POISS/poiss
python -m venv .venv && .venv/Scripts/python -m pip install -r requirements.txt
cp .env.example .env          # 占位 key 即可通过校验;真正用 LLM/图谱构建再填真 key
python run.py                 # → http://127.0.0.1:5124

# 2. 灌种子数据(文件后端,无需 LLM/Neo4j 即可让穹顶+星云有数据)
cd 3d-dashboard-demo && node scripts/seed-poiss.mjs
#   DG 会话直接写文件;图谱再经后端上传:
curl -X POST http://127.0.0.1:5124/api/graph/project/create -H "Content-Type: application/json" -d '{"name":"seed"}'
curl -X POST http://127.0.0.1:5124/api/graph/upload -F "project_id=<上一步 proj_xxx>" \
     -F "file=@../mac/MAC-POISS/poiss/uploads/graph-seed.json;type=application/json"

# 3. 前端切到真实后端
cp .env.example .env          # VITE_USE_REAL_API=true
npm run dev                   # → http://localhost:5190/
```

> 各功能所需后端条件:**穹顶(风险核心/五维/平台/关键词)** ← DG 会话(文件即可,无需 LLM)。**星云(图谱)** ← uploaded_ 图谱(文件即可,无需 Neo4j)或 Neo4j 构建的图谱。**仿真面板/演化** ← 需真正跑 OASIS 仿真(重,需 camel-ai + 真实运行)。**七平台统计** ← 后端待新增接口(`VITE_PLATFORM_STATS=true` 启用)。详见 [`后端接入说明.md`](../后端接入说明.md) §B。

**联调验证(不起 POISS 时)**:`node scripts/poiss-stub.mjs` 起契约桩(5124),`VITE_USE_REAL_API=true npm run dev`,用真实契约形状跑通 real.js + 代理 + 穹顶/星云。

### 对照源码发现的契约修正(已以源码为准,文档待回填)

接入说明 §B 与 mock 早期按文档实现,核实源码后**真实后端**有几处不同,`real.js` 已按源码处理:

1. **图谱 `/api/graph/data/<gid>` 实际包 `{success, data:{nodes,edges,...}}`**(文档写的是无 `.data` 的 `{nodes,edges}`)。`real.js` 解 `.data`,并把 graphiti 字段(`uuid/name/labels/summary`、`source_node_uuid/target_node_uuid`)归一成星云消费的 `{id,label,name,type,degree,risk}` / `{source,target,valid_at,invalid_at,weight}`。
2. **仿真运行态路径是 `/api/simulation/<id>/run-status`**(文档写的是 `/status`)。
3. 图/仿真 id 缺省时:`real.js` 自动发现最新图(先 `uploaded_`:`/api/graph/project/list`;再 Neo4j:`/api/graph/neo4j-graphs`)与最新仿真(`/api/simulation/history`)。
4. **MindSpider 七平台统计后端尚无接口**(§B6-1 建议新增 `/api/dg/session/<sid>/platform-stats`);默认不请求(避免 404),后端实现后 `VITE_PLATFORM_STATS=true` 启用。
5. **Python 3.12 即可启动**(非 requirements 暗示的 3.11):`camel-ai`/`camel-oasis` 仅 OASIS 仿真按需懒加载,穹顶/星云路径不触发;`create_app()` 不 import 它们。

## 关于 three.js

依赖用 npm `three@0.184.0`(见 `package.json`)。早期版本曾用本地 `three.js` 仓库的文件别名,但 `3d-force-graph` 的依赖会 import `three/examples/*`、`three/webgpu` 子路径,文件别名解析不了,故改用 npm three(其 package.json 的 exports 映射可解析全部子路径)。
