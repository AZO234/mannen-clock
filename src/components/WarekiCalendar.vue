<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { toKanshi } from 'wa-datetime'
import CalendarModal from '@/components/common/CalendarModal.vue'
import {
  type DayCell,
  fetchHolidays, buildCalendarData,
  DOW_NAMES,
} from '@/composables/useCalendarData'

// ── 月ナビゲーション ──────────────────────────────────────────
const today        = new Date()
const currentYear  = ref(today.getFullYear())
const currentMonth = ref(today.getMonth() + 1)

watch(currentYear, (y) => {
  fetchHolidays(y - 1); fetchHolidays(y); fetchHolidays(y + 1)
}, { immediate: true })

onMounted(() => {
  const y = currentYear.value
  fetchHolidays(y - 1); fetchHolidays(y); fetchHolidays(y + 1)
})

function prevMonth() {
  if (--currentMonth.value < 1)  { currentMonth.value = 12; currentYear.value-- }
}
function nextMonth() {
  if (++currentMonth.value > 12) { currentMonth.value = 1;  currentYear.value++ }
}

// ── カレンダーデータ ──────────────────────────────────────────
const calendarData = computed(() =>
  buildCalendarData(currentYear.value, currentMonth.value)
)

const kanshiData = computed(() => {
  const y = currentYear.value, m = currentMonth.value
  const kanYear = (m === 1 || m === 2) ? y - 1 : y
  return toKanshi(kanYear)
})

// ── 月シルエット・ナビ表示 ────────────────────────────────────
const MONTH_SVG = [
  '01_mutsuki','02_kisaragi','03_yayoi','04_uzuki',
  '05_satsuki','06_minazuki','07_fumizuki','08_hazuki',
  '09_nagatsuki','10_kannazuki','11_shimotsuki','12_shiwasu',
]
const MONTH_NAME = ['睦月','如月','弥生','卯月','皐月','水無月','文月','葉月','長月','神無月','霜月','師走']
const MONTH_MOTIF = [
  '梅の枝','雪・着物','桜','卯の花・蝶','田植え','あじさい・雨',
  '七夕・笹','落ち葉','月・すすき','鳥居・渡り鳥','霜・枯れ枝','除夜の鐘',
]
const MONTH_DESC = [
  '家族や親戚が睦み合う月','寒さに衣を重ね着する月','草木がいよいよ生い茂る月',
  '卯の花（ウツギ）が咲く月','早苗を植え始める月','田に水を張る・水が満ちる月',
  '七夕に歌や字を書く短冊の月','葉が落ちる月（旧暦の秋）','夜長月——秋の夜長の月',
  '神々が出雲へ旅立つ月','霜が降り始める月','師（僧）が馳せ走る月',
]

const navMonthName = computed(() => MONTH_NAME[currentMonth.value - 1])
const navDesc      = computed(() => MONTH_DESC[currentMonth.value - 1])
const navSvgSrc    = computed(() => {
  const key = MONTH_SVG[(currentMonth.value - 1) % 12]
  return `${import.meta.env.BASE_URL}months/${key}.svg`
})
const monthTitle = computed(() => `${currentYear.value}年 ${currentMonth.value}月`)
const monthSub   = computed(() => {
  const sub = calendarData.value.lunarSubtitle
  const k   = kanshiData.value
  return [sub ? `旧暦 ${sub}` : '', `${k.kanji}（${k.kana}）${k.emoji}`].filter(Boolean).join('　')
})

// ── モーダル ──────────────────────────────────────────────────
const modalCell = ref<DayCell | null>(null)
function openModal(c: DayCell) { modalCell.value = c }
function closeModal()          { modalCell.value = null }
</script>

<!---------------------------------------------------------------------------->
<template>
  <div class="cal-wrap">
    <!-- 月シルエット（カレンダー全体背景） -->
    <img :src="navSvgSrc" class="cal-silhouette" aria-hidden="true"/>

    <!-- ナビ -->
    <div class="nav">
      <button class="nav-btn" @click="prevMonth">◀</button>
      <div class="nav-center">
        <div class="month-title">{{ monthTitle }}</div>
        <div class="month-sub">{{ monthSub }}</div>
        <div class="month-wafuu">
          <span class="month-wafuu__name">{{ navMonthName }}</span>
          <span class="month-wafuu__sep">—</span>
          <span class="month-wafuu__desc">{{ navDesc }}</span>
        </div>
      </div>
      <button class="nav-btn" @click="nextMonth">▶</button>

    </div>

    <!-- 曜日ヘッダー -->
    <div class="weekdays">
      <div class="weekday sun">日</div>
      <div class="weekday">月</div><div class="weekday">火</div>
      <div class="weekday">水</div><div class="weekday">木</div>
      <div class="weekday">金</div>
      <div class="weekday sat">土</div>
    </div>

    <!-- グリッド -->
    <div class="grid">
      <div v-for="i in calendarData.firstDow" :key="'e'+i" class="cell empty" />

      <div
        v-for="c in calendarData.days" :key="c.day"
        class="cell"
        :class="{ today:c.isToday, sunday:c.dow===0, saturday:c.dow===6, holiday:c.isHoliday }"
        @click="openModal(c)"
      >
        <div class="day-num">{{ c.day }}</div>
        <div :class="c.lunarIsFirst ? 'lunar lunar-month' : 'lunar'">
          {{ c.lunarIsFirst ? c.lunarMonthStr : c.lunarDayStr }}
        </div>
        <div :class="['rokuyou', c.rokuyouClass]">{{ c.rokuyou }}</div>
        <div v-if="c.sekki"       class="sekki">{{ c.sekki }}</div>
        <div v-if="c.sekku"       class="sekku">{{ c.sekku }}</div>
        <div v-if="c.zassetsu"    class="zassetsu">{{ c.zassetsu }}</div>
        <div v-if="c.holidayName" class="holiday-name">{{ c.holidayName }}</div>
      </div>
    </div>

    <!-- エラー表示（デバッグ用） -->
    <div v-if="calendarError" style="color:#f88;font-size:0.8rem;padding:0.5rem;background:rgba(255,0,0,0.1);border-radius:4px;margin-top:0.5rem">
      ⚠ {{ calendarError }}
    </div>

    <!-- 凡例 -->
    <div class="legend">
      <div class="legend-item"><div class="legend-dot" style="background:#e8a840"></div>大安</div>
      <div class="legend-item"><div class="legend-dot" style="background:#a070c0"></div>仏滅</div>
      <div class="legend-item"><div class="legend-dot" style="background:#c05050"></div>赤口</div>
      <div class="legend-item"><div class="legend-dot" style="background:#70c8a0"></div>二十四節気</div>
      <div class="legend-item"><div class="legend-dot" style="background:#f0a0c0"></div>節句</div>
      <div class="legend-item"><div class="legend-dot" style="background:#a8c870"></div>雑節</div>
    </div>

  </div>

  <CalendarModal :cell="modalCell" :year="currentYear" :month="currentMonth" @close="closeModal" />
</template>

<!---------------------------------------------------------------------------->
<style scoped>
/* ── カレンダー本体 ─────────────────────────────────────── */
.cal-wrap { font-family: 'Hiragino Mincho ProN', 'Yu Mincho', '游明朝', 'Noto Serif JP', serif; position:relative; overflow:hidden; }

.nav { display:flex; align-items:center; justify-content:center; gap:1.2rem; margin-bottom:1rem; text-align:center; position:relative; min-height:4rem; padding:0.5rem 1rem; border-radius:8px; overflow:hidden; }
.cal-silhouette {
  position:absolute;
  right: -2%;
  bottom: -5%;
  width: 72%;
  height: auto;
  opacity: 0.10;
  pointer-events: none;
  z-index: 0;
  /* ダークテーマ: gold色に */
  filter: invert(1) sepia(1) saturate(2) hue-rotate(5deg) brightness(1.2);
}
[data-theme="light"] .cal-silhouette {
  opacity: 0.08;
  filter: sepia(1) saturate(1.5) brightness(0.3);
}
.nav, .weekdays, .grid, .legend { position:relative; z-index:1; }
.nav-btn { background:none; border:1px solid rgba(255,255,255,0.2); color:var(--gold); font-size:1.1rem; width:2.2rem; height:2.2rem; border-radius:50%; cursor:pointer; transition:background 0.2s; display:flex; align-items:center; justify-content:center; }
.nav-btn:hover { background:var(--bg-hover); }
.month-title { font-size:1.6rem; font-weight:400; letter-spacing:0.12em; color:var(--gold); }
.month-sub   { font-size:0.72rem; color:var(--gold-muted); letter-spacing:0.08em; font-family:'Hiragino Sans',sans-serif; }
.month-wafuu { display:flex; align-items:center; gap:0.4em; margin-top:0.2rem; justify-content:center; }
.month-wafuu__name { font-size:0.78rem; color:var(--gold); letter-spacing:0.12em; font-family:'Hiragino Mincho ProN',serif; }
.month-wafuu__sep  { font-size:0.65rem; color:var(--fg-muted); }
.month-wafuu__desc { font-size:0.65rem; color:var(--fg-muted); letter-spacing:0.05em; }

.weekdays { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; margin-bottom:3px; }
.weekday  { text-align:center; font-size:0.68rem; font-family:'Hiragino Sans',sans-serif; padding:0.3rem 0; color:var(--fg-muted); }
.weekday.sun { color:rgba(220,100,80,0.7); }
.weekday.sat { color:rgba(80,140,220,0.7); }

.grid { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; }

.cell {
  aspect-ratio:3/2; border-radius:6px; padding:0.35rem 0.4rem 0.3rem;
  display:flex; flex-direction:column; gap:0.12rem;
  background:var(--bg-section);
  transition:background 0.15s; overflow:hidden;
  cursor:pointer;
}
.cell:hover   { background:var(--bg-hover); }
.cell.empty   { background:transparent; pointer-events:none; }
.cell.today   { background:var(--cell-today-bg); box-shadow:inset 0 0 0 1px var(--cell-today-ring); }
.cell.sunday   .day-num { color:#e06050; }
.cell.saturday .day-num { color:#5090d8; }
.cell.holiday  .day-num { color:#e06050; }
.cell.today .day-num { position:relative; }
.cell.today .day-num::after { content:''; position:absolute; inset:-0.15em; border-radius:50%; background:rgba(200,160,60,0.25); z-index:-1; }

.day-num     { font-size:1.05rem; font-weight:600; line-height:1; color:var(--fg); font-family:'Hiragino Sans',sans-serif; }
.lunar       { font-size:0.58rem; color:var(--gold-muted); line-height:1.1; }
.lunar-month { font-size:0.54rem; color:rgba(220,180,100,0.8); font-weight:600; }
.rokuyou     { font-size:0.6rem; line-height:1; font-family:'Hiragino Sans',sans-serif; }
.rokuyou.taian      { color:#e8a840; font-weight:700; }
.rokuyou.butsumetsu { color:#a070c0; }
.rokuyou.shakkou    { color:#c05050; }
.rokuyou.sensho     { color:var(--gold-muted); }
.rokuyou.tomobiki   { color:var(--fg-muted); }
.rokuyou.senbu      { color:var(--fg-muted); }
.sekki    { font-size:0.56rem; color:var(--sekki-color); font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:'Hiragino Sans',sans-serif; }
.sekku    { font-size:0.54rem; color:var(--sekku-color); font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:'Hiragino Sans',sans-serif; }
.zassetsu { font-size:0.52rem; color:var(--zassetsu-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:'Hiragino Sans',sans-serif; }
.holiday-name { font-size:0.48rem; color:rgba(220,100,80,0.8); line-height:1.2; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; font-family:'Hiragino Sans',sans-serif; }

.legend { margin-top:1.2rem; display:flex; flex-wrap:wrap; gap:0.6rem 1.4rem; justify-content:center; font-size:0.62rem; color:var(--fg-muted); font-family:'Hiragino Sans',sans-serif; }
.legend-item { display:flex; align-items:center; gap:0.3rem; }
.legend-dot  { width:0.5rem; height:0.5rem; border-radius:50%; }

</style>
