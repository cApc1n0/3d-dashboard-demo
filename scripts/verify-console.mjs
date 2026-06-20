// 操作台逐 tab 验证 + 往返(态势↔操作台)。需 dev server 在 5190 + poiss 在 5124。
// 用法: node scripts/verify-console.mjs
import puppeteer from 'puppeteer-core'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5190/'
const TABS = ['决策生成', '知识图谱', '策略仿真', '多智能体推演', '干预与治理', '闭环']

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--window-size=1920,1080'],
})
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// 切换模式:点底栏「态势/操作台」按钮
const clickByText = (page, sel, text) =>
  page.evaluate(
    (s, t) => {
      const b = [...document.querySelectorAll(s)].find((x) => x.textContent.trim() === t)
      if (b) b.click()
      return !!b
    },
    sel,
    text
  )

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await sleep(3500)

  // 1) 进操作台
  const entered = await clickByText(page, '.scene-switch button', '操作台')
  await sleep(2500)
  const hasConsole = !!(await page.$('.console-stage'))
  await page.screenshot({ path: '.shot-console-dg.png' })
  console.log('ENTER_CONSOLE:', entered, '| .console-stage present:', hasConsole)

  // 2) 逐 tab 截图
  const tabResults = []
  for (let i = 0; i < TABS.length; i++) {
    const t = TABS[i]
    const ok = await clickByText(page, '.console-tabs .ct-btn', t)
    await sleep(1800)
    const panels = await page.$$eval('.console-body .panel', (els) => els.length)
    const hasErr = !!(await page.$('.console-body .err-chip'))
    const hasEmpty = await page.evaluate(() => !!document.querySelector('.console-body .cempty'))
    await page.screenshot({ path: `.shot-tab-${i + 1}.png` })
    tabResults.push({ tab: t, switched: ok, panels, hasErrChip: hasErr, empty: hasEmpty })
  }
  console.log('TABS:', JSON.stringify(tabResults))

  // 3) 切回态势,验证 WebGL 仍在
  await clickByText(page, '.scene-switch button', '态势')
  await sleep(2500)
  const gl = await page.evaluate(() => {
    const c = document.querySelector('.scene-host canvas')
    return c ? { canvas: true, gl: !!(c.getContext('webgl2') || c.getContext('webgl')) } : { canvas: false }
  })
  await page.screenshot({ path: '.shot-back-situation.png' })
  console.log('BACK_TO_SITUATION:', JSON.stringify(gl))

  console.log('CONSOLE_ERRORS:', JSON.stringify(errors))
} finally {
  await browser.close()
}
