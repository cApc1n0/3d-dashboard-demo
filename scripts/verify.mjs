// 端到端验证 + 往返切换(复现「星云→穹顶卡住」修复)。
// 用法: node scripts/verify.mjs  (需 dev server 在 5190 运行)
import puppeteer from 'puppeteer-core'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5190/'

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--window-size=1920,1080'],
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const clickTab = (page, text) =>
  page.evaluate((t) => {
    const b = [...document.querySelectorAll('.scene-switch button')].find((x) => x.textContent.includes(t))
    if (b) b.click()
  }, text)

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

  const glState = () =>
    page.evaluate(() => {
      const c = document.querySelector('.scene-host canvas')
      return c
        ? { canvas: true, gl: !!(c.getContext('webgl2') || c.getContext('webgl')) }
        : { canvas: false, gl: false }
    })

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await sleep(4000)

  // 1) 穹顶(初始)
  const dome1 = await glState()
  const kpi = await page.$$eval('.kpi-val', (els) => els.map((e) => e.textContent.trim()))
  await page.screenshot({ path: '.shot-dome.png' })

  // 2) 切到星云
  await clickTab(page, '知识星云')
  await sleep(4000)
  const nebula1 = await glState()
  const hasReticleN = await page.$('.reticle') // 星云时无 reticle
  await page.screenshot({ path: '.shot-nebula.png' })

  // 3) 切回穹顶(关键:验证不再卡住)
  await clickTab(page, '态势穹顶')
  await sleep(4000)
  const dome2 = await glState()
  const hasReticleD = !!(await page.$('.reticle')) // 穹顶应有 reticle
  await page.screenshot({ path: '.shot-dome2.png' })

  console.log('CONSOLE_ERRORS:', JSON.stringify(errors))
  console.log('KPI(67.4/3,420):', JSON.stringify(kpi))
  console.log('DOME-1 :', JSON.stringify(dome1))
  console.log('NEBULA :', JSON.stringify(nebula1), '| reticle present(应 false):', !!hasReticleN)
  console.log('DOME-2 (切回):', JSON.stringify(dome2), '| reticle present(应 true):', hasReticleD)
} finally {
  await browser.close()
}
