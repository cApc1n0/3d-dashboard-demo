import { backend } from './backend'

// MindSpider 七平台舆情统计。对应设计文档中"新增轻量只读聚合接口"(可延后接真实)。
export const spiderApi = {
  getPlatformStats: (sid) => backend.spider.getPlatformStats(sid),
}
