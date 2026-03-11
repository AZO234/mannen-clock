<script setup lang="ts">
import { ref } from 'vue'
import SkyBar  from '@/components/SkyBar.vue'
import EtoBar  from '@/components/EtoBar.vue'
import WarekiCalendar from '@/components/WarekiCalendar.vue'

// SkyBar が取得した日の出・入り（分）を EtoBar へ渡す
const sunriseMins = ref(360)   // デフォルト 06:00
const sunsetMins  = ref(1080)  // デフォルト 18:00

function onSkyReady(sr: number, ss: number) {
  sunriseMins.value = sr
  sunsetMins.value  = ss
}
</script>

<template>
  <header class="site-header">
    <h1 class="site-title">Web 万年時計</h1>
    <p class="site-sub">Inspired by 田中久重「万年自鳴鐘」(1851)</p>
  </header>

  <!-- 空バー（天気・太陽・月） -->
  <section class="section">
    <div class="section-label">天象</div>
    <SkyBar @ready="onSkyReady" />
  </section>

  <!-- 和時計（干支・不定時法） -->
  <section class="section">
    <div class="section-label">和時刻</div>
    <EtoBar :sunrise-mins="sunriseMins" :sunset-mins="sunsetMins" />
  </section>

  <!-- 和暦カレンダー -->
  <section class="section">
    <div class="section-label">和暦</div>
    <WarekiCalendar />
  </section>
</template>

<style scoped>
.site-header {
  text-align: center;
  padding: 0.5rem 0 0.2rem;
}
.site-title {
  font-family: 'Hiragino Mincho ProN', 'Yu Mincho', serif;
  font-size: 1.6rem;
  font-weight: 400;
  letter-spacing: 0.2em;
  color: #e8d8b0;
}
.site-sub {
  font-size: 0.65rem;
  color: rgba(200,184,144,0.45);
  letter-spacing: 0.1em;
  margin-top: 0.3rem;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.section-label {
  font-size: 0.6rem;
  letter-spacing: 0.15em;
  color: rgba(200,184,144,0.35);
  font-family: 'Hiragino Mincho ProN', serif;
}
</style>
