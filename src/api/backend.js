import { createMockApi } from './mock'
import { createRealApi } from './real'

// 适配层后端切换点。
// VITE_USE_REAL_API=true → 接真实 POISS(mac/MAC-POISS/poiss,默认 5124,经 vite 代理);否则用 mock。
// 各 dgApi/graphApi/simApi/spiderApi 只依赖 backend,切换实现时组件/场景代码零改动。
const useReal = import.meta.env.VITE_USE_REAL_API === 'true'
export const backend = useReal ? createRealApi() : createMockApi()
