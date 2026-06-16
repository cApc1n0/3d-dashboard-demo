import * as THREE from 'three'
import { makeTextSprite } from '../shared/makeTextSprite.js'
import { riskColorMap, kwText, kwWeight } from '@/utils/risk'

const ALL_PLATFORMS = ['微博', '抖音', '快手', 'B站', '小红书', '贴吧', '知乎']
const DOME_R = 10
const INACTIVE = new THREE.Color(0x2a3548)

function makeRing(r, y, color, op) {
  const m = new THREE.Mesh(
    new THREE.TorusGeometry(r, 0.025, 8, 120),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op })
  )
  m.rotation.x = Math.PI / 2
  m.position.y = y
  return m
}

// 穹顶场景:壳 / 风险核心 / 5 维辐条 / 7 平台节点 / 关键词环 / 粒子流。
// 所有动画基于 delta-time(与 fps 无关),update(data) 驱动,tick 内平滑过渡。
export function createSituationDome(stage, { onHover } = {}) {
  const scene = stage.scene
  const camera = stage.camera
  const renderer = stage.renderer

  const world = new THREE.Group()
  scene.add(world)

  scene.add(new THREE.AmbientLight(0x334455, 1.4))
  const coreLight = new THREE.PointLight(0xff7a1a, 0.8, 60)
  coreLight.position.set(0, 1.5, 0)
  scene.add(coreLight)

  const shellMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true, transparent: true, opacity: 0.16 })
  const shell = new THREE.Mesh(new THREE.SphereGeometry(DOME_R, 56, 28, 0, Math.PI * 2, 0, Math.PI / 2), shellMat)
  world.add(shell)

  const eqRing = makeRing(DOME_R, 0, 0x00e5ff, 0.5)
  const eqRing2 = makeRing(DOME_R * 0.96, 0, 0x00e5ff, 0.18)
  const latRing = makeRing(DOME_R * 0.62, DOME_R * 0.62, 0x00e5ff, 0.14)
  world.add(eqRing, eqRing2, latRing)

  const floor = new THREE.Mesh(
    new THREE.RingGeometry(0.2, DOME_R * 1.02, 96, 1),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.05, side: THREE.DoubleSide })
  )
  floor.rotation.x = -Math.PI / 2
  world.add(floor)

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.25, 2),
    new THREE.MeshStandardMaterial({ color: 0x140a05, emissive: 0xffd600, emissiveIntensity: 2.4, metalness: 0.4, roughness: 0.3 })
  )
  core.position.y = 1.5
  world.add(core)
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd600, transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, depthWrite: false })
  )
  halo.position.copy(core.position)
  world.add(halo)

  const spokes = []
  for (let i = 0; i < 5; i++) {
    const pivot = new THREE.Group()
    pivot.position.set(0, 1.5, 0)
    pivot.rotation.y = (i / 5) * Math.PI * 2
    const tilt = new THREE.Group()
    tilt.rotation.z = 0.55
    pivot.add(tilt)
    const baseLen = 4
    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, baseLen, 8),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.6 })
    )
    cyl.position.y = baseLen / 2
    tilt.add(cyl)
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff })
    )
    tip.position.y = baseLen
    tilt.add(tip)
    world.add(pivot)
    spokes.push({ cyl, tip, baseLen, curLen: 0.001, targetLen: baseLen })
  }

  const plats = []
  ALL_PLATFORMS.forEach((name, i) => {
    const a = (i / 7) * Math.PI * 2
    const x = Math.cos(a) * 8.2
    const z = Math.sin(a) * 8.2
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff })
    )
    node.position.set(x, 0.4, z)
    node.userData = { kind: 'platform', name, count: 0, ratio: 0, active: true }
    world.add(node)
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0.4, z), new THREE.Vector3(0, 1.5, 0)])
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.25 }))
    world.add(line)
    const label = makeTextSprite(name, { color: '#9DB4C8', size: 40, weight: 500 })
    label.position.set(x * 1.14, -0.25, z * 1.14)
    label.material.opacity = 0
    world.add(label)
    plats.push({ node, line, label })
  })

  const kwGroup = new THREE.Group()
  kwGroup.position.set(0, 5.0, 0)
  kwGroup.rotation.x = 0.25
  world.add(kwGroup)
  let kwSprites = []

  const PCOUNT = 800
  const pGeo = new THREE.BufferGeometry()
  const pPos = new Float32Array(PCOUNT * 3)
  const pVel = []
  for (let i = 0; i < PCOUNT; i++) {
    const r = 3 + Math.random() * 7
    const th = Math.random() * (Math.PI / 2)
    const ph = Math.random() * (Math.PI / 2)
    pPos[i * 3] = r * Math.sin(ph) * Math.cos(th)
    pPos[i * 3 + 1] = r * Math.cos(ph)
    pPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th)
    pVel.push({ r, th, ph, sp: 0.0006 + Math.random() * 0.0014 })
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
  const particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({ color: 0x00e5ff, size: 0.07, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
  )
  world.add(particles)

  const target = {
    riskColor: new THREE.Color(0xffd600),
    coreScale: 1,
    coreIntensity: 2.4,
    pulseHz: 0.8,
    particleSpeed: 1,
    worldScale: 1,
  }
  const cur = {
    riskColor: new THREE.Color(0xffd600),
    worldScale: 0.2,
    boot: 0,
  }

  function rebuildKeywords(keywords) {
    kwSprites.forEach((s) => {
      s.material.map?.dispose()
      s.material.dispose()
      kwGroup.remove(s)
    })
    kwSprites = []
    const top = (keywords || []).slice(0, 8)
    top.forEach((k, i) => {
      const txt = kwText(k)
      const w = kwWeight(k)
      const sp = makeTextSprite(txt, { color: '#00E5FF', size: 44 + Math.round(w * 26), weight: 600 })
      const a = (i / Math.max(1, top.length)) * Math.PI * 2
      const rr = 5.5
      sp.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr)
      sp.material.opacity = 0
      sp.userData.targetOpacity = 0.72 + w * 0.28
      kwGroup.add(sp)
      kwSprites.push(sp)
    })
  }

  function update(data) {
    const detail = data?.detail
    const decomp = data?.decomp
    const rs = data?.runStatus
    const ps = data?.platformStats
    if (!detail) return

    const a = detail.assessment
    const riskLevel = a?.risk_level || 3
    const score = a?.comprehensive_risk_score ?? 50
    const colHex = riskColorMap[riskLevel] || riskColorMap[3]
    target.riskColor = new THREE.Color(colHex)
    target.coreScale = 1 + (score / 100) * 0.5
    target.coreIntensity = 0.6 + (score / 100) * 0.6
    target.pulseHz = 0.6 + riskLevel * 0.45
    target.worldScale = 0.85 + (score / 100) * 0.3

    const dims = Object.values(decomp?.dimensions || {})
    spokes.forEach((s, i) => {
      const d = dims[i]
      s.targetLen = d ? (d.final_score / d.max) * 6.0 + 1.5 : s.baseLen
    })

    const activeNames = new Set(detail.info?.platforms?.platform_names || ALL_PLATFORMS)
    const statsMap = new Map((ps?.items || []).map((p) => [p.name, p]))
    plats.forEach((p) => {
      const st = statsMap.get(p.node.userData.name)
      p.node.userData.active = activeNames.has(p.node.userData.name)
      p.node.userData.count = st?.count ?? 0
      p.node.userData.ratio = st?.ratio ?? 0
    })

    rebuildKeywords(detail.info?.keywords)

    target.particleSpeed = rs?.runner_status === 'running' ? 2.2 : 1
  }

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let hovered = null
  function onPointerMove(e) {
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(plats.map((p) => p.node))
    const hit = hits.length ? hits[0].object : null
    hovered = hit
    if (hit) {
      const ud = hit.userData
      onHover?.({ active: true, name: ud.name, count: ud.count, ratio: ud.ratio, isActive: ud.active, x: e.clientX - rect.left, y: e.clientY - rect.top })
    } else {
      onHover?.({ active: false })
    }
  }
  function onPointerLeave() {
    hovered = null
    onHover?.({ active: false })
  }
  renderer.domElement.addEventListener('pointermove', onPointerMove)
  renderer.domElement.addEventListener('pointerleave', onPointerLeave)

  // delta-time 驱动(与 fps 无关):boot 1.4s 点火;lerp 用 damp(rate,dt)
  const damp = (rate, dt) => 1 - Math.exp(-rate * dt)
  let lastT = 0
  const removeTick = stage.addTick((t) => {
    const dt = lastT ? Math.min(0.1, t - lastT) : 0
    lastT = t
    cur.boot = Math.min(1, cur.boot + dt * (1 / 1.4))
    const boot = cur.boot

    const cK = damp(3, dt)
    cur.riskColor.lerp(target.riskColor, cK)
    shellMat.color.copy(cur.riskColor)
    eqRing.material.color.copy(cur.riskColor)
    particles.material.color.copy(cur.riskColor)
    core.material.emissive.lerp(cur.riskColor, cK)
    halo.material.color.lerp(cur.riskColor, cK)

    const eff = boot * target.worldScale
    cur.worldScale += (eff - cur.worldScale) * damp(3.6, dt)
    world.scale.setScalar(cur.worldScale)
    shellMat.opacity = 0.16 * boot
    eqRing.material.opacity = 0.5 * boot
    floor.material.opacity = 0.05 * boot

    const osc = Math.sin(t * target.pulseHz * 2 * Math.PI)
    const pulse = 1 + osc * 0.12
    core.scale.setScalar(target.coreScale * pulse * boot)
    core.material.emissiveIntensity = (target.coreIntensity + osc * 0.3) * boot
    halo.material.opacity = (0.04 + osc * 0.02) * boot
    coreLight.intensity = (target.coreIntensity * 0.4 + osc * 0.15) * boot

    const sK = damp(4.8, dt)
    spokes.forEach((s, i) => {
      s.curLen += (s.targetLen - s.curLen) * sK
      s.cyl.scale.y = Math.max(0.001, s.curLen / s.baseLen)
      s.cyl.position.y = s.curLen / 2
      s.tip.position.y = s.curLen
      s.tip.scale.setScalar((1 + Math.sin(t * 2 + i) * 0.18) * boot)
      s.cyl.material.opacity = 0.6 * boot
    })

    const pK = damp(6, dt)
    const lK = damp(4.8, dt)
    plats.forEach((p, i) => {
      const ud = p.node.userData
      const basePulse = 1 + Math.sin(t * 3 + i * 1.3) * 0.22
      const actBoost = ud.active ? 1 + ud.ratio * 0.8 : 0.6
      p.node.scale.setScalar(basePulse * actBoost * boot)
      p.node.material.color.lerp(ud.active ? cur.riskColor : INACTIVE, pK)
      p.line.material.opacity = (ud.active ? 0.25 + ud.ratio * 0.4 : 0.06) * boot
      const lblTarget = ud.active ? 0.92 : 0.25
      p.label.material.opacity += (lblTarget - p.label.material.opacity) * lK
    })

    const kwK = damp(3.6, dt)
    kwSprites.forEach((s) => {
      // 标签不透明度独立于 boot 点火,保证任何 fps 下都可读
      s.material.opacity += ((s.userData.targetOpacity || 0.7) - s.material.opacity) * kwK
    })

    const arr = pGeo.attributes.position.array
    const spd = target.particleSpeed
    for (let i = 0; i < PCOUNT; i++) {
      const v = pVel[i]
      v.th += v.sp * spd
      arr[i * 3] = v.r * Math.sin(v.ph) * Math.cos(v.th)
      arr[i * 3 + 1] = v.r * Math.cos(v.ph) + Math.sin(t * 0.5 + i) * 0.05
      arr[i * 3 + 2] = v.r * Math.sin(v.ph) * Math.sin(v.th)
    }
    pGeo.attributes.position.needsUpdate = true
    particles.material.opacity = 0.8 * boot

    world.rotation.y = t * 0.06
    kwGroup.rotation.y = -t * 0.15
  })

  function dispose() {
    renderer.domElement.removeEventListener('pointermove', onPointerMove)
    renderer.domElement.removeEventListener('pointerleave', onPointerLeave)
    removeTick()
    world.traverse((o) => {
      o.geometry?.dispose?.()
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        mats.forEach((m) => {
          m.map?.dispose?.()
          m.dispose?.()
        })
      }
    })
    kwSprites = []
    scene.remove(world)
  }

  return { object: world, update, dispose }
}
