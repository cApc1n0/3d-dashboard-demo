import Graph from '3d-force-graph'

// 9 类语义着色(与现有 2D 图调色板同风格)
const TYPE_COLORS = {
  event: '#FFD600',
  product: '#00E5FF',
  org: '#7C8BFF',
  person: '#00E676',
  media: '#FF9100',
  action: '#FF5252',
  concept: '#B388FF',
  location: '#607080',
  time: '#9DB4C8',
}
const RISK_COLOR = '#FF5252'

function tipHTML(n) {
  const risk = ((n.risk || 0) * 100) | 0
  return `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#EAF6FB;background:rgba(6,9,18,.94);border:1px solid #00E5FF;padding:5px 9px;border-radius:3px;white-space:nowrap;box-shadow:0 0 12px rgba(0,229,255,.25)">
    <b style="color:#00E5FF">${n.name || n.id}</b> · ${n.type || '?'}<br/>
    <span style="color:#7E93A8">度 ${n.degree ?? '-'}</span> · <span style="color:${risk > 60 ? RISK_COLOR : '#9DB4C8'}">风险 ${risk}%</span>
  </div>`
}

// 知识星云:3d-force-graph 渲染 nodes/edges;按 9 类着色、按度/risk 定大小、双时态边褪色、高风险红光。
export function createKnowledgeNebula(container, { onNodeClick } = {}) {
  let graph = null
  let current = { nodes: [], links: [] }

  function transform(g) {
    return {
      nodes: (g?.nodes || []).map((n) => ({ ...n, val: 2 + (n.degree || 1) * 1.2 })),
      links: (g?.edges || []).map((e) => ({
        source: e.source,
        target: e.target,
        valid_at: e.valid_at,
        invalid_at: e.invalid_at,
        weight: e.weight,
        faded: !!e.invalid_at, // 双时态:有 invalid_at 的边视为已失效 → 褪色
      })),
    }
  }

  function build() {
    graph = Graph()(container)
      .graphData(current)
      .backgroundColor('rgba(0,0,0,0)')
      .showNavInfo(false)
      .nodeRelSize(4)
      .nodeVal('val')
      .nodeLabel(tipHTML)
      .nodeColor((n) => (n.risk > 0.6 ? RISK_COLOR : TYPE_COLORS[n.type] || '#00E5FF'))
      .nodeOpacity(0.95)
      .linkColor((l) => (l.faded ? 'rgba(70,90,120,0.22)' : 'rgba(0,229,255,0.55)'))
      .linkWidth((l) => (l.faded ? 0.3 : 0.6))
      .linkDirectionalParticles((l) => (l.faded ? 0 : 2))
      .linkDirectionalParticleWidth(0.5)
      .linkDirectionalParticleColor(() => 'rgba(0,229,255,0.7)')
      .linkDirectionalParticleSpeed(0.004)
      .cooldownTicks(120)
      .onNodeClick((n) => onNodeClick?.(n))
    graph.width(container.clientWidth).height(container.clientHeight)
    graph.cameraPosition({ z: 45 })
  }

  function update(g) {
    current = transform(g)
    if (graph) graph.graphData(current)
    else build()
  }

  function resize() {
    if (graph) graph.width(container.clientWidth).height(container.clientHeight)
  }
  function dispose() {
    if (graph) {
      // 必须按顺序:停动画 → 释放 WebGL context → 析构,否则残留 context/rAF 卡住后续场景
      try { graph.pauseAnimation?.() } catch (_) {}
      try { graph.renderer?.()?.dispose?.() } catch (_) {}
      try { graph._destructor?.() } catch (_) {}
      graph = null
    }
    // 清理容器内残留 DOM(3d-force-graph 的 canvas/overlay)
    try {
      while (container.firstChild) container.removeChild(container.firstChild)
    } catch (_) {}
  }

  return { update, resize, dispose }
}
