/**
 * useSkyData — 位置情報・天気・日出日没を取得する共有 composable
 *
 * 各コンポーネントが import して使う。
 * シングルトンパターンで1インスタンスのみ生成し、API呼び出しを共有する。
 */

import { ref, readonly } from 'vue'
import { moonPhase as calcMoonPhase } from 'wa-datetime'

// ─── 型定義 ───────────────────────────────────────────────────

export interface HourData {
  weatherCode:   number
  tempC:         number
  cloudCover:    number   // 0.0〜1.0
  precipitation: number   // mm
  windSpeed:     number   // m/s
}

export interface SkyData {
  sunriseMins:  number
  sunsetMins:   number
  moonriseMins: number
  moonsetMins:  number
  moonPhase:    number
  hourly:       HourData[]   // 24要素
  locationName: string
  lat:          number
}

// ─── 月の出入り略算 ───────────────────────────────────────────

function calcMoonTimes(phase: number): { rise: number; set: number } {
  const rise = Math.round((phase * 1440 + 360) % 1440)
  return { rise, set: (rise + 740) % 1440 }
}

// ─── 天気コード → ラベル ──────────────────────────────────────

export function weatherLabel(code: number): string {
  if (code === 0)              return '快晴'
  if (code <= 2)               return '晴れ'
  if (code === 3)              return '曇り'
  if (code <= 49)              return '霧'
  if (code <= 59)              return '霧雨'
  if (code <= 69)              return '雨'
  if (code <= 79)              return '雪'
  if (code <= 84)              return 'にわか雨'
  if (code <= 94)              return '雪シャワー'
  return '雷雨'
}

// ─── シングルトン状態 ─────────────────────────────────────────

const sky     = ref<SkyData | null>(null)
const loading = ref(true)

let initialized   = false
let clockTick:    ReturnType<typeof setInterval>
let refreshTick:  ReturnType<typeof setInterval>

// ─── API取得 ──────────────────────────────────────────────────

async function fetchData(lat: number, lon: number, locName: string) {
  const d     = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const res   = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=weather_code,temperature_2m,cloud_cover,precipitation,wind_speed_10m` +
    `&daily=sunrise,sunset&timezone=Asia%2FTokyo&start_date=${today}&end_date=${today}`
  )
  const json  = await res.json()
  const toMins = (s: string) => { const [h, m] = s.slice(11, 16).split(':').map(Number); return h * 60 + m }
  const phase  = calcMoonPhase(new Date())
  const moon   = calcMoonTimes(phase)

  const hourly: HourData[] = Array.from({ length: 24 }, (_, i) => ({
    weatherCode:   json.hourly.weather_code[i],
    tempC:         Math.round(json.hourly.temperature_2m[i]),
    cloudCover:    json.hourly.cloud_cover[i] / 100,
    precipitation: json.hourly.precipitation[i],
    windSpeed:     Math.round(json.hourly.wind_speed_10m[i] / 3.6),
  }))

  sky.value = {
    sunriseMins:  toMins(json.daily.sunrise[0]),
    sunsetMins:   toMins(json.daily.sunset[0]),
    moonriseMins: moon.rise,
    moonsetMins:  moon.set,
    moonPhase:    phase,
    hourly,
    locationName: locName,
    lat,
  }
  loading.value = false
}

async function init() {
  loading.value = true
  const FB = { lat: 35.6895, lon: 139.6917, name: '東京（フォールバック）' }
  let lat = FB.lat, lon = FB.lon, locName = FB.name

  try {
    const pos = await new Promise<GeolocationPosition>((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
    )
    lat = pos.coords.latitude
    lon = pos.coords.longitude
    try {
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ja`,
        { headers: { 'User-Agent': 'mannen-dokei/4.0' } }
      )
      const gj = await geo.json()
      const a  = gj.address ?? {}
      const city     = a.city || a.town || a.village || a.municipality || ''
      const district = a.city_district || a.suburb || ''
      const pref     = a.province || a.state || ''
      locName = [pref, city, district].filter(Boolean).join('') || `${lat.toFixed(2)}°N ${lon.toFixed(2)}°E`
    } catch {
      locName = `${lat.toFixed(2)}°N ${lon.toFixed(2)}°E`
    }
  } catch { /* Geolocation失敗 → フォールバック */ }

  try {
    await fetchData(lat, lon, locName)
  } catch {
    const phase = calcMoonPhase(new Date())
    const moon  = calcMoonTimes(phase)
    sky.value = {
      sunriseMins: 360, sunsetMins: 1080,
      moonriseMins: moon.rise, moonsetMins: moon.set,
      moonPhase: phase,
      hourly: Array.from({ length: 24 }, () => ({
        weatherCode: 0, tempC: 0, cloudCover: 0, precipitation: 0, windSpeed: 0,
      })),
      locationName: locName + '（オフライン）',
      lat,
    }
    loading.value = false
  }
}

// ─── 公開 composable ──────────────────────────────────────────

export function useSkyData() {
  if (!initialized) {
    initialized = true
    init()
    // 毎日0時をまたぐ場合に備えて日出日没も10分ごとに再取得
    refreshTick = setInterval(() => { init() }, 10 * 60_000)
  }

  return {
    sky:     readonly(sky),
    loading: readonly(loading),
    weatherLabel,
  }
}
