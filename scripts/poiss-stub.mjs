// POISS 契约桩(Contract Stub)—— 仅用于在前端联调阶段,本地无法启动真实 POISS 时,
// 用「按源码核实的真实契约形状」跑通 适配层 real.js + vite 代理 + 穹顶/星云 渲染。
//
// 为什么需要它:真实 POISS(Flask)依赖 Python 3.11 + DeepSeek/DashScope key + Neo4j 5.x + 已分析会话,
// 这些在本机不一定齐备。本桩用 Node 内置 http,零依赖,seed 取自 src/api/mock/*.json,
// 但**响应形状严格对齐真实后端源码**(尤其 graph 包 {success,data}、graphiti 字段名、sim 的 .data),
// 专门逼出 real.js 的解包/归一逻辑。真实后端跑起来后直接停掉本桩即可,real.js 无需改动。
//
// 用法: node scripts/poiss-stub.mjs            (监听 127.0.0.1:5124)
//       然后 VITE_USE_REAL_API=true npm run dev
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MOCK = path.resolve(__dirname, '../src/api/mock')
const read = (f) => JSON.parse(fs.readFileSync(path.join(MOCK, f), 'utf-8'))

const sessions = read('sessions.json')
const graph = read('graph.json')
const sim = read('sim.json')

const HOST = '127.0.0.1'
const PORT = Number(process.env.STUB_PORT) || 5124

// graphiti 风格节点/边(逼 real.js 走 uuid→id、labels→type 推断、source_node_uuid→source 归一)
const TYPE_LABEL = {
  product: 'Product', event: 'Event', org: 'Organization', person: 'Person',
  media: 'Media', action: 'Action', concept: 'Concept', location: 'Location', time: 'Time',
}
const graphitiNodes = graph.data.nodes.map((n) => ({
  uuid: n.id,
  name: n.label,
  labels: ['Entity', TYPE_LABEL[n.type] || 'Concept'],
  summary: `${n.label}(${n.type})`,
  group_id: 'grp_demo',
  created_at: '2026-06-10T08:00:00Z',
  ...(n.risk ? { risk: n.risk } : {}),
}))
const graphitiEdges = graph.data.edges.map((e, i) => ({
  source_node_uuid: e.source,
  target_node_uuid: e.target,
  fact_type: '关联',
  valid_at: e.valid_at,
  invalid_at: e.invalid_at,
  weight: e.weight,
  order: i,
}))

const json = (res, obj, code = 200) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(obj))
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://${HOST}`)
  const p = u.pathname

  if (p === '/health') return json(res, { status: 'ok', service: 'MAC-POSAIS', version: '1.0.0' })

  // ---- DG(无 .data)----
  if (p === '/api/dg/sessions') {
    const items = sessions.sessions.map((s) => ({
      session_id: s.session_id,
      name: `[DG] ${s.event_type}_${s.created_at.slice(0, 10)}`,
      event_type: s.event_type,
      risk_score: s.risk_score,
      created_at: s.created_at,
      iteration_status: s.iteration_status,
    }))
    return json(res, { sessions: items, total: items.length })
  }
  const dgDetail = /^\/api\/dg\/session\/([^/]+)\/detail$/.exec(p)
  if (dgDetail) return json(res, sessions.bySession[sessions.default].detail)
  const dgDecomp = /^\/api\/dg\/session\/([^/]+)\/risk\/decomposition$/.exec(p)
  if (dgDecomp) return json(res, sessions.bySession[sessions.default].decomposition)
  const dgPlat = /^\/api\/dg\/session\/([^/]+)\/platform-stats$/.exec(p)
  if (dgPlat) return json(res, sessions.bySession[sessions.default].platformStats)

  // ---- Graph(包 {success, data};真实源码即如此)----
  if (p === '/api/graph/neo4j-graphs') {
    return json(res, {
      success: true,
      data: [{ graph_id: 'grp_demo', node_count: graphitiNodes.length, first_created: '2026-06-10T08:00:00Z' }],
    })
  }
  const gData = /^\/api\/graph\/data\/([^/]+)$/.exec(p)
  if (gData) {
    return json(res, {
      success: true,
      data: {
        graph_id: gData[1],
        nodes: graphitiNodes,
        edges: graphitiEdges,
        node_count: graphitiNodes.length,
        edge_count: graphitiEdges.length,
      },
    })
  }

  // ---- Sim({success, data})----
  if (p === '/api/simulation/history') {
    return json(res, {
      success: true,
      data: sim.history.map((h) => ({
        ...h,
        updated_at: h.created_at,
        total_rounds: 100,
        current_round: h.status === 'running' ? 42 : 100,
      })),
    })
  }
  const rs = /^\/api\/simulation\/([^/]+)\/run-status$/.exec(p)
  if (rs) return json(res, { success: true, data: sim.runStatus })

  json(res, { success: false, error: `stub: no route ${p}` }, 404)
})

server.listen(PORT, HOST, () => {
  console.log(`[poiss-stub] 契约桩监听 http://${HOST}:${PORT}  (真实契约形状,seed=mock/*.json)`)
  console.log(`[poiss-stub] 用法:VITE_USE_REAL_API=true npm run dev  →  前端走 real.js + 代理 → 本桩`)
})
