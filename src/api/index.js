// 适配层统一出口。组件/场景只从这里导入,不直接碰 mock 或 fetch。
export { dgApi } from './dgApi'
export { graphApi } from './graphApi'
export { simApi } from './simApi'
export { spiderApi } from './spiderApi'
