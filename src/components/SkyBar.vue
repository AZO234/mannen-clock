<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSkyData, weatherLabel, type SkyData } from '@/composables/useSkyData'

// ホバー時に右パネルに表示する情報
interface HoverInfo {
  hhmm:   string
  label:  string
  tempC:  number
  precip: number   // mm
  wind:   number   // m/s
  cloud:  number   // %
}

// ─────────────────────────────────────────────────────────────
// 降水量バーの色
function precipColor(mm: number): string {
  if (mm <= 0)   return 'rgba(255,255,255,0.15)'
  if (mm < 1)    return '#7ec8e3'
  if (mm < 5)    return '#4a9fd4'
  if (mm < 10)   return '#2266aa'
  if (mm < 20)   return '#8844cc'
  return '#cc2244'
}

// ─────────────────────────────────────────────────────────────
// 色補間
// ─────────────────────────────────────────────────────────────
function lerpColor(a: string, b: string, t: number): string {
  const ah=a.replace('#',''), bh=b.replace('#','')
  const ar=parseInt(ah.slice(0,2),16), ag=parseInt(ah.slice(2,4),16), ab=parseInt(ah.slice(4,6),16)
  const br=parseInt(bh.slice(0,2),16), bg=parseInt(bh.slice(2,4),16), bb=parseInt(bh.slice(4,6),16)
  return `rgb(${Math.round(ar+(br-ar)*t)},${Math.round(ag+(bg-ag)*t)},${Math.round(ab+(bb-ab)*t)})`
}

function skyColors(min: number, sr: number, ss: number) {
  const dawn=sr-45, dusk=ss+45, predawn=sr-90, postdusk=ss+90
  if (min < predawn || min > postdusk) return { top:'#06060f', bot:'#0d0d20' }
  if (min < dawn)  { const t=(min-predawn)/(dawn-predawn);   return { top:lerpColor('#06060f','#1a0e2e',t), bot:lerpColor('#0d0d20','#2a1040',t) } }
  if (min < sr)    { const t=(min-dawn)/(sr-dawn);           return { top:lerpColor('#1a0e2e','#3a6090',t), bot:lerpColor('#2a1040','#e06030',t) } }
  if (min < sr+45) { const t=(min-sr)/45;                    return { top:lerpColor('#3a6090','#4a9fd4',t), bot:lerpColor('#e06030','#80c8f0',t) } }
  if (min < ss-45) return { top:'#4a9fd4', bot:'#80c8f0' }
  if (min < ss)    { const t=(min-(ss-45))/45;               return { top:lerpColor('#4a9fd4','#c05020',t), bot:lerpColor('#80c8f0','#e07030',t) } }
  if (min < dusk)  { const t=(min-ss)/(dusk-ss);             return { top:lerpColor('#c05020','#1a0e2e',t), bot:lerpColor('#e07030','#2a1040',t) } }
  const t=Math.min((min-dusk)/(postdusk-dusk),1)
  return { top:lerpColor('#1a0e2e','#06060f',t), bot:lerpColor('#2a1040','#0d0d20',t) }
}

// 緯度と太陽黄経から赤緯→正午最大高度→正規化スケール [0,1] を計算
function solarMaxAltitudeScale(latDeg: number, date: Date): number {
  const ECLIPTIC = 23.4397
  // 太陽黄経の簡易計算（Meeus式簡略版）
  const d = (date.getTime() / 86400000) - 10957.5  // J2000.0からの日数
  const L = (280.460 + 0.9856474 * d) % 360
  const g = (357.528 + 0.9856003 * d) % 360 * Math.PI / 180
  const lon = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2*g)) % 360
  const decl = Math.asin(Math.sin(ECLIPTIC * Math.PI/180) * Math.sin(lon * Math.PI/180))
  const declDeg = decl * 180 / Math.PI
  // 正午の最大高度角
  const altDeg = 90 - Math.abs(latDeg - declDeg)
  // 正規化: 夏至(lat+eps)が1.0, 冬至(lat-eps)が0.0
  const altMax = 90 - Math.abs(latDeg - ECLIPTIC)   // 夏至の最大高度
  const altMin = 90 - Math.abs(latDeg + ECLIPTIC)   // 冬至の最大高度
  return Math.max(0.1, Math.min(1.0, (altDeg - altMin) / (altMax - altMin)))
}


function sunAltitude(min: number, sr: number, ss: number) {
  if (min <= sr || min >= ss) return -0.1
  return Math.sin(Math.PI*(min-sr)/(ss-sr))
}
function moonAltitude(min: number, rise: number, set: number) {
  const s=set<rise?set+1440:set, m=min<rise&&set<rise?min+1440:min
  if (m<rise||m>s) return -0.1
  return Math.sin(Math.PI*(m-rise)/(s-rise))
}
function moonShadow(phase: number): string {
  if (phase<0.03||phase>0.97) return 'inset 0 0 0 0.21em #0a0a1a'
  if (phase<0.5) return `inset ${((0.5-phase)*2*0.42).toFixed(3)}em 0 0.08em #0d0d22`
  return `inset -${((phase-0.5)*2*0.42).toFixed(3)}em 0 0.08em #0d0d22`
}
function glowParams(min: number, sr: number, ss: number) {
  if (min>=sr-60&&min<=sr+30) return { op:(1-Math.abs(min-sr)/60)*0.7, color:'rgba(255,140,40,0.6)' }
  if (min>=ss-30&&min<=ss+60) return { op:(1-Math.abs(min-ss)/60)*0.7, color:'rgba(255,100,40,0.6)' }
  return { op:0, color:'transparent' }
}

const starSeeds = Array.from({length:96},(_,i) => {
  const r=(n:number)=>Math.sin(i*127.1+n*311.7)*0.5+0.5
  return [{x:r(0),y:r(1)},{x:r(2),y:r(3)},{x:r(4),y:r(5)}]
})
function starShadow(idx: number, op: number): string {
  if (op<0.05) return 'none'
  return starSeeds[idx].map(s=>`${(s.x*100).toFixed(1)}% ${(s.y*60).toFixed(1)}% 0 0 rgba(255,255,255,${(0.5+s.x*0.5).toFixed(2)})`).join(',')
}

// ─────────────────────────────────────────────────────────────
// 96セル計算
// ─────────────────────────────────────────────────────────────
function buildCells(p: SkyData, latDeg = 35.0) {
  const scale = solarMaxAltitudeScale(latDeg, new Date())
  return Array.from({length:96},(_,i)=>{
    const min   = i*15+7
    const col   = skyColors(min, p.sunriseMins, p.sunsetMins)
    const sa    = sunAltitude(min, p.sunriseMins, p.sunsetMins)
    const ma    = moonAltitude(min, p.moonriseMins, p.moonsetMins)
    const cloud = p.hourly[Math.floor(min/60)]?.cloudCover ?? 0
    const glow  = glowParams(min, p.sunriseMins, p.sunsetMins)
    const starOp = sa<0 ? Math.max(0,(1-cloud)*0.9) : 0
    return {
      '--sky-top':     col.top,
      '--sky-bot':     col.bot,
      '--sun-y':       sa>0 ? `${(100-sa*(20+scale*65)).toFixed(1)}%` : '110%',
      '--sun-op':      sa>0 ? '1' : '0',
      '--moon-y':      ma>0 ? `${(100-ma*59).toFixed(1)}%` : '110%',
      '--moon-op':     ma>0 ? Math.min(1,ma+0.3).toFixed(2) : '0',
      '--moon-shadow': moonShadow(p.moonPhase),
      '--cloud-op':    cloud.toFixed(2),
      '--star-op':     starOp.toFixed(2),
      '--glow-op':     glow.op.toFixed(2),
      '--glow-color':  glow.color,
      '--star-shadow': starShadow(i, starOp),
    }
  })
}

// ─────────────────────────────────────────────────────────────
// 月相名 — wa-datetime を使用
// ─────────────────────────────────────────────────────────────
import { moonPhaseName } from 'wa-datetime'

// sky データは composable から取得
// ─────────────────────────────────────────────────────────────
const { sky, loading } = useSkyData()

const cells = computed(() => sky.value ? buildCells(sky.value, sky.value.lat) : [])
const now   = ref(new Date())



const nowMins = computed(()=>now.value.getHours()*60+now.value.getMinutes())
const nowPct  = computed(()=>(nowMins.value/1440*100).toFixed(3)+'%')
const nowHHMM = computed(()=>{
  const h=String(now.value.getHours()).padStart(2,'0')
  const m=String(now.value.getMinutes()).padStart(2,'0')
  return `${h}:${m}`
})
function minsToHHMM(mins: number): string {
  return `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`
}
const sunriseHHMM = computed(()=> sky.value ? minsToHHMM(sky.value.sunriseMins) : '--:--')
const sunsetHHMM  = computed(()=> sky.value ? minsToHHMM(sky.value.sunsetMins)  : '--:--')
const isDay = computed(()=>
  sky.value ? nowMins.value>sky.value.sunriseMins && nowMins.value<sky.value.sunsetMins : false
)

// ホバー状態
const hoveredInfo = ref<{hhmm:string,label:string,tempC:number,precip:number,wind:number,cloud:number}|null>(null)

function onCellEnter(cellIndex: number) {
  if (!sky.value) return
  const min  = cellIndex * 15
  const hour = Math.min(Math.floor(min / 60), 23)
  const hh   = String(Math.floor(min/60)).padStart(2,'0')
  const mm   = String(min%60).padStart(2,'0')
  const h    = sky.value.hourly[hour]
  hoveredInfo.value = {
    hhmm:   `${hh}:${mm}〜`,
    label:  weatherLabel(h.weatherCode),
    tempC:  h.tempC,
    precip: h.precipitation,
    wind:   h.windSpeed,
    cloud:  Math.round(h.cloudCover*100),
  }
}
function onCellLeave() {
  hoveredInfo.value = null
}

// 右パネルに表示する内容（ホバー時はその時刻、それ以外は現在）
const currentHour = computed(()=>now.value.getHours())
const rightPanel = computed(()=>{
  if (!sky.value) return null
  if (hoveredInfo.value) return hoveredInfo.value
  const h = sky.value.hourly[currentHour.value]
  return {
    hhmm:   nowHHMM.value,
    label:  weatherLabel(h.weatherCode),
    tempC:  h.tempC,
    precip: h.precipitation,
    wind:   h.windSpeed,
    cloud:  Math.round(h.cloudCover*100),
  }
})
// ─────────────────────────────────────────────────────────────
// 時刻: ブラウザのローカル時計をそのまま使用
// ─────────────────────────────────────────────────────────────

let clockTick: ReturnType<typeof setInterval>

onMounted(() => {
  now.value = new Date()
  clockTick = setInterval(() => { now.value = new Date() }, 1_000)
})
onUnmounted(() => { clearInterval(clockTick) })
</script>

<!---------------------------------------------------------------------------->
<template>
  <div class="wrap">

    <div class="row">

      <!-- 左: 地名 + 現在時刻（常時） -->
      <div class="side side--left" :class="isDay?'day':'night'">
        <template v-if="!loading && sky">
          <span class="side__loc">{{ sky.locationName }}</span>
          <span class="side__time">{{ nowHHMM }}</span>
          <div class="side__sunrow">
            <span class="side__suntime">日出 {{ sunriseHHMM }}</span>
            <span class="side__suntime">日没 {{ sunsetHHMM }}</span>
          </div>
        </template>
        <span v-else class="side__spin">…</span>
      </div>

      <!-- バー本体 -->
      <div class="bar" :class="{'bar--loading':loading}">
        <template v-if="loading">
          <span class="bar__msg">取得中…</span>
        </template>
        <template v-else>
          <div
            v-for="(s,i) in cells"
            :key="i"
            class="cell"
            :style="s as any"
            @mouseenter="onCellEnter(i)"
            @mouseleave="onCellLeave"
          >
            <div class="cell__glow"/>
            <div class="cell__stars">
              <div class="cell__star-dots" :style="{boxShadow:s['--star-shadow']}"/>
            </div>
            <div class="cell__cloud"/>
            <div class="cell__moon"/>
            <div class="cell__sun"/>
            <div v-if="i % 12 === 0" class="cell__tick">{{ String(i / 4).padStart(2,'0') }}</div>
          </div>
          <div class="now-line" :style="{left:nowPct}"/>
        </template>
      </div>

      <!-- 右: 現在天気 / ホバー時はその時刻の天気 -->
      <div class="side side--right" :class="[isDay?'day':'night', hoveredInfo?'hovering':'']">
        <template v-if="!loading && rightPanel">
          <!-- 時刻（ホバー時は予報時刻、通常は現在時刻） -->
          <span class="side__hhmm">{{ rightPanel.hhmm }}</span>
          <!-- 天気・気温 -->
          <div class="side__row">
            <span class="side__weather">{{ rightPanel.label }}</span>
            <span class="side__temp">{{ rightPanel.tempC }}℃</span>
          </div>
          <!-- 雨・雲・風（常時表示、高さ固定） -->
          <div class="side__detail">
            <div class="detail-item">
              <span class="detail-label">雨</span>
              <div class="precip-bar-wrap">
                <div class="precip-bar" :style="{width:Math.min(rightPanel.precip/20*100,100)+'%',background:precipColor(rightPanel.precip)}"/>
              </div>
              <span class="detail-val">{{ rightPanel.precip.toFixed(1) }}mm</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">雲</span>
              <div class="precip-bar-wrap">
                <div class="precip-bar" :style="{width:rightPanel.cloud+'%',background:'rgba(255,255,255,0.4)'}"/>
              </div>
              <span class="detail-val">{{ rightPanel.cloud }}%</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">風</span>
              <div class="precip-bar-wrap">
                <div class="precip-bar" :style="{width:Math.min(rightPanel.wind/60*100,100)+'%',background:'rgba(150,230,255,0.5)'}"/>
              </div>
              <span class="detail-val">{{ rightPanel.wind }}m/s</span>
            </div>
          </div>
        </template>
        <span v-else class="side__spin">…</span>
      </div>

    </div>


  </div>
</template>

<!---------------------------------------------------------------------------->
<style scoped>
.wrap {
  width: 100%;
  font-size: 1.25rem;
  font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif;
}

/* ── 行 ── */
.row {
  display: flex;
  align-items: stretch;
  border-radius: 0.35em;
  overflow: visible;          /* 右パネル拡張のためvisible */
  box-shadow: 0 4px 24px rgba(0,0,0,0.45);
}

/* ── サイドパネル共通 ── */
.side {
  flex-shrink: 0;
  width: 5.8em;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1em;
  padding: 0.2em 0.5em;
  transition: background 1.2s ease, color 0.8s ease, width 0.3s ease;
  overflow: hidden;
}
.side.day   { background:#3a8ec8; color:rgba(255,255,255,0.95); }
.side.night { background:#0d0d22; color:rgba(190,205,255,0.88); }

/* 左パネルは角丸 */
.side--left  { border-radius: 0.35em 0 0 0.35em; }
/* 右パネル: ホバー時に横幅が広がる */
.side--right {
  border-radius: 0 0.35em 0.35em 0;
  width: 9em;
  transition: background 0.3s ease, color 0.8s ease;
}


/* ── 右パネル内要素 ── */
.side__hhmm {
  font-size: 0.52em;
  opacity: 0.9;
}

.side__row {
  display: flex;
  align-items: baseline;
  gap: 0.3em;
}
.side__weather {
  font-size: 0.56em;
  opacity: 0.82;
}
.side__temp {
  font-size: 0.85em;
  font-weight: 700;
  letter-spacing: 0.02em;
}

/* 左パネル固有 */
.side__loc {
  font-size: 0.44em;
  opacity: 0.68;
  text-align: center;
  line-height: 1.35;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.side__time {
  font-size: 0.85em;
  font-weight: 700;
  letter-spacing: 0.03em;
}
.side__sunrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.05em;
  margin-top: 0.2em;
  width: 100%;
}
.side__suntime {
  font-size: 0.6em;
  opacity: 0.75;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

/* ── 詳細（降水・雲・風）── */
.side__detail {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.18em;
  margin-top: 0.12em;
  padding: 0 0.1em;
}
.detail-item {
  display: flex;
  align-items: center;
  gap: 0.25em;
  width: 100%;
}
.detail-label {
  font-size: 0.38em;
  opacity: 0.6;
  width: 1.2em;
  text-align: right;
  flex-shrink: 0;
}
.precip-bar-wrap {
  flex: 1;
  height: 0.18em;
  background: rgba(255,255,255,0.12);
  border-radius: 0.1em;
  overflow: hidden;
}
.precip-bar {
  height: 100%;
  border-radius: 0.1em;
  transition: width 0.3s ease;
  min-width: 2px;
}
.detail-val {
  font-size: 0.38em;
  opacity: 0.82;
  width: 3em;
  text-align: left;
  flex-shrink: 0;
}



.side__moon {
  font-size: 0.42em;
  opacity: 0.65;
  letter-spacing: 0.05em;
  font-family: 'Hiragino Mincho ProN', serif;
}

.side__spin {
  font-size:0.6em; opacity:0.35;
  animation:pulse 1.5s ease-in-out infinite;
}

/* ── バー ── */
.bar {
  position: relative;
  flex: 1;
  height: 5em;
  display: flex;
  overflow: hidden;
}
.bar--loading { background:#0d0d22; align-items:center; justify-content:center; }
.bar__msg { font-size:0.65em; color:rgba(255,255,255,0.35); animation:pulse 1.5s ease-in-out infinite; }

/* ── セル ── */
.cell {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: linear-gradient(to bottom, var(--sky-top,#06060f), var(--sky-bot,#0d0d20));
}

.cell__sun {
  position: absolute; left:50%;
  width:0.55em; height:0.55em; border-radius:50%;
  background:radial-gradient(circle at 50% 50%,#ffd84d,#f59500 80%);
  transform:translate(-50%,-50%);
  top:var(--sun-y,110%); opacity:var(--sun-op,0); filter:blur(0.01em);
}
.cell__moon {
  position:absolute; left:50%;
  width:0.42em; height:0.42em; border-radius:50%;
  background:#d0d0d4;
  transform:translate(-50%,-50%);
  top:var(--moon-y,110%); opacity:var(--moon-op,0);
  overflow:hidden; filter:blur(0.005em);
}
.cell__moon::after {
  content:''; position:absolute; inset:0; border-radius:50%;
  box-shadow:var(--moon-shadow,inset 0.3em 0 0.1em #0a0a1a);
}
.cell__cloud {
  position:absolute; inset:0;
  opacity:var(--cloud-op,0); pointer-events:none;
}
.cell__cloud::before {
  content:''; position:absolute; inset:0;
  background:linear-gradient(to bottom,rgba(255,255,255,0) 0%,rgba(255,255,255,0.08) 40%,rgba(255,255,255,0.25) 100%);
}
.cell__stars { position:absolute; inset:0; opacity:var(--star-op,0); pointer-events:none; }
.cell__star-dots {
  position:absolute; width:0.04em; height:0.04em;
  border-radius:50%; background:white; top:0; left:0;
}
.cell__glow {
  position:absolute; bottom:0; left:-50%;
  width:200%; height:60%;
  opacity:var(--glow-op,0);
  background:radial-gradient(ellipse at 50% 100%,var(--glow-color,transparent) 0%,transparent 70%);
  pointer-events:none;
}

/* ── 現在時刻ライン ── */
.now-line {
  position:absolute; top:0; bottom:0; width:2px;
  background:rgba(255,255,255,0.9);
  box-shadow:0 0 6px rgba(255,255,255,0.6);
  transform:translateX(-50%);
  pointer-events:none; z-index:10;
}
.now-line::before {
  content:'▼'; position:absolute;
  top:-1.3em; left:50%; transform:translateX(-50%);
  color:white; font-size:0.45em;
  text-shadow:0 1px 3px rgba(0,0,0,0.8);
}

/* ── セル内時刻ラベル ── */
.cell__tick {
  position: absolute;
  bottom: 0.1em;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.38em;
  color: rgba(255,255,255,0.35);
  white-space: nowrap;
  pointer-events: none;
  letter-spacing: 0.03em;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
}

@keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.85} }
</style>
