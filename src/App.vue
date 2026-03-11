<script setup lang="ts">
import { ref, watch } from 'vue'
import SkyBar  from '@/components/SkyBar.vue'
import EtoBar  from '@/components/EtoBar.vue'
import WarekiCalendar from '@/components/WarekiCalendar.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const sunriseMins = ref(360)
const sunsetMins  = ref(1080)
function onSkyReady(sr: number, ss: number) {
  sunriseMins.value = sr
  sunsetMins.value  = ss
}

// テーマ: localStorage で永続化
const isDark = ref(localStorage.getItem('theme') !== 'light')
function applyTheme(dark: boolean) {
  document.body.setAttribute('data-theme', dark ? 'dark' : 'light')
  localStorage.setItem('theme', dark ? 'dark' : 'light')
}
applyTheme(isDark.value)
watch(isDark, v => applyTheme(v))
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <div class="header-titles">
        <h1 class="site-title">Web 万年時計</h1>
        <p class="site-sub">Inspired by 田中久重「万年自鳴鐘」(1851)</p>
      </div>
      <ThemeToggle v-model="isDark" />
    </div>
  </header>

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
.site-header {
  padding: 0.5rem 0 0.2rem;
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
