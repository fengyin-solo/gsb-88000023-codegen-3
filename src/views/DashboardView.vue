<script setup>
import PanelSection from '../components/common/PanelSection.vue'
import StatCard from '../components/common/StatCard.vue'
import BatchGrid from '../components/restoration/BatchGrid.vue'
import EnvironmentCards from '../components/restoration/EnvironmentCards.vue'
import HeroBanner from '../components/restoration/HeroBanner.vue'
import ScheduleOverview from '../components/restoration/ScheduleOverview.vue'
import {
  restorationBatches,
  restorationEnvironment,
  restorationHero,
  restorationSteps,
} from '../data/restorationData'
import { useRestorationOverview } from '../composables/useRestorationOverview'

const { batchCount, environmentCount, highRiskCount, ownerCount } =
  useRestorationOverview()

const statCards = [
  { label: '在册批次', value: batchCount.value },
  { label: '高风险任务', value: highRiskCount.value },
  { label: '环境指标', value: environmentCount.value },
  { label: '参与修复师', value: ownerCount.value },
]
</script>

<template>
  <div class="view-stack">
    <HeroBanner :hero="restorationHero" />

    <section class="stats-grid">
      <StatCard
        v-for="card in statCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
      />
    </section>

    <PanelSection title="当日进度" badge="流程板联动">
      <ScheduleOverview />
    </PanelSection>

    <section class="two-column">
      <PanelSection title="重点批次" badge="优先处理">
        <BatchGrid :items="restorationBatches" />
      </PanelSection>

      <PanelSection title="标准工序四步" badge="内容固定不可改写">
        <ol class="step-list">
          <li v-for="step in restorationSteps" :key="step">{{ step }}</li>
        </ol>
        <p class="step-lock-note">
          四步内容为修复规范，流程板只安排顺序、时长、责任人与修复室，不改写内容。
        </p>
      </PanelSection>
    </section>

    <PanelSection title="环境参数" badge="修复室 2">
      <EnvironmentCards :items="restorationEnvironment" />
    </PanelSection>
  </div>
</template>

<style scoped>
.view-stack {
  display: grid;
  gap: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.two-column {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 24px;
}

.step-list {
  margin: 0;
  padding-left: 20px;
  color: #5c4a33;
}

.step-list li + li {
  margin-top: 12px;
}

.step-lock-note {
  margin: 14px 0 0;
  padding-top: 12px;
  border-top: 1px dashed rgba(79, 57, 32, 0.18);
  font-size: 0.78rem;
  color: #8b7150;
}

@media (max-width: 980px) {
  .stats-grid,
  .two-column {
    grid-template-columns: 1fr;
  }
}
</style>
