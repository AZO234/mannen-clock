<script setup lang="ts">
import { ref, watch } from 'vue'
import SkyBar  from '@/components/SkyBar.vue'
import EtoBar  from '@/components/EtoBar.vue'
import WarekiCalendar from '@/components/WarekiCalendar.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import MiniGadget from '@/components/MiniGadget.vue'
import MedGadget  from '@/components/MedGadget.vue'

const sunriseMins  = ref(360)
const sunsetMins   = ref(1080)
const skyWeather   = ref('—')
const skyTempC     = ref(0)
const skyPrecip    = ref(0)
const skyWindSpeed = ref(0)

function onSkyReady(sr: number, ss: number, wLabel: string, tempC: number, precip: number, wind: number) {
  sunriseMins.value  = sr
  sunsetMins.value   = ss
  skyWeather.value   = wLabel
  skyTempC.value     = tempC
  skyPrecip.value    = precip
  skyWindSpeed.value = wind
}

// テーマ: localStorage で永続化
const isDark = ref(localStorage.getItem('theme') !== 'light')
function applyTheme(dark: boolean) {
  document.body.setAttribute('data-theme', dark ? 'dark' : 'light')
  localStorage.setItem('theme', dark ? 'dark' : 'light')
}
applyTheme(isDark.value)
watch(isDark, v => applyTheme(v))

// 文字サイズ: small / medium / large
const FONT_SIZES = { small: '16px', medium: '20px', large: '24px' }
type FontSize = keyof typeof FONT_SIZES
const fontSize = ref<FontSize>((localStorage.getItem('fontSize') as FontSize) ?? 'medium')
function applyFontSize(s: FontSize) {
  document.documentElement.style.fontSize = FONT_SIZES[s]
  localStorage.setItem('fontSize', s)
}
applyFontSize(fontSize.value)
function setFontSize(s: FontSize) {
  fontSize.value = s
  applyFontSize(s)
}
</script>

<template>
  <div class="toolbar">
    <div class="font-switcher">
      <button
        v-for="s in (['small','medium','large'] as const)"
        :key="s"
        class="font-btn"
        :class="{ active: fontSize === s }"
        @click="setFontSize(s)"
      >{{ s === 'small' ? '小' : s === 'medium' ? '中' : '大' }}</button>
    </div>
    <ThemeToggle v-model="isDark" />
  </div>

  <header class="site-header">
    <div class="header-inner">
      <div class="header-titles">
        <h1 class="site-title">Web万年時計</h1>
        <p class="site-sub">Inspired by 田中久重「万年自鳴鐘」(1851)</p>
      </div>
    </div>
  </header>

  <div class="sns-bar">
    <a href="https://twitter.com/share?ref_src=twsrc%5Etfw" class="twitter-share-button" data-show-count="false">ポスト</a>
    <iframe src="https://www.facebook.com/plugins/share_button.php?href=https%3A%2F%2FAZO234.github.com%2Fmannen-clock&layout&size&width=93&height=20&appId" width="93" height="20" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>
    <div class="line-it-button" data-lang="ja" data-type="share-a" data-env="REAL" data-url="https://azo234.github.io/mannen-clock/" data-color="default" data-size="small" data-count="false" data-ver="3" style="display: none;"></div>
    <a href="https://coff.ee/azo234" target="_blank" rel="noopener noreferrer">
      <img src="https://img.shields.io/badge/-Buy%20Me%20a%20Coffee-ffdd00?style=flat-square&logo=buymeacoffee&logoColor=black" alt="Buy Me a Coffee">
    </a>
    <a href="https://github.com/sponsors/azo234" target="_blank" rel="noopener noreferrer">
      <img src="https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4%EF%B8%8F&logo=github-sponsors&color=lightgrey&style=for-the-badge" alt="Sponsor ❤️">
    </a>
  </div>

  <div class="gadgets-bar">
    <div class="gadget-item">
      <div class="section-label">小ガジェット</div>
      <MiniGadget :sunrise-mins="sunriseMins" :sunset-mins="sunsetMins" />
    </div>
    <div class="gadget-item">
      <div class="section-label">中ガジェット</div>
      <MedGadget
      :sunrise-mins="sunriseMins"
      :sunset-mins="sunsetMins"
      :weather-label="skyWeather"
      :temp-c="skyTempC"
      :precip="skyPrecip"
      :wind-speed="skyWindSpeed"
    />
    </div>
  </div>

  <section class="section">
    <div class="section-label">天象</div>
    <SkyBar @ready="onSkyReady" />
  </section>

  <section class="section">
    <div class="section-label">和時刻</div>
    <EtoBar :sunrise-mins="sunriseMins" :sunset-mins="sunsetMins" />
  </section>

  <section class="section">
    <div class="section-label">和暦</div>
    <WarekiCalendar />
  </section>
</template>

<style scoped>
.toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.8rem;
  padding: 0.3rem 0 0.2rem;
}
.font-switcher {
  display: flex;
  gap: 0.2rem;
}
.font-btn {
  background: none;
  border: 1px solid var(--fg-label);
  color: var(--fg-muted);
  border-radius: 4px;
  padding: 0.15rem 0.5rem;
  cursor: pointer;
  font-family: 'Hiragino Sans', sans-serif;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  line-height: 1.6;
}
.font-btn:hover {
  background: var(--bg-hover);
  color: var(--fg);
}
.font-btn.active {
  background: var(--bg-hover);
  border-color: var(--gold-muted);
  color: var(--gold);
}

.sns-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.4rem 0.5rem;
  margin-bottom: 0.4rem;
}
.sns-bar img {
  display: block;
}

.gadgets-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: center;
  gap: 0.8rem;
  padding: 0.2rem 0 0.4rem;
}
.gadget-item {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.site-header {
  padding: 0.3rem 0 0.2rem;
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.2rem;
  position: relative;
}
.header-titles {
  text-align: center;
}
.site-title {
  font-family: 'Hiragino Mincho ProN', 'Yu Mincho', serif;
  font-size: 1.6rem;
  font-weight: 400;
  letter-spacing: 0.2em;
  color: var(--gold);
  transition: color 0.3s;
}
.site-sub {
  font-size: 0.65rem;
  color: var(--fg-label);
  letter-spacing: 0.1em;
  margin-top: 0.3rem;
  transition: color 0.3s;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.section-label {
  font-size: 0.6rem;
  letter-spacing: 0.15em;
  color: var(--fg-label);
  font-family: 'Hiragino Mincho ProN', serif;
  transition: color 0.3s;
}
</style>
