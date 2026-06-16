import * as THREE from 'three'

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Canvas 文字 → 深色药丸底 + 彩色描边/文字 Sprite。
// 用 NormalBlending(非 Additive):避免被 bloom 吹没,保证文字在亮穹顶上可读。
export function makeTextSprite(text, { color = '#00E5FF', size = 64, weight = 600 } = {}) {
  const font = `${weight} ${size}px "JetBrains Mono", "Saira", monospace`
  const padX = 14
  const padY = 8

  const measure = document.createElement('canvas').getContext('2d')
  measure.font = font
  const textW = Math.ceil(measure.measureText(text).width)
  const w = Math.max(44, textW + padX * 2)
  const h = size + padY * 2

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  // 深色药丸背景
  ctx.fillStyle = 'rgba(6,9,18,0.82)'
  roundRect(ctx, 0.5, 0.5, w - 1, h - 1, 6)
  ctx.fill()
  // 彩色描边
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.55
  ctx.lineWidth = 1.5
  roundRect(ctx, 0.5, 0.5, w - 1, h - 1, 6)
  ctx.stroke()
  ctx.globalAlpha = 1
  // 文字
  ctx.font = font
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 6
  ctx.fillText(text, padX, h / 2)

  const tex = new THREE.CanvasTexture(canvas)
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.needsUpdate = true

  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    depthTest: false, // 标签为 HUD 信息:始终可见,不被核心/壳遮挡(否则近处标签反而被遮)
    blending: THREE.NormalBlending,
  })
  const sprite = new THREE.Sprite(mat)
  sprite.renderOrder = 999 // 始终渲染在最上层
  const unit = 0.85
  sprite.scale.set((w / h) * unit, unit, 1)
  return sprite
}
