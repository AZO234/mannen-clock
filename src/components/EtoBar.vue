<script setup lang="ts">
/**
 * EtoBar.vue — 和時計（不定時法）バー
 * wa-datetime の dateToKoku / SHI_LIST を使用
 */

import { computed, onMounted, onUnmounted, ref } from 'vue'
import { dateToKoku, SHI_LIST, kokuDurationStr } from 'wa-datetime'
import { useSkyData } from '@/composables/useSkyData'

const props = withDefaults(defineProps<{
  size?: string
}>(), {
  size: '1.25rem',
})

const { sky } = useSkyData()
const sunriseMins = computed(() => sky.value?.sunriseMins ?? 360)
const sunsetMins  = computed(() => sky.value?.sunsetMins  ?? 1080)

// ── 十二支の視覚定義（wa-datetimeのSHI_LISTに色を追加） ──────
const ETO_VISUAL = [
  // 昼六刻（卯〜申）
  { shiIdx: 3,  number:'六つ', sub:'明け六つ',  colorA:'#f5c842', colorB:'#e89a10', period:'day'   },
  { shiIdx: 4,  number:'五つ', sub:'朝五つ',    colorA:'#f0b030', colorB:'#d4780a', period:'day'   },
  { shiIdx: 5,  number:'四つ', sub:'昼四つ',    colorA:'#e8922a', colorB:'#c45a08', period:'day'   },
  { shiIdx: 6,  number:'九つ', sub:'昼九つ',    colorA:'#e06020', colorB:'#aa3006', period:'day'   },
  { shiIdx: 7,  number:'八つ', sub:'昼八つ',    colorA:'#d87830', colorB:'#b04c10', period:'day'   },
  { shiIdx: 8,  number:'七つ', sub:'夕七つ',    colorA:'#c86840', colorB:'#904020', period:'day'   },
  // 夜六刻（酉〜寅）
  { shiIdx: 9,  number:'六つ', sub:'暮れ六つ',  colorA:'#3a5080', colorB:'#1e2c50', period:'night' },
  { shiIdx: 10, number:'五つ', sub:'宵五つ',    colorA:'#2c3e6a', colorB:'#161e40', period:'night' },
  { shiIdx: 11, number:'四つ', sub:'夜四つ',    colorA:'#1e2c55', colorB:'#0e1430', period:'night' },
  { shiIdx: 0,  number:'九つ', sub:'夜中九つ',  colorA:'#141a3a', colorB:'#080e20', period:'night' },
  { shiIdx: 1,  number:'八つ', sub:'丑三つ時',  colorA:'#1a2244', colorB:'#0c1228', period:'night' },
  { shiIdx: 2,  number:'七つ', sub:'暁七つ',    colorA:'#28366e', colorB:'#141c40', period:'night' },
]

const ETO = ETO_VISUAL.map(v => ({
  ...v,
  kanji:  SHI_LIST[v.shiIdx].kanji,
  kana:   SHI_LIST[v.shiIdx].kana,
  emoji:  SHI_LIST[v.shiIdx].emoji,
}))

// ── セグメント計算 ────────────────────────────────────────
const segments = computed(() => {
  const sr = sunriseMins.value, ss = sunsetMins.value
  const dayLen = ss - sr, nightLen = 1440 - dayLen
  const dayKoku = dayLen / 6, nightKoku = nightLen / 6

  const raw = [
    ...Array.from({ length: 6 }, (_, i) => ({
      startMins: sr + i * dayKoku, widthMins: dayKoku, eto: ETO[i],
    })),
    ...Array.from({ length: 6 }, (_, i) => ({
      startMins: (ss + i * nightKoku) % 1440, widthMins: nightKoku, eto: ETO[6 + i],
    })),
  ]

  return raw.flatMap(seg => {
    const startPct = (seg.startMins / 1440) * 100
    const widthPct = (seg.widthMins  / 1440) * 100
    const overflow = seg.startMins + seg.widthMins - 1440
    if (overflow > 0 && seg.eto.period === 'night') {
      return [
        { ...seg, startPct, widthPct: ((1440 - seg.startMins) / 1440) * 100, overflow: false },
        { ...seg, startPct: 0, widthPct: (overflow / 1440) * 100, overflow: true },
      ]
    }
    return [{ ...seg, startPct, widthPct, overflow: false }]
  })
})

// ── 現在時刻を毎分更新 ────────────────────────────────────
const now = ref(new Date())
let timer: ReturnType<typeof setInterval>
onMounted(()  => { timer = setInterval(() => { now.value = new Date() }, 30_000) })
onUnmounted(() => clearInterval(timer))

const nowMins = computed(() => now.value.getHours() * 60 + now.value.getMinutes())
const nowPct  = computed(() => (nowMins.value / 1440 * 100).toFixed(3) + '%')

// ── 現在の刻 (wa-datetime dateToKoku 使用) ───────────────
const currentKoku = computed(() =>
  dateToKoku(now.value, sunriseMins.value, sunsetMins.value)
)

const currentEtoKanji = computed(() => currentKoku.value.eto.kanji)

// ── 一刻の長さ ────────────────────────────────────────────
const kokuInfo = computed(() => ({
  day:   kokuDurationStr(currentKoku.value.dayKokuMins),
  night: kokuDurationStr(currentKoku.value.nightKokuMins),
}))

const currentEtoMeta = computed(() => {
  const e = ETO.find(e => e.kanji === currentEtoKanji.value)
  return e ?? ETO[0]
})
</script>

<!---------------------------------------------------------------------------->
<template>
  <div class="etobar-wrap" :style="{ fontSize: size }">

    <!-- バー本体 -->
    <div class="bar">

      <!-- 12刻セグメント -->
      <div
        v-for="(seg, i) in segments"
        :key="i"
        class="koku"
        :class="[seg.eto.period, { 'is-now': seg.eto.kanji === currentEtoKanji }]"
        :style="{
          left:  seg.startPct + '%',
          width: seg.widthPct + '%',
          background: `linear-gradient(to bottom, ${seg.eto.colorA}, ${seg.eto.colorB})`,
        }"
        :title="`${seg.eto.kanji}の刻（${seg.eto.sub}）${seg.eto.emoji}`"
      >
        <!-- 境界線（右） -->
        <div class="koku__border" />

        <!-- 数字 + 漢字 + 読み -->
        <div class="koku__label">
          <span class="koku__number">{{ seg.eto.number }}</span>
          <span class="koku__kanji">{{ seg.eto.kanji }}</span>
          <span class="koku__sub">{{ seg.eto.sub }}</span>
        </div>

        <!-- 現在刻ハイライト -->
        <div v-if="seg.eto.kanji === currentEtoKanji" class="koku__now-glow" />
      </div>

      <!-- 現在時刻ライン -->
      <div class="now-line" :style="{ left: nowPct }" />

    </div>

    <!-- 下段: 一刻情報 + 現在の刻 -->
    <div class="meta">
      <span class="meta__current">
        今は <strong>{{ currentEtoMeta.number }}（{{ currentEtoMeta.kanji }}の刻）{{ currentEtoMeta.emoji }}</strong>
        ／ {{ currentEtoMeta.sub }}
      </span>
      <span class="meta__koku">
        昼の一刻 {{ kokuInfo.day }} &nbsp;／&nbsp; 夜の一刻 {{ kokuInfo.night }}
      </span>
    </div>

  </div>
</template>

<!---------------------------------------------------------------------------->
<style scoped>
.etobar-wrap {
  width: 100%;
  font-family: 'Hiragino Mincho ProN', 'Yu Mincho', '游明朝', 'Noto Serif JP', serif;
}

/* ── バー ── */
.bar {
  position: relative;
  width: 100%;
  height: 4em;
  border-radius: 0.35em;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0,0,0,0.45);
  background: #080818;    /* はみ出し防止の下地 */
}

/* ── 各刻セグメント ── */
.koku {
  position: absolute;
  top: 0; bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: filter 0.3s ease;
}
.koku:hover {
  filter: brightness(1.15);
  z-index: 2;
}

/* 現在刻は少し明るく */
.koku.is-now {
  filter: brightness(1.2);
  z-index: 3;
}

/* 境界線（右端） */
.koku__border {
  position: absolute;
  right: 0; top: 10%; bottom: 10%;
  width: 1px;
  background: rgba(255,255,255,0.18);
  pointer-events: none;
}

/* 漢字ラベル */
.koku__label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
  pointer-events: none;
  gap: 0.05em;
  overflow: hidden;
  max-height: 100%;
}
.koku__number {
  font-size: 0.65em;
  font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'Noto Sans JP', sans-serif;
  color: rgba(255,255,255,0.75);
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.koku__kanji {
  font-size: 1.4em;
  font-weight: 900;
  color: rgba(255,255,255,0.95);
  text-shadow:
    0 1px 4px rgba(0,0,0,0.6),
    0 0 0.3em rgba(255,255,255,0.2);
  letter-spacing: -0.02em;
}
.koku__sub {
  font-size: 0.55em;
  color: rgba(255,255,255,0.45);
  letter-spacing: 0.03em;
  white-space: nowrap;
  font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'Noto Sans JP', sans-serif;
}

/* 現在刻のグロウ */
.koku__now-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 100%, rgba(255,255,255,0.15) 0%, transparent 70%);
  pointer-events: none;
  animation: glow-pulse 2.5s ease-in-out infinite;
}
@keyframes glow-pulse {
  0%,100% { opacity: 0.6; }
  50%      { opacity: 1.0; }
}

/* ── 現在時刻ライン ── */
.now-line {
  position: absolute;
  top: 0; bottom: 0;
  width: 2px;
  background: rgba(255,255,255,0.9);
  box-shadow: 0 0 6px rgba(255,255,255,0.7);
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 10;
}
.now-line::before {
  content: '▼';
  position: absolute;
  top: -1.3em; left: 50%;
  transform: translateX(-50%);
  color: white;
  font-size: 0.45em;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
}

/* ── 下段メタ ── */
.meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.3em;
  padding: 0 0.1em;
  font-size: 0.5em;
  color: var(--fg-muted);
  font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'Noto Sans JP', sans-serif;
}
.meta__current {
  color: var(--fg);
}
.meta__current strong {
  color: var(--fg);
  font-weight: 700;
}
.meta__koku {
  letter-spacing: 0.04em;
  color: var(--fg-muted);
}
</style>
