<script setup>
import { useDaySchedule } from '../../composables/useDaySchedule'

const { overview, todayLabel } = useDaySchedule()
</script>

<template>
  <div class="day-overview">
    <header class="overview-head">
      <div>
        <p class="overview-date">{{ todayLabel() }}</p>
        <h4>当天进度总览</h4>
      </div>
      <RouterLink to="/tasks" class="overview-link">前往流程板编排 →</RouterLink>
    </header>

    <!-- 明确空态：当天尚无任何已编排工序 -->
    <div v-if="!overview.hasPlan" class="overview-empty">
      <strong>今日尚无工序编排数据</strong>
      <p>四步标准工序均未安排顺序、时长与责任人，请到任务清单完成当日编排。</p>
      <RouterLink to="/tasks" class="overview-cta">开始编排</RouterLink>
    </div>

    <div v-else class="overview-body">
      <div class="overview-metrics">
        <div class="metric">
          <span>已排工序</span>
          <strong>{{ overview.configuredCount }} / {{ overview.activeCount }}</strong>
        </div>
        <div class="metric">
          <span>已完成</span>
          <strong>{{ overview.doneCount }}</strong>
        </div>
        <div class="metric">
          <span>进行中</span>
          <strong>{{ overview.progressCount }}</strong>
        </div>
        <div class="metric">
          <span>总工时</span>
          <strong>{{ overview.totalMinutesLabel }}</strong>
        </div>
        <div class="metric">
          <span>作业时段</span>
          <strong>{{ overview.dayWindow }}</strong>
        </div>
      </div>

      <div class="progress-block">
        <div class="progress-meta">
          <span>当日完成度</span>
          <strong>{{ overview.percent }}%</strong>
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: overview.percent + '%' }"></div>
        </div>
      </div>

      <p v-if="overview.conflictCount" class="overview-alert">
        ⚠ 有 {{ overview.conflictCount }} 处责任人 / 修复室冲突待确认前处理。
      </p>
    </div>
  </div>
</template>

<style scoped>
.day-overview {
  display: grid;
  gap: 16px;
}

.overview-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
}

.overview-date {
  margin: 0;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #8b7150;
}

.overview-head h4 {
  margin: 6px 0 0;
  font-size: 1.12rem;
}

.overview-link {
  font-size: 0.86rem;
  color: #5d4322;
  text-decoration: none;
  border-bottom: 1px solid rgba(93, 67, 34, 0.4);
}

.overview-empty {
  text-align: center;
  padding: 26px 18px;
  border: 1px dashed rgba(79, 57, 32, 0.28);
  border-radius: 18px;
  background: rgba(250, 244, 232, 0.7);
}

.overview-empty strong {
  color: #7e6038;
}

.overview-empty p {
  margin: 8px auto 14px;
  max-width: 420px;
  font-size: 0.88rem;
  color: #8b7150;
}

.overview-cta {
  display: inline-block;
  padding: 9px 20px;
  border-radius: 999px;
  background: #5d4322;
  color: #fff8eb;
  text-decoration: none;
  font-size: 0.88rem;
}

.overview-metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.metric {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(239, 226, 202, 0.5);
}

.metric span {
  display: block;
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #8b7150;
}

.metric strong {
  display: block;
  margin-top: 6px;
  font-size: 1.08rem;
}

.progress-block {
  display: grid;
  gap: 8px;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.86rem;
  color: #6a5439;
}

.progress-track {
  height: 12px;
  border-radius: 999px;
  background: rgba(160, 120, 74, 0.16);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #8a6a3d, #5f8b5f);
  transition: width 0.3s ease;
}

.overview-alert {
  margin: 0;
  padding: 10px 14px;
  border-radius: 12px;
  background: #fbeee9;
  color: #913d2f;
  font-size: 0.84rem;
}

@media (max-width: 980px) {
  .overview-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
