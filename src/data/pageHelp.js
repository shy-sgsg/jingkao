export const PAGE_HELP = Object.freeze({
  overview: { text: '先看今天的复习计划和最近一次真实模考离目标分的差距，再用行动卡完善个人条件、记录模考或浏览昌平历史职位。完成度和分数只会随真实记录更新。', actionPage: 'plan', actionLabel: '打开今日计划' },
  guide: { text: '从你想解决的问题出发，选择对应页面；每张卡片都能直接跳转。', actionPage: 'overview', actionLabel: '回到备考总览' },
  plan: { text: '“调整计划”修改某天的日期、阶段、任务和目标题量；“记录”只填写实际完成情况，两类数据分别保存在本机。', actionPage: 'mocks', actionLabel: '记录一次模考' },
  aptitude: { text: '更新各模块已做题量和正确率；记录较少时把它当作个人复盘线索。', actionPage: 'mocks', actionLabel: '查看模考复盘' },
  essay: { text: '记录训练次数、自评和关键词覆盖；自评用于纵向复盘，不等同于官方评分。', actionPage: 'mocks', actionLabel: '查看模考复盘' },
  mocks: { text: '录入真实完成的行测与申论成绩；空白不代表 0，样本不足时不会给出稳定性判断。', actionPage: 'profile', actionLabel: '完善个人条件' },
  positions: { text: '按年度和单位类型筛选，点击职位名称查看条件摘要与来源；当前条目可能不是年度全量。', actionPage: 'sources', actionLabel: '查看来源与覆盖说明' },
  compare: { text: '先从职位库加入最多 5 个岗位，再并排核对条件、记录状态和来源。', actionPage: 'positions', actionLabel: '回到职位库' },
  assistant: { text: '先完善个人条件，再按“明确可报 / 有条件待核 / 信息不足 / 明确不可报”筛选；未核对官方原表前不会确认可报。', actionPage: 'profile', actionLabel: '补充个人条件' },
  scenarios: { text: '将目标分与当前可追溯的历史分数样本对照；样本覆盖不是进面或录取概率。', actionPage: 'sources', actionLabel: '核对分数来源' },
  matrix: { text: '按区直、街道和镇查看已收录记录；没有资料的类别不会被补成 0 或推断。', actionPage: 'positions', actionLabel: '查看职位明细' },
  profile: { text: '只填你确认的信息；资料保存在本机浏览器，清理浏览器数据前请先自行备份。', actionPage: 'assistant', actionLabel: '查看资格核验' },
  research: { text: '按主题筛选当前数据支持的结论；展开“证据与限制”回看来源，不把部分样本解释成全量或概率。', actionPage: 'evidence', actionLabel: '查看覆盖与核验' },
  evidence: { text: '先看年度覆盖，再看下方岗位级资格审查快照的职位代码与时点；区级汇总不下放到岗位，同一职位多时点不累加。这里的通过人数是第三方记录，不等于最终报名、缴费或实考。', actionPage: 'sources', actionLabel: '打开原始来源' },
  sources: { text: '按来源等级和年份查原始链接、统计口径与限制；遇到冲突时不要把不同口径直接合并。', actionPage: 'positions', actionLabel: '查看职位记录' },
  settings: { text: '调整全站字号、动效强度和页面密度；选择会即时生效，并保存在此浏览器。', actionPage: 'overview', actionLabel: '回到备考总览' },
});

const GUIDE_QUESTIONS = Object.freeze({
  overview: '我今天先学什么，离目标分还有多远？',
  plan: '我今天该学什么、完成多少？',
  aptitude: '我哪个行测模块最需要补？',
  essay: '申论哪些题型还没练够？',
  mocks: '最近成绩有没有提升？主要丢分在哪里？',
  positions: '过去几年昌平到底招了哪些岗位？',
  compare: '几个岗位的条件和证据差在哪？',
  assistant: '我能不能报？哪些条件还要核？',
  scenarios: '目标分能覆盖多少条历史进面线？',
  matrix: '区直、街道、镇的记录分别有哪些？',
  profile: '系统需要哪些个人报考条件？',
  settings: '如何调整字号、动效和页面密度？',
  research: '目前有哪些结论有数据支撑？',
  evidence: '当前数据覆盖到哪一步、冲突在哪里？',
  sources: '这些数据从哪里来，口径是什么？',
});

export function buildGuideGroups(navGroups, pageMeta) {
  return (Array.isArray(navGroups) ? navGroups : [])
    .map((group) => ({
      label: group.label,
      pages: (Array.isArray(group.items) ? group.items : [])
        .filter(([id]) => id !== 'guide')
        .map(([id, label]) => {
          const [title, subtitle] = pageMeta[id] || [label, ''];
          return {
            id,
            label,
            title,
            subtitle,
            question: GUIDE_QUESTIONS[id] || `如何使用${title}？`,
            href: `#/${id}`,
          };
        }),
    }))
    .filter((group) => group.pages.length > 0);
}

export function getPageHelp(page) {
  return PAGE_HELP[page] || PAGE_HELP.overview;
}
