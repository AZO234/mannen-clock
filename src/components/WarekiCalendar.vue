<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  toLunar, zassetsu, sekki, sekku,
  lunarMonthName, lunarDayName, rokuyou,
  toKanshi, toDayKanshi, toMonthKanshiFromDate,
  moonPhase, moonPhaseName,
  nextSekki,
} from 'wa-datetime'

// ══════════════════════════════════════════════════════════════
//  祝日
// ══════════════════════════════════════════════════════════════
function getHolidays(year: number, month: number): Record<number, string> {
  const h: Record<number, string> = {}
  const add = (m: number, d: number, name: string) => { if (m === month) h[d] = name }
  add(1,1,'元日'); add(2,11,'建国記念の日'); add(2,23,'天皇誕生日')
  add(4,29,'昭和の日'); add(5,3,'憲法記念日'); add(5,4,'みどりの日')
  add(5,5,'こどもの日'); add(8,11,'山の日'); add(11,3,'文化の日'); add(11,23,'勤労感謝の日')
  const nthMon = (n: number) => {
    let c = 0
    for (let d = 1; d <= 31; d++)
      if (new Date(year, month-1, d).getDay() === 1 && ++c === n) return d
    return null
  }
  if (month===1)  { const d=nthMon(2); if(d) h[d]='成人の日' }
  if (month===7)  { const d=nthMon(3); if(d) h[d]='海の日' }
  if (month===9)  {
    const d=nthMon(3); if(d) h[d]='敬老の日'
    add(9, Math.floor(23.2488+0.242194*(year-1980)-Math.floor((year-1980)/4)), '秋分の日')
  }
  if (month===10) { const d=nthMon(2); if(d) h[d]='スポーツの日' }
  if (month===3)  add(3, Math.floor(20.8431+0.242194*(year-1980)-Math.floor((year-1980)/4)), '春分の日')
  Object.entries(h).forEach(([d]) => {
    if (new Date(year, month-1, +d).getDay()===0 && !h[+d+1]) h[+d+1]='振替休日'
  })
  return h
}

const DOW_NAMES = ['日','月','火','水','木','金','土']

// ══════════════════════════════════════════════════════════════
//  月齢バーの描画（0〜1 → 月の形を文字で）
// ══════════════════════════════════════════════════════════════
function moonPhaseChar(phase: number): string {
  const icons = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘','🌑']
  return icons[Math.round(phase * 8) % 8]
}

// ══════════════════════════════════════════════════════════════
//  状態
// ══════════════════════════════════════════════════════════════
const today        = new Date()
const currentYear  = ref(today.getFullYear())
const currentMonth = ref(today.getMonth() + 1)

function prevMonth() {
  if (--currentMonth.value < 1)  { currentMonth.value = 12; currentYear.value-- }
}
function nextMonth() {
  if (++currentMonth.value > 12) { currentMonth.value = 1;  currentYear.value++ }
}

// ══════════════════════════════════════════════════════════════
//  DayCell
// ══════════════════════════════════════════════════════════════
interface DayCell {
  day:           number
  dow:           number
  isToday:       boolean
  isHoliday:     boolean
  lunarDay:      number
  lunarMonth:    number
  lunarIsLeap:   boolean
  lunarIsFirst:  boolean
  lunarDayStr:   string
  lunarMonthStr: string
  lunarYear:     number
  rokuyou:       string
  rokuyouClass:  string
  sekki:         string
  sekkiLon:      number
  sekku:         string
  zassetsu:      string
  holidayName:   string
  moonPhaseVal:  number
  kanshiKanji:   string
  kanshiKana:    string
  kanshiEmoji:   string
  kanshiNacchin: string
  kanshiGogyou:  string
  kanshiInyo:    string
  kanshiShi:     string   // 十二支漢字
  kanshiShiKana: string
  kanshiShiEmoji:string
  dayKanshiKanji:  string
  dayKanshiEmoji:  string
  dayKanshiKana:   string
  dayKanshiNacchin:string
  dayKanshiGogyou: string
  dayKanshiInyo:   string
  monthKanshiKanji:string
  monthKanshiEmoji:string
  monthKanshiKana: string
}

const ROKUYOU_CLASS: Record<string, string> = {
  '先勝':'sensho','友引':'tomobiki','先負':'senbu',
  '仏滅':'butsumetsu','大安':'taian','赤口':'shakkou',
}

const ROKUYOU_DESC: Record<string, string> = {
  '先勝': '午前吉・午後凶。急ぎ事・訴訟に吉。',
  '友引': '友を引く日。正午は凶。葬儀を避ける。',
  '先負': '午前凶・午後吉。静かに過ごすべき日。',
  '仏滅': '万事凶の日。仏も滅する大凶日。',
  '大安': '万事大吉。結婚・旅行・開業に最適。',
  '赤口': '正午のみ吉。火・刃物に注意。',
}

const SEKKI_DESC: Record<string, string> = {
  '小寒':'寒さが増す頃。寒の入り。',
  '大寒':'一年で最も寒い時期。',
  '立春':'春の始まり。寒さが緩み始める。',
  '雨水':'雪が雨に変わり、草木が芽吹く頃。',
  '啓蟄':'冬ごもりの虫が地上に出てくる頃。',
  '春分':'昼夜の長さが等しくなる日。',
  '清明':'万物が清らかで明るくなる頃。',
  '穀雨':'田畑を潤す春雨の頃。',
  '立夏':'夏の始まり。',
  '小満':'草木が成長し天地に満ち始める頃。',
  '芒種':'稲などの穀物を植える頃。',
  '夏至':'一年で最も昼が長い日。',
  '小暑':'暑さが本格的になる頃。',
  '大暑':'一年で最も暑い時期。',
  '立秋':'秋の始まり。残暑が続く。',
  '処暑':'暑さが和らぐ頃。',
  '白露':'大気が冷えて露ができる頃。',
  '秋分':'昼夜の長さが等しくなる日。',
  '寒露':'冷たい露が結ぶ頃。',
  '霜降':'霜が降り始める頃。',
  '立冬':'冬の始まり。',
  '小雪':'雪が降り始める頃。',
  '大雪':'雪が本格的に降る頃。',
  '冬至':'一年で最も夜が長い日。',
}

const GOGYOU_EMOJI: Record<string, string> = {
  '木':'🌳','火':'🔥','土':'🪨','金':'⚙️','水':'💧'
}

const calendarError = ref<string|null>(null)

const calendarData = computed(() => {
  const y = currentYear.value, m = currentMonth.value
  const firstDow = new Date(y, m-1, 1).getDay()
  const lastDay  = new Date(y, m, 0).getDate()
  const holidays = getHolidays(y, m)
  const lunarMonths = new Set<string>()

  const days: DayCell[] = []
  for (let d = 1; d <= lastDay; d++) {
    try {
    const date = new Date(y, m-1, d)
    const lun  = toLunar(date)
    const ry   = rokuyou(date)
    const sk   = sekki(date)
    const sq   = sekku(date)
    const zs   = zassetsu(date)
    const mp   = moonPhase(date)
    // 干支（立春基準）
    const kanYear = (m === 1 || (m === 2 && d <= 3)) ? y - 1 : y
    const ks   = toKanshi(kanYear)
    const dks  = toDayKanshi(date)
    const mks  = toMonthKanshiFromDate(date)

    if (lun.day === 1)
      lunarMonths.add((lun.isLeap ? '閏' : '') + lunarMonthName(lun.month, lun.isLeap))

    days.push({
      day:            d,
      dow:            date.getDay(),
      isToday:        d===today.getDate() && m===today.getMonth()+1 && y===today.getFullYear(),
      isHoliday:      !!holidays[d],
      lunarDay:       lun.day,
      lunarMonth:     lun.month,
      lunarIsLeap:    lun.isLeap,
      lunarIsFirst:   lun.day === 1,
      lunarDayStr:    lunarDayName(lun.day),
      lunarMonthStr:  lunarMonthName(lun.month, lun.isLeap),
      lunarYear:      lun.year,
      rokuyou:        ry,
      rokuyouClass:   ROKUYOU_CLASS[ry] ?? '',
      sekki:          sk?.name ?? '',
      sekkiLon:       sk?.longitude ?? 0,
      sekku:          sq?.name ?? '',
      zassetsu:       zs.map(z => z.name).join('・'),
      holidayName:    holidays[d] ?? '',
      moonPhaseVal:   mp,
      kanshiKanji:    ks.kanji,
      kanshiKana:     ks.kana,
      kanshiEmoji:    ks.emoji,
      kanshiNacchin:  ks.nacchin,
      kanshiGogyou:   ks.gogyou,
      kanshiInyo:     ks.inyo,
      kanshiShi:      ks.shi.kanji,
      kanshiShiKana:  ks.shi.kana,
      kanshiShiEmoji:  ks.shi.emoji,
      dayKanshiKanji:  dks.kanji,
      dayKanshiEmoji:  dks.emoji,
      dayKanshiKana:   dks.kana,
      dayKanshiNacchin:dks.nacchin,
      dayKanshiGogyou: dks.gogyou,
      dayKanshiInyo:   dks.inyo,
      monthKanshiKanji:mks.kanji,
      monthKanshiEmoji:mks.emoji,
      monthKanshiKana: mks.kana,
    })
    } catch(e) {
      calendarError.value = `d=${d}: ${(e as Error).message}`
      console.error('[WarekiCalendar]', e)
    }
  }

  return { firstDow, days, lunarSubtitle: [...lunarMonths].join('・') }
})

const kanshiData = computed(() => {
  const y = currentYear.value, m = currentMonth.value
  const kanYear = (m === 1 || (m === 2)) ? y - 1 : y
  return toKanshi(kanYear)
})


const MONTH_SVG = [
  '01_mutsuki','02_kisaragi','03_yayoi','04_uzuki',
  '05_satsuki','06_minazuki','07_fumizuki','08_hazuki',
  '09_nagatsuki','10_kannazuki','11_shimotsuki','12_shiwasu',
]

const MONTH_NAME = ['睦月','如月','弥生','卯月','皐月','水無月','文月','葉月','長月','神無月','霜月','師走']
const MONTH_MOTIF = [
  '梅の枝',     // 睦月
  '雪・着物',   // 如月
  '桜',         // 弥生
  '卯の花・蝶', // 卯月
  '田植え',     // 皐月
  'あじさい・雨', // 水無月
  '七夕・笹',   // 文月
  '落ち葉',     // 葉月
  '月・すすき', // 長月
  '鳥居・渡り鳥', // 神無月
  '霜・枯れ枝', // 霜月
  '除夜の鐘',   // 師走
]
const MONTH_DESC = [
  '家族や親戚が睦み合う月',         // 睦月
  '寒さに衣を重ね着する月',         // 如月
  '草木がいよいよ生い茂る月',       // 弥生
  '卯の花（ウツギ）が咲く月',       // 卯月
  '早苗を植え始める月',             // 皐月
  '田に水を張る・水が満ちる月',     // 水無月
  '七夕に歌や字を書く短冊の月',     // 文月
  '葉が落ちる月（旧暦の秋）',       // 葉月
  '夜長月——秋の夜長の月',           // 長月
  '神々が出雲へ旅立つ月',           // 神無月
  '霜が降り始める月',               // 霜月
  '師（僧）が馳せ走る月',           // 師走
]
const navMonthName = computed(() => MONTH_NAME[currentMonth.value - 1])
const navMotif     = computed(() => MONTH_MOTIF[currentMonth.value - 1])
const navDesc      = computed(() => MONTH_DESC[currentMonth.value - 1])

const navSvgSrc = computed(() => {
  const key = MONTH_SVG[(currentMonth.value - 1) % 12]
  return `${import.meta.env.BASE_URL}months/${key}.svg`
})

const monthTitle = computed(() => `${currentYear.value}年 ${currentMonth.value}月`)
const monthSub   = computed(() => {
  const sub = calendarData.value.lunarSubtitle
  const k   = kanshiData.value
  return [sub ? `旧暦 ${sub}` : '', `${k.kanji}（${k.kana}）${k.emoji}`].filter(Boolean).join('　')
})

// ══════════════════════════════════════════════════════════════
//  モーダル
// ══════════════════════════════════════════════════════════════
const modalCell = ref<DayCell | null>(null)

function openModal(c: DayCell) { modalCell.value = c }
function closeModal()          { modalCell.value = null }

// モーダル用: 次の節気
const modalNextSekki = computed(() => {
  if (!modalCell.value) return null
  const { day } = modalCell.value
  const date = new Date(currentYear.value, currentMonth.value - 1, day)
  const ns = nextSekki(date)
  if (!ns) return null
  // 日数計算: 節気の日付 - 対象日（日単位）
  const sekkiDate = new Date(ns.date)
  const msPerDay  = 86400000
  const daysUntil = Math.ceil((sekkiDate.getTime() - date.getTime()) / msPerDay)
  return { ...ns, daysUntil }
})
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

  <!-- ══════════════════════════════════════════════════════════
       モーダル
  ══════════════════════════════════════════════════════════ -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modalCell" class="modal-overlay" @click.self="closeModal">
        <div class="modal-box">

          <!-- 閉じるボタン -->
          <button class="modal-close" @click="closeModal">✕</button>

          <!-- ヘッダー: 日付 -->
          <div class="modal-head">
            <div class="modal-date">
              <span class="modal-day-num"
                :class="{ 'is-sun': modalCell.dow===0, 'is-sat': modalCell.dow===6, 'is-holiday': modalCell.isHoliday }">
                {{ currentYear }}年{{ currentMonth }}月{{ modalCell.day }}日
              </span>
              <span class="modal-dow"
                :class="{ 'is-sun': modalCell.dow===0, 'is-sat': modalCell.dow===6 }">
                （{{ DOW_NAMES[modalCell.dow] }}曜日）
              </span>
              <span v-if="modalCell.isToday" class="modal-today-badge">今日</span>
            </div>
            <div v-if="modalCell.holidayName" class="modal-holiday">🎌 {{ modalCell.holidayName }}</div>
          </div>

          <div class="modal-body">

            <!-- 左カラム -->
            <div class="modal-col">

              <!-- 旧暦 -->
              <div class="modal-section">
                <div class="modal-section-title">旧暦</div>
                <div class="modal-item-big">
                  {{ modalCell.lunarYear }}年
                  {{ modalCell.lunarIsLeap ? '閏' : '' }}{{ modalCell.lunarMonthStr }}
                  {{ modalCell.lunarDayStr }}
                </div>
                <div class="modal-item-sub">
                  旧暦 {{ modalCell.lunarMonth }}月{{ modalCell.lunarDay }}日
                  {{ modalCell.lunarIsLeap ? '（閏月）' : '' }}
                </div>
              </div>

              <!-- 六曜 -->
              <div class="modal-section">
                <div class="modal-section-title">六曜</div>
                <div class="modal-item-big" :class="['rokuyou-big', modalCell.rokuyouClass]">
                  {{ modalCell.rokuyou }}
                </div>
                <div class="modal-item-sub">{{ ROKUYOU_DESC[modalCell.rokuyou] }}</div>
              </div>

              <!-- 月相 -->
              <div class="modal-section">
                <div class="modal-section-title">月相</div>
                <div class="modal-item-big">
                  {{ moonPhaseChar(modalCell.moonPhaseVal) }}
                  {{ moonPhaseName(modalCell.moonPhaseVal) }}
                </div>
                <div class="modal-moon-bar">
                  <div class="modal-moon-fill" :style="{ width: (modalCell.moonPhaseVal * 100).toFixed(1) + '%' }" />
                </div>
                <div class="modal-item-sub">月齢 {{ (modalCell.moonPhaseVal * 29.53).toFixed(1) }}日</div>
              </div>

            </div>

            <!-- 右カラム -->
            <div class="modal-col">

              <!-- 干支・陰陽五行 -->
              <div class="modal-section">
                <div class="modal-section-title">干支・陰陽五行</div>
                <div class="modal-kanshi-row">
                  <span class="modal-kanshi-big">{{ modalCell.kanshiKanji }}</span>
                  <span class="modal-kanshi-emoji">{{ modalCell.kanshiEmoji }}</span>
                </div>
                <div class="modal-item-sub">{{ modalCell.kanshiKana }}</div>
                <div class="modal-tags">
                  <span class="modal-tag gogyou">
                    {{ GOGYOU_EMOJI[modalCell.kanshiGogyou] }} {{ modalCell.kanshiGogyou }}行
                  </span>
                  <span class="modal-tag inyo">
                    {{ modalCell.kanshiInyo === '陽' ? '☀️' : '🌙' }} {{ modalCell.kanshiInyo }}
                  </span>
                  <span class="modal-tag nacchin">納音: {{ modalCell.kanshiNacchin }}</span>
                </div>
                <div class="modal-item-sub" style="margin-top:0.4rem">
                  十二支: {{ modalCell.kanshiShi }}（{{ modalCell.kanshiShiKana }}）{{ modalCell.kanshiShiEmoji }}
                </div>
              </div>

              <!-- 月干支 -->
              <div class="modal-section">
                <div class="modal-section-title">月干支</div>
                <div class="modal-item-big">{{ modalCell.monthKanshiKanji }} <span class="kanshi-emoji">{{ modalCell.monthKanshiEmoji }}</span></div>
                <div class="modal-item-sub">{{ modalCell.monthKanshiKana }}</div>
              </div>

              <!-- 日干支 -->
              <div class="modal-section">
                <div class="modal-section-title">日干支</div>
                <div class="modal-item-big">{{ modalCell.dayKanshiKanji }} <span class="kanshi-emoji">{{ modalCell.dayKanshiEmoji }}</span></div>
                <div class="modal-item-sub">{{ modalCell.dayKanshiKana }}</div>
                <div class="modal-tags">
                  <span class="modal-tag gogyou">{{ GOGYOU_EMOJI[modalCell.dayKanshiGogyou] }} {{ modalCell.dayKanshiGogyou }}行</span>
                  <span class="modal-tag inyo">{{ modalCell.dayKanshiInyo === '陽' ? '☀️' : '🌙' }} {{ modalCell.dayKanshiInyo }}</span>
                  <span class="modal-tag nacchin">納音: {{ modalCell.dayKanshiNacchin }}</span>
                </div>
              </div>

              <!-- 節気・節句・雑節 -->
              <div class="modal-section">
                <div class="modal-section-title">節気・節句・雑節</div>
                <template v-if="modalCell.sekki">
                  <div class="modal-item-big sekki-big">🌿 {{ modalCell.sekki }}</div>
                  <div class="modal-item-sub">{{ SEKKI_DESC[modalCell.sekki] ?? '' }}</div>
                </template>
                <template v-if="modalCell.sekku">
                  <div class="modal-item-big sekku-big">🎎 {{ modalCell.sekku }}</div>
                </template>
                <template v-if="modalCell.zassetsu">
                  <div class="modal-item-big zassetsu-big">🍃 {{ modalCell.zassetsu }}</div>
                </template>
                <template v-if="!modalCell.sekki && !modalCell.sekku && !modalCell.zassetsu">
                  <div class="modal-item-sub">該当なし</div>
                  <div v-if="modalNextSekki" class="modal-next-sekki">
                    次の節気: <strong>{{ modalNextSekki.name }}</strong>
                    まで {{ modalNextSekki.daysUntil }}日
                  </div>
                </template>
              </div>

            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<!---------------------------------------------------------------------------->
<style scoped>
/* ── カレンダー本体 ─────────────────────────────────────── */
.cal-wrap { font-family: 'Hiragino Mincho ProN', 'Yu Mincho', serif; position:relative; overflow:hidden; }

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
.sekki    { font-size:0.56rem; color:#70c8a0; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:'Hiragino Sans',sans-serif; }
.sekku    { font-size:0.54rem; color:#f0a0c0; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:'Hiragino Sans',sans-serif; }
.zassetsu { font-size:0.52rem; color:#a8c870; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:'Hiragino Sans',sans-serif; }
.holiday-name { font-size:0.48rem; color:rgba(220,100,80,0.8); line-height:1.2; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; font-family:'Hiragino Sans',sans-serif; }

.legend { margin-top:1.2rem; display:flex; flex-wrap:wrap; gap:0.6rem 1.4rem; justify-content:center; font-size:0.62rem; color:var(--fg-muted); font-family:'Hiragino Sans',sans-serif; }
.legend-item { display:flex; align-items:center; gap:0.3rem; }
.legend-dot  { width:0.5rem; height:0.5rem; border-radius:50%; }

/* ── モーダル ──────────────────────────────────────────── */
.modal-overlay {
  position:fixed; inset:0; z-index:1000;
  background:rgba(0,0,0,0.72);
  display:flex; align-items:center; justify-content:center;
  padding:1rem;
  backdrop-filter:blur(4px);
}

.modal-box {
  position:relative;
  width:min(680px, 100%);
  max-height:90vh;
  overflow-y:auto;
  background:linear-gradient(160deg, var(--modal-bg) 0%, var(--modal-bg-deep) 100%);
  border:1px solid rgba(200,184,100,0.25);
  border-radius:12px;
  padding:1.8rem 2rem 2rem;
  box-shadow:0 24px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,200,0.08);
  font-family:'Hiragino Mincho ProN','Yu Mincho',serif;
  /* 和風飾り：四隅 */
}
.modal-box::before {
  content:'';
  position:absolute; inset:8px;
  border:1px solid var(--modal-inner-border);
  border-radius:8px;
  pointer-events:none;
}

.modal-close {
  position:absolute; top:0.9rem; right:1rem;
  background:none; border:none; color:var(--fg-muted);
  font-size:1rem; cursor:pointer; line-height:1;
  transition:color 0.2s;
}
.modal-close:hover { color:var(--gold); }

/* ヘッダー */
.modal-head { margin-bottom:1.2rem; padding-bottom:0.8rem; border-bottom:1px solid rgba(200,184,100,0.15); }
.modal-date { display:flex; align-items:baseline; gap:0.5rem; flex-wrap:wrap; }
.modal-day-num { font-size:1.5rem; font-weight:400; color:var(--gold); letter-spacing:0.05em; }
.modal-day-num.is-sun, .modal-day-num.is-holiday { color:#e87060; }
.modal-day-num.is-sat { color:#70a0e0; }
.modal-dow { font-size:0.9rem; color:var(--fg-muted); }
.modal-dow.is-sun { color:rgba(220,120,100,0.8); }
.modal-dow.is-sat { color:rgba(100,160,220,0.8); }
.modal-today-badge {
  font-size:0.62rem; padding:0.15rem 0.5rem; border-radius:3px;
  background:rgba(200,160,60,0.25); color:#e8c860;
  border:1px solid rgba(200,160,60,0.35);
  font-family:'Hiragino Sans',sans-serif;
}
.modal-holiday { margin-top:0.3rem; font-size:0.82rem; color:rgba(220,120,100,0.9); font-family:'Hiragino Sans',sans-serif; }

/* ボディ2カラム */
.modal-body { display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; }
@media (max-width: 480px) { .modal-body { grid-template-columns:1fr; } }

.modal-col { display:flex; flex-direction:column; gap:1.2rem; }

.modal-section { }
.modal-section-title {
  font-size:0.58rem; letter-spacing:0.18em; color:rgba(200,184,100,0.5);
  font-family:'Hiragino Sans',sans-serif; margin-bottom:0.35rem;
  text-transform:uppercase;
}
.modal-item-big {
  font-size:1.15rem; color:var(--gold); line-height:1.3; letter-spacing:0.05em;
}
.modal-item-sub {
  font-size:0.68rem; color:var(--fg-muted); line-height:1.5;
  font-family:'Hiragino Sans',sans-serif; margin-top:0.2rem;
}

/* 六曜の色 */
.rokuyou-big.taian      { color:#e8a840; }
.rokuyou-big.butsumetsu { color:#a070c0; }
.rokuyou-big.shakkou    { color:#c05050; }
.rokuyou-big.sensho,
.rokuyou-big.tomobiki,
.rokuyou-big.senbu      { color:var(--gold); }

/* 月齢バー */
.modal-moon-bar {
  margin-top:0.4rem;
  height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden;
}
.modal-moon-fill {
  height:100%;
  background:linear-gradient(to right, #4488cc, #aaddf0, #ffffff);
  border-radius:2px;
  transition:width 0.4s ease;
}

/* 干支 */
.modal-kanshi-row { display:flex; align-items:baseline; gap:0.6rem; }
.modal-kanshi-big { font-size:1.8rem; color:var(--gold); letter-spacing:0.1em; }
.modal-kanshi-emoji { font-size:1.4rem; }

.modal-tags { display:flex; flex-wrap:wrap; gap:0.35rem; margin-top:0.5rem; }
.modal-tag {
  font-size:0.62rem; padding:0.18rem 0.55rem; border-radius:3px;
  font-family:'Hiragino Sans',sans-serif;
}
.modal-tag.gogyou  { background:rgba(100,160,80,0.2);  color:#90d870; border:1px solid rgba(100,160,80,0.3); }
.modal-tag.inyo    { background:rgba(100,140,200,0.2); color:#90b8f0; border:1px solid rgba(100,140,200,0.3); }
.modal-tag.nacchin { background:rgba(180,140,60,0.2);  color:#d8b060; border:1px solid rgba(180,140,60,0.3); }

/* 節気・節句・雑節 */
.sekki-big    { color:#70c8a0; }
.sekku-big    { color:#f0a0c0; }
.zassetsu-big { color:#a8c870; }
.modal-next-sekki { font-size:0.68rem; color:var(--fg-label); font-family:'Hiragino Sans',sans-serif; margin-top:0.4rem; }
.modal-next-sekki strong { color:rgba(112,200,160,0.8); }

/* ── トランジション ────────────────────────────────────── */
.modal-fade-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.modal-fade-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.modal-fade-enter-from   { opacity:0; transform:scale(0.96) translateY(8px); }
.modal-fade-leave-to     { opacity:0; transform:scale(0.96) translateY(8px); }
</style>
