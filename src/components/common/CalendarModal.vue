<script setup lang="ts">
/**
 * CalendarModal.vue — 日付詳細モーダル（共通コンポーネント）
 * WarekiCalendar・MiniCalendar で共有
 */

import { computed } from 'vue'
import { moonPhaseName, nextSekki } from 'wa-datetime'
import {
  type DayCell,
  DOW_NAMES, ROKUYOU_DESC, SEKKI_DESC, GOGYOU_EMOJI,
  moonPhaseChar,
} from '@/composables/useCalendarData'

const props = defineProps<{
  cell:  DayCell | null
  year:  number
  month: number
}>()

const emit = defineEmits<{ close: [] }>()

const modalNextSekki = computed(() => {
  if (!props.cell) return null
  const date = new Date(props.year, props.month - 1, props.cell.day)
  const ns   = nextSekki(date)
  if (!ns) return null
  const daysUntil = Math.ceil((new Date(ns.date).getTime() - date.getTime()) / 86400000)
  return { ...ns, daysUntil }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="cell" class="modal-overlay" @click.self="emit('close')">
        <div class="modal-box">

          <button class="modal-close" @click="emit('close')">✕</button>

          <div class="modal-head">
            <div class="modal-date">
              <span class="modal-day-num"
                :class="{ 'is-sun': cell.dow===0, 'is-sat': cell.dow===6, 'is-holiday': cell.isHoliday }">
                {{ year }}年{{ month }}月{{ cell.day }}日
              </span>
              <span class="modal-dow"
                :class="{ 'is-sun': cell.dow===0, 'is-sat': cell.dow===6 }">
                （{{ DOW_NAMES[cell.dow] }}曜日）
              </span>
              <span v-if="cell.isToday" class="modal-today-badge">今日</span>
            </div>
            <div v-if="cell.holidayName" class="modal-holiday">🎌 {{ cell.holidayName }}</div>
          </div>

          <div class="modal-body">

            <!-- 左カラム -->
            <div class="modal-col">

              <div class="modal-section">
                <div class="modal-section-title">旧暦</div>
                <div class="modal-item-big">
                  {{ cell.lunarYear }}年
                  {{ cell.lunarIsLeap ? '閏' : '' }}{{ cell.lunarMonthStr }}
                  {{ cell.lunarDayStr }}
                </div>
                <div class="modal-item-sub">
                  旧暦 {{ cell.lunarMonth }}月{{ cell.lunarDay }}日
                  {{ cell.lunarIsLeap ? '（閏月）' : '' }}
                </div>
              </div>

              <div class="modal-section">
                <div class="modal-section-title">六曜</div>
                <div class="modal-item-big" :class="['rokuyou-big', cell.rokuyouClass]">
                  {{ cell.rokuyou }}
                </div>
                <div class="modal-item-sub">{{ ROKUYOU_DESC[cell.rokuyou] }}</div>
              </div>

              <div class="modal-section">
                <div class="modal-section-title">月相</div>
                <div class="modal-item-big">
                  {{ moonPhaseChar(cell.moonPhaseVal) }}
                  {{ moonPhaseName(cell.moonPhaseVal) }}
                </div>
                <div class="modal-moon-bar">
                  <div class="modal-moon-fill" :style="{ width: (cell.moonPhaseVal * 100).toFixed(1) + '%' }" />
                </div>
                <div class="modal-item-sub">月齢 {{ (cell.moonPhaseVal * 29.53).toFixed(1) }}日</div>
              </div>

            </div>

            <!-- 右カラム -->
            <div class="modal-col">

              <div class="modal-section">
                <div class="modal-section-title">干支・陰陽五行</div>
                <div class="modal-kanshi-row">
                  <span class="modal-kanshi-big">{{ cell.kanshiKanji }}</span>
                  <span class="modal-kanshi-emoji">{{ cell.kanshiEmoji }}</span>
                </div>
                <div class="modal-item-sub">{{ cell.kanshiKana }}</div>
                <div class="modal-tags">
                  <span class="modal-tag gogyou">{{ GOGYOU_EMOJI[cell.kanshiGogyou] }} {{ cell.kanshiGogyou }}行</span>
                  <span class="modal-tag inyo">{{ cell.kanshiInyo === '陽' ? '☀️' : '🌙' }} {{ cell.kanshiInyo }}</span>
                  <span class="modal-tag nacchin">納音: {{ cell.kanshiNacchin }}</span>
                </div>
                <div class="modal-item-sub" style="margin-top:0.4rem">
                  十二支: {{ cell.kanshiShi }}（{{ cell.kanshiShiKana }}）{{ cell.kanshiShiEmoji }}
                </div>
              </div>

              <div class="modal-section">
                <div class="modal-section-title">月干支</div>
                <div class="modal-item-big">{{ cell.monthKanshiKanji }} <span class="kanshi-emoji">{{ cell.monthKanshiEmoji }}</span></div>
                <div class="modal-item-sub">{{ cell.monthKanshiKana }}</div>
              </div>

              <div class="modal-section">
                <div class="modal-section-title">日干支</div>
                <div class="modal-item-big">{{ cell.dayKanshiKanji }} <span class="kanshi-emoji">{{ cell.dayKanshiEmoji }}</span></div>
                <div class="modal-item-sub">{{ cell.dayKanshiKana }}</div>
                <div class="modal-tags">
                  <span class="modal-tag gogyou">{{ GOGYOU_EMOJI[cell.dayKanshiGogyou] }} {{ cell.dayKanshiGogyou }}行</span>
                  <span class="modal-tag inyo">{{ cell.dayKanshiInyo === '陽' ? '☀️' : '🌙' }} {{ cell.dayKanshiInyo }}</span>
                  <span class="modal-tag nacchin">納音: {{ cell.dayKanshiNacchin }}</span>
                </div>
              </div>

              <div class="modal-section">
                <div class="modal-section-title">節気・節句・雑節</div>
                <template v-if="cell.sekki">
                  <div class="modal-item-big sekki-big">🌿 {{ cell.sekki }}</div>
                  <div class="modal-item-sub">{{ SEKKI_DESC[cell.sekki] ?? '' }}</div>
                </template>
                <template v-if="cell.sekku">
                  <div class="modal-item-big sekku-big">🎎 {{ cell.sekku }}</div>
                </template>
                <template v-if="cell.zassetsu">
                  <div class="modal-item-big zassetsu-big">🍃 {{ cell.zassetsu }}</div>
                </template>
                <template v-if="!cell.sekki && !cell.sekku && !cell.zassetsu">
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

<style scoped>
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
  box-shadow:0 24px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,200,0.08), inset 0 0 0 8px transparent, inset 0 0 0 9px var(--modal-inner-border);
  font-family:'Hiragino Mincho ProN','Yu Mincho','游明朝','Noto Serif JP',serif;
}
.modal-close {
  position:absolute; top:0.9rem; right:1rem;
  background:none; border:none; color:var(--fg-muted);
  font-size:1rem; cursor:pointer; line-height:1;
  transition:color 0.2s;
}
.modal-close:hover { color:var(--gold); }
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
  background:rgba(200,160,60,0.25); color:var(--tag-today-color);
  border:1px solid rgba(200,160,60,0.35);
  font-family:'Hiragino Sans','Yu Gothic','Meiryo','Noto Sans JP',sans-serif;
}
.modal-holiday { margin-top:0.3rem; font-size:0.82rem; color:rgba(220,120,100,0.9); font-family:'Hiragino Sans','Yu Gothic','Meiryo','Noto Sans JP',sans-serif; }
.modal-body { display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; }
@media (max-width: 480px) { .modal-body { grid-template-columns:1fr; } }
.modal-col { display:flex; flex-direction:column; gap:1.2rem; }
.modal-section-title {
  font-size:0.58rem; letter-spacing:0.18em; color:var(--modal-title-color);
  font-family:'Hiragino Sans','Yu Gothic','Meiryo','Noto Sans JP',sans-serif;
  margin-bottom:0.35rem; text-transform:uppercase;
}
.modal-item-big { font-size:1.2rem; color:var(--gold); line-height:1.3; letter-spacing:0.05em; }
.modal-item-sub {
  font-size:0.68rem; color:var(--fg-muted); line-height:1.5;
  font-family:'Hiragino Sans','Yu Gothic','Meiryo','Noto Sans JP',sans-serif; margin-top:0.2rem;
}
.rokuyou-big.taian      { color:#e8a840; }
.rokuyou-big.butsumetsu { color:#a070c0; }
.rokuyou-big.shakkou    { color:#c05050; }
.rokuyou-big.sensho, .rokuyou-big.tomobiki, .rokuyou-big.senbu { color:var(--gold); }
.modal-moon-bar { margin-top:0.4rem; height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden; }
.modal-moon-fill { height:100%; background:linear-gradient(to right, #4488cc, #aaddf0, #ffffff); border-radius:2px; transition:width 0.4s ease; }
.modal-kanshi-row { display:flex; align-items:baseline; gap:0.6rem; }
.modal-kanshi-big { font-size:1.8rem; color:var(--gold); letter-spacing:0.1em; }
.modal-kanshi-emoji { font-size:1.4rem; }
.kanshi-emoji { font-size:1.2rem; }
.modal-tags { display:flex; flex-wrap:wrap; gap:0.35rem; margin-top:0.5rem; }
.modal-tag { font-size:0.62rem; padding:0.18rem 0.55rem; border-radius:3px; font-family:'Hiragino Sans','Yu Gothic','Meiryo','Noto Sans JP',sans-serif; }
.modal-tag.gogyou  { background:rgba(100,160,80,0.2);  color:var(--tag-gogyou-color);  border:1px solid rgba(100,160,80,0.3); }
.modal-tag.inyo    { background:rgba(100,140,200,0.2); color:var(--tag-inyo-color);    border:1px solid rgba(100,140,200,0.3); }
.modal-tag.nacchin { background:rgba(180,140,60,0.2);  color:var(--tag-nacchin-color); border:1px solid rgba(180,140,60,0.3); }
.sekki-big    { color:var(--sekki-color); }
.sekku-big    { color:var(--sekku-color); }
.zassetsu-big { color:var(--zassetsu-color); }
.modal-next-sekki { font-size:0.68rem; color:var(--fg-label); font-family:'Hiragino Sans','Yu Gothic','Meiryo','Noto Sans JP',sans-serif; margin-top:0.4rem; }
.modal-next-sekki strong { color:rgba(112,200,160,0.8); }
.modal-fade-enter-active { transition:opacity 0.2s ease, transform 0.2s ease; }
.modal-fade-leave-active { transition:opacity 0.15s ease, transform 0.15s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity:0; transform:scale(0.96) translateY(8px); }
</style>
