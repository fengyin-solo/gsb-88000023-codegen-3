<script setup>
import ScheduleStepCard from './ScheduleStepCard.vue'
import ScheduleConflictPanel from './ScheduleConflictPanel.vue'
import ScheduleSaveBar from './ScheduleSaveBar.vue'
import { useDaySchedule } from '../../composables/useDaySchedule'
import {
  stepContentOf,
  stepNameOf,
} from '../../utils/restorationSchedule'

const {
  state,
  activeEntries,
  configuredEntries,
  conflicts,
  canceledEntries,
  dirty,
  todayLabel,
  patchEntry,
  setStatus,
  moveEntry,
  cancelEntry,
  restoreEntry,
  applyConflict,
  confirmSave,
  retrySave,
  dismissConflictPanel,
} = useDaySchedule()

function canMove(entryId, direction) {
  const lineup = configuredEntries.value
  const index = lineup.findIndex((item) => item.id === entryId)
  return index !== -1 && index + direction >= 0 && index + direction < lineup.length
}
</script>

<template>
  <div class="schedule-board">
    <header class="board-head">
      <div>
        <p class="board-date">{{ todayLabel() }}</p>
        <h4>当日工序流程板</h4>
        <p class="board-note">
          修复师为每道工序安排开始时间（顺序）、预计时长、责任人与修复室；
          四步标准工序内容固定，仅作引用展示。
        </p>
      </div>
      <div class="board-actions">
        <span v-if="conflicts.length" class="alert-pill">
          {{ conflicts.length }} 处资源冲突
        </span>
        <button
          type="button"
          class="confirm-btn"
          :disabled="state.saveState === 'saving'"
          @click="confirmSave"
        >
          确认当日编排
        </button>
      </div>
    </header>

    <ScheduleSaveBar
      :save-state="state.saveState"
      :save-error="state.saveError"
      :attempt="state.attempt"
      :interrupted="state.interrupted"
      :last-saved-at="state.lastSavedAt"
      :dirty="dirty"
      @retry="retrySave"
    />

    <ScheduleConflictPanel
      v-if="state.conflictOpen && conflicts.length"
      :conflicts="conflicts"
      @apply="applyConflict"
      @dismiss="dismissConflictPanel"
    />

    <p v-if="state.validationMessage" class="validation-banner">
      {{ state.validationMessage }}
    </p>

    <!-- 进行中的工序：按当日顺序排列；取消工序后其余卡片自动顺延 -->
    <section class="active-list">
      <ScheduleStepCard
        v-for="entry in activeEntries"
        :key="entry.id"
        :entry="entry"
        :entries="state.entries"
        :can-move-up="canMove(entry.id, -1)"
        :can-move-down="canMove(entry.id, 1)"
        @patch="patchEntry"
        @move="moveEntry"
        @cancel="cancelEntry"
        @status="setStatus"
      />
    </section>

    <p v-if="activeEntries.length === 0" class="all-canceled">
      四道工序均已取消，今日暂无任何安排。恢复任一道工序后即可重新编排。
    </p>

    <!-- 已取消工序：恢复后回到当日序列 -->
    <section v-if="canceledEntries.length" class="canceled-section">
      <header class="canceled-head">
        <h5>已取消（{{ canceledEntries.length }}）</h5>
        <span>取消后后续安排已自动顺延；恢复时按所选时间重新排序。</span>
      </header>
      <ul class="canceled-list">
        <li v-for="entry in canceledEntries" :key="entry.id" class="canceled-item">
          <div>
            <strong>{{ stepNameOf(entry.id) }}</strong>
            <p>{{ stepContentOf(entry.id) }}</p>
          </div>
          <button type="button" class="btn-restore" @click="restoreEntry(entry.id)">
            恢复本道
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.schedule-board {
  display: grid;
  gap: 16px;
}

.board-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
}

.board-date {
  margin: 0;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #8b7150;
}

.board-head h4 {
  margin: 6px 0 0;
  font-size: 1.2rem;
}

.board-note {
  margin: 8px 0 0;
  max-width: 560px;
  color: #6a5439;
  font-size: 0.88rem;
}

.board-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: none;
}

.alert-pill {
  padding: 7px 12px;
  border-radius: 999px;
  background: #efd0c9;
  color: #913d2f;
  font-size: 0.8rem;
}

.confirm-btn {
  font: inherit;
  cursor: pointer;
  border: none;
  border-radius: 999px;
  padding: 11px 22px;
  background: #5d4322;
  color: #fff8eb;
  font-size: 0.9rem;
}

.confirm-btn:disabled {
  opacity: 0.55;
  cursor: wait;
}

.validation-banner {
  margin: 0;
  padding: 12px 16px;
  border-radius: 14px;
  background: #fdf3df;
  border: 1px solid #e3c886;
  color: #8b6314;
  font-size: 0.88rem;
}

.active-list {
  display: grid;
  gap: 12px;
}

.all-canceled {
  margin: 0;
  padding: 22px;
  text-align: center;
  border: 1px dashed rgba(79, 57, 32, 0.25);
  border-radius: 18px;
  color: #8b7150;
  background: rgba(250, 244, 232, 0.6);
}

.canceled-section {
  border-top: 1px dashed rgba(79, 57, 32, 0.2);
  padding-top: 14px;
}

.canceled-head h5 {
  margin: 0;
  font-size: 0.92rem;
}

.canceled-head span {
  font-size: 0.8rem;
  color: #8b7150;
}

.canceled-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.canceled-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(231, 224, 209, 0.6);
  color: #6f5d40;
}

.canceled-item strong {
  text-decoration: line-through;
}

.canceled-item p {
  margin: 4px 0 0;
  font-size: 0.82rem;
}

.btn-restore {
  font: inherit;
  cursor: pointer;
  border-radius: 999px;
  border: 1px solid rgba(79, 57, 32, 0.25);
  background: #fffaf0;
  color: #5d4322;
  padding: 7px 14px;
  font-size: 0.82rem;
  white-space: nowrap;
}

@media (max-width: 760px) {
  .board-head {
    flex-direction: column;
  }

  .board-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
