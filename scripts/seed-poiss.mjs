// 往真实 POISS 灌「文件后端」种子数据,让穹顶+星云在没有 LLM/Neo4j 时也能显示真实(经后端)数据。
//   1) DG 会话:直接写 uploads/dg_sessions/<sid>.json(session_store 格式)。detail/decomposition 端点读它,无需 LLM。
//   2) 图谱:生成 graphiti 格式 {nodes,edges} 文件,稍后用 curl 经 /api/graph/upload 灌入(uploaded_ 图谱,无需 Neo4j)。
// seed 源 = 前端 mock/*.json,但 assessment 补齐 decomposition 端点要读的全部下标字段。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MOCK = path.resolve(__dirname, '../src/api/mock')
const read = (f) => JSON.parse(fs.readFileSync(path.join(MOCK, f), 'utf-8'))

const sessions = read('sessions.json')
const graph = read('graph.json')

// ---------- 1) DG 会话(session_store 格式)----------
const d = sessions.bySession[sessions.default].detail
const dec = sessions.bySession[sessions.default].decomposition
// decomposition 端点从 assessment 读这些下标字段;补齐使五维非零
const val = (k) => dec.dimensions[k].final_score
const session = {
  session_id: d.session_id,
  name: `[DG] ${d.info.event_type.primary_type}_2026-06-12_${d.session_id.slice(-6)}`,
  created_at: '2026-06-12T14:26:00',
  info: d.info,
  assessment: {
    comprehensive_risk_score: d.assessment.comprehensive_risk_score,
    risk_level: d.assessment.risk_level,
    risk_level_detail: d.assessment.risk_level_detail,
    // decomposition 端点读取的下标
    spread_scope_index: val('spread_scope'),
    spread_speed_coefficient: val('spread_speed'),
    content_sensitivity_score: val('content_sensitivity'),
    social_impact_index: val('social_impact'),
    potential_hazard_level: val('potential_hazard'),
    dimension_details: {
      spread_scope: {}, spread_speed: {}, content_sensitivity: {}, social_impact: {}, potential_hazard: {},
    },
    scoring_details: { comprehensive_risk: {} },
  },
  strategies: d.strategies,
  filepath: '',
  engine_status: 'converged',
  engine_config: null,
}

const POISS = 'C:/Users/qq172/Desktop/front/mac/MAC-POISS/poiss'
const dgDir = path.join(POISS, 'uploads/dg_sessions')
fs.mkdirSync(dgDir, { recursive: true })
const sessPath = path.join(dgDir, `${session.session_id}.json`)
fs.writeFileSync(sessPath, JSON.stringify(session, null, 2))
console.log(`[seed] DG 会话 → ${sessPath}`)

// ---------- 2) graphiti 格式图谱(供 /api/graph/upload)----------
const TYPE_LABEL = {
  product: 'Product', event: 'Event', org: 'Organization', person: 'Person',
  media: 'Media', action: 'Action', concept: 'Concept', location: 'Location', time: 'Time',
}
const gi = {
  nodes: graph.data.nodes.map((n) => ({
    uuid: n.id,
    name: n.label,
    labels: ['Entity', TYPE_LABEL[n.type] || 'Concept'],
    summary: `${n.label}(${n.type})`,
    group_id: 'grp_seed',
    created_at: '2026-06-10T08:00:00Z',
    ...(n.risk ? { risk: n.risk } : {}),
  })),
  edges: graph.data.edges.map((e) => ({
    source_node_uuid: e.source,
    target_node_uuid: e.target,
    fact_type: '关联',
    valid_at: e.valid_at,
    invalid_at: e.invalid_at,
    weight: e.weight,
  })),
}
const graphPath = path.join(POISS, 'uploads/graph-seed.json')
fs.writeFileSync(graphPath, JSON.stringify(gi, null, 2))
console.log(`[seed] graphiti 图谱 → ${graphPath} (${gi.nodes.length} 节点 / ${gi.edges.length} 边)`)

// ============================================================
// --http 模式:poiss 起来后,经接口灌「文件后端」操作台数据(无需 LLM/Neo4j)
//   用法: node scripts/seed-poiss.mjs --http   (需 poiss 在 POISS_URL 运行)
//   灌:图谱上传(若缺)、推演 Agent 卡、推演会话;回合/时间线为空(需 LLM)。
// ============================================================
const POISS_URL = process.env.POISS_URL || 'http://127.0.0.1:5124'
const AGENT_SEED = [
  { name: '消费者·林女士', card_type: 'individual', occupation: '婴幼儿家长', stance: '愤怒质疑', mbti: 'ISFJ', intensity: 0.82 },
  { name: '科普博主·陈博士', card_type: 'individual', occupation: '食品安全 KOL', stance: '理性科普', mbti: 'INTJ', intensity: 0.55 },
  { name: '涉事企业发言人', card_type: 'organization', occupation: '品牌公关', stance: '致歉安抚', mbti: 'ESTJ', intensity: 0.4 },
  { name: '市监局值班员', card_type: 'individual', occupation: '监管执法', stance: '权威通报', mbti: 'ISTJ', intensity: 0.6 },
  { name: '维权群组·发起人', card_type: 'individual', occupation: '消费者代表', stance: '组织维权', mbti: 'ENTJ', intensity: 0.75 },
]

async function httpSeed() {
  const api = async (p, opts = {}) => {
    const r = await fetch(POISS_URL + p, { headers: { 'Content-Type': 'application/json' }, ...opts })
    const t = await r.text()
    try {
      return JSON.parse(t)
    } catch {
      return { _status: r.status, _raw: t }
    }
  }
  // ① 图谱:找一个已有项目,没有则建+上传
  let projects = (await api('/api/graph/project/list'))?.data || []
  let proj = projects.find((p) => p.graph_id)
  if (!proj) {
    const np = await api('/api/graph/project/create', { method: 'POST', body: JSON.stringify({ name: '舆情态势种子图' }) })
    proj = np?.data || np
    const fd = new FormData()
    fd.append('project_id', proj.project_id)
    fd.append('file', new Blob([fs.readFileSync(graphPath)]), 'graph-seed.json')
    const r = await fetch(POISS_URL + '/api/graph/upload', { method: 'POST', body: fd })
    console.log('[seed-http] 图谱上传:', (await r.json()).graph_id)
  } else {
    console.log('[seed-http] 已有图谱项目:', proj.project_id, proj.graph_id)
  }

  // ② 推演会话(文件,无 LLM)
  const sess = await api('/api/deduction/session/create', {
    method: 'POST',
    body: JSON.stringify({ project_id: proj.project_id, graph_id: proj.graph_id, mode: 'manual', max_rounds: 10 }),
  })
  const sid = sess?.session_id
  console.log('[seed-http] 推演会话:', sid, '(mode=manual)')

  // ③ Agent 卡(需 session_id)
  const cardIds = []
  for (const a of AGENT_SEED) {
    const c = await api('/api/deduction/agent/create', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sid,
        name: a.name,
        card_type: a.card_type,
        basic_info: { name: a.name, occupation: a.occupation },
        background: { history: `${a.occupation},${a.stance}` },
        personality: { mbti: a.mbti },
        initial_stance: { attitude: a.stance, intensity: a.intensity },
      }),
    })
    if (c?.card_id) {
      cardIds.push(c.card_id)
      console.log('[seed-http] Agent:', c.card_id, a.name)
    } else {
      console.log('[seed-http] Agent 失败:', a.name, c?.error || c)
    }
  }
  console.log(`[seed-http] 完成:会话 ${sid} · ${cardIds.length} 个 Agent`)
}

if (process.argv.includes('--http')) {
  httpSeed().catch((e) => {
    console.error('[seed-http] 失败:', e.message, '\n请确认 poiss 已启动(POISS_URL=' + POISS_URL + ')')
    process.exit(1)
  })
} else {
  console.log('[seed] 文件种子已写。启动 poiss 后运行:node scripts/seed-poiss.mjs --http')
}
