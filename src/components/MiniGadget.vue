<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { dateToKoku, SHI_LIST } from 'wa-datetime'
import { useSkyData } from '@/composables/useSkyData'

const ETO_COLORS = [
  { shiIdx: 3,  colorA:'#f5c842', colorB:'#e89a10' },
  { shiIdx: 4,  colorA:'#f0b030', colorB:'#d4780a' },
  { shiIdx: 5,  colorA:'#e8922a', colorB:'#c45a08' },
  { shiIdx: 6,  colorA:'#e06020', colorB:'#aa3006' },
  { shiIdx: 7,  colorA:'#d87830', colorB:'#b04c10' },
  { shiIdx: 8,  colorA:'#c86840', colorB:'#904020' },
  { shiIdx: 9,  colorA:'#3a5080', colorB:'#1e2c50' },
  { shiIdx: 10, colorA:'#2c3e6a', colorB:'#161e40' },
  { shiIdx: 11, colorA:'#1e2c55', colorB:'#0e1430' },
  { shiIdx: 0,  colorA:'#141a3a', colorB:'#080e20' },
  { shiIdx: 1,  colorA:'#1a2244', colorB:'#0c1228' },
  { shiIdx: 2,  colorA:'#28366e', colorB:'#141c40' },
]

const { sky } = useSkyData()
const sunriseMins = computed(() => sky.value?.sunriseMins ?? 360)
const sunsetMins  = computed(() => sky.value?.sunsetMins  ?? 1080)

const now = ref(new Date())
let tick: ReturnType<typeof setInterval>
onMounted(() => { tick = setInterval(() => { now.value = new Date() }, 1000) })
onUnmounted(() => clearInterval(tick))

const hhmm = computed(() => {
  const d = now.value
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
})

const koku    = computed(() => dateToKoku(now.value, sunriseMins.value, sunsetMins.value))
const shiKanji = computed(() => koku.value.eto.kanji)
const number   = computed(() => koku.value.eto.number)
const shiIdx   = computed(() => SHI_LIST.findIndex(s => s.kanji === shiKanji.value))
const colors   = computed(() => ETO_COLORS.find(c => c.shiIdx === shiIdx.value) ?? { colorA:'#1a2244', colorB:'#0c1228' })
const colorA   = computed(() => colors.value.colorA)
const colorB   = computed(() => colors.value.colorB)
</script>

<template>
  <div class="mini-gadget">
    <div class="mini__time">{{ hhmm }}</div>
    <div class="mini__frame" :style="{ background: `linear-gradient(to bottom, ${colorA}, ${colorB})` }">
      <div class="mini__shi">{{ shiKanji }}</div>
      <div class="mini__num">{{ number }}</div>
    </div>
  </div>
</template>

<style scoped>
.mini-gadget {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3em;
  padding: 0.5em 0.7em;
  background: var(--bg-panel, #1a1a2e);
  border: 2px solid var(--gold-muted, #8a7040);
  border-radius: 0.6em;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06);
  font-family: 'Hiragino Mincho ProN', 'Yu Mincho', serif;
  min-width: 4.5em;
}
.mini__time {
  font-size: 1.1em;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--gold, #c8a84b);
  font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif;
}
.mini__frame {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 2.8em;
  height: 3.2em;
  border-radius: 0.35em;
  border: 1px solid rgba(255,255,255,0.15);
  gap: 0.1em;
  padding: 0.2em 0;
}
.mini__shi {
  font-size: 1.3em;
  font-family: 'Hiragino Mincho ProN', 'Yu Mincho', '游明朝', serif;
  font-weight: 900;
  color: rgba(255,255,255,0.95);
  text-shadow: 0 1px 4px rgba(0,0,0,0.6), 0 0 0.3em rgba(255,255,255,0.2);
  letter-spacing: -0.02em;
  line-height: 1;
}
.mini__num {
  font-size: 0.65em;
  font-family: 'Hiragino Sans', sans-serif;
  color: rgba(255,255,255,0.75);
  letter-spacing: 0.04em;
  line-height: 1;
}
</style>
