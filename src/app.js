import { normalizeDataset } from './data/normalize.js';
import { buildScoreEcdf, buildSevenDayRecommendations, calculateDayCompletion, calculateSafeMargin, evaluateEligibility, evaluateWorkPreferences, getScoreSampleForYear, scoreAgainstSample, scoreDifficulty, scoreFit, summarizeMockScores } from './data/decision.js';
import { advanceOnboarding, shouldShowOnboarding } from './data/onboarding.js';
import { buildGuideGroups, getPageHelp } from './data/pageHelp.js';
import { createEncryptedUserBackup, parseEncryptedUserBackup, parseUserBackup } from './data/backup.js';
import { createStoredAccount, listEncryptedAccounts, migrateLegacyAccount, openStoredAccount, saveStoredAccount, unlockEncryptedAccount } from './data/encryptedStore.js';
import { getCoverageSpotlight, getPositionDataCompleteness, summarizePositionCoverage } from './data/coverage.js';
import { buildResearchFindings, summarizeAnnualConflicts } from './data/findings.js';
import { readDisplayDensity } from './data/displayDensity.js';
import { classifyPublicManagementMatch, filterAndSortPositions, filterScoreRowsBySegment, getPositionEvidenceGrade, getPositionFilterValue, paginateItems, summarizePublicManagementPositions } from './data/positions.js';
import { runViewTransition } from './ui/viewTransition.js';
import { observePageSections } from './ui/scrollReveal.js';
import { renderEligibilityChecks } from './ui/eligibility.js';
import { renderScoreBreakdown } from './ui/scoreBreakdown.js';

const DATA_URL = './public/data.json';
const STORAGE_KEY = 'changping-jingkao-dashboard:v1';
const ACCOUNT_DENSITY_KEY = 'changping-jingkao:display-density';
const root = document.querySelector('#root');
const modalRoot = document.querySelector('#modal-root');
const toastRoot = document.querySelector('#toast');
let displayDensity = 'comfortable';
document.documentElement.dataset.density = displayDensity;
document.documentElement.classList.toggle('has-view-transition-api', typeof document.startViewTransition === 'function');
const icons = {
  overview: '◫', guide: '✦', plan: '▦', aptitude: '⌁', essay: '✎', mocks: '⌂', positions: '▤', compare: '⇄', assistant: '✧', scenarios: '◉', matrix: '▦', profile: '♙', research: '✧', evidence: '⌁', sources: 'ⓘ', settings: '⚙',
};
const pageMeta = {
  overview: ['备考总览', '查看今天的复习任务、目标分差和昌平选岗证据。'],
  guide: ['使用指南', '从你要解决的问题出发，找到对应页面和下一步操作。'],
  plan: ['50 天复习计划', '按需调整每日安排，并单独记录实际题量、用时和状态。'],
  aptitude: ['行测能力', '官方大纲六个一级模块；科学推理作为判断推理中的专项单独追踪。'],
  essay: ['申论训练', '按训练任务记录练习次数、关键词覆盖和自评；自评不是客观测量。'],
  mocks: ['模考复盘', '只画实际填写的成绩。空白模考不会被显示成 0 分。'],
  positions: ['昌平职位库', '当前仅展示有来源的候选样例，不是昌平区全量职位表。'],
  compare: ['岗位比较', '并排核对已收录条件和证据缺口；最多收藏比较 5 个岗位。'],
  assistant: ['选岗助手', '先做条件完整度检查；资料或岗位条件不全时明确停在“待核验”。'],
  scenarios: ['分数情景', '将目标分与已收录的历史样本范围对照，不输出进面或录取概率。'],
  matrix: ['昌平竞争矩阵', '分区直、街道、镇查看有来源的记录；样例数量不等于年度总量。'],
  profile: ['个人报考资料', '在本机填写。专业预置为公共管理；其他信息不会由系统推断。'],
  research: ['研究结论', '把当前可支持的结论、证据与限制集中查看。'],
  evidence: ['数据覆盖与核验', '查看年度职位样例覆盖、来源差异与数据边界。'],
  sources: ['数据与来源', '查看原始链接、来源层级、统计口径与当前数据缺口。'],
  settings: ['设置与显示', '调整字号、动效层级和页面密度；偏好保存在此浏览器。'],
};
const navGroups = [
  { label: '工作台', items: [['overview', '备考总览'], ['guide', '使用指南'], ['plan', '50 天计划']] },
  { label: '备考复盘', items: [['aptitude', '行测能力'], ['essay', '申论训练'], ['mocks', '模考记录']] },
  { label: '职位决策', items: [['positions', '昌平职位库'], ['compare', '岗位比较'], ['assistant', '选岗助手'], ['scenarios', '分数情景'], ['matrix', '竞争矩阵']] },
  { label: '个人与数据', items: [['profile', '个人资料'], ['research', '研究结论'], ['evidence', '数据覆盖'], ['sources', '数据与来源'], ['settings', '设置与显示']] },
];
const mockModules = [
  ['dataAnalysis', '资料分析'], ['reasoning', '判断推理'], ['science', '科学推理'],
  ['quantitative', '数量关系'], ['verbal', '言语理解'], ['politicalAndGeneral', '政治理论 + 常识'],
];

let dataset;
let page = location.hash.replace(/^#\/?/, '') || 'overview';
let pageTransition = true;
let resultTransition = false;
let filters = {
  year: 'all', orgType: 'all', jobType: 'all', majorTopic: 'all', query: '', sourceLevel: 'all',
  unit: 'all', education: 'all', politicalStatus: 'all', freshGraduate: 'all',
  physicalTest: 'all', professionalTest: 'all', recruitmentGroup: 'all',
};
let jobSort = 'year-desc';
let jobPage = 1;
let scenarioScore = 138;
let scenarioYear = '2026';
let scenarioScope = 'all';
let evidenceYear = 'all';
let researchTopic = 'all';
let assistantFilter = 'all';
let assistantFilterChanged = false;
let pageRevealObserver = null;
let selectedDay = null;
let storageUnavailable = false;
let pendingBackup = null;
let pendingEncryptedBackup = null;
let accountSession = null;
let storage = emptyStorage();

function applyDisplaySettings() {
  document.documentElement.dataset.density = storage.settings.density;
  document.documentElement.dataset.fontSize = storage.settings.fontSize;
  document.documentElement.dataset.motion = storage.settings.motion;
}

applyDisplaySettings();

function emptyStorage() {
  return {
    profile: { major: '公共管理' }, dayLogs: {}, planOverrides: {}, aptitudeLogs: {}, essayLogs: {},
    mocks: [], favorites: [], compared: [],
    settings: { density: 'comfortable', fontSize: 'standard', motion: 'enhanced' },
    onboarding: { step: 0, hidden: false, completed: false },
  };
}

function readStorage(source = {}, densityFallback = 'comfortable') {
  try {
    const parsed = typeof source === 'string' ? JSON.parse(source) : source;
    const settings = parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {};
    return {
      profile: { major: '公共管理', ...(parsed.profile || {}) },
      dayLogs: parsed.dayLogs || {},
      planOverrides: parsed.planOverrides || {},
      aptitudeLogs: parsed.aptitudeLogs || {},
      essayLogs: parsed.essayLogs || {},
      mocks: Array.isArray(parsed.mocks) ? parsed.mocks : [],
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      compared: Array.isArray(parsed.compared) ? parsed.compared.slice(0, 5) : [],
      settings: {
        density: settings.density === 'compact' ? 'compact' : settings.density === 'comfortable' ? 'comfortable' : densityFallback,
        fontSize: ['small', 'standard', 'large'].includes(settings.fontSize) ? settings.fontSize : 'standard',
        motion: settings.motion === 'immersive' ? 'immersive' : 'enhanced',
      },
      onboarding: parsed.onboarding && typeof parsed.onboarding === 'object'
        ? { step: Number.isInteger(parsed.onboarding.step) ? parsed.onboarding.step : 0, hidden: parsed.onboarding.hidden === true, completed: parsed.onboarding.completed === true }
        : { step: 0, hidden: false, completed: false },
    };
  } catch {
    return emptyStorage();
  }
}

async function persist() {
  if (!accountSession) return false;
  try {
    await saveStoredAccount({ session: accountSession, state: storage, storage: localStorage });
    storageUnavailable = false;
    return true;
  } catch (error) {
    storageUnavailable = true;
    notify(`加密保存失败：${error.message}。本次更改尚未写入本地档案。`);
    return false;
  }
}

function renderAccountGate({ accounts = [], hasLegacy = false, error = '' } = {}) {
  const unlockCards = accounts.map((account) => `<form class="account-unlock-card" data-account-id="${escapeHtml(account.id)}"><div><span class="account-slot-mark">${String(account.slot).padStart(2, '0')}</span><strong>本地档案 ${account.slot}</strong></div><label class="form-field"><span>档案密码</span><input name="password" type="password" autocomplete="current-password" required/></label><button type="submit" class="button button-primary">解锁</button></form>`).join('');
  const accountForm = (id, action, heading, submitLabel, autocomplete = 'new-password') => `<form id="${id}" class="account-create-form"><h2>${heading}</h2><label class="form-field"><span>档案名称</span><input name="name" maxlength="60" value="我的备考档案" required autocomplete="off"/></label><label class="form-field"><span>设置密码</span><input name="password" type="password" minlength="12" autocomplete="${autocomplete}" required/><small>建议使用便于记忆的长口令；遗失后无法找回。</small></label><label class="form-field"><span>再次输入密码</span><input name="confirmPassword" type="password" minlength="12" autocomplete="${autocomplete}" required/></label><button type="submit" class="button button-primary">${submitLabel}</button></form>`;
  let accessPanel;
  if (hasLegacy) {
    accessPanel = `<section class="account-panel account-migration-panel"><div class="account-panel-heading"><span>发现旧版本地记录</span><h2>为已有备考数据设置密码</h2><p>记录目前仍是旧版明文格式。输入档案名称和新密码后，网站会先加密并回读校验；校验通过后才移除旧记录。</p></div>${accountForm('account-migration-form', 'migrate', '迁移并加密旧记录', '加密并进入工作台')}</section>${unlockCards ? `<section class="account-panel"><h2>或解锁已有档案</h2><div class="account-unlock-list">${unlockCards}</div></section>` : ''}`;
  } else if (accounts.length) {
    accessPanel = `<section class="account-panel"><div class="account-panel-heading"><span>此浏览器中的加密档案</span><h2>解锁后继续</h2><p>档案只在此浏览器保存。网站没有账户服务器，也不会上传个人数据。</p></div><div class="account-unlock-list">${unlockCards}</div></section><details class="account-panel account-create-details"><summary>＋ 创建另一份独立档案</summary>${accountForm('account-create-form', 'create', '新建加密档案', '创建并进入工作台')}</details>`;
  } else {
    accessPanel = `<section class="account-panel account-first-create">${accountForm('account-create-form', 'create', '创建本地档案', '创建并进入工作台')}</section>`;
  }
  root.innerHTML = `<main class="account-gate"><section class="account-gate-card"><div class="account-gate-brand"><span>京</span><div><strong>京考备考台</strong><small>CHANGPING · LOCAL ONLY</small></div></div><div class="account-gate-copy"><div class="eyebrow muted">PRIVATE STUDY SPACE</div><h1>${hasLegacy ? '先加密已有记录，再继续备考' : accounts.length ? '欢迎回来' : '把备考记录安全留在本机'}</h1><p>每个本地档案使用独立密码加密。解锁前不会载入个人计划、资料或成绩。</p></div>${error ? `<div class="account-gate-error" role="alert">${escapeHtml(error)}</div>` : ''}${accessPanel}<div class="account-gate-footnote"><span>▣</span><p><strong>只保存在当前浏览器</strong><br/>不注册、不上传、不跨设备同步。清理浏览器数据会删除档案；忘记密码后无法恢复。</p></div></section></main>`;
  document.title = '本地档案 · 京考备考台';
}

function showAccountGate(error = '') {
  try {
    renderAccountGate({
      accounts: listEncryptedAccounts(localStorage),
      hasLegacy: localStorage.getItem(STORAGE_KEY) !== null,
      error,
    });
  } catch (cause) {
    renderAccountGate({ error: error || cause.message });
  }
}

function activateAccount(session, accountState, message = '') {
  accountSession = session;
  storage = readStorage(accountState);
  displayDensity = storage.settings.density;
  storageUnavailable = false;
  applyDisplaySettings();
  modalRoot.innerHTML = '';
  render();
  if (shouldShowOnboarding(storage.onboarding)) renderOnboarding();
  if (message) notify(message);
}

function lockAccount() {
  accountSession = null;
  storage = emptyStorage();
  displayDensity = 'comfortable';
  pendingBackup = null;
  pendingEncryptedBackup = null;
  pageRevealObserver?.disconnect();
  modalRoot.innerHTML = '';
  applyDisplaySettings();
  showAccountGate();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '#';
  } catch {
    return '#';
  }
}

function fmt(value, digits = 0) {
  return Number.isFinite(value) ? Number(value).toFixed(digits).replace(/\.0$/, '') : '—';
}

function fmtPct(value) {
  return Number.isFinite(value) ? `${Math.round(value * 100)}%` : '待记录';
}

function fmtDate(value) {
  if (!value) return '日期待定';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' }).format(date);
}

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getDay(day) {
  return { ...day, ...(storage.planOverrides[day.day] || {}), ...(storage.dayLogs[day.day] || {}) };
}

function getDays() {
  return dataset.studyPlan.map(getDay);
}

function getPlannedTotals(days = getDays()) {
  return days.reduce((totals, day) => ({
    questions: totals.questions + (Number(day.plannedQuestions) || 0),
    hours: totals.hours + (Number(day.plannedHours) || 0),
  }), { questions: 0, hours: 0 });
}

function getMocks() {
  return [
    ...dataset.mocks.filter((mock) => Number.isFinite(mock.total)),
    ...storage.mocks,
  ].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
}

function actualPlanCompletion() {
  const logged = getDays().map(calculateDayCompletion).filter(Number.isFinite);
  return logged.length ? logged.reduce((sum, value) => sum + value, 0) / logged.length : null;
}

function getTodayOrNextDay() {
  const days = getDays();
  const today = todayString();
  return days.find((day) => day.date === today) || days.find((day) => day.date >= today && day.status !== '已完成') || days[0];
}

function chip(text, tone = 'neutral') {
  return `<span class="chip chip-${tone}">${escapeHtml(text)}</span>`;
}

function button(text, action, className = 'button button-secondary', attrs = '') {
  return `<button type="button" class="${className}" data-action="${escapeHtml(action)}" ${attrs}>${text}</button>`;
}

function metric(label, value, note, icon, tone = 'blue') {
  return `<article class="metric-card metric-${tone}"><div class="metric-top"><span>${escapeHtml(label)}</span><span class="metric-icon">${icon}</span></div><div class="metric-value">${value}</div><div class="metric-note">${note}</div></article>`;
}

function renderSevenDayPanel(weekly) {
  const recommendations = weekly.recommendations.map((item, index) => `<article class="week-recommendation"><span class="week-rec-index">0${index + 1}</span><div><div class="week-rec-heading"><strong>${escapeHtml(item.area)}</strong>${chip(`依据${item.source}`, item.source === '模考' ? 'blue-soft' : 'green')}</div><p>${item.source === '模考' ? `最近 ${item.sampleCount} 次模考` : `已记录 ${item.sampleCount} 题专项`}正确率 ${fmtPct(item.observedAccuracy)}，低于目标 ${fmtPct(item.targetAccuracy)}。未来 7 天安排 ${item.sessions} 次重点练习，约 ${item.questionsPerSession} 题 / 次。</p></div></article>`).join('');
  const focusDays = weekly.days.map((day) => `<div class="week-day"><small>DAY ${String(day.day).padStart(2, '0')} · ${escapeHtml(fmtDate(day.date))}</small><strong>${escapeHtml(day.focus)}</strong></div>`).join('');
  const summary = recommendations
    ? `<div class="week-recommendations">${recommendations}</div>`
    : weekly.days.length
      ? `<div class="week-no-data"><strong>先按本阶段计划建立真实基线</strong><p>当前没有足够真实模块准确率可识别薄弱项。接下来优先：${weekly.days.slice(0, 2).map((day) => `Day ${day.day} ${escapeHtml(day.focus)}`).join('；')}。完成模考或专项记录后，建议会自动调整。</p></div>`
      : `<div class="week-no-data"><strong>未来 7 天没有未完成计划日</strong><p>本周建议暂不估算；可到复习计划页调整日期，或继续记录训练与模考。</p></div>`;
  return `<article class="panel readiness-panel weekly-panel"><div class="panel-heading"><div><div class="eyebrow muted">PERSONALIZED · LAST 7 DAYS OF PLAN</div><h2>未来7天复习建议</h2></div><div class="week-status">${weekly.phase ? chip(weekly.phase.replace(/^阶段\d+：/, ''), 'blue-soft') : chip('暂无计划', 'neutral')}<span>余 ${fmt(weekly.plannedQuestions)} 题</span></div></div>${summary}${focusDays ? `<div class="week-day-strip" aria-label="未来七天计划焦点">${focusDays}</div>` : ''}<a class="task-open" href="#/plan">打开 50 天计划 <span>↗</span></a></article>`;
}

function sourceFor(sourceId) {
  return dataset.sources.find((source) => source.sourceId === sourceId);
}

function sourceLink(sourceId, label = '查看来源 ↗') {
  const source = sourceFor(sourceId);
  if (!source) return '';
  return `<a class="text-link" href="${escapeHtml(safeUrl(source.url))}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}

function sourceLevelLabel(level) {
  return level === 'official' ? '官方来源' : level === 'secondary' ? '第三方来源' : '估算';
}

function positionEvidenceMarkup(position) {
  const grade = getPositionEvidenceGrade(position, dataset.sources);
  const details = {
    A: ['A · 官方来源', 'green', '职位记录关联官方直接来源'],
    B: ['B · 多家第三方', 'blue', '至少两家不同来源发布方能核对该记录'],
    C: ['C · 单一第三方', '该记录目前仅见一家第三方发布方'],
    D: ['D · 未核实', '没有可追溯的职位来源登记'],
  }[grade];
  return `<span class="chip chip-${details[1]}" title="${escapeHtml(details[2])}" aria-label="${escapeHtml(details[0])}：${escapeHtml(details[2])}">${escapeHtml(details[0])}</span>`;
}

function positionCompletenessMarkup(position) {
  const completeness = getPositionDataCompleteness(position, dataset);
  const tone = { 完整: 'green', 较完整: 'blue', 部分: 'amber', 严重缺失: 'red' }[completeness.grade];
  const missing = completeness.missingSections.length
    ? `缺少：${completeness.missingSections.join('、')}`
    : '八类信息均有可追溯记录';
  const description = `已收录 ${completeness.availableSections}/${completeness.totalSections} 类；${missing}`;
  return `<span class="chip chip-${tone}" data-completeness-grade="${escapeHtml(completeness.grade)}" title="${escapeHtml(description)}" aria-label="数据完整度：${escapeHtml(completeness.grade)}；${escapeHtml(description)}">数据${escapeHtml(completeness.grade)}</span>`;
}

function statusTone(status) {
  if (/明确不可报|不符合|缺失|冲突/.test(status)) return 'red';
  if (/待|不足|候选/.test(status)) return 'amber';
  if (/明确可报|符合|已完成|官方/.test(status)) return 'green';
  return 'neutral';
}

function majorCriteriaSummary(position) {
  const criteria = position?.majorCriteria;
  if (!criteria || typeof criteria !== 'object') return '';
  return [['undergraduate', '本科'], ['graduate', '研究生']]
    .filter(([level]) => Array.isArray(criteria[level]) && criteria[level].length)
    .map(([level, label]) => `${label} ${criteria[level].join(' / ')}`)
    .join('；');
}

function majorEligibilityText(position, profile, eligibility) {
  const criteria = majorCriteriaSummary(position);
  const check = eligibility?.majorCheck;
  if (!criteria || !check) return '职位专业代码范围尚未结构化，需人工核验。';
  const level = check.level === 'undergraduate' ? '本科' : '研究生';
  if (check.status === 'match') {
    return `你的${level}代码 ${check.code} 与当前收录范围相符；该岗位来自第三方摘要，仍须核对官方职位表。`;
  }
  if (check.status === 'mismatch') {
    return `你的${level}代码 ${check.code} 不在当前收录范围（${criteria}）；该范围来自第三方摘要，须以官方职位表复核。`;
  }
  if (check.status === 'missing') {
    return `请补充学历层次与专业代码；当前收录范围：${criteria}。系统不会从“${profile?.major || '专业名称'}”自动推断代码。`;
  }
  return `当前收录范围为 ${criteria}，没有覆盖你填写的学历层次，需人工核验。`;
}

function educationEligibilityText(position, profile, eligibility) {
  const check = eligibility?.educationCheck;
  if (!position?.education || !check) return '职位未提供可结构化的学历条件，需人工核验。';
  if (check.status === 'match') return `当前收录要求“${position.education}”，与你填写的${profile?.degree || '学历'}相符；其他资格仍待核。`;
  if (check.status === 'mismatch' && position.sourceLevel !== 'official') return `你的学历与当前收录要求“${position.education}”不一致；来源非官方，需人工复核。`;
  if (check.status === 'mismatch') return `官方来源列出的学历要求为“${position.education}”，与你填写的${profile?.degree || '学历'}不一致。`;
  if (check.status === 'missing') return `职位要求“${position.education}”；请先补充最高学历层次。`;
  return `职位学历条件“${position.education}”暂无法自动解析，需人工核验。`;
}

function chartSvg(mocks) {
  if (!mocks.length) return `<div class="chart-empty"><span class="empty-chart-icon">⌁</span><strong>还没有可画的分数记录</strong><span>完成一次真实模考后，这里才开始出现趋势。空白不代表 0 分。</span></div>`;
  if (mocks.length === 1) return `<div class="chart-empty chart-one"><span class="single-score">${fmt(mocks[0].total, 1)}</span><strong>${escapeHtml(mocks[0].date || '日期待定')} · 1 次记录</strong><span>再记录一套模考后即可查看趋势线。</span></div>`;
  const width = 680; const height = 230; const pad = 28;
  const values = mocks.map((mock) => mock.total);
  const low = Math.min(100, Math.floor((Math.min(...values) - 8) / 5) * 5);
  const high = Math.ceil((Math.max(...values) + 8) / 5) * 5;
  const span = Math.max(10, high - low);
  const points = mocks.map((mock, index) => {
    const x = pad + (index / (mocks.length - 1)) * (width - 2 * pad);
    const y = height - pad - ((mock.total - low) / span) * (height - 2 * pad);
    return `${x},${y}`;
  });
  const grid = [0, 1, 2, 3].map((line) => {
    const y = pad + line * ((height - 2 * pad) / 3);
    const value = high - line * (span / 3);
    return `<line x1="${pad}" y1="${y}" x2="${width - pad}" y2="${y}" class="chart-grid"/><text x="0" y="${y + 4}" class="chart-label">${Math.round(value)}</text>`;
  }).join('');
  const circles = points.map((point, index) => {
    const [cx, cy] = point.split(',');
    return `<circle cx="${cx}" cy="${cy}" r="5" class="chart-point" style="--point-index:${Math.min(index, 7)}"><title>${escapeHtml(mocks[index].date || '日期待定')} · ${fmt(mocks[index].total, 1)} 分</title></circle>`;
  }).join('');
  const last = mocks.at(-1);
  return `<div class="chart-wrap"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="模考总分趋势图">${grid}<polyline points="${points.join(' ')}" class="chart-line" pathLength="1"/>${circles}</svg><div class="chart-axis"><span>${escapeHtml(mocks[0].date || '日期待定')}</span><span>${escapeHtml(last.date || '日期待定')}</span></div></div>`;
}

function scoreEcdfSvg(scoreRows, year, targetScore) {
  const distribution = buildScoreEcdf(scoreRows, year);
  if (!distribution.count) {
    return `<div class="chart-empty"><span class="empty-chart-icon">⌁</span><strong>${year} 年暂无岗位级最低进面线样本</strong><span>取得可追溯的具体岗位记录后，这里才显示累计覆盖曲线。</span></div>`;
  }

  const width = 680; const height = 230; const left = 44; const right = 16; const top = 18; const bottom = 36;
  const x = (score) => left + ((Math.max(100, Math.min(150, score)) - 100) / 50) * (width - left - right);
  const y = (rate) => top + (1 - Math.max(0, Math.min(1, rate))) * (height - top - bottom);
  const yTicks = [0, .5, 1];
  const xTicks = [100, 110, 120, 130, 140, 150];
  const grid = [
    ...yTicks.map((rate) => `<line x1="${left}" y1="${y(rate)}" x2="${width - right}" y2="${y(rate)}" class="chart-grid"/><text x="0" y="${y(rate) + 4}" class="chart-label">${Math.round(rate * 100)}%</text>`),
    ...xTicks.map((score) => `<line x1="${x(score)}" y1="${top}" x2="${x(score)}" y2="${height - bottom}" class="chart-grid ecdf-vertical-grid"/><text x="${x(score)}" y="${height - 8}" class="chart-label" text-anchor="middle">${score}</text>`),
  ].join('');
  const steps = [`M ${x(100)} ${y(0)}`];
  for (const point of distribution.points) steps.push(`H ${x(point.score)} V ${y(point.coverageRate)}`);
  steps.push(`H ${x(150)}`);
  const result = scoreAgainstSample(targetScore, { year }, scoreRows);
  const targetX = x(targetScore);
  const targetY = y(result.coverageRate ?? 0);
  return `<div class="chart-wrap score-ecdf-wrap"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${year} 年岗位最低进面线经验累积分布；目标 ${targetScore} 分覆盖 ${result.coveredPositions} / ${result.totalPositions} 条">${grid}<path d="${steps.join(' ')}" class="chart-line" pathLength="1"/><line id="score-ecdf-target-line" x1="${targetX}" y1="${top}" x2="${targetX}" y2="${height - bottom}" class="ecdf-target-line"/><circle id="score-ecdf-target-point" cx="${targetX}" cy="${targetY}" r="5.5" class="chart-point" style="--point-index:3"><title>${targetScore} 分：覆盖 ${result.coveredPositions}/${result.totalPositions} 条历史岗位最低进面线</title></circle></svg><div class="score-ecdf-axis-title"><span>目标分不低于历史最低进面线的岗位比例</span><span>岗位最低进面线（分）</span></div></div>`;
}

function renderSidebar() {
  const nav = navGroups.map((group) => `<div class="nav-group"><div class="nav-heading">${escapeHtml(group.label)}</div>${group.items.map(([id, label]) => `<a href="#/${id}" class="nav-item ${page === id ? 'active' : ''}" ${page === id ? 'aria-current="page"' : ''}><span class="nav-icon">${icons[id]}</span><span>${escapeHtml(label)}</span>${id === 'positions' ? `<span class="nav-count">${dataset.positions.length}</span>` : ''}</a>`).join('')}</div>`).join('');
  return `<aside class="sidebar" id="sidebar"><a class="brand" href="#/overview"><span class="brand-mark">京</span><span><strong>京考备考台</strong><small>CHANGPING · 2027</small></span></a><div class="data-status"><span class="status-dot"></span><span>本地运行 · 数据基准 ${escapeHtml(dataset.dataAsOf)}</span></div><nav aria-label="主导航">${nav}</nav><div class="sidebar-bottom"><div class="sidebar-note"><span class="lock-icon">▣</span><div><strong>仅保存在本机</strong><small>个人记录不会上传</small></div></div><div class="sidebar-version">昌平区 · 个人工作台 <span>v1.0</span></div></div></aside>`;
}

function renderDensityControl() {
  const options = [['comfortable', '舒适'], ['compact', '紧凑']];
  return `<div class="density-control" role="group" aria-label="页面密度">${options.map(([value, label]) => `<button type="button" data-action="set-density" data-density="${value}" aria-pressed="${displayDensity === value}">${label}</button>`).join('')}</div>`;
}

function renderSettingOptions(setting, label, options) {
  return `<div class="setting-field setting-field-${setting}"><div class="setting-field-heading"><strong>${escapeHtml(label)}</strong><span>点击选项后立即生效</span></div><div class="setting-options" role="group" aria-label="${escapeHtml(label)}">${options.map(([value, title, description]) => `<button type="button" class="setting-option ${storage.settings[setting] === value ? 'selected' : ''}" data-action="set-display-setting" data-setting="${setting}" data-value="${value}" aria-pressed="${storage.settings[setting] === value}"><span class="setting-option-title">${escapeHtml(title)}</span><span class="setting-option-description">${escapeHtml(description)}</span><span class="setting-option-check" aria-hidden="true">${storage.settings[setting] === value ? '✓ 已选择' : '选择'}</span></button>`).join('')}</div></div>`;
}

function renderSettings() {
  return `<div class="page-body settings-page"><div class="page-heading-row"><div><div class="eyebrow muted">PERSONAL DISPLAY</div><h1>设置与显示</h1><p>按自己的阅读习惯调整全站字号、动效和页面密度，修改会立即应用。</p></div><a class="button button-secondary" href="#/overview">返回工作台</a></div><section class="panel settings-panel"><div class="settings-panel-heading"><span class="settings-heading-icon">✦</span><div><h2>阅读与动效偏好</h2><p>设置保存在本机浏览器，并会包含在个人数据备份中。</p></div></div>${renderSettingOptions('fontSize', '字号', [['small', '偏小', '更多内容同时显示'], ['standard', '标准', '保持当前默认字号'], ['large', '大号', '提高正文与界面文字大小']])}${renderSettingOptions('motion', '动效强度', [['enhanced', '增强', '清晰的页面切换、错峰入场与卡片反馈；遵循系统“减少动态效果”偏好'], ['immersive', '沉浸', '选择沉浸后覆盖系统的“减少动态效果”偏好；更明显的空间过渡、层次入场与悬浮反馈']])}${renderSettingOptions('density', '页面密度', [['comfortable', '舒适', '留白更多，适合连续阅读'], ['compact', '紧凑', '减少间距，一屏呈现更多内容']])}<div class="notice notice-soft settings-note"><span>▣</span><p>所有个人偏好仅保存在此浏览器，不会修改原始 Excel。</p></div></section></div>`;
}

function renderLayout() {
  const [title, subtitle] = pageMeta[page] || pageMeta.overview;
  return `${renderSidebar()}<div class="main-shell"><header class="topbar"><div class="topbar-left"><button class="mobile-menu" type="button" aria-label="打开导航" data-action="mobile-menu">☰</button><div><div class="breadcrumb">昌平区 <span>/</span> <strong>${escapeHtml(title)}</strong></div><p class="page-subtitle">${escapeHtml(subtitle)}</p></div></div><div class="topbar-right"><a class="button button-secondary guide-trigger" href="#/guide">使用指南</a>${renderDensityControl()}<span class="today-pill"><span class="today-dot"></span>${escapeHtml(fmtDate(todayString()))}</span><button class="button button-quiet account-lock-button" type="button" data-action="account-lock" aria-label="锁定当前档案并切换账户">锁定 · ${escapeHtml(accountSession.name)}</button></div></header><main id="page-content" tabindex="-1">${renderPage()}</main><footer class="page-footer"><span>资料更新至 ${escapeHtml(dataset.dataAsOf)} · 使用前请回看官方当年职位表</span><a href="#/sources">数据口径说明 →</a></footer></div><div class="sidebar-scrim" data-action="close-menu"></div>`;
}

function renderOverview() {
  const examStatusAsOf = sourceFor('beijing-index')?.accessedAt || '未核查';
  const days = getDays();
  const plannedTotals = getPlannedTotals(days);
  const done = days.filter((day) => day.status === '已完成').length;
  const progress = actualPlanCompletion();
  const mocks = getMocks();
  const latest = mocks.at(-1);
  const target = latest?.target || 138;
  const latestTargetDelta = latest ? Number(latest.total) - Number(target) : null;
  const latestTargetSummary = latest
    ? latestTargetDelta > 0 ? `超过 ${fmt(target)} 分目标 ${fmt(latestTargetDelta, 1)} 分`
      : latestTargetDelta < 0 ? `还差 ${fmt(-latestTargetDelta, 1)} 分达到 ${fmt(target)} 分目标`
        : `刚好达到 ${fmt(target)} 分目标`
    : `目标 ${fmt(target)} 分 · 只显示真实录入成绩`;
  const todayPlan = getTodayOrNextDay();
  const profileFields = ['undergraduateMajor', 'undergraduateMajorCode', 'graduateMajor', 'graduateMajorCode', 'degree', 'degreeType', 'graduationStatus', 'graduationYear', 'politicalStatus', 'hukou', 'studentOrigin', 'grassrootsYears', 'credentials', 'retiredStatus', 'grassrootsProjectStatus'];
  const completedProfileFields = profileFields.filter((key) => storage.profile[key] !== null
    && storage.profile[key] !== undefined && String(storage.profile[key]).trim() !== '').length;
  const scoreTargets = [135, 138, 140].map((targetScore, index) => {
    const difference = latest ? targetScore - latest.total : null;
    const status = difference === null ? '尚未记录'
      : difference > 0 ? `还差 ${fmt(difference, 1)} 分`
        : difference < 0 ? `高出 ${fmt(-difference, 1)} 分` : '刚好达到';
    const tone = difference === null ? 'pending' : difference > 0 ? 'behind' : 'reached';
    const note = latest ? `最近真实成绩 ${fmt(latest.total, 1)} 分` : '录入真实模考后显示分差';
    return `<article class="score-target-card score-target-${tone}" style="--target-index:${index}"><span>目标 ${targetScore} 分</span><strong>${status}</strong><small>${note}</small></article>`;
  }).join('');
  const aptitude = dataset.aptitude.map((item, index) => ({ ...item, ...(storage.aptitudeLogs[index] || {}) }));
  const weekly = buildSevenDayRecommendations({ days: getDays(), aptitude, mocks, today: todayString() });
  const dateNote = todayPlan?.date === todayString() ? '今天的任务' : `下一计划 · ${fmtDate(todayPlan?.date)}`;
  const qualified = dataset.observations.filter((item) => item.observationType === 'qualified_snapshot');
  const latestQualifiedByScope = new Map();
  for (const observation of qualified) {
    const key = observation.positionCode
      ? `position:${observation.year}:${observation.positionCode}`
      : `aggregate:${observation.sourceId}`;
    const current = latestQualifiedByScope.get(key);
    if (!current || String(observation.observedAt).localeCompare(String(current.observedAt)) > 0) {
      latestQualifiedByScope.set(key, observation);
    }
  }
  const snapshotCards = [...latestQualifiedByScope.values()].map((item, index) => {
    const position = item.positionCode
      ? dataset.positions.find((row) => Number(row.year) === Number(item.year) && row.code === item.positionCode)
      : null;
    const label = position
      ? `${position.code} · ${position.title}`
      : item.unit ? `${item.unit.replace(/^北京市昌平区/, '昌平区')} · 单位级汇总` : `${item.year} 年昌平区汇总`;
    const context = position ? position.unit : item.scope;
    return `<div class="snapshot-row" style="--snapshot-index:${index}"><span class="snapshot-year">${item.year}</span><div><strong>${escapeHtml(label)} · ${Number(item.applicantsQualified).toLocaleString('zh-CN')} 人资格审查通过</strong><small>${escapeHtml(context)} · ${escapeHtml(item.observedAt)} 快照 · 计划招录 ${fmt(item.recruitCount)} 人</small></div><span class="snapshot-ratio">${fmt(item.qualifiedCompetitionRatio, 2)}:1<small>按来源招录数计算</small></span></div>`;
  }).join('');
  const coverage = getCoverageSpotlight(dataset, 2026);
  const coverageNote = coverage.referencePositions !== null
    ? `${fmt(coverage.importedRecruits)} / ${fmt(coverage.referenceRecruits)} 人已收录 · 第三方汇总对照`
    : '年度职位总量暂无可靠参照';
  const coverageTile = `<a class="metric-card metric-purple coverage-spotlight" href="#/evidence" aria-label="查看 2026 年职位覆盖：已收录 ${coverage.importedPositions} 个职位，第三方汇总参照 ${fmt(coverage.referencePositions)} 个；已收录 ${fmt(coverage.importedRecruits)} 人，参照 ${fmt(coverage.referenceRecruits)} 人。覆盖尚未官方逐码核实。"><div class="metric-top"><span>2026 职位覆盖</span><span class="metric-icon">▤</span></div><div class="metric-value">${fmt(coverage.importedPositions)}<small> / ${fmt(coverage.referencePositions)} 个职位</small></div><div class="metric-note">${coverageNote}</div><div class="progress-track coverage-progress" aria-hidden="true"><span style="width:${Math.round((coverage.positionRatio ?? 0) * 100)}%"></span></div><div class="coverage-caveat">第三方参照 · 待官方逐码核实 <span>详情 ↗</span></div></a>`;
  return `<div class="page-body">
    <section class="welcome-banner"><div class="welcome-copy"><div class="eyebrow"><span class="eyebrow-dot"></span> PERSONALISED STUDY DESK <span class="eyebrow-date">数据基准 ${escapeHtml(dataset.dataAsOf)}</span></div><h1>把每一步，变成<br/><em>有依据的进步。</em></h1><p>今天先做好计划里的下一件事。分数趋势和岗位判断，等你的真实数据到位再说。</p><div class="welcome-actions"><a class="button button-light" href="#/plan">打开今日计划 <span>↗</span></a><a class="welcome-link" href="#/profile">完善个人条件 <span>→</span></a></div></div><div class="welcome-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="art-sun"></div><div class="art-line art-line-one"></div><div class="art-line art-line-two"></div><div class="art-label">PLAN · PRACTICE<br/>· REFLECT</div><span class="art-star star-one">✦</span><span class="art-star star-two">✧</span></div></section>
    <section class="metric-grid">${metric('复习计划完成度', fmtPct(progress), `${done} / ${days.length} 天标记完成`, '↗', 'blue')}${metric('计划训练量', `${plannedTotals.questions.toLocaleString('zh-CN')}<small>题</small>`, `${fmt(plannedTotals.hours)} 小时计划投入`, '⌁', 'mint')}${metric('有效模考', `${mocks.length}<small> / 12</small>`, mocks.length ? `最近总分 ${fmt(latest.total, 1)} · 目标 ${fmt(target)}` : '尚无真实成绩记录', '◉', 'amber')}${coverageTile}</section>
    <section class="score-target-section" aria-label="真实模考与目标分差距"><div class="score-target-heading"><div><div class="eyebrow muted">REAL MOCK · TARGET DISTANCE</div><h2>离目标分还有多远？</h2><p>${latest ? `最近一次真实模考：${escapeHtml(latest.date || '日期待定')} · ${fmt(latest.total, 1)} 分` : '录入模考后，按真实总分计算目标差距；空白不会当作 0 分。'}</p></div><a class="panel-link" href="#/mocks">记录或复盘成绩 →</a></div><div class="score-target-grid">${scoreTargets}</div></section>
    <section class="quick-start-section"><div class="quick-start-heading"><div><div class="eyebrow muted">QUICK START</div><h2>我应该先做什么？</h2></div><button type="button" class="text-button" data-action="open-onboarding">第一次使用？3 分钟完成初始化 →</button></div><div class="quick-start-grid"><a class="quick-start-card" href="#/profile"><span class="quick-start-icon icon-profile">01</span><span class="quick-start-copy"><strong>完善个人报考条件</strong><small>${completedProfileFields} / ${profileFields.length} 项有内容</small></span><span class="quick-start-arrow">↗</span></a><a class="quick-start-card" href="#/plan"><span class="quick-start-icon icon-plan">02</span><span class="quick-start-copy"><strong>安排今天的学习</strong><small>${todayPlan ? `从 Day ${todayPlan.day} 开始 · ${escapeHtml(todayPlan.focus)}` : '打开 50 天学习计划'}</small></span><span class="quick-start-arrow">↗</span></a><button type="button" class="quick-start-card" data-action="add-mock"><span class="quick-start-icon icon-mock">03</span><span class="quick-start-copy"><strong>记录一次模考</strong><small>${mocks.length ? `已有 ${mocks.length} 次真实记录，继续复盘` : '录入首场成绩，建立自己的起点'}</small></span><span class="quick-start-arrow">↗</span></button><a class="quick-start-card" href="#/positions"><span class="quick-start-icon icon-jobs">04</span><span class="quick-start-copy"><strong>浏览昌平历史岗位</strong><small>${dataset.positions.length} 条有来源样例 · 当前非全量</small></span><span class="quick-start-arrow">↗</span></a></div></section>
    <section class="content-grid overview-grid"><article class="panel next-task-panel"><div class="panel-heading"><div><div class="eyebrow muted">STUDY PLAN</div><h2>${escapeHtml(dateNote)}</h2></div><a class="panel-link" href="#/plan">查看全部 50 天 →</a></div>${todayPlan ? `<div class="next-day"><div class="day-date"><strong>${String(todayPlan.day).padStart(2, '0')}</strong><small>${escapeHtml(fmtDate(todayPlan.date))}</small></div><div class="next-day-content"><div class="next-day-title"><strong>${escapeHtml(todayPlan.focus)}</strong>${chip(todayPlan.status, statusTone(todayPlan.status))}</div><p>${escapeHtml(todayPlan.coreTask)}</p><div class="task-tags"><span>▣ ${fmt(todayPlan.plannedQuestions)} 题</span><span>◷ ${fmt(todayPlan.plannedHours, 1)} 小时</span>${todayPlan.stage ? `<span>${escapeHtml(todayPlan.stage.replace(/^阶段\d+：/, ''))}</span>` : ''}</div></div></div><div class="task-footer"><span class="mini-progress-label">本日记录完成度</span><strong>${fmtPct(calculateDayCompletion(todayPlan))}</strong></div><div class="progress-track"><span style="width:${Math.round(calculateDayCompletion(todayPlan) * 100)}%"></span></div><a class="task-open" href="#/plan">记录今天的进度 <span>↗</span></a>` : `<div class="empty-state">工作簿中没有可显示的计划数据。</div>`}</article>
      <article class="panel evidence-panel"><div class="panel-heading"><div><div class="eyebrow muted">EVIDENCE CHECK</div><h2>昌平竞争观察</h2></div><a class="panel-link" href="#/evidence">岗位时序与口径 →</a></div><div class="snapshot-list">${snapshotCards}<div class="snapshot-row snapshot-2026"><span class="snapshot-year">2026</span><div><strong>报道区平均竞争比 18.24:1</strong><small>报名时点快照 · 算法与分子未完整披露</small></div><span class="snapshot-ratio snapshot-unknown">不可直接比较</span></div></div><div class="notice notice-soft"><span>ⓘ</span><p>区级记录不能下放到岗位；岗位行是第三方“资格审查通过”快照，不等同最终报名、缴费或实考人数。</p></div></article>
    </section>
    <section class="content-grid overview-grid"><article class="panel chart-panel"><div class="panel-heading"><div><div class="eyebrow muted">MOCK REVIEW</div><h2>模考分数走势</h2></div><a class="panel-link" href="#/mocks">进入模考复盘 →</a></div><div class="chart-summary">${latest ? `<strong>${fmt(latest.total, 1)}<small> 分</small></strong><span>${escapeHtml(latestTargetSummary)}</span>` : `<strong class="placeholder-value">尚未开始</strong><span>${escapeHtml(latestTargetSummary)}</span>`}</div>${chartSvg(mocks)}</article>${renderSevenDayPanel(weekly)}</section>
    <section class="notice notice-2027"><span class="notice-icon">◎</span><div><strong>2027年度定向选调和“优培计划”已发布，网上报名已于2026年9月23日18:00截止</strong><p>定向选调和优培计划Ⅰ类统一笔试计划于2026年10月17日9:00至11:30，成绩于2026年10月28日后查询；优培计划Ⅱ类招聘流程由各单位自行组织。普通京考职位表截至 ${escapeHtml(examStatusAsOf)} 尚未在官方目录检出——这只是本次检索结果，并非官方确认未发布。定向选调/优培与普通京考不是同一项目；2024–2026 岗位仅作历史参考。${sourceLink('beijing-2027-selection', '查看2027定向选调/优培公告 ↗')} ${sourceLink('beijing-index', '查看官方招考目录 ↗')}</p></div><a class="notice-close" data-action="dismiss-notice" href="#" aria-label="关闭">×</a></section>
  </div>`;
}

function renderGuide() {
  const groups = buildGuideGroups(navGroups, pageMeta);
  const cards = groups.map((group, groupIndex) => `<section class="guide-section" aria-labelledby="guide-section-${groupIndex}">
    <div class="guide-section-heading"><div><span class="guide-section-index">0${groupIndex + 1}</span><h2 id="guide-section-${groupIndex}">${escapeHtml(group.label)}</h2></div><span>${group.pages.length} 个入口</span></div>
    <div class="guide-card-grid">${group.pages.map((item, index) => `<a class="guide-page-card" href="${escapeHtml(item.href)}" style="--guide-index:${index}">
      <div class="guide-card-top"><span class="guide-card-icon">${icons[item.id] || '↗'}</span><span class="guide-card-label">${escapeHtml(item.label)}</span><span class="guide-card-arrow" aria-hidden="true">↗</span></div>
      <h3>${escapeHtml(item.title)}</h3><strong class="guide-card-question">${escapeHtml(item.question)}</strong><p>${escapeHtml(item.subtitle)}</p>
      <span class="guide-card-action">打开此功能 <span aria-hidden="true">→</span></span>
    </a>`).join('')}</div>
  </section>`).join('');

  return `<div class="page-body guide-page">
    <div class="page-heading-row"><div><div class="eyebrow muted">YOUR WORKSPACE MAP</div><h1>使用指南</h1><p>从你眼前的问题进入功能，不必先记住导航结构。选择一张卡片即可直达。</p></div><button type="button" class="button button-secondary" data-action="open-onboarding">重新开始 3 分钟引导</button></div>
    <section class="guide-flow-grid" aria-label="网站使用闭环">
      <article class="guide-flow-card guide-flow-study"><span class="guide-flow-kicker">备考闭环</span><strong>今日计划 <i>→</i> 真实记录 <i>→</i> 模考诊断 <i>→</i> 调整训练</strong><p>完成情况与分数只按你实际填写的记录更新。</p></article>
      <article class="guide-flow-card guide-flow-job"><span class="guide-flow-kicker">选岗闭环</span><strong>个人条件 <i>→</i> 资格筛选 <i>→</i> 历史证据 <i>→</i> 人工核对</strong><p>职位字段不完整时会标出待核项；最终资格以当年官方职位表为准。</p></article>
    </section>
    ${cards}
  </div>`;
}

function renderPlan() {
  const days = getDays();
  const plannedTotals = getPlannedTotals(days);
  const completed = days.filter((day) => day.status === '已完成').length;
  const stages = [...new Set(days.map((day) => day.stage).filter(Boolean))];
  const rows = days.map((day) => `<tr><td><span class="day-number">${String(day.day).padStart(2, '0')}</span></td><td>${escapeHtml(fmtDate(day.date))}</td><td>${chip((day.stage || '').replace(/^阶段\d+：/, ''), 'blue-soft')}</td><td><strong>${escapeHtml(day.focus)}</strong><small class="cell-secondary">${escapeHtml(day.coreTask)}</small></td><td>${fmt(day.plannedQuestions)}<small class="cell-secondary">实际 ${fmt(day.actualQuestions)}</small></td><td>${fmt(day.plannedHours, 1)}h<small class="cell-secondary">实际 ${fmt(day.actualHours, 1)}h</small></td><td><div class="table-progress"><span style="width:${Math.round(calculateDayCompletion(day) * 100)}%"></span></div><small class="cell-secondary">${fmtPct(calculateDayCompletion(day))}</small></td><td>${chip(day.status, statusTone(day.status))}</td><td class="plan-actions">${button('改计划', 'edit-plan-day', 'button button-quiet button-small', `data-day="${day.day}"`)}${button('记录', 'edit-day', 'button button-quiet button-small', `data-day="${day.day}"`)}</td></tr>`).join('');
  return `<div class="page-body"><div class="page-heading-row"><div><div class="eyebrow muted">OCT 08 — NOV 26 · 2026</div><h1>50 天复习计划</h1><p>按需调整每一天的日期和安排；计划修改与实际学习记录分别保存在本机，不回写原始 Excel。</p></div><div class="heading-actions">${chip(`${completed}/${days.length} 天完成`, 'green')}<a class="button button-primary" href="#/mocks">＋ 记录模考</a></div></div><div class="metric-grid three-metrics">${metric('整体完成度', fmtPct(actualPlanCompletion()), '基于每日实际记录', '↗', 'blue')}${metric('计划题量', `${plannedTotals.questions.toLocaleString('zh-CN')}<small> 题</small>`, '客观题训练目标', '⌁', 'mint')}${metric('计划用时', `${fmt(plannedTotals.hours)}<small> 小时</small>`, '50 天总投入', '◷', 'amber')}</div><div class="panel phase-panel"><div class="panel-heading"><div><div class="eyebrow muted">PHASES</div><h2>分阶段进度</h2></div><span class="panel-hint">未填写的实际量按未记录展示</span></div><div class="phase-grid">${stages.map((stage) => { const list = days.filter((day) => day.stage === stage); const logged = list.map(calculateDayCompletion).filter(Number.isFinite); const pct = logged.length ? logged.reduce((sum, value) => sum + value, 0) / logged.length : null; return `<div class="phase-card"><div class="phase-top"><strong>${escapeHtml(stage)}</strong><span>${list.length} 天</span></div><div class="progress-track"><span style="width:${Math.round((pct ?? 0) * 100)}%"></span></div><small>${fmtPct(pct)} 完成</small></div>`; }).join('')}</div></div><div class="panel table-panel"><div class="panel-heading"><div><div class="eyebrow muted">DAILY SCHEDULE</div><h2>每日任务 <span class="heading-count">${days.length}</span></h2></div><div class="table-tools"><span class="panel-hint">“改计划”调整安排，“记录”填写实际进度</span></div></div><div class="table-scroll"><table class="data-table plan-table"><thead><tr><th>DAY</th><th>日期</th><th>阶段</th><th>今日主攻与核心任务</th><th>题量</th><th>用时</th><th>完成</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div></div></div>`;
}

function renderAptitude() {
  const aptitude = dataset.aptitude.map((item, index) => ({ ...item, ...(storage.aptitudeLogs[index] || {}), index }));
  const groups = new Map();
  for (const item of aptitude) {
    const area = item.area || '未分类';
    if (!groups.has(area)) groups.set(area, []);
    groups.get(area).push(item);
  }
  const cards = [...groups.entries()].map(([area, items], index) => {
    const planned = items.reduce((sum, item) => sum + (item.plannedQuestions || 0), 0);
    const hasAttempted = items.some((item) => Number.isFinite(item.attempted));
    const done = hasAttempted ? items.reduce((sum, item) => sum + (Number.isFinite(item.attempted) ? item.attempted : 0), 0) : null;
    const recorded = items.filter((item) => Number.isFinite(item.accuracy));
    const accuracy = recorded.length ? recorded.reduce((sum, item) => sum + item.accuracy, 0) / recorded.length : null;
    const accent = ['blue', 'mint', 'purple', 'amber'][index % 4];
    return `<article class="panel skill-panel"><div class="skill-heading"><span class="skill-symbol skill-${accent}">${['文', '数', '推', '策'][index % 4]}</span><div><h2>${escapeHtml(area)}</h2><small>${items.length} 个训练子项</small></div><span class="skill-progress-value">${fmtPct(accuracy)}</span></div><div class="skill-progress-line"><span style="width:${Math.round(planned && Number.isFinite(done) ? done / planned * 100 : 0)}%"></span></div><div class="skill-stats"><span><strong>${fmt(done)}</strong> / ${fmt(planned)} 题</span><span>目标正确率 ${fmtPct(items[0]?.targetAccuracy)}</span></div><div class="skill-items">${items.slice(0, 5).map((item) => `<div class="skill-item"><span>${escapeHtml(item.item)}</span><span>${fmt(item.attempted)} / ${fmt(item.plannedQuestions)} 题</span><span>${fmtPct(item.accuracy)}</span>${button('记录', 'edit-aptitude', 'button button-quiet button-small', `data-index="${item.index}"`)}</div>`).join('')}${items.length > 5 ? `<small class="more-items">还有 ${items.length - 5} 个训练项 · 完整清单仍在 Excel 源表</small>` : ''}</div></article>`;
  }).join('');
  const hasAnyAttempted = aptitude.some((item) => Number.isFinite(item.attempted));
  const totalDone = hasAnyAttempted ? aptitude.reduce((sum, item) => sum + (Number.isFinite(item.attempted) ? item.attempted : 0), 0) : null;
  const totalTarget = aptitude.reduce((sum, item) => sum + (item.plannedQuestions || 0), 0);
  const accuracyValues = aptitude.filter((item) => Number.isFinite(item.accuracy)).map((item) => item.accuracy);
  const overallAccuracy = accuracyValues.length ? accuracyValues.reduce((sum, value) => sum + value, 0) / accuracyValues.length : null;
  return `<div class="page-body"><div class="page-heading-row"><div><div class="eyebrow muted">SIX OFFICIAL SECTIONS + TRACKED SUBSKILLS</div><h1>行测能力训练</h1><p>科学推理在官方大纲中属于判断推理细分，本页为训练需要单列显示。</p></div><a class="button button-secondary" href="#/plan">查看 50 天计划 →</a></div><div class="metric-grid three-metrics">${metric('训练子项', `${dataset.aptitude.length}<small> 项</small>`, `${groups.size} 个工作簿训练分类`, '⌁', 'blue')}${metric('已记录题量', `${fmt(totalDone)}<small> 题</small>`, `训练目标 ${Number(totalTarget).toLocaleString('zh-CN')} 题`, '▤', 'mint')}${metric('实际正确率', fmtPct(overallAccuracy), overallAccuracy === null ? '尚无练习记录；不是 0%' : '已记录训练项均值', '◎', 'amber')}</div><div class="skill-grid">${cards}</div><div class="notice notice-soft"><span>ⓘ</span><p>工作簿内计划题量可见；模板的零值按占位值处理，实际练习数据需另行记录。点击“记录”可更新单项训练。</p></div></div>`;
}

function renderEssay() {
  const essay = dataset.essay.map((item, index) => ({ ...item, ...(storage.essayLogs[index] || {}), index }));
  const rows = essay.map((item) => `<tr><td><strong>${escapeHtml(item.area)}</strong></td><td>${escapeHtml(item.practice)}</td><td>${Number.isFinite(item.completed) ? fmt(item.completed) : '待记录'} / ${fmt(item.planned)} 次</td><td>${Number.isFinite(item.selfScore) ? `${fmt(item.selfScore)} 分` : '待自评'}</td><td>${Number.isFinite(item.keywordCoverage) ? fmtPct(item.keywordCoverage) : '待记录'}</td><td>${item.timedPass === null ? '待记录' : item.timedPass ? '达标' : '未达标'}</td><td>${button('记录', 'edit-essay', 'button button-quiet button-small', `data-index="${item.index}"`)}</td></tr>`).join('');
  const hasCompleted = essay.some((item) => Number.isFinite(item.completed));
  const completed = hasCompleted ? essay.reduce((sum, item) => sum + (Number.isFinite(item.completed) ? item.completed : 0), 0) : null;
  const planned = dataset.essay.reduce((sum, item) => sum + (item.planned || 0), 0);
  return `<div class="page-body"><div class="page-heading-row"><div><div class="eyebrow muted">WRITING PRACTICE</div><h1>申论训练</h1><p>训练目标和验收标准来自工作簿；网站仅显示你实际填入的练习记录。</p></div><a class="button button-secondary" href="#/plan">查看每日申论任务 →</a></div><div class="metric-grid three-metrics">${metric('训练能力项', `${dataset.essay.length}<small> 项</small>`, '阅读理解、归纳、对策、贯彻等', '✎', 'blue')}${metric('已完成练习', `${fmt(completed)}<small> / ${fmt(planned)} 次</small>`, '基于工作簿和本地记录', '↗', 'mint')}${metric('关键词覆盖', '按题记录', '点击训练项的“记录”填写', '◎', 'amber')}</div><div class="panel table-panel"><div class="panel-heading"><div><div class="eyebrow muted">PRACTICE TRACKER</div><h2>训练任务</h2></div><span class="panel-hint">申论自评分仅作为个人复盘</span></div><div class="table-scroll"><table class="data-table"><thead><tr><th>能力/题型</th><th>训练内容</th><th>完成次数</th><th>自评分</th><th>关键词覆盖</th><th>限时达标</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div><div class="notice notice-soft"><span>ⓘ</span><p>模板中的练习次数零值视为占位，不能证明已经完成练习；请使用“记录”填写真实完成次数和个人复盘。</p></div></div>`;
}

function renderMocks() {
  const mocks = getMocks();
  const summary = summarizeMockScores(mocks);
  const margin = calculateSafeMargin(mocks, null);
  const moduleSummary = renderMockModuleSummary(mocks);
  const historyStats = [
    ['全部模考中位数', Number.isFinite(summary.median) ? `${fmt(summary.median, 1)} 分` : '待记录', `有效样本 ${summary.count} 次`],
    ['历史最低分', Number.isFinite(summary.minimum) ? `${fmt(summary.minimum, 1)} 分` : '待记录', '所有有效模考'],
    ['历史最高分', Number.isFinite(summary.maximum) ? `${fmt(summary.maximum, 1)} 分` : '待记录', '所有有效模考'],
    ['最近 3 次均分', Number.isFinite(summary.last3Mean) ? `${fmt(summary.last3Mean, 1)} 分` : '不足数据', `${Math.min(summary.count, 3)} / 3 次有效`],
    ['最近 5 次均分', Number.isFinite(summary.last5Mean) ? `${fmt(summary.last5Mean, 1)} 分` : '不足数据', `${Math.min(summary.count, 5)} / 5 次有效`],
  ].map(([label, value, note]) => `<article class="mock-history-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`).join('');
  const rows = [...mocks].reverse().map((mock) => `<tr><td>${escapeHtml(mock.date || '日期待定')}</td><td>${fmt(mock.aptitude, 1)}</td><td>${fmt(mock.essay, 1)}</td><td><strong>${fmt(mock.total, 1)}</strong></td><td>${fmt(mock.target)}</td><td>${Number.isFinite(mock.total) ? `${mock.total >= (mock.target || 138) ? '达成' : `差 ${fmt(mock.total - (mock.target || 138), 1)}`}` : '—'}</td></tr>`).join('');
  return `<div class="page-body"><div class="page-heading-row"><div><div class="eyebrow muted">MOCK EXAM REVIEW</div><h1>模考记录与复盘</h1><p>工作簿有 12 个预留模考位；此处统计只依据你录入的真实成绩。</p></div>${button('＋ 录入一次模考', 'add-mock', 'button button-primary')}</div><div class="metric-grid four-metrics">${metric('有效模考', `${summary.count}<small> / 12</small>`, '只计有实际总分的记录', '◉', 'blue')}${metric('全部模考均分', Number.isFinite(summary.mean) ? `${fmt(summary.mean, 1)}<small> 分</small>` : '待记录', `有效样本 ${summary.count} 次`, '↗', 'mint')}${metric('分数标准差', Number.isFinite(summary.standardDeviation) ? `±${fmt(summary.standardDeviation, 1)}<small> 分</small>` : '至少 2 次', '描述已记录成绩的离散程度', '⌁', 'amber')}${metric('岗位安全垫', '暂不可算', margin.status, '▣', 'purple')}</div><section class="mock-history-strip" aria-label="模考分布与近期均分">${historyStats}</section><div class="panel chart-panel large-chart-panel"><div class="panel-heading"><div><div class="eyebrow muted">TOTAL SCORE</div><h2>行测 + 申论总分走势</h2></div><div class="chart-legend"><span><i></i>实际模考</span><span class="target-legend">目标 138</span></div></div>${chartSvg(mocks)}<div class="target-note">目标线 138 分 · 个人目标可在每次模考中单独设置</div></div>${moduleSummary}<div class="panel table-panel"><div class="panel-heading"><div><div class="eyebrow muted">MOCK LOG</div><h2>成绩明细</h2></div><span class="panel-hint">空白模考不显示为零分</span></div>${mocks.length ? `<div class="table-scroll"><table class="data-table"><thead><tr><th>日期</th><th>行测</th><th>申论</th><th>总分</th><th>目标</th><th>目标差值</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="table-empty"><span>◎</span><strong>还没有模考成绩</strong><small>完成第一套后，在这里记录各科成绩、模块正确率和复盘结论。</small>${button('＋ 录入第一次模考', 'add-mock', 'button button-primary')}</div>`}</div></div>`;
}

function renderMockModuleSummary(mocks) {
  const summaries = mockModules.map(([key, label]) => {
    const values = mocks.map((mock) => mock.accuracy?.[key]).filter(Number.isFinite);
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    return `<article class="module-score-card"><span>${escapeHtml(label)}</span><strong>${fmtPct(average)}</strong><small>${values.length} 次记录</small></article>`;
  }).join('');
  return `<section class="panel module-summary"><div class="panel-heading"><div><div class="eyebrow muted">WEAKNESS TRACKING</div><h2>行测模块表现</h2></div><span class="panel-hint">录入模考模块正确率后按实算均值</span></div><div class="module-score-grid">${summaries}</div></section>`;
}

function filteredPositions() {
  return filterAndSortPositions(dataset.positions, { ...filters, sortBy: jobSort });
}

function renderPositions() {
  const allPositions = filteredPositions();
  const pageState = paginateItems(allPositions, jobPage, 25);
  jobPage = pageState.page;
  const positions = pageState.items;
  const matchLabels = {
    explicit: '明确列入 1204 / 1252',
    'manual-review': '可能相关 · 人工核对',
    unrestricted: '专业不限',
    'not-listed': '未列入目标代码',
    unknown: '专业文本缺失',
  };
  const rows = positions.map((position, index) => {
    const majorMatch = classifyPublicManagementMatch(position);
    return `<tr style="--row-index:${Math.min(index, 6)}"><td><span class="year-pill">${position.year}</span></td><td><strong>${escapeHtml(position.unit)}</strong><small class="cell-secondary">${escapeHtml(position.orgType)} · ${escapeHtml(position.jobType || '类别待核')}</small></td><td><button type="button" class="position-title-link" data-action="open-job" data-code="${escapeHtml(position.code)}">${escapeHtml(position.title)}</button><small class="cell-secondary mono">${escapeHtml(position.code)}</small></td><td>${fmt(position.recruitCount)} 人</td><td><span class="major-match-badge major-match-${majorMatch.status}">${matchLabels[majorMatch.status]}</span><span class="truncate-cell">${escapeHtml(position.majorText || '待核验')}</span></td><td><div class="position-evidence-cell">${positionEvidenceMarkup(position)}${positionCompletenessMarkup(position)}<small class="cell-secondary">${escapeHtml(position.verification || '核验状态未知')}</small></div></td><td><div class="row-actions"><button type="button" class="icon-button ${storage.favorites.includes(position.code) ? 'favorited' : ''}" data-action="favorite" data-code="${escapeHtml(position.code)}" aria-label="收藏职位">${storage.favorites.includes(position.code) ? '★' : '☆'}</button><button type="button" class="icon-button" data-action="compare" data-code="${escapeHtml(position.code)}" aria-label="加入比较">⇄</button></div></td></tr>`;
  }).join('');
  const publicManagement = summarizePublicManagementPositions(dataset.positions);
  const publicManagementTotals = publicManagement.reduce((total, item) => ({
    positions: total.positions + item.positionCount,
    recruits: total.recruits + item.recruitCount,
    manualReview: total.manualReview + item.manualReviewCount,
    manualReviewRecruits: total.manualReviewRecruits + item.manualReviewRecruitCount,
    notListed: total.notListed + item.notListedCount,
    unrestricted: total.unrestricted + item.unrestrictedCount,
    unknown: total.unknown + item.unknownCount,
  }), { positions: 0, recruits: 0, manualReview: 0, manualReviewRecruits: 0, notListed: 0, unrestricted: 0, unknown: 0 });
  const publicManagementRows = publicManagement.map((item) => `<tr><th scope="row">${item.year}</th><td><strong>${item.positionCount}</strong> 岗 / ${item.recruitCount} 人</td><td><strong>${item.manualReviewCount}</strong> 岗 / ${item.manualReviewRecruitCount} 人</td><td>${item.notListedCount} / ${item.unknownCount} / ${item.unrestrictedCount}</td><td>区直 ${item.byOrgType['区直']} · 街道 ${item.byOrgType['街道']} · 镇 ${item.byOrgType['镇']}</td><td>本科 1204：${item.byMajorType.undergraduate1204}<br/>硕士 1204：${item.byMajorType.graduate1204}<br/>专硕 1252：${item.byMajorType.professional1252}</td></tr>`).join('');
  const manualReviewActive = filters.majorTopic === 'public-management-review';
  const publicManagementPanel = `<section class="major-topic-panel" aria-labelledby="major-topic-title"><div class="major-topic-heading"><div><div class="eyebrow muted">PUBLIC ADMINISTRATION · CODED EXAMPLES</div><h2 id="major-topic-title">公共管理专业专题</h2><p>仅本科 1204、研究生 1204 / 1252 计为明确列入；门类 12 和 1204 下级专业列为可能相关，需人工核对。</p></div><div class="major-topic-actions"><button type="button" class="button ${filters.majorTopic === 'public-management' ? 'button-primary' : 'button-secondary'}" data-action="toggle-major-focus" aria-pressed="${filters.majorTopic === 'public-management'}">${filters.majorTopic === 'public-management' ? '正在看明确列入 · 显示全部' : '仅看明确列入 1204 / 1252'}</button><button type="button" class="button ${manualReviewActive ? 'button-primary' : 'button-secondary'}" data-action="toggle-major-review" aria-pressed="${manualReviewActive}">${manualReviewActive ? '正在看可能相关 · 显示全部' : '仅看可能相关 · 人工核对'}</button></div></div><div class="major-topic-metrics"><div><span>明确列入 1204 / 1252</span><strong>${publicManagementTotals.positions}<small> 岗 · ${publicManagementTotals.recruits} 人</small></strong></div><div><span>可能相关 · 需人工核对</span><strong>${publicManagementTotals.manualReview}<small> 岗 · ${publicManagementTotals.manualReviewRecruits} 人</small></strong></div><div><span>未列入目标代码</span><strong>${publicManagementTotals.notListed}<small> 岗</small></strong></div><div><span>专业不限</span><strong>${publicManagementTotals.unrestricted}<small> 岗</small></strong></div><div><span>专业文本缺失</span><strong>${publicManagementTotals.unknown}<small> 岗</small></strong></div></div><div class="table-scroll"><table class="data-table major-topic-table"><thead><tr><th>年度</th><th>明确列入（岗 / 人）</th><th>可能相关待核（岗 / 人）</th><th>未列入 / 缺失 / 不限</th><th>明确列入的单位类型</th><th>明确代码拆分</th></tr></thead><tbody>${publicManagementRows || '<tr><td colspan="6">暂无符合条件的样例记录</td></tr>'}</tbody></table></div><div class="major-topic-note">“未列入 / 缺失 / 不限”按此顺序显示；管理学门类和下级专业不会自动视为符合，所有统计都不能替代官方资格条件核对。</div></section>`;
  const count2024 = dataset.positions.filter((position) => Number(position.year) === 2024).length;
  const count2025 = dataset.positions.filter((position) => Number(position.year) === 2025).length;
  const positions2026 = dataset.positions.filter((position) => Number(position.year) === 2026);
  const count2026 = positions2026.length;
  const hires2026 = positions2026.reduce((sum, position) => sum + (Number(position.recruitCount) || 0), 0);
  const summary2026 = dataset.sources.find((source) => source.sourceId === 'huatu-2026-list');
  const summaryPositionCount2026 = Number(summary2026?.reportedPositionCount) || count2026;
  const summaryRecruitCount2026 = Number(summary2026?.reportedRecruitCount) || hires2026;
  const missingPositionCount2026 = Math.max(0, summaryPositionCount2026 - count2026);
  const missingRecruitCount2026 = Math.max(0, summaryRecruitCount2026 - hires2026);
  const crossCount2025 = dataset.positions.filter((position) => Number(position.year) === 2025 && position.crossVerified === true).length;
  const singleCount2025 = dataset.positions.filter((position) => Number(position.year) === 2025 && position.crossVerified === false).length;
  const orgTypes = ['区直', '街道', '镇', '垂直/驻区'].filter((type) => dataset.positions.some((position) => position.orgType === type));
  const jobTypes = [...new Set(dataset.positions.map((position) => position.jobType).filter(Boolean))].sort((left, right) => left.localeCompare(right, 'zh-CN'));
  const sortOptions = [['year-desc', '年度（新→旧）'], ['recruit-desc', '招录人数（多→少）'], ['unit-asc', '单位名称（A→Z）'], ['title-asc', '职位名称（A→Z）']];
  const advancedFields = [
    ['job-unit', 'unit', 'unit', '招录单位'],
    ['job-education', 'education', 'education', '学历要求'],
    ['job-politics', 'politicalStatus', 'politicalStatus', '政治面貌限制'],
    ['job-graduation', 'freshGraduate', 'freshGraduate', '应届要求'],
    ['job-physical-test', 'physicalTest', 'physicalTest', '体测要求'],
    ['job-professional-test', 'professionalTest', 'professionalTest', '专业测试'],
  ];
  const advancedSelect = ([id, filterKey, field, label], index) => {
    const values = [...new Set(dataset.positions.map((position) => getPositionFilterValue(position, field)).filter((value) => value !== null))]
      .sort((left, right) => left.localeCompare(right, 'zh-CN'));
    const hasMissing = dataset.positions.some((position) => getPositionFilterValue(position, field) === null);
    const options = values.map((value) => `<option value="${escapeHtml(value)}" ${filters[filterKey] === value ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('');
    const missing = hasMissing ? `<option value="__missing" ${filters[filterKey] === '__missing' ? 'selected' : ''}>未列明</option>` : '';
    return `<label class="job-advanced-field" style="--filter-index:${index}"><span>${label}</span><select id="${id}" aria-label="${label}"><option value="all" ${filters[filterKey] === 'all' ? 'selected' : ''}>全部</option>${options}${missing}</select></label>`;
  };
  const missingRecruitCount = dataset.positions.some((position) => !Number.isFinite(Number(position.recruitCount)));
  const recruitmentOptions = `<label class="job-advanced-field" style="--filter-index:${advancedFields.length}"><span>招录人数</span><select id="job-recruitment" aria-label="招录人数"><option value="all" ${filters.recruitmentGroup === 'all' ? 'selected' : ''}>全部</option><option value="one" ${filters.recruitmentGroup === 'one' ? 'selected' : ''}>招录 1 人</option><option value="two-or-more" ${filters.recruitmentGroup === 'two-or-more' ? 'selected' : ''}>招录 2 人及以上</option>${missingRecruitCount ? `<option value="missing" ${filters.recruitmentGroup === 'missing' ? 'selected' : ''}>未列明</option>` : ''}</select></label>`;
  const advancedFilterCount = ['unit', 'education', 'politicalStatus', 'freshGraduate', 'physicalTest', 'professionalTest', 'recruitmentGroup']
    .filter((key) => filters[key] !== 'all').length;
  const advancedFilters = `<details id="job-advanced-filters" class="job-advanced-filters"><summary><span>更多条件筛选</span><span class="advanced-filter-count">${advancedFilterCount ? `已选 ${advancedFilterCount} 项` : '单位 · 学历 · 报考条件'}</span></summary><div class="job-advanced-grid">${advancedFields.map(advancedSelect).join('')}${recruitmentOptions}</div><p class="job-filter-footnote">未列明仅表示来源未提供，不表示不限或不符合；专业条件可用上方搜索框检索。</p></details>`;
  const pagination = pageState.totalPages > 1
    ? `<nav class="position-pagination" aria-label="职位列表分页"><span class="pagination-summary" aria-live="polite">显示 ${pageState.start}–${pageState.end} 条，共 ${pageState.total} 条</span><div class="pagination-controls"><button type="button" class="button button-secondary" data-action="positions-page" data-direction="previous" data-page="${pageState.page - 1}" aria-label="上一页" ${pageState.page <= 1 ? 'disabled' : ''}>← 上一页</button><span>第 ${pageState.page} / ${pageState.totalPages} 页</span><button type="button" class="button button-secondary" data-action="positions-page" data-direction="next" data-page="${pageState.page + 1}" aria-label="下一页" ${pageState.page >= pageState.totalPages ? 'disabled' : ''}>下一页 →</button></div></nav>`
    : `<div class="position-pagination"><span class="pagination-summary">显示 ${pageState.start}–${pageState.end} 条，共 ${pageState.total} 条</span></div>`;
  return `<div class="page-body">
    <div class="page-heading-row"><div><div class="eyebrow muted">2024 — 2026 · CANDIDATE SAMPLE</div><h1>昌平职位库</h1><p>目前有 ${dataset.positions.length} 条可追溯候选；2024 年收录 ${count2024} 条镜像行，2025 年收录 ${count2025} 条镜像明细，2026 年收录 ${count2026} 条逐岗明细。年度官方分母未验证，不代表昌平区全量。</p></div><a class="button button-secondary" href="#/sources">了解数据覆盖 →</a></div>
    <div class="notice notice-warning"><span>!</span><p>2024 年二手来源汇总存在 93/142、95/197、97/199 三种口径；2025 年 ${crossCount2025} 条明细在两处二手镜像逐字段一致，另 ${singleCount2025} 条只在单一镜像可见。2026 年已收录 ${count2026} 条逐岗镜像明细 / ${hires2026} 人；华图分类页汇总 ${summaryPositionCount2026} 岗 / ${summaryRecruitCount2026} 人，仍有 ${missingPositionCount2026} 岗 / ${missingRecruitCount2026} 人尚未取得逐岗明细。均不是官方核验。报考前仍须查看官方原表，“公共管理”摘要也不代表你满足岗位资格。${sourceLink('huatu-2026-list', '查看华图汇总 ↗')}</p></div>
    ${publicManagementPanel}
    <div class="panel table-panel job-panel"><div class="job-filterbar"><label class="searchbox"><span>⌕</span><input id="job-search" type="search" placeholder="搜单位、职位、专业或代码" value="${escapeHtml(filters.query)}" autocomplete="off"/><kbd>⌘ K</kbd></label><select id="job-year" aria-label="招考年度"><option value="all" ${filters.year === 'all' ? 'selected' : ''}>全部年度</option>${[2024, 2025, 2026].map((year) => `<option value="${year}" ${filters.year === String(year) ? 'selected' : ''}>${year} 年</option>`).join('')}</select><select id="job-type" aria-label="单位类型"><option value="all" ${filters.orgType === 'all' ? 'selected' : ''}>全部单位类型</option>${orgTypes.map((type) => `<option value="${escapeHtml(type)}" ${filters.orgType === type ? 'selected' : ''}>${escapeHtml(type)}</option>`).join('')}</select><select id="job-jobtype" aria-label="职位类别"><option value="all" ${filters.jobType === 'all' ? 'selected' : ''}>全部职位类别</option>${jobTypes.map((type) => `<option value="${escapeHtml(type)}" ${filters.jobType === type ? 'selected' : ''}>${escapeHtml(type)}</option>`).join('')}</select><select id="job-sort" aria-label="职位排序">${sortOptions.map(([value, label]) => `<option value="${value}" ${jobSort === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select><span class="filter-count">${allPositions.length} 条结果</span></div>${advancedFilters}
    <div class="table-scroll"><table class="data-table job-table"><thead><tr><th>年度</th><th>招录单位</th><th>职位名称 / 代码</th><th>人数</th><th>专业条件片段</th><th>来源等级 / 数据完整度</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="7"><div class="table-empty compact-empty">没有匹配的样例职位。</div></td></tr>`}</tbody></table></div>${pagination}<div class="table-footnote">来源等级反映证据性质；数据完整度按 8 类信息是否可回查计算，两者互不替代。悬停完整度标签可看缺失项；职位数和招录数只表示可见候选，缺失值以“—”呈现，不按 0 人处理。</div></div></div>`;
}

function renderCompare() {
  const selected = storage.compared.map((code) => dataset.positions.find((position) => position.code === code)).filter(Boolean);
  if (!selected.length) return `<div class="page-body"><div class="page-heading-row"><div><div class="eyebrow muted">SIDE-BY-SIDE REVIEW</div><h1>岗位比较</h1><p>从职位库逐项加入岗位，最多同时比较 5 个。</p></div><a href="#/positions" class="button button-primary">前往职位库选岗位 →</a></div><div class="panel empty-compare"><span class="empty-compare-icon">⇄</span><h2>先挑几个岗位放在一起看</h2><p>比较表会展示单位、职位条件、来源与已知数据空缺，不为缺失字段打分。</p><a href="#/positions" class="button button-secondary">浏览候选职位</a></div></div>`;
  const qualifiedSnapshotsFor = (position) => dataset.observations.filter((item) => item.observationType === 'qualified_snapshot'
    && Number(item.year) === Number(position.year) && item.positionCode === position.code);
  const fields = [
    ['年度 / 代码', (position) => `${position.year} · ${position.code}`],
    ['单位 / 类型', (position) => `${position.unit} · ${position.orgType}`],
    ['职位', (position) => position.title],
    ['招录人数', (position) => Number.isFinite(position.recruitCount) ? `${position.recruitCount} 人` : '待核验'],
    ['学历', (position) => position.education || '待核验'],
    ['专业条件', (position) => position.majorText || '待核验'],
    ['资格核验', (position) => evaluateEligibility(position, storage.profile).status],
    ['岗位级报名 / 资格审查记录', (position) => {
      const snapshots = qualifiedSnapshotsFor(position).sort((left, right) => String(left.observedAt).localeCompare(String(right.observedAt)));
      const latest = snapshots.at(-1);
      return latest
        ? `${latest.observedAt} · ${fmt(latest.applicantsQualified)} 人资格审查通过（过程快照，非最终报名或实考）`
        : '暂无可回查的岗位级过程或最终数据';
    }],
    ['历史进面线 / 安全垫', () => '暂无逐岗位可比样本'],
    ['来源状态', (position) => position.verification],
  ];
  return `<div class="page-body"><div class="page-heading-row"><div><div class="eyebrow muted">SIDE-BY-SIDE REVIEW</div><h1>岗位比较</h1><p>已选 ${selected.length} / 5 个 · 缺失条件保持待核验</p></div><a href="#/positions" class="button button-secondary">＋ 添加岗位</a></div><div class="panel compare-panel" style="--compare-count:${selected.length}"><div class="compare-grid compare-header"><div class="compare-label-cell">对比字段</div>${selected.map((position) => `<div class="compare-job-head"><button class="remove-compare" data-action="remove-compare" data-code="${position.code}" aria-label="移除">×</button><span class="year-pill">${position.year}</span><strong>${escapeHtml(position.unit)}</strong><span>${escapeHtml(position.title)}</span></div>`).join('')}</div>${fields.map(([label, getValue]) => `<div class="compare-grid compare-row"><div class="compare-label-cell">${escapeHtml(label)}</div>${selected.map((position) => `<div class="compare-value-cell">${escapeHtml(getValue(position))}</div>`).join('')}</div>`).join('')}<div class="compare-grid compare-row"><div class="compare-label-cell">来源</div>${selected.map((position) => `<div class="compare-value-cell">${(position.sources || []).map((id) => sourceLink(id, '打开来源 ↗')).join('<br/>')}</div>`).join('')}</div></div><div class="notice notice-soft"><span>ⓘ</span><p>以上均是历史职位样例，不代表 2027 职位。岗位级最终竞争比和逐岗进面线未核实；过程快照不作为最终报名或实考数据，也不用于计算个人安全垫。</p></div></div>`;
}

function renderWorkPreferenceChecks(position) {
  const result = evaluateWorkPreferences(position, storage.profile);
  const grade = getPositionEvidenceGrade(position, dataset.sources);
  const conflictCount = result.items.filter((item) => item.status === 'conflict').length;
  const unknownCount = result.items.filter((item) => item.status === 'unknown').length;
  const summary = [
    conflictCount ? `偏好冲突 ${conflictCount} 项` : '暂无明确冲突',
    `待核验 ${unknownCount} 项`,
  ].join(' · ');
  const statusLabels = {
    match: '符合偏好',
    conflict: '偏好冲突',
    'not-prioritized': '非优先',
    neutral: '未设优先',
    unknown: '待核验',
  };
  const rows = result.items.map((item) => `<li class="assistant-preference-item is-${item.status}" data-status="${item.status}"><div class="assistant-preference-copy"><strong>${escapeHtml(item.label)}</strong><span>你的选择：${escapeHtml(item.preference)}</span></div><span class="assistant-preference-status">${statusLabels[item.status]}</span><small>${escapeHtml(item.detail)}</small></li>`).join('');
  return `<details class="assistant-preference-checks"><summary><span>个人工作偏好核对</span><strong>${summary}</strong></summary><div class="assistant-preference-content"><div class="assistant-preference-heading"><div><strong>按已收录职位信息核对</strong><small>证据等级 ${grade}</small></div><a href="#/profile">修改偏好</a></div><ul class="assistant-preference-grid">${rows}</ul><p class="assistant-preference-note">偏好不会改变资格核验结论；未知项保留为待核验，软优先项不会淘汰岗位。</p></div></details>`;
}

function renderAssistant() {
  const mocks = getMocks();
  const results = dataset.positions.map((position) => {
    const fit = scoreFit(position, storage.profile, storage.profile, mocks, dataset);
    return { position, eligibility: fit.eligibility, difficulty: scoreDifficulty(position, dataset), fit };
  });
  const complete = Object.values(storage.profile).filter((value) => value !== null && value !== '').length;
  const statusCounts = results.reduce((counts, { eligibility }) => {
    counts[eligibility.status] = (counts[eligibility.status] || 0) + 1;
    return counts;
  }, {});
  const filterOptions = [
    ['all', '全部岗位', results.length],
    ['明确可报', '明确可报', statusCounts['明确可报'] || 0],
    ['大概率可报但有条件待核', '有条件待核', statusCounts['大概率可报但有条件待核'] || 0],
    ['信息不足', '信息不足', statusCounts['信息不足'] || 0],
    ['明确不可报', '明确不可报', statusCounts['明确不可报'] || 0],
  ];
  const filterMarkup = filterOptions.map(([value, label, count]) => `<button type="button" class="assistant-filter ${assistantFilter === value ? 'active' : ''}" data-action="filter-assistant" data-status="${escapeHtml(value)}" aria-pressed="${assistantFilter === value}"><span>${escapeHtml(label)}</span><strong>${count}</strong></button>`).join('');
  const visibleResults = results.filter(({ eligibility }) => assistantFilter === 'all' || eligibility.status === assistantFilter);
  const completeDifficulty = results.filter(({ difficulty }) => difficulty.score !== null).length;
  const completeFit = results.filter(({ fit }) => fit.score !== null).length;
  const mappedCutoffs = results.filter(({ difficulty }) => Number.isFinite(difficulty.components.find((item) => item.key === 'interviewCutoff')?.score)).length;
  const positionCompetition = results.filter(({ difficulty }) => Number.isFinite(difficulty.components.find((item) => item.key === 'qualifiedCompetition')?.score)).length;
  const excludedSnapshotPositions = results.filter(({ position, difficulty }) => {
    const competition = difficulty.components.find((item) => item.key === 'qualifiedCompetition');
    return !Number.isFinite(competition?.score) && dataset.observations.some((item) => item.observationType === 'qualified_snapshot'
      && Number(item.year) === Number(position.year) && item.positionCode === position.code);
  }).length;
  const evidenceSummary = `<section class="assistant-score-overview" aria-label="评分证据覆盖"><article><span>难度综合分</span><strong>${completeDifficulty}<small> / ${results.length} 岗</small></strong><p>六个固定权重分项全部有证据</p></article><article><span>适配综合分</span><strong>${completeFit}<small> / ${results.length} 岗</small></strong><p>硬筛通过且七个固定权重分项齐全</p></article><article><span>代码匹配的进面线</span><strong>${mappedCutoffs}<small> 岗</small></strong><p>仅计入高置信、同年度代码匹配</p></article><article><span>岗位级竞争比</span><strong>${positionCompetition}<small> 岗</small></strong><p>另有 ${excludedSnapshotPositions} 个岗位有多时点资格审查快照，未纳入本项评分</p></article></section>`;
  const cards = visibleResults.map(({ position, eligibility, difficulty, fit }, index) => {
    const cutoff = difficulty.components.find((item) => item.key === 'interviewCutoff');
    const competition = difficulty.components.find((item) => item.key === 'qualifiedCompetition');
    const snapshots = dataset.observations.filter((item) => item.observationType === 'qualified_snapshot'
      && Number(item.year) === Number(position.year) && item.positionCode === position.code)
      .sort((left, right) => String(left.observedAt).localeCompare(String(right.observedAt)));
    const latestSnapshot = snapshots.at(-1);
    const cutoffText = Number.isFinite(cutoff?.value)
      ? `有代码匹配的历史最低进面线 ${fmt(cutoff.value, 2)} 分`
      : '暂无代码匹配的岗位最低进面线';
    const competitionText = Number.isFinite(competition?.value)
      ? `岗位级资格审查通过竞争比为 ${fmt(competition.value, 2)}:1`
      : latestSnapshot
        ? `有 ${snapshots.length} 条第三方资格审查时点快照，最新为 ${latestSnapshot.observedAt}、${fmt(latestSnapshot.applicantsQualified)} 人；非最终报名或实考数据，未纳入岗位竞争比分项`
        : '暂无来源记录的岗位级资格审查竞争比';
    const positionEvidence = `${cutoffText}；${competitionText}。区级汇总不下放到职位。`;
    return `<article class="panel assistant-job ${assistantFilterChanged ? 'filter-enter' : ''}" style="--assistant-index:${Math.min(index, 7)}"><div class="assistant-job-top"><span class="year-pill">${position.year}</span>${chip(eligibility.status, statusTone(eligibility.status))}</div><h2>${escapeHtml(position.title)}</h2><p class="assistant-unit">${escapeHtml(position.unit)} · ${escapeHtml(position.orgType)} · 招录 ${fmt(position.recruitCount)} 人</p>${renderEligibilityChecks(eligibility, position)}${renderWorkPreferenceChecks(position)}<div class="reason-list"><div><span>${eligibility.majorCheck?.status === 'mismatch' ? '!' : eligibility.majorCheck?.status === 'match' ? '✓' : '·'}</span><p><strong>专业代码核验</strong><small>${escapeHtml(majorEligibilityText(position, storage.profile, eligibility))}</small></p></div><div><span>${eligibility.educationCheck?.status === 'mismatch' ? '!' : eligibility.educationCheck?.status === 'match' ? '✓' : '·'}</span><p><strong>学历条件核验</strong><small>${escapeHtml(educationEligibilityText(position, storage.profile, eligibility))}</small></p></div><div><span>—</span><p><strong>岗位竞争与进面分</strong><small>${escapeHtml(positionEvidence)}</small></p></div></div><div class="assistant-scores">${renderScoreBreakdown('难度', difficulty)}${renderScoreBreakdown('适配', fit)}</div><div class="assistant-actions"><button class="button button-quiet button-small" data-action="open-job" data-code="${position.code}">查看证据</button><button class="button button-quiet button-small" data-action="compare" data-code="${position.code}">加入比较 ⇄</button></div></article>`;
  }).join('');
  return `<div class="page-body"><div class="page-heading-row"><div><div class="eyebrow muted">ELIGIBILITY FIRST · EVIDENCE-WEIGHTED SCORES</div><h1>选岗助手</h1><p>先核对硬性条件，再看透明的难度与适配分项；缺失证据不会被重分配或估成零分。</p></div><a class="button button-secondary" href="#/profile">完善个人条件 →</a></div><div class="assistant-intro"><div class="assistant-icon">✦</div><div><strong>资格优先 · 分项透明</strong><p>个人信息字段已填写 ${complete} 项；“明确可报”仅在官方来源、完整条件和个人资料均可核对时出现。</p></div><span class="assistant-badge">不预测录取概率</span></div>${evidenceSummary}<div class="assistant-filterbar" role="group" aria-label="按资格核验结论筛选">${filterMarkup}</div><div class="assistant-grid">${cards || '<div class="empty-state assistant-empty">这一类暂时没有匹配职位。你可以补充个人资料，或查看其他核验结论。</div>'}</div><div class="notice notice-warning"><span>!</span><p>综合分按规格固定权重计算；任一分项缺证据就暂不汇总、不对剩余分项重新加权。当前缺少可用于岗位竞争比评分的样本、完整职位条件和个人限制匹配分布，因此合成分可能隐藏；另有多时点资格审查快照未纳入评分，这表示证据口径受限，不是零分，也不等于录取概率。</p></div></div>`;
}

function renderScenarios() {
  const year = Number(scenarioYear);
  const sample = getScoreSampleForYear(dataset.scoreSamples, year);
  const yearScoreRows = dataset.scoreRows.filter((row) => Number(row.year) === year && Number.isFinite(row.score));
  const scopeDefinitions = [
    ['all', '全部昌平'], ['district', '区直'], ['street', '街道'], ['town', '镇'],
    ['ordinary', '普通职位'], ['enforcement', '行政执法'], ['public-management', '公共管理相关'],
  ];
  const rowsByScope = Object.fromEntries(scopeDefinitions.map(([scope]) => [
    scope,
    filterScoreRowsBySegment(yearScoreRows, dataset.positions, scope),
  ]));
  const scoreRows = rowsByScope[scenarioScope] || rowsByScope.all;
  const scopeLabel = Object.fromEntries(scopeDefinitions.map(([scope, label]) => [scope, label]))[scenarioScope] || '全部昌平';
  const classifiedSampleCount = new Set(['ordinary', 'enforcement', 'public-management']
    .flatMap((scope) => rowsByScope[scope].map((row) => row.id))).size;
  const result = scoreAgainstSample(scenarioScore, sample, scoreRows);
  const scenarios = [125, 130, 135, 138, 140, 145].map((score, index) => {
    const band = scoreAgainstSample(score, sample, scoreRows);
    const label = band.coverageRate === null ? '暂无样本' : `${fmtPct(band.coverageRate)} · ${band.coveredPositions}/${band.totalPositions}`;
    return `<div class="scenario-row ${score === scenarioScore ? 'selected' : ''}" style="--scenario-index:${index}"><strong>${score}</strong><div class="scenario-bar"><span style="width:${band.coverageRate === null ? 0 : Math.round(band.coverageRate * 100)}%"></span></div><span>${escapeHtml(label)}</span></div>`;
  }).join('');
  const rows = scoreRows.map((row, index) => {
    const mapping = row.positionCode
      ? `职位代码 ${row.positionCode}`
      : row.mappingConfidence === 'ambiguous' ? '同名岗位有歧义' : '尚未匹配职位代码';
    return `<tr style="--scenario-index:${index}"><td><strong>${escapeHtml(row.unit || row.name)}</strong><small class="cell-secondary">${escapeHtml(row.title || '')}</small></td><td><span class="year-pill">${escapeHtml(row.orgType)}</span></td><td><strong>${fmt(row.score, 2)} 分</strong></td><td>${escapeHtml(mapping)}</td><td>${sourceLink(row.sourceId, '查看原始样例来源 ↗')}</td></tr>`;
  }).join('');
  const scores = scoreRows.map((row) => row.score);
  const minimum = scores.length ? Math.min(...scores) : null;
  const maximum = scores.length ? Math.max(...scores) : null;
  const sampleRange = sample && scoreRows.length
    ? `<div class="sample-range"><div class="sample-range-title"><span>岗位最低进面线范围</span><span>${fmt(minimum, 2)} — ${fmt(maximum, 2)}</span></div><div class="range-track"><span class="sample-track"></span><span class="score-marker" style="left:${Math.max(0, Math.min(100, (scenarioScore - 100) * 2))}%"></span></div><div class="sample-caption">${year} 年「${escapeHtml(scopeLabel)}」纳入 ${scoreRows.length} 条具名岗位分数线；当前目标分覆盖 ${result.coveredPositions} 条（${fmtPct(result.coverageRate)}），不是进面概率。</div></div><div class="score-ecdf-heading"><strong>历史岗位进面线分布</strong><span>${year} · ECDF · n=${scoreRows.length}</span></div>${scoreEcdfSvg(scoreRows, year, scenarioScore)}`
    : `<div class="notice notice-warning scenario-no-sample"><span>!</span><p>${year} 年「${escapeHtml(scopeLabel)}」暂无可追溯的具名岗位进面分记录；不借用其他组别或年度样本。</p></div>`;
  const yearOptions = [2024, 2025, 2026].map((item) => `<option value="${item}" ${scenarioYear === String(item) ? 'selected' : ''}>${item} 年</option>`).join('');
  const scopeOptions = scopeDefinitions.map(([scope, label]) => `<option value="${scope}" ${scenarioScope === scope ? 'selected' : ''}>${label} · n=${rowsByScope[scope].length}</option>`).join('');
  const coverage = result.coverageRate === null ? '暂无可比样本' : `${fmtPct(result.coverageRate)} · ${result.coveredPositions}/${result.totalPositions} 条岗位线`;
  const sliderProgress = Math.round(Math.max(0, Math.min(100, ((scenarioScore - 120) / 30) * 100)));
  return `<div class="page-body"><div class="page-heading-row"><div><div class="eyebrow muted">HISTORICAL SCORE CONTEXT</div><h1>分数情景</h1><p>逐年对照当前可追溯样本；历史线覆盖比例不是个人进面概率。</p></div><div class="heading-actions scenario-actions"><label class="scenario-year-field"><span>查看年度</span><select id="scenario-year" aria-label="分数样本年度">${yearOptions}</select></label><label class="scenario-scope-field"><span>样本分组</span><select id="scenario-scope" aria-label="分数样本分组">${scopeOptions}</select></label>${chip('不预测录取概率', 'blue-soft')}</div></div><div class="scenario-layout"><section class="panel scenario-main"><div class="panel-heading"><div><div class="eyebrow muted">YOUR TARGET · ${year} · ${escapeHtml(scopeLabel)}</div><h2>试算目标分</h2></div><span class="scenario-score-display">${scenarioScore}<small> 分</small></span></div><input id="scenario-slider" class="score-slider" type="range" min="120" max="150" step="1" value="${scenarioScore}" style="--score-progress:${sliderProgress}%" aria-label="目标分"/><div class="range-labels"><span>120</span><span>135</span><span>150</span></div><div class="scenario-result"><div class="scenario-result-number">${scenarioScore}</div><div><strong>${escapeHtml(result.label)}</strong><p id="scenario-coverage">${year} 年历史最低进面线覆盖 · ${coverage}</p></div></div>${sampleRange}</section><section class="panel scenario-presets"><div class="panel-heading"><div><div class="eyebrow muted">REFERENCE POINTS</div><h2>目标分参考点</h2></div></div><div class="scenario-list">${scenarios}</div><div class="notice notice-soft compact-notice"><span>ⓘ</span><p>覆盖率 = 历史最低进面线 ≤ 目标分的岗位数 ÷ 当前所选分组的具名岗位分数行。</p></div></section></div><div class="panel table-panel"><div class="panel-heading"><div><div class="eyebrow muted">POSITION-NAMED EXAMPLES · ${year} · ${escapeHtml(scopeLabel)}</div><h2>${year} 年${escapeHtml(scopeLabel)}具体岗位最低进面线</h2></div><span class="panel-hint">${scoreRows.length} 条 · ${scoreRows.filter((row) => row.mappingConfidence === 'high' && row.positionCode).length} 条代码已核对</span></div><div class="table-scroll"><table class="data-table scenario-table"><thead><tr><th>单位 / 岗位</th><th>单位类型</th><th>最低进面线</th><th>代码匹配</th><th>来源</th></tr></thead><tbody>${rows || `<tr><td colspan="5"><div class="table-empty compact-empty">${year} 年「${escapeHtml(scopeLabel)}」暂无可追溯的具体岗位分数记录。</div></td></tr>`}</tbody></table></div><small class="table-footnote">分数来自第三方页面可见样例；“全部昌平”与单位类型分组不代表年度全量。岗位类别仅纳入代码、单位与岗位名均唯一匹配的分数记录（当前年度 ${classifiedSampleCount} 条），未匹配样本不猜分组。</small></div><div class="notice notice-warning"><span>!</span><p>岗位最低进面线不等于笔试合格线。代码未唯一匹配的行仅参与“全部昌平”及单位类型统计，不进入岗位类别筛选。</p></div></div>`;
}

function renderMatrix() {
  const groups = ['区直', '街道', '镇', '垂直/驻区'];
  const cells = groups.map((group) => {
    const jobs = dataset.positions.filter((position) => position.orgType === group);
    const recruits = jobs.reduce((sum, position) => sum + (Number(position.recruitCount) || 0), 0);
    const years = [...new Set(jobs.map((position) => position.year))].sort();
    const symbol = group === '区直' ? '▤' : group === '街道' ? '⌂' : group === '镇' ? '⌖' : '↗';
    return `<article class="panel matrix-card"><div class="matrix-top"><span class="matrix-symbol">${symbol}</span>${chip(`${jobs.length} 条样例`, 'blue-soft')}</div><h2>${group}</h2><div class="matrix-numbers"><div><strong>${jobs.length}</strong><small>职位候选</small></div><div><strong>${recruits || '—'}</strong><small>已知招录人数</small></div></div><div class="matrix-years"><span>涉及年度</span><strong>${years.length ? years.join(' · ') : '暂无收录'}</strong></div><div class="matrix-bottom">岗位级报名数：<strong>暂无可核验数据</strong></div></article>`;
  }).join('');
  return `<div class="page-body"><div class="page-heading-row"><div><div class="eyebrow muted">CHANGPING · SAMPLE COVERAGE</div><h1>昌平竞争矩阵</h1><p>这里展示的是数据库当前样例覆盖，不是完整行政区职位地图或年度总量。</p></div>${chip('样例覆盖', 'amber')}</div><div class="matrix-grid">${cells}</div><div class="panel conflict-panel"><div class="panel-heading"><div><div class="eyebrow muted">ANNUAL SUMMARY CONFLICTS</div><h2>年度职位汇总待逐码核验</h2></div><a href="#/evidence" class="panel-link">查看覆盖与冲突中心 →</a></div><p class="coverage-intro">各年第三方汇总范围与逐条来源已集中在研究发现页。这里不重复展示静态总数，也不据此推断单位冷热。</p></div><div class="notice notice-warning"><span>!</span><p>在官方原始职位表导入并逐代码账前，不把第三方统计合并成唯一年度总量，也不推断“高竞争街道”或“低竞争单位”。</p></div></div>`;
}

function renderProfile() {
  const profile = storage.profile;
  const field = (key, label, hint = '', type = 'text', options = []) => `<label class="form-field"><span>${escapeHtml(label)}</span>${options.length ? `<select name="${key}"><option value="">请选择 / 未知</option>${options.map((option) => `<option value="${escapeHtml(option)}" ${profile[key] === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select>` : `<input name="${key}" type="${type}" value="${escapeHtml(profile[key] || '')}" ${type === 'number' ? 'min="0"' : ''} placeholder="尚未填写"/>`}${hint ? `<small>${escapeHtml(hint)}</small>` : ''}</label>`;
  const degree = String(profile.degree || '').replace(/\s/g, '');
  const isUndergraduate = /本科|学士/.test(degree);
  const isGraduate = /研究生|硕士|博士/.test(degree);
  const undergraduateMajor = profile.undergraduateMajor || (isUndergraduate ? profile.major : '');
  const undergraduateMajorCode = profile.undergraduateMajorCode || (isUndergraduate ? profile.majorCode : '');
  const graduateMajor = profile.graduateMajor || (isGraduate ? profile.major : '');
  const graduateMajorCode = profile.graduateMajorCode || (isGraduate ? profile.majorCode : '');
  const legacyMajor = !isUndergraduate && !isGraduate && (profile.major || profile.majorCode);
  const avatarText = graduateMajor || undergraduateMajor || profile.major || '考';
  return `<div class="page-body"><div class="page-heading-row"><div><div class="eyebrow muted">LOCAL PROFILE · BROWSER ONLY</div><h1>个人报考资料</h1><p>仅在这台设备的浏览器加密保存，不上传、不回写原始工作簿。</p></div><span class="private-pill">▣ 本地隐私</span></div><div class="profile-layout"><form id="profile-form" class="panel profile-form"><div class="panel-heading"><div><div class="eyebrow muted">BASIC INFORMATION</div><h2>基本条件</h2></div>${chip('由你确认', 'blue-soft')}</div><div class="form-grid">${field('undergraduateMajor', '本科专业', '按本科毕业证 / 学位材料填写。')}${field('undergraduateMajorCode', '本科专业代码', '例如 1204；请核对官方专业目录，不自动推断。')}${field('graduateMajor', '研究生专业', '无研究生学历可留空。')}${field('graduateMajorCode', '研究生专业代码', '例如 1204 或 1252；按研究生阶段填写。')}${field('degree', '最高学历', '建议填写：大专、本科、硕士研究生或博士研究生。')}${field('degreeType', '最高学位类型', '', 'select', ['学术学位', '专业学位', '其他'])}${field('graduationStatus', '毕业身份', '', 'select', ['应届毕业生', '非应届 / 社会人员', '留学回国人员', '其他'])}${field('graduationYear', '毕业年份', '', 'number')}${field('politicalStatus', '政治面貌', '', 'select', ['中共党员', '共青团员', '群众', '其他'])}${field('hukou', '户籍', '按职位表口径填写；未知时留空。')}${field('studentOrigin', '生源地', '与户籍分开记录；职位要求不明确时人工核对。')}${field('grassrootsYears', '基层工作经历（年）', '', 'number')}${field('credentials', '资格证书 / 职业资质', '多个项目可用逗号分隔。')}${field('retiredStatus', '退役身份', '', 'select', ['是', '否'])}${field('grassrootsProjectStatus', '服务基层项目人员资格', '如不确定请留空并人工核对。', 'select', ['是', '否'])}</div><div class="profile-preferences"><div class="eyebrow muted">PREFERENCES · NOT ELIGIBILITY</div><div class="form-grid">${field('preferredTypes', '偏好的岗位类型', '偏好不会替代硬性资格审查。')}${field('preferredLocation', '地点偏好', '', 'text')}${field('acceptAdministrativeEnforcement', '是否接受行政执法岗', '', 'select', ['接受', '不接受', '待确认'])}${field('acceptPhysicalTest', '是否接受体测', '', 'select', ['接受', '不接受', '待确认'])}${field('acceptNightShift', '是否接受夜班', '', 'select', ['接受', '不接受', '待确认'])}${field('acceptTown', '是否接受镇', '', 'select', ['接受', '不接受', '待确认'])}${field('prioritizeStreet', '是否优先街道', '', 'select', ['优先', '不优先', '待确认'])}${field('prioritizeDistrict', '是否优先区直', '', 'select', ['优先', '不优先', '待确认'])}</div></div><div class="form-actions"><button type="submit" class="button button-primary">加密保存</button><span id="profile-save-status">${Object.keys(profile).filter((key) => profile[key]).length} 项已有内容</span></div></form><aside class="profile-aside"><div class="panel profile-summary"><span class="summary-avatar">${escapeHtml(avatarText.slice(0, 1))}</span><div><strong>个人条件摘要</strong><small>不会自动判定岗位资格</small></div><div class="summary-line"><span>本科专业</span><strong>${escapeHtml(undergraduateMajor || '待补充')}</strong></div><div class="summary-line"><span>本科代码</span><strong>${escapeHtml(undergraduateMajorCode || '待补充')}</strong></div><div class="summary-line"><span>研究生专业</span><strong>${escapeHtml(graduateMajor || '待补充')}</strong></div><div class="summary-line"><span>研究生代码</span><strong>${escapeHtml(graduateMajorCode || '待补充')}</strong></div><div class="summary-line"><span>最高学历</span><strong>${escapeHtml(profile.degree || '待补充')}</strong></div>${legacyMajor ? `<div class="notice notice-soft compact-notice"><span>ⓘ</span><p>检测到未分层的旧专业记录“${escapeHtml([profile.major, profile.majorCode].filter(Boolean).join(' · '))}”；请核实学历层级后手动填入对应栏，系统不会自动归类。</p></div>` : ''}<div class="summary-line"><span>服务基层项目</span><strong>${escapeHtml(profile.grassrootsProjectStatus || '待确认')}</strong></div><div class="summary-line"><span>身份 / 户籍 / 生源</span><strong>${profile.graduationStatus || profile.hukou || profile.studentOrigin ? '部分填写' : '待补充'}</strong></div><div class="notice notice-soft compact-notice"><span>ⓘ</span><p>专业资格按最高学历对应代码核对；该层级缺代码时保持待核，不借用另一学历阶段的代码。</p></div></div><div class="panel privacy-card"><span>▣</span><strong>数据留在本机</strong><p>解锁期间的数据只在内存中明文使用；localStorage 只保存加密信封。清理浏览器数据会同时删除这些记录。</p></div><section class="panel backup-panel"><div class="backup-panel-heading"><div><strong>个人数据加密备份</strong><small>备份需档案密码才能恢复；不含职位库或原始 Excel</small></div><span aria-hidden="true">↗</span></div><div class="backup-actions"><button type="button" class="button button-secondary" data-action="backup-export">下载加密备份</button><button type="button" class="button button-quiet" data-action="backup-choose">恢复备份</button><input id="backup-import-file" type="file" accept="application/json,.json" hidden/></div></section></aside></div></div>`;
}

function renderCoveragePanel() {
  const coverage = summarizePositionCoverage(dataset);
  const rows = coverage.map((row) => {
    const rangeSamples = row.rangeSamples.length
      ? row.rangeSamples.map((sample) => `${fmt(sample.reportedPositions)} 个来源报告样本岗位（${escapeHtml(sample.scope)}；${sample.complete ? '标记完整' : '部分样本'}）${sample.sourceId ? sourceLink(sample.sourceId, '来源 ↗') : ''}`).join('<br/>')
      : '暂无可追溯的年度范围样本';
    const secondaryReference = row.secondaryReference
      ? `${row.visiblePositions} / ${fmt(row.secondaryReference.reportedPositionCount)} 岗（${fmtPct(row.secondaryReference.visiblePositionRatio)}）<br/>${row.knownRecruitCount} / ${fmt(row.secondaryReference.reportedRecruitCount)} 人（${fmtPct(row.secondaryReference.knownRecruitRatio)}）<small class="cell-secondary">样例 / 第三方汇总对照 · ${sourceLink(row.secondaryReference.sourceId, '汇总来源 ↗')}</small>`
      : '暂无可比第三方年度总量';
    return `<tr><td><span class="year-pill">${row.year}</span></td><td>${row.visiblePositions} 条样例</td><td>${row.knownRecruitCount} 人已知 <small class="cell-secondary">${row.unknownRecruitPositions ? `${row.unknownRecruitPositions} 条样例人数未知` : '样例人数均有记录'}</small></td><td>${row.namedScoreExamples} 条岗位名分数样例</td><td>${rangeSamples}</td><td>${secondaryReference}</td><td>${chip('COVERAGE: INCOMPLETE', 'amber')}</td></tr>`;
  }).join('');
  const coverage2026 = coverage.find((row) => row.year === 2026);
  const unitGaps = coverage2026?.unitGaps || [];
  const completePositionGap = unitGaps.every((gap) => Number.isFinite(gap.missingPositions));
  const completeRecruitGap = unitGaps.every((gap) => Number.isFinite(gap.missingRecruits));
  const positionGapTotal = completePositionGap ? unitGaps.reduce((sum, gap) => sum + gap.missingPositions, 0) : null;
  const recruitGapTotal = completeRecruitGap ? unitGaps.reduce((sum, gap) => sum + gap.missingRecruits, 0) : null;
  const unitGapRows = unitGaps.map((gap) => {
    const recruitComparison = gap.missingRecruits === null
      ? `${gap.importedRecruits} 人已知 · 其余待核`
      : `${gap.importedRecruits} / ${gap.reportedRecruits} 人`;
    const difference = `${gap.missingPositions === null ? '岗位数待核' : `${gap.missingPositions} 岗`}${gap.missingRecruits === null ? ' · 招录人数待核' : ` · ${gap.missingRecruits} 人`}`;
    return `<tr><th scope="row">${escapeHtml(gap.unit)}</th><td>${gap.importedPositions} / ${fmt(gap.reportedPositions)} 岗<br/><small class="cell-secondary">${escapeHtml(recruitComparison)}</small></td><td>${escapeHtml(difference)}</td></tr>`;
  }).join('');
  const unitGapPanel = unitGaps.length
    ? `<section class="panel unit-gap-panel"><div class="panel-heading"><div><div class="eyebrow muted">UNIT-LEVEL RECONCILIATION · 2026</div><h2>职位明细缺口定位</h2></div>${positionGapTotal !== null && recruitGapTotal !== null ? chip(`待补 ${positionGapTotal} 岗 · ${recruitGapTotal} 人`, 'amber') : chip('单位级来源对照', 'amber')}</div><p class="coverage-intro">按华图分类页的单位汇总与当前逐岗样例做单位名称对照。以下数字只是二手线索；未取得逐岗代码前不补造职位记录，也不视为官方核验。${sourceLink('huatu-2026-list', '查看单位汇总来源 ↗')}</p><div class="table-scroll"><table class="data-table unit-gap-table"><thead><tr><th>招录单位</th><th>当前样例 / 来源汇总</th><th>待补差额</th></tr></thead><tbody>${unitGapRows}</tbody></table></div><p class="table-footnote">岗位明细页暂不可读；单位总量与明细可能存在来源口径差异，后续需以官方职位表逐码核对。</p></section>`
    : '';
  return `<section class="panel coverage-panel"><div class="panel-heading"><div><div class="eyebrow muted">YEARLY COVERAGE · 2024 — 2026</div><h2>职位与分数样本覆盖</h2></div>${chip('全量分母未核实', 'amber')}</div><p class="coverage-intro">下表只统计当前网站中可见且有来源的样例。各年度官方全量覆盖率仍不计算；有第三方汇总时仅作条目数对照，不代表官方覆盖率。样例人数缺失也不会按 0 人计。</p><div class="table-scroll"><table class="data-table coverage-table"><thead><tr><th>年度</th><th>职位样例</th><th>已知招录数</th><th>岗位名分数</th><th>范围样本</th><th>第三方总量对照</th><th>覆盖标记</th></tr></thead><tbody>${rows}</tbody></table></div></section>${unitGapPanel}`;
}

function formatEvidenceRange(metric, unit) {
  if (!Number.isFinite(metric.minimum)) return '暂无可靠数据';
  return metric.minimum === metric.maximum
    ? `${fmt(metric.minimum)} ${unit}`
    : `${fmt(metric.minimum)}–${fmt(metric.maximum)} ${unit}`;
}

function renderEvidenceMetric(title, metric, unit) {
  const sourceValues = metric.values.map((item) => {
    const source = sourceFor(item.sourceId);
    return `<li><span>${escapeHtml(source?.title || '来源待核验')}</span><strong>${fmt(item.value)} ${unit}</strong>${sourceLink(item.sourceId, '↗')}</li>`;
  }).join('');
  return `<div class="evidence-metric"><div class="evidence-metric-heading"><span>${escapeHtml(title)}</span><strong>${escapeHtml(formatEvidenceRange(metric, unit))}</strong></div>${sourceValues ? `<ul class="evidence-source-values">${sourceValues}</ul>` : '<p class="evidence-no-values">没有可追溯的来源汇总值。</p>'}</div>`;
}

function renderResearch() {
  const findings = buildResearchFindings(dataset);
  const topics = ['岗位覆盖', '分数样本', '专业资格', '报考竞争'];
  const visibleFindings = researchTopic === 'all'
    ? findings
    : findings.filter((item) => item.topic === researchTopic);
  const coverage2026 = findings.find((item) => item.id === 'coverage-2026')?.facts;
  const scoreSample = findings.find((item) => item.id === 'score-sample-2026')?.facts;
  const competition = findings.find((item) => item.id === 'competition-grain')?.facts;
  const cards = visibleFindings.map((item, index) => {
    const sources = item.sourceIds.map((sourceId) => {
      const source = sourceFor(sourceId);
      return source ? `<li>${sourceLink(sourceId, source.title)}</li>` : '';
    }).filter(Boolean).join('');
    return `<article class="research-finding" data-topic="${escapeHtml(item.topic)}" style="--finding-index:${index}"><div class="research-finding-top"><span class="research-finding-number">${String(index + 1).padStart(2, '0')}</span><span class="research-topic-label">${escapeHtml(item.topic)}</span><span class="research-finding-icon">${item.icon}</span></div><div class="research-finding-copy"><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.summary)}</p></div><details class="research-evidence"><summary><span>查看证据与限制</span><span class="research-evidence-chevron">⌄</span></summary><div class="research-evidence-body"><p>${escapeHtml(item.evidence)}</p>${sources ? `<ul class="research-source-list">${sources}</ul>` : '<span class="research-no-source">暂无可展开的原始来源条目</span>'}</div></details><a class="research-finding-link" href="${escapeHtml(item.href)}">${escapeHtml(item.actionLabel)} <span>↗</span></a></article>`;
  }).join('');
  const emptyState = visibleFindings.length ? '' : '<div class="research-empty-state">该主题暂时没有可展示的结论。</div>';
  return `<div class="page-body research-page">
    <section class="research-hero"><div class="research-hero-copy"><div class="eyebrow">RESEARCH BRIEF · ${escapeHtml(dataset.dataAsOf)}</div><h1>研究结论</h1><p><strong>结论先行，证据可回查。</strong>以下仅总结当前网站收录的样例与来源，不把缺失数据补成事实。</p><div class="research-hero-actions"><a class="button button-light" href="#/evidence">查看覆盖核验 <span>↗</span></a><a class="research-source-jump" href="#/sources">浏览来源登记 →</a></div></div><div class="research-hero-art" aria-hidden="true"><div class="research-orbit research-orbit-one"></div><div class="research-orbit research-orbit-two"></div><div class="research-orbit research-orbit-three"></div><div class="research-orb"></div><span class="research-orb-label">DATA<br/>→ EVIDENCE<br/>→ INSIGHT</span></div></section>
    <section class="research-quickfacts" aria-label="当前数据快照"><article><span>2026 岗位样例 / 第三方汇总</span><strong>${coverage2026 ? `${fmt(coverage2026.samplePositions)}<small> / ${fmt(coverage2026.reportedPositions[1])} 岗</small>` : '—'}</strong><p>${coverage2026 ? `${fmt(coverage2026.sampleRecruits)} / ${fmt(coverage2026.reportedRecruits[1])} 人 · 非官方全量对照` : '当前无可比数据'}</p></article><article><span>具名面试分数样本</span><strong>${scoreSample ? `${fmt(scoreSample.sampleRows)}<small> 条</small>` : '—'}</strong><p>${scoreSample ? `部分样本 · ${fmt(scoreSample.sampleRecruits)} 人` : '当前无可追溯样本'}</p></article><article><span>岗位级资格审查快照</span><strong>${competition ? `${fmt(competition.jobLevelObservations)}<small> 条</small>` : '—'}</strong><p>${competition ? `覆盖 ${fmt(competition.jobLevelPositions)} 个岗位 · 另有 ${fmt(competition.aggregateObservations)} 条区级 / 单位级观察` : '当前无可追溯观察'}</p></article></section>
    <section class="research-findings-section"><div class="research-section-heading"><div><div class="eyebrow muted">EVIDENCE-LED FINDINGS</div><h2>值得带走的结论</h2><p>按主题筛选；展开卡片可核对支撑来源与解释边界。</p></div><div class="research-result-count" aria-live="polite">显示 ${visibleFindings.length} / ${findings.length} 条</div></div><div class="research-filterbar" role="group" aria-label="按结论主题筛选">${[['all', '全部结论'], ...topics.map((topic) => [topic, topic])].map(([topic, label]) => {
      const count = topic === 'all' ? findings.length : findings.filter((item) => item.topic === topic).length;
      return `<button type="button" class="research-topic-button ${researchTopic === topic ? 'active' : ''}" data-action="filter-research-topic" data-topic="${escapeHtml(topic)}" aria-pressed="${researchTopic === topic}"><span>${escapeHtml(label)}</span><small>${count}</small></button>`;
    }).join('')}</div><div class="research-findings-grid" aria-live="polite">${cards}${emptyState}</div></section>
    <section class="research-next-step"><span class="research-next-icon">↗</span><div><strong>把样例当线索，把官方职位表当准绳</strong><p>下一步可从覆盖缺口进入职位库逐条核验，或完善个人条件后再用选岗助手。</p></div><a class="button button-secondary" href="#/positions">打开昌平职位库</a></section>
  </div>`;
}

function renderEvidence() {
  const annual = summarizeAnnualConflicts(dataset.conflicts);
  const visibleAnnual = evidenceYear === 'all' ? annual : annual.filter((item) => item.year === Number(evidenceYear));
  const statusLabel = { conflicting: '来源数值有差异', aligned: '多源数值一致', 'single-source': '单一来源', unattributed: '来源待关联', unavailable: '暂无年度汇总' };
  const cards = visibleAnnual.map((item) => {
    const sourceNotes = item.sourceNotes.map(({ sourceId, notes }, index) => {
      const source = sourceFor(sourceId);
      const title = source?.title || sourceId;
      const level = source ? sourceLevelLabel(source.level) : '未登记来源';
      const tone = source?.level === 'official' ? 'green' : source ? 'amber' : 'neutral';
      const noteItems = notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('');
      return `<li class="evidence-source-note" style="--source-note-index:${index}"><div class="evidence-source-note-copy"><div class="evidence-source-note-heading"><strong>${escapeHtml(title)}</strong>${chip(level, tone)}</div><ul>${noteItems}</ul></div>${source ? sourceLink(sourceId, '打开来源 ↗') : ''}</li>`;
    }).join('');
    const sourceNotesDisclosure = sourceNotes
      ? `<details class="evidence-source-notes"><summary><span>展开来源统计口径</span><span class="evidence-source-note-count">${item.sourceNotes.length} 项</span></summary><ol>${sourceNotes}</ol></details>`
      : '';
    return `<article class="panel evidence-year-card evidence-${item.status}"><div class="evidence-year-card-head"><div><span class="evidence-year-kicker">EXAM YEAR</span><h2>${item.year}</h2></div>${chip(statusLabel[item.status] || '待核验', item.status === 'conflicting' ? 'amber' : 'blue-soft')}</div><div class="evidence-metrics">${renderEvidenceMetric('职位数', item.positionCount, '岗')}${renderEvidenceMetric('计划招录人数', item.recruitCount, '人')}</div><div class="evidence-year-foot"><span>${item.sourceCount} 个可识别来源 · 保留各源原值</span><a href="#/sources">来源列表 →</a></div>${sourceNotesDisclosure}</article>`;
  }).join('');
  const observations = dataset.observations || [];
  const positionObservations = observations.filter((item) => item.positionCode !== null && item.positionCode !== undefined && item.positionCode !== '');
  const unitObservations = observations.filter((item) => item.scope === 'unit-level').length;
  const aggregateObservations = observations.length - positionObservations.length;
  const districtObservations = aggregateObservations - unitObservations;
  const positionCodes = new Set(positionObservations.map((item) => item.positionCode));
  const positionTimes = new Set(positionObservations.map((item) => item.observedAt).filter(Boolean));
  const positionSnapshotRows = positionObservations
    .filter((item) => item.observationType === 'qualified_snapshot')
    .slice()
    .sort((left, right) => String(left.observedAt).localeCompare(String(right.observedAt)))
    .map((item) => {
      const position = dataset.positions.find((row) => Number(row.year) === Number(item.year) && row.code === item.positionCode);
      const source = sourceFor(item.sourceId);
      const sourceMarkup = source
        ? `<a class="text-link" href="${escapeHtml(safeUrl(source.url))}" target="_blank" rel="noreferrer">${escapeHtml(source.publisher)} ↗</a>`
        : '<span>来源待登记</span>';
      return `<tr><td>${escapeHtml(item.observedAt || '—')}</td><td><span class="year-pill">${escapeHtml(item.positionCode)}</span></td><td>${escapeHtml(position?.unit || '单位待核验')}<small class="cell-secondary">${escapeHtml(position?.title || '职位待核验')}</small></td><td><strong>${fmt(item.applicantsQualified)} 人</strong></td><td>${fmt(item.recruitCount ?? position?.recruitCount)} 人</td><td>${sourceMarkup}</td></tr>`;
    }).join('');
  const latestScoreSample = [...(dataset.scoreSamples || [])].sort((a, b) => Number(a.year) - Number(b.year)).at(-1);
  const namedScores = latestScoreSample ? dataset.scoreRows.filter((item) => Number(item.year) === Number(latestScoreSample.year)) : [];
  const linkedScoreRows = namedScores.filter((item) => item.positionCode && dataset.positions.some((position) => position.code === item.positionCode));
  const officialPositionCount = dataset.positions.filter((item) => item.sourceLevel === 'official').length;
  const yearCount = new Set(dataset.positions.map((item) => Number(item.year)).filter(Number.isFinite)).size;
  const scoreSummary = latestScoreSample ? `${fmt(latestScoreSample.samplePositions)} 岗 / ${fmt(latestScoreSample.sampleRecruits)} 人` : '暂无可用样本';
  const tabs = [['all', '全部年度'], ['2024', '2024'], ['2025', '2025'], ['2026', '2026']]
    .map(([value, label]) => `<button type="button" class="evidence-year-tab ${evidenceYear === value ? 'active' : ''}" data-action="filter-evidence-year" data-year="${value}" aria-pressed="${evidenceYear === value}">${label}</button>`).join('');
  return `<div class="page-body">
    <section class="evidence-hero"><div class="evidence-hero-copy"><div class="eyebrow">EVIDENCE · ${escapeHtml(dataset.dataAsOf)}</div><h1>先看清证据，<br/><em>再做选岗决定。</em></h1><p>查看年度覆盖、来源差异与数据边界。每个数字都能回到对应来源，不用在报告和职位页之间来回找。</p><div class="evidence-hero-actions"><a href="#/positions" class="button button-light">查看职位样例 <span>↗</span></a><a href="#/sources" class="evidence-hero-link">浏览全部来源 →</a></div></div><div class="evidence-hero-art" aria-hidden="true"><div class="evidence-orbit evidence-orbit-one"></div><div class="evidence-orbit evidence-orbit-two"></div><div class="evidence-core"></div><span class="evidence-signal signal-one"></span><span class="evidence-signal signal-two"></span><span class="evidence-art-label">SOURCE<br/>→ REVIEW<br/>→ DECISION</span></div></section>
    <section class="metric-grid four-metrics evidence-topline">${metric('有来源职位样例', `${dataset.positions.length}<small> 条</small>`, `${officialPositionCount} 条直接标为官方来源`, '▤', 'blue')}${metric('覆盖招考年度', `${yearCount}<small> 年</small>`, '2024–2026 历史记录', '◷', 'mint')}${metric('岗位级资格审查快照', `${positionObservations.length}<small> 条</small>`, `覆盖 ${positionCodes.size} 个岗位 · ${positionTimes.size} 个时点`, '⌁', 'amber')}${metric('存在分数样本年度', `${new Set((dataset.scoreSamples || []).map((item) => item.year)).size}<small> 年</small>`, '范围样本不等于完整分布', '◎', 'purple')}</section>
    <section class="evidence-section"><div class="evidence-section-heading"><div><div class="eyebrow muted">SOURCE RECONCILIATION</div><h2>年度职位汇总对照</h2><p>保留各来源自己的数字，不把有差异的统计拼成单一“确定值”。</p></div><div class="evidence-year-tabs" role="group" aria-label="筛选年度">${tabs}</div></div><div class="evidence-year-grid">${cards}</div></section>
    <section class="evidence-section"><div class="evidence-section-heading"><div><div class="eyebrow muted">WHAT THE DATA SUPPORTS</div><h2>目前可以确认到哪里</h2><p>结论仅代表当前导入数据；补齐原始职位表后会重新核验。</p></div></div><div class="evidence-insight-grid"><article class="evidence-insight-card"><span class="evidence-insight-icon icon-amber">↔</span><div><small>报名 / 竞争</small><strong>${districtObservations} 条区级观察 · ${unitObservations} 条单位级观察 · ${positionObservations.length} 条岗位级快照</strong><p>岗位级数据覆盖 ${positionCodes.size} 个职位代码的 ${positionTimes.size} 个时点；仍是第三方转载的资格审查通过人数，不是最终报名、缴费或实考人数。</p><a href="#/sources">查看报名来源与口径 →</a></div></article><article class="evidence-insight-card"><span class="evidence-insight-icon icon-blue">⌁</span><div><small>${latestScoreSample ? `${latestScoreSample.year} 面试分数范围样本` : '面试分数'}</small><strong>${escapeHtml(scoreSummary)}</strong><p>${latestScoreSample ? `范围样本标记为${latestScoreSample.complete ? '完整' : '部分'}；${namedScores.length} 条具名分数中 ${linkedScoreRows.length} 条匹配已收录职位代码。` : '当前没有可追溯的岗位级进面分范围样本。'}笔试合格线不当作岗位实际进面线。</p>${latestScoreSample ? sourceLink(latestScoreSample.sourceId, '打开样本来源 ↗') : '<a href="#/sources">查看来源登记 →</a>'}</div></article><article class="evidence-insight-card"><span class="evidence-insight-icon icon-mint">✓</span><div><small>职位记录状态</small><strong>${officialPositionCount} / ${dataset.positions.length} 条样例直接标为官方来源</strong><p>官方职位简章入口已登记，但候选行尚未完成职位代码逐项核对；当前样例数不代表全区覆盖率。</p><a href="#/positions">回到职位库核对字段 →</a></div></article></div></section>
    <section class="evidence-section registration-snapshot-section"><div class="evidence-section-heading"><div><div class="eyebrow muted">POSITION-LEVEL REGISTRATION · 2026</div><h2>岗位级资格审查快照</h2><p>按职位代码和时点展示已找到的第三方逐岗数据，便于查看同一岗位在不同时间的变化。</p></div><span class="chip chip-amber">第三方转载</span></div><div class="panel table-panel"><div class="table-scroll"><table class="data-table registration-snapshot-table"><thead><tr><th>统计时点</th><th>职位代码</th><th>招录单位 / 职位</th><th>资格审查通过</th><th>计划招录</th><th>原始来源</th></tr></thead><tbody>${positionSnapshotRows || '<tr><td colspan="6"><div class="table-empty compact-empty">暂无可回查的岗位级资格审查快照。</div></td></tr>'}</tbody></table></div><p class="table-footnote">同一职位的多个时间点是重复快照，不应累加为岗位数；资格审查通过人数不等同最终报名人数、缴费人数或实考人数。</p></div></section>
    ${renderCoveragePanel()}
    <section class="evidence-next-step"><span class="evidence-next-icon">↗</span><div><strong>下一步：补齐职位代码级证据</strong><p>先按官方职位表复核候选行，再更新年度覆盖分母与专业、学历和身份限制字段。</p></div><a class="button button-secondary" href="#/sources">查看官方来源入口</a></section>
  </div>`;
}

function renderSources() {
  const positionSnapshots = dataset.observations.filter((item) => item.observationType === 'qualified_snapshot'
    && item.positionCode !== null && item.positionCode !== undefined && item.positionCode !== '');
  const positionSnapshotCount = new Set(positionSnapshots.map((item) => item.positionCode)).size;
  const positionSnapshotTimes = new Set(positionSnapshots.map((item) => item.observedAt).filter(Boolean)).size;
  const filtered = dataset.sources.filter((source) => {
    if (filters.sourceLevel !== 'all' && source.level !== filters.sourceLevel) return false;
    const q = filters.query.toLowerCase().trim();
    return !q || `${source.title} ${source.publisher} ${source.notes} ${source.year || ''}`.toLowerCase().includes(q);
  });
  const rows = filtered.map((source) => `<tr><td>${source.year ? `<span class="year-pill">${source.year}</span>` : '—'}</td><td><a class="source-title" href="${escapeHtml(safeUrl(source.url))}" target="_blank" rel="noreferrer">${escapeHtml(source.title)} ↗</a><small class="cell-secondary">${escapeHtml(source.publisher)}</small></td><td>${chip(sourceLevelLabel(source.level), source.level === 'official' ? 'green' : 'amber')}</td><td>${escapeHtml(source.evidenceType)}</td><td>${escapeHtml(source.observedAt || source.publishedAt || source.accessedAt || '—')}</td><td>${escapeHtml(source.notes || '')}</td></tr>`).join('');
  const officialCount = dataset.sources.filter((source) => source.level === 'official').length;
  const coverage = summarizePositionCoverage(dataset);
  const positionCoverage = coverage.map((row, index) => {
    const reference = row.secondaryReference;
    const source = reference ? sourceFor(reference.sourceId) : null;
    const percentage = reference?.reportedPositionCount
      ? Math.max(0, Math.min(100, Math.round(row.visiblePositions / reference.reportedPositionCount * 100)))
      : 0;
    const count = reference
      ? `${fmt(row.visiblePositions)} / ${fmt(reference.reportedPositionCount)} 条`
      : `${fmt(row.visiblePositions)} 条样例 · 年度汇总未知`;
    const comparison = reference
      ? `${source?.publisher || '已登记第三方'}汇总条数对照`
      : '暂无可比的第三方年度汇总';
    const sourceMarkup = source ? sourceLink(source.sourceId, `${source.publisher}来源 ↗`) : '';
    return `<article class="source-coverage-card" style="--coverage-index:${index}"><div class="source-coverage-card-top"><span class="year-pill">${row.year}</span>${chip('二手条数对照', 'blue-soft')}</div><strong class="source-coverage-count">${count}</strong><div class="source-coverage-meter" role="img" aria-label="${row.year}年${count}，${comparison}；不是官方覆盖率"><span style="--coverage-width:${percentage}%"></span></div><small>${escapeHtml(comparison)} · 非官方全量分母</small>${sourceMarkup}</article>`;
  }).join('');
  const scoreCoverage = [2024, 2025, 2026].map((year, index) => {
    const sample = dataset.scoreSamples?.find((item) => Number(item.year) === year);
    const rowsForYear = dataset.scoreRows.filter((item) => Number(item.year) === year);
    const scoreSource = sample ? sourceFor(sample.sourceId) : null;
    const detail = sample
      ? `${fmt(rowsForYear.length)} 条具名分数记录 · ${sample.complete === true ? '来源标记完整' : '来源标记为部分样本'}`
      : '暂无可追溯的具名岗位分数行';
    const sourceMarkup = scoreSource ? sourceLink(scoreSource.sourceId, '查看分数来源 ↗') : '';
    return `<article class="source-score-card" style="--coverage-index:${index}"><span class="year-pill">${year}</span><strong>${rowsForYear.length ? `${fmt(rowsForYear.length)} 条` : '暂无'}</strong><small>${escapeHtml(detail)}</small>${sourceMarkup}</article>`;
  }).join('');
  const positionLevelSnapshotCount = positionSnapshots.length;
  const observationPositionCount = new Set(positionSnapshots.map((item) => item.positionCode)).size;
  const observationCount = dataset.observations.length;
  const aggregateObservationCount = observationCount - positionLevelSnapshotCount;
  const coverageDashboard = `<section class="panel source-coverage-panel" aria-label="当前研究完成度">
    <div class="panel-heading"><div><div class="eyebrow muted">RESEARCH COVERAGE</div><h2>当前研究完成度</h2><p>年度职位样例与第三方汇总对照</p></div>${chip('年度官方职位分母未知', 'amber')}</div>
    <p class="source-coverage-note">条数对照只用于定位收录缺口，不等于官方覆盖率；条数相同不代表职位代码集合一致。</p>
    <div class="source-coverage-grid">${positionCoverage}</div>
    <div class="source-score-section"><div class="source-score-heading"><div><strong>具名最低进面分</strong><span>只按有来源的岗位分数行计数</span></div><a href="#/scenarios">打开分数情景 →</a></div><div class="source-score-grid">${scoreCoverage}</div></div>
    <div class="source-observation-summary"><div><strong>报名 / 资格审查观察</strong><span>${fmt(observationCount)} 条记录 · ${fmt(positionLevelSnapshotCount)} 条岗位级快照 · 覆盖 ${fmt(observationPositionCount)} 个职位代码 · 另有 ${fmt(aggregateObservationCount)} 条区级或单位级观察</span></div><a href="#/evidence">查看观察明细与统计口径 →</a></div>
  </section>`;
  return `<div class="page-body"><div class="page-heading-row"><div><div class="eyebrow muted">PROVENANCE · ${dataset.sources.length} RECORDS</div><h1>数据与来源</h1><p>每个岗位和统计数字都保留来源等级、观察口径及不确定性说明。</p></div>${chip(`${officialCount} 项官方来源`, 'green')}</div><div class="metric-grid three-metrics">${metric('官方规则 / 公告', `${officialCount}<small> 条</small>`, '用于招录流程、大纲和资格线', '✓', 'mint')}${metric('第三方职位与统计', `${dataset.sources.length - officialCount}<small> 条</small>`, '用于检索线索；不等同官方职位事实', 'ⓘ', 'amber')}${metric('岗位级资格审查快照', `${positionSnapshots.length}<small> 条</small>`, `覆盖 ${positionSnapshotCount} 个岗位 · ${positionSnapshotTimes} 个时点；非最终报名 / 缴费 / 实考人数`, '⌁', 'blue')}</div>${coverageDashboard}<div class="panel table-panel source-panel"><div class="job-filterbar"><label class="searchbox"><span>⌕</span><input id="source-search" type="search" placeholder="搜索来源、发布方或说明" value="${escapeHtml(filters.query)}" autocomplete="off"/></label><select id="source-level" aria-label="来源等级"><option value="all">全部来源级别</option><option value="official" ${filters.sourceLevel === 'official' ? 'selected' : ''}>官方来源</option><option value="secondary" ${filters.sourceLevel === 'secondary' ? 'selected' : ''}>第三方来源</option></select><span class="filter-count">${filtered.length} 条来源</span></div><div class="table-scroll"><table class="data-table source-table"><thead><tr><th>年度</th><th>来源 / 发布方</th><th>等级</th><th>证据类型</th><th>时间</th><th>口径与限制</th></tr></thead><tbody>${rows}</tbody></table></div></div><div class="source-legend"><span><i class="legend-dot official"></i>官方：公告、大纲、门槛</span><span><i class="legend-dot secondary"></i>第三方：岗位镜像、报名快照、部分分数样本</span><span><i class="legend-dot null"></i>空值：当前没有可追溯证据，不等于 0</span></div></div>`;
}

function renderPage() {
  const pages = { overview: renderOverview, guide: renderGuide, plan: renderPlan, aptitude: renderAptitude, essay: renderEssay, mocks: renderMocks, positions: renderPositions, compare: renderCompare, assistant: renderAssistant, scenarios: renderScenarios, matrix: renderMatrix, profile: renderProfile, research: renderResearch, evidence: renderEvidence, sources: renderSources, settings: renderSettings };
  const help = getPageHelp(page);
  let content = (pages[page] || renderOverview)();
  return `<div class="page-shell ${pageTransition ? 'page-enter' : ''}${resultTransition ? ' results-enter' : ''}"><details class="page-howto"><summary><span class="page-howto-icon">ⓘ</span><span>本页怎么用</span><span class="page-howto-hint">点此展开</span></summary><div class="page-howto-content"><p>${escapeHtml(help.text)}</p><a href="#/${escapeHtml(help.actionPage)}">${escapeHtml(help.actionLabel)} →</a></div></details>${content}</div>`;
}

function renderModal(content) {
  modalRoot.innerHTML = `<div class="modal-overlay" id="modal-overlay" data-action="overlay-close"><section class="modal-card" role="dialog" aria-modal="true">${content}</section></div>`;
  modalRoot.querySelector('input,select,textarea,button')?.focus();
}

function renderBackupPreview(state, { exportedAt = null, kind = 'encrypted', sourceName = '' } = {}) {
  pendingBackup = { state: readStorage(state), kind };
  const profileCount = Object.values(state.profile || {}).filter((value) => value !== '' && value !== null && value !== undefined).length;
  const disclosure = kind === 'legacy'
    ? '<div class="notice notice-warning"><span>!</span><p><strong>这是未加密的旧版 JSON 备份。</strong>你已主动选择此文件，文件内容曾以明文保存在文件本身。确认后会立即写入当前档案的加密存储。</p></div>'
    : '<p>这份备份已通过档案密码解锁。确认后会使用当前已解锁档案重新加密保存。</p>';
  renderModal(`<div class="backup-confirm"><div class="modal-head"><div><div class="eyebrow muted">${kind === 'legacy' ? 'LEGACY PLAIN-TEXT BACKUP' : 'ENCRYPTED BACKUP'} · ${escapeHtml(exportedAt || '导出时间未知')}</div><h2>恢复这份个人数据？</h2>${sourceName ? `<small>备份档案：${escapeHtml(sourceName)}</small>` : ''}</div><button type="button" class="modal-close" aria-label="取消恢复" data-action="backup-cancel">×</button></div><div class="modal-body">${disclosure}<p>恢复会替换当前本地档案的个人记录，不会更改公开职位数据或原始 Excel。</p><div class="backup-preview-grid"><div><strong>${profileCount}</strong><span>项个人资料</span></div><div><strong>${Object.keys(state.dayLogs || {}).length}</strong><span>天学习记录</span></div><div><strong>${(state.mocks || []).length}</strong><span>场模考</span></div><div><strong>${(state.favorites || []).length}</strong><span>个收藏岗位</span></div></div></div><div class="modal-footer"><button type="button" class="button button-quiet" data-action="backup-cancel">暂不恢复</button><button type="button" class="button button-primary" data-action="backup-restore">确认加密替换</button></div></div>`);
}

function renderOnboarding(direction = 'initial') {
  const step = Math.max(0, Math.min(3, storage.onboarding?.step || 0));
  const dayOne = getDays().find((day) => day.day === 1);
  const stepTitles = ['个人报考条件', '从 Day 1 开始', '记录第一次模考', '查看昌平历史岗位'];
  let body;
  if (step === 0) {
    body = `<p class="onboarding-lead">这张工作台帮你完成四件事。专业方向预填为公共管理，请先改成自己的真实专业；其他信息可以稍后补。内容只保存在此浏览器。</p><ul class="onboarding-capabilities" aria-label="工作台功能"><li style="--capability-index:0"><span>01</span><strong>管理 50 天复习计划</strong></li><li style="--capability-index:1"><span>02</span><strong>记录并诊断模考成绩</strong></li><li style="--capability-index:2"><span>03</span><strong>查询昌平历年真实职位</strong></li><li style="--capability-index:3"><span>04</span><strong>根据个人条件辅助选岗</strong></li></ul><form id="onboarding-profile-form"><div class="onboarding-fields"><label class="form-field"><span>专业方向</span><input name="major" value="${escapeHtml(storage.profile.major || '公共管理')}" autocomplete="off"/></label><label class="form-field"><span>最高学历</span><input name="degree" value="${escapeHtml(storage.profile.degree || '')}" placeholder="例如：本科 / 硕士" autocomplete="off"/></label></div><div class="modal-footer"><button type="button" class="button button-quiet" data-action="onboarding-later">稍后再看</button><button type="submit" class="button button-primary">保存并继续</button></div></form>`;
  } else if (step === 1) {
    body = `<p class="onboarding-lead">计划来自你的 50 天复习表。先从第一天开始记录实际题量和用时，后续完成度就会按真实记录更新。</p><div class="onboarding-preview"><span>DAY 01</span><div><strong>${escapeHtml(dayOne?.focus || '打开 50 天计划')}</strong><small>${escapeHtml(dayOne?.coreTask || '查看第一天的学习安排')} · ${fmt(dayOne?.plannedQuestions)} 题 · ${fmt(dayOne?.plannedHours, 1)} 小时</small></div></div><div class="modal-footer"><button type="button" class="button button-quiet" data-action="onboarding-back">上一步</button><button type="button" class="button button-secondary" data-action="onboarding-open" data-page="plan" data-next-step="2">打开 Day 1 计划</button><button type="button" class="button button-primary" data-action="onboarding-next">下一步</button></div>`;
  } else if (step === 2) {
    body = `<p class="onboarding-lead">录入真实模考后，首页才会显示你的分数趋势、目标差距和薄弱模块。没有填写的分数不会按 0 分处理。</p><div class="onboarding-preview"><span>${getMocks().length ? `${getMocks().length} 次` : '首次'}</span><div><strong>建立自己的成绩基线</strong><small>行测、申论总分，以及选填的模块正确率</small></div></div><div class="modal-footer"><button type="button" class="button button-quiet" data-action="onboarding-back">上一步</button><button type="button" class="button button-secondary" data-action="onboarding-open-mock">现在录入模考</button><button type="button" class="button button-primary" data-action="onboarding-next">下一步</button></div>`;
  } else {
    body = `<p class="onboarding-lead">职位页展示可追溯的历史记录。当前每条记录都会标出来源和核验状态；历史岗位不能代替当年官方职位表。</p><div class="onboarding-preview"><span>${dataset.positions.length}</span><div><strong>昌平历史岗位样例</strong><small>可搜索、筛选、收藏并查看来源；完整资格仍以官方原表为准</small></div></div><div class="modal-footer"><button type="button" class="button button-quiet" data-action="onboarding-back">上一步</button><button type="button" class="button button-secondary" data-action="onboarding-later">稍后再看</button><button type="button" class="button button-primary" data-action="onboarding-finish">完成并查看岗位</button></div>`;
  }
  const progress = Math.round(((step + 1) / stepTitles.length) * 100);
  renderModal(`<div class="onboarding-content onboarding-content--${direction}"><div class="onboarding-top"><div><span class="eyebrow muted">第一次使用 · 约 3 分钟</span><h2 id="onboarding-title">第一次使用？3 分钟完成初始化</h2></div><button type="button" class="modal-close" aria-label="关闭引导" data-action="onboarding-later">×</button></div><div class="onboarding-progress" role="progressbar" aria-label="初始化进度" aria-valuemin="1" aria-valuemax="4" aria-valuenow="${step + 1}"><span style="width:${progress}%"></span></div><div class="onboarding-step-pane"><div class="onboarding-step-label">第 ${step + 1} 步，共 4 步 <strong>${stepTitles[step]}</strong></div>${body}</div></div>`);
}

async function closeOnboarding() {
  if (modalRoot.querySelector('.onboarding-content')) {
    storage.onboarding = { ...storage.onboarding, hidden: true };
    await persist();
  }
  modalRoot.innerHTML = '';
}

function openJob(code) {
  const position = dataset.positions.find((item) => item.code === code);
  if (!position) return;
  const eligibility = evaluateEligibility(position, storage.profile);
  const sources = (position.sources || []).map((sourceId) => {
    const source = sourceFor(sourceId);
    return source ? `<a class="evidence-item" href="${escapeHtml(safeUrl(source.url))}" target="_blank" rel="noreferrer"><span>↗</span><div><strong>${escapeHtml(source.title)}</strong><small>${escapeHtml(sourceLevelLabel(source.level))} · ${escapeHtml(source.notes || '')}</small></div></a>` : '';
  }).join('');
  const officialLookup = position.year === 2026 && sourceFor('beijing-2026-position-lookup')
    ? `<aside class="official-position-lookup"><div><strong>官方复核工具 · 2026</strong><p>可按详情页上方职位代码手动查询；该入口是复核工具，不会自动将本条职位标记为官方核验。</p></div>${sourceLink('beijing-2026-position-lookup', '打开人社局代码查询 ↗')}</aside>`
    : '';
  const observations = dataset.observations.filter((item) => item.positionCode === code);
  const majorAssessment = [majorCriteriaSummary(position), majorEligibilityText(position, storage.profile, eligibility)].filter(Boolean).join('；');
  const professionalTest = position.professionalTest === true
    ? `是${position.physicalTest === true ? '（含体能测试）' : ''}`
    : position.professionalTest === false ? '否' : null;
  const politicalStatus = position.requirements?.politicalStatus ?? position.politicalStatus;
  const completeness = getPositionDataCompleteness(position, dataset);
  const completenessDescription = completeness.missingSections.length
    ? `已收录 ${completeness.availableSections}/${completeness.totalSections} 类；缺少：${completeness.missingSections.join('、')}`
    : `已收录 ${completeness.availableSections}/${completeness.totalSections} 类；八类信息均有可追溯记录`;
  const detailRows = [
    { label: '岗位职责', value: position.positionDescription, wide: true, featured: true },
    { label: '用人部门', value: position.department },
    { label: '机构性质', value: position.organizationNature },
    { label: '职位层级', value: position.positionLevel },
    { label: '招录人数', value: Number.isFinite(position.recruitCount) ? `${fmt(position.recruitCount)} 人` : '待核验' },
    { label: '学历条件', value: position.education || '待核验' },
    { label: '学位要求', value: position.degreeRequirement },
    { label: '政治面貌', value: politicalStatus },
    { label: '应届届别', value: position.newGraduateYear ? `${position.newGraduateYear} 届应届毕业生` : null },
    { label: '专业能力测试', value: professionalTest },
    { label: '面试比例', value: position.interviewRatio },
    { label: '专业条件原始摘要', value: position.majorText || '待核验', wide: true },
    { label: '结构化代码与当前判断', value: majorAssessment || '尚无可自动核对的专业目录。', wide: true },
    { label: '其他条件', value: position.otherConditions || position.eligibilityText || '详情页未提供完整条件，请查看官方职位表核验。', wide: true },
    { label: '岗位备注', value: position.remarks, wide: true },
    { label: '咨询电话', value: position.consultPhone },
    { label: '单位网站', value: position.unitWebsite, link: true },
    { label: '数据完整度说明', value: `${completeness.grade} · ${completenessDescription}`, wide: true },
    { label: '岗位级资格审查快照', value: observations.length ? observations.slice().sort((left, right) => String(left.observedAt).localeCompare(String(right.observedAt))).map((item) => `${item.observedAt}：${fmt(item.applicantsQualified)} 人通过 / 计划招录 ${fmt(item.recruitCount ?? position.recruitCount)} 人（第三方快照）`).join('；') : '暂无可回查的岗位级资格审查快照', wide: true },
    { label: '历史进面线与安全垫', value: `暂无该岗位的可比历史进面线；${calculateSafeMargin(getMocks(), null).status}`, wide: true },
  ].filter((row) => row.value !== null && row.value !== undefined && row.value !== '');
  const detailMarkup = detailRows.map((row, index) => {
    const classes = [row.wide ? 'detail-wide' : '', row.featured ? 'job-detail-featured' : ''].filter(Boolean).join(' ');
    const value = row.link
      ? `<a class="detail-link" href="${escapeHtml(safeUrl(row.value))}" target="_blank" rel="noreferrer">${escapeHtml(row.value)} ↗</a>`
      : escapeHtml(row.value);
    return `<div class="${classes}" style="--detail-index:${Math.min(index, 7)}"><span>${escapeHtml(row.label)}</span><strong>${value}</strong></div>`;
  }).join('');
  renderModal(`<div class="modal-head"><div><div class="eyebrow muted">${position.year} · ${escapeHtml(position.code)}</div><h2>${escapeHtml(position.title)}</h2><p>${escapeHtml(position.unit)} · ${escapeHtml(position.orgType)}</p></div><button class="modal-close" data-action="close-modal" aria-label="关闭">×</button></div><div class="modal-body"><div class="modal-status-row">${chip(eligibility.status, statusTone(eligibility.status))}${positionEvidenceMarkup(position)}${positionCompletenessMarkup(position)}${chip(position.verification, 'amber')}</div>${renderEligibilityChecks(eligibility, position)}<div class="detail-grid job-detail-grid">${detailMarkup}</div>${officialLookup}<div class="evidence-list"><div class="eyebrow muted">EVIDENCE & PROVENANCE</div>${sources}</div></div><div class="modal-footer">${button('加入比较 ⇄', 'compare', 'button button-secondary', `data-code="${escapeHtml(code)}"`)}${button(storage.favorites.includes(code) ? '★ 已收藏' : '☆ 收藏岗位', 'favorite', 'button button-quiet', `data-code="${escapeHtml(code)}"`)}<button class="button button-primary" data-action="close-modal">完成</button></div>`);
}

function openDayEditor(dayNumber) {
  const day = getDays().find((item) => item.day === Number(dayNumber));
  if (!day) return;
  selectedDay = day.day;
  renderModal(`<form id="day-form" data-day="${day.day}"><div class="modal-head"><div><div class="eyebrow muted">DAY ${String(day.day).padStart(2, '0')} · ${escapeHtml(fmtDate(day.date))}</div><h2>记录学习进度</h2><p>${escapeHtml(day.focus)}</p></div><button type="button" class="modal-close" data-action="close-modal" aria-label="关闭">×</button></div><div class="modal-body"><div class="form-grid"><label class="form-field"><span>实际题量</span><input name="actualQuestions" type="number" min="0" step="1" value="${day.actualQuestions ?? ''}" placeholder="尚未记录"/></label><label class="form-field"><span>实际用时（小时）</span><input name="actualHours" type="number" min="0" step="0.25" value="${day.actualHours ?? ''}" placeholder="尚未记录"/></label><label class="form-field"><span>任务状态</span><select name="status">${['未开始', '进行中', '已完成'].map((status) => `<option ${day.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></label><label class="form-field form-field-wide"><span>复盘 / 备注</span><textarea name="reviewNote" rows="3" placeholder="记录错题、卡点或调整……">${escapeHtml(day.reviewNote || '')}</textarea></label></div><div class="notice notice-soft compact-notice"><span>ⓘ</span><p>只保存到此浏览器，不会修改原始 Excel。</p></div></div><div class="modal-footer"><button type="button" class="button button-quiet" data-action="close-modal">取消</button><button type="submit" class="button button-primary">保存记录</button></div></form>`);
}

function openPlanEditor(dayNumber) {
  const day = getDays().find((item) => item.day === Number(dayNumber));
  if (!day) return;
  renderModal(`<form id="plan-edit-form" data-day="${day.day}"><div class="modal-head"><div><div class="eyebrow muted">DAY ${String(day.day).padStart(2, '0')}</div><h2>调整每日计划</h2><p>修改计划安排不会覆盖这一天的实际学习记录。</p></div><button type="button" class="modal-close" data-action="close-modal" aria-label="关闭">×</button></div><div class="modal-body"><div class="form-grid"><label class="form-field"><span>计划日期</span><input name="date" type="date" value="${escapeHtml(day.date || '')}" required/></label><label class="form-field"><span>复习阶段</span><input name="stage" value="${escapeHtml(day.stage || '')}" required/></label><label class="form-field"><span>今日主攻</span><input name="focus" value="${escapeHtml(day.focus || '')}" required/></label><label class="form-field"><span>计划题量</span><input name="plannedQuestions" type="number" min="0" step="1" value="${escapeHtml(day.plannedQuestions ?? '')}" placeholder="选填"/></label><label class="form-field"><span>计划用时（小时）</span><input name="plannedHours" type="number" min="0" step="0.25" value="${escapeHtml(day.plannedHours ?? '')}" placeholder="选填"/></label><label class="form-field form-field-wide"><span>核心任务</span><textarea name="coreTask" rows="4" required>${escapeHtml(day.coreTask || '')}</textarea></label></div><div class="notice notice-soft compact-notice"><span>ⓘ</span><p>调整值仅保存在此浏览器；不会改写原始工作簿。实际题量、用时与状态由“记录”单独管理。</p></div></div><div class="modal-footer"><button type="button" class="button button-quiet" data-action="close-modal">取消</button><button type="submit" class="button button-primary">保存计划</button></div></form>`);
}

function openAptitudeEditor(index) {
  const item = { ...dataset.aptitude[index], ...(storage.aptitudeLogs[index] || {}) };
  if (!item.item) return;
  renderModal(`<form id="aptitude-form" data-index="${index}"><div class="modal-head"><div><div class="eyebrow muted">${escapeHtml(item.area)}</div><h2>记录行测训练</h2><p>${escapeHtml(item.item)}</p></div><button type="button" class="modal-close" data-action="close-modal" aria-label="关闭">×</button></div><div class="modal-body"><div class="form-grid"><label class="form-field"><span>累计完成题量</span><input name="attempted" type="number" min="0" step="1" value="${item.attempted ?? ''}" placeholder="尚未记录" required/></label><label class="form-field"><span>当前正确率（%）</span><input name="accuracy" type="number" min="0" max="100" step="1" value="${Number.isFinite(item.accuracy) ? Math.round(item.accuracy * 100) : ''}" placeholder="尚未记录"/></label><label class="form-field"><span>二刷正确率（%）</span><input name="retakeAccuracy" type="number" min="0" max="100" step="1" value="${Number.isFinite(item.retakeAccuracy) ? Math.round(item.retakeAccuracy * 100) : ''}" placeholder="选填"/></label><label class="form-field"><span>计划准确率目标</span><input value="${fmtPct(item.targetAccuracy)}" disabled/></label></div><div class="notice notice-soft compact-notice"><span>ⓘ</span><p>累计题量和正确率按最近一次自报值保存；掌握度根据题量完成与当前正确率推算，仅供个人复盘。</p></div></div><div class="modal-footer"><button type="button" class="button button-quiet" data-action="close-modal">取消</button><button type="submit" class="button button-primary">保存训练记录</button></div></form>`);
}

function openEssayEditor(index) {
  const item = { ...dataset.essay[index], ...(storage.essayLogs[index] || {}) };
  if (!item.practice) return;
  renderModal(`<form id="essay-form" data-index="${index}"><div class="modal-head"><div><div class="eyebrow muted">${escapeHtml(item.area)}</div><h2>记录申论训练</h2><p>${escapeHtml(item.practice)}</p></div><button type="button" class="modal-close" data-action="close-modal" aria-label="关闭">×</button></div><div class="modal-body"><div class="form-grid"><label class="form-field"><span>累计完成次数</span><input name="completed" type="number" min="0" step="1" value="${item.completed ?? ''}" required/></label><label class="form-field"><span>个人自评分（0–100）</span><input name="selfScore" type="number" min="0" max="100" step="1" value="${item.selfScore ?? ''}" placeholder="选填"/></label><label class="form-field"><span>关键词覆盖率（%）</span><input name="keywordCoverage" type="number" min="0" max="100" step="1" value="${Number.isFinite(item.keywordCoverage) ? Math.round(item.keywordCoverage * 100) : ''}" placeholder="选填"/></label><label class="form-field"><span>限时达标</span><select name="timedPass"><option value="">尚未记录</option><option value="true" ${item.timedPass === true ? 'selected' : ''}>达标</option><option value="false" ${item.timedPass === false ? 'selected' : ''}>未达标</option></select></label></div><div class="notice notice-soft compact-notice"><span>ⓘ</span><p>自评分仅是个人复盘指标，不是官方评分。</p></div></div><div class="modal-footer"><button type="button" class="button button-quiet" data-action="close-modal">取消</button><button type="submit" class="button button-primary">保存训练记录</button></div></form>`);
}

function openMockEditor() {
  const moduleInputs = mockModules.map(([key, label]) => `<label class="form-field"><span>${escapeHtml(label)}正确率（%）</span><input name="${key}" type="number" min="0" max="100" step="1" placeholder="选填"/></label>`).join('');
  renderModal(`<form id="mock-form"><div class="modal-head"><div><div class="eyebrow muted">MOCK REVIEW</div><h2>录入模考成绩</h2><p>只记录真实完成的模考；空字段不默认填 0。</p></div><button type="button" class="modal-close" data-action="close-modal" aria-label="关闭">×</button></div><div class="modal-body"><div class="form-grid"><label class="form-field"><span>考试日期</span><input name="date" type="date" value="${todayString()}"/></label><label class="form-field"><span>目标分</span><input name="target" type="number" min="0" max="300" step="0.5" value="138"/></label><label class="form-field"><span>行测分数</span><input name="aptitude" type="number" min="0" max="150" step="0.1" placeholder="尚未填写" required/></label><label class="form-field"><span>申论分数</span><input name="essay" type="number" min="0" max="150" step="0.1" placeholder="尚未填写" required/></label><label class="form-field"><span>行测用时（分钟）</span><input name="aptitudeMinutes" type="number" min="0" max="180" placeholder="选填"/></label><label class="form-field"><span>申论用时（分钟）</span><input name="essayMinutes" type="number" min="0" max="180" placeholder="选填"/></label><div class="form-field form-field-wide"><span>行测模块正确率</span><div class="form-grid modal-module-grid">${moduleInputs}</div></div><label class="form-field form-field-wide"><span>复盘结论</span><textarea name="review" rows="3" placeholder="记录薄弱项、时间分配和下一次调整……"></textarea></label></div></div><div class="modal-footer"><button type="button" class="button button-quiet" data-action="close-modal">取消</button><button type="submit" class="button button-primary">保存模考</button></div></form>`);
}

function notify(message) {
  toastRoot.textContent = message;
  toastRoot.classList.add('visible');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toastRoot.classList.remove('visible'), 2400);
}

function render() {
  if (!pageMeta[page]) page = 'overview';
  pageRevealObserver?.disconnect();
  const enteringPage = pageTransition;
  root.innerHTML = renderLayout();
  if (enteringPage) {
    pageRevealObserver = observePageSections({
      root,
      viewportHeight: window.innerHeight,
      documentScrollTop: window.scrollY,
      prefersReducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
      motionIntensity: storage.settings.motion,
      IntersectionObserverImpl: window.IntersectionObserver,
    });
  }
  pageTransition = false;
  resultTransition = false;
  assistantFilterChanged = false;
  document.title = `${pageMeta[page][0]} · 京考备考台`;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function navigate(id) {
  page = pageMeta[id] ? id : 'overview';
  document.querySelector('.sidebar')?.classList.remove('mobile-open');
  document.querySelector('.sidebar-scrim')?.classList.remove('visible');
  pageTransition = true;
  if (location.hash !== `#/${page}`) {
    location.hash = `/${page}`;
    return;
  }
  runViewTransition(document, () => {
    render();
    scrollToTop();
  }, storage.settings.motion);
}

async function persistAndRender(message) {
  render();
  if (await persist() && message) notify(message);
}

document.addEventListener('click', async (event) => {
  const nav = event.target.closest('a[href^="#/"]');
  if (nav) {
    const id = nav.getAttribute('href').slice(2);
    if (pageMeta[id]) {
      event.preventDefault();
      navigate(id);
      return;
    }
  }
  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) return;
  const { action, code } = actionEl.dataset;
  if (action === 'account-lock') { lockAccount(); return; }
  if (!accountSession) return;
  if (action === 'positions-page') {
    jobPage = Number(actionEl.dataset.page) || 1;
    resultTransition = true;
    render();
    const next = document.querySelector('[data-action="positions-page"][data-direction="next"]:not(:disabled)');
    const previous = document.querySelector('[data-action="positions-page"][data-direction="previous"]:not(:disabled)');
    (next || previous)?.focus({ preventScroll: true });
  }
  if (action === 'toggle-major-focus') {
    filters.majorTopic = filters.majorTopic === 'public-management' ? 'all' : 'public-management';
    jobPage = 1;
    resultTransition = true;
    render();
    document.querySelector('[data-action="toggle-major-focus"]')?.focus({ preventScroll: true });
  }
  if (action === 'toggle-major-review') {
    filters.majorTopic = filters.majorTopic === 'public-management-review' ? 'all' : 'public-management-review';
    jobPage = 1;
    resultTransition = true;
    render();
    document.querySelector('[data-action="toggle-major-review"]')?.focus({ preventScroll: true });
  }
  if (action === 'set-density') {
    displayDensity = actionEl.dataset.density === 'compact' ? 'compact' : 'comfortable';
    storage.settings.density = displayDensity;
    applyDisplaySettings();
    await persist();
    render();
    document.querySelector(`[data-action="set-density"][data-density="${displayDensity}"]`)?.focus({ preventScroll: true });
  }
  if (action === 'set-display-setting') {
    const { setting, value } = actionEl.dataset;
    const options = { fontSize: ['small', 'standard', 'large'], motion: ['enhanced', 'immersive'], density: ['comfortable', 'compact'] };
    if (!options[setting]?.includes(value)) return;
    storage.settings[setting] = value;
    if (setting === 'density') displayDensity = value;
    applyDisplaySettings();
    await persist();
    render();
    document.querySelector(`[data-action="set-display-setting"][data-setting="${setting}"][data-value="${value}"]`)?.focus({ preventScroll: true });
  }
  if (action === 'open-onboarding') {
    storage.onboarding = { step: storage.onboarding.completed ? 0 : storage.onboarding.step, hidden: false, completed: false };
    await persist();
    renderOnboarding();
  }
  if (action === 'onboarding-next' || action === 'onboarding-back' || action === 'onboarding-later') {
    storage.onboarding = advanceOnboarding(storage.onboarding.step, action.replace('onboarding-', ''));
    await persist();
    if (storage.onboarding.hidden) modalRoot.innerHTML = '';
    else renderOnboarding(action === 'onboarding-back' ? 'back' : 'forward');
  }
  if (action === 'onboarding-open') {
    storage.onboarding = { step: Number(actionEl.dataset.nextStep), hidden: true, completed: false };
    await persist();
    modalRoot.innerHTML = '';
    navigate(actionEl.dataset.page);
  }
  if (action === 'onboarding-open-mock') {
    storage.onboarding = { step: 3, hidden: true, completed: false };
    await persist();
    modalRoot.innerHTML = '';
    openMockEditor();
  }
  if (action === 'onboarding-finish') {
    storage.onboarding = advanceOnboarding(3);
    await persist();
    modalRoot.innerHTML = '';
    navigate('positions');
  }
  if (action === 'backup-export') {
    if (!await persist()) return;
    const backup = createEncryptedUserBackup({ id: accountSession.id, envelope: accountSession.envelope });
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `changping-jingkao-encrypted-backup-${todayString()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('加密备份已下载，请妥善保管档案密码');
  }
  if (action === 'backup-choose') document.querySelector('#backup-import-file')?.click();
  if (action === 'backup-cancel') { pendingBackup = null; pendingEncryptedBackup = null; modalRoot.innerHTML = ''; }
  if (action === 'backup-restore' && pendingBackup) {
    const previousStorage = storage;
    storage = readStorage(pendingBackup.state);
    displayDensity = storage.settings.density;
    applyDisplaySettings();
    pendingBackup = null;
    const saved = await persist();
    if (!saved) {
      storage = previousStorage;
      displayDensity = storage.settings.density;
      applyDisplaySettings();
      return;
    }
    modalRoot.innerHTML = '';
    render();
    notify('备份内容已加密恢复到当前档案');
  }
  if (action === 'open-job') openJob(code);
  if (action === 'edit-day') openDayEditor(actionEl.dataset.day);
  if (action === 'edit-plan-day') openPlanEditor(actionEl.dataset.day);
  if (action === 'edit-aptitude') openAptitudeEditor(Number(actionEl.dataset.index));
  if (action === 'edit-essay') openEssayEditor(Number(actionEl.dataset.index));
  if (action === 'add-mock') openMockEditor();
  if (action === 'close-modal') await closeOnboarding();
  if (action === 'overlay-close' && event.target.id === 'modal-overlay') await closeOnboarding();
  if (action === 'dismiss-notice') { event.preventDefault(); actionEl.closest('.notice-2027')?.remove(); }
  if (action === 'mobile-menu') {
    document.querySelector('.sidebar')?.classList.add('mobile-open');
    document.querySelector('.sidebar-scrim')?.classList.add('visible');
  }
  if (action === 'close-menu') {
    document.querySelector('.sidebar')?.classList.remove('mobile-open');
    document.querySelector('.sidebar-scrim')?.classList.remove('visible');
  }
  if (action === 'favorite') {
    storage.favorites = storage.favorites.includes(code) ? storage.favorites.filter((item) => item !== code) : [...storage.favorites, code];
    await persistAndRender(storage.favorites.includes(code) ? '已加入收藏' : '已取消收藏');
  }
  if (action === 'compare') {
    if (storage.compared.includes(code)) notify('该岗位已在比较清单中');
    else if (storage.compared.length >= 5) notify('最多同时比较 5 个岗位');
    else { storage.compared.push(code); await persistAndRender('已加入岗位比较'); }
  }
  if (action === 'remove-compare') {
    storage.compared = storage.compared.filter((item) => item !== code);
    await persistAndRender('已从比较中移除');
  }
  if (action === 'filter-evidence-year') {
    evidenceYear = ['all', '2024', '2025', '2026'].includes(actionEl.dataset.year) ? actionEl.dataset.year : 'all';
    render();
  }
  if (action === 'filter-research-topic') {
    const topics = ['all', '岗位覆盖', '分数样本', '专业资格', '报考竞争'];
    researchTopic = topics.includes(actionEl.dataset.topic) ? actionEl.dataset.topic : 'all';
    resultTransition = true;
    render();
  }
  if (action === 'filter-assistant') {
    const validStatus = ['all', '明确可报', '大概率可报但有条件待核', '信息不足', '明确不可报'].includes(actionEl.dataset.status);
    if (validStatus) {
      assistantFilter = actionEl.dataset.status;
      assistantFilterChanged = true;
      render();
      document.querySelector(`[data-action="filter-assistant"][data-status="${assistantFilter}"]`)?.focus({ preventScroll: true });
    }
  }
});

document.addEventListener('keydown', async (event) => {
  if (!accountSession) return;
  if (event.key === 'Escape' && modalRoot.firstElementChild) {
    await closeOnboarding();
    return;
  }
  const isPositionSearchShortcut = (event.metaKey || event.ctrlKey)
    && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k';
  if (!isPositionSearchShortcut) return;
  event.preventDefault();
  navigate('positions');
  window.setTimeout(() => document.querySelector('#job-search')?.focus({ preventScroll: true }), 0);
});

document.addEventListener('submit', async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form).entries());
  if (form.dataset?.accountId) {
    try {
      const opened = await openStoredAccount({ id: form.dataset.accountId, password: values.password, storage: localStorage });
      activateAccount(opened.session, opened.state);
    } catch (error) {
      showAccountGate(error.message);
    }
    return;
  }
  if (form.id === 'account-create-form' || form.id === 'account-migration-form') {
    if ((values.password || '').length < 12) {
      showAccountGate('请使用至少 12 个字符的档案密码。');
      return;
    }
    if (values.password !== values.confirmPassword) {
      showAccountGate('两次输入的密码不一致。');
      return;
    }
    try {
      if (form.id === 'account-create-form') {
        const created = await createStoredAccount({
          name: values.name,
          password: values.password,
          state: emptyStorage(),
          storage: localStorage,
        });
        activateAccount(created.session, emptyStorage(), '本地加密档案已创建。');
      } else {
        let legacyState;
        try {
          legacyState = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        } catch {
          throw new Error('旧版本地记录无法读取，原记录已保留。');
        }
        if (!legacyState) throw new Error('没有检测到可迁移的旧版本地记录。');
        const migratedState = readStorage(legacyState, readDisplayDensity());
        const migrated = await migrateLegacyAccount({
          name: values.name,
          password: values.password,
          state: migratedState,
          storage: localStorage,
        });
        try { localStorage.removeItem(ACCOUNT_DENSITY_KEY); } catch { /* density is non-sensitive; account data is already encrypted */ }
        activateAccount(migrated.session, migratedState, '旧记录已加密迁移；原明文键已移除。');
      }
    } catch (error) {
      showAccountGate(error.message);
    }
    return;
  }
  if (form.id === 'backup-unlock-form' && pendingEncryptedBackup) {
    try {
      const opened = await unlockEncryptedAccount({
        id: pendingEncryptedBackup.id,
        envelope: pendingEncryptedBackup.envelope,
        password: values.password,
      });
      const exportedAt = pendingEncryptedBackup.exportedAt;
      pendingEncryptedBackup = null;
      renderBackupPreview(opened.state, { kind: 'encrypted', sourceName: opened.name, exportedAt });
    } catch (error) {
      const details = pendingEncryptedBackup;
      renderModal(`<form id="backup-unlock-form"><div class="modal-head"><div><div class="eyebrow muted">ENCRYPTED BACKUP</div><h2>输入备份档案密码</h2></div><button type="button" class="modal-close" aria-label="取消恢复" data-action="backup-cancel">×</button></div><div class="modal-body"><div class="account-gate-error" role="alert">${escapeHtml(error.message)}</div><label class="form-field"><span>备份档案密码</span><input name="password" type="password" autocomplete="current-password" required/></label></div><div class="modal-footer"><button type="button" class="button button-quiet" data-action="backup-cancel">取消</button><button type="submit" class="button button-primary">解锁并预览</button></div></form>`);
      pendingEncryptedBackup = details;
    }
    return;
  }
  if (!accountSession) return;
  if (form.id === 'onboarding-profile-form') {
    storage.profile = { ...storage.profile, major: values.major.trim() || '公共管理', degree: values.degree.trim() };
    storage.onboarding = advanceOnboarding(storage.onboarding.step);
    await persist();
    renderOnboarding('forward');
  }
  if (form.id === 'profile-form') {
    storage.profile = {
      ...storage.profile,
      ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()])),
    };
    if (!storage.profile.major) storage.profile.major = '公共管理';
    await persistAndRender('个人资料已加密保存在此浏览器');
  }
  if (form.id === 'day-form') {
    const day = Number(form.dataset.day);
    storage.dayLogs[day] = {
      actualQuestions: values.actualQuestions === '' ? null : Number(values.actualQuestions),
      actualHours: values.actualHours === '' ? null : Number(values.actualHours),
      status: values.status,
      reviewNote: values.reviewNote.trim() || null,
    };
    await persistAndRender('学习进度已加密保存');
    modalRoot.innerHTML = '';
  }
  if (form.id === 'plan-edit-form') {
    const day = Number(form.dataset.day);
    storage.planOverrides[day] = {
      date: values.date,
      stage: values.stage.trim(),
      focus: values.focus.trim(),
      coreTask: values.coreTask.trim(),
      plannedQuestions: values.plannedQuestions === '' ? null : Number(values.plannedQuestions),
      plannedHours: values.plannedHours === '' ? null : Number(values.plannedHours),
    };
    await persistAndRender('每日计划已加密保存');
    modalRoot.innerHTML = '';
  }
  if (form.id === 'aptitude-form') {
    const index = Number(form.dataset.index);
    const base = dataset.aptitude[index];
    const attempted = Number(values.attempted);
    const accuracy = values.accuracy === '' ? null : Number(values.accuracy) / 100;
    const target = base.targetAccuracy;
    const mastery = Number.isFinite(accuracy) && base.plannedQuestions > 0
      ? Math.min(1, 0.7 * Math.min(accuracy / target, 1) + 0.3 * Math.min(attempted / base.plannedQuestions, 1))
      : null;
    storage.aptitudeLogs[index] = {
      attempted,
      accuracy,
      retakeAccuracy: values.retakeAccuracy === '' ? null : Number(values.retakeAccuracy) / 100,
      mastery,
    };
    await persistAndRender('行测训练记录已加密保存');
    modalRoot.innerHTML = '';
  }
  if (form.id === 'essay-form') {
    const index = Number(form.dataset.index);
    const base = dataset.essay[index];
    const completed = Number(values.completed);
    const selfScore = values.selfScore === '' ? null : Number(values.selfScore);
    const keywordCoverage = values.keywordCoverage === '' ? null : Number(values.keywordCoverage) / 100;
    const mastery = completed > 0 && Number.isFinite(selfScore) && Number.isFinite(keywordCoverage)
      ? Math.min(1, 0.45 * Math.min(completed / base.planned, 1) + 0.35 * selfScore / 100 + 0.2 * keywordCoverage)
      : null;
    storage.essayLogs[index] = {
      completed,
      selfScore,
      keywordCoverage,
      timedPass: values.timedPass === '' ? null : values.timedPass === 'true',
      mastery,
    };
    await persistAndRender('申论训练记录已加密保存');
    modalRoot.innerHTML = '';
  }
  if (form.id === 'mock-form') {
    const aptitude = Number(values.aptitude);
    const essay = Number(values.essay);
    storage.mocks.push({
      number: storage.mocks.length + 1,
      date: values.date || todayString(),
      aptitude,
      essay,
      total: aptitude + essay,
      aptitudeMinutes: values.aptitudeMinutes === '' ? null : Number(values.aptitudeMinutes),
      essayMinutes: values.essayMinutes === '' ? null : Number(values.essayMinutes),
      target: values.target === '' ? 138 : Number(values.target),
      review: values.review.trim() || null,
      accuracy: Object.fromEntries(mockModules.map(([key]) => [key, values[key] === '' ? null : Number(values[key]) / 100])),
    });
    await persistAndRender('模考成绩已加密保存');
    modalRoot.innerHTML = '';
  }
});

document.addEventListener('input', (event) => {
  if (!accountSession) return;
  if (event.target.id === 'job-search') { filters.query = event.target.value; jobPage = 1; const start = event.target.selectionStart; render(); const input = document.querySelector('#job-search'); input?.focus(); input?.setSelectionRange(start, start); }
  if (event.target.id === 'source-search') { filters.query = event.target.value; const start = event.target.selectionStart; render(); const input = document.querySelector('#source-search'); input?.focus(); input?.setSelectionRange(start, start); }
  if (event.target.id === 'scenario-slider') {
    scenarioScore = Number(event.target.value);
    const sliderMin = Number(event.target.min);
    const sliderMax = Number(event.target.max);
    const sliderProgress = sliderMax > sliderMin
      ? Math.round(Math.max(0, Math.min(100, ((scenarioScore - sliderMin) / (sliderMax - sliderMin)) * 100)))
      : 0;
    event.target.style?.setProperty('--score-progress', `${sliderProgress}%`);
    const sample = getScoreSampleForYear(dataset.scoreSamples, scenarioYear);
    const yearScoreRows = dataset.scoreRows.filter((row) => Number(row.year) === Number(scenarioYear) && Number.isFinite(row.score));
    const scoreRows = filterScoreRowsBySegment(yearScoreRows, dataset.positions, scenarioScope);
    const result = scoreAgainstSample(scenarioScore, sample, scoreRows);
    const display = document.querySelector('.scenario-score-display');
    const resultNumber = document.querySelector('.scenario-result-number');
    const resultLabel = document.querySelector('.scenario-result strong');
    const coverage = document.querySelector('#scenario-coverage');
    const marker = document.querySelector('.score-marker');
    const ecdfLine = document.querySelector('#score-ecdf-target-line');
    const ecdfPoint = document.querySelector('#score-ecdf-target-point');
    if (display) display.innerHTML = `${scenarioScore}<small> 分</small>`;
    if (resultNumber) {
      resultNumber.textContent = String(scenarioScore);
      resultNumber.classList.remove('score-pulse');
      void resultNumber.offsetWidth;
      resultNumber.classList.add('score-pulse');
    }
    if (resultLabel) resultLabel.textContent = result.label;
    if (coverage) coverage.textContent = result.coverageRate === null
      ? `${scenarioYear} 年历史最低进面线覆盖 · 暂无可比样本`
      : `${scenarioYear} 年历史最低进面线覆盖 · ${fmtPct(result.coverageRate)} · ${result.coveredPositions}/${result.totalPositions} 条岗位线`;
    if (marker) marker.style.left = `${Math.max(0, Math.min(100, (scenarioScore - 100) * 2))}%`;
    if (ecdfLine && ecdfPoint && result.coverageRate !== null) {
      const targetX = 44 + ((Math.max(100, Math.min(150, scenarioScore)) - 100) / 50) * 620;
      const targetY = 18 + (1 - result.coverageRate) * 176;
      ecdfLine.setAttribute('x1', String(targetX));
      ecdfLine.setAttribute('x2', String(targetX));
      ecdfPoint.setAttribute('cx', String(targetX));
      ecdfPoint.setAttribute('cy', String(targetY));
      const title = ecdfPoint.querySelector('title');
      if (title) title.textContent = `${scenarioScore} 分：覆盖 ${result.coveredPositions}/${result.totalPositions} 条历史岗位最低进面线`;
    }
    document.querySelectorAll('.scenario-row').forEach((row) => {
      const score = Number(row.querySelector('strong')?.textContent);
      row.classList.toggle('selected', score === scenarioScore);
    });
  }
});

document.addEventListener('change', async (event) => {
  if (!accountSession) return;
  const positionFilter = {
    'job-year': 'year', 'job-type': 'orgType', 'job-jobtype': 'jobType',
    'job-unit': 'unit', 'job-education': 'education', 'job-politics': 'politicalStatus',
    'job-graduation': 'freshGraduate', 'job-physical-test': 'physicalTest',
    'job-professional-test': 'professionalTest', 'job-recruitment': 'recruitmentGroup',
  }[event.target.id];
  if (positionFilter || event.target.id === 'job-sort') {
    const advancedWasOpen = Boolean(document.querySelector('#job-advanced-filters')?.open);
    if (positionFilter) filters[positionFilter] = event.target.value;
    else jobSort = event.target.value;
    jobPage = 1;
    resultTransition = true;
    render();
    if (advancedWasOpen) {
      const advanced = document.getElementById('job-advanced-filters');
      if (advanced) advanced.open = true;
    }
    document.getElementById(event.target.id)?.focus({ preventScroll: true });
  }
  if (event.target.id === 'source-level') { filters.sourceLevel = event.target.value; render(); }
  if (event.target.id === 'scenario-year' || event.target.id === 'scenario-scope') {
    if (event.target.id === 'scenario-year') scenarioYear = event.target.value;
    else scenarioScope = event.target.value;
    resultTransition = true;
    render();
    document.getElementById(event.target.id)?.focus({ preventScroll: true });
  }
  if (event.target.id === 'backup-import-file') {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const encrypted = parseEncryptedUserBackup(text);
      if (encrypted.ok) {
        pendingEncryptedBackup = encrypted;
        renderModal(`<form id="backup-unlock-form"><div class="modal-head"><div><div class="eyebrow muted">ENCRYPTED BACKUP</div><h2>输入备份档案密码</h2></div><button type="button" class="modal-close" aria-label="取消恢复" data-action="backup-cancel">×</button></div><div class="modal-body"><p>先在本机解锁并预览；只有确认后才会替换当前档案。</p><label class="form-field"><span>备份档案密码</span><input name="password" type="password" autocomplete="current-password" required/></label></div><div class="modal-footer"><button type="button" class="button button-quiet" data-action="backup-cancel">取消</button><button type="submit" class="button button-primary">解锁并预览</button></div></form>`);
        return;
      }
      const legacy = parseUserBackup(text);
      if (!legacy.ok) { notify(legacy.error || encrypted.error); return; }
      renderBackupPreview(legacy.state, { kind: 'legacy', exportedAt: legacy.exportedAt });
    } catch {
      pendingBackup = null;
      notify('无法读取备份文件，请重新选择 JSON 备份。');
    }
  }
});

window.addEventListener('hashchange', () => {
  if (!accountSession) return;
  page = location.hash.replace(/^#\/?/, '') || 'overview';
  pageTransition = true;
  runViewTransition(document, () => {
    render();
    scrollToTop();
  }, storage.settings.motion);
});

async function start() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`数据载入失败（HTTP ${response.status}）`);
    dataset = normalizeDataset(await response.json());
    showAccountGate();
  } catch (error) {
    root.innerHTML = `<div class="load-error"><span>!</span><h1>暂时无法载入工作台数据</h1><p>${escapeHtml(error.message)}</p><p>请在项目目录运行 <code>./start.sh</code>，再访问本机地址。</p><a class="button button-primary" href="/">重新打开</a></div>`;
  }
}

start();
