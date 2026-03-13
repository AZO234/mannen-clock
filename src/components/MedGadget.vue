<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { dateToKoku, SHI_LIST } from 'wa-datetime'

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

const props = defineProps<{
  sunriseMins:  number
  sunsetMins:   number
  weatherLabel: string
  tempC:        number
  precip:       number
  windSpeed:    number
}>()

const now = ref(new Date())
let tick: ReturnType<typeof setInterval>
onMounted(() => { tick = setInterval(() => { now.value = new Date() }, 1000) })
onUnmounted(() => clearInterval(tick))

const dateStr = computed(() => {
  const d = now.value
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
})
const hhmm = computed(() => {
  const d = now.value
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
})

const koku     = computed(() => dateToKoku(now.value, props.sunriseMins, props.sunsetMins))
const shiKanji = computed(() => koku.value.eto.kanji)
const number   = computed(() => koku.value.eto.number)
const shiIdx   = computed(() => SHI_LIST.findIndex(s => s.kanji === shiKanji.value))
const colors   = computed(() => ETO_COLORS.find(c => c.shiIdx === shiIdx.value) ?? { colorA:'#1a2244', colorB:'#0c1228' })
const colorA   = computed(() => colors.value.colorA)
const colorB   = computed(() => colors.value.colorB)
</script>

<template>
  <div class="med-gadget">
    <div class="med__top">
      <span class="med__date">{{ dateStr }}</span>
      <span class="med__time">{{ hhmm }}</span>
    </div>
    <div class="med__body">
      <div class="med__info">
        <div class="med__weather">{{ weatherLabel }}</div>
        <div class="med__temp">{{ tempC }}℃</div>
        <div class="med__precip">雨{{ precip.toFixed(1) }}mm</div>
        <div class="med__wind">風{{ windSpeed.toFixed(0) }}m/s</div>
      </div>
      <div class="med__frame" :style="{ background: `linear-gradient(to bottom, ${colorA}, ${colorB})` }">
        <div class="med__shi">{{ shiKanji }}</div>
        <div class="med__num">{{ number }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.med-gadget {
  display: inline-flex;
  flex-direction: column;
  gap: 0.35em;
  padding: 0.55em 0.8em;
  background: var(--bg-panel, #1a1a2e);
  border: 2px solid var(--gold-muted, #8a7040);
  border-radius: 0.6em;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06);
  font-family: 'Hiragino Mincho ProN', 'Yu Mincho', serif;
  min-width: 12em;
}
.med__top {
  display: flex;
  align-items: baseline;
  gap: 0.6em;
  border-bottom: 1px solid var(--gold-muted, #8a7040);
  padding-bottom: 0.25em;
}
.med__date {
  font-size: 0.75em;
  color: var(--fg-muted, #aaa);
  font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif;
  letter-spacing: 0.03em;
}
.med__time {
  font-size: 1.0em;
  font-weight: 700;
  color: var(--gold, #c8a84b);
  font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif;
  letter-spacing: 0.03em;
}
.med__body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8em;
}
.med__info {
  display: flex;
  flex-direction: column;
  gap: 0.05em;
  flex: 1;
}
.med__weather {
  font-size: 0.8em;
  color: var(--fg, #ddd);
  letter-spacing: 0.05em;
}
.med__temp {
  font-size: 1.1em;
  color: var(--gold, #c8a84b);
  letter-spacing: 0.05em;
}
.med__precip,
.med__wind {
  font-size: 0.65em;
  color: var(--fg-muted, #aaa);
  letter-spacing: 0.03em;
}
.med__frame {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 3em;
  height: 3.5em;
  border-radius: 0.35em;
  border: 1px solid rgba(255,255,255,0.15);
  gap: 0.1em;
  flex-shrink: 0;
}
.med__shi {
  font-size: 1.4em;
  font-family: 'Hiragino Mincho ProN', 'Yu Mincho', '游明朝', serif;
  font-weight: 900;
  color: rgba(255,255,255,0.95);
  text-shadow: 0 1px 4px rgba(0,0,0,0.6), 0 0 0.3em rgba(255,255,255,0.2);
  letter-spacing: -0.02em;
  line-height: 1;
}
.med__num {
  font-size: 0.6em;
  font-family: 'Hiragino Sans', sans-serif;
  color: rgba(255,255,255,0.75);
  letter-spacing: 0.04em;
  line-height: 1;
}
</style>
