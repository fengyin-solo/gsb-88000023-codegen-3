<script setup>
import PanelSection from '../components/common/PanelSection.vue'
import TaskTable from '../components/restoration/TaskTable.vue'
import ProcessFlowBoard from '../components/schedule/ProcessFlowBoard.vue'
import { restorationTasks } from '../data/restorationData'
</script>

<template>
  <div class="view-stack">
    <PanelSection title="当日工序编排" badge="流程板">
      <ProcessFlowBoard />
    </PanelSection>

    <PanelSection title="任务清单" badge="按风险排序">
      <TaskTable :rows="restorationTasks" />
    </PanelSection>
  </div>
</template>

<style scoped>
.view-stack {
  display: grid;
  gap: 24px;
}
</style>
