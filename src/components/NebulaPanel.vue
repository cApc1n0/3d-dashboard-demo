<script setup>
import { computed } from 'vue'

const props = defineProps({ node: Object })
defineEmits(['close'])

const risk = computed(() => ((props.node?.risk || 0) * 100).toFixed(0))
const high = computed(() => (props.node?.risk || 0) > 0.6)
</script>

<template>
  <transition name="slide">
    <aside class="nebula-panel" v-if="node">
      <div class="np-head">
        <span class="np-badge">NODE</span>
        <span class="np-title">{{ node.name || node.id }}</span>
        <button class="np-close" @click="$emit('close')" aria-label="关闭">✕</button>
      </div>

      <dl class="np-rows">
        <div><dt>语义类型</dt><dd>{{ node.type || '—' }}</dd></div>
        <div><dt>风险度</dt><dd :class="{ risk: high }">{{ risk }}%</dd></div>
        <div><dt>连接度</dt><dd>{{ node.degree ?? '—' }}</dd></div>
      </dl>

      <div class="np-section" v-if="node.evidence && node.evidence.length">
        <div class="np-section-title">证据片段</div>
        <ul class="np-evi">
          <li v-for="(e, i) in node.evidence" :key="i">{{ e }}</li>
        </ul>
      </div>

      <div class="np-section">
        <div class="np-section-title">原始属性</div>
        <pre class="np-raw">{{ JSON.stringify({ id: node.id, type: node.type, risk: node.risk, degree: node.degree }, null, 2) }}</pre>
      </div>
    </aside>
  </transition>
</template>

<style scoped>
.nebula-panel {
  position: absolute;
  top: 46px;
  right: 14px;
  bottom: 14px;
  width: 252px;
  z-index: 6;
  background: rgba(6, 9, 18, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-line);
  border-radius: 6px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}
.nebula-panel::before,
.nebula-panel::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  border-color: var(--cyan);
  border-style: solid;
}
.nebula-panel::before {
  top: 5px;
  left: 5px;
  border-width: 1px 0 0 1px;
}
.nebula-panel::after {
  bottom: 5px;
  right: 5px;
  border-width: 0 1px 1px 0;
}
.np-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.np-badge {
  font-family: var(--f-mono);
  font-size: 9px;
  letter-spacing: 2px;
  color: var(--cyan);
  border: 1px solid var(--cyan-soft);
  padding: 1px 6px;
  border-radius: 2px;
}
.np-title {
  font-family: var(--f-display);
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
  flex: 1;
  word-break: break-all;
}
.np-close {
  background: none;
  border: none;
  color: var(--text-mut);
  cursor: pointer;
  font-size: 14px;
}
.np-close:hover {
  color: var(--text);
}
.np-rows {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 0;
}
.np-rows > div {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}
.np-rows dt {
  color: var(--text-mut);
}
.np-rows dd {
  margin: 0;
  font-family: var(--f-mono);
  color: var(--text);
}
.np-rows dd.risk {
  color: var(--l5);
  text-shadow: 0 0 8px var(--l5);
}
.np-section-title {
  font-family: var(--f-display);
  font-size: 11px;
  letter-spacing: 2px;
  color: var(--cyan);
  margin-bottom: 6px;
}
.np-evi {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.np-evi li {
  font-size: 11px;
  color: var(--text-mut);
  padding-left: 10px;
  border-left: 2px solid var(--cyan-soft);
}
.np-raw {
  font-family: var(--f-mono);
  font-size: 10px;
  color: var(--text-dim);
  white-space: pre-wrap;
  word-break: break-all;
}
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.35s cubic-bezier(0.2, 0.7, 0.2, 1), opacity 0.35s;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(24px);
  opacity: 0;
}
</style>
