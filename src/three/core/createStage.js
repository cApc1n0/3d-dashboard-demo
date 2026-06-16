import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

// 通用 three 舞台:renderer + scene + camera + bloom 后处理 + 渲染循环 + 自适应 + dispose。
// 穹顶/星云共享;场景内容(穹顶)自行往 scene 里加对象并用 addTick 接入每帧回调。
export function createStage(container, opts = {}) {
  const {
    cameraFov = 48,
    cameraPos = [0, 7.5, 24],
    lookAt = [0, 2.2, 0],
    bloomStrength = 0.4,
    bloomRadius = 0.3,
    bloomThreshold = 0.6,
  } = opts

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(cameraFov, 1, 0.1, 200)
  camera.position.set(...cameraPos)
  camera.lookAt(...lookAt)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setClearColor(0x000000, 0)
  container.appendChild(renderer.domElement)

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), bloomStrength, bloomRadius, bloomThreshold)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  const timer = new THREE.Timer()
  const ticks = new Set()
  let raf = 0
  let running = false

  function setSize() {
    const w = container.clientWidth
    const h = container.clientHeight
    if (!w || !h) return false
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    composer.setSize(w, h)
    bloom.setSize(w, h)
    return true
  }

  function frame() {
    timer.update()
    const t = timer.getElapsed()
    ticks.forEach((fn) => {
      try {
        fn(t)
      } catch (e) {
        console.error('[stage.tick]', e)
      }
    })
    composer.render()
    if (running) raf = requestAnimationFrame(frame)
  }

  return {
    scene,
    camera,
    renderer,
    composer,
    bloom,
    setSize,
    addTick(fn) {
      ticks.add(fn)
      return () => ticks.delete(fn)
    },
    start() {
      if (running) return
      running = true
      raf = requestAnimationFrame(frame)
    },
    stop() {
      running = false
      cancelAnimationFrame(raf)
    },
    dispose() {
      this.stop()
      ticks.clear()
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    },
  }
}
