import { createMockApi } from './mock'

// 适配层后端切换点。
// 当前:mock。接入真实 POISS 时,把下行换成真实实现(基于 fetch,接口形状保持一致):
//   import { createRealApi } from './real'
//   export const backend = createRealApi()
// 各 dgApi/graphApi/simApi/spiderApi 只依赖 backend,切换实现时组件/场景代码零改动。
export const backend = createMockApi()
