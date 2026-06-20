import { backend } from './backend'

// 策略套件接口(/api/strategy)。create 适配 DG 三套策略→可执行干预,无需 LLM。
export const strategyApi = {
  list: () => backend.strategy.list(),
  getStatus: (suiteId) => backend.strategy.getStatus(suiteId),
  getResults: (suiteId) => backend.strategy.getResults(suiteId),
  compare: (suiteId) => backend.strategy.compare(suiteId),
  getTimeline: (suiteId) => backend.strategy.getTimeline(suiteId),
  create: (body) => backend.strategy.create(body),
  run: (suiteId) => backend.strategy.run(suiteId),
  stop: (suiteId) => backend.strategy.stop(suiteId),
}
