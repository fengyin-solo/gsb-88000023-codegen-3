export const restorationNavigation = [
  { label: '修复总览', to: '/' },
  { label: '批次档案', to: '/batches' },
  { label: '任务清单', to: '/tasks' },
]

export const restorationHero = {
  title: '古籍虫蛀修复批次板',
  description:
    '聚焦修复批次、控湿参数和文献归档风险，适合作为修复工作室内部业务系统的前端原型。',
  backlogLabel: '待处理批次',
  backlogValue: '12 册',
  note: '高湿季节前优先清理虫道扩散页。',
}

export const restorationBatches = [
  {
    code: 'A-03',
    title: '明抄本县志残卷',
    pages: '17-29',
    risk: 'high',
    status: '补纸前',
    note: '虫道集中在装订线外沿。',
  },
  {
    code: 'B-11',
    title: '碑帖拓片册页',
    pages: '5-14',
    risk: 'medium',
    status: '控湿中',
    note: '需先降湿 48 小时，再进入纤维加固。',
  },
  {
    code: 'C-02',
    title: '戏曲抄本散页',
    pages: '1-9',
    risk: 'low',
    status: '归档前',
    note: '边角缺损明显，建议先做透明托裱。',
  },
]

export const restorationEnvironment = [
  {
    label: '相对湿度',
    value: '52%',
    note: '控制线 50% - 55%',
  },
  {
    label: '纸浆补配',
    value: '2 批',
    note: '桑皮纤维待过滤',
  },
  {
    label: '紫外检查',
    value: '4 页',
    note: '夜间统一复核霉斑残留',
  },
]

export const restorationSteps = [
  '拍照建档并标注虫蛀起止页。',
  '低压吸附除尘，保留边角碎纤维。',
  '喷雾回软后局部补纸，不做整页过度清洗。',
  '平整定型 8 小时后转入无酸盒暂存。',
]

// 当日工序流程板使用的工序目录。
// 注意：detail 与 restorationSteps 的四步标准内容保持一致，只允许新增
// id / shortName 等编排元数据，不允许改写原有四步内容本身。
export const restorationProcessSteps = [
  {
    id: 'document',
    shortName: '拍照建档',
    detail: restorationSteps[0],
  },
  {
    id: 'dusting',
    shortName: '吸附除尘',
    detail: restorationSteps[1],
  },
  {
    id: 'patching',
    shortName: '回软补纸',
    detail: restorationSteps[2],
  },
  {
    id: 'flattening',
    shortName: '平整定型',
    detail: restorationSteps[3],
  },
]

// 可编排当日工序的修复师（仅用于排班下拉，不改动任务清单里的负责人）。
export const restorationStaff = [
  { id: 'han-che', name: '韩澈' },
  { id: 'lu-ning', name: '陆宁' },
  { id: 'zhou-tian', name: '周恬' },
  { id: 'shen-yi', name: '沈屹' },
]

// 修复室资源，同一修复室同一时段只能容纳一支工序。
export const restorationRooms = [
  { id: 'photo', name: '影像建档室' },
  { id: 'dry', name: '干除尘室' },
  { id: 'wet', name: '湿处理修复室' },
  { id: 'press', name: '压平定型室' },
]

// 当日工作时间基准：最早 09:00 开工，用于推算各工序时段。
export const workdayStartMinutes = 9 * 60

// 常用时长预设（分钟），修复师仍可自行输入。
export const durationPresets = [40, 60, 90, 120]

export const restorationTasks = [
  {
    title: '明抄本县志残卷',
    stage: '补纸前',
    risk: 'high',
    owner: '韩澈',
    note: '虫道贯穿标题栏，需先固色。',
  },
  {
    title: '碑帖拓片册页',
    stage: '控湿中',
    risk: 'medium',
    owner: '陆宁',
    note: '边缘卷曲，可延后压平。',
  },
  {
    title: '戏曲抄本散页',
    stage: '归档前',
    risk: 'low',
    owner: '周恬',
    note: '等待封套尺寸确认。',
  },
]
