/**
 * useCalendarData.ts — カレンダーデータ共通 composable
 *
 * WarekiCalendar・MiniCalendar で共有する：
 * - DayCell 型定義
 * - 定数（ROKUYOU_CLASS / DESC, SEKKI_DESC, GOGYOU_EMOJI, DOW_NAMES）
 * - 祝日フェッチ・キャッシュ
 * - buildCalendarData()
 * - moonPhaseChar()
 */

import { ref } from 'vue'
import {
  toLunar, zassetsu, sekki, sekku,
  lunarMonthName, lunarDayName, rokuyou,
  toKanshi, toDayKanshi, toMonthKanshiFromDate,
  moonPhase, moonPhaseName,
} from 'wa-datetime'

// ─── 型定義 ───────────────────────────────────────────────────

export interface DayCell {
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
  kanshiShi:     string
  kanshiShiKana: string
  kanshiShiEmoji:string
  dayKanshiKanji:   string
  dayKanshiEmoji:   string
  dayKanshiKana:    string
  dayKanshiNacchin: string
  dayKanshiGogyou:  string
  dayKanshiInyo:    string
  monthKanshiKanji: string
  monthKanshiEmoji: string
  monthKanshiKana:  string
}

// ─── 定数 ─────────────────────────────────────────────────────

export const DOW_NAMES = ['日','月','火','水','木','金','土']

export const ROKUYOU_CLASS: Record<string, string> = {
  '先勝':'sensho','友引':'tomobiki','先負':'senbu',
  '仏滅':'butsumetsu','大安':'taian','赤口':'shakkou',
}

export const ROKUYOU_DESC: Record<string, string> = {
  '先勝': '午前吉・午後凶。急ぎ事・訴訟に吉。',
  '友引': '友を引く日。正午は凶。葬儀を避ける。',
  '先負': '午前凶・午後吉。静かに過ごすべき日。',
  '仏滅': '万事凶の日。仏も滅する大凶日。',
  '大安': '万事大吉。結婚・旅行・開業に最適。',
  '赤口': '正午のみ吉。火・刃物に注意。',
}

export const SEKKI_DESC: Record<string, string> = {
  '小寒':'寒さが増す頃。寒の入り。',   '大寒':'一年で最も寒い時期。',
  '立春':'春の始まり。寒さが緩み始める。', '雨水':'雪が雨に変わり、草木が芽吹く頃。',
  '啓蟄':'冬ごもりの虫が地上に出てくる頃。','春分':'昼夜の長さが等しくなる日。',
  '清明':'万物が清らかで明るくなる頃。',  '穀雨':'田畑を潤す春雨の頃。',
  '立夏':'夏の始まり。',              '小満':'草木が成長し天地に満ち始める頃。',
  '芒種':'稲などの穀物を植える頃。',    '夏至':'一年で最も昼が長い日。',
  '小暑':'暑さが本格的になる頃。',     '大暑':'一年で最も暑い時期。',
  '立秋':'秋の始まり。残暑が続く。',   '処暑':'暑さが和らぐ頃。',
  '白露':'大気が冷えて露ができる頃。',  '秋分':'昼夜の長さが等しくなる日。',
  '寒露':'冷たい露が結ぶ頃。',        '霜降':'霜が降り始める頃。',
  '立冬':'冬の始まり。',             '小雪':'雪が降り始める頃。',
  '大雪':'雪が本格的に降る頃。',      '冬至':'一年で最も夜が長い日。',
}

export const GOGYOU_EMOJI: Record<string, string> = {
  '木':'🌳','火':'🔥','土':'🪨','金':'⚙️','水':'💧'
}

export function moonPhaseChar(phase: number): string {
  const icons = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘','🌑']
  return icons[Math.round(phase * 8) % 8]
}

// ─── 祝日キャッシュ（シングルトン） ───────────────────────────

const holidayCache = ref<Record<number, Record<string, string>>>({})

export async function fetchHolidays(year: number) {
  if (holidayCache.value[year]) return
  try {
    const res  = await fetch(`https://holidays-jp.github.io/api/v1/${year}/date.json`)
    const json = await res.json() as Record<string, string>
    holidayCache.value = { ...holidayCache.value, [year]: json }
  } catch {
    holidayCache.value = { ...holidayCache.value, [year]: {} }
  }
}

export function getHolidays(year: number, month: number): Record<number, string> {
  const cache  = holidayCache.value[year] ?? {}
  const result: Record<number, string> = {}
  const prefix = `${year}-${String(month).padStart(2,'0')}-`
  for (const [date, name] of Object.entries(cache)) {
    if (date.startsWith(prefix)) result[parseInt(date.slice(8), 10)] = name
  }
  return result
}

// ─── カレンダーデータ生成 ──────────────────────────────────────

const today = new Date()

export function buildCalendarData(year: number, month: number) {
  const firstDow    = new Date(year, month-1, 1).getDay()
  const lastDay     = new Date(year, month, 0).getDate()
  const holidays    = getHolidays(year, month)
  const lunarMonths = new Set<string>()
  const days: DayCell[] = []

  for (let d = 1; d <= lastDay; d++) {
    try {
      const date    = new Date(year, month-1, d)
      const lun     = toLunar(date)
      const ry      = rokuyou(date)
      const sk      = sekki(date)
      const sq      = sekku(date)
      const zs      = zassetsu(date)
      const mp      = moonPhase(date)
      const kanYear = (month === 1 || (month === 2 && d <= 3)) ? year - 1 : year
      const ks      = toKanshi(kanYear)
      const dks     = toDayKanshi(date)
      const mks     = toMonthKanshiFromDate(date)

      if (lun.day === 1)
        lunarMonths.add((lun.isLeap ? '閏' : '') + lunarMonthName(lun.month, lun.isLeap))

      days.push({
        day: d, dow: date.getDay(),
        isToday:  d===today.getDate() && month===today.getMonth()+1 && year===today.getFullYear(),
        isHoliday: !!holidays[d],
        lunarDay: lun.day, lunarMonth: lun.month, lunarIsLeap: lun.isLeap,
        lunarIsFirst: lun.day === 1,
        lunarDayStr:   lunarDayName(lun.day),
        lunarMonthStr: lunarMonthName(lun.month, lun.isLeap),
        lunarYear:     lun.year,
        rokuyou: ry, rokuyouClass: ROKUYOU_CLASS[ry] ?? '',
        sekki:    sk?.name ?? '', sekkiLon: sk?.longitude ?? 0,
        sekku:    sq?.name ?? '',
        zassetsu: zs.map(z => z.name).join('・'),
        holidayName: holidays[d] ?? '',
        moonPhaseVal: mp,
        kanshiKanji: ks.kanji, kanshiKana: ks.kana, kanshiEmoji: ks.emoji,
        kanshiNacchin: ks.nacchin, kanshiGogyou: ks.gogyou, kanshiInyo: ks.inyo,
        kanshiShi: ks.shi.kanji, kanshiShiKana: ks.shi.kana, kanshiShiEmoji: ks.shi.emoji,
        dayKanshiKanji: dks.kanji, dayKanshiEmoji: dks.emoji, dayKanshiKana: dks.kana,
        dayKanshiNacchin: dks.nacchin, dayKanshiGogyou: dks.gogyou, dayKanshiInyo: dks.inyo,
        monthKanshiKanji: mks.kanji, monthKanshiEmoji: mks.emoji, monthKanshiKana: mks.kana,
      })
    } catch(e) {
      console.error('[useCalendarData]', e)
    }
  }

  return { firstDow, days, lunarSubtitle: [...lunarMonths].join('・') }
}
