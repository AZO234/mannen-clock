<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import CalendarModal from '@/components/common/CalendarModal.vue'
import {
  type DayCell,
  fetchHolidays, buildCalendarData,
  DOW_NAMES,
} from '@/composables/useCalendarData'

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

const calendarData = computed(() =>
  buildCalendarData(currentYear.value, currentMonth.value)
)

const modalCell = ref<DayCell | null>(null)
function openModal(c: DayCell) { modalCell.value = c }
function closeModal()          { modalCell.value = null }
</script>

<template>
  <div class="mini-cal">
    <div class="mini-cal__head">
      <button class="mini-cal__nav" @click="prevMonth">←</button>
      <span class="mini-cal__title">{{ currentYear }}年{{ currentMonth }}月</span>
      <button class="mini-cal__nav" @click="nextMonth">→</button>
    </div>

    <div class="mini-cal__dow-row">
      <div v-for="d in DOW_NAMES" :key="d"
        class="mini-cal__dow"
        :class="{ 'is-sun': d==='日', 'is-sat': d==='土' }">{{ d }}</div>
    </div>

    <div class="mini-cal__grid">
      <div v-for="i in calendarData.firstDow" :key="'e'+i" class="mini-cal__cell mini-cal__cell--empty" />
      <div
        v-for="c in calendarData.days" :key="c.day"
        class="mini-cal__cell"
        :class="{
          'is-today':   c.isToday,
          'is-sun':     c.dow===0,
          'is-sat':     c.dow===6,
          'is-holiday': c.isHoliday,
          'has-sekki':  !!c.sekki,
        }"
        @click="openModal(c)"
      >
        <span class="mini-cal__day">{{ c.day }}</span>
        <span v-if="c.lunarIsFirst" class="mini-cal__lunar">{{ c.lunarMonthStr }}</span>
        <span v-if="c.sekki" class="mini-cal__sekki">{{ c.sekki }}</span>
      </div>
    </div>
  </div>

  <CalendarModal :cell="modalCell" :year="currentYear" :month="currentMonth" @close="closeModal" />
</template>

<style scoped>
.mini-cal {
  display: inline-flex;
  flex-direction: column;
  gap: 0.3em;
  padding: 0.6em 0.7em;
  background: var(--bg-panel);
  border: 2px solid var(--gold-muted);
  border-radius: 0.6em;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06);
  font-family: 'Hiragino Mincho ProN', 'Yu Mincho', '游明朝', 'Noto Serif JP', serif;
  min-width: 16em;
}
.mini-cal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--gold-muted);
}
.mini-cal__title {
  font-size: 0.8em;
  color: var(--gold);
  letter-spacing: 0.08em;
}
.mini-cal__nav {
  background: none; border: none; color: var(--gold-muted);
  font-size: 0.75em; cursor: pointer; padding: 0 0.3em;
  transition: color 0.15s; font-family: inherit;
}
.mini-cal__nav:hover { color: var(--gold); }
.mini-cal__dow-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.mini-cal__dow {
  font-size: 0.55em; text-align: center; color: var(--fg-muted);
  padding: 0.2em 0;
  font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'Noto Sans JP', sans-serif;
}
.mini-cal__dow.is-sun { color: rgba(220,100,80,0.8); }
.mini-cal__dow.is-sat { color: rgba(100,160,220,0.8); }
.mini-cal__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.1em;
}
.mini-cal__cell {
  display: flex; flex-direction: column; align-items: center;
  padding: 0.2em 0.1em; border-radius: 0.3em;
  cursor: pointer; transition: background 0.15s; min-height: 2.4em;
}
.mini-cal__cell:hover { background: var(--bg-hover); }
.mini-cal__cell--empty { cursor: default; }
.mini-cal__cell--empty:hover { background: none; }
.mini-cal__cell.is-today {
  background: var(--cell-today-bg);
  box-shadow: inset 0 0 0 1px var(--cell-today-ring);
}
.mini-cal__cell.is-sun .mini-cal__day  { color: rgba(220,100,80,0.9); }
.mini-cal__cell.is-sat .mini-cal__day  { color: rgba(100,160,220,0.9); }
.mini-cal__cell.is-holiday .mini-cal__day { color: rgba(220,100,80,0.9); }
.mini-cal__day {
  font-size: 0.75em; line-height: 1.4; color: var(--fg);
  font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'Noto Sans JP', sans-serif;
}
.mini-cal__lunar {
  font-size: 0.38em; color: var(--gold-muted);
  letter-spacing: 0.02em; line-height: 1.2; white-space: nowrap;
}
.mini-cal__sekki {
  font-size: 0.36em; color: var(--sekki-color);
  line-height: 1.2; white-space: nowrap;
}
</style>
