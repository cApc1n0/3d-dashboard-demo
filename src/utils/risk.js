// 风险等级 → 语义色/名 映射(与穹顶 riskColorMap 一致)
export const riskColorMap = { 1: '#00E676', 2: '#00E5FF', 3: '#FFD600', 4: '#FF9100', 5: '#FF5252' }
export const riskNameMap = { 1: '安全级', 2: '低风险', 3: '关注级', 4: '高危级', 5: '危机级' }

export const riskColor = (level) => riskColorMap[level] || riskColorMap[3]
export const riskName = (level) => riskNameMap[level] || '关注级'

// keywords[] 元素兼容:{word,weight} 或纯字符串
export const kwText = (k) => (typeof k === 'string' ? k : k?.word)
export const kwWeight = (k, fallback = 0.5) => (typeof k === 'string' ? fallback : (k?.weight ?? fallback))
