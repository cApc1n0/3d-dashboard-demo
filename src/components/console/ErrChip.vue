<script setup>
// 优雅降级芯片:后端返回 success:false / config_error / null 时渲染。
// 不崩、不留空,显示后端 message + 重试。
defineProps({
  title: { type: String, default: '功能暂不可用' },
  message: String,
  hint: String,
})
defineEmits(['retry'])
</script>

<template>
  <div class="err-chip">
    <div class="ec-title">⚠ {{ title }}</div>
    <div class="ec-msg" v-if="message">{{ message }}</div>
    <div class="ec-hint" v-if="hint">{{ hint }}</div>
    <button class="cbtn" style="padding: 4px 12px; align-self: flex-start" @click="$emit('retry')">重试</button>
  </div>
</template>
