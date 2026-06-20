<script setup>
import { ref } from 'vue'
// 拖拽/点击上传,emit('file', File)。
const props = defineProps({
  accept: String,
  label: { type: String, default: '点击或拖拽文件到此处上传' },
})
const emit = defineEmits(['file'])
const over = ref(false)
const name = ref('')
const onPick = (e) => {
  const f = e.target.files?.[0]
  if (f) {
    name.value = f.name
    emit('file', f)
  }
}
const onDrop = (e) => {
  over.value = false
  const f = e.dataTransfer.files?.[0]
  if (f) {
    name.value = f.name
    emit('file', f)
  }
}
defineExpose({ reset: () => (name.value = '') })
</script>

<template>
  <label
    class="cdrop"
    :class="{ over }"
    @dragover.prevent="over = true"
    @dragleave.prevent="over = false"
    @drop.prevent="onDrop"
  >
    <input type="file" :accept="accept" @change="onPick" />
    📄 {{ name || label }}
  </label>
</template>
