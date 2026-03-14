<script setup lang="ts">
/**
 * ChimeGadget.vue — 音声・通知ガジェット
 * MedGadget ベース＋サウンド操作
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { dateToKoku, SHI_LIST } from 'wa-datetime'
import { useSkyData } from '@/composables/useSkyData'

// ─── 刻の定義 ─────────────────────────────────────────────────

const KOKU_CHIMES = [
  { index: 0, sub: '明け六つ', message: '夜明けだよ。'     },
  { index: 1, sub: '朝五つ',   message: 'がんばろう。'     },
  { index: 3, sub: '昼九つ',   message: 'お昼だよ。'       },
  { index: 4, sub: '昼八つ',   message: 'ブレイクしよう。' },
  { index: 5, sub: '夕七つ',   message: 'おつかれさま。'   },
  { index: 6, sub: '暮れ六つ', message: 'おやすみなさい。' },
] as const

// ─── 音源定義 ─────────────────────────────────────────────────

const SOUNDS = [
  { value: 'chime1', label: 'ハンドベル' },
  { value: 'chime2', label: 'ピアノ'     },
] as const
type SoundType = typeof SOUNDS[number]['value']

// ─── ETO カラー ───────────────────────────────────────────────

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

// ─── sky データ ───────────────────────────────────────────────

const { sky, weatherLabel } = useSkyData()
const sunriseMins = computed(() => sky.value?.sunriseMins ?? 360)
const sunsetMins  = computed(() => sky.value?.sunsetMins  ?? 1080)
const currentHour = computed(() => new Date().getHours())
const currentWeather = computed(() => {
  if (!sky.value) return { label: '—', tempC: 0, precip: 0, windSpeed: 0 }
  const h = sky.value.hourly[currentHour.value]
  return { label: weatherLabel(h.weatherCode), tempC: h.tempC, precip: h.precipitation, windSpeed: h.windSpeed }
})

// ─── 時刻 ────────────────────────────────────────────────────

const now = ref(new Date())
let tick: ReturnType<typeof setInterval>

const dateStr = computed(() => {
  const d = now.value
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
})
const hhmm = computed(() => {
  const d = now.value
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
})

const koku     = computed(() => dateToKoku(now.value, sunriseMins.value, sunsetMins.value))
const shiKanji = computed(() => koku.value.eto.kanji)
const number   = computed(() => koku.value.eto.number)
const shiIdx   = computed(() => SHI_LIST.findIndex(s => s.kanji === shiKanji.value))
const colors   = computed(() => ETO_COLORS.find(c => c.shiIdx === shiIdx.value) ?? { colorA:'#1a2244', colorB:'#0c1228' })
const colorA   = computed(() => colors.value.colorA)
const colorB   = computed(() => colors.value.colorB)

// ─── サウンド・通知 state ─────────────────────────────────────

const soundType = ref<SoundType>((localStorage.getItem('chime-sound') as SoundType) ?? 'chime1')
const muted     = ref(localStorage.getItem('chime-muted') === 'true')
const unlocked  = ref(false)
const notifPerm = ref<NotificationPermission>('default')

watch(soundType, v => { localStorage.setItem('chime-sound', v); playChime() })
watch(muted,     v => localStorage.setItem('chime-muted', String(v)))

// ─── AudioContext ─────────────────────────────────────────────

let audioCtx: AudioContext | null = null

function unlockAudio() {
  if (unlocked.value) return
  audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  unlocked.value = true
}

async function playChime() {
  if (muted.value || !unlocked.value || !audioCtx) return
  const url = `${import.meta.env.BASE_URL}sounds/${soundType.value}.opus`
  try {
    const res     = await fetch(url)
    const buf     = await res.arrayBuffer()
    const decoded = await audioCtx.decodeAudioData(buf)
    const source  = audioCtx.createBufferSource()
    source.buffer = decoded
    source.connect(audioCtx.destination)
    source.start()
  } catch (e) {
    console.warn('ChimeGadget: 音声再生失敗', e)
  }
}

// ─── ブラウザ通知 ─────────────────────────────────────────────

async function requestNotifPermission() {
  if (!('Notification' in window)) return
  notifPerm.value = await Notification.requestPermission()
}

function sendNotification(message: string) {
  if (Notification.permission !== 'granted') return
  new Notification('Web万年時計', {
    body: message,
    icon: `${import.meta.env.BASE_URL}favicon.svg`,
  })
}

// ─── 刻の境界チェック ─────────────────────────────────────────

let lastKokuIndex = -1

function kokuBoundaries(sr: number, ss: number): number[] {
  const dayKoku   = (ss - sr) / 6
  const nightKoku = (1440 - (ss - sr)) / 6
  return [
    ...Array.from({ length: 6 }, (_, i) => sr + i * dayKoku),
    ...Array.from({ length: 6 }, (_, i) => (ss + i * nightKoku) % 1440),
  ]
}

function checkKoku() {
  if (!sky.value) return
  const nowMins = now.value.getHours() * 60 + now.value.getMinutes()
  const bounds  = kokuBoundaries(sky.value.sunriseMins, sky.value.sunsetMins)
  bounds.forEach((startMins, idx) => {
    if (Math.abs(nowMins - startMins) > 0.6) return
    if (lastKokuIndex === idx) return
    const chime = KOKU_CHIMES.find(c => c.index === idx)
    if (!chime) return
    lastKokuIndex = idx
    playChime()
    sendNotification(chime.message)
  })
}

// ─── ライフサイクル ───────────────────────────────────────────

let checkTick: ReturnType<typeof setInterval>

onMounted(() => {
  if ('Notification' in window) notifPerm.value = Notification.permission
  tick      = setInterval(() => { now.value = new Date() }, 1000)
  checkTick = setInterval(checkKoku, 10_000)
})
onUnmounted(() => {
  clearInterval(tick)
  clearInterval(checkTick)
  audioCtx?.close()
})
</script>

<template>
  <div class="chime-gadget" @click="unlockAudio">

    <!-- MedGadget 部分 -->
    <div class="med__top">
      <span class="med__date">{{ dateStr }}</span>
      <span class="med__time">{{ hhmm }}</span>
    </div>
    <div class="med__body">
      <div class="med__info">
        <div class="med__weather">{{ currentWeather.label }}</div>
        <div class="med__temp">{{ currentWeather.tempC }}℃</div>
        <div class="med__precip">雨{{ currentWeather.precip.toFixed(1) }}mm</div>
        <div class="med__wind">風{{ currentWeather.windSpeed.toFixed(0) }}m/s</div>
      </div>
      <div class="med__frame" :style="{ background: `linear-gradient(to bottom, ${colorA}, ${colorB})` }">
        <div class="med__shi">{{ shiKanji }}</div>
        <div class="med__num">{{ number }}</div>
      </div>
    </div>

    <!-- サウンド操作 -->
    <div class="chime__controls">
      <label class="chime__label">
        <select v-model="soundType" class="chime__select" @click.stop>
          <option v-for="s in SOUNDS" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </label>
      <label class="chime__label" @click.stop>
        <input type="checkbox" v-model="muted" class="chime__checkbox" />
        ミュート
      </label>
      <button v-if="notifPerm === 'default'" class="chime__notif-btn" @click.stop="requestNotifPermission">通知を許可</button>
      <span   v-else-if="notifPerm === 'denied'"  class="chime__notif-state">🔕 ブロック中</span>
      <span   v-else                               class="chime__notif-state">🔔 通知ON</span>
    </div>

    <!-- アンロック案内 -->
    <div v-if="!unlocked" class="chime__unlock">🔔 ここをクリックで音声を有効化</div>

  </div>
</template>

<style scoped>
.chime-gadget {
  display: inline-flex;
  flex-direction: column;
  gap: 0.35em;
  padding: 0.55em 0.8em;
  background: var(--bg-panel);
  border: 2px solid var(--gold-muted);
  border-radius: 0.6em;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06);
  font-family: 'Hiragino Mincho ProN', 'Yu Mincho', serif;
  min-width: 12em;
  cursor: pointer;
}

/* MedGadget と共通のスタイル */
.med__top {
  display: flex;
  align-items: baseline;
  gap: 0.6em;
  border-bottom: 1px solid var(--gold-muted);
  padding-bottom: 0.25em;
}
.med__date { font-size: 0.75em; color: var(--fg-muted); font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; letter-spacing: 0.03em; }
.med__time { font-size: 1.0em; font-weight: 700; color: var(--gold); font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; letter-spacing: 0.03em; }
.med__body { display: flex; align-items: center; justify-content: space-between; gap: 0.8em; }
.med__info { display: flex; flex-direction: column; gap: 0.05em; flex: 1; }
.med__weather { font-size: 0.8em;  color: var(--fg);       letter-spacing: 0.05em; }
.med__temp    { font-size: 1.1em;  color: var(--gold);     letter-spacing: 0.05em; }
.med__precip,
.med__wind    { font-size: 0.65em; color: var(--fg-muted); letter-spacing: 0.03em; }
.med__frame {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 3em; height: 3.5em; border-radius: 0.35em;
  border: 1px solid rgba(255,255,255,0.15); gap: 0.1em; flex-shrink: 0;
}
.med__shi {
  font-size: 1.4em; font-family: 'Hiragino Mincho ProN', 'Yu Mincho', '游明朝', serif;
  font-weight: 900; color: rgba(255,255,255,0.95);
  text-shadow: 0 1px 4px rgba(0,0,0,0.6), 0 0 0.3em rgba(255,255,255,0.2);
  letter-spacing: -0.02em; line-height: 1;
}
.med__num { font-size: 0.6em; font-family: 'Hiragino Sans', sans-serif; color: rgba(255,255,255,0.75); letter-spacing: 0.04em; line-height: 1; }

/* サウンド操作 */
.chime__controls {
  display: flex;
  align-items: center;
  gap: 0.7em;
  flex-wrap: wrap;
  border-top: 1px solid var(--gold-muted);
  padding-top: 0.3em;
}
.chime__label {
  display: flex; align-items: center; gap: 0.3em;
  font-size: 0.65em; color: var(--fg-muted); cursor: pointer;
}
.chime__select {
  background: var(--bg); color: var(--fg);
  border: 1px solid var(--gold-muted); border-radius: 0.3em;
  padding: 0.1em 0.35em; font-size: 1em; font-family: inherit; cursor: pointer;
}
.chime__checkbox { accent-color: var(--gold); width: 1em; height: 1em; cursor: pointer; }
.chime__notif-btn {
  background: none; border: 1px solid var(--gold-muted); color: var(--gold);
  border-radius: 0.3em; padding: 0.1em 0.5em;
  font-size: 0.6em; font-family: inherit; cursor: pointer; transition: background 0.2s;
}
.chime__notif-btn:hover { background: var(--bg-hover); }
.chime__notif-state { font-size: 0.6em; color: var(--fg-muted); }
.chime__unlock {
  font-size: 0.6em; color: var(--gold); letter-spacing: 0.04em; text-align: center;
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
</style>
