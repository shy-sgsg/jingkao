import { normalizeDataset } from './data/normalize.js';
import { buildScoreEcdf, buildSevenDayRecommendations, calculateDayCompletion, calculateSafeMargin, evaluateEligibility, evaluateWorkPreferences, getScoreSampleForYear, scoreAgainstSample, scoreDifficulty, scoreFit, summarizeMockScores } from './data/decision.js';
import { advanceOnboarding, shouldShowOnboarding } from './data/onboarding.js';
import { buildGuideGroups, getPageHelp } from './data/pageHelp.js';
import { createEncryptedUserBackup, parseEncryptedUserBackup, parseUserBackup } from './data/backup.js';
import { createStoredAccount, listEncryptedAccounts, migrateLegacyAccount, openStoredAccount, saveStoredAccount, unlockEncryptedAccount } from './data/encryptedStore.js';
import { getPositionDataCompleteness, summarizePositionCoverage } from './data/coverage.js';
import { buildResearchFindings, summarizeAnnualConflicts } from './data/findings.js';
import { readDisplayDensity } from './data/displayDensity.js';
import { buildDecisionCoverageMatrix, classifyPublicManagementMatch, filterAndSortPositions, filterScoreRowsByScope, filterScoreRowsBySegment, findPositionByReference, getPositionEvidenceGrade, getPositionFilterValue, hasPositionReference, paginateItems, positionIdentity, summarizePublicManagementPositions } from './data/positions.js';
import { runViewTransition } from './ui/viewTransition.js';
import { observePageSections } from './ui/scrollReveal.js';
import { normalizeStudyState, setKnowledgePointStatus, toggleKnowledgePointFlag } from './science/persistence.js';
import { archivePlanTask, createPlanTask, getPlanTaskProgress, getTasksForDate, markPlanTaskInProgress, reconcileSciencePlanTaskProgress, updatePlanTask } from './science/planTasks.js';
import { getKnowledgePoint, getScienceTree } from './science/knowledge.js';
import { SCIENCE_QUESTION_BANK } from './science/questionBank.js';
import { filterQuestions } from './science/questions.js';
import { SCIENCE_SOURCES } from './science/sources.js';
import { advanceExamQuestion, answerScienceQuestion, continueScienceSession, createScienceSession, expireScienceSession, finishExamSession, getScienceStats, goToExamQuestion, selectExamAnswer, toggleScienceFavorite } from './science/sessions.js';
import { GENERAL_KNOWLEDGE_QUESTION_BANK } from './general-knowledge/questionBank.js';
import { GENERAL_KNOWLEDGE_SOURCES } from './general-knowledge/sources.js';
import { getGeneralKnowledgePoint, getGeneralKnowledgeTree } from './general-knowledge/knowledge.js';
import { GENERAL_KNOWLEDGE_LESSONS } from './general-knowledge/lessonContent.js';
import { setGeneralKnowledgePointStatus, toggleGeneralKnowledgePointFlag, reviewFlashcard, toggleGeneralKnowledgeFavorite } from './general-knowledge/persistence.js';
import { getGeneralKnowledgeStats, combinePracticeSummary } from './general-knowledge/analytics.js';
import { createGeneralKnowledgeSession, answerGeneralKnowledgeQuestion, continueGeneralKnowledgeSession, selectGeneralKnowledgeAnswer, advanceGeneralKnowledgeQuestion, goToGeneralKnowledgeQuestion, finishGeneralKnowledgeSession, expireGeneralKnowledgeSession } from './general-knowledge/sessions.js';
import { getGeneralKnowledgeTaskProgress, reconcileGeneralKnowledgePlanTaskProgress } from './general-knowledge/planTasks.js';
import { APTITUDE_MODULES, getAptitudeMockModules, resolveAptitudeModuleRoute } from './aptitude/modules.js';
import { getAptitudeMockQuestionBank, getCompleteAptitudePapers, getAptitudeModuleLabel } from './aptitude/mock.js';
import { findAptitudeModuleKnowledgePoint, getAptitudeModuleContent, getAptitudeModuleKnowledgePoints } from './aptitude/content.js';
import { getAptitudeMockSessionRecords, getAptitudeModuleStats } from './aptitude/analytics.js';
import { getAptitudeQuestions, getAptitudeSessionQuestions } from './aptitude/questions.js';
import { getAptitudeModuleForTaskType, getAptitudeModuleTaskProgress, reconcileAptitudeModuleTaskProgress } from './aptitude/planTasks.js';
import { answerAptitudeModuleQuestion, continueAptitudeModuleSession, createAptitudeModuleSession, finishAptitudeModuleSession, goToAptitudeModuleQuestion, selectAptitudeModuleAnswer } from './aptitude/sessions.js';
import { setAptitudeModulePointStatus, toggleAptitudeModuleFavorite, toggleAptitudeModulePointFlag } from './aptitude/persistence.js';
import { renderAptitudeModuleLaunchButtons } from './aptitude/launch.js';
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
  overview: '◫', guide: '✦', plan: '▦', science: '⚗', aptitude: '⌁', essay: '✎', mocks: '⌂', positions: '▤', compare: '⇄', assistant: '✧', scenarios: '◉', matrix: '▦', profile: '♙', research: '✧', evidence: '⌁', sources: 'ⓘ', settings: '⚙',
};
const pageMeta = {
  overview: ['备考总览', '查看今天的复习任务、目标分差和北京京考职位决策证据。'],
  guide: ['使用指南', '从你要解决的问题出发，找到对应页面和下一步操作。'],
  plan: ['学习计划', '自由安排日期、任务类型和学习内容；保留原有每日计划记录。'],
  science: ['科学推理', '行测能力子模块 · 知识学习、专项练习与计划联动。'],
  aptitude: ['行测能力', '查看整体正确率、训练记录，并进入各个行测模块。'],
  aptitudeModule: ['行测模块', '学习知识点、练习题目或手动记录训练。'],
  generalKnowledge: ['常识判断', '学习知识点、练习题目或手动记录训练。'],
  essay: ['申论训练', '按训练任务记录练习次数、关键词覆盖和自评；自评不是客观测量。'],
  mocks: ['模考复盘', '只画实际填写的成绩。空白模考不会被显示成 0 分。'],
  positions: ['职位库', '按北京市 16 区和招考年度筛选可追溯职位；未收录区县明确显示待补。'],
  compare: ['岗位比较', '并排核对已收录条件和证据缺口；最多收藏比较 5 个岗位。'],
  assistant: ['选岗助手', '先做条件完整度检查；资料或岗位条件不全时明确停在“待核验”。'],
  scenarios: ['分数情景', '将目标分与已收录的历史样本范围对照，不输出进面或录取概率。'],
  matrix: ['北京京考竞争矩阵', '按北京市 16 区和年度查看职位样例覆盖；不把样例数解释为竞争率或年度总量。'],
  profile: ['个人报考资料', '在本机填写。专业预置为公共管理；其他信息不会由系统推断。'],
  research: ['研究结论', '把当前可支持的结论、证据与限制集中查看。'],
  evidence: ['数据覆盖与核验', '查看年度职位样例覆盖、来源差异与数据边界。'],
  sources: ['数据与来源', '查看原始链接、来源层级、统计口径与当前数据缺口。'],
  settings: ['设置与显示', '调整字号、动效层级和页面密度；偏好保存在此浏览器。'],
};
const navGroups = [
  { label: '工作台', items: [['overview', '备考总览'], ['guide', '使用指南'], ['plan', '学习计划']] },
  { label: '备考复盘', items: [['aptitude', '行测能力'], ['essay', '申论训练'], ['mocks', '模考记录']] },
  { label: '北京京考职位决策', items: [['positions', '职位库'], ['compare', '岗位比较'], ['assistant', '选岗助手'], ['scenarios', '分数情景'], ['matrix', '竞争矩阵']] },
  { label: '个人与数据', items: [['profile', '个人资料'], ['research', '研究结论'], ['evidence', '数据覆盖'], ['sources', '数据与来源'], ['settings', '设置与显示']] },
];
const mockModules = getAptitudeMockModules();

let dataset;
function readRoute(hash = location.hash) {
  const route = String(hash || '').replace(/^#\/?/u, '');
  const queryStart = route.indexOf('?');
  const routePage = (queryStart < 0 ? route : route.slice(0, queryStart)) || 'overview';
  const query = queryStart < 0 ? '' : route.slice(queryStart + 1);
  const value = (key) => {
    const encoded = query.match(new RegExp(`(?:^|&)${key}=([^&]*)`, 'u'))?.[1];
    if (!encoded) return null;
    try { return decodeURIComponent(encoded.replace(/\+/gu, ' ')); } catch { return null; }
  };
  const pageAliases = { science: 'science', 'aptitude/science': 'science', 'aptitude/general-knowledge': 'generalKnowledge' };
  const aptitudeRoute = resolveAptitudeModuleRoute(routePage);
  return {
    page: aptitudeRoute?.page || pageAliases[routePage] || routePage,
    aptitudeModuleId: aptitudeRoute?.moduleId || null,
    taskId: value('task'), knowledgePointId: value('knowledge'), sessionId: value('session'),
  };
}

function routeTaskIdForScience() {
  return page === 'science' ? activeSciencePlanTaskId : null;
}

const initialRoute = readRoute();
let page = initialRoute.page;
let activeAptitudeModuleId = initialRoute.aptitudeModuleId;
let activeAptitudeOverallSessionId = initialRoute.page === 'aptitude' ? initialRoute.sessionId : null;
let activeAptitudeModulePlanTaskId = initialRoute.page === 'aptitudeModule' ? initialRoute.taskId : null;
let activeAptitudeModuleSessionId = initialRoute.page === 'aptitudeModule' ? initialRoute.sessionId : null;
let selectedAptitudeModuleKnowledgePointId = initialRoute.page === 'aptitudeModule' ? initialRoute.knowledgePointId : null;
let activeSciencePlanTaskId = initialRoute.taskId;
let selectedScienceKnowledgePointId = initialRoute.knowledgePointId;
let activeScienceSessionId = initialRoute.sessionId;
let activeGeneralKnowledgePlanTaskId = initialRoute.page === 'generalKnowledge' ? initialRoute.taskId : null;
let selectedGeneralKnowledgePointId = initialRoute.page === 'generalKnowledge' ? initialRoute.knowledgePointId : null;
let activeGeneralKnowledgeSessionId = initialRoute.page === 'generalKnowledge' ? initialRoute.sessionId : null;
let revealedGeneralKnowledgeFlashcardId = null;
let pageTransition = true;
let resultTransition = false;
let filters = {
  districtId: 'all', year: 'all', orgType: 'all', jobType: 'all', majorTopic: 'all', query: '', sourceLevel: 'all',
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
let scienceExamTimer = null;
let generalKnowledgeExamTimer = null;
let aptitudeModuleExamTimer = null;
let aptitudeOverallExamTimer = null;
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
  const studyState = normalizeStudyState();
  return {
    profile: { major: '公共管理' }, dayLogs: {}, planOverrides: {}, studyPlanTasks: studyState.studyPlanTasks,
    scienceStudy: studyState.scienceStudy, generalKnowledgeStudy: studyState.generalKnowledgeStudy,
    aptitudeModuleStudies: studyState.aptitudeModuleStudies, aptitudeOverallStudy: studyState.aptitudeOverallStudy,
    aptitudeLogs: {}, essayLogs: {},
    mocks: [], favorites: [], compared: [],
    settings: { density: 'comfortable', fontSize: 'standard', motion: 'enhanced' },
    onboarding: { step: 0, hidden: false, completed: false },
  };
}

function readStorage(source = {}, densityFallback = 'comfortable') {
  try {
    const parsed = typeof source === 'string' ? JSON.parse(source) : source;
    const studyState = normalizeStudyState(parsed);
    const settings = parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {};
    return {
      profile: { major: '公共管理', ...(parsed.profile || {}) },
      dayLogs: parsed.dayLogs || {},
      planOverrides: parsed.planOverrides || {},
      studyPlanTasks: studyState.studyPlanTasks,
      scienceStudy: studyState.scienceStudy,
      generalKnowledgeStudy: studyState.generalKnowledgeStudy,
      aptitudeModuleStudies: studyState.aptitudeModuleStudies,
      aptitudeOverallStudy: studyState.aptitudeOverallStudy,
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
  const unlockCards = accounts.map((account) => `<form class="account-unlock-card" data-account-id="${escapeHtml(account.id)}"><div><span class="account-slot-mark">${String(account.slot).padStart(2, '0')}</span><strong>${escapeHtml(account.name || `本地档案 ${account.slot}`)}</strong></div><label class="form-field"><span>档案密码</span><input name="password" type="password" autocomplete="current-password" required/></label><button type="submit" class="button button-primary">解锁</button></form>`).join('');
  const accountForm = (id, action, heading, submitLabel, autocomplete = 'new-password') => `<form id="${id}" class="account-create-form"><h2>${heading}</h2><label class="form-field"><span>档案名称</span><input name="name" maxlength="60" value="我的备考档案" required autocomplete="off"/></label><label class="form-field"><span>设置密码</span><input name="password" type="password" minlength="12" autocomplete="${autocomplete}" required/><small>建议使用便于记忆的长口令；遗失后无法找回。</small></label><label class="form-field"><span>再次输入密码</span><input name="confirmPassword" type="password" minlength="12" autocomplete="${autocomplete}" required/></label><button type="submit" class="button button-primary">${submitLabel}</button></form>`;
  let accessPanel;
  if (hasLegacy) {
    accessPanel = `<section class="account-panel account-migration-panel"><div class="account-panel-heading"><span>发现旧版本地记录</span><h2>为已有备考数据设置密码</h2><p>记录目前仍是旧版明文格式。输入档案名称和新密码后，网站会先加密并回读校验；校验通过后才移除旧记录。</p></div>${accountForm('account-migration-form', 'migrate', '迁移并加密旧记录', '加密并进入工作台')}</section>${unlockCards ? `<section class="account-panel"><h2>或解锁已有档案</h2><div class="account-unlock-list">${unlockCards}</div></section>` : ''}`;
  } else if (accounts.length) {
    accessPanel = `<section class="account-panel"><div class="account-panel-heading"><span>此浏览器中的加密档案</span><h2>解锁后继续</h2><p>档案只在此浏览器保存。网站没有账户服务器，也不会上传个人数据。</p><small class="account-name-storage-note">为方便辨认，档案名称会以明文保存在本机浏览器索引；个人计划、资料和成绩仍加密保存。</small></div><div class="account-unlock-list">${unlockCards}</div></section><details class="account-panel account-create-details"><summary>＋ 创建另一份独立档案</summary>${accountForm('account-create-form', 'create', '新建加密档案', '创建并进入工作台')}</details>`;
  } else {
    accessPanel = `<section class="account-panel account-first-create">${accountForm('account-create-form', 'create', '创建本地档案', '创建并进入工作台')}</section>`;
  }
  root.innerHTML = `<main class="account-gate"><section class="account-gate-card"><div class="account-gate-brand"><span>京</span><div><strong>京考备考台</strong><small>BEIJING · LOCAL ONLY</small></div></div><div class="account-gate-copy"><div class="eyebrow muted">PRIVATE STUDY SPACE</div><h1>${hasLegacy ? '先加密已有记录，再继续备考' : accounts.length ? '欢迎回来' : '把备考记录安全留在本机'}</h1><p>每个本地档案使用独立密码加密。解锁前不会载入个人计划、资料或成绩。</p></div>${error ? `<div class="account-gate-error" role="alert">${escapeHtml(error)}</div>` : ''}${accessPanel}<div class="account-gate-footnote"><span>▣</span><p><strong>只保存在当前浏览器</strong><br/>不注册、不上传、不跨设备同步。清理浏览器数据会删除档案；忘记密码后无法恢复。</p></div></section></main>`;
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

function renderOriginalQuestionReference(question) {
  const originalNo = question?.originalQuestionNo;
  if (originalNo === null || originalNo === undefined || originalNo === '') return '';
  const numberLabel = typeof originalNo === 'number' || /^\d+$/u.test(String(originalNo))
    ? `第 ${originalNo} 题`
    : String(originalNo);
  const paperLabel = question.paperTitle ? `${question.paperTitle} · ` : '';
  return `<span>${escapeHtml(`${paperLabel}${numberLabel}`)}</span>`;
}

function aptitudeQuestionSource(question) {
  const catalog = question?.moduleId === 'science' ? SCIENCE_SOURCES
    : question?.moduleId === 'general-knowledge' ? GENERAL_KNOWLEDGE_SOURCES : [];
  const source = catalog.find((item) => item.id === question?.sourceId);
  return {
    title: question?.sourceTitle || source?.title || question?.sourceType || '来源待补',
    url: question?.sourceUrl || source?.url || null,
  };
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
  const nav = navGroups.map((group) => `<div class="nav-group"><div class="nav-heading">${escapeHtml(group.label)}</div>${group.items.map(([id, label]) => {
    const active = page === id || (id === 'aptitude' && ['science', 'generalKnowledge', 'aptitudeModule'].includes(page));
    return `<a href="#/${id}" class="nav-item ${active ? 'active' : ''}" ${active ? 'aria-current="page"' : ''}><span class="nav-icon">${icons[id]}</span><span>${escapeHtml(label)}</span>${id === 'positions' ? `<span class="nav-count">${dataset.positions.length}</span>` : ''}</a>`;
  }).join('')}</div>`).join('');
  return `<aside class="sidebar" id="sidebar"><a class="brand" href="#/overview"><span class="brand-mark">京</span><span><strong>京考备考台</strong><small>BEIJING · 2027</small></span></a><div class="data-status"><span class="status-dot"></span><span>本地运行 · 数据基准 ${escapeHtml(dataset.dataAsOf)}</span></div><nav aria-label="主导航">${nav}</nav><div class="sidebar-bottom"><div class="sidebar-note"><span class="lock-icon">▣</span><div><strong>仅保存在本机</strong><small>个人记录不会上传</small></div></div><div class="sidebar-version">个人备考工作台 <span>v1.0</span></div></div></aside>`;
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
  const aptitudeModule = page === 'aptitudeModule' ? APTITUDE_MODULES.find((module) => module.id === activeAptitudeModuleId) : null;
  const [title, subtitle] = aptitudeModule
    ? [aptitudeModule.area, `${aptitudeModule.hint} · 学习、练习与手动记录`]
    : pageMeta[page] || pageMeta.overview;
  const pageScope = ['positions', 'compare', 'assistant', 'scenarios', 'matrix'].includes(page) ? '北京京考职位决策' : ['aptitude', 'aptitudeModule', 'science', 'generalKnowledge'].includes(page) ? '行测能力' : page === 'overview' ? '备考工作台' : '昌平区';
  return `${renderSidebar()}<div class="main-shell"><header class="topbar"><div class="topbar-left"><button class="mobile-menu" type="button" aria-label="打开导航" data-action="mobile-menu">☰</button><div><div class="breadcrumb">${pageScope} <span>/</span> <strong>${escapeHtml(title)}</strong></div><p class="page-subtitle">${escapeHtml(subtitle)}</p></div></div><div class="topbar-right"><a class="button button-secondary guide-trigger" href="#/guide">使用指南</a>${renderDensityControl()}<span class="today-pill"><span class="today-dot"></span>${escapeHtml(fmtDate(todayString()))}</span><button class="button button-quiet account-lock-button" type="button" data-action="account-lock" aria-label="锁定当前档案并切换账户">锁定 · ${escapeHtml(accountSession.name)}</button></div></header><main id="page-content" tabindex="-1">${renderPage()}</main><footer class="page-footer"><span>资料更新至 ${escapeHtml(dataset.dataAsOf)} · 使用前请回看官方当年职位表</span><a href="#/sources">数据口径说明 →</a></footer></div><div class="sidebar-scrim" data-action="close-menu"></div>`;
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
  const todayScienceTasks = getTasksForDate(storage.studyPlanTasks, todayString())
    .filter((task) => task.taskType === 'science_reasoning' && task.status !== 'completed');
  const scienceReminder = todayScienceTasks.length ? `<section class="panel science-reminder-panel"><div class="panel-heading"><div><div class="eyebrow muted">TODAY · SCIENCE REASONING</div><h2>今天的科学推理任务</h2><p>${todayScienceTasks.length} 项待完成；从这里可直接进入对应训练。</p></div><a class="panel-link" href="#/plan">管理计划 →</a></div><div class="science-reminder-list">${todayScienceTasks.map((task) => `<a class="science-reminder-item" href="#/aptitude/science?task=${encodeURIComponent(task.id)}"><span class="science-reminder-icon">⚗</span><span><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(planTaskTypeLabel(task))} · ${escapeHtml(planTaskStatusLabel(task.status))}${task.estimatedMinutes ? ` · ${task.estimatedMinutes} 分钟` : ''}</small></span><b>开始 ↗</b></a>`).join('')}</div></section>` : '';
  const todayGeneralKnowledgeTasks = getTasksForDate(storage.studyPlanTasks, todayString())
    .filter((task) => task.taskType === 'general_knowledge' && task.status !== 'completed');
  const generalKnowledgeReminder = todayGeneralKnowledgeTasks.length ? `<section class="panel science-reminder-panel general-knowledge-reminder"><div class="panel-heading"><div><div class="eyebrow muted">TODAY · GENERAL KNOWLEDGE</div><h2>今天的常识判断任务</h2><p>${todayGeneralKnowledgeTasks.length} 项待完成；从这里直接进入知识点或训练。</p></div><a class="panel-link" href="#/plan">管理计划 →</a></div><div class="science-reminder-list">${todayGeneralKnowledgeTasks.map((task) => `<a class="science-reminder-item" href="#/aptitude/general-knowledge?task=${encodeURIComponent(task.id)}"><span class="science-reminder-icon">常</span><span><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(planTaskTypeLabel(task))} · ${escapeHtml(planTaskStatusLabel(task.status))}${task.estimatedMinutes ? ` · ${task.estimatedMinutes} 分钟` : ''}</small></span><b>开始 ↗</b></a>`).join('')}</div></section>` : '';
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
  const decisionYears = [2024, 2025, 2026];
  const decisionCoverage = buildDecisionCoverageMatrix(dataset.positions, dataset.districts, decisionYears);
  const coveredDistricts = decisionCoverage.filter((district) => Object.values(district.years).some((year) => year.hasSample)).length;
  const coveredCells = decisionCoverage.reduce((total, district) => total + Object.values(district.years).filter((year) => year.hasSample).length, 0);
  const linkedSourceIds = new Set(dataset.positions.flatMap((position) => position.sources || []));
  const annualPositionCoverage = decisionYears.map((year) => {
    const rows = dataset.positions.filter((position) => Number(position.year) === year);
    const districts = new Set(rows.map((position) => position.districtId).filter(Boolean)).size;
    const sources = new Set(rows.flatMap((position) => position.sources || [])).size;
    return `<div class="overview-coverage-year"><span>${year}</span><strong>${rows.length} 岗样例</strong><small>${districts} / 16 区 · ${sources} 个来源</small></div>`;
  }).join('');
  const coverageTile = `<a class="metric-card metric-purple coverage-spotlight citywide-coverage-tile" href="#/matrix"><div class="metric-top"><span>北京职位样例</span><span class="metric-icon">▤</span></div><div class="metric-value">${dataset.positions.length}<small>条岗位样例</small></div><div class="metric-note">${coveredDistricts} / 16 区有样例 · ${coveredCells} / 48 个区县年度格</div><div class="coverage-caveat">${linkedSourceIds.size} 个已关联来源 <span>查看矩阵 ↗</span></div></a>`;
  const cityCoveragePanel = `<article class="panel evidence-panel citywide-coverage-panel"><div class="panel-heading"><div><div class="eyebrow muted">BEIJING · POSITION DATA</div><h2>北京全市职位数据概览</h2></div><a class="panel-link" href="#/matrix">竞争矩阵 →</a></div><div class="overview-coverage-years">${annualPositionCoverage}</div><div class="citywide-source-summary"><span>已关联 ${linkedSourceIds.size} 个来源</span><span>${coveredDistricts} / 16 区有职位样例</span></div><div class="overview-coverage-links"><a href="#/positions">职位库 <span>↗</span></a><a href="#/matrix">竞争矩阵 <span>↗</span></a><a href="#/sources">来源与口径 <span>↗</span></a></div><div class="notice notice-soft"><span>ⓘ</span><p>覆盖只反映当前有来源的岗位样例；空白区县或年度格表示待补数据，不代表没有招录。</p></div></article>`;
  return `<div class="page-body">
    <section class="welcome-banner"><div class="welcome-copy"><div class="eyebrow"><span class="eyebrow-dot"></span> PERSONALISED STUDY DESK <span class="eyebrow-date">数据基准 ${escapeHtml(dataset.dataAsOf)}</span></div><h1>把每一步，变成<br/><em>有依据的进步。</em></h1><p>今天先做好计划里的下一件事。分数趋势和岗位判断，等你的真实数据到位再说。</p><div class="welcome-actions"><a class="button button-light" href="#/plan">打开今日计划 <span>↗</span></a><a class="welcome-link" href="#/profile">完善个人条件 <span>→</span></a></div></div><div class="welcome-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="art-sun"></div><div class="art-line art-line-one"></div><div class="art-line art-line-two"></div><div class="art-label">PLAN · PRACTICE<br/>· REFLECT</div><span class="art-star star-one">✦</span><span class="art-star star-two">✧</span></div></section>
    <section class="metric-grid">${metric('复习计划完成度', fmtPct(progress), `${done} / ${days.length} 天标记完成`, '↗', 'blue')}${metric('计划训练量', `${plannedTotals.questions.toLocaleString('zh-CN')}<small>题</small>`, `${fmt(plannedTotals.hours)} 小时计划投入`, '⌁', 'mint')}${metric('有效模考', `${mocks.length}<small> / 12</small>`, mocks.length ? `最近总分 ${fmt(latest.total, 1)} · 目标 ${fmt(target)}` : '尚无真实成绩记录', '◉', 'amber')}${coverageTile}</section>
    <section class="score-target-section" aria-label="真实模考与目标分差距"><div class="score-target-heading"><div><div class="eyebrow muted">REAL MOCK · TARGET DISTANCE</div><h2>离目标分还有多远？</h2><p>${latest ? `最近一次真实模考：${escapeHtml(latest.date || '日期待定')} · ${fmt(latest.total, 1)} 分` : '录入模考后，按真实总分计算目标差距；空白不会当作 0 分。'}</p></div><a class="panel-link" href="#/mocks">记录或复盘成绩 →</a></div><div class="score-target-grid">${scoreTargets}</div></section>
    <section class="quick-start-section"><div class="quick-start-heading"><div><div class="eyebrow muted">QUICK START</div><h2>我应该先做什么？</h2></div><button type="button" class="text-button" data-action="open-onboarding">第一次使用？3 分钟完成初始化 →</button></div><div class="quick-start-grid"><a class="quick-start-card" href="#/profile"><span class="quick-start-icon icon-profile">01</span><span class="quick-start-copy"><strong>完善个人报考条件</strong><small>${completedProfileFields} / ${profileFields.length} 项有内容</small></span><span class="quick-start-arrow">↗</span></a><a class="quick-start-card" href="#/plan"><span class="quick-start-icon icon-plan">02</span><span class="quick-start-copy"><strong>安排今天的学习</strong><small>${todayPlan ? `从 Day ${todayPlan.day} 开始 · ${escapeHtml(todayPlan.focus)}` : '打开 50 天学习计划'}</small></span><span class="quick-start-arrow">↗</span></a><button type="button" class="quick-start-card" data-action="add-mock"><span class="quick-start-icon icon-mock">03</span><span class="quick-start-copy"><strong>记录一次模考</strong><small>${mocks.length ? `已有 ${mocks.length} 次真实记录，继续复盘` : '录入首场成绩，建立自己的起点'}</small></span><span class="quick-start-arrow">↗</span></button><a class="quick-start-card" href="#/positions"><span class="quick-start-icon icon-jobs">04</span><span class="quick-start-copy"><strong>浏览北京京考职位库</strong><small>${dataset.positions.length} 条有来源样例 · 当前覆盖 ${new Set(dataset.positions.map((position) => position.districtId).filter(Boolean)).size} 个区县</small></span><span class="quick-start-arrow">↗</span></a></div></section>
    ${scienceReminder}${generalKnowledgeReminder}<section class="content-grid overview-grid"><article class="panel next-task-panel"><div class="panel-heading"><div><div class="eyebrow muted">STUDY PLAN</div><h2>${escapeHtml(dateNote)}</h2></div><a class="panel-link" href="#/plan">查看全部 50 天 →</a></div>${todayPlan ? `<div class="next-day"><div class="day-date"><strong>${String(todayPlan.day).padStart(2, '0')}</strong><small>${escapeHtml(fmtDate(todayPlan.date))}</small></div><div class="next-day-content"><div class="next-day-title"><strong>${escapeHtml(todayPlan.focus)}</strong>${chip(todayPlan.status, statusTone(todayPlan.status))}</div><p>${escapeHtml(todayPlan.coreTask)}</p><div class="task-tags"><span>▣ ${fmt(todayPlan.plannedQuestions)} 题</span><span>◷ ${fmt(todayPlan.plannedHours, 1)} 小时</span>${todayPlan.stage ? `<span>${escapeHtml(todayPlan.stage.replace(/^阶段\d+：/, ''))}</span>` : ''}</div></div></div><div class="task-footer"><span class="mini-progress-label">本日记录完成度</span><strong>${fmtPct(calculateDayCompletion(todayPlan))}</strong></div><div class="progress-track"><span style="width:${Math.round(calculateDayCompletion(todayPlan) * 100)}%"></span></div><a class="task-open" href="#/plan">记录今天的进度 <span>↗</span></a>` : `<div class="empty-state">工作簿中没有可显示的计划数据。</div>`}</article>
      ${cityCoveragePanel}
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

const APTITUDE_PLAN_LABELS = {
  'political-theory': '政治理论', verbal: '言语理解', quantitative: '数量关系',
  reasoning: '判断推理', 'data-analysis': '资料分析',
};
const PLAN_TASK_TYPES = [
  ...APTITUDE_MODULES.map((module) => [module.taskType, APTITUDE_PLAN_LABELS[module.id] || module.area]),
  ['essay', '申论'], ['comprehensive', '综合训练'], ['review', '复盘'], ['custom', '自定义'],
];
const PLAN_TASK_STATUSES = [['not_started', '未开始'], ['in_progress', '进行中'], ['completed', '已完成']];
const SCIENCE_ACTIVITY_TYPES = [['knowledge', '知识点学习'], ['practice', '专项练习'], ['exam', '限时模拟'], ['mistakes', '错题复习'], ['free', '自由学习']];

function planTaskStatusLabel(status) {
  return PLAN_TASK_STATUSES.find(([value]) => value === status)?.[1] || '未开始';
}

function planTaskTypeLabel(task) {
  if (task.taskType === 'custom') return task.customTypeName || '自定义';
  return PLAN_TASK_TYPES.find(([value]) => value === task.taskType)?.[1] || '学习任务';
}

function renderPlanTaskList() {
  const tasks = storage.studyPlanTasks.filter((task) => !task.archivedAt)
    .slice().sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const taskCards = tasks.map((task) => {
    const config = task.scienceConfig;
    const generalKnowledgeConfig = task.generalKnowledgeConfig;
    const progress = task.taskType === 'science_reasoning'
      ? getPlanTaskProgress(task, storage.scienceStudy.sessions, storage.scienceStudy.answers)
      : null;
    const generalKnowledgeProgress = task.taskType === 'general_knowledge'
      ? getGeneralKnowledgeTaskProgress(task, storage.generalKnowledgeStudy.sessions, storage.generalKnowledgeStudy.answers)
      : null;
    const aptitudeModule = getAptitudeModuleForTaskType(task.taskType);
    const aptitudeProgress = aptitudeModule
      ? getAptitudeModuleTaskProgress(task, storage.aptitudeModuleStudies[aptitudeModule.id].sessions, storage.aptitudeModuleStudies[aptitudeModule.id].answers)
      : null;
    const sciencePoint = config?.knowledgePointIds?.map(getKnowledgePoint).filter(Boolean)[0];
    const generalKnowledgePoint = generalKnowledgeConfig?.knowledgePointIds?.map(getGeneralKnowledgePoint).filter(Boolean)[0];
    const activity = SCIENCE_ACTIVITY_TYPES.find(([value]) => value === config?.activityType)?.[1];
    const generalKnowledgeActivity = SCIENCE_ACTIVITY_TYPES.find(([value]) => value === generalKnowledgeConfig?.activityType)?.[1];
    const scienceDetail = task.taskType === 'science_reasoning'
      ? `<span>${escapeHtml(activity || '自由学习')}${sciencePoint ? ` · ${escapeHtml(sciencePoint.title)}` : ''}${config?.targetQuestionCount ? ` · ${config.targetQuestionCount} 题` : ''}</span>${progress?.targetCount ? `<span>进度 ${progress.displayCount}/${progress.targetCount} ${progress.activityType === 'knowledge' ? '个知识点' : '题'}</span>` : ''}`
      : '';
    const generalKnowledgeDetail = task.taskType === 'general_knowledge'
      ? `<span>${escapeHtml(generalKnowledgeActivity || '自由学习')}${generalKnowledgePoint ? ` · ${escapeHtml(generalKnowledgePoint.title)}` : ''}${generalKnowledgeConfig?.targetQuestionCount ? ` · ${generalKnowledgeConfig.targetQuestionCount} 题` : ''}</span>${generalKnowledgeProgress?.targetCount ? `<span>进度 ${generalKnowledgeProgress.displayCount}/${generalKnowledgeProgress.targetCount} ${generalKnowledgeProgress.activityType === 'knowledge' ? '个知识点' : '题'}</span>` : ''}`
      : '';
    const aptitudeConfig = task.aptitudeConfig || {};
    const aptitudeActivity = SCIENCE_ACTIVITY_TYPES.find(([value]) => value === aptitudeConfig.activityType)?.[1] || '自由学习';
    const aptitudeDetail = aptitudeModule
      ? `<span>${escapeHtml(aptitudeModule.area)} · ${escapeHtml(aptitudeActivity)}${aptitudeConfig.targetQuestionCount ? ` · ${aptitudeConfig.targetQuestionCount} 题` : ''}</span>${aptitudeProgress?.targetCount ? `<span>进度 ${aptitudeProgress.displayCount}/${aptitudeProgress.targetCount} ${aptitudeProgress.activityType === 'knowledge' ? '个知识点' : '题'}</span>` : ''}`
      : '';
    const aptitudeHref = aptitudeModule ? `${aptitudeModule.route}?task=${encodeURIComponent(task.id)}` : '';
    const completionLabel = task.completionSource === 'system_verified' ? '系统核验完成' : '手动完成';
    return `<article class="plan-task-card ${task.status === 'completed' ? 'is-complete' : ''}">
      <div class="plan-task-date"><strong>${escapeHtml(fmtDate(task.date))}</strong><small>${escapeHtml(task.date)}</small></div>
      <div class="plan-task-main"><div class="plan-task-title-row"><span class="plan-task-type">${escapeHtml(planTaskTypeLabel(task))}</span><h3>${escapeHtml(task.title)}</h3>${chip(planTaskStatusLabel(task.status), task.status === 'completed' ? 'green' : task.status === 'in_progress' ? 'blue' : 'neutral')}</div>
        ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ''}<div class="plan-task-meta">${scienceDetail}${generalKnowledgeDetail}${aptitudeDetail}${task.estimatedMinutes !== null ? `<span>◷ ${fmt(task.estimatedMinutes)} 分钟</span>` : ''}<span>${task.priority === 'high' ? '高优先级' : task.priority === 'low' ? '低优先级' : '普通优先级'}</span>${task.status === 'completed' ? `<span>${completionLabel}</span>` : ''}</div>
      </div><div class="plan-task-actions">${aptitudeModule ? `<a class="button button-secondary button-small" href="${escapeHtml(aptitudeHref)}">查看模块</a>` : ''}${task.taskType === 'science_reasoning' ? `<a class="button button-secondary button-small" href="#/aptitude/science?task=${encodeURIComponent(task.id)}">开始</a>` : ''}${task.taskType === 'general_knowledge' ? `<a class="button button-secondary button-small" href="#/aptitude/general-knowledge?task=${encodeURIComponent(task.id)}">开始</a>` : ''}${button('编辑', 'edit-plan-task', 'button button-quiet button-small', `data-task-id="${escapeHtml(task.id)}"`)}${task.status === 'completed' ? button('标为未完成', 'reopen-plan-task', 'button button-quiet button-small', `data-task-id="${escapeHtml(task.id)}"`) : button('完成', 'complete-plan-task', 'button button-secondary button-small', `data-task-id="${escapeHtml(task.id)}"`)}${button('归档', 'archive-plan-task', 'button button-quiet button-small', `data-task-id="${escapeHtml(task.id)}"`)}</div>
    </article>`;
  }).join('');
  return `<section class="panel plan-task-panel"><div class="panel-heading"><div><div class="eyebrow muted">FLEXIBLE STUDY TASKS</div><h2>学习任务 <span class="heading-count">${tasks.length}</span></h2><p>新增任务与 50 天原始日程分开保存；归档会保留关联学习记录。</p></div><button type="button" class="button button-primary" data-action="add-plan-task" data-date="${todayString()}">＋ 新增学习任务</button></div>${tasks.length ? `<div class="plan-task-list">${taskCards}</div>` : '<div class="empty-state plan-task-empty">还没有自定义学习任务。你可以按日期添加常识判断或科学推理训练。</div>'}</section>`;
}

function renderPlan() {
  const days = getDays();
  const plannedTotals = getPlannedTotals(days);
  const completed = days.filter((day) => day.status === '已完成').length;
  const stages = [...new Set(days.map((day) => day.stage).filter(Boolean))];
  const rows = days.map((day) => `<tr><td><span class="day-number">${String(day.day).padStart(2, '0')}</span></td><td>${escapeHtml(fmtDate(day.date))}</td><td>${chip((day.stage || '').replace(/^阶段\d+：/, ''), 'blue-soft')}</td><td><strong>${escapeHtml(day.focus)}</strong><small class="cell-secondary">${escapeHtml(day.coreTask)}</small></td><td>${fmt(day.plannedQuestions)}<small class="cell-secondary">实际 ${fmt(day.actualQuestions)}</small></td><td>${fmt(day.plannedHours, 1)}h<small class="cell-secondary">实际 ${fmt(day.actualHours, 1)}h</small></td><td><div class="table-progress"><span style="width:${Math.round(calculateDayCompletion(day) * 100)}%"></span></div><small class="cell-secondary">${fmtPct(calculateDayCompletion(day))}</small></td><td>${chip(day.status, statusTone(day.status))}</td><td class="plan-actions">${button('改计划', 'edit-plan-day', 'button button-quiet button-small', `data-day="${day.day}"`)}${button('记录', 'edit-day', 'button button-quiet button-small', `data-day="${day.day}"`)}</td></tr>`).join('');
  return `<div class="page-body"><div class="page-heading-row"><div><div class="eyebrow muted">OCT 08 — NOV 26 · 2026</div><h1>学习计划</h1><p>自由添加日期、任务类型和学习内容；50 天日程、实际记录和自定义任务彼此独立保存。</p></div><div class="heading-actions">${chip(`${completed}/${days.length} 天完成`, 'green')}<a class="button button-primary" href="#/mocks">＋ 记录模考</a></div></div>${renderPlanTaskList()}<div class="metric-grid three-metrics">${metric('整体完成度', fmtPct(actualPlanCompletion()), '基于每日实际记录', '↗', 'blue')}${metric('计划题量', `${plannedTotals.questions.toLocaleString('zh-CN')}<small> 题</small>`, '客观题训练目标', '⌁', 'mint')}${metric('计划用时', `${fmt(plannedTotals.hours)}<small> 小时</small>`, '50 天总投入', '◷', 'amber')}</div><div class="panel phase-panel"><div class="panel-heading"><div><div class="eyebrow muted">PHASES</div><h2>分阶段进度</h2></div><span class="panel-hint">未填写的实际量按未记录展示</span></div><div class="phase-grid">${stages.map((stage) => { const list = days.filter((day) => day.stage === stage); const logged = list.map(calculateDayCompletion).filter(Number.isFinite); const pct = logged.length ? logged.reduce((sum, value) => sum + value, 0) / logged.length : null; return `<div class="phase-card"><div class="phase-top"><strong>${escapeHtml(stage)}</strong><span>${list.length} 天</span></div><div class="progress-track"><span style="width:${Math.round((pct ?? 0) * 100)}%"></span></div><small>${fmtPct(pct)} 完成</small></div>`; }).join('')}</div></div><div class="panel table-panel"><div class="panel-heading"><div><div class="eyebrow muted">DAILY SCHEDULE</div><h2>原始 50 天日程 <span class="heading-count">${days.length}</span></h2></div><div class="table-tools"><span class="panel-hint">“改计划”调整安排，“记录”填写实际进度</span></div></div><div class="table-scroll"><table class="data-table plan-table"><thead><tr><th>DAY</th><th>日期</th><th>阶段</th><th>今日主攻与核心任务</th><th>题量</th><th>用时</th><th>完成</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div></div></div>`;
}

function renderScienceDiagram(pointId) {
  if (pointId === 'physics:buoyancy') return `<figure class="science-diagram"><svg viewBox="0 0 420 220" role="img" aria-label="物体浸入液体时，下表面向上压力较大，合力形成浮力"><path d="M30 75h360v105H30z" fill="#dceff4" stroke="#90bdc8"/><path d="M30 75h360" stroke="#4c9dae" stroke-width="4"/><rect x="158" y="92" width="104" height="68" rx="8" fill="#f5b86c" stroke="#ca8241" stroke-width="3"/><path d="M210 153V108" stroke="#28766e" stroke-width="6"/><path d="m198 120 12-14 12 14" fill="none" stroke="#28766e" stroke-width="5"/><text x="222" y="117" fill="#225e59" font-size="18">浮力</text><text x="38" y="64" fill="#31515b" font-size="16">液面</text><text x="172" y="192" fill="#31515b" font-size="15">浸入液体的体积决定排开液体体积</text></svg><figcaption>浮力来自液体对物体表面的压力差；计算时使用实际排开液体的体积。</figcaption></figure>`;
  if (pointId === 'physics:ohms-law') return `<figure class="science-diagram"><svg viewBox="0 0 420 190" role="img" aria-label="闭合电路中电源、电阻和电流方向示意"><path d="M85 50h105m80 0h65v90h-85m-80 0H85z" fill="none" stroke="#55757b" stroke-width="5"/><path d="M190 34v32m18-40v48" stroke="#55757b" stroke-width="5"/><path d="M250 35v30m10-25v20m10-20v20m10-20v20m10-20v20m10-20v20" stroke="#ce8747" stroke-width="4"/><path d="M116 50h40" stroke="#28766e" stroke-width="4"/><path d="m146 42 12 8-12 8" fill="none" stroke="#28766e" stroke-width="4"/><text x="125" y="37" fill="#225e59" font-size="16">I</text><text x="181" y="115" fill="#31515b" font-size="15">电源 U</text><text x="252" y="115" fill="#31515b" font-size="15">电阻 R</text></svg><figcaption>在温度等条件不变、符合欧姆定律时，电流 I=U/R。</figcaption></figure>`;
  return '';
}

function renderScienceLesson(point, task = null) {
  if (!point) return `<div class="page-body"><div class="empty-state">没有找到这个知识点。</div><a class="button button-secondary" href="#/aptitude/science">返回科学推理</a></div>`;
  const pointQuestions = SCIENCE_QUESTION_BANK.filter((question) => question.knowledgePointIds.includes(point.id));
  const progress = storage.scienceStudy.knowledgeProgress[point.id];
  const learningStatus = progress?.status === 'completed' ? '已学完' : progress?.status === 'learning' ? '学习中' : '未开始';
  const isPointFavorite = storage.scienceStudy.favoriteKnowledgePointIds.includes(point.id);
  const isPointUnclear = storage.scienceStudy.unclearKnowledgePointIds.includes(point.id);
  if (!point.content) {
    return `<div class="page-body science-page"><div class="page-heading-row"><div><div class="eyebrow muted">${escapeHtml(point.subjectTitle)} · ${escapeHtml(point.topicTitle)}</div><h1>${escapeHtml(point.title)}</h1><p>该知识点已进入目录，完整讲义仍在编校；页面不会把提纲当作已发布知识内容。</p></div><a class="button button-secondary" href="#/aptitude/science">返回知识目录</a></div><section class="panel science-outline-panel"><span class="science-content-status">目录提纲</span><h2>本点题目</h2><p>${pointQuestions.length} 道已发布题目，题面会注明官方例题、考生回忆版、机构模拟题或现有原创练习来源。</p><button type="button" class="button button-primary" data-action="open-science-practice" data-point-id="${escapeHtml(point.id)}">按此知识点练习</button></section></div>`;
  }
  const content = point.content;
  const formulas = (content.formulas || []).map((formula) => `<article class="science-formula"><strong>${escapeHtml(formula.expression)}</strong><p>${escapeHtml(formula.variables)}</p><small>${escapeHtml(formula.conditions)}</small></article>`).join('');
  const examples = (content.examples || []).map((example) => `<article class="science-example"><h3>${escapeHtml(example.title)}</h3><p>${escapeHtml(example.stem)}</p><div class="science-example-options">${example.options.map((option) => `<span class="${option.id === example.answer ? 'is-correct' : ''}"><b>${option.id}</b>${escapeHtml(option.text)}</span>`).join('')}</div><ol>${example.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol><details><summary>查看各选项分析</summary><ul>${Object.entries(example.optionExplanations).map(([key, value]) => `<li><strong>${key}：</strong>${escapeHtml(value)}</li>`).join('')}</ul></details></article>`).join('');
  const completed = progress?.status === 'completed';
  return `<div class="page-body science-page"><div class="page-heading-row"><div><div class="eyebrow muted">${escapeHtml(point.subjectTitle)} · ${escapeHtml(point.topicTitle)} · KNOWLEDGE</div><h1>${escapeHtml(point.title)}</h1><p>${escapeHtml(content.summary)}</p></div><div class="heading-actions"><a class="button button-secondary" href="#/aptitude/science">知识目录</a>${chip(learningStatus, completed ? 'green' : progress?.status === 'learning' ? 'blue' : 'neutral')}</div></div>
    <div class="science-lesson-layout"><article class="panel science-lesson-main"><section><span class="science-section-kicker">原理解释</span><p>${escapeHtml(content.explanation)}</p></section>${renderScienceDiagram(point.id)}${content.principle ? `<section class="science-principle"><span class="science-section-kicker">核心规律</span><p>${escapeHtml(content.principle)}</p></section>` : ''}${formulas ? `<section><span class="science-section-kicker">公式与适用条件</span><div class="science-formula-grid">${formulas}</div></section>` : ''}<section><span class="science-section-kicker">生活例子</span><p>${escapeHtml(content.everydayExample)}</p></section>${examples ? `<section><span class="science-section-kicker">分步例题</span><div class="science-examples">${examples}</div></section>` : ''}${content.commonMistakes?.length ? `<section class="science-mistakes-note"><span class="science-section-kicker">常见误区</span><ul>${content.commonMistakes.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>` : ''}${content.quickMethod ? `<section class="science-quick-method"><span class="science-section-kicker">快速检查</span><p>${escapeHtml(content.quickMethod)}</p></section>` : ''}
    <div class="science-lesson-footer"><button type="button" class="button button-secondary" data-action="start-science-knowledge" data-point-id="${escapeHtml(point.id)}" ${progress?.status === 'learning' || completed ? 'disabled' : ''}>${progress?.status === 'learning' ? '正在学习' : completed ? '已学完' : '标记正在学习'}</button><button type="button" class="button button-primary" data-action="complete-science-knowledge" data-point-id="${escapeHtml(point.id)}" ${completed ? 'disabled' : ''}>${completed ? '已完成知识点学习' : '完成知识点学习'}</button><button type="button" class="button button-secondary" data-action="toggle-science-knowledge-favorite" data-point-id="${escapeHtml(point.id)}">${isPointFavorite ? '★ 已收藏知识点' : '☆ 收藏知识点'}</button><button type="button" class="button button-quiet" data-action="toggle-science-knowledge-unclear" data-point-id="${escapeHtml(point.id)}">${isPointUnclear ? '已标记不理解 · 取消' : '标记不理解'}</button><button type="button" class="button button-secondary" data-action="open-science-practice" data-point-id="${escapeHtml(point.id)}">练习此知识点</button>${task ? `<span>任务：${escapeHtml(task.title)}</span>` : ''}</div></article><aside class="science-lesson-aside"><section class="panel"><span class="eyebrow muted">本点练习</span><strong class="science-aside-number">${pointQuestions.length}</strong><p>道已发布题目</p><small>官方大纲例题、公开回忆题、机构模拟和既有原创练习均逐题标注来源。</small></section><section class="panel"><span class="eyebrow muted">学习记录</span><strong>${completed ? escapeHtml(fmtDate(progress.completedAt?.slice(0, 10))) : learningStatus}</strong><p>${progress?.lastViewedAt ? `最近更新 ${escapeHtml(fmtDate(progress.lastViewedAt.slice(0, 10)))}` : '开始学习和标记学完都由你主动确认。'}</p></section></aside></div>
  </div>`;
}

function renderScienceSession(session) {
  const sessionAnswers = storage.scienceStudy.answers.filter((answer) => answer.sessionId === session.id);
  const correct = sessionAnswers.filter((answer) => answer.isCorrect).length;
  const isExam = session.mode === 'exam';
  const progressLabel = `${Math.min(session.currentIndex + 1, session.questionIds.length)} / ${session.questionIds.length} 题`;
  if (session.status === 'completed' || session.status === 'timed_out') {
    const reviewRows = session.questionIds.map((questionId, index) => {
      const question = SCIENCE_QUESTION_BANK.find((item) => item.id === questionId);
      const answer = sessionAnswers.find((item) => item.questionId === questionId);
      if (!question) return '';
      const statusLabel = answer ? answer.isCorrect ? '答对' : '答错' : '未作答';
      const selectedLabel = answer ? `你的选择 ${escapeHtml(answer.selectedOptionId)}` : '未提交答案';
      return `<article class="science-result-row ${answer ? answer.isCorrect ? 'is-correct' : 'is-wrong' : 'is-unanswered'}"><div><strong>第 ${index + 1} 题 · ${statusLabel} · ${escapeHtml(question.subjectTitle)}</strong><span>${escapeHtml(question.stem)}</span></div><p>${escapeHtml(question.explanation)}</p><small>${selectedLabel} · 正确答案 ${escapeHtml(question.correctAnswer)}</small></article>`;
    }).join('');
    const scoreText = isExam
      ? `${correct} / ${session.questionIds.length} 题 · 得分率 ${Math.round((session.scoreRate || 0) * 100)}% · 已答题准确率 ${session.answeredAccuracy === null ? '—' : `${Math.round(session.answeredAccuracy * 100)}%`}`
      : `${correct} / ${sessionAnswers.length} 题答对 · ${sessionAnswers.length ? Math.round(correct / sessionAnswers.length * 100) : 0}% 正确`;
    const resultHref = session.planTaskId ? '#/plan' : '#/aptitude/science';
    const resultLinkLabel = session.planTaskId ? '返回学习计划' : '返回科学推理';
    return `<div class="page-body science-page"><div class="page-heading-row"><div><div class="eyebrow muted">${isExam ? 'TIMED MOCK REVIEW' : 'PRACTICE REVIEW'}</div><h1>${session.status === 'timed_out' ? '模拟已到时' : isExam ? '模拟已交卷' : '训练完成'}</h1><p>${scoreText}</p></div><a class="button button-secondary" href="${resultHref}">${resultLinkLabel}</a></div><section class="panel science-results-panel"><div class="science-result-summary"><strong>${correct}<small> / ${session.questionIds.length}</small></strong><span>${isExam ? '答对 / 本场总题数' : '正确题数'}</span><p>${session.status === 'timed_out' ? '时间到后保留已选答案，空题计入总题数但不计入已答题准确率。' : '答案和逐题解析已保存；答错的题目会加入错题本。'}</p></div><div class="science-result-list">${reviewRows || '<div class="empty-state">本次没有可复盘题目。</div>'}</div><button type="button" class="button button-primary" data-action="open-science-practice">再练一组</button></section></div>`;
  }

  if (isExam && session.currentIndex >= session.questionIds.length) {
    const answeredIds = new Set(Object.keys(session.draftAnswers || {}));
    const questionMap = session.questionIds.map((questionId, index) => `<button type="button" class="science-exam-number ${answeredIds.has(questionId) ? 'is-answered' : 'is-unanswered'}" data-action="go-to-exam-question" data-session-id="${escapeHtml(session.id)}" data-index="${index}" aria-label="第 ${index + 1} 题${answeredIds.has(questionId) ? '已答' : '未答'}">${index + 1}</button>`).join('');
    const unanswered = session.questionIds.length - answeredIds.size;
    return `<div class="page-body science-page"><div class="page-heading-row"><div><div class="eyebrow muted">TIMED MOCK · ANSWER SHEET</div><h1>检查答题卡</h1><p>已选 ${answeredIds.size} 题 · 未答 ${unanswered} 题。交卷后会显示成绩和全部解析。</p></div><div class="science-session-clock"><span class="eyebrow muted">剩余时间</span><strong id="science-exam-countdown" data-deadline="${escapeHtml(session.deadline)}">计算中</strong><button type="button" class="button button-quiet" data-action="leave-science-session">暂时退出</button></div></div><section class="panel science-exam-sheet"><div class="science-exam-question-map">${questionMap}</div><div class="science-question-footer">${button('返回第一题', 'go-to-exam-question', 'button button-secondary', `data-session-id="${escapeHtml(session.id)}" data-index="0"`)}${button(unanswered ? `确认交卷（${unanswered} 题未答）` : '确认交卷', 'finish-science-exam', 'button button-primary', `data-session-id="${escapeHtml(session.id)}"`)}</div></section></div>`;
  }

  const question = SCIENCE_QUESTION_BANK.find((item) => item.id === session.questionIds[session.currentIndex]);
  if (!question) return `<div class="page-body science-page"><div class="empty-state">题目数据缺失。</div></div>`;
  const answer = session.reviewingAnswerId ? sessionAnswers.find((item) => item.id === session.reviewingAnswerId) : null;
  const examSelection = session.draftAnswers?.[question.id]?.optionId;
  const options = question.options.map((option) => {
    if (isExam) {
      const selected = examSelection === option.id;
      return `<button type="button" class="science-answer-option ${selected ? 'is-selected' : ''}" data-action="select-exam-answer" data-session-id="${escapeHtml(session.id)}" data-option-id="${escapeHtml(option.id)}"><span>${escapeHtml(option.id)}</span><strong>${escapeHtml(option.text)}</strong><small>${selected ? '已选' : '选择'}</small></button>`;
    }
    const selected = answer?.selectedOptionId === option.id;
    const correctOption = answer && question.correctAnswer === option.id;
    const marker = answer ? selected ? (answer.isCorrect ? '✓ 你的答案' : '你的答案') : correctOption ? '正确答案' : '' : '';
    const tone = answer ? correctOption ? 'is-correct' : selected ? 'is-wrong' : '' : '';
    return answer
      ? `<div class="science-answer-option ${tone}"><span>${option.id}</span><strong>${escapeHtml(option.text)}</strong><small>${marker}</small></div>`
      : `<button type="button" class="science-answer-option" data-action="answer-science-question" data-session-id="${escapeHtml(session.id)}" data-option-id="${escapeHtml(option.id)}"><span>${option.id}</span><strong>${escapeHtml(option.text)}</strong><small>选择</small></button>`;
  }).join('');
  const review = isExam
    ? examSelection ? '<div class="notice notice-soft"><span>✓</span><p>答案已保存。交卷前可修改，模拟结束前不显示答案和解析。</p></div>' : ''
    : answer
      ? `<div class="science-answer-explanation ${answer.isCorrect ? 'is-correct' : 'is-wrong'}"><strong>${answer.isCorrect ? '回答正确' : `回答不正确 · 正确答案 ${escapeHtml(question.correctAnswer)}`}</strong><p>${escapeHtml(question.explanation)}</p></div>`
      : '';
  const actions = isExam
    ? `<div class="science-exam-controls">${button('上一题', 'go-to-exam-question', 'button button-secondary', `data-session-id="${escapeHtml(session.id)}" data-index="${Math.max(0, session.currentIndex - 1)}" ${session.currentIndex === 0 ? 'disabled' : ''}`)}<span>第 ${progressLabel} · 已答 ${Object.keys(session.draftAnswers || {}).length} 题</span>${button(session.currentIndex + 1 === session.questionIds.length ? '检查答题卡' : '下一题', 'advance-exam-question', 'button button-primary', `data-session-id="${escapeHtml(session.id)}"`)}${button('交卷', 'finish-science-exam', 'button button-quiet', `data-session-id="${escapeHtml(session.id)}"`)}</div>`
    : answer
      ? button(session.currentIndex + 1 >= session.questionIds.length ? '完成练习' : '下一题', 'continue-science-session', 'button button-primary', `data-session-id="${escapeHtml(session.id)}"`)
      : `<div class="science-question-actions">${button(storage.scienceStudy.favorites.includes(question.id) ? '★ 已收藏' : '☆ 收藏题目', 'toggle-science-favorite', 'button button-quiet', `data-question-id="${escapeHtml(question.id)}"`)}<span>选择答案后会自动保存并显示复盘。</span></div>`;
  const source = SCIENCE_SOURCES.find((item) => item.id === question.sourceId);
  const sourceTitle = question.sourceTitle || source?.title || '题源信息待补充';
  const sourceLink = source?.url ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(sourceTitle)} ↗</a>` : `<span>${escapeHtml(sourceTitle)}</span>`;
  const originalQuestionReference = renderOriginalQuestionReference(question);
  const sourceLabel = ({ original: '项目原创', official_outline_example: '官方大纲例题', verified_exam: '公开真题', recalled: '考生回忆版', third_party_mock: '机构模拟题', licensed: '授权题目' })[question.sourceType] || '题源待核';
  const presentationLabel = question.sourceType !== 'original' || question.presentationMode === 'adapted' ? ' · 题意重述' : '';
  return `<div class="page-body science-page"><div class="page-heading-row"><div><div class="eyebrow muted">${isExam ? 'TIMED MOCK' : 'PRACTICE'}</div><h1>${isExam ? '科学推理限时模拟' : '科学推理练习'}</h1><p>${isExam ? `第 ${progressLabel} · 已答 ${Object.keys(session.draftAnswers || {}).length} 题` : `第 ${progressLabel} · ${correct} 题答对`}</p></div><div class="science-session-clock">${isExam ? `<span class="eyebrow muted">剩余时间</span><strong id="science-exam-countdown" data-deadline="${escapeHtml(session.deadline)}">计算中</strong>` : ''}<button type="button" class="button button-quiet" data-action="leave-science-session">暂时退出</button></div></div><section class="panel science-question-panel"><div class="science-question-meta"><span>${escapeHtml(question.subjectTitle)}</span><span>${escapeHtml(question.difficulty === 'easy' ? '基础' : question.difficulty === 'medium' ? '中等' : '进阶')}</span><span>${sourceLabel}${presentationLabel}</span>${originalQuestionReference}</div><h2>${escapeHtml(question.stem)}</h2>${question.diagramSvg ? `<div class="science-source-diagram">${question.diagramSvg}</div>` : ''}<div class="science-answer-options">${options}</div><div class="science-source-attribution">题目来源：${sourceLink}${question.sourceNote ? `<small>${escapeHtml(question.sourceNote)}</small>` : ''}</div>${review}<div class="science-question-footer">${actions}</div></section></div>`;
}

function renderScience() {
  const stats = getScienceStats(storage.scienceStudy);
  const routeTask = activeSciencePlanTaskId
    ? storage.studyPlanTasks.find((task) => task.id === activeSciencePlanTaskId && task.taskType === 'science_reasoning')
    : null;
  const selectedPointId = selectedScienceKnowledgePointId
    || (routeTask?.scienceConfig?.activityType === 'knowledge' ? routeTask.scienceConfig.knowledgePointIds[0] : null);
  const selectedPoint = selectedPointId ? getKnowledgePoint(selectedPointId) : null;
  if (selectedPoint) return renderScienceLesson(selectedPoint, routeTask);

  const routedSession = activeScienceSessionId
    ? storage.scienceStudy.sessions.find((session) => session.id === activeScienceSessionId)
    : null;
  if (routedSession) return renderScienceSession(routedSession);

  const taskSessions = routeTask
    ? storage.scienceStudy.sessions.filter((session) => session.planTaskId === routeTask.id)
    : [];
  const linkedSession = routeTask
    ? taskSessions.find((session) => session.status === 'active')
      || (routeTask.status === 'completed' ? taskSessions.filter((session) => ['completed', 'timed_out'].includes(session.status)).at(-1) : null)
    : null;
  if (linkedSession) return renderScienceSession(linkedSession);

  if (routeTask && routeTask.scienceConfig.activityType !== 'free' && routeTask.scienceConfig.activityType !== 'knowledge') {
    const config = routeTask.scienceConfig;
    const progress = getPlanTaskProgress(routeTask, storage.scienceStudy.sessions, storage.scienceStudy.answers);
    const modeLabel = config.activityType === 'exam' ? '限时模拟' : config.activityType === 'mistakes' ? '错题复习' : '专项练习';
    const point = config.knowledgePointIds?.map(getKnowledgePoint).find(Boolean);
    const progressCopy = progress.targetCount
      ? `已记录 ${progress.progressCount}/${progress.targetCount} 题，还需 ${progress.remainingCount} 题。`
      : '';
    return `<div class="page-body science-page"><div class="page-heading-row"><div><div class="eyebrow muted">PLAN TASK · ${escapeHtml(routeTask.date)}</div><h1>${escapeHtml(routeTask.title)}</h1><p>${escapeHtml(modeLabel)} · 目标 ${config.targetQuestionCount} 题${config.durationSeconds ? ` · ${Math.round(config.durationSeconds / 60)} 分钟` : ''}</p></div><a class="button button-secondary" href="#/plan">返回计划</a></div><section class="panel science-task-start"><span class="eyebrow muted">${escapeHtml(point?.subjectTitle || '全部学科')}${point ? ` · ${escapeHtml(point.topicTitle)} · ${escapeHtml(point.title)}` : ''}</span><h2>准备好开始这项任务了吗？</h2><p>${progressCopy}计划任务会按剩余题量和设定的筛选条件选题；重复做过的题不重复计入进度。</p><button type="button" class="button button-primary" data-action="start-science-task" data-task-id="${escapeHtml(routeTask.id)}">开始${escapeHtml(modeLabel)}</button></section></div>`;
  }

  const activeSession = storage.scienceStudy.sessions.find((session) => session.status === 'active');
  const subjects = getScienceTree().map((subject) => {
    const topics = subject.topics.map((topic) => {
      const points = topic.knowledgePoints.map((point) => {
        const count = SCIENCE_QUESTION_BANK.filter((question) => question.knowledgePointIds.includes(point.id)).length;
        return `<a class="science-point-link ${point.contentStatus}" href="#/aptitude/science?knowledge=${encodeURIComponent(point.id)}"><span>${escapeHtml(point.title)}</span><small>${point.contentStatus === 'published' ? '讲义已发布' : '目录提纲'} · ${count} 题</small></a>`;
      }).join('');
      return `<details class="science-topic-card"><summary><strong>${escapeHtml(topic.title)}</strong><span>${topic.knowledgePoints.length} 个知识点</span></summary><div class="science-point-links">${points}</div></details>`;
    }).join('');
    return `<section class="panel science-subject-card science-subject-${subject.id}"><div class="science-subject-heading"><span>${escapeHtml(subject.title.slice(0, 1))}</span><div><h2>${escapeHtml(subject.title)}</h2><small>${subject.topics.reduce((sum, topic) => sum + topic.knowledgePoints.length, 0)} 个知识点 · ${SCIENCE_QUESTION_BANK.filter((question) => question.subjectId === subject.id).length} 道练习题</small></div></div><div class="science-topic-list">${topics}</div></section>`;
  }).join('');
  const mistakeIds = Object.keys(storage.scienceStudy.mistakes);
  const favoriteCount = storage.scienceStudy.favorites.length;
  const questionCounts = Object.fromEntries(['original', 'official_outline_example', 'recalled', 'third_party_mock']
    .map((sourceType) => [sourceType, SCIENCE_QUESTION_BANK.filter((question) => question.sourceType === sourceType).length]));
  const sourceRows = SCIENCE_SOURCES.map((source) => {
    const typeLabel = source.sourceType === 'official_outline_example' ? '官方大纲例题' : source.sourceType === 'recalled' ? '考生回忆版' : source.sourceType === 'third_party_mock' ? '机构模拟题' : source.sourceType;
    const checkLabel = source.verificationStatus === 'verified' ? '已核对题面来源' : '待补原始材料';
    const sourceCount = SCIENCE_QUESTION_BANK.filter((question) => question.sourceId === source.id).length;
    return `<article class="science-source-row"><div><strong>${escapeHtml(source.title)}</strong><span>${escapeHtml(source.organization)} · ${escapeHtml(typeLabel)}${source.examYear ? ` · ${source.examYear}` : ''}</span><small>${escapeHtml(source.note)}</small></div><div class="science-source-actions"><span class="science-source-status ${source.verificationStatus}">${checkLabel}</span><small>${sourceCount ? `${sourceCount} 道入库题` : '来源索引'}</small><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">打开来源 ↗</a></div></article>`;
  }).join('');
  return `<div class="page-body science-page"><div class="page-heading-row"><div><div class="eyebrow muted">FOUR SCIENCE SUBJECTS · SOURCED QUESTION BANK</div><h1>科学推理</h1><p>知识点学习、专项练习、限时模拟和错题复习会单独记录。现有原创练习保留发布；新收录题目均标注官方例题、回忆题或机构模拟来源。</p></div><div class="heading-actions"><button type="button" class="button button-primary" data-action="open-science-practice">开始自由练习</button><a class="button button-secondary" href="#/plan">安排学习任务</a></div></div>
    <div class="metric-grid science-metrics">${metric('练习题库', `${SCIENCE_QUESTION_BANK.length}<small> 道</small>`, `${questionCounts.official_outline_example} 道官方大纲例题 · ${questionCounts.recalled} 道回忆题 · ${questionCounts.third_party_mock} 道机构模拟 · ${questionCounts.original} 道现有原创`, '⚗', 'blue')}${metric('已作答', `${stats.attemptedCount}<small> 题</small>`, `${stats.completedSessionCount} 次练习完成`, '✓', 'mint')}${metric('实际正确率', fmtPct(stats.accuracy), stats.accuracy === null ? '暂无答案记录' : '按已提交答案计算', '◎', 'amber')}${metric('错题 / 收藏', `${mistakeIds.length}<small> / ${favoriteCount}</small>`, '错题和收藏独立保存', '☆', 'purple')}</div>
    ${renderAptitudeRecords(APTITUDE_MODULES.find((module) => module.id === 'science'), aptitudeItemsForArea('科学推理'))}
    <section class="science-shortcuts">${activeSession ? `<a class="panel science-shortcut-card science-resume-card" href="#/aptitude/science?session=${encodeURIComponent(activeSession.id)}"><span>继续未完成训练 · ${activeSession.mode === 'exam' ? '限时模拟' : '专项练习'}</span><strong>第 ${activeSession.currentIndex + 1} / ${activeSession.questionIds.length} 题</strong><small>剩余答题和已选答案均已保存</small></a>` : ''}<button type="button" class="panel science-shortcut-card" data-action="open-science-practice" data-mode="mistakes"><span>错题复习</span><strong>${mistakeIds.length} 道</strong><small>仅从已记录错题中抽题</small></button><button type="button" class="panel science-shortcut-card" data-action="open-science-practice" data-mode="exam"><span>随机组卷模考</span><strong>自选题量与时长</strong><small>从已核验题目抽题；专项练习和错题记录继续保留</small></button><a class="panel science-shortcut-card" href="#/plan"><span>学习计划</span><strong>把训练排进日程</strong><small>通过计划任务核验实际完成量</small></a></section>${renderAptitudeModuleMockModes('science', { includeRandom: false })}
    <div class="science-subject-grid">${subjects}</div>
    <section class="panel science-source-panel"><div class="science-panel-heading"><div><span class="eyebrow muted">SOURCE CATALOG</span><h2>官方与公开题源</h2><p>“官方大纲例题”来自考试大纲；“考生回忆版”和“机构模拟题”均明确标为非官方。</p></div><span>${SCIENCE_SOURCES.length} 个来源</span></div><div class="science-source-list">${sourceRows}</div></section>
  </div>`;
}

function renderAptitudeOverallMockModes() {
  const bank = getAptitudeMockQuestionBank();
  const papers = getCompleteAptitudePapers(null, bank).filter((paper) => paper.isFullPaper);
  const activeSession = storage.aptitudeOverallStudy.sessions.find((session) => session.status === 'active' && session.mode === 'exam');
  const resume = activeSession
    ? `<a class="button button-quiet" href="#/aptitude?session=${encodeURIComponent(activeSession.id)}">继续未完成模考 · 第 ${activeSession.currentIndex + 1}/${activeSession.questionIds.length} 题</a>` : '';
  return `<section class="panel aptitude-mock-mode-panel"><div class="panel-heading"><div><div class="eyebrow muted">APTITUDE MOCK</div><h2>行测整卷与随机组卷</h2><p>跨模块随机卷只抽题面、答案、解析和题源均已核验的题目；共用材料按题组抽取。</p></div><span>${bank.length} 道可组卷题</span></div><div class="aptitude-mock-mode-actions"><button type="button" class="button button-secondary" data-action="open-aptitude-paper-picker" data-scope="all">选择整套行测卷${papers.length ? ` · ${papers.length} 套` : ''}</button><button type="button" class="button button-primary" data-action="open-aptitude-overall-random-setup" ${bank.length ? '' : 'disabled aria-disabled="true"'}>开始跨模块随机卷</button>${resume}</div>${papers.length ? '' : '<p class="panel-hint">完整来源卷仍在核题；目前不把分模块摘录题合成整卷。</p>'}</section>`;
}

function renderAptitudeModuleMockModes(moduleId, { includeRandom = true } = {}) {
  const bank = getAptitudeMockQuestionBank(moduleId);
  const papers = getCompleteAptitudePapers(moduleId).filter((paper) => paper.moduleId === moduleId);
  const module = APTITUDE_MODULES.find((item) => item.id === moduleId);
  if (!module) return '';
  const randomAction = moduleId === 'science' ? 'open-science-practice'
    : moduleId === 'general-knowledge' ? 'open-general-knowledge-practice' : 'open-aptitude-module-practice';
  const randomButton = includeRandom
    ? `<button type="button" class="button button-primary button-small" data-action="${randomAction}" data-module-id="${escapeHtml(moduleId)}" data-mode="exam" ${bank.length ? '' : 'disabled aria-disabled="true"'}>本模块随机组卷</button>` : '';
  return `<section class="panel aptitude-module-mock-modes"><div><div class="eyebrow muted">${escapeHtml(module.area)} · 模考</div><strong>来源卷完整分区与随机组卷</strong><small>${bank.length} 道题已通过题面、答案、解析和来源核验。</small></div><div class="aptitude-mock-mode-actions"><button type="button" class="button button-secondary button-small" data-action="open-aptitude-paper-picker" data-scope="${escapeHtml(moduleId)}">选择完整分区卷${papers.length ? ` · ${papers.length} 套` : ''}</button>${randomButton}</div></section>`;
}

function openAptitudeOverallRandomMockSetup() {
  const bank = getAptitudeMockQuestionBank();
  if (!bank.length) { notify('当前没有通过核验、可用于随机组卷的题目。'); return; }
  const defaultCount = Math.min(60, bank.length);
  renderModal(`<form id="aptitude-overall-random-setup"><div class="modal-head"><div><div class="eyebrow muted">APTITUDE · RANDOM MOCK</div><h2>设置行测跨模块随机卷</h2><p>从七个行测模块的已核验题目中抽题；共用材料会作为完整题组一起进入试卷。</p></div><button type="button" class="modal-close" data-action="close-modal" aria-label="关闭">×</button></div><div class="modal-body"><div class="form-grid"><label class="form-field"><span>目标题量</span><input name="targetQuestionCount" type="number" min="1" max="${bank.length}" value="${defaultCount}" required/></label><label class="form-field"><span>答题时长（分钟）</span><input name="durationMinutes" type="number" min="1" value="${defaultCount}" required/></label></div><p class="panel-hint">当前可用 ${bank.length} 道题。新收录题目只有在题面、答案、解析及来源通过核验后才会进入随机题池。</p></div><div class="modal-footer"><button type="button" class="button button-quiet" data-action="close-modal">取消</button><button type="submit" class="button button-primary">开始随机模考</button></div></form>`);
}

function openAptitudePaperPicker(scope = 'all') {
  const moduleId = scope === 'all' ? null : scope;
  const papers = getCompleteAptitudePapers(moduleId);
  const cards = papers.map((paper) => `<article class="aptitude-paper-choice"><div><strong>${escapeHtml(paper.title)}</strong><small>${escapeHtml(paper.region)} · ${paper.examYear} · ${paper.questionCount} 题${paper.moduleId ? ` · ${escapeHtml(getAptitudeModuleLabel(paper.moduleId))}完整分区` : ' · 完整行测卷'}</small><a href="${escapeHtml(safeUrl(paper.sourceUrl))}" target="_blank" rel="noopener noreferrer">查看题源 ↗</a> · <a href="${escapeHtml(safeUrl(paper.answerUrl))}" target="_blank" rel="noopener noreferrer">查看答案来源 ↗</a></div><button type="button" class="button button-primary button-small" data-action="start-aptitude-paper" data-paper-id="${escapeHtml(paper.id)}" data-scope-module-id="${escapeHtml(paper.moduleId || '')}">开始整卷</button></article>`).join('');
  const scopeName = moduleId ? getAptitudeModuleLabel(moduleId) : '行测';
  renderModal(`<div class="modal-head"><div><div class="eyebrow muted">VERIFIED SOURCE PAPERS</div><h2>选择${scopeName}${moduleId ? '完整分区卷' : '整套卷'}</h2><p>只展示题号连续、题面与答案解析完整、必要材料齐全且来源可核验的试卷。</p></div><button type="button" class="modal-close" data-action="close-modal" aria-label="关闭">×</button></div><div class="modal-body">${cards || `<div class="empty-state"><strong>暂无可用${scopeName}${moduleId ? '完整分区卷' : '整套卷'}</strong><small>目前公开题源批次仍缺题或缺必要材料；对应题目已保留在已核验的随机题池中，不拼成不完整卷。</small></div>`}</div><div class="modal-footer"><button type="button" class="button button-secondary" data-action="close-modal">关闭</button></div>`);
}

function renderAptitude() {
  const routedSession = activeAptitudeOverallSessionId
    ? storage.aptitudeOverallStudy.sessions.find((session) => session.id === activeAptitudeOverallSessionId)
    : null;
  if (routedSession) return renderAptitudeOverallSession(routedSession);
  const aptitude = dataset.aptitude.map((item, index) => ({ ...item, ...(storage.aptitudeLogs[index] || {}), index }));
  const modules = APTITUDE_MODULES.map((module) => ({
    ...module,
    items: aptitude.filter((item) => item.area === module.area),
  }));
  const onlineStatsByModule = new Map(modules.map((module) => [module.id, getAptitudeModuleOnlineStats(module)]));
  const onlineStats = [...onlineStatsByModule.values()];
  const overall = combineAptitudeSummary(summarizeAptitudeItems(aptitude), ...onlineStats);
  const modulesWithRecords = modules.filter((module) => summarizeAptitudeItems(module.items).hasManualRecords
    || onlineStatsByModule.get(module.id).attemptedCount > 0).length;
  const cards = modules.map((module) => {
    const manualSummary = summarizeAptitudeItems(module.items);
    const summary = combineAptitudeSummary(manualSummary, onlineStatsByModule.get(module.id));
    return `<article class="panel aptitude-entry-card"><a class="aptitude-entry-icon module-${module.id}" href="${escapeHtml(module.route)}" aria-label="进入${escapeHtml(module.area)}">${escapeHtml(module.symbol)}</a><a class="aptitude-entry-copy" href="${escapeHtml(module.route)}"><strong>${escapeHtml(module.area)}</strong><small>${escapeHtml(module.hint)}</small></a><span class="aptitude-entry-stat aptitude-entry-accuracy"><strong>${fmtPct(summary.accuracy)}</strong><small>合并正确率</small></span><span class="aptitude-entry-stat aptitude-entry-attempts"><strong>${summary.hasAttempted ? fmt(summary.attemptedCount) : '待记录'}</strong><small>累计题量</small></span><a class="aptitude-entry-arrow" href="${escapeHtml(module.route)}" aria-label="查看${escapeHtml(module.area)}">↗</a>${renderAptitudeModuleLaunchButtons(module.id)}</article>`;
  }).join('');
  const onlineAttempted = onlineStats.reduce((sum, stats) => sum + stats.attemptedCount, 0);
  const onlineCorrect = onlineStats.reduce((sum, stats) => sum + stats.correctCount, 0);
  const onlineAccuracy = onlineAttempted ? onlineCorrect / onlineAttempted : null;
  const onlineAccuracyNote = onlineAttempted
    ? `七个行测模块站内共答 ${onlineAttempted} 题 · ${onlineCorrect} 题答对`
    : '七个行测模块尚无站内答题记录';
  return `<div class="page-body aptitude-page"><div class="page-heading-row"><div><div class="eyebrow muted">APTITUDE · MODULE OVERVIEW</div><h1>行测能力</h1><p>七个模块共用学习与计划架构；题库已接入的模块可开练，其他模块显示待接入状态。</p></div><a class="button button-secondary" href="#/plan">查看学习计划 →</a></div><section class="metric-grid four-metrics aptitude-overview" aria-label="行测训练总览">${metric('整体正确率', fmtPct(overall.accuracy), overall.accuracy === null ? '录入练习记录后统计' : `按 ${fmt(overall.accuracyQuestionCount)} 道有正确数依据的题量合并`, '◎', 'blue')}${metric('累计记录题量', overall.hasAttempted ? `${fmt(overall.attemptedCount)}<small> 题</small>` : '待记录', `${overall.hasManualRecordsCount} 个手动训练子项已填写`, '▤', 'mint')}${metric('站内答题正确率', fmtPct(onlineAccuracy), onlineAccuracyNote, '✓', 'amber')}${metric('已记录模块', `${modulesWithRecords}<small> / ${modules.length}</small>`, '包含手动记录和站内答题', '⌁', 'purple')}</section>${renderAptitudeOverallMockModes()}<section class="aptitude-module-section"><div class="aptitude-section-heading"><div><span class="eyebrow muted">MODULES</span><h2>行测模块</h2></div><span>${modules.length} 个入口 · 按题库状态启用练习</span></div><div class="aptitude-entry-grid">${cards}</div></section><div class="notice notice-soft"><span>ⓘ</span><p>各模块按站内作答与本模块手动记录合并正确率。手动题量请填写站外训练，避免把同一站内作答重复计入。</p></div></div>`;
}

function renderAptitudeOverallSession(session) {
  const bank = getAptitudeMockQuestionBank();
  const questionById = new Map(bank.map((question) => [question.id, question]));
  const study = storage.aptitudeOverallStudy;
  const answers = study.answers.filter((answer) => answer.sessionId === session.id);
  const count = session.questionIds.length;
  const selectedIds = new Set(Object.keys(session.draftAnswers || {}));
  const isExam = session.mode === 'exam';
  const sessionTitle = session.mockType === 'full_paper'
    ? `${session.scopeModuleId ? `${getAptitudeModuleLabel(session.scopeModuleId)}分区卷` : '行测整套卷'} · ${session.paperTitle || '来源卷'}`
    : session.scopeModuleId ? `${getAptitudeModuleLabel(session.scopeModuleId)}随机组卷` : '行测跨模块随机卷';
  const clock = isExam && session.status === 'active'
    ? `<div class="science-session-clock"><span class="eyebrow muted">剩余时间</span><strong id="aptitude-overall-exam-countdown" data-deadline="${escapeHtml(session.deadline)}">计算中</strong></div>` : '';
  if (['completed', 'timed_out'].includes(session.status)) {
    const correct = answers.filter((answer) => answer.isCorrect).length;
    const rows = session.questionIds.map((id, index) => {
      const question = questionById.get(id);
      const answer = answers.find((item) => item.questionId === id);
      if (!question) return '';
      const source = aptitudeQuestionSource(question);
      const reference = question.originalQuestionNo === null || question.originalQuestionNo === undefined
        ? '' : ` · 原卷第 ${escapeHtml(question.originalQuestionNo)} 题`;
      return `<article class="science-result-row ${!answer ? 'is-unanswered' : answer.isCorrect ? 'is-correct' : 'is-wrong'}"><div><strong>第 ${index + 1} 题 · ${escapeHtml(getAptitudeModuleLabel(question.moduleId))}${reference} · ${!answer ? '未作答' : answer.isCorrect ? '答对' : '答错'}</strong><span>${escapeHtml(question.stem)}</span></div><p>${escapeHtml(question.explanation)}</p><small>${answer ? `你的选择 ${escapeHtml(answer.selectedOptionId)}` : '未作答'} · 正确答案 ${escapeHtml(question.correctAnswer)} · ${source.url ? `<a href="${escapeHtml(safeUrl(source.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)} ↗</a>` : escapeHtml(source.title)}</small></article>`;
    }).join('');
    return `<div class="page-body aptitude-page aptitude-overall-session"><div class="page-heading-row"><div><div class="eyebrow muted">APTITUDE MOCK REVIEW</div><h1>${session.status === 'timed_out' ? '模考已到时' : '模考已交卷'}</h1><p>${escapeHtml(sessionTitle)} · ${correct}/${count} 题答对 · 得分率 ${fmtPct(count ? correct / count : null)}</p></div><a class="button button-secondary" href="#/aptitude">返回行测总览</a></div><section class="panel science-results-panel"><div class="science-result-summary"><strong>${correct}<small> / ${count}</small></strong><span>答对 / 本场总题数</span><p>逐题答案、解析和题源已保存；未答题不计为答对。</p></div><div class="science-result-list">${rows || '<div class="empty-state">题目数据暂不可用。</div>'}</div></section></div>`;
  }
  if (isExam && session.currentIndex >= count) {
    const map = session.questionIds.map((id, index) => `<button type="button" class="science-exam-number ${selectedIds.has(id) ? 'is-answered' : 'is-unanswered'}" data-action="go-to-aptitude-overall-question" data-session-id="${escapeHtml(session.id)}" data-index="${index}">${index + 1}</button>`).join('');
    const unanswered = count - selectedIds.size;
    return `<div class="page-body aptitude-page aptitude-overall-session"><div class="page-heading-row"><div><div class="eyebrow muted">APTITUDE MOCK · ANSWER SHEET</div><h1>检查答题卡</h1><p>${escapeHtml(sessionTitle)} · 已选 ${selectedIds.size} 题 · 未答 ${unanswered} 题。</p></div>${clock}<button type="button" class="button button-quiet" data-action="leave-aptitude-overall-session">暂时退出</button></div><section class="panel science-exam-sheet"><div class="science-exam-question-map">${map}</div><div class="science-question-footer"><button type="button" class="button button-primary" data-action="finish-aptitude-overall-exam" data-session-id="${escapeHtml(session.id)}">确认交卷${unanswered ? `（${unanswered} 题未答）` : ''}</button></div></section></div>`;
  }
  const questionId = session.questionIds[session.currentIndex];
  const question = questionById.get(questionId);
  if (!question) return `<div class="page-body aptitude-page"><div class="empty-state">题目数据暂不可用。请返回模考记录检查这场练习。</div><a class="button button-secondary" href="#/aptitude">返回行测总览</a></div>`;
  const source = aptitudeQuestionSource(question);
  const selected = session.draftAnswers?.[question.id]?.optionId;
  const options = question.options.map((option) => `<button type="button" class="science-answer-option ${selected === option.id ? 'is-selected' : ''}" data-action="select-aptitude-overall-answer" data-session-id="${escapeHtml(session.id)}" data-option-id="${escapeHtml(option.id)}"><span>${escapeHtml(option.id)}</span><strong>${escapeHtml(option.text)}</strong><small>${selected === option.id ? '已选' : '选择'}</small></button>`).join('');
  const sharedStimulus = question.sharedStimulus;
  const stimulusText = typeof sharedStimulus === 'string' ? sharedStimulus : sharedStimulus?.text || sharedStimulus?.caption || '';
  const stimulusImage = typeof sharedStimulus === 'object' ? safeUrl(sharedStimulus?.imageUrl || sharedStimulus?.assetUrl || '') : '#';
  const stimulusMarkup = stimulusText || stimulusImage !== '#'
    ? `<section class="aptitude-shared-stimulus">${stimulusText ? `<p>${escapeHtml(stimulusText)}</p>` : ''}${stimulusImage !== '#' ? `<img src="${escapeHtml(stimulusImage)}" alt="题组共用图表或材料"/>` : ''}</section>` : '';
  const numberLabel = question.originalQuestionNo === null || question.originalQuestionNo === undefined ? '' : ` · 原卷第 ${escapeHtml(question.originalQuestionNo)} 题`;
  return `<div class="page-body aptitude-page aptitude-overall-session"><div class="page-heading-row"><div><div class="eyebrow muted">APTITUDE · ${session.mockType === 'full_paper' ? 'SOURCE PAPER' : 'RANDOM MOCK'}</div><h1>${escapeHtml(sessionTitle)}</h1><p>第 ${session.currentIndex + 1}/${count} 题 · ${escapeHtml(getAptitudeModuleLabel(question.moduleId))}${numberLabel}</p></div>${clock}<button type="button" class="button button-quiet" data-action="leave-aptitude-overall-session">暂时退出</button></div><section class="panel science-question-panel">${stimulusMarkup}<div class="science-question-meta"><span>${escapeHtml(question.topicTitle || question.topicId || '')}</span><span>${escapeHtml(question.difficulty || '难度待补')}</span><span>${escapeHtml(source.title)}</span>${numberLabel ? `<span>${numberLabel.slice(3)}</span>` : ''}</div><h2>${escapeHtml(question.stem)}</h2><div class="science-answer-options">${options}</div><div class="science-source-attribution">题目来源：${source.url ? `<a href="${escapeHtml(safeUrl(source.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)} ↗</a>` : `<span>${escapeHtml(source.title)}</span>`}${question.answerSourceUrl ? ` · <a href="${escapeHtml(safeUrl(question.answerSourceUrl))}" target="_blank" rel="noopener noreferrer">核对答案 ↗</a>` : ''}${question.sourceNote ? `<small>${escapeHtml(question.sourceNote)}</small>` : ''}</div><div class="science-exam-controls"><button type="button" class="button button-secondary" data-action="go-to-aptitude-overall-question" data-session-id="${escapeHtml(session.id)}" data-index="${Math.max(0, session.currentIndex - 1)}" ${session.currentIndex === 0 ? 'disabled' : ''}>上一题</button><span>已选 ${selectedIds.size} 题</span><button type="button" class="button button-primary" data-action="advance-aptitude-overall-question" data-session-id="${escapeHtml(session.id)}">${session.currentIndex + 1 === count ? '检查答题卡' : '下一题'}</button></div></section>${session.questionSelectionNote ? `<p class="panel-hint">${escapeHtml(session.questionSelectionNote)}</p>` : ''}</div>`;
}

function getAptitudeModuleOnlineStats(module) {
  if (module.id === 'science') return getScienceStats(storage.scienceStudy);
  if (module.id === 'general-knowledge') return getGeneralKnowledgeStats(storage.generalKnowledgeStudy, GENERAL_KNOWLEDGE_QUESTION_BANK);
  return getAptitudeModuleStats(module.id, storage.aptitudeModuleStudies[module.id]);
}

function getAptitudeModuleSessionQuestionBank(moduleId, sessionId) {
  const session = storage.aptitudeModuleStudies[moduleId]?.sessions.find((item) => item.id === sessionId && item.moduleId === moduleId);
  return getAptitudeSessionQuestions(moduleId, session?.questionIds || []);
}

function summarizeAptitudeItems(items) {
  const attemptedItems = items.filter((item) => Number.isFinite(item.attempted));
  const accuracyItems = items.filter((item) => Number.isFinite(item.attempted) && item.attempted > 0 && Number.isFinite(item.accuracy));
  const attemptedCount = attemptedItems.reduce((sum, item) => sum + item.attempted, 0);
  const accuracyQuestionCount = accuracyItems.reduce((sum, item) => sum + item.attempted, 0);
  const correctEstimate = accuracyItems.reduce((sum, item) => sum + item.attempted * item.accuracy, 0);
  return {
    hasAttempted: attemptedItems.length > 0,
    attemptedCount,
    accuracyQuestionCount,
    correctEstimate,
    accuracy: accuracyQuestionCount ? correctEstimate / accuracyQuestionCount : null,
    hasManualRecords: items.some((item) => Number.isFinite(item.attempted) || Number.isFinite(item.accuracy)),
    hasManualRecordsCount: items.filter((item) => Number.isFinite(item.attempted) || Number.isFinite(item.accuracy)).length,
    plannedCount: items.reduce((sum, item) => sum + (Number(item.plannedQuestions) || 0), 0),
  };
}

function combineAptitudeSummary(manualSummary, ...onlineStats) {
  return combinePracticeSummary(manualSummary, ...onlineStats);
}

function aptitudeItemsForArea(area) {
  return dataset.aptitude
    .map((item, index) => ({ ...item, ...(storage.aptitudeLogs[index] || {}), index }))
    .filter((item) => item.area === area);
}

function renderAptitudeRecords(module, items) {
  const summary = summarizeAptitudeItems(items);
  const rows = items.map((item) => `<article class="aptitude-record-row"><div class="aptitude-record-copy"><strong>${escapeHtml(item.item)}</strong><small>目标 ${fmtPct(item.targetAccuracy)} · 已录 ${fmt(item.attempted)} / ${fmt(item.plannedQuestions)} 题${Number.isFinite(item.retakeAccuracy) ? ` · 二刷 ${fmtPct(item.retakeAccuracy)}` : ''}</small></div><span class="aptitude-record-accuracy">${fmtPct(item.accuracy)}</span>${button('记录', 'edit-aptitude', 'button button-quiet button-small', `data-index="${item.index}"`)}</article>`).join('');
  return `<section class="panel aptitude-record-panel"><div class="panel-heading"><div><div class="eyebrow muted">MANUAL PRACTICE LOG</div><h2>${escapeHtml(module.area)}训练记录</h2><p>手动填写累计题量和当前正确率；相同站内作答请勿重复录入。</p></div><span class="panel-hint">${summary.hasManualRecordsCount} / ${items.length} 项已录</span></div>${rows ? `<div class="aptitude-record-list">${rows}</div>` : '<div class="empty-state">暂无可记录的训练项。</div>'}</section>`;
}

function aptitudeModuleLessonIsPublished(entry) {
  return Boolean(entry?.lesson && typeof entry.lesson === 'object'
    && Object.keys(entry.lesson).length && entry.point?.contentStatus !== 'outline');
}

function aptitudeModuleKnowledgeStatus(study, pointId) {
  const status = study.knowledgeProgress[pointId]?.status;
  return status === 'completed' ? '已学完' : status === 'learning' ? '学习中' : '未开始';
}

function renderAptitudeModuleContent(module, content, questionCount, study, tasks) {
  const topics = content.directory.flatMap((subject) => (subject.topics || []).map((topic) => ({ subject, topic })));
  const lessonRows = Object.entries(content.lessons).map(([id, lesson]) => `<a class="aptitude-module-lesson" href="${escapeHtml(module.route)}?knowledge=${encodeURIComponent(id)}"><strong>${escapeHtml(lesson.title || id)}</strong><p>${escapeHtml(lesson.summary || lesson.explanation || lesson.examAngle || '打开讲解')}</p></a>`).join('');
  const topicRows = topics.map(({ subject, topic }) => {
    const pointRows = (topic.knowledgePoints || []).map((point) => {
      const entry = findAptitudeModuleKnowledgePoint(content, point.id);
      const published = aptitudeModuleLessonIsPublished(entry);
      const pointQuestionCount = getAptitudeQuestions(module.id, { knowledgePointId: point.id }).length;
      const status = aptitudeModuleKnowledgeStatus(study, point.id);
      return `<a class="science-point-link aptitude-module-point-link ${published ? 'published' : 'outline'}" href="${escapeHtml(module.route)}?knowledge=${encodeURIComponent(point.id)}"><span>${escapeHtml(point.title)}</span><small>${published ? '讲解已发布' : '讲解待接入'} · ${escapeHtml(status)} · ${pointQuestionCount} 题</small></a>`;
    }).join('');
    return `<details class="science-topic-card aptitude-module-topic"><summary><strong>${escapeHtml(subject.title)} · ${escapeHtml(topic.title)}</strong><span>${(topic.knowledgePoints || []).length} 个知识点</span></summary>${pointRows ? `<div class="science-point-links aptitude-module-point-list">${pointRows}</div>` : ''}</details>`;
  }).join('');
  const taskRows = tasks.map((task) => {
    const progress = getAptitudeModuleTaskProgress(task, study.sessions, study.answers);
    const config = task.aptitudeConfig || {};
    const activity = SCIENCE_ACTIVITY_TYPES.find(([value]) => value === config.activityType)?.[1] || '自由学习';
    const target = progress.targetCount ? ` · ${progress.displayCount}/${progress.targetCount}${progress.activityType === 'knowledge' ? ' 个知识点' : ' 题'}` : '';
    const href = `${module.route}?task=${encodeURIComponent(task.id)}`;
    return `<a class="aptitude-module-plan-row ${task.id === activeAptitudeModulePlanTaskId ? 'is-current' : ''}" href="${escapeHtml(href)}"><span><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.date)} · ${escapeHtml(planTaskStatusLabel(task.status))} · ${escapeHtml(activity)}${target}</small></span><b>查看 ↗</b></a>`;
  }).join('');
  const unavailable = questionCount === 0;
  const activeSession = study.sessions.find((session) => session.status === 'active');
  const practiceControls = unavailable
    ? '<button type="button" class="button button-secondary" disabled aria-disabled="true" title="题库待接入">开始练习</button><button type="button" class="button button-secondary" disabled aria-disabled="true" title="题库待接入">限时模拟</button><button type="button" class="button button-quiet" disabled aria-disabled="true" title="题库待接入">复习错题</button><button type="button" class="button button-quiet" disabled aria-disabled="true" title="题库待接入">复习收藏</button>'
    : `<button type="button" class="button button-secondary" data-action="open-aptitude-module-practice" data-module-id="${escapeHtml(module.id)}" data-mode="practice">开始练习</button><button type="button" class="button button-secondary" data-action="open-aptitude-module-practice" data-module-id="${escapeHtml(module.id)}" data-mode="exam">限时模拟</button><button type="button" class="button button-quiet" data-action="open-aptitude-module-practice" data-module-id="${escapeHtml(module.id)}" data-mode="mistakes">复习错题</button><button type="button" class="button button-quiet" data-action="open-aptitude-module-practice" data-module-id="${escapeHtml(module.id)}" data-mode="favorites">复习收藏</button>`;
  const resume = activeSession
    ? `<a class="button button-primary" href="${escapeHtml(module.route)}?session=${encodeURIComponent(activeSession.id)}">继续未完成训练</a>` : '';
  return `<section class="aptitude-module-learning-grid" aria-label="${escapeHtml(module.area)}学习与练习">
    <article class="panel aptitude-module-content-panel" data-section="aptitude-module-knowledge"><div class="panel-heading"><div><div class="eyebrow muted">KNOWLEDGE</div><h2>知识目录与讲解</h2><p>${content.directory.length ? `${content.directory.length} 个学科 · ${topics.length} 个专题` : '知识目录待接入；占位内容不会计为已学。'}</p></div><span class="aptitude-module-status">${content.directory.length ? '目录已接入' : '知识目录待接入'}</span></div>${topicRows ? `<div class="aptitude-module-topic-list science-topic-list">${topicRows}</div>` : '<div class="empty-state compact">当前没有可浏览的知识目录。</div>'}${lessonRows ? `<div class="aptitude-module-lesson-list">${lessonRows}</div>` : '<div class="aptitude-module-lesson-empty">讲解待接入</div>'}</article>
    <article class="panel aptitude-module-content-panel" data-section="aptitude-module-practice"><div class="panel-heading"><div><div class="eyebrow muted">PRACTICE · MOCK</div><h2>专项练习与限时模拟</h2><p>${unavailable ? '当前模块没有已发布题目，训练入口暂不可用。' : `当前有 ${questionCount} 道已发布题目。`}</p></div><span class="aptitude-module-status">${unavailable ? '题库待接入' : `${questionCount} 道题`}</span></div><div class="aptitude-module-practice-actions">${practiceControls}${resume}</div><p class="aptitude-module-unavailable-note">${unavailable ? '题库待接入；现在无法创建会话或增加站内答题记录。' : '训练交互和记录由本模块会话适配器负责。'}</p></article>
    <article class="panel aptitude-module-content-panel" data-section="aptitude-module-mistakes"><div class="panel-heading"><div><div class="eyebrow muted">REVIEW</div><h2>错题与收藏</h2><p>状态仅读取 ${escapeHtml(module.area)} 自己的学习档案。</p></div></div><div class="aptitude-module-counts"><span><strong>${Object.keys(study.mistakes).length}</strong><small>错题</small></span><span><strong>${study.favorites.length}</strong><small>收藏题</small></span><span><strong>${study.favoriteKnowledgePointIds.length}</strong><small>知识点收藏</small></span><span><strong>${study.unclearKnowledgePointIds.length}</strong><small>待复习知识点</small></span></div><div class="empty-state compact">${questionCount ? '完成站内练习后，错题和收藏会在这里显示。' : '题库待接入，暂时没有可打开的错题或收藏题。'}</div></article>
    <article class="panel aptitude-module-content-panel" data-section="aptitude-module-plan"><div class="panel-heading"><div><div class="eyebrow muted">STUDY PLAN</div><h2>学习计划</h2><p>只汇总关联到本模块的任务与站内进度。</p></div><a class="panel-link" href="#/plan">管理计划 →</a></div>${taskRows || '<div class="empty-state compact">还没有本模块计划任务。</div>'}</article>
  </section>`;
}

function renderAptitudeModuleLesson(module, content, pointId, study, task = null) {
  const entry = findAptitudeModuleKnowledgePoint(content, pointId);
  if (!entry) return `<div class="page-body aptitude-module-page"><div class="empty-state">没有找到这个行测知识点。</div><a class="button button-secondary" href="${escapeHtml(module.route)}">返回${escapeHtml(module.area)}</a></div>`;
  const { subject, topic, point } = entry;
  const lesson = aptitudeModuleLessonIsPublished(entry) ? entry.lesson : null;
  const progress = study.knowledgeProgress[point.id];
  const completed = progress?.status === 'completed';
  const isFavorite = study.favoriteKnowledgePointIds.includes(point.id);
  const isUnclear = study.unclearKnowledgePointIds.includes(point.id);
  const pointQuestionCount = getAptitudeQuestions(module.id, { knowledgePointId: point.id }).length;
  const taskPointIds = task?.aptitudeConfig?.activityType === 'knowledge'
    ? task.aptitudeConfig.knowledgePointIds : [];
  const nextTaskPointId = taskPointIds.find((id) => id !== point.id
    && findAptitudeModuleKnowledgePoint(content, id)
    && study.knowledgeProgress[id]?.status !== 'completed');
  const paragraphs = [
    ['核心讲解', lesson?.explanation || lesson?.summary],
    ['一句话记忆', lesson?.principle],
    ['题目怎么考', lesson?.examAngle],
    ['生活示例', lesson?.everydayExample],
    ['解题方法', lesson?.quickMethod],
  ].filter(([, value]) => typeof value === 'string' && value.trim());
  const memory = Array.isArray(lesson?.memory) && lesson.memory.length
    ? `<section><span class="science-section-kicker">记忆要点</span><ul>${lesson.memory.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>` : '';
  const mistakes = Array.isArray(lesson?.commonMistakes) && lesson.commonMistakes.length
    ? `<section class="science-mistakes-note"><span class="science-section-kicker">常见混淆</span><ul>${lesson.commonMistakes.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>` : '';
  const lessonBody = lesson
    ? `${paragraphs.map(([title, value]) => `<section><span class="science-section-kicker">${title}</span><p>${escapeHtml(value)}</p></section>`).join('')}${memory}${mistakes}`
    : '<section class="science-outline-panel"><span class="science-content-status">目录提纲</span><h2>讲解待接入</h2><p>已预留讲解 provider。讲解发布前不会记录为正在学习或已学完。</p></section>';
  const status = completed ? '已学完' : progress?.status === 'learning' ? '学习中' : '未开始';
  const taskLabel = task ? `<span>计划任务：${escapeHtml(task.title)}</span>` : '';
  const nextTask = nextTaskPointId
    ? `<button type="button" class="button button-quiet" data-action="next-aptitude-module-task-point" data-task-id="${escapeHtml(task.id)}" data-point-id="${escapeHtml(nextTaskPointId)}">下一个计划知识点 →</button>` : '';
  return `<div class="page-body aptitude-module-page science-page"><div class="page-heading-row"><div><div class="eyebrow muted">${escapeHtml(subject.title)} · ${escapeHtml(topic.title)} · KNOWLEDGE</div><h1>${escapeHtml(point.title)}</h1><p>${lesson ? '知识点讲解与本模块学习状态。' : '本知识点已进入目录，讲解尚未发布。'}</p></div><div class="heading-actions"><a class="button button-secondary" href="${escapeHtml(module.route)}">返回${escapeHtml(module.area)}</a><span class="aptitude-module-status">${escapeHtml(status)}</span></div></div><div class="science-lesson-layout"><article class="panel science-lesson-main">${lessonBody}<section class="science-lesson-footer"><button type="button" class="button button-secondary" data-action="start-aptitude-module-knowledge" data-module-id="${escapeHtml(module.id)}" data-point-id="${escapeHtml(point.id)}" ${!lesson || progress?.status === 'learning' || completed ? 'disabled' : ''}>${progress?.status === 'learning' ? '正在学习' : completed ? '已学完' : '标记正在学习'}</button><button type="button" class="button button-primary" data-action="complete-aptitude-module-knowledge" data-module-id="${escapeHtml(module.id)}" data-point-id="${escapeHtml(point.id)}" ${!lesson || completed ? 'disabled' : ''}>${completed ? '已完成知识点学习' : '完成知识点学习'}</button><button type="button" class="button button-quiet" data-action="toggle-aptitude-module-point-favorite" data-module-id="${escapeHtml(module.id)}" data-point-id="${escapeHtml(point.id)}">${isFavorite ? '★ 已收藏知识点' : '☆ 收藏知识点'}</button><button type="button" class="button button-quiet" data-action="toggle-aptitude-module-point-unclear" data-module-id="${escapeHtml(module.id)}" data-point-id="${escapeHtml(point.id)}">${isUnclear ? '已标记不理解 · 取消' : '标记不理解'}</button><button type="button" class="button button-secondary" data-action="open-aptitude-module-practice" data-module-id="${escapeHtml(module.id)}" data-mode="practice" data-point-id="${escapeHtml(point.id)}" ${pointQuestionCount ? '' : 'disabled aria-disabled="true" title="本知识点题库待接入"'}>练习此知识点</button>${taskLabel}${nextTask}</section></article><aside class="science-lesson-aside"><section class="panel"><span class="eyebrow muted">关联题目</span><strong class="science-aside-number">${pointQuestionCount}</strong><p>道已发布练习</p></section><section class="panel"><span class="eyebrow muted">学习状态</span><strong>${escapeHtml(status)}</strong><p>${progress?.lastViewedAt ? `最近学习 ${escapeHtml(fmtDate(progress.lastViewedAt.slice(0, 10)))}` : '开始与完成状态由你记录。'}</p></section></aside></div></div>`;
}

function renderAptitudeModuleSession(module, session, study) {
  const bank = getAptitudeSessionQuestions(module.id, session.questionIds);
  const questionById = new Map(bank.map((question) => [question.id, question]));
  const questions = session.questionIds.map((id) => questionById.get(id)).filter(Boolean);
  const answers = study.answers.filter((answer) => answer.moduleId === module.id && answer.sessionId === session.id);
  const isExam = session.mode === 'exam';
  const count = session.questionIds.length;
  const selectedIds = new Set(Object.keys(session.draftAnswers || {}));
  const clock = isExam ? `<div class="science-session-clock"><span class="eyebrow muted">剩余时间</span><strong id="aptitude-module-exam-countdown" data-deadline="${escapeHtml(session.deadline)}">计算中</strong></div>` : '';
  if (['completed', 'timed_out'].includes(session.status)) {
    const correct = answers.filter((answer) => answer.isCorrect).length;
    const rows = session.questionIds.map((id, index) => {
      const question = questionById.get(id);
      const answer = answers.find((item) => item.questionId === id);
      if (!question) return '';
      return `<article class="science-result-row ${!answer ? 'is-unanswered' : answer.isCorrect ? 'is-correct' : 'is-wrong'}"><div><strong>第 ${index + 1} 题 · ${!answer ? '未作答' : answer.isCorrect ? '答对' : '答错'}</strong><span>${escapeHtml(question.stem)}</span></div><p>${escapeHtml(question.explanation || '解析待补。')}</p><small>${answer ? `你的选择 ${escapeHtml(answer.selectedOptionId)}` : '未作答'} · 正确答案 ${escapeHtml(question.correctAnswer)}</small></article>`;
    }).join('');
    return `<div class="page-body aptitude-module-page science-page"><div class="page-heading-row"><div><div class="eyebrow muted">${isExam ? 'TIMED MOCK REVIEW' : 'PRACTICE REVIEW'}</div><h1>${session.status === 'timed_out' ? '模拟已到时' : isExam ? '模拟已交卷' : '训练完成'}</h1><p>${correct}/${count} 题答对 · ${count ? Math.round(correct / count * 100) : 0}% 正确</p></div><a class="button button-secondary" href="${escapeHtml(module.route)}">返回${escapeHtml(module.area)}</a></div><section class="panel science-results-panel"><div class="science-result-list">${rows || '<div class="empty-state">题目数据暂不可用。</div>'}</div></section></div>`;
  }
  if (isExam && session.currentIndex >= count) {
    const map = session.questionIds.map((id, index) => `<button type="button" class="science-exam-number ${selectedIds.has(id) ? 'is-answered' : 'is-unanswered'}" data-action="go-to-aptitude-module-question" data-module-id="${escapeHtml(module.id)}" data-session-id="${escapeHtml(session.id)}" data-index="${index}">${index + 1}</button>`).join('');
    const unanswered = count - selectedIds.size;
    return `<div class="page-body aptitude-module-page science-page"><div class="page-heading-row"><div><div class="eyebrow muted">TIMED MOCK · ANSWER SHEET</div><h1>检查答题卡</h1><p>已选 ${selectedIds.size} 题 · 未答 ${unanswered} 题。</p></div>${clock}<button type="button" class="button button-quiet" data-action="leave-aptitude-module-session" data-module-id="${escapeHtml(module.id)}">暂时退出</button></div><section class="panel science-exam-sheet"><div class="science-exam-question-map">${map}</div><div class="science-question-footer"><button type="button" class="button button-primary" data-action="finish-aptitude-module-exam" data-module-id="${escapeHtml(module.id)}" data-session-id="${escapeHtml(session.id)}">确认交卷${unanswered ? `（${unanswered} 题未答）` : ''}</button></div></section></div>`;
  }
  const questionId = session.questionIds[session.currentIndex];
  const question = questionById.get(questionId);
  if (!question) return `<div class="page-body aptitude-module-page"><div class="empty-state">题目数据暂不可用。</div></div>`;
  const answer = session.reviewingAnswerId ? answers.find((item) => item.id === session.reviewingAnswerId) : null;
  const selected = session.draftAnswers?.[question.id]?.optionId;
  const options = (question.options || []).map((option) => {
    if (isExam) return `<button type="button" class="science-answer-option ${selected === option.id ? 'is-selected' : ''}" data-action="select-aptitude-module-answer" data-module-id="${escapeHtml(module.id)}" data-session-id="${escapeHtml(session.id)}" data-option-id="${escapeHtml(option.id)}"><span>${escapeHtml(option.id)}</span><strong>${escapeHtml(option.text)}</strong><small>${selected === option.id ? '已选' : '选择'}</small></button>`;
    if (answer) {
      const correct = option.id === question.correctAnswer;
      const wrong = option.id === answer.selectedOptionId && !answer.isCorrect;
      return `<div class="science-answer-option ${correct ? 'is-correct' : wrong ? 'is-wrong' : ''}"><span>${escapeHtml(option.id)}</span><strong>${escapeHtml(option.text)}</strong><small>${correct ? '正确答案' : wrong ? '你的答案' : ''}</small></div>`;
    }
    return `<button type="button" class="science-answer-option" data-action="answer-aptitude-module-question" data-module-id="${escapeHtml(module.id)}" data-session-id="${escapeHtml(session.id)}" data-option-id="${escapeHtml(option.id)}"><span>${escapeHtml(option.id)}</span><strong>${escapeHtml(option.text)}</strong><small>选择</small></button>`;
  }).join('');
  const review = isExam ? selected ? '<div class="notice notice-soft"><span>✓</span><p>答案已保存，交卷前可修改；模拟结束前不会显示正确答案。</p></div>' : ''
    : answer ? `<div class="science-answer-explanation ${answer.isCorrect ? 'is-correct' : 'is-wrong'}"><strong>${answer.isCorrect ? '回答正确' : `回答不正确 · 正确答案 ${escapeHtml(question.correctAnswer)}`}</strong><p>${escapeHtml(question.explanation || '解析待补。')}</p></div>` : '';
  const actions = isExam
    ? `<div class="science-exam-controls"><button type="button" class="button button-secondary" data-action="go-to-aptitude-module-question" data-module-id="${escapeHtml(module.id)}" data-session-id="${escapeHtml(session.id)}" data-index="${Math.max(0, session.currentIndex - 1)}" ${session.currentIndex === 0 ? 'disabled' : ''}>上一题</button><span>第 ${session.currentIndex + 1}/${count} 题 · 已答 ${selectedIds.size} 题</span><button type="button" class="button button-primary" data-action="advance-aptitude-module-question" data-module-id="${escapeHtml(module.id)}" data-session-id="${escapeHtml(session.id)}">${session.currentIndex + 1 === count ? '检查答题卡' : '下一题'}</button><button type="button" class="button button-quiet" data-action="finish-aptitude-module-exam" data-module-id="${escapeHtml(module.id)}" data-session-id="${escapeHtml(session.id)}">交卷</button></div>`
    : answer ? `<button type="button" class="button button-primary" data-action="continue-aptitude-module-session" data-module-id="${escapeHtml(module.id)}" data-session-id="${escapeHtml(session.id)}">${session.currentIndex + 1 >= count ? '完成练习' : '下一题'}</button>`
      : `<div class="science-question-actions"><button type="button" class="button button-quiet" data-action="toggle-aptitude-module-favorite" data-module-id="${escapeHtml(module.id)}" data-question-id="${escapeHtml(question.id)}">${study.favorites.includes(question.id) ? '★ 已收藏' : '☆ 收藏题目'}</button><span>答题后保存结果和解析。</span></div>`;
  const source = GENERAL_KNOWLEDGE_SOURCES.find((item) => item.id === question.sourceId);
  const sourceTitle = question.sourceTitle || source?.title || question.sourceType || '来源待补';
  const sourceLink = source?.url ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(sourceTitle)} ↗</a>` : `<span>${escapeHtml(sourceTitle)}</span>`;
  const answerSourceUrl = question.answerSourceUrl || source?.answerUrl;
  const answerLink = answerSourceUrl ? ` · <a href="${escapeHtml(answerSourceUrl)}" target="_blank" rel="noopener noreferrer">核对答案 ↗</a>` : '';
  const originalQuestionReference = renderOriginalQuestionReference(question);
  return `<div class="page-body aptitude-module-page science-page"><div class="page-heading-row"><div><div class="eyebrow muted">${isExam ? 'TIMED MOCK' : 'PRACTICE'} · ${escapeHtml(module.area)}</div><h1>${isExam ? '限时模拟' : '专项练习'}</h1><p>第 ${session.currentIndex + 1}/${count} 题${isExam ? ` · 已答 ${selectedIds.size} 题` : ''}</p></div>${clock}<button type="button" class="button button-quiet" data-action="leave-aptitude-module-session" data-module-id="${escapeHtml(module.id)}">暂时退出</button></div><section class="panel science-question-panel"><div class="science-question-meta"><span>${escapeHtml(question.topicTitle || question.topicId || '')}</span><span>${escapeHtml(question.difficulty || '难度待补')}</span><span>${escapeHtml(question.sourceTitle || question.sourceType || '来源待补')}</span>${originalQuestionReference}</div><h2>${escapeHtml(question.stem)}</h2><div class="science-answer-options">${options}</div><div class="science-source-attribution">题目来源：${sourceLink}${answerLink}${question.sourceNote ? `<small>${escapeHtml(question.sourceNote)}</small>` : ''}</div>${review}<div class="science-question-footer">${actions}</div></section></div>`;
}

function renderAptitudeModule(moduleId) {
  const module = APTITUDE_MODULES.find((item) => item.id === moduleId && item.studyStore === 'aptitudeModuleStudies');
  if (!module) {
    return `<div class="page-body"><div class="empty-state">没有找到这个行测模块。</div><a class="button button-secondary" href="#/aptitude">返回行测能力</a></div>`;
  }
  const items = aptitudeItemsForArea(module.area);
  const manualSummary = summarizeAptitudeItems(items);
  const study = storage.aptitudeModuleStudies[module.id];
  const onlineStats = getAptitudeModuleStats(module.id, study);
  const summary = combineAptitudeSummary(manualSummary, onlineStats);
  const content = getAptitudeModuleContent(module.id);
  const questionCount = getAptitudeQuestions(module.id).length;
  const tasks = storage.studyPlanTasks.filter((task) => !task.archivedAt && task.aptitudeConfig?.moduleId === module.id)
    .slice().sort((left, right) => left.date.localeCompare(right.date));
  const planTask = activeAptitudeModulePlanTaskId
    ? tasks.find((task) => task.id === activeAptitudeModulePlanTaskId) : null;
  const session = activeAptitudeModuleSessionId
    ? study.sessions.find((item) => item.id === activeAptitudeModuleSessionId && item.moduleId === module.id)
    : planTask ? study.sessions.find((item) => item.planTaskId === planTask.id && item.status === 'active')
      : study.sessions.find((item) => item.status === 'active' && item.moduleId === module.id);
  if (session) return renderAptitudeModuleSession(module, session, study);
  const taskProgress = planTask ? getAptitudeModuleTaskProgress(planTask, study.sessions, study.answers) : null;
  const taskActivity = planTask?.aptitudeConfig?.activityType || 'free';
  const taskModeLabel = taskActivity === 'exam' ? '限时模拟' : taskActivity === 'mistakes' ? '错题复习' : taskActivity === 'practice' ? '专项练习' : taskActivity === 'knowledge' ? '知识点学习' : '自由学习';
  if (selectedAptitudeModuleKnowledgePointId) {
    return renderAptitudeModuleLesson(module, content, selectedAptitudeModuleKnowledgePointId, study, planTask);
  }
  const knowledgeTaskPoints = taskActivity === 'knowledge'
    ? (planTask.aptitudeConfig.knowledgePointIds || []).filter((id) => findAptitudeModuleKnowledgePoint(content, id)) : [];
  const taskUnavailable = taskActivity === 'knowledge' ? knowledgeTaskPoints.length === 0 : questionCount === 0;
  const taskStartPanel = planTask && taskActivity !== 'free'
    ? `<section class="panel science-task-start"><span class="eyebrow muted">PLAN TASK · ${escapeHtml(planTask.date)}</span><h2>${escapeHtml(planTask.title)}</h2><p>${taskModeLabel} · ${taskActivity === 'knowledge' ? `目标 ${taskProgress?.targetCount || 0} 个知识点 · 已完成 ${taskProgress?.progressCount || 0}/${taskProgress?.targetCount || 0}` : `目标 ${planTask.aptitudeConfig.targetQuestionCount || 0} 题 · 已完成 ${taskProgress?.progressCount || 0}/${taskProgress?.targetCount || 0}`}</p><button type="button" class="button button-primary" data-action="start-aptitude-module-session" data-mode="${taskActivity === 'knowledge' ? 'knowledge' : taskActivity === 'exam' ? 'exam' : 'practice'}" data-task-id="${escapeHtml(planTask.id)}" ${taskUnavailable ? 'disabled aria-disabled="true"' : ''}>${taskUnavailable ? taskActivity === 'knowledge' ? '知识目录待接入' : '题库待接入' : `开始${taskModeLabel}`}</button></section>`
    : '';
  const accuracyProgress = summary.plannedCount && summary.hasAttempted
    ? Math.min(summary.attemptedCount / summary.plannedCount, 1)
    : null;
  const progressNote = summary.hasAttempted
    ? `${fmt(summary.attemptedCount)} / ${fmt(summary.plannedCount)} 题`
    : `尚未记录 · 计划 ${fmt(summary.plannedCount)} 题`;
  return `<div class="page-body aptitude-module-page"><div class="page-heading-row"><div><div class="eyebrow muted">APTITUDE MODULE</div><h1>${escapeHtml(module.area)}</h1><p>${escapeHtml(module.hint)}。当前模块汇总站内作答与手动记录，内容入口按本模块 provider 显示。</p></div><div class="heading-actions"><a class="button button-primary" href="#/plan">安排学习任务</a><a class="button button-secondary" href="#/aptitude">返回行测总览 →</a></div></div>${taskStartPanel}<div class="metric-grid four-metrics aptitude-module-overview">${metric('合并正确率', fmtPct(summary.accuracy), summary.accuracy === null ? '完成站内答题或录入站外训练后统计' : `依据 ${fmt(summary.accuracyQuestionCount)} 道有效题量`, '◎', 'blue')}${metric('合并题量', summary.hasAttempted ? `${fmt(summary.attemptedCount)}<small> 题</small>` : '待记录', `${fmt(onlineStats.attemptedCount)} 道站内 · ${fmt(manualSummary.attemptedCount)} 道手动`, '▤', 'mint')}${metric('站内训练', `${fmt(onlineStats.completedSessionCount)}<small> 次完成</small>`, `${fmt(onlineStats.attemptedCount)} 道作答`, '✓', 'amber')}${metric('计划题量进度', accuracyProgress === null ? '待记录' : fmtPct(accuracyProgress), progressNote, '↗', 'purple')}</div>${renderAptitudeModuleMockModes(module.id)}<section class="panel aptitude-module-stats" data-section="aptitude-module-statistics"><div class="panel-heading"><div><div class="eyebrow muted">MODULE STATISTICS</div><h2>学习统计</h2><p>站内数据按 moduleId 隔离；手动数据来自当前板块的训练子项。</p></div></div><div class="aptitude-module-counts"><span><strong>${fmt(onlineStats.practice.attemptedCount)}</strong><small>练习作答</small></span><span><strong>${fmt(onlineStats.practice.correctCount)}</strong><small>练习答对</small></span><span><strong>${fmt(onlineStats.exam.sessionCount)}</strong><small>已交模拟</small></span><span><strong>${fmt(onlineStats.mistakeCount)} / ${fmt(onlineStats.favoriteCount)}</strong><small>错题 / 收藏</small></span></div></section>${renderAptitudeModuleContent(module, content, questionCount, study, tasks)}${renderAptitudeRecords(module, items)}</div>`;
}

function renderGeneralKnowledgeLesson(point, task = null) {
  if (!point) return `<div class="page-body"><div class="empty-state">没有找到这个常识知识点。</div><a class="button button-secondary" href="#/aptitude/general-knowledge">返回常识判断</a></div>`;
  const content = GENERAL_KNOWLEDGE_LESSONS[point.id];
  const study = storage.generalKnowledgeStudy;
  const progress = study.knowledgeProgress[point.id];
  const pointQuestions = GENERAL_KNOWLEDGE_QUESTION_BANK.filter((question) => question.knowledgePointIds?.includes(point.id) && question.publishStatus === 'published');
  const sourceLinks = (content?.sourceIds || []).map((id) => GENERAL_KNOWLEDGE_SOURCES.find((source) => source.id === id)).filter(Boolean)
    .map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)} ↗</a>`).join(' · ');
  if (!content) return `<div class="page-body science-page general-knowledge-page"><div class="page-heading-row"><div><div class="eyebrow muted">${escapeHtml(point.subjectTitle)} · ${escapeHtml(point.topicTitle)}</div><h1>${escapeHtml(point.title)}</h1><p>已收录在知识目录中，完整讲解正在编校；提纲状态不会计入已学完。</p></div><a class="button button-secondary" href="#/aptitude/general-knowledge">返回知识目录</a></div><section class="panel science-outline-panel"><span class="science-content-status">目录提纲</span><h2>关联练习</h2><p>${pointQuestions.length} 道已发布题目。每道题均显示题源、核验状态和适用年份。</p><button type="button" class="button button-primary" data-action="open-general-knowledge-practice" data-point-id="${escapeHtml(point.id)}">按此知识点练习</button></section></div>`;
  const status = progress?.status === 'completed' ? '已学完' : progress?.status === 'learning' ? '学习中' : '未开始';
  const nextTaskPointId = task?.generalKnowledgeConfig?.activityType === 'knowledge'
    ? task.generalKnowledgeConfig.knowledgePointIds.find((id) => id !== point.id && study.knowledgeProgress[id]?.status !== 'completed') : null;
  const memory = content.memory?.length ? `<section><span class="science-section-kicker">记忆要点</span><ul>${content.memory.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>` : '';
  const mistakes = content.commonMistakes?.length ? `<section class="science-mistakes-note"><span class="science-section-kicker">常见混淆</span><ul>${content.commonMistakes.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>` : '';
  const statusToneName = status === '已学完' ? 'green' : status === '学习中' ? 'blue' : 'neutral';
  return `<div class="page-body science-page general-knowledge-page"><div class="page-heading-row"><div><div class="eyebrow muted">${escapeHtml(point.subjectTitle)} · ${escapeHtml(point.topicTitle)} · KNOWLEDGE</div><h1>${escapeHtml(point.title)}</h1><p>${escapeHtml(content.examAngle)}</p></div><div class="heading-actions"><a class="button button-secondary" href="#/aptitude/general-knowledge">知识目录</a>${chip(status, statusToneName)}</div></div>
    <div class="science-lesson-layout"><article class="panel science-lesson-main"><section><span class="science-section-kicker">核心讲解</span><p>${escapeHtml(content.explanation)}</p></section><section class="science-principle"><span class="science-section-kicker">一句话记忆</span><p>${escapeHtml(content.principle)}</p></section>${memory}${mistakes}<section><span class="science-section-kicker">题目怎么考</span><p>${escapeHtml(content.examAngle)}</p></section><section class="science-lesson-footer"><button type="button" class="button button-secondary" data-action="start-general-knowledge-knowledge" data-point-id="${escapeHtml(point.id)}" ${progress?.status === 'learning' || progress?.status === 'completed' ? 'disabled' : ''}>${progress?.status === 'learning' ? '正在学习' : '标记正在学习'}</button><button type="button" class="button button-primary" data-action="complete-general-knowledge-knowledge" data-point-id="${escapeHtml(point.id)}" ${progress?.status === 'completed' ? 'disabled' : ''}>${progress?.status === 'completed' ? '已完成学习' : '完成知识点学习'}</button><button type="button" class="button button-quiet" data-action="toggle-general-knowledge-point-favorite" data-point-id="${escapeHtml(point.id)}">${study.favoriteKnowledgePointIds.includes(point.id) ? '★ 已收藏' : '☆ 收藏知识点'}</button><button type="button" class="button button-quiet" data-action="toggle-general-knowledge-point-unclear" data-point-id="${escapeHtml(point.id)}">${study.unclearKnowledgePointIds.includes(point.id) ? '已标记不理解 · 取消' : '标记不理解'}</button><button type="button" class="button button-secondary" data-action="open-general-knowledge-practice" data-point-id="${escapeHtml(point.id)}">练习此知识点</button>${task ? `<span>计划任务：${escapeHtml(task.title)}</span>` : ''}${nextTaskPointId ? `<button type="button" class="button button-quiet" data-action="next-general-knowledge-task-point" data-task-id="${escapeHtml(task.id)}" data-point-id="${escapeHtml(nextTaskPointId)}">下一个计划知识点 →</button>` : ''}</section><div class="science-source-attribution">讲解来源：${sourceLinks || '稳定基础概念归纳'}<small>内容核对日期：${escapeHtml(content.contentAsOf || '待补')}；法律和政策状态以来源原文当前版本为准。</small></div></article><aside class="science-lesson-aside"><section class="panel"><span class="eyebrow muted">关联题目</span><strong class="science-aside-number">${pointQuestions.length}</strong><p>道已发布练习</p><small>来源不完整或展示权待确认的题目只列入来源索引。</small></section><section class="panel"><span class="eyebrow muted">学习状态</span><strong>${status}</strong><p>${progress?.lastViewedAt ? `最近学习 ${escapeHtml(fmtDate(progress.lastViewedAt.slice(0, 10)))}` : '开始与完成状态由你记录。'}</p></section></aside></div></div>`;
}

function renderGeneralKnowledgeSession(session) {
  const study = storage.generalKnowledgeStudy;
  const answers = study.answers.filter((answer) => answer.sessionId === session.id);
  const isExam = session.mode === 'exam';
  const questionCount = session.questionIds.length;
  const answeredIds = new Set(Object.keys(session.draftAnswers || {}));
  if (['completed', 'timed_out'].includes(session.status)) {
    const correct = answers.filter((answer) => answer.isCorrect).length;
    const rows = session.questionIds.map((id, index) => {
      const question = GENERAL_KNOWLEDGE_QUESTION_BANK.find((item) => item.id === id);
      const answer = answers.find((item) => item.questionId === id);
      if (!question) return '';
      return `<article class="science-result-row ${!answer ? 'is-unanswered' : answer.isCorrect ? 'is-correct' : 'is-wrong'}"><div><strong>第 ${index + 1} 题 · ${!answer ? '未作答' : answer.isCorrect ? '答对' : '答错'} · ${escapeHtml(question.subjectTitle || question.subjectId)}</strong><span>${escapeHtml(question.stem)}</span></div><p>${escapeHtml(question.explanation)}</p><small>${answer ? `你的选择 ${escapeHtml(answer.selectedOptionId)}` : '未提交答案'} · 正确答案 ${escapeHtml(question.correctAnswer)}</small></article>`;
    }).join('');
    const resultHref = session.planTaskId ? '#/plan' : '#/aptitude/general-knowledge';
    return `<div class="page-body science-page general-knowledge-page"><div class="page-heading-row"><div><div class="eyebrow muted">${isExam ? 'TIMED MOCK REVIEW' : 'PRACTICE REVIEW'}</div><h1>${session.status === 'timed_out' ? '模拟已到时' : isExam ? '模拟已交卷' : '训练完成'}</h1><p>${isExam ? `${correct}/${questionCount} 题 · 得分率 ${Math.round((session.scoreRate || 0) * 100)}% · 已答准确率 ${session.answeredAccuracy === null ? '—' : `${Math.round(session.answeredAccuracy * 100)}%`}` : `${correct}/${answers.length} 题答对 · ${answers.length ? Math.round(correct / answers.length * 100) : 0}% 正确`}</p></div><a class="button button-secondary" href="${resultHref}">${session.planTaskId ? '返回学习计划' : '返回常识判断'}</a></div><section class="panel science-results-panel"><div class="science-result-summary"><strong>${correct}<small> / ${questionCount}</small></strong><span>${isExam ? '答对 / 本场总题数' : '正确题数'}</span><p>逐题解析已保存；错题自动进入常识判断错题本。</p></div><div class="science-result-list">${rows || '<div class="empty-state">本次没有可复盘题目。</div>'}</div><button type="button" class="button button-primary" data-action="open-general-knowledge-practice">再练一组</button></section></div>`;
  }
  if (isExam && session.currentIndex >= questionCount) {
    const map = session.questionIds.map((id, index) => `<button type="button" class="science-exam-number ${answeredIds.has(id) ? 'is-answered' : 'is-unanswered'}" data-action="go-to-general-knowledge-question" data-session-id="${escapeHtml(session.id)}" data-index="${index}">${index + 1}</button>`).join('');
    const unanswered = questionCount - answeredIds.size;
    return `<div class="page-body science-page general-knowledge-page"><div class="page-heading-row"><div><div class="eyebrow muted">TIMED MOCK · ANSWER SHEET</div><h1>检查答题卡</h1><p>已选 ${answeredIds.size} 题 · 未答 ${unanswered} 题。</p></div><div class="science-session-clock"><span class="eyebrow muted">剩余时间</span><strong id="general-knowledge-exam-countdown" data-deadline="${escapeHtml(session.deadline)}">计算中</strong><button type="button" class="button button-quiet" data-action="leave-general-knowledge-session">暂时退出</button></div></div><section class="panel science-exam-sheet"><div class="science-exam-question-map">${map}</div><div class="science-question-footer"><button type="button" class="button button-secondary" data-action="go-to-general-knowledge-question" data-session-id="${escapeHtml(session.id)}" data-index="0">返回第一题</button><button type="button" class="button button-primary" data-action="finish-general-knowledge-exam" data-session-id="${escapeHtml(session.id)}">${unanswered ? `确认交卷（${unanswered} 题未答）` : '确认交卷'}</button></div></section></div>`;
  }
  const question = GENERAL_KNOWLEDGE_QUESTION_BANK.find((item) => item.id === session.questionIds[session.currentIndex]);
  if (!question) return `<div class="page-body science-page"><div class="empty-state">题目数据缺失。</div></div>`;
  const answer = session.reviewingAnswerId ? answers.find((item) => item.id === session.reviewingAnswerId) : null;
  const selected = session.draftAnswers?.[question.id]?.optionId;
  const options = question.options.map((option) => {
    if (isExam) return `<button type="button" class="science-answer-option ${selected === option.id ? 'is-selected' : ''}" data-action="select-general-knowledge-answer" data-session-id="${escapeHtml(session.id)}" data-option-id="${escapeHtml(option.id)}"><span>${escapeHtml(option.id)}</span><strong>${escapeHtml(option.text)}</strong><small>${selected === option.id ? '已选' : '选择'}</small></button>`;
    if (answer) {
      const correct = option.id === question.correctAnswer;
      const wrong = option.id === answer.selectedOptionId && !answer.isCorrect;
      return `<div class="science-answer-option ${correct ? 'is-correct' : wrong ? 'is-wrong' : ''}"><span>${escapeHtml(option.id)}</span><strong>${escapeHtml(option.text)}</strong><small>${correct ? '正确答案' : wrong ? '你的答案' : ''}</small></div>`;
    }
    return `<button type="button" class="science-answer-option" data-action="answer-general-knowledge-question" data-session-id="${escapeHtml(session.id)}" data-option-id="${escapeHtml(option.id)}"><span>${escapeHtml(option.id)}</span><strong>${escapeHtml(option.text)}</strong><small>选择</small></button>`;
  }).join('');
  const source = GENERAL_KNOWLEDGE_SOURCES.find((item) => item.id === question.sourceId);
  const sourceTitle = question.sourceTitle || source?.title || '题源信息待补';
  const answerSourceUrl = question.answerSourceUrl || source?.answerUrl;
  const answerLink = answerSourceUrl ? ` · <a href="${escapeHtml(answerSourceUrl)}" target="_blank" rel="noopener noreferrer">核对答案 ↗</a>` : '';
  const originalQuestionReference = renderOriginalQuestionReference(question);
  const sourceLabel = ({ official_outline_example: '官方大纲例题', verified_exam: '核验真题', recalled: '考生回忆版', third_party_mock: '机构模拟题', original: '本站原创' })[question.sourceType] || '来源待核';
  const review = isExam
    ? selected ? '<div class="notice notice-soft"><span>✓</span><p>答案已保存，交卷前可修改；模拟结束前不会显示正确答案。</p></div>' : ''
    : answer ? `<div class="science-answer-explanation ${answer.isCorrect ? 'is-correct' : 'is-wrong'}"><strong>${answer.isCorrect ? '回答正确' : `回答不正确 · 正确答案 ${escapeHtml(question.correctAnswer)}`}</strong><p>${escapeHtml(question.explanation)}</p></div>` : '';
  const actions = isExam
    ? `<div class="science-exam-controls"><button type="button" class="button button-secondary" data-action="go-to-general-knowledge-question" data-session-id="${escapeHtml(session.id)}" data-index="${Math.max(0, session.currentIndex - 1)}" ${session.currentIndex === 0 ? 'disabled' : ''}>上一题</button><span>第 ${session.currentIndex + 1}/${questionCount} 题 · 已答 ${answeredIds.size} 题</span><button type="button" class="button button-primary" data-action="advance-general-knowledge-question" data-session-id="${escapeHtml(session.id)}">${session.currentIndex + 1 === questionCount ? '检查答题卡' : '下一题'}</button><button type="button" class="button button-quiet" data-action="finish-general-knowledge-exam" data-session-id="${escapeHtml(session.id)}">交卷</button></div>`
    : answer ? `<button type="button" class="button button-primary" data-action="continue-general-knowledge-session" data-session-id="${escapeHtml(session.id)}">${session.currentIndex + 1 >= questionCount ? '完成练习' : '下一题'}</button>`
      : `<div class="science-question-actions"><button type="button" class="button button-quiet" data-action="toggle-general-knowledge-favorite" data-question-id="${escapeHtml(question.id)}">${storage.generalKnowledgeStudy.favorites.includes(question.id) ? '★ 已收藏' : '☆ 收藏题目'}</button><span>答题后自动保存解析和来源信息。</span></div>`;
  return `<div class="page-body science-page general-knowledge-page"><div class="page-heading-row"><div><div class="eyebrow muted">${isExam ? 'TIMED MOCK' : 'PRACTICE'} · ${escapeHtml(question.subjectTitle || question.subjectId)}</div><h1>${isExam ? '常识判断限时模拟' : '常识判断练习'}</h1><p>第 ${session.currentIndex + 1}/${questionCount} 题${isExam ? ` · 已答 ${answeredIds.size} 题` : ''}</p></div><div class="science-session-clock">${isExam ? `<span class="eyebrow muted">剩余时间</span><strong id="general-knowledge-exam-countdown" data-deadline="${escapeHtml(session.deadline)}">计算中</strong>` : ''}<button type="button" class="button button-quiet" data-action="leave-general-knowledge-session">暂时退出</button></div></div><section class="panel science-question-panel"><div class="science-question-meta"><span>${escapeHtml(question.topicTitle || question.topicId)}</span><span>${escapeHtml(question.difficulty === 'easy' ? '基础' : question.difficulty === 'hard' ? '进阶' : '中等')}</span><span>${sourceLabel}${question.presentationMode === 'adapted' ? ' · 题意重述' : ''}</span>${originalQuestionReference}</div><h2>${escapeHtml(question.stem)}</h2><div class="science-answer-options">${options}</div><div class="science-source-attribution">题目来源：${source?.url ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(sourceTitle)} ↗</a>` : `<span>${escapeHtml(sourceTitle)}</span>`}${answerLink}${question.sourceNote ? `<small>${escapeHtml(question.sourceNote)}</small>` : ''}</div>${review}<div class="science-question-footer">${actions}</div></section></div>`;
}

function renderGeneralKnowledge() {
  const study = storage.generalKnowledgeStudy;
  const stats = getGeneralKnowledgeStats(study, GENERAL_KNOWLEDGE_QUESTION_BANK);
  const task = activeGeneralKnowledgePlanTaskId
    ? storage.studyPlanTasks.find((item) => item.id === activeGeneralKnowledgePlanTaskId && item.taskType === 'general_knowledge') : null;
  const taskSession = task ? study.sessions.find((item) => item.planTaskId === task.id && item.status === 'active') : null;
  const session = activeGeneralKnowledgeSessionId
    ? study.sessions.find((item) => item.id === activeGeneralKnowledgeSessionId)
    : taskSession;
  if (session) return renderGeneralKnowledgeSession(session);
  let pointId = selectedGeneralKnowledgePointId;
  if (!pointId && task?.generalKnowledgeConfig?.activityType === 'knowledge') {
    pointId = task.generalKnowledgeConfig.knowledgePointIds.find((id) => study.knowledgeProgress[id]?.status !== 'completed')
      || task.generalKnowledgeConfig.knowledgePointIds[0];
  }
  if (pointId) return renderGeneralKnowledgeLesson(getGeneralKnowledgePoint(pointId), task);
  if (task && ['practice', 'exam', 'mistakes'].includes(task.generalKnowledgeConfig.activityType)) {
    const progress = getGeneralKnowledgeTaskProgress(task, study.sessions, study.answers);
    const modeLabel = task.generalKnowledgeConfig.activityType === 'exam' ? '限时模拟' : task.generalKnowledgeConfig.activityType === 'mistakes' ? '错题复习' : '专项练习';
    return `<div class="page-body science-page general-knowledge-page"><div class="page-heading-row"><div><div class="eyebrow muted">PLAN TASK · ${escapeHtml(task.date)}</div><h1>${escapeHtml(task.title)}</h1><p>${modeLabel} · 目标 ${task.generalKnowledgeConfig.targetQuestionCount} 题${task.generalKnowledgeConfig.durationSeconds ? ` · ${Math.round(task.generalKnowledgeConfig.durationSeconds / 60)} 分钟` : ''}</p></div><a class="button button-secondary" href="#/plan">返回计划</a></div><section class="panel science-task-start"><span class="eyebrow muted">${escapeHtml(getGeneralKnowledgePoint(task.generalKnowledgeConfig.knowledgePointIds[0])?.title || '全部常识学科')}</span><h2>开始计划训练</h2><p>已完成 ${progress.progressCount}/${progress.targetCount} 题；本轮只会安排剩余题量。</p><button type="button" class="button button-primary" data-action="start-general-knowledge-task" data-task-id="${escapeHtml(task.id)}">开始${modeLabel}</button></section></div>`;
  }
  const tree = getGeneralKnowledgeTree();
  const subjects = tree.map((subject) => {
    const topics = subject.topics.map((topic) => {
      const points = topic.knowledgePoints.map((point) => {
        const count = GENERAL_KNOWLEDGE_QUESTION_BANK.filter((question) => question.knowledgePointIds?.includes(point.id) && question.publishStatus === 'published').length;
        const content = GENERAL_KNOWLEDGE_LESSONS[point.id];
        const pointState = study.knowledgeProgress[point.id]?.status === 'completed' ? '已学完' : study.knowledgeProgress[point.id]?.status === 'learning' ? '学习中' : content ? '讲解已发布' : '目录提纲';
        return `<a class="science-point-link ${content ? 'published' : ''}" href="#/aptitude/general-knowledge?knowledge=${encodeURIComponent(point.id)}"><span>${escapeHtml(point.title)}</span><small>${pointState} · ${count} 题</small></a>`;
      }).join('');
      return `<details class="science-topic-card"><summary><strong>${escapeHtml(topic.title)}</strong><span>${topic.knowledgePoints.length} 个知识点</span></summary><div class="science-point-links">${points}</div></details>`;
    }).join('');
    const pointCount = subject.topics.reduce((sum, topic) => sum + topic.knowledgePoints.length, 0);
    const questionCount = GENERAL_KNOWLEDGE_QUESTION_BANK.filter((question) => question.subjectId === subject.id && question.publishStatus === 'published').length;
    return `<section class="panel science-subject-card"><div class="science-subject-heading"><span>${escapeHtml(subject.symbol)}</span><div><h2>${escapeHtml(subject.title)}</h2><small>${pointCount} 个知识点 · ${questionCount} 道已发布题</small></div></div><div class="science-topic-list">${topics}</div></section>`;
  }).join('');
  const mistakes = Object.keys(study.mistakes);
  const dueCards = tree.flatMap((subject) => subject.topics.flatMap((topic) => topic.knowledgePoints))
    .filter((point) => GENERAL_KNOWLEDGE_LESSONS[point.id])
    .filter((point) => !study.flashcards.some((card) => card.knowledgePointId === point.id)
      || study.flashcards.find((card) => card.knowledgePointId === point.id)?.nextReviewAt <= new Date().toISOString());
  const flashcard = dueCards[0];
  const flashcardContent = flashcard ? GENERAL_KNOWLEDGE_LESSONS[flashcard.id] : null;
  const sourceRows = GENERAL_KNOWLEDGE_SOURCES.map((source) => {
    const count = GENERAL_KNOWLEDGE_QUESTION_BANK.filter((question) => question.sourceId === source.id && question.publishStatus === 'published').length;
    const kind = ({ official_outline_example: '官方大纲例题', official_law: '官方法规', official_policy: '官方政策', official_statistics: '官方统计', official_reference: '公开参考', third_party_mock: '第三方题源索引' })[source.sourceType] || source.sourceType;
    return `<article class="science-source-row"><div><strong>${escapeHtml(source.title)}</strong><span>${escapeHtml(source.organization)} · ${kind}${source.examYear ? ` · ${source.examYear}` : ''}</span><small>${escapeHtml(source.note)}</small></div><div class="science-source-actions"><span class="science-source-status ${source.verificationStatus}">${source.verificationStatus === 'verified' ? '已核验来源' : source.verificationStatus === 'reviewed' ? '已核对索引' : '待补原始材料'}</span><small>${count ? `${count} 道公开练习` : '来源索引'}</small><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">打开来源 ↗</a></div></article>`;
  }).join('');
  const sourceCounts = Object.fromEntries(['official_outline_example', 'verified_exam', 'third_party_mock', 'recalled', 'original']
    .map((type) => [type, GENERAL_KNOWLEDGE_QUESTION_BANK.filter((question) => question.publishStatus === 'published' && question.sourceType === type).length]));
  const manualItems = aptitudeItemsForArea('常识判断');
  return `<div class="page-body science-page general-knowledge-page"><div class="page-heading-row"><div><div class="eyebrow muted">11 KNOWLEDGE AREAS · SOURCED QUESTIONS</div><h1>常识判断</h1><p>独立记录讲解进度、练习答案、错题、收藏与模拟成绩；题源和展示方式逐题标明。</p></div><div class="heading-actions"><button type="button" class="button button-primary" data-action="open-general-knowledge-practice">开始练习</button><a class="button button-secondary" href="#/plan">安排学习任务</a></div></div>
    <div class="metric-grid science-metrics">${metric('已发布题库', `${sourceCounts.official_outline_example + sourceCounts.verified_exam + sourceCounts.third_party_mock + sourceCounts.recalled + sourceCounts.original}<small> 道</small>`, `${sourceCounts.official_outline_example + sourceCounts.verified_exam} 道官方例题/真题 · ${sourceCounts.third_party_mock} 道模拟 · ${sourceCounts.original} 道原创`, '常', 'blue')}${metric('站内已作答', `${stats.attemptedCount}<small> 题</small>`, `${stats.completedSessionCount} 次训练完成`, '✓', 'mint')}${metric('站内正确率', fmtPct(stats.accuracy), stats.accuracy === null ? '暂无答题记录' : '只按常识判断站内答案计算', '◎', 'amber')}${metric('错题 / 收藏', `${mistakes.length}<small> / ${study.favorites.length}</small>`, '错题和收藏按常识判断独立保存', '☆', 'purple')}</div>
    ${renderAptitudeRecords(APTITUDE_MODULES.find((module) => module.id === 'general-knowledge'), manualItems)}
    <section class="science-shortcuts">${study.sessions.some((item) => item.status === 'active') ? `<a class="panel science-shortcut-card science-resume-card" href="#/aptitude/general-knowledge?session=${encodeURIComponent(study.sessions.find((item) => item.status === 'active').id)}"><span>继续未完成训练</span><strong>恢复答题</strong><small>进度和已选答案保存在本机加密档案中</small></a>` : ''}<button type="button" class="panel science-shortcut-card" data-action="open-general-knowledge-practice" data-mode="mistakes"><span>错题复习</span><strong>${mistakes.length} 道</strong><small>只抽取常识判断错题</small></button><button type="button" class="panel science-shortcut-card" data-action="open-general-knowledge-practice" data-mode="exam"><span>随机组卷模考</span><strong>题量与时长可选</strong><small>交卷后显示成绩、空题数和逐题解析</small></button><button type="button" class="panel science-shortcut-card" data-action="open-general-knowledge-practice" data-mode="favorites"><span>收藏题复习</span><strong>${study.favorites.length} 道</strong><small>按自己的收藏清单练习</small></button></section>${renderAptitudeModuleMockModes('general-knowledge', { includeRandom: false })}
    <section class="panel science-source-panel general-knowledge-flashcards"><div class="science-panel-heading"><div><span class="eyebrow muted">SPACED REVIEW</span><h2>知识闪卡 · 到期 ${dueCards.length} 张</h2><p>根据自评安排下次复习；熟悉程度由你判断。</p></div><a class="panel-link" href="#/aptitude/general-knowledge">查看全部知识点 →</a></div>${flashcard ? `<article class="science-example"><h3>${escapeHtml(flashcard.title)}</h3>${revealedGeneralKnowledgeFlashcardId === flashcard.id ? `<p>${escapeHtml(flashcardContent.principle)}</p><p>${escapeHtml(flashcardContent.memory?.join(' · ') || flashcardContent.explanation)}</p>` : `<p>先回忆这个知识点的核心判断方法，再显示答案。</p><button type="button" class="button button-secondary button-small" data-action="reveal-general-knowledge-flashcard" data-point-id="${escapeHtml(flashcard.id)}">显示答案</button>`}${revealedGeneralKnowledgeFlashcardId === flashcard.id ? `<div class="science-lesson-footer">${[['again', '没记住'], ['hard', '有些困难'], ['good', '记得'], ['easy', '很熟']].map(([rating, label]) => `<button type="button" class="button button-quiet button-small" data-action="review-general-knowledge-flashcard" data-point-id="${escapeHtml(flashcard.id)}" data-rating="${rating}">${label}</button>`).join('')}</div>` : ''}</article>` : '<div class="empty-state">当前没有到期闪卡；完成知识点讲解后可开始复习。</div>'}</section>
    <div class="science-subject-grid">${subjects}</div><section class="panel science-source-panel"><div class="science-panel-heading"><div><span class="eyebrow muted">SOURCE CATALOG</span><h2>题源与内容参考</h2><p>官方例题经过题意重述；未核实展示授权的第三方题面只保留来源链接。</p></div><span>${GENERAL_KNOWLEDGE_SOURCES.length} 个来源</span></div><div class="science-source-list">${sourceRows}</div></section></div>`;
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
  const aptitudeSessionHistory = renderAptitudeMockSessionHistory();
  const historyStats = [
    ['全部模考中位数', Number.isFinite(summary.median) ? `${fmt(summary.median, 1)} 分` : '待记录', `有效样本 ${summary.count} 次`],
    ['历史最低分', Number.isFinite(summary.minimum) ? `${fmt(summary.minimum, 1)} 分` : '待记录', '所有有效模考'],
    ['历史最高分', Number.isFinite(summary.maximum) ? `${fmt(summary.maximum, 1)} 分` : '待记录', '所有有效模考'],
    ['最近 3 次均分', Number.isFinite(summary.last3Mean) ? `${fmt(summary.last3Mean, 1)} 分` : '不足数据', `${Math.min(summary.count, 3)} / 3 次有效`],
    ['最近 5 次均分', Number.isFinite(summary.last5Mean) ? `${fmt(summary.last5Mean, 1)} 分` : '不足数据', `${Math.min(summary.count, 5)} / 5 次有效`],
  ].map(([label, value, note]) => `<article class="mock-history-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`).join('');
  const rows = [...mocks].reverse().map((mock) => `<tr><td>${escapeHtml(mock.date || '日期待定')}</td><td>${fmt(mock.aptitude, 1)}</td><td>${fmt(mock.essay, 1)}</td><td><strong>${fmt(mock.total, 1)}</strong></td><td>${fmt(mock.target)}</td><td>${Number.isFinite(mock.total) ? `${mock.total >= (mock.target || 138) ? '达成' : `差 ${fmt(mock.total - (mock.target || 138), 1)}`}` : '—'}</td></tr>`).join('');
  return `<div class="page-body"><div class="page-heading-row"><div><div class="eyebrow muted">MOCK EXAM REVIEW</div><h1>模考记录与复盘</h1><p>总分统计只依据你录入的真实成绩；站内模块模考见下方记录。</p></div>${button('＋ 录入一次模考', 'add-mock', 'button button-primary')}</div><div class="metric-grid four-metrics">${metric('有效模考', `${summary.count}<small> / 12</small>`, '只计有实际总分的记录', '◉', 'blue')}${metric('全部模考均分', Number.isFinite(summary.mean) ? `${fmt(summary.mean, 1)}<small> 分</small>` : '待记录', `有效样本 ${summary.count} 次`, '↗', 'mint')}${metric('分数标准差', Number.isFinite(summary.standardDeviation) ? `±${fmt(summary.standardDeviation, 1)}<small> 分</small>` : '至少 2 次', '描述已记录成绩的离散程度', '⌁', 'amber')}${metric('岗位安全垫', '暂不可算', margin.status, '▣', 'purple')}</div><section class="mock-history-strip" aria-label="模考分布与近期均分">${historyStats}</section><div class="panel chart-panel large-chart-panel"><div class="panel-heading"><div><div class="eyebrow muted">TOTAL SCORE</div><h2>行测 + 申论总分走势</h2></div><div class="chart-legend"><span><i></i>实际模考</span><span class="target-legend">目标 138</span></div></div>${chartSvg(mocks)}<div class="target-note">目标线 138 分 · 个人目标可在每次模考中单独设置</div></div>${aptitudeSessionHistory}${moduleSummary}<div class="panel table-panel"><div class="panel-heading"><div><div class="eyebrow muted">MOCK LOG</div><h2>成绩明细</h2></div><span class="panel-hint">空白模考不显示为零分</span></div>${mocks.length ? `<div class="table-scroll"><table class="data-table"><thead><tr><th>日期</th><th>行测</th><th>申论</th><th>总分</th><th>目标</th><th>目标差值</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="table-empty"><span>◎</span><strong>还没有模考成绩</strong><small>完成第一套后，在这里记录各科成绩、模块正确率和复盘结论。</small>${button('＋ 录入第一次模考', 'add-mock', 'button button-primary')}</div>`}</div></div>`;
}

function renderAptitudeMockSessionHistory() {
  const sessions = getAptitudeMockSessionRecords(storage);
  const rows = sessions.map((session) => `<a class="aptitude-mock-session-row" href="${escapeHtml(session.href)}"><span class="aptitude-mock-session-date">${escapeHtml(session.date || '日期待定')}<small>${session.status === 'timed_out' ? '时间到' : '已交卷'}</small></span><strong>${escapeHtml(session.moduleName)}<small>${session.correctCount}/${session.questionCount} 题答对 · 已答 ${session.answeredCount} 题</small></strong><span class="aptitude-mock-session-rate">得分率 ${fmtPct(session.scoreRate)}</span><b>复盘 →</b></a>`).join('');
  return `<section class="panel aptitude-mock-history"><div class="panel-heading"><div><div class="eyebrow muted">IN-APP APTITUDE MOCKS</div><h2>站内行测模考记录</h2><p>从行测题库完成的限时模拟；点击记录可查看逐题答案与解析。这些分项成绩不计入真实整套模考总分。</p></div><a class="panel-link" href="#/aptitude">开始行测练习 →</a></div>${rows ? `<div class="aptitude-mock-session-list">${rows}</div>` : '<div class="empty-state compact">完成任一行测模块的限时模拟后，成绩会显示在这里。</div>'}</section>`;
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

function decisionScopePositions({ districtId = filters.districtId, year = filters.year } = {}) {
  return dataset.positions.filter((position) => (districtId === 'all' || position.districtId === districtId)
    && (year === 'all' || String(position.year) === String(year)));
}

function renderDecisionScope({ districtControlId = 'decision-district', yearControlId = 'decision-year', yearValue = filters.year, allowAllYears = true } = {}) {
  const districts = Array.isArray(dataset.districts) ? dataset.districts : [];
  const districtNames = new Map(districts.map((district) => [district.id, district.name]));
  const currentDistrict = filters.districtId;
  const currentYear = String(yearValue);
  const scopedRows = decisionScopePositions({ districtId: currentDistrict, year: currentYear });
  const selectedDistrictName = currentDistrict === 'all' ? '全部区县' : districtNames.get(currentDistrict) || '区县待核';
  const selectedYearName = currentYear === 'all' ? '全部年度' : `${currentYear} 年`;
  const districtOptions = districts.map((district) => {
    const count = dataset.positions.filter((position) => position.districtId === district.id
      && (currentYear === 'all' || String(position.year) === currentYear)).length;
    const status = count ? `${count} 条样例` : '待补逐岗数据';
    return `<option value="${escapeHtml(district.id)}" ${currentDistrict === district.id ? 'selected' : ''}>${escapeHtml(district.name)} · ${status}</option>`;
  }).join('');
  const yearOptions = [2024, 2025, 2026].map((year) => {
    const count = dataset.positions.filter((position) => (currentDistrict === 'all' || position.districtId === currentDistrict)
      && Number(position.year) === year).length;
    return `<option value="${year}" ${currentYear === String(year) ? 'selected' : ''}>${year} 年${count ? ` · ${count} 条样例` : ' · 待补逐岗数据'}</option>`;
  }).join('');
  return `<section class="decision-scope-panel" aria-label="北京京考职位决策范围"><div class="decision-scope-copy"><span class="eyebrow muted">BEIJING EXAM · DECISION SCOPE</span><strong>北京京考职位决策范围</strong><small>职位库、选岗助手与分数情景按此范围筛选；比较页按你手动选中的岗位，可跨区、跨年对照。</small></div><div class="decision-scope-controls"><label><span>行政区</span><select id="${districtControlId}" aria-label="职位决策区县"><option value="all" ${currentDistrict === 'all' ? 'selected' : ''}>全部 16 区</option>${districtOptions}</select></label><label><span>招考年度</span><select id="${yearControlId}" aria-label="职位决策年度">${allowAllYears ? `<option value="all" ${currentYear === 'all' ? 'selected' : ''}>全部年度</option>` : ''}${yearOptions}</select></label></div><div class="decision-scope-summary"><strong>${scopedRows.length}</strong><span>当前范围职位样例</span><small>${escapeHtml(selectedDistrictName)} · ${escapeHtml(selectedYearName)}；空白表示尚未收录，不代表没有招录</small></div></section>`;
}

function renderPositions() {
  const allPositions = filteredPositions();
  const positionsInScope = decisionScopePositions();
  const emptyPositionText = positionsInScope.length
    ? '当前筛选条件下没有匹配的职位样例。'
    : '当前区县 / 年度尚无可追溯的逐岗样例；这表示数据待补，不代表没有招录。';
  const pageState = paginateItems(allPositions, jobPage, 25);
  jobPage = pageState.page;
  const positions = pageState.items;
  const districts = Array.isArray(dataset.districts) ? dataset.districts : [];
  const positionCountsByDistrict = new Map(districts.map((district) => [
    district.id,
    dataset.positions.filter((position) => position.districtId === district.id
      && (filters.year === 'all' || String(position.year) === filters.year)).length,
  ]));
  const districtNameById = new Map(districts.map((district) => [district.id, district.name]));
  const matchLabels = {
    explicit: '明确列入 1204 / 1252',
    'manual-review': '可能相关 · 人工核对',
    unrestricted: '专业不限',
    'not-listed': '未列入目标代码',
    unknown: '专业文本缺失',
  };
  const rows = positions.map((position, index) => {
    const majorMatch = classifyPublicManagementMatch(position);
    const positionKey = positionIdentity(position);
    const isFavorite = hasPositionReference(storage.favorites, position, dataset.positions);
    const districtName = districtNameById.get(position.districtId) || '区县待核';
    return `<tr style="--row-index:${Math.min(index, 6)}"><td><span class="year-pill">${position.year}</span></td><td><strong>${escapeHtml(position.unit)}</strong><small class="cell-secondary">${escapeHtml(districtName)} · ${escapeHtml(position.orgType)} · ${escapeHtml(position.jobType || '类别待核')}</small></td><td><button type="button" class="position-title-link" data-action="open-job" data-position-key="${escapeHtml(positionKey)}">${escapeHtml(position.title)}</button><small class="cell-secondary mono">${escapeHtml(position.code)}</small></td><td>${fmt(position.recruitCount)} 人</td><td><span class="major-match-badge major-match-${majorMatch.status}">${matchLabels[majorMatch.status]}</span><span class="truncate-cell">${escapeHtml(position.majorText || '待核验')}</span></td><td><div class="position-evidence-cell">${positionEvidenceMarkup(position)}${positionCompletenessMarkup(position)}<small class="cell-secondary">${escapeHtml(position.verification || '核验状态未知')}</small></div></td><td><div class="row-actions"><button type="button" class="icon-button ${isFavorite ? 'favorited' : ''}" data-action="favorite" data-position-key="${escapeHtml(positionKey)}" aria-label="收藏职位">${isFavorite ? '★' : '☆'}</button><button type="button" class="icon-button" data-action="compare" data-position-key="${escapeHtml(positionKey)}" aria-label="加入比较">⇄</button></div></td></tr>`;
  }).join('');
  const districtScopedPositions = decisionScopePositions();
  const publicManagement = summarizePublicManagementPositions(districtScopedPositions);
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
  const countForDistrictYear = (districtId, year) => dataset.positions.filter((position) => position.districtId === districtId && Number(position.year) === year).length;
  const hiresForDistrictYear = (districtId, year) => dataset.positions
    .filter((position) => position.districtId === districtId && Number(position.year) === year)
    .reduce((sum, position) => sum + (Number(position.recruitCount) || 0), 0);
  const populatedDistricts = districts.filter((district) => (positionCountsByDistrict.get(district.id) || 0) > 0);
  const districtCoverage = populatedDistricts.map((district) => `${district.name} ${positionCountsByDistrict.get(district.id)} 条`).join('、');
  const unassignedCount = dataset.positions.filter((position) => !position.districtId).length;
  const yearDistrictCoverage = [2024, 2025, 2026].map((year) => {
    const regions = districts
      .map((district) => ({
        name: district.name,
        count: countForDistrictYear(district.id, year),
        recruits: hiresForDistrictYear(district.id, year),
      }))
      .filter((district) => district.count > 0)
      .map((district) => `${district.name.replace(/区$/u, '')} ${district.count} 条/${district.recruits} 人`);
    return `${year} 年 ${regions.join('、') || '暂无逐岗样例'}`;
  }).join('；');
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
    <div class="page-heading-row"><div><div class="eyebrow muted">BEIJING CIVIL SERVICE EXAM · 2024 — 2026</div><h1>职位库</h1><p>北京全市职位决策入口：当前收录 ${dataset.positions.length} 条逐岗候选，${populatedDistricts.length} / ${districts.length} 个区已有样例（${districtCoverage || '暂无已归类样例'}）；另有 ${unassignedCount} 条区县待核。空白区县是待补数据，不代表没有招录。</p></div><a class="button button-secondary" href="#/sources">了解数据覆盖 →</a></div>
    ${renderDecisionScope({ districtControlId: 'job-district', yearControlId: 'job-year' })}
    <div class="notice notice-soft"><span>ⓘ</span><p>各年度当前可追溯样例：${yearDistrictCoverage}。职位行尚未完成全市官方原表逐码核验；汇总口径差异、来源等级和缺失条件在覆盖中心与每条职位记录中保留，不把样例数当作年度全量或竞争率。</p></div>
    ${publicManagementPanel}
    <div class="panel table-panel job-panel"><div class="job-filterbar"><label class="searchbox"><span>⌕</span><input id="job-search" type="search" placeholder="搜单位、职位、专业或代码" value="${escapeHtml(filters.query)}" autocomplete="off"/><kbd>⌘ K</kbd></label><select id="job-type" aria-label="单位类型"><option value="all" ${filters.orgType === 'all' ? 'selected' : ''}>全部单位类型</option>${orgTypes.map((type) => `<option value="${escapeHtml(type)}" ${filters.orgType === type ? 'selected' : ''}>${escapeHtml(type)}</option>`).join('')}</select><select id="job-jobtype" aria-label="职位类别"><option value="all" ${filters.jobType === 'all' ? 'selected' : ''}>全部职位类别</option>${jobTypes.map((type) => `<option value="${escapeHtml(type)}" ${filters.jobType === type ? 'selected' : ''}>${escapeHtml(type)}</option>`).join('')}</select><select id="job-sort" aria-label="职位排序">${sortOptions.map(([value, label]) => `<option value="${value}" ${jobSort === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select><span class="filter-count">${allPositions.length} 条结果</span></div>${advancedFilters}
    <div class="table-scroll"><table class="data-table job-table"><thead><tr><th>年度</th><th>招录单位</th><th>职位名称 / 代码</th><th>人数</th><th>专业条件片段</th><th>来源等级 / 数据完整度</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="7"><div class="table-empty compact-empty">${escapeHtml(emptyPositionText)}</div></td></tr>`}</tbody></table></div>${pagination}<div class="table-footnote">来源等级反映证据性质；数据完整度按 8 类信息是否可回查计算，两者互不替代。悬停完整度标签可看缺失项；职位数和招录数只表示可见候选，缺失值以“—”呈现，不按 0 人处理。</div></div></div>`;
}

function renderCompare() {
  const selected = storage.compared.map((reference) => findPositionByReference(dataset.positions, reference)).filter(Boolean);
  if (!selected.length) return `<div class="page-body"><div class="page-heading-row"><div><div class="eyebrow muted">BEIJING · SIDE-BY-SIDE REVIEW</div><h1>岗位比较</h1><p>从北京全市职位库加入最多 5 个岗位；可跨区、跨年比较，但会明确展示范围和证据。</p></div><a href="#/positions" class="button button-primary">前往职位库选岗位 →</a></div><div class="panel empty-compare"><span class="empty-compare-icon">⇄</span><h2>先挑几个岗位放在一起看</h2><p>比较表会展示区县、年度、单位、职位条件、来源与已知数据空缺，不为缺失字段打分。</p><a href="#/positions" class="button button-secondary">浏览北京候选职位</a></div></div>`;
  const districtNameById = new Map((dataset.districts || []).map((district) => [district.id, district.name]));
  const qualifiedSnapshotsFor = (position) => dataset.observations.filter((item) => item.observationType === 'qualified_snapshot'
    && Number(item.year) === Number(position.year) && item.positionCode === position.code);
  const fields = [
    ['区县', (position) => districtNameById.get(position.districtId) || '区县待核'],
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
  return `<div class="page-body"><div class="page-heading-row"><div><div class="eyebrow muted">BEIJING · SIDE-BY-SIDE REVIEW</div><h1>岗位比较</h1><p>已选 ${selected.length} / 5 个 · ${new Set(selected.map((position) => position.districtId).filter(Boolean)).size} 个区县 · 缺失条件保持待核验</p></div><a href="#/positions" class="button button-secondary">＋ 添加岗位</a></div><div class="panel compare-panel" style="--compare-count:${selected.length}"><div class="compare-grid compare-header"><div class="compare-label-cell">对比字段</div>${selected.map((position) => `<div class="compare-job-head"><button class="remove-compare" data-action="remove-compare" data-position-key="${escapeHtml(positionIdentity(position))}" aria-label="移除">×</button><span class="year-pill">${escapeHtml(districtNameById.get(position.districtId) || '区县待核')} · ${position.year}</span><strong>${escapeHtml(position.unit)}</strong><span>${escapeHtml(position.title)}</span></div>`).join('')}</div>${fields.map(([label, getValue]) => `<div class="compare-grid compare-row"><div class="compare-label-cell">${escapeHtml(label)}</div>${selected.map((position) => `<div class="compare-value-cell">${escapeHtml(getValue(position))}</div>`).join('')}</div>`).join('')}<div class="compare-grid compare-row"><div class="compare-label-cell">来源</div>${selected.map((position) => `<div class="compare-value-cell">${(position.sources || []).map((id) => sourceLink(id, '打开来源 ↗')).join('<br/>')}</div>`).join('')}</div></div><div class="notice notice-soft"><span>ⓘ</span><p>以上均是 2024–2026 年历史职位样例，不代表 2027 职位。岗位级最终竞争比和逐岗进面线未核实；过程快照不作为最终报名或实考数据，也不用于计算个人安全垫。</p></div></div>`;
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
  const positionsInScope = decisionScopePositions();
  const results = positionsInScope.map((position) => {
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
    const districtName = (dataset.districts || []).find((district) => district.id === position.districtId)?.name || '区县待核';
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
    return `<article class="panel assistant-job ${assistantFilterChanged ? 'filter-enter' : ''}" style="--assistant-index:${Math.min(index, 7)}"><div class="assistant-job-top"><span class="year-pill">${escapeHtml(districtName)} · ${position.year}</span>${chip(eligibility.status, statusTone(eligibility.status))}</div><h2>${escapeHtml(position.title)}</h2><p class="assistant-unit">${escapeHtml(position.unit)} · ${escapeHtml(position.orgType)} · 招录 ${fmt(position.recruitCount)} 人</p>${renderEligibilityChecks(eligibility, position)}${renderWorkPreferenceChecks(position)}<div class="reason-list"><div><span>${eligibility.majorCheck?.status === 'mismatch' ? '!' : eligibility.majorCheck?.status === 'match' ? '✓' : '·'}</span><p><strong>专业代码核验</strong><small>${escapeHtml(majorEligibilityText(position, storage.profile, eligibility))}</small></p></div><div><span>${eligibility.educationCheck?.status === 'mismatch' ? '!' : eligibility.educationCheck?.status === 'match' ? '✓' : '·'}</span><p><strong>学历条件核验</strong><small>${escapeHtml(educationEligibilityText(position, storage.profile, eligibility))}</small></p></div><div><span>—</span><p><strong>岗位竞争与进面分</strong><small>${escapeHtml(positionEvidence)}</small></p></div></div><div class="assistant-scores">${renderScoreBreakdown('难度', difficulty)}${renderScoreBreakdown('适配', fit)}</div><div class="assistant-actions"><button class="button button-quiet button-small" data-action="open-job" data-position-key="${escapeHtml(positionIdentity(position))}">查看证据</button><button class="button button-quiet button-small" data-action="compare" data-position-key="${escapeHtml(positionIdentity(position))}">加入比较 ⇄</button></div></article>`;
  }).join('');
  return `<div class="page-body"><div class="page-heading-row"><div><div class="eyebrow muted">BEIJING · ELIGIBILITY FIRST · EVIDENCE-WEIGHTED SCORES</div><h1>选岗助手</h1><p>先核对硬性条件，再看透明的难度与适配分项；候选与摘要同步受区县、年度筛选。</p></div><a class="button button-secondary" href="#/profile">完善个人条件 →</a></div>${renderDecisionScope()}<div class="assistant-intro"><div class="assistant-icon">✦</div><div><strong>资格优先 · 分项透明</strong><p>个人信息字段已填写 ${complete} 项；“明确可报”仅在官方来源、完整条件和个人资料均可核对时出现。</p></div><span class="assistant-badge">不预测录取概率</span></div>${evidenceSummary}<div class="assistant-filterbar" role="group" aria-label="按资格核验结论筛选">${filterMarkup}</div><div class="assistant-grid">${cards || '<div class="empty-state assistant-empty">当前北京区县 / 年度范围内没有已收录职位样例。可切换筛选范围；暂未收录不代表没有岗位。</div>'}</div><div class="notice notice-warning"><span>!</span><p>综合分按规格固定权重计算；任一分项缺证据就暂不汇总、不对剩余分项重新加权。当前缺少可用于岗位竞争比评分的样本、完整职位条件和个人限制匹配分布，因此合成分可能隐藏；另有多时点资格审查快照未纳入评分，这表示证据口径受限，不是零分，也不等于录取概率。</p></div></div>`;
}

function renderScenarios() {
  const year = Number(scenarioYear);
  const sample = getScoreSampleForYear(dataset.scoreSamples, year);
  const yearScoreRows = filterScoreRowsByScope(
    dataset.scoreRows.filter((row) => Number(row.year) === year && Number.isFinite(row.score)),
    dataset.positions,
    { districtId: filters.districtId, year: scenarioYear },
  );
  const selectedDistrictName = filters.districtId === 'all'
    ? '全部区县'
    : (dataset.districts || []).find((district) => district.id === filters.districtId)?.name || '区县待核';
  const scopeDefinitions = [
    ['all', filters.districtId === 'all' ? '全部区县' : '全部单位类型'], ['district', '区直'], ['street', '街道'], ['town', '镇'],
    ['ordinary', '普通职位'], ['enforcement', '行政执法'], ['public-management', '公共管理相关'],
  ];
  const rowsByScope = Object.fromEntries(scopeDefinitions.map(([scope]) => [
    scope,
    filterScoreRowsBySegment(yearScoreRows, dataset.positions, scope),
  ]));
  const scoreRows = rowsByScope[scenarioScope] || rowsByScope.all;
  const scopeLabel = `${selectedDistrictName} · ${Object.fromEntries(scopeDefinitions.map(([scope, label]) => [scope, label]))[scenarioScope] || '全部单位类型'}`;
  const classifiedSampleCount = new Set(['ordinary', 'enforcement', 'public-management']
    .flatMap((scope) => rowsByScope[scope].map((row) => row.id))).size;
  const result = scoreAgainstSample(scenarioScore, sample, scoreRows);
  const scenarios = [125, 130, 135, 138, 140, 145].map((score, index) => {
    const band = scoreAgainstSample(score, sample, scoreRows);
    const label = band.coverageRate === null ? '暂无样本' : `${fmtPct(band.coverageRate)} · ${band.coveredPositions}/${band.totalPositions}`;
    return `<div class="scenario-row ${score === scenarioScore ? 'selected' : ''}" style="--scenario-index:${index}"><strong>${score}</strong><div class="scenario-bar"><span style="width:${band.coverageRate === null ? 0 : Math.round(band.coverageRate * 100)}%"></span></div><span>${escapeHtml(label)}</span></div>`;
  }).join('');
  const rows = scoreRows.map((row, index) => {
    const mappedPositions = row.positionCode
      ? dataset.positions.filter((position) => Number(position.year) === Number(row.year) && position.code === row.positionCode)
      : [];
    const matchedPosition = row.mappingConfidence === 'high' && mappedPositions.length === 1
      && mappedPositions[0].unit === row.unit && mappedPositions[0].title === row.title
      ? mappedPositions[0]
      : null;
    const districtName = (dataset.districts || []).find((district) => district.id === matchedPosition?.districtId)?.name || '区县未核';
    const mapping = row.positionCode
      ? `职位代码 ${row.positionCode}`
      : row.mappingConfidence === 'ambiguous' ? '同名岗位有歧义' : '尚未匹配职位代码';
    return `<tr style="--scenario-index:${index}"><td><strong>${escapeHtml(row.unit || row.name)}</strong><small class="cell-secondary">${escapeHtml(row.title || '')}</small></td><td>${escapeHtml(districtName)}</td><td><span class="year-pill">${escapeHtml(row.orgType)}</span></td><td><strong>${fmt(row.score, 2)} 分</strong></td><td>${escapeHtml(mapping)}</td><td>${sourceLink(row.sourceId, '查看原始样例来源 ↗')}</td></tr>`;
  }).join('');
  const scores = scoreRows.map((row) => row.score);
  const minimum = scores.length ? Math.min(...scores) : null;
  const maximum = scores.length ? Math.max(...scores) : null;
  const sampleRange = sample && scoreRows.length
    ? `<div class="sample-range"><div class="sample-range-title"><span>岗位最低进面线范围</span><span>${fmt(minimum, 2)} — ${fmt(maximum, 2)}</span></div><div class="range-track"><span class="sample-track"></span><span class="score-marker" style="left:${Math.max(0, Math.min(100, (scenarioScore - 100) * 2))}%"></span></div><div class="sample-caption">${year} 年「${escapeHtml(scopeLabel)}」纳入 ${scoreRows.length} 条具名岗位分数线；当前目标分覆盖 ${result.coveredPositions} 条（${fmtPct(result.coverageRate)}），不是进面概率。</div></div><div class="score-ecdf-heading"><strong>历史岗位进面线分布</strong><span>${year} · ECDF · n=${scoreRows.length}</span></div>${scoreEcdfSvg(scoreRows, year, scenarioScore)}`
    : `<div class="notice notice-warning scenario-no-sample"><span>!</span><p>${year} 年「${escapeHtml(scopeLabel)}」暂无可追溯的具名岗位进面分记录；不借用其他组别或年度样本。</p></div>`;
  const scopeOptions = scopeDefinitions.map(([scope, label]) => `<option value="${scope}" ${scenarioScope === scope ? 'selected' : ''}>${label} · n=${rowsByScope[scope].length}</option>`).join('');
  const coverage = result.coverageRate === null ? '暂无可比样本' : `${fmtPct(result.coverageRate)} · ${result.coveredPositions}/${result.totalPositions} 条岗位线`;
  const sliderProgress = Math.round(Math.max(0, Math.min(100, ((scenarioScore - 120) / 30) * 100)));
  return `<div class="page-body"><div class="page-heading-row"><div><div class="eyebrow muted">BEIJING · HISTORICAL SCORE CONTEXT</div><h1>分数情景</h1><p>按所选区县与年度查看可追溯的具名岗位分数线；历史覆盖不是个人进面概率。</p></div><div class="heading-actions scenario-actions"><label class="scenario-scope-field"><span>样本分组</span><select id="scenario-scope" aria-label="样本分组">${scopeOptions}</select></label>${chip('不预测录取概率', 'blue-soft')}</div></div>${renderDecisionScope({ districtControlId: 'decision-district', yearControlId: 'scenario-year', yearValue: scenarioYear, allowAllYears: false })}<div class="scenario-layout"><section class="panel scenario-main"><div class="panel-heading"><div><div class="eyebrow muted">YOUR TARGET · ${year} · ${escapeHtml(scopeLabel)}</div><h2>试算目标分</h2></div><span class="scenario-score-display">${scenarioScore}<small> 分</small></span></div><input id="scenario-slider" class="score-slider" type="range" min="120" max="150" step="1" value="${scenarioScore}" style="--score-progress:${sliderProgress}%" aria-label="目标分"/><div class="range-labels"><span>120</span><span>135</span><span>150</span></div><div class="scenario-result"><div class="scenario-result-number">${scenarioScore}</div><div><strong>${escapeHtml(result.label)}</strong><p id="scenario-coverage">${year} 年历史最低进面线覆盖 · ${coverage}</p></div></div>${sampleRange}</section><section class="panel scenario-presets"><div class="panel-heading"><div><div class="eyebrow muted">REFERENCE POINTS</div><h2>目标分参考点</h2></div></div><div class="scenario-list">${scenarios}</div><div class="notice notice-soft compact-notice"><span>ⓘ</span><p>覆盖率 = 历史最低进面线 ≤ 目标分的岗位数 ÷ 当前所选区县 / 分组的具名岗位分数行。</p></div></section></div><div class="panel table-panel"><div class="panel-heading"><div><div class="eyebrow muted">POSITION-NAMED EXAMPLES · ${year} · ${escapeHtml(scopeLabel)}</div><h2>${year} 年${escapeHtml(scopeLabel)}具体岗位最低进面线</h2></div><span class="panel-hint">${scoreRows.length} 条 · ${scoreRows.filter((row) => row.mappingConfidence === 'high' && row.positionCode).length} 条代码已核对</span></div><div class="table-scroll"><table class="data-table scenario-table"><thead><tr><th>单位 / 岗位</th><th>区县</th><th>单位类型</th><th>最低进面线</th><th>代码匹配</th><th>来源</th></tr></thead><tbody>${rows || `<tr><td colspan="6"><div class="table-empty compact-empty">${year} 年「${escapeHtml(scopeLabel)}」暂无可追溯的具体岗位分数记录；不会借用其他区县的分数。</div></td></tr>`}</tbody></table></div><small class="table-footnote">分数来自第三方页面可见样例。岗位类别仅纳入代码、单位与岗位名均唯一匹配的分数记录（当前年度 ${classifiedSampleCount} 条）；未匹配样本不推测区县，也不用于区县筛选。</small></div><div class="notice notice-warning"><span>!</span><p>岗位最低进面线不等于笔试合格线。所选区县仅统计高置信、同年度、单位与岗位名一致的代码映射。</p></div></div>`;
}

function renderMatrix() {
  const years = [2024, 2025, 2026];
  const matrix = buildDecisionCoverageMatrix(dataset.positions, dataset.districts, years);
  const populatedDistricts = matrix.filter((district) => Object.values(district.years).some((cell) => cell.hasSample)).length;
  const populatedCells = matrix.reduce((sum, district) => sum + Object.values(district.years).filter((cell) => cell.hasSample).length, 0);
  const cellMarkup = (district, year) => {
    const cell = district.years[year];
    if (!cell.hasSample) return `<td class="district-matrix-empty"><strong>未收录</strong><small>待补逐岗数据</small></td>`;
    const recruitLabel = cell.knownRecruitCount
      ? `${fmt(cell.recruitCount)} 人已知 · ${cell.knownRecruitCount}/${cell.positionCount} 岗有人数`
      : '招录人数待核';
    return `<td class="district-matrix-sample"><strong>${cell.positionCount} 岗样例</strong><small>${recruitLabel}</small><small>官方 ${cell.officialCount} · 二手 ${cell.secondaryCount}</small><button type="button" class="matrix-cell-link" data-action="open-matrix-scope" data-district="${escapeHtml(district.districtId)}" data-year="${year}">查看职位 →</button></td>`;
  };
  const matrixRows = matrix.map((district) => `<tr data-matrix-district="${escapeHtml(district.districtId)}"><th scope="row">${escapeHtml(district.districtName)}</th>${years.map((year) => cellMarkup(district, year)).join('')}</tr>`).join('');
  const scopedPositions = decisionScopePositions();
  const groups = ['区直', '街道', '镇', '垂直/驻区'];
  const groupCards = groups.map((group, index) => {
    const rows = scopedPositions.filter((position) => position.orgType === group);
    const knownRows = rows.filter((position) => position.recruitCount !== null && position.recruitCount !== undefined
      && position.recruitCount !== '' && Number.isFinite(Number(position.recruitCount)));
    const recruits = knownRows.reduce((sum, position) => sum + Number(position.recruitCount), 0);
    return `<article class="panel matrix-card"><span class="matrix-symbol" aria-hidden="true">${['▤', '⌂', '⌖', '↗'][index]}</span><div><h3>${group}</h3><strong>${rows.length ? `${rows.length} 条样例` : '待补样例'}</strong><small>${knownRows.length ? `${fmt(recruits)} 人已知 · ${knownRows.length}/${rows.length} 岗有人数` : '招录人数待核'}</small></div></article>`;
  }).join('');
  return `<div class="page-body"><div class="page-heading-row"><div><div class="eyebrow muted">BEIJING · DISTRICT × YEAR · 2024 — 2026</div><h1>北京京考竞争矩阵</h1><p>用逐岗样例展示区县和年度覆盖，再按单位类型拆分当前范围；职位样例数不是年度总量，也不是报名竞争率。</p></div>${chip('样例覆盖', 'amber')}</div>${renderDecisionScope()}<section class="panel district-matrix-panel"><div class="panel-heading"><div><div class="eyebrow muted">DISTRICT / YEAR COVERAGE</div><h2>全市 16 区 × 3 年职位样例覆盖</h2></div><span class="panel-hint">${populatedDistricts}/16 区有样例 · ${populatedCells}/48 个区县年度格有数据</span></div><div class="table-scroll"><table class="data-table district-matrix-table"><thead><tr><th>区县</th>${years.map((year) => `<th>${year} 招考</th>`).join('')}</tr></thead><tbody>${matrixRows}</tbody></table></div><div class="table-footnote">“未收录”表示当前公开数据库没有可追溯的逐岗记录，不等于该区当年没有招录。来源等级、资格条件和年度汇总差异仍以逐条来源登记为准。</div></section><section class="matrix-type-section"><div class="panel-heading"><div><div class="eyebrow muted">UNIT TYPE · SELECTED SCOPE</div><h2>当前范围单位类型样例</h2></div><a href="#/evidence" class="panel-link">查看年度汇总与来源差异 →</a></div><div class="matrix-grid">${groupCards}</div></section><div class="notice notice-warning"><span>!</span><p>此矩阵不提供“哪个区竞争更激烈”的结论：目前没有可比的全市最终报名 / 实考分母；岗位级资格审查快照也不会被冒充成报名竞争比。</p></div></div>`;
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
    <section class="research-next-step"><span class="research-next-icon">↗</span><div><strong>把样例当线索，把官方职位表当准绳</strong><p>下一步可从覆盖缺口进入职位库逐条核验，或完善个人条件后再用选岗助手。</p></div><a class="button button-secondary" href="#/positions">打开职位库</a></section>
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
  const pages = { overview: renderOverview, guide: renderGuide, plan: renderPlan, science: renderScience, aptitude: renderAptitude, generalKnowledge: renderGeneralKnowledge, essay: renderEssay, mocks: renderMocks, positions: renderPositions, compare: renderCompare, assistant: renderAssistant, scenarios: renderScenarios, matrix: renderMatrix, profile: renderProfile, research: renderResearch, evidence: renderEvidence, sources: renderSources, settings: renderSettings };
  const help = getPageHelp(page === 'aptitudeModule' ? 'aptitudeModule' : page);
  let content = page === 'aptitudeModule' ? renderAptitudeModule(activeAptitudeModuleId) : (pages[page] || renderOverview)();
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
  const stepTitles = ['个人报考条件', '从 Day 1 开始', '记录第一次模考', '查看北京京考职位'];
  let body;
  if (step === 0) {
    body = `<p class="onboarding-lead">这张工作台帮你完成四件事。专业方向预填为公共管理，请先改成自己的真实专业；其他信息可以稍后补。内容只保存在此浏览器。</p><ul class="onboarding-capabilities" aria-label="工作台功能"><li style="--capability-index:0"><span>01</span><strong>管理 50 天复习计划</strong></li><li style="--capability-index:1"><span>02</span><strong>记录并诊断模考成绩</strong></li><li style="--capability-index:2"><span>03</span><strong>查询北京京考历年职位</strong></li><li style="--capability-index:3"><span>04</span><strong>根据个人条件辅助选岗</strong></li></ul><form id="onboarding-profile-form"><div class="onboarding-fields"><label class="form-field"><span>专业方向</span><input name="major" value="${escapeHtml(storage.profile.major || '公共管理')}" autocomplete="off"/></label><label class="form-field"><span>最高学历</span><input name="degree" value="${escapeHtml(storage.profile.degree || '')}" placeholder="例如：本科 / 硕士" autocomplete="off"/></label></div><div class="modal-footer"><button type="button" class="button button-quiet" data-action="onboarding-later">稍后再看</button><button type="submit" class="button button-primary">保存并继续</button></div></form>`;
  } else if (step === 1) {
    body = `<p class="onboarding-lead">计划来自你的 50 天复习表。先从第一天开始记录实际题量和用时，后续完成度就会按真实记录更新。</p><div class="onboarding-preview"><span>DAY 01</span><div><strong>${escapeHtml(dayOne?.focus || '打开 50 天计划')}</strong><small>${escapeHtml(dayOne?.coreTask || '查看第一天的学习安排')} · ${fmt(dayOne?.plannedQuestions)} 题 · ${fmt(dayOne?.plannedHours, 1)} 小时</small></div></div><div class="modal-footer"><button type="button" class="button button-quiet" data-action="onboarding-back">上一步</button><button type="button" class="button button-secondary" data-action="onboarding-open" data-page="plan" data-next-step="2">打开 Day 1 计划</button><button type="button" class="button button-primary" data-action="onboarding-next">下一步</button></div>`;
  } else if (step === 2) {
    body = `<p class="onboarding-lead">录入真实模考后，首页才会显示你的分数趋势、目标差距和薄弱模块。没有填写的分数不会按 0 分处理。</p><div class="onboarding-preview"><span>${getMocks().length ? `${getMocks().length} 次` : '首次'}</span><div><strong>建立自己的成绩基线</strong><small>行测、申论总分，以及选填的模块正确率</small></div></div><div class="modal-footer"><button type="button" class="button button-quiet" data-action="onboarding-back">上一步</button><button type="button" class="button button-secondary" data-action="onboarding-open-mock">现在录入模考</button><button type="button" class="button button-primary" data-action="onboarding-next">下一步</button></div>`;
  } else {
    body = `<p class="onboarding-lead">职位库展示可追溯的北京京考历史记录。当前每条记录都会标出区县、来源和核验状态；历史岗位不能代替当年官方职位表。</p><div class="onboarding-preview"><span>${dataset.positions.length}</span><div><strong>北京京考职位样例</strong><small>可按 16 区和年度搜索、筛选、收藏并查看来源；空白区县待补数据</small></div></div><div class="modal-footer"><button type="button" class="button button-quiet" data-action="onboarding-back">上一步</button><button type="button" class="button button-secondary" data-action="onboarding-later">稍后再看</button><button type="button" class="button button-primary" data-action="onboarding-finish">完成并查看岗位</button></div>`;
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

function openJob(reference) {
  const position = findPositionByReference(dataset.positions, reference);
  if (!position) return;
  const code = position.code;
  const positionKey = positionIdentity(position);
  const eligibility = evaluateEligibility(position, storage.profile);
  const sources = (position.sources || []).map((sourceId) => {
    const source = sourceFor(sourceId);
    return source ? `<a class="evidence-item" href="${escapeHtml(safeUrl(source.url))}" target="_blank" rel="noreferrer"><span>↗</span><div><strong>${escapeHtml(source.title)}</strong><small>${escapeHtml(sourceLevelLabel(source.level))} · ${escapeHtml(source.notes || '')}</small></div></a>` : '';
  }).join('');
  const officialLookup = position.year === 2026 && sourceFor('beijing-2026-position-lookup')
    ? `<aside class="official-position-lookup"><div><strong>官方复核工具 · 2026</strong><p>可按详情页上方职位代码手动查询；该入口是复核工具，不会自动将本条职位标记为官方核验。</p></div>${sourceLink('beijing-2026-position-lookup', '打开人社局代码查询 ↗')}</aside>`
    : '';
  const observations = dataset.observations.filter((item) => Number(item.year) === Number(position.year) && item.positionCode === code);
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
  const isFavorite = hasPositionReference(storage.favorites, position, dataset.positions);
  renderModal(`<div class="modal-head"><div><div class="eyebrow muted">${position.year} · ${escapeHtml(position.code)}</div><h2>${escapeHtml(position.title)}</h2><p>${escapeHtml(position.unit)} · ${escapeHtml(position.orgType)}</p></div><button class="modal-close" data-action="close-modal" aria-label="关闭">×</button></div><div class="modal-body"><div class="modal-status-row">${chip(eligibility.status, statusTone(eligibility.status))}${positionEvidenceMarkup(position)}${positionCompletenessMarkup(position)}${chip(position.verification, 'amber')}</div>${renderEligibilityChecks(eligibility, position)}<div class="detail-grid job-detail-grid">${detailMarkup}</div>${officialLookup}<div class="evidence-list"><div class="eyebrow muted">EVIDENCE & PROVENANCE</div>${sources}</div></div><div class="modal-footer">${button('加入比较 ⇄', 'compare', 'button button-secondary', `data-position-key="${escapeHtml(positionKey)}"`)}${button(isFavorite ? '★ 已收藏' : '☆ 收藏岗位', 'favorite', 'button button-quiet', `data-position-key="${escapeHtml(positionKey)}"`)}<button class="button button-primary" data-action="close-modal">完成</button></div>`);
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

function openSciencePracticeSetup({ pointId = '', mode = 'practice' } = {}) {
  const points = getScienceTree().flatMap((subject) => subject.topics.flatMap((topic) => topic.knowledgePoints.map((point) => ({
    ...point, subjectId: subject.id, subjectTitle: subject.title, topicId: topic.id, topicTitle: topic.title,
  }))));
  const point = points.find((item) => item.id === pointId);
  const questionCount = point
    ? SCIENCE_QUESTION_BANK.filter((question) => question.knowledgePointIds.includes(point.id)).length
    : SCIENCE_QUESTION_BANK.length;
  const defaultCount = Math.max(1, Math.min(mode === 'mistakes' ? 10 : 15, questionCount));
  const subjectOptions = `<option value="">全部学科</option>${getScienceTree().map((subject) => `<option value="${subject.id}" ${subject.id === point?.subjectId ? 'selected' : ''}>${escapeHtml(subject.title)}</option>`).join('')}`;
  const topicOptions = `<option value="">全部专题</option>${getScienceTree().flatMap((subject) => subject.topics.map((topic) => `<option value="${topic.id}" ${topic.id === point?.topicId ? 'selected' : ''}>${escapeHtml(subject.title)} · ${escapeHtml(topic.title)}</option>`)).join('')}`;
  const pointOptions = `<option value="">不限定知识点</option>${points.map((item) => `<option value="${item.id}" ${item.id === pointId ? 'selected' : ''}>${escapeHtml(item.subjectTitle)} · ${escapeHtml(item.topicTitle)} · ${escapeHtml(item.title)}</option>`).join('')}`;
  renderModal(`<form id="science-session-setup"><div class="modal-head"><div><div class="eyebrow muted">SCIENCE REASONING</div><h2>设置科学推理训练</h2><p>题目会按来源分类显示，回忆版和机构模拟题均不是官方发布。</p></div><button type="button" class="modal-close" data-action="close-modal" aria-label="关闭">×</button></div><div class="modal-body"><div class="form-grid">
    <label class="form-field"><span>训练方式</span><select name="mode"><option value="practice" ${mode === 'practice' ? 'selected' : ''}>专项练习</option><option value="exam" ${mode === 'exam' ? 'selected' : ''}>限时模拟</option><option value="mistakes" ${mode === 'mistakes' ? 'selected' : ''}>错题复习</option></select></label>
    <label class="form-field"><span>学科筛选</span><select name="subjectId">${subjectOptions}</select></label>
    <label class="form-field"><span>专题筛选</span><select name="topicId">${topicOptions}</select></label>
    <label class="form-field form-field-wide"><span>知识点筛选</span><select name="knowledgePointId">${pointOptions}</select></label>
    <label class="form-field"><span>目标题量</span><input name="targetQuestionCount" type="number" min="1" max="${SCIENCE_QUESTION_BANK.length}" value="${defaultCount}" required/></label>
    <label class="form-field science-setup-duration"><span>模拟时长（分钟）</span><input name="durationMinutes" type="number" min="1" value="20"/></label>
    <label class="form-field"><span>难度</span><select name="difficultyFilter"><option value="all">全部难度</option><option value="easy">基础</option><option value="medium">中等</option><option value="hard">进阶</option></select></label>
    <label class="form-field"><span>题源</span><select name="sourceFilter"><option value="all">全部题源</option><option value="official">官方大纲例题</option><option value="verified_exam">已核验原卷真题</option><option value="recalled">考生回忆版</option><option value="third_party_mock">机构模拟题</option><option value="original">现有原创练习</option></select></label>
    <label class="form-field"><span><input name="onlyUnanswered" type="checkbox" value="true"/> 只做未答题</span></label>
  </div><div class="notice notice-soft compact-notice"><span>ⓘ</span><p>筛选后题量不足时，系统会显示实际可用题数，不会重复拼题或伪造题目。</p></div></div><div class="modal-footer"><button type="button" class="button button-quiet" data-action="close-modal">取消</button><button type="submit" class="button button-primary">开始训练</button></div></form>`);
}

function getAptitudeModulePracticeCandidates(moduleId, values = {}) {
  const study = storage.aptitudeModuleStudies[moduleId];
  if (!study) return [];
  return filterQuestions(getAptitudeQuestions(moduleId), {
    subjectId: values.subjectId || undefined,
    topicId: values.topicId || undefined,
    knowledgePointId: values.knowledgePointId || undefined,
    difficulty: values.difficultyFilter && values.difficultyFilter !== 'all' ? values.difficultyFilter : undefined,
    sourceType: values.sourceFilter && values.sourceFilter !== 'all' ? values.sourceFilter : undefined,
    onlyMistakes: values.mode === 'mistakes',
    onlyFavorites: values.mode === 'favorites',
    onlyUnanswered: values.onlyUnanswered === 'true' || values.onlyUnanswered === true,
    answeredQuestionIds: study.answers.map((answer) => answer.questionId),
    mistakeQuestionIds: Object.keys(study.mistakes),
    favoriteQuestionIds: study.favorites,
  });
}

function syncAptitudeModulePracticeSetup(form) {
  if (!form) return;
  const values = Object.fromEntries(new FormData(form).entries());
  const candidates = getAptitudeModulePracticeCandidates(form.dataset.moduleId, values);
  const countNote = form.querySelector('[data-aptitude-module-question-count]');
  const targetCount = form.querySelector('[name="targetQuestionCount"]');
  const duration = form.querySelector('[data-aptitude-module-duration]');
  const submit = form.querySelector('[type="submit"]');
  if (countNote) countNote.textContent = `当前筛选可用 ${candidates.length} 道题`;
  if (targetCount) {
    targetCount.max = String(Math.max(1, candidates.length));
    if (candidates.length && Number(targetCount.value) > candidates.length) targetCount.value = String(candidates.length);
  }
  if (duration) duration.hidden = values.mode !== 'exam';
  if (submit) submit.disabled = candidates.length === 0;
}

function openAptitudeModulePracticeSetup({ moduleId, pointId = '', mode = 'practice' } = {}) {
  const module = APTITUDE_MODULES.find((item) => item.id === moduleId && item.studyStore === 'aptitudeModuleStudies');
  if (!module) { notify('找不到这条行测模块。'); return; }
  const bank = getAptitudeQuestions(module.id);
  if (!bank.length) { notify('题库待接入，无法开始训练。'); return; }
  const content = getAptitudeModuleContent(module.id);
  const points = getAptitudeModuleKnowledgePoints(content);
  const point = points.find((item) => item.id === pointId);
  const subjects = new Map((content.directory || []).map((item) => [item.id, item.title]));
  const topics = new Map((content.directory || []).flatMap((subject) => (subject.topics || []).map((item) => [item.id, `${subject.title} · ${item.title}`])));
  const pointLabels = new Map(points.map((item) => [item.id, `${item.subjectTitle} · ${item.topicTitle} · ${item.title}`]));
  for (const question of bank) {
    if (question.subjectId) subjects.set(question.subjectId, question.subjectTitle || question.subjectId);
    if (question.topicId) topics.set(question.topicId, question.topicTitle || question.topicId);
    for (const id of question.knowledgePointIds || []) if (!pointLabels.has(id)) pointLabels.set(id, id);
  }
  const subjectOptions = `<option value="">全部学科</option>${[...subjects].map(([id, title]) => `<option value="${escapeHtml(id)}" ${id === point?.subjectId ? 'selected' : ''}>${escapeHtml(title)}</option>`).join('')}`;
  const topicOptions = `<option value="">全部专题</option>${[...topics].map(([id, title]) => `<option value="${escapeHtml(id)}" ${id === point?.topicId ? 'selected' : ''}>${escapeHtml(title)}</option>`).join('')}`;
  const pointOptions = `<option value="">不限定知识点</option>${[...pointLabels].map(([id, title]) => `<option value="${escapeHtml(id)}" ${id === pointId ? 'selected' : ''}>${escapeHtml(title)}</option>`).join('')}`;
  const selectedMode = ['exam', 'mistakes', 'favorites'].includes(mode) ? mode : 'practice';
  const initialCount = getAptitudeModulePracticeCandidates(module.id, {
    mode: selectedMode, knowledgePointId: pointId,
  }).length;
  if (!initialCount) { notify(selectedMode === 'mistakes' ? '当前模块还没有可复习错题。' : selectedMode === 'favorites' ? '当前模块还没有收藏题目。' : '当前筛选没有可用题目。'); return; }
  const defaultCount = Math.min(selectedMode === 'mistakes' || selectedMode === 'favorites' ? 10 : 15, initialCount);
  renderModal(`<form id="aptitude-module-session-setup" data-module-id="${escapeHtml(module.id)}"><div class="modal-head"><div><div class="eyebrow muted">${escapeHtml(module.area.toUpperCase())} · APTITUDE</div><h2>设置${escapeHtml(module.area)}训练</h2><p>按本模块已发布题库筛选；题量不足时只使用实际可用题目。</p></div><button type="button" class="modal-close" data-action="close-modal" aria-label="关闭">×</button></div><div class="modal-body"><div class="form-grid">
    <label class="form-field"><span>训练方式</span><select name="mode"><option value="practice" ${selectedMode === 'practice' ? 'selected' : ''}>专项练习</option><option value="exam" ${selectedMode === 'exam' ? 'selected' : ''}>限时模拟</option><option value="mistakes" ${selectedMode === 'mistakes' ? 'selected' : ''}>错题复习</option><option value="favorites" ${selectedMode === 'favorites' ? 'selected' : ''}>收藏题复习</option></select></label>
    <label class="form-field"><span>学科筛选</span><select name="subjectId">${subjectOptions}</select></label>
    <label class="form-field"><span>专题筛选</span><select name="topicId">${topicOptions}</select></label>
    <label class="form-field form-field-wide"><span>知识点筛选</span><select name="knowledgePointId">${pointOptions}</select></label>
    <label class="form-field"><span>目标题量</span><input name="targetQuestionCount" type="number" min="1" max="${initialCount}" value="${defaultCount}" required/></label>
    <label class="form-field" data-aptitude-module-duration ${selectedMode === 'exam' ? '' : 'hidden'}><span>模拟时长（分钟）</span><input name="durationMinutes" type="number" min="1" value="20"/></label>
    <label class="form-field"><span>难度</span><select name="difficultyFilter"><option value="all">全部难度</option><option value="easy">基础</option><option value="medium">中等</option><option value="hard">进阶</option></select></label>
    <label class="form-field"><span>题源</span><select name="sourceFilter"><option value="all">全部题源</option><option value="official">官方大纲例题 / 真题</option><option value="official_outline_example">官方大纲例题</option><option value="verified_exam">核验真题</option><option value="third_party_mock">机构模拟题</option><option value="recalled">考生回忆版</option><option value="licensed">授权题目</option><option value="original">本站原创</option></select></label>
    <label class="form-field"><span><input name="onlyUnanswered" type="checkbox" value="true"/> 只做未答题</span></label>
  </div><p class="panel-hint" data-aptitude-module-question-count></p></div><div class="modal-footer"><button type="button" class="button button-quiet" data-action="close-modal">取消</button><button type="submit" class="button button-primary">开始训练</button></div></form>`);
  syncAptitudeModulePracticeSetup(modalRoot.querySelector('#aptitude-module-session-setup'));
}

function openGeneralKnowledgePracticeSetup({ pointId = '', mode = 'practice' } = {}) {
  const points = getGeneralKnowledgeTree().flatMap((subject) => subject.topics.flatMap((topic) => topic.knowledgePoints));
  const point = points.find((item) => item.id === pointId);
  const onlyMistakes = mode === 'mistakes';
  const onlyFavorites = mode === 'favorites';
  const filteredCount = GENERAL_KNOWLEDGE_QUESTION_BANK.filter((question) => question.publishStatus === 'published'
    && (!point || question.knowledgePointIds?.includes(point.id))
    && (!onlyMistakes || storage.generalKnowledgeStudy.mistakes[question.id])
    && (!onlyFavorites || storage.generalKnowledgeStudy.favorites.includes(question.id))).length;
  const defaultCount = Math.max(1, Math.min(mode === 'mistakes' || mode === 'favorites' ? 10 : 15, filteredCount));
  const subjectOptions = `<option value="">全部学科</option>${getGeneralKnowledgeTree().map((subject) => `<option value="${subject.id}" ${subject.id === point?.subjectId ? 'selected' : ''}>${escapeHtml(subject.title)}</option>`).join('')}`;
  const topicOptions = `<option value="">全部专题</option>${points.filter((item) => !point || item.subjectId === point.subjectId).map((item) => `<option value="${item.topicId}" ${item.id === pointId ? 'selected' : ''}>${escapeHtml(item.subjectTitle)} · ${escapeHtml(item.topicTitle)}</option>`).filter((option, index, all) => all.indexOf(option) === index).join('')}`;
  const pointOptions = `<option value="">不限定知识点</option>${points.map((item) => `<option value="${item.id}" ${item.id === pointId ? 'selected' : ''}>${escapeHtml(item.subjectTitle)} · ${escapeHtml(item.topicTitle)} · ${escapeHtml(item.title)}</option>`).join('')}`;
  renderModal(`<form id="general-knowledge-session-setup"><div class="modal-head"><div><div class="eyebrow muted">GENERAL KNOWLEDGE</div><h2>设置常识判断训练</h2><p>题目显示来源和改写方式；当前题库不足以支持大规模模考时会提示实际题量。</p></div><button type="button" class="modal-close" data-action="close-modal" aria-label="关闭">×</button></div><div class="modal-body"><div class="form-grid">
    <label class="form-field"><span>训练方式</span><select name="mode"><option value="practice" ${mode === 'practice' ? 'selected' : ''}>专项练习</option><option value="exam" ${mode === 'exam' ? 'selected' : ''}>限时模拟</option><option value="mistakes" ${onlyMistakes ? 'selected' : ''}>错题复习</option><option value="favorites" ${onlyFavorites ? 'selected' : ''}>收藏题复习</option></select></label>
    <label class="form-field"><span>学科筛选</span><select name="subjectId" id="general-knowledge-subject">${subjectOptions}</select></label>
    <label class="form-field"><span>专题筛选</span><select name="topicId" id="general-knowledge-topic">${topicOptions}</select></label>
    <label class="form-field form-field-wide"><span>知识点筛选</span><select name="knowledgePointId" id="general-knowledge-point">${pointOptions}</select></label>
    <label class="form-field"><span>目标题量</span><input name="targetQuestionCount" type="number" min="1" max="${GENERAL_KNOWLEDGE_QUESTION_BANK.length}" value="${defaultCount}" required/></label>
    <label class="form-field"><span>模拟时长（分钟）</span><input name="durationMinutes" type="number" min="1" value="20"/></label>
    <label class="form-field"><span>难度</span><select name="difficultyFilter"><option value="all">全部难度</option><option value="easy">基础</option><option value="medium">中等</option><option value="hard">进阶</option></select></label>
    <label class="form-field"><span>题源</span><select name="sourceFilter"><option value="all">全部题源</option><option value="official">官方大纲例题 / 真题</option><option value="verified_exam">核验真题</option><option value="third_party_mock">机构模拟题</option><option value="recalled">考生回忆版</option><option value="original">本站原创</option></select></label>
    <label class="form-field"><span><input name="onlyUnanswered" type="checkbox" value="true"/> 只做未答题</span></label>
  </div><div class="notice notice-soft compact-notice"><span>ⓘ</span><p>题量不足时会显示实际可用数量，不会重复拼题。未经确认展示授权的第三方题面不会直接入库。</p></div></div><div class="modal-footer"><button type="button" class="button button-quiet" data-action="close-modal">取消</button><button type="submit" class="button button-primary">开始训练</button></div></form>`);
  syncGeneralKnowledgeTaskControls(modalRoot.querySelector('#general-knowledge-session-setup'));
}

function openPlanTaskEditor(taskId = null, date = todayString()) {
  const existing = taskId ? storage.studyPlanTasks.find((task) => task.id === taskId) : null;
  if (taskId && !existing) { notify('找不到这条学习任务。'); return; }
  const task = existing || {
    date, taskType: 'custom', customTypeName: '', title: '', description: '', estimatedMinutes: '',
    priority: 'normal', status: 'not_started', scienceConfig: { activityType: 'free' }, generalKnowledgeConfig: { activityType: 'free' },
  };
  const config = task.scienceConfig || { activityType: 'free' };
  const generalKnowledgeConfig = task.generalKnowledgeConfig || { activityType: 'free' };
  const aptitudeConfig = task.aptitudeConfig || { activityType: 'free' };
  const subjects = getScienceTree();
  const subjectId = config.subjectId || '';
  const subject = subjects.find((item) => item.id === subjectId) || null;
  const topics = subject?.topics || [];
  const topicId = config.topicId || '';
  const topic = topics.find((item) => item.id === topicId) || null;
  const points = topic?.knowledgePoints || [];
  const pointId = config.knowledgePointIds?.[0] || '';
  const generalKnowledgeSubjects = getGeneralKnowledgeTree();
  const generalKnowledgeSubjectId = generalKnowledgeConfig.subjectId || '';
  const generalKnowledgeSubject = generalKnowledgeSubjects.find((item) => item.id === generalKnowledgeSubjectId) || null;
  const generalKnowledgeTopicId = generalKnowledgeConfig.topicId || '';
  const generalKnowledgeTopic = generalKnowledgeSubject?.topics.find((item) => item.id === generalKnowledgeTopicId) || null;
  const generalKnowledgePoints = generalKnowledgeTopic?.knowledgePoints || (generalKnowledgeSubject ? generalKnowledgeSubject.topics.flatMap((item) => item.knowledgePoints) : []);
  const generalKnowledgePointId = generalKnowledgeConfig.knowledgePointIds?.[0] || '';
  const typeOptions = PLAN_TASK_TYPES.map(([value, label]) => `<option value="${value}" ${task.taskType === value ? 'selected' : ''}>${label}</option>`).join('');
  const statusOptions = PLAN_TASK_STATUSES.map(([value, label]) => `<option value="${value}" ${task.status === value ? 'selected' : ''}>${label}</option>`).join('');
  const subjectOptions = `<option value="" ${!subjectId ? 'selected' : ''}>全部学科</option>${subjects.map((item) => `<option value="${item.id}" ${item.id === subjectId ? 'selected' : ''}>${escapeHtml(item.title)}</option>`).join('')}`;
  const topicOptions = `<option value="" ${!topicId ? 'selected' : ''}>全部专题</option>${topics.map((item) => `<option value="${item.id}" ${item.id === topicId ? 'selected' : ''}>${escapeHtml(item.title)}</option>`).join('')}`;
  const pointOptions = `<option value="" ${!pointId ? 'selected' : ''}>不限定知识点</option>${points.map((item) => `<option value="${item.id}" ${item.id === pointId ? 'selected' : ''}>${escapeHtml(item.title)}${item.contentStatus === 'outline' ? '（提纲）' : ''}</option>`).join('')}`;
  const activityOptions = SCIENCE_ACTIVITY_TYPES.map(([value, label]) => `<option value="${value}" ${config.activityType === value ? 'selected' : ''}>${label}</option>`).join('');
  const isScience = task.taskType === 'science_reasoning';
  const isGeneralKnowledge = task.taskType === 'general_knowledge';
  const aptitudeModule = getAptitudeModuleForTaskType(task.taskType);
  const questionCount = config.targetQuestionCount ?? (config.activityType === 'exam' ? 10 : '');
  renderModal(`<form id="plan-task-form" ${existing ? `data-task-id="${escapeHtml(existing.id)}"` : ''}>
    <div class="modal-head"><div><div class="eyebrow muted">FLEXIBLE STUDY PLAN</div><h2>${existing ? '编辑学习任务' : '新增学习任务'}</h2><p>任务安排、原始 50 天日程和学习记录分别保存。</p></div><button type="button" class="modal-close" data-action="close-modal" aria-label="关闭">×</button></div>
    <div class="modal-body"><div class="form-grid">
      <label class="form-field"><span>学习日期</span><input name="date" type="date" value="${escapeHtml(task.date || date)}" required/></label>
      <label class="form-field"><span>任务类型</span><select name="taskType" id="plan-task-type">${typeOptions}</select></label>
      <label class="form-field" data-custom-type-field ${task.taskType === 'custom' ? '' : 'hidden'}><span>自定义分类名称</span><input name="customTypeName" maxlength="40" value="${escapeHtml(task.customTypeName || '')}" placeholder="例如：英语 / 资料整理"/></label>
      <label class="form-field"><span>预计时长（分钟）</span><input name="estimatedMinutes" type="number" min="0" step="5" value="${escapeHtml(task.estimatedMinutes ?? '')}" placeholder="选填"/></label>
      <label class="form-field"><span>优先级</span><select name="priority"><option value="low" ${task.priority === 'low' ? 'selected' : ''}>低</option><option value="normal" ${task.priority === 'normal' ? 'selected' : ''}>普通</option><option value="high" ${task.priority === 'high' ? 'selected' : ''}>高</option></select></label>
      <label class="form-field"><span>状态</span><select name="status">${statusOptions}</select></label>
      <label class="form-field form-field-wide"><span>任务名称</span><input name="title" maxlength="120" value="${escapeHtml(task.title)}" required placeholder="写下本次要完成的具体事项"/><small>预览：<strong data-plan-task-preview>${escapeHtml(task.title || '未命名任务')}</strong></small></label>
      <label class="form-field form-field-wide"><span>备注 / 验收标准</span><textarea name="description" rows="2" maxlength="500" placeholder="选填">${escapeHtml(task.description || '')}</textarea></label>
    </div>
    <section class="science-task-config" data-science-config ${isScience ? '' : 'hidden'} aria-label="科学推理训练配置">
      <div class="science-config-heading"><span class="eyebrow muted">SCIENCE REASONING</span><h3>科学推理训练配置</h3><p>仅选择“科学推理”任务类型时启用。普通自定义任务名称不会触发科学训练。</p></div>
      <div class="form-grid"><label class="form-field"><span>训练方式</span><select name="activityType" id="science-activity-type">${activityOptions}</select></label>
        <label class="form-field"><span>学科</span><select name="scienceSubjectId" id="science-subject">${subjectOptions}</select></label>
        <label class="form-field"><span>专题</span><select name="scienceTopicId" id="science-topic">${topicOptions}</select></label>
        <label class="form-field"><span>知识点</span><select name="scienceKnowledgePointId" id="science-point">${pointOptions}</select></label>
        <label class="form-field science-question-field" data-science-question-field><span>目标题量</span><input name="targetQuestionCount" type="number" min="1" step="1" value="${escapeHtml(questionCount)}" placeholder="例如 15"/></label>
        <label class="form-field science-exam-field" data-science-exam-field ${config.activityType === 'exam' ? '' : 'hidden'}><span>限时（分钟）</span><input name="durationMinutes" type="number" min="1" step="1" value="${config.durationSeconds ? Math.round(config.durationSeconds / 60) : 10}"/></label>
        <label class="form-field"><span>题源筛选</span><select name="sourceFilter"><option value="all">全部题源</option><option value="official" ${config.sourceFilter === 'official' ? 'selected' : ''}>官方大纲例题</option><option value="verified_exam" ${config.sourceFilter === 'verified_exam' ? 'selected' : ''}>已核验原卷真题</option><option value="recalled" ${config.sourceFilter === 'recalled' ? 'selected' : ''}>考生回忆版</option><option value="third_party_mock" ${config.sourceFilter === 'third_party_mock' ? 'selected' : ''}>机构模拟题</option><option value="original" ${config.sourceFilter === 'original' ? 'selected' : ''}>现有原创练习</option></select></label>
        <label class="form-field"><span>难度筛选</span><select name="difficultyFilter"><option value="all">全部难度</option><option value="easy" ${config.difficultyFilter === 'easy' ? 'selected' : ''}>基础</option><option value="medium" ${config.difficultyFilter === 'medium' ? 'selected' : ''}>中等</option><option value="hard" ${config.difficultyFilter === 'hard' ? 'selected' : ''}>进阶</option></select></label>
      </div><div class="notice notice-soft compact-notice"><span>ⓘ</span><p>题目与答题记录在本机加密保存；练习题数和模拟考试完成情况会按实际答题自动核验。</p></div>
    </section>
    <section class="science-task-config general-knowledge-task-config" data-general-knowledge-config ${isGeneralKnowledge ? '' : 'hidden'} aria-label="常识判断训练配置">
      <div class="science-config-heading"><span class="eyebrow muted">GENERAL KNOWLEDGE</span><h3>常识判断训练配置</h3><p>选择常识知识领域、专题和学习方式；任务进度仅计入常识判断模块自己的答题记录。</p></div>
      <div class="form-grid"><label class="form-field"><span>训练方式</span><select name="generalKnowledgeActivityType" id="general-knowledge-activity-type">${SCIENCE_ACTIVITY_TYPES.map(([value, label]) => `<option value="${value}" ${generalKnowledgeConfig.activityType === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
        <label class="form-field"><span>学科</span><select name="generalKnowledgeSubjectId" id="general-knowledge-subject"><option value="">全部学科</option>${generalKnowledgeSubjects.map((item) => `<option value="${item.id}" ${item.id === generalKnowledgeSubjectId ? 'selected' : ''}>${escapeHtml(item.title)}</option>`).join('')}</select></label>
        <label class="form-field"><span>专题</span><select name="generalKnowledgeTopicId" id="general-knowledge-topic"><option value="">全部专题</option>${generalKnowledgeSubject?.topics.map((item) => `<option value="${item.id}" ${item.id === generalKnowledgeTopicId ? 'selected' : ''}>${escapeHtml(item.title)}</option>`).join('') || ''}</select></label>
        <label class="form-field"><span>知识点</span><select name="generalKnowledgePointId" id="general-knowledge-point"><option value="">不限定知识点</option>${generalKnowledgePoints.map((item) => `<option value="${item.id}" ${item.id === generalKnowledgePointId ? 'selected' : ''}>${escapeHtml(item.title)}${item.contentStatus === 'outline' ? '（提纲）' : ''}</option>`).join('')}</select></label>
        <label class="form-field general-knowledge-question-field" data-general-knowledge-question-field><span>目标题量</span><input name="generalKnowledgeTargetQuestionCount" type="number" min="1" step="1" value="${escapeHtml(generalKnowledgeConfig.targetQuestionCount ?? (generalKnowledgeConfig.activityType === 'exam' ? 10 : ''))}" placeholder="例如 10"/></label>
        <label class="form-field general-knowledge-exam-field" data-general-knowledge-exam-field ${generalKnowledgeConfig.activityType === 'exam' ? '' : 'hidden'}><span>限时（分钟）</span><input name="generalKnowledgeDurationMinutes" type="number" min="1" step="1" value="${generalKnowledgeConfig.durationSeconds ? Math.round(generalKnowledgeConfig.durationSeconds / 60) : 10}"/></label>
        <label class="form-field"><span>题源筛选</span><select name="generalKnowledgeSourceFilter"><option value="all">全部题源</option><option value="official" ${generalKnowledgeConfig.sourceFilter === 'official' ? 'selected' : ''}>官方例题 / 真题</option><option value="verified_exam" ${generalKnowledgeConfig.sourceFilter === 'verified_exam' ? 'selected' : ''}>已核验真题</option><option value="third_party_mock" ${generalKnowledgeConfig.sourceFilter === 'third_party_mock' ? 'selected' : ''}>机构模拟题</option><option value="recalled" ${generalKnowledgeConfig.sourceFilter === 'recalled' ? 'selected' : ''}>考生回忆版</option><option value="original" ${generalKnowledgeConfig.sourceFilter === 'original' ? 'selected' : ''}>本站原创</option></select></label>
        <label class="form-field"><span>难度筛选</span><select name="generalKnowledgeDifficultyFilter"><option value="all">全部难度</option><option value="easy" ${generalKnowledgeConfig.difficultyFilter === 'easy' ? 'selected' : ''}>基础</option><option value="medium" ${generalKnowledgeConfig.difficultyFilter === 'medium' ? 'selected' : ''}>中等</option><option value="hard" ${generalKnowledgeConfig.difficultyFilter === 'hard' ? 'selected' : ''}>进阶</option></select></label>
      </div><div class="notice notice-soft compact-notice"><span>ⓘ</span><p>法律与时政题优先回链到官方现行文件；各来源题型和年份会显示在训练复盘中。</p></div>
    </section>
    <section class="science-task-config aptitude-module-task-config" data-aptitude-config ${aptitudeModule ? '' : 'hidden'} aria-label="行测模块训练配置">
      <div class="science-config-heading"><span class="eyebrow muted">${escapeHtml(aptitudeModule?.area || 'APTITUDE MODULE')}</span><h3>${escapeHtml(aptitudeModule?.area || '行测模块')}训练配置</h3><p>筛选编号可先保存到计划；知识目录或题库接入后按这些条件训练。题库为空时不会自动记为完成。</p></div>
      <div class="form-grid"><label class="form-field"><span>训练方式</span><select name="aptitudeActivityType" id="aptitude-activity-type">${SCIENCE_ACTIVITY_TYPES.map(([value, label]) => `<option value="${value}" ${aptitudeConfig.activityType === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
        <label class="form-field"><span>学科编号（选填）</span><input name="aptitudeSubjectId" value="${escapeHtml(aptitudeConfig.subjectId || '')}" maxlength="120" placeholder="目录接入后可按编号筛选"/></label>
        <label class="form-field"><span>专题编号（选填）</span><input name="aptitudeTopicId" value="${escapeHtml(aptitudeConfig.topicId || '')}" maxlength="120" placeholder="例如 verbal:center"/></label>
        <label class="form-field"><span>知识点编号（逗号分隔）</span><input name="aptitudeKnowledgePointIds" value="${escapeHtml((aptitudeConfig.knowledgePointIds || []).join(', '))}" placeholder="目录接入后可按编号筛选"/></label>
        <label class="form-field aptitude-question-field" data-aptitude-question-field><span>目标题量</span><input name="aptitudeTargetQuestionCount" type="number" min="1" step="1" value="${escapeHtml(aptitudeConfig.targetQuestionCount ?? (aptitudeConfig.activityType === 'exam' ? 10 : ''))}" placeholder="例如 10"/></label>
        <label class="form-field aptitude-exam-field" data-aptitude-exam-field ${aptitudeConfig.activityType === 'exam' ? '' : 'hidden'}><span>限时（分钟）</span><input name="aptitudeDurationMinutes" type="number" min="1" step="1" value="${aptitudeConfig.durationSeconds ? Math.round(aptitudeConfig.durationSeconds / 60) : 10}"/></label>
        <label class="form-field"><span>题源筛选</span><select name="aptitudeSourceFilter"><option value="all">全部题源</option><option value="official" ${aptitudeConfig.sourceFilter === 'official' ? 'selected' : ''}>官方来源</option><option value="official_outline_example" ${aptitudeConfig.sourceFilter === 'official_outline_example' ? 'selected' : ''}>官方大纲例题</option><option value="verified_exam" ${aptitudeConfig.sourceFilter === 'verified_exam' ? 'selected' : ''}>核验真题</option><option value="recalled" ${aptitudeConfig.sourceFilter === 'recalled' ? 'selected' : ''}>考生回忆版</option><option value="third_party_mock" ${aptitudeConfig.sourceFilter === 'third_party_mock' ? 'selected' : ''}>机构模拟题</option><option value="licensed" ${aptitudeConfig.sourceFilter === 'licensed' ? 'selected' : ''}>授权题目</option><option value="original" ${aptitudeConfig.sourceFilter === 'original' ? 'selected' : ''}>原创题</option></select></label>
        <label class="form-field"><span>难度筛选</span><select name="aptitudeDifficultyFilter"><option value="all">全部难度</option><option value="easy" ${aptitudeConfig.difficultyFilter === 'easy' ? 'selected' : ''}>基础</option><option value="medium" ${aptitudeConfig.difficultyFilter === 'medium' ? 'selected' : ''}>中等</option><option value="hard" ${aptitudeConfig.difficultyFilter === 'hard' ? 'selected' : ''}>进阶</option></select></label>
      </div><div class="notice notice-soft compact-notice"><span>ⓘ</span><p>当前五个新模块的目录和题库为空，可先安排目标；页面会明确显示待接入状态。</p></div>
    </section></div>
    <div class="modal-footer"><button type="button" class="button button-quiet" data-action="close-modal">取消</button><button type="submit" class="button button-primary">${existing ? '保存任务' : '创建任务'}</button></div>
  </form>`);
  syncPlanTaskScienceControls(modalRoot.querySelector('#plan-task-form'));
  syncGeneralKnowledgeTaskControls(modalRoot.querySelector('#plan-task-form'));
  syncAptitudeTaskControls(modalRoot.querySelector('#plan-task-form'));
}

function syncPlanTaskScienceControls(form) {
  if (!form) return;
  const type = form.querySelector('#plan-task-type')?.value;
  const config = form.querySelector('[data-science-config]');
  if (config) config.hidden = type !== 'science_reasoning';
  const generalKnowledgeConfig = form.querySelector('[data-general-knowledge-config]');
  if (generalKnowledgeConfig) generalKnowledgeConfig.hidden = type !== 'general_knowledge';
  const customField = form.querySelector('[data-custom-type-field]');
  if (customField) customField.hidden = type !== 'custom';
  const subjectSelect = form.querySelector('#science-subject');
  const topicSelect = form.querySelector('#science-topic');
  const pointSelect = form.querySelector('#science-point');
  if (subjectSelect && topicSelect && pointSelect) {
    const selectedSubjectId = subjectSelect.value;
    const subject = getScienceTree().find((item) => item.id === selectedSubjectId) || null;
    const oldTopicId = topicSelect.value;
    const topics = subject?.topics || [];
    const selectedTopicId = topics.some((item) => item.id === oldTopicId) ? oldTopicId : '';
    topicSelect.innerHTML = `<option value="" ${!selectedTopicId ? 'selected' : ''}>全部专题</option>${topics.map((item) => `<option value="${item.id}" ${item.id === selectedTopicId ? 'selected' : ''}>${escapeHtml(item.title)}</option>`).join('')}`;
    const topic = topics.find((item) => item.id === selectedTopicId);
    const oldPointId = pointSelect.value;
    const points = topic?.knowledgePoints || (subject ? subject.topics.flatMap((item) => item.knowledgePoints.map((point) => ({ ...point, topicTitle: item.title }))) : []);
    const selectedPointId = points.some((item) => item.id === oldPointId) ? oldPointId : '';
    pointSelect.innerHTML = `<option value="" ${!selectedPointId ? 'selected' : ''}>不限定知识点</option>${points.map((item) => `<option value="${item.id}" ${item.id === selectedPointId ? 'selected' : ''}>${item.topicTitle ? `${escapeHtml(item.topicTitle)} · ` : ''}${escapeHtml(item.title)}${item.contentStatus === 'outline' ? '（提纲）' : ''}</option>`).join('')}`;
  }
  const activity = form.querySelector('#science-activity-type')?.value;
  const questionField = form.querySelector('[data-science-question-field]');
  if (questionField) questionField.hidden = !['practice', 'exam', 'mistakes'].includes(activity);
  const examField = form.querySelector('[data-science-exam-field]');
  if (examField) examField.hidden = activity !== 'exam';
}

function syncGeneralKnowledgeTaskControls(form) {
  if (!form) return;
  const subjectSelect = form.querySelector('#general-knowledge-subject');
  const topicSelect = form.querySelector('#general-knowledge-topic');
  const pointSelect = form.querySelector('#general-knowledge-point');
  if (subjectSelect && topicSelect && pointSelect) {
    const subjects = getGeneralKnowledgeTree();
    const subject = subjects.find((item) => item.id === subjectSelect.value) || null;
    const oldTopicId = topicSelect.value;
    const topics = subject?.topics || subjects.flatMap((item) => item.topics.map((topic) => ({ ...topic, subjectTitle: item.title })));
    const selectedTopicId = topics.some((item) => item.id === oldTopicId) ? oldTopicId : '';
    topicSelect.innerHTML = `<option value="">全部专题</option>${topics.map((item) => `<option value="${item.id}" ${item.id === selectedTopicId ? 'selected' : ''}>${item.subjectTitle ? `${escapeHtml(item.subjectTitle)} · ` : ''}${escapeHtml(item.title)}</option>`).join('')}`;
    const topic = topics.find((item) => item.id === selectedTopicId);
    const allPoints = subject?.topics.flatMap((item) => item.knowledgePoints) || subjects.flatMap((item) => item.topics.flatMap((topicItem) => topicItem.knowledgePoints));
    const points = topic ? topic.knowledgePoints : allPoints;
    const oldPointId = pointSelect.value;
    const selectedPointId = points.some((item) => item.id === oldPointId) ? oldPointId : '';
    pointSelect.innerHTML = `<option value="">不限定知识点</option>${points.map((item) => `<option value="${item.id}" ${item.id === selectedPointId ? 'selected' : ''}>${escapeHtml(item.title)}${item.contentStatus === 'outline' ? '（提纲）' : ''}</option>`).join('')}`;
  }
  const activity = form.querySelector('#general-knowledge-activity-type')?.value;
  const questionField = form.querySelector('[data-general-knowledge-question-field]');
  if (questionField) questionField.hidden = !['practice', 'exam', 'mistakes'].includes(activity);
  const examField = form.querySelector('[data-general-knowledge-exam-field]');
  if (examField) examField.hidden = activity !== 'exam';
}

function syncAptitudeTaskControls(form) {
  if (!form) return;
  const type = form.querySelector('#plan-task-type')?.value;
  const aptitudeConfig = form.querySelector('[data-aptitude-config]');
  if (aptitudeConfig) aptitudeConfig.hidden = !getAptitudeModuleForTaskType(type);
  const activity = form.querySelector('#aptitude-activity-type')?.value;
  const questionField = form.querySelector('[data-aptitude-question-field]');
  if (questionField) questionField.hidden = !['practice', 'exam', 'mistakes'].includes(activity);
  const examField = form.querySelector('[data-aptitude-exam-field]');
  if (examField) examField.hidden = activity !== 'exam';
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
  startScienceExamClock();
  startGeneralKnowledgeExamClock();
  startAptitudeModuleExamClock();
  startAptitudeOverallExamClock();
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

function startScienceExamClock() {
  clearTimeout(scienceExamTimer);
  scienceExamTimer = null;
  if (page !== 'science') return;
  const session = activeScienceSessionId
    ? storage.scienceStudy.sessions.find((item) => item.id === activeScienceSessionId)
    : activeSciencePlanTaskId
      ? storage.scienceStudy.sessions.find((item) => item.planTaskId === activeSciencePlanTaskId && item.status === 'active')
      : storage.scienceStudy.sessions.find((item) => item.status === 'active');
  if (!session || session.mode !== 'exam' || !session.deadline) return;
  const update = async () => {
    const remainingSeconds = Math.max(0, Math.ceil((new Date(session.deadline).valueOf() - Date.now()) / 1000));
    const clock = document.querySelector('#science-exam-countdown');
    if (clock) clock.textContent = `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`;
    if (remainingSeconds <= 0) {
      storage.scienceStudy = expireScienceSession(SCIENCE_QUESTION_BANK, storage.scienceStudy, session.id);
      const expiredSession = storage.scienceStudy.sessions.find((item) => item.id === session.id);
      syncSciencePlanTaskCompletion(expiredSession);
      await persistAndRender('模拟时间到，已保存已答题目');
      return;
    }
    scienceExamTimer = setTimeout(update, 500);
  };
  void update();
}

function startGeneralKnowledgeExamClock() {
  clearTimeout(generalKnowledgeExamTimer);
  generalKnowledgeExamTimer = null;
  if (page !== 'generalKnowledge') return;
  const session = activeGeneralKnowledgeSessionId
    ? storage.generalKnowledgeStudy.sessions.find((item) => item.id === activeGeneralKnowledgeSessionId)
    : activeGeneralKnowledgePlanTaskId
      ? storage.generalKnowledgeStudy.sessions.find((item) => item.planTaskId === activeGeneralKnowledgePlanTaskId && item.status === 'active')
      : storage.generalKnowledgeStudy.sessions.find((item) => item.status === 'active');
  if (!session || session.mode !== 'exam' || session.status !== 'active' || !session.deadline) return;
  const update = async () => {
    const remainingSeconds = Math.max(0, Math.ceil((new Date(session.deadline).valueOf() - Date.now()) / 1000));
    const clock = document.querySelector('#general-knowledge-exam-countdown');
    if (clock) clock.textContent = `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`;
    if (remainingSeconds <= 0) {
      storage.generalKnowledgeStudy = expireGeneralKnowledgeSession(GENERAL_KNOWLEDGE_QUESTION_BANK, storage.generalKnowledgeStudy, session.id);
      const expired = storage.generalKnowledgeStudy.sessions.find((item) => item.id === session.id);
      syncGeneralKnowledgePlanTaskCompletion(expired);
      await persistAndRender('常识判断模拟到时，已保存已选答案');
      return;
    }
    generalKnowledgeExamTimer = setTimeout(update, 500);
  };
  void update();
}

function startAptitudeModuleExamClock() {
  clearTimeout(aptitudeModuleExamTimer);
  aptitudeModuleExamTimer = null;
  if (page !== 'aptitudeModule') return;
  const module = APTITUDE_MODULES.find((item) => item.id === activeAptitudeModuleId && item.studyStore === 'aptitudeModuleStudies');
  if (!module) return;
  const study = storage.aptitudeModuleStudies[module.id];
  const session = activeAptitudeModuleSessionId
    ? study.sessions.find((item) => item.id === activeAptitudeModuleSessionId)
    : activeAptitudeModulePlanTaskId
      ? study.sessions.find((item) => item.planTaskId === activeAptitudeModulePlanTaskId && item.status === 'active')
      : study.sessions.find((item) => item.status === 'active' && item.mode === 'exam');
  if (!session || session.mode !== 'exam' || session.status !== 'active' || !session.deadline) return;
  const update = async () => {
    const remainingSeconds = Math.max(0, Math.ceil((new Date(session.deadline).valueOf() - Date.now()) / 1000));
    const clock = document.querySelector('#aptitude-module-exam-countdown');
    if (clock) clock.textContent = `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`;
    if (remainingSeconds <= 0) {
      storage.aptitudeModuleStudies = finishAptitudeModuleSession(getAptitudeSessionQuestions(module.id, session.questionIds), storage.aptitudeModuleStudies, module.id, session.id, { status: 'timed_out' });
      const expired = storage.aptitudeModuleStudies[module.id].sessions.find((item) => item.id === session.id);
      syncAptitudeModulePlanTaskCompletion(expired);
      await persistAndRender('行测模拟到时，已保存已选答案');
      return;
    }
    aptitudeModuleExamTimer = setTimeout(update, 500);
  };
  void update();
}

function startAptitudeOverallExamClock() {
  clearTimeout(aptitudeOverallExamTimer);
  aptitudeOverallExamTimer = null;
  if (page !== 'aptitude') return;
  const session = activeAptitudeOverallSessionId
    ? storage.aptitudeOverallStudy.sessions.find((item) => item.id === activeAptitudeOverallSessionId)
    : storage.aptitudeOverallStudy.sessions.find((item) => item.status === 'active' && item.mode === 'exam');
  if (!session || session.mode !== 'exam' || session.status !== 'active' || !session.deadline) return;
  const update = async () => {
    const remainingSeconds = Math.max(0, Math.ceil((new Date(session.deadline).valueOf() - Date.now()) / 1000));
    const clock = document.querySelector('#aptitude-overall-exam-countdown');
    if (clock) clock.textContent = `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`;
    if (remainingSeconds <= 0) {
      storage.aptitudeOverallStudy = expireScienceSession(getAptitudeMockQuestionBank(), storage.aptitudeOverallStudy, session.id);
      await persistAndRender('行测整卷模考到时，已保存已选答案');
      return;
    }
    aptitudeOverallExamTimer = setTimeout(update, 500);
  };
  void update();
}

function syncSciencePlanTaskCompletion(session) {
  if (!session?.planTaskId) return false;
  const practiceComplete = session.mode === 'practice' && session.status === 'completed';
  const examComplete = session.mode === 'exam' && ['completed', 'timed_out'].includes(session.status);
  if (!practiceComplete && !examComplete) return false;
  const task = storage.studyPlanTasks.find((item) => item.id === session.planTaskId && item.taskType === 'science_reasoning');
  if (!task) return false;
  const wasComplete = task.status === 'completed' && task.completionSource === 'system_verified';
  storage.studyPlanTasks = reconcileSciencePlanTaskProgress(
    storage.studyPlanTasks, task.id, storage.scienceStudy.sessions, storage.scienceStudy.answers,
  );
  const updated = storage.studyPlanTasks.find((item) => item.id === task.id);
  return !wasComplete && updated?.status === 'completed' && updated.completionSource === 'system_verified';
}

function syncGeneralKnowledgePlanTaskCompletion(session) {
  if (!session?.planTaskId || !['completed', 'timed_out'].includes(session.status)) return false;
  const task = storage.studyPlanTasks.find((item) => item.id === session.planTaskId && item.taskType === 'general_knowledge');
  if (!task) return false;
  const wasComplete = task.status === 'completed' && task.completionSource === 'system_verified';
  storage.studyPlanTasks = reconcileGeneralKnowledgePlanTaskProgress(
    storage.studyPlanTasks, task.id, storage.generalKnowledgeStudy.sessions, storage.generalKnowledgeStudy.answers,
  );
  const updated = storage.studyPlanTasks.find((item) => item.id === task.id);
  return !wasComplete && updated?.status === 'completed' && updated.completionSource === 'system_verified';
}

function syncAptitudeModulePlanTaskCompletion(session) {
  if (!session?.planTaskId || !['completed', 'timed_out'].includes(session.status)) return false;
  const task = storage.studyPlanTasks.find((item) => item.id === session.planTaskId
    && item.aptitudeConfig?.moduleId === session.moduleId);
  if (!task) return false;
  const wasComplete = task.status === 'completed' && task.completionSource === 'system_verified';
  const study = storage.aptitudeModuleStudies[session.moduleId];
  storage.studyPlanTasks = reconcileAptitudeModuleTaskProgress(
    storage.studyPlanTasks, task.id, study.sessions, study.answers,
  );
  const updated = storage.studyPlanTasks.find((item) => item.id === task.id);
  return !wasComplete && updated?.status === 'completed' && updated.completionSource === 'system_verified';
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function navigate(id, query = '', aptitudeModuleId = null) {
  page = pageMeta[id] ? id : 'overview';
  if (page === 'aptitudeModule' && aptitudeModuleId) activeAptitudeModuleId = aptitudeModuleId;
  const querySuffix = ['aptitude', 'science', 'generalKnowledge', 'aptitudeModule'].includes(page) && query ? `?${query}` : '';
  const routePath = page === 'science' ? 'aptitude/science'
    : page === 'generalKnowledge' ? 'aptitude/general-knowledge'
      : page === 'aptitudeModule' ? `aptitude/${activeAptitudeModuleId}` : page;
  const route = `#/${routePath}${querySuffix}`;
  const parsedRoute = readRoute(route);
  activeSciencePlanTaskId = parsedRoute.taskId;
  selectedScienceKnowledgePointId = parsedRoute.knowledgePointId;
  activeScienceSessionId = parsedRoute.sessionId;
  activeAptitudeOverallSessionId = page === 'aptitude' ? parsedRoute.sessionId : null;
  activeGeneralKnowledgePlanTaskId = page === 'generalKnowledge' ? parsedRoute.taskId : null;
  selectedGeneralKnowledgePointId = page === 'generalKnowledge' ? parsedRoute.knowledgePointId : null;
  activeGeneralKnowledgeSessionId = page === 'generalKnowledge' ? parsedRoute.sessionId : null;
  activeAptitudeModulePlanTaskId = page === 'aptitudeModule' ? parsedRoute.taskId : null;
  activeAptitudeModuleSessionId = page === 'aptitudeModule' ? parsedRoute.sessionId : null;
  selectedAptitudeModuleKnowledgePointId = page === 'aptitudeModule' ? parsedRoute.knowledgePointId : null;
  document.querySelector('.sidebar')?.classList.remove('mobile-open');
  document.querySelector('.sidebar-scrim')?.classList.remove('visible');
  pageTransition = true;
  if (location.hash !== route) {
    location.hash = route.slice(1);
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
    const route = nav.getAttribute('href').slice(2);
    const queryStart = route.indexOf('?');
    const query = queryStart < 0 ? '' : route.slice(queryStart + 1);
    const parsedRoute = readRoute(`#/${route}`);
    if (pageMeta[parsedRoute.page]) {
      event.preventDefault();
      navigate(parsedRoute.page, query, parsedRoute.aptitudeModuleId);
      return;
    }
  }
  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) return;
  const { action, code } = actionEl.dataset;
  const positionReference = actionEl.dataset.positionKey || code;
  if (action === 'account-lock') { lockAccount(); return; }
  if (!accountSession) return;
  if (action === 'open-aptitude-overall-random-setup') { openAptitudeOverallRandomMockSetup(); return; }
  if (action === 'open-aptitude-paper-picker') { openAptitudePaperPicker(actionEl.dataset.scope || 'all'); return; }
  if (action === 'start-aptitude-paper') {
    const scopeModuleId = actionEl.dataset.scopeModuleId || null;
    const paper = getCompleteAptitudePapers(scopeModuleId).find((item) => item.id === actionEl.dataset.paperId
      && item.moduleId === scopeModuleId);
    if (!paper) { notify('这套来源卷未通过完整性核验，暂不能开始。'); return; }
    try {
      const created = createScienceSession(paper.questions, storage.aptitudeOverallStudy, {
        mode: 'exam', targetQuestionCount: paper.questionCount,
        durationSeconds: paper.questionCount * 60, preserveOrder: true,
      });
      const session = { ...created.session, mockType: 'full_paper', scopeModuleId, paperId: paper.id, paperTitle: paper.title, sourceUrl: paper.sourceUrl };
      storage.aptitudeOverallStudy = {
        ...created.scienceStudy,
        sessions: created.scienceStudy.sessions.map((item) => item.id === session.id ? session : item),
      };
      modalRoot.innerHTML = '';
      activeAptitudeOverallSessionId = session.id;
      await persist();
      navigate('aptitude', `session=${encodeURIComponent(session.id)}`);
    } catch (error) { notify(error.message); }
    return;
  }
  if (action === 'select-aptitude-overall-answer') {
    try {
      storage.aptitudeOverallStudy = selectExamAnswer(getAptitudeMockQuestionBank(), storage.aptitudeOverallStudy, actionEl.dataset.sessionId, actionEl.dataset.optionId);
      await persistAndRender('选项已保存，可在交卷前修改');
    } catch (error) { notify(error.message); }
    return;
  }
  if (action === 'advance-aptitude-overall-question') {
    try {
      storage.aptitudeOverallStudy = advanceExamQuestion(storage.aptitudeOverallStudy, actionEl.dataset.sessionId);
      await persistAndRender('答题进度已保存');
    } catch (error) { notify(error.message); }
    return;
  }
  if (action === 'go-to-aptitude-overall-question') {
    try {
      storage.aptitudeOverallStudy = goToExamQuestion(storage.aptitudeOverallStudy, actionEl.dataset.sessionId, Number(actionEl.dataset.index));
      await persistAndRender('已返回所选题目');
    } catch (error) { notify(error.message); }
    return;
  }
  if (action === 'finish-aptitude-overall-exam') {
    const session = storage.aptitudeOverallStudy.sessions.find((item) => item.id === actionEl.dataset.sessionId && item.status === 'active');
    if (!session) { notify('这场模考已经结束。'); return; }
    const unanswered = session.questionIds.length - Object.keys(session.draftAnswers || {}).length;
    if (unanswered && !window.confirm(`还有 ${unanswered} 题未作答，仍要交卷吗？`)) return;
    try {
      storage.aptitudeOverallStudy = finishExamSession(getAptitudeMockQuestionBank(), storage.aptitudeOverallStudy, session.id);
      await persistAndRender('交卷完成；逐题解析已保存到模考复盘');
    } catch (error) { notify(error.message); }
    return;
  }
  if (action === 'leave-aptitude-overall-session') { navigate('aptitude'); return; }
  if (action === 'open-matrix-scope') {
    filters.districtId = actionEl.dataset.district || 'all';
    filters.year = actionEl.dataset.year || 'all';
    scenarioYear = filters.year === 'all' ? scenarioYear : filters.year;
    jobPage = 1;
    navigate('positions');
    return;
  }
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
  if (action === 'open-job') openJob(positionReference);
  if (action === 'edit-day') openDayEditor(actionEl.dataset.day);
  if (action === 'edit-plan-day') openPlanEditor(actionEl.dataset.day);
  if (action === 'add-plan-task') openPlanTaskEditor(null, actionEl.dataset.date || todayString());
  if (action === 'edit-plan-task') openPlanTaskEditor(actionEl.dataset.taskId);
  if (action === 'complete-plan-task' || action === 'reopen-plan-task') {
    const status = action === 'complete-plan-task' ? 'completed' : 'not_started';
    try {
      storage.studyPlanTasks = updatePlanTask(storage.studyPlanTasks, actionEl.dataset.taskId, {
        status, completionSource: status === 'completed' ? 'manual' : 'not_completed',
      });
      await persistAndRender(status === 'completed' ? '学习任务已手动标记完成' : '学习任务已重新打开');
    } catch (error) { notify(error.message); }
  }
  if (action === 'archive-plan-task') {
    try {
      storage.studyPlanTasks = archivePlanTask(storage.studyPlanTasks, actionEl.dataset.taskId);
      await persistAndRender('学习任务已归档，关联记录已保留');
    } catch (error) { notify(error.message); }
  }
  if (action === 'open-aptitude-module-practice') {
    openAptitudeModulePracticeSetup({
      moduleId: actionEl.dataset.moduleId || activeAptitudeModuleId,
      pointId: actionEl.dataset.pointId || '',
      mode: actionEl.dataset.mode || 'practice',
    });
  }
  if (action === 'start-aptitude-module-session') {
    const module = APTITUDE_MODULES.find((item) => item.id === actionEl.dataset.moduleId || page === 'aptitudeModule' && item.id === activeAptitudeModuleId);
    if (!module || module.studyStore !== 'aptitudeModuleStudies') { notify('找不到这条行测模块。'); return; }
    const bank = getAptitudeQuestions(module.id);
    const task = actionEl.dataset.taskId
      ? storage.studyPlanTasks.find((item) => item.id === actionEl.dataset.taskId && item.aptitudeConfig?.moduleId === module.id)
      : activeAptitudeModulePlanTaskId
        ? storage.studyPlanTasks.find((item) => item.id === activeAptitudeModulePlanTaskId && item.aptitudeConfig?.moduleId === module.id) : null;
    const config = task?.aptitudeConfig || {};
    if (config.activityType === 'knowledge') {
      const content = getAptitudeModuleContent(module.id);
      const pointId = (config.knowledgePointIds || []).find((id) => findAptitudeModuleKnowledgePoint(content, id)
        && storage.aptitudeModuleStudies[module.id].knowledgeProgress[id]?.status !== 'completed')
        || (config.knowledgePointIds || []).find((id) => findAptitudeModuleKnowledgePoint(content, id));
      if (!pointId) { notify('这项计划任务的知识点目录尚未接入。'); return; }
      storage.studyPlanTasks = markPlanTaskInProgress(storage.studyPlanTasks, task.id);
      await persist();
      activeAptitudeModuleId = module.id;
      navigate('aptitudeModule', `task=${encodeURIComponent(task.id)}&knowledge=${encodeURIComponent(pointId)}`);
      return;
    }
    const mode = task ? config.activityType === 'exam' ? 'exam' : 'practice' : actionEl.dataset.mode === 'exam' ? 'exam' : 'practice';
    const study = storage.aptitudeModuleStudies[module.id];
    const progress = task ? getAptitudeModuleTaskProgress(task, study.sessions, study.answers) : null;
    const targetQuestionCount = task ? progress.remainingCount : Math.min(10, bank.length);
    if (!Number.isInteger(targetQuestionCount) || targetQuestionCount < 1) { notify(bank.length ? '这项计划任务的目标题量已经完成。' : '题库待接入，无法创建空会话。'); return; }
    try {
      const sessionBank = mode === 'exam' ? getAptitudeMockQuestionBank(module.id) : bank;
      const started = createAptitudeModuleSession(sessionBank, storage.aptitudeModuleStudies, module.id, {
        mode,
        planTaskId: task?.id || null,
        subjectId: config.subjectId || undefined,
        topicId: config.topicId || undefined,
        knowledgePointIds: config.knowledgePointIds || undefined,
        targetQuestionCount,
        durationSeconds: mode === 'exam' ? config.durationSeconds || 600 : null,
        sourceFilter: config.sourceFilter || 'all',
        difficultyFilter: config.difficultyFilter || 'all',
        onlyMistakes: task ? config.activityType === 'mistakes' : actionEl.dataset.mode === 'mistakes',
        excludeQuestionIds: progress?.questionIds || [],
        randomize: mode === 'exam',
      });
      storage.aptitudeModuleStudies = started.aptitudeModuleStudies;
      if (task) storage.studyPlanTasks = markPlanTaskInProgress(storage.studyPlanTasks, task.id);
      await persist();
      activeAptitudeModuleId = module.id;
      navigate('aptitudeModule', `${task ? `task=${encodeURIComponent(task.id)}&` : ''}session=${encodeURIComponent(started.session.id)}`);
    } catch (error) { notify(error.message); }
  }
  if (action === 'answer-aptitude-module-question') {
    const moduleId = actionEl.dataset.moduleId;
    const module = APTITUDE_MODULES.find((item) => item.id === moduleId);
    if (!module) { notify('找不到这条行测模块。'); return; }
    try {
      storage.aptitudeModuleStudies = answerAptitudeModuleQuestion(getAptitudeModuleSessionQuestionBank(moduleId, actionEl.dataset.sessionId), storage.aptitudeModuleStudies, moduleId, actionEl.dataset.sessionId, actionEl.dataset.optionId);
      await persistAndRender('答案已加密保存');
    } catch (error) { notify(error.message); }
  }
  if (action === 'continue-aptitude-module-session' || action === 'advance-aptitude-module-question') {
    const moduleId = actionEl.dataset.moduleId;
    const module = APTITUDE_MODULES.find((item) => item.id === moduleId);
    if (!module) { notify('找不到这条行测模块。'); return; }
    try {
      storage.aptitudeModuleStudies = continueAptitudeModuleSession(getAptitudeModuleSessionQuestionBank(moduleId, actionEl.dataset.sessionId), storage.aptitudeModuleStudies, moduleId, actionEl.dataset.sessionId);
      const session = storage.aptitudeModuleStudies[moduleId].sessions.find((item) => item.id === actionEl.dataset.sessionId);
      const complete = syncAptitudeModulePlanTaskCompletion(session);
      await persistAndRender(session?.status === 'completed' ? complete ? '训练完成；学习计划已核验完成' : '训练完成；计划目标尚未满足' : '已保存答题进度');
    } catch (error) { notify(error.message); }
  }
  if (action === 'select-aptitude-module-answer') {
    const moduleId = actionEl.dataset.moduleId;
    const module = APTITUDE_MODULES.find((item) => item.id === moduleId);
    if (!module) { notify('找不到这条行测模块。'); return; }
    try {
      storage.aptitudeModuleStudies = selectAptitudeModuleAnswer(getAptitudeModuleSessionQuestionBank(moduleId, actionEl.dataset.sessionId), storage.aptitudeModuleStudies, moduleId, actionEl.dataset.sessionId, actionEl.dataset.optionId);
      await persistAndRender('选项已保存，可在交卷前修改');
    } catch (error) { notify(error.message); }
  }
  if (action === 'go-to-aptitude-module-question') {
    const moduleId = actionEl.dataset.moduleId;
    try {
      storage.aptitudeModuleStudies = goToAptitudeModuleQuestion(storage.aptitudeModuleStudies, moduleId, actionEl.dataset.sessionId, Number(actionEl.dataset.index));
      await persistAndRender('已返回所选题目');
    } catch (error) { notify(error.message); }
  }
  if (action === 'finish-aptitude-module-exam') {
    const moduleId = actionEl.dataset.moduleId;
    const module = APTITUDE_MODULES.find((item) => item.id === moduleId);
    const study = storage.aptitudeModuleStudies[moduleId];
    const active = study?.sessions.find((item) => item.id === actionEl.dataset.sessionId && item.status === 'active');
    if (!module || !active) { notify('这场行测模拟已经结束。'); return; }
    const unanswered = active.questionIds.length - Object.keys(active.draftAnswers || {}).length;
    if (unanswered && !window.confirm(`还有 ${unanswered} 题未作答，仍要交卷吗？`)) return;
    try {
      storage.aptitudeModuleStudies = finishAptitudeModuleSession(getAptitudeModuleSessionQuestionBank(moduleId, active.id), storage.aptitudeModuleStudies, moduleId, active.id);
      const finished = storage.aptitudeModuleStudies[moduleId].sessions.find((item) => item.id === active.id);
      const complete = syncAptitudeModulePlanTaskCompletion(finished);
      await persistAndRender(complete ? '交卷完成；学习计划已核验完成' : '交卷完成；未答题不计入计划完成量');
    } catch (error) { notify(error.message); }
  }
  if (action === 'toggle-aptitude-module-favorite') {
    const moduleId = actionEl.dataset.moduleId;
    storage.aptitudeModuleStudies = toggleAptitudeModuleFavorite(storage.aptitudeModuleStudies, moduleId, actionEl.dataset.questionId);
    const enabled = storage.aptitudeModuleStudies[moduleId].favorites.includes(actionEl.dataset.questionId);
    await persistAndRender(enabled ? '题目已收藏' : '已取消收藏');
  }
  if (action === 'start-aptitude-module-knowledge') {
    const moduleId = actionEl.dataset.moduleId;
    const content = getAptitudeModuleContent(moduleId);
    const entry = findAptitudeModuleKnowledgePoint(content, actionEl.dataset.pointId);
    if (!entry || !aptitudeModuleLessonIsPublished(entry)) { notify('该知识点讲解尚未发布，不能记录学习。'); return; }
    storage.aptitudeModuleStudies = setAptitudeModulePointStatus(storage.aptitudeModuleStudies, moduleId, entry.point.id, 'learning');
    await persistAndRender('已记录正在学习');
  }
  if (action === 'complete-aptitude-module-knowledge') {
    const moduleId = actionEl.dataset.moduleId;
    const content = getAptitudeModuleContent(moduleId);
    const entry = findAptitudeModuleKnowledgePoint(content, actionEl.dataset.pointId);
    if (!entry || !aptitudeModuleLessonIsPublished(entry)) { notify('该知识点讲解尚未发布，不能标记为学完。'); return; }
    const task = activeAptitudeModulePlanTaskId
      ? storage.studyPlanTasks.find((item) => item.id === activeAptitudeModulePlanTaskId && item.aptitudeConfig?.moduleId === moduleId) : null;
    if (task?.aptitudeConfig?.activityType === 'knowledge'
      && !task.aptitudeConfig.knowledgePointIds.includes(entry.point.id)) {
      notify('这个知识点不属于当前计划任务。'); return;
    }
    if (storage.aptitudeModuleStudies[moduleId].knowledgeProgress[entry.point.id]?.status === 'completed') return;
    const now = new Date().toISOString();
    try {
      const result = createAptitudeModuleSession([], storage.aptitudeModuleStudies, moduleId, {
        mode: 'knowledge', knowledgePointId: entry.point.id, subjectId: entry.subject.id, topicId: entry.topic.id,
        planTaskId: task?.id || null,
      }, { now });
      storage.aptitudeModuleStudies = result.aptitudeModuleStudies;
      const completed = syncAptitudeModulePlanTaskCompletion(result.session);
      await persistAndRender(completed ? '知识点已学完；学习计划已核验完成' : '知识点学习记录已保存');
    } catch (error) { notify(error.message); }
  }
  if (action === 'toggle-aptitude-module-point-favorite' || action === 'toggle-aptitude-module-point-unclear') {
    const moduleId = actionEl.dataset.moduleId;
    const flag = action === 'toggle-aptitude-module-point-favorite' ? 'favorite' : 'unclear';
    storage.aptitudeModuleStudies = toggleAptitudeModulePointFlag(storage.aptitudeModuleStudies, moduleId, actionEl.dataset.pointId, flag);
    const stateKey = flag === 'favorite' ? 'favoriteKnowledgePointIds' : 'unclearKnowledgePointIds';
    const enabled = storage.aptitudeModuleStudies[moduleId][stateKey].includes(actionEl.dataset.pointId);
    await persistAndRender(flag === 'favorite' ? enabled ? '知识点已收藏' : '已取消收藏' : enabled ? '已标记为不理解' : '已取消不理解标记');
  }
  if (action === 'next-aptitude-module-task-point') {
    const moduleId = activeAptitudeModuleId;
    const task = storage.studyPlanTasks.find((item) => item.id === actionEl.dataset.taskId
      && item.aptitudeConfig?.moduleId === moduleId && item.aptitudeConfig.activityType === 'knowledge');
    const content = getAptitudeModuleContent(moduleId);
    const entry = findAptitudeModuleKnowledgePoint(content, actionEl.dataset.pointId);
    if (!task || !entry || !task.aptitudeConfig.knowledgePointIds.includes(entry.point.id)) { notify('找不到这条计划知识点。'); return; }
    navigate('aptitudeModule', `task=${encodeURIComponent(task.id)}&knowledge=${encodeURIComponent(entry.point.id)}`);
  }
  if (action === 'leave-aptitude-module-session') navigate('aptitudeModule');
  if (action === 'open-general-knowledge-practice') openGeneralKnowledgePracticeSetup({ pointId: actionEl.dataset.pointId || '', mode: actionEl.dataset.mode || 'practice' });
  if (action === 'start-general-knowledge-task') {
    const task = storage.studyPlanTasks.find((item) => item.id === actionEl.dataset.taskId && item.taskType === 'general_knowledge');
    if (!task) { notify('找不到这条常识判断任务。'); return; }
    const config = task.generalKnowledgeConfig;
    if (config.activityType === 'knowledge') {
      const pointId = config.knowledgePointIds.find((id) => storage.generalKnowledgeStudy.knowledgeProgress[id]?.status !== 'completed')
        || config.knowledgePointIds[0];
      if (!pointId) { notify('这项计划任务没有待学知识点。'); return; }
      storage.studyPlanTasks = markPlanTaskInProgress(storage.studyPlanTasks, task.id);
      await persist();
      navigate('generalKnowledge', `task=${encodeURIComponent(task.id)}&knowledge=${encodeURIComponent(pointId)}`);
    } else {
      const progress = getGeneralKnowledgeTaskProgress(task, storage.generalKnowledgeStudy.sessions, storage.generalKnowledgeStudy.answers);
      const targetQuestionCount = progress.targetCount === null ? config.targetQuestionCount : progress.remainingCount;
      if (!Number.isInteger(targetQuestionCount) || targetQuestionCount < 1) { notify('这项计划任务的目标题量已经完成。'); return; }
      try {
        const examMode = config.activityType === 'exam';
        const eligibleIds = new Set(getAptitudeMockQuestionBank('general-knowledge').map((question) => question.id));
        const questionBank = examMode
          ? GENERAL_KNOWLEDGE_QUESTION_BANK.filter((question) => eligibleIds.has(question.id))
          : GENERAL_KNOWLEDGE_QUESTION_BANK;
        const started = createGeneralKnowledgeSession(questionBank, storage.generalKnowledgeStudy, {
          mode: examMode ? 'exam' : 'practice', planTaskId: task.id,
          subjectId: config.subjectId, topicId: config.topicId, knowledgePointIds: config.knowledgePointIds,
          targetQuestionCount, durationSeconds: config.durationSeconds || 600,
          sourceFilter: config.sourceFilter, difficultyFilter: config.difficultyFilter,
          onlyMistakes: config.activityType === 'mistakes', excludeQuestionIds: progress.questionIds, randomize: examMode,
        });
        storage.generalKnowledgeStudy = started.generalKnowledgeStudy;
        storage.studyPlanTasks = markPlanTaskInProgress(storage.studyPlanTasks, task.id);
        await persist();
        navigate('generalKnowledge', `task=${encodeURIComponent(task.id)}&session=${encodeURIComponent(started.session.id)}`);
      } catch (error) { notify(error.message); }
    }
  }
  if (action === 'answer-general-knowledge-question') {
    try {
      storage.generalKnowledgeStudy = answerGeneralKnowledgeQuestion(GENERAL_KNOWLEDGE_QUESTION_BANK, storage.generalKnowledgeStudy, actionEl.dataset.sessionId, actionEl.dataset.optionId);
      await persistAndRender('答案已加密保存');
    } catch (error) {
      const session = storage.generalKnowledgeStudy.sessions.find((item) => item.id === actionEl.dataset.sessionId);
      if (session?.deadline && Date.now() >= new Date(session.deadline).valueOf()) {
        storage.generalKnowledgeStudy = expireGeneralKnowledgeSession(GENERAL_KNOWLEDGE_QUESTION_BANK, storage.generalKnowledgeStudy, session.id);
        syncGeneralKnowledgePlanTaskCompletion(storage.generalKnowledgeStudy.sessions.find((item) => item.id === session.id));
        await persistAndRender('常识判断模拟到时，已停止接收答案');
      } else notify(error.message);
    }
  }
  if (action === 'continue-general-knowledge-session') {
    try {
      storage.generalKnowledgeStudy = continueGeneralKnowledgeSession(GENERAL_KNOWLEDGE_QUESTION_BANK, storage.generalKnowledgeStudy, actionEl.dataset.sessionId);
      const session = storage.generalKnowledgeStudy.sessions.find((item) => item.id === actionEl.dataset.sessionId);
      const complete = syncGeneralKnowledgePlanTaskCompletion(session);
      await persistAndRender(session?.status === 'completed' ? complete ? '训练完成；学习计划已核验完成' : '训练完成；计划题量尚未满足' : '已进入下一题');
    } catch (error) { notify(error.message); }
  }
  if (action === 'select-general-knowledge-answer') {
    try {
      storage.generalKnowledgeStudy = selectGeneralKnowledgeAnswer(GENERAL_KNOWLEDGE_QUESTION_BANK, storage.generalKnowledgeStudy, actionEl.dataset.sessionId, actionEl.dataset.optionId);
      await persistAndRender('选项已保存，可在交卷前修改');
    } catch (error) {
      const session = storage.generalKnowledgeStudy.sessions.find((item) => item.id === actionEl.dataset.sessionId);
      if (session?.deadline && Date.now() >= new Date(session.deadline).valueOf()) {
        storage.generalKnowledgeStudy = expireGeneralKnowledgeSession(GENERAL_KNOWLEDGE_QUESTION_BANK, storage.generalKnowledgeStudy, session.id);
        syncGeneralKnowledgePlanTaskCompletion(storage.generalKnowledgeStudy.sessions.find((item) => item.id === session.id));
        await persistAndRender('常识判断模拟到时，已保存已选答案');
      } else notify(error.message);
    }
  }
  if (action === 'advance-general-knowledge-question') {
    try {
      storage.generalKnowledgeStudy = advanceGeneralKnowledgeQuestion(storage.generalKnowledgeStudy, actionEl.dataset.sessionId);
      await persistAndRender('已保存答题进度');
    } catch (error) { notify(error.message); }
  }
  if (action === 'go-to-general-knowledge-question') {
    try {
      storage.generalKnowledgeStudy = goToGeneralKnowledgeQuestion(storage.generalKnowledgeStudy, actionEl.dataset.sessionId, Number(actionEl.dataset.index));
      await persistAndRender('已返回所选题目');
    } catch (error) { notify(error.message); }
  }
  if (action === 'finish-general-knowledge-exam') {
    const active = storage.generalKnowledgeStudy.sessions.find((item) => item.id === actionEl.dataset.sessionId && item.status === 'active');
    if (!active) { notify('这场常识判断模拟已经结束。'); return; }
    const unanswered = active.questionIds.length - Object.keys(active.draftAnswers || {}).length;
    if (unanswered && !window.confirm(`还有 ${unanswered} 题未作答，仍要交卷吗？`)) return;
    try {
      storage.generalKnowledgeStudy = finishGeneralKnowledgeSession(GENERAL_KNOWLEDGE_QUESTION_BANK, storage.generalKnowledgeStudy, active.id);
      const finished = storage.generalKnowledgeStudy.sessions.find((item) => item.id === active.id);
      const complete = syncGeneralKnowledgePlanTaskCompletion(finished);
      await persistAndRender(complete ? '交卷完成；学习计划已核验完成' : '交卷完成；未答题不计入计划完成量');
    } catch (error) { notify(error.message); }
  }
  if (action === 'toggle-general-knowledge-favorite') {
    storage.generalKnowledgeStudy = toggleGeneralKnowledgeFavorite(storage.generalKnowledgeStudy, actionEl.dataset.questionId);
    await persistAndRender(storage.generalKnowledgeStudy.favorites.includes(actionEl.dataset.questionId) ? '题目已收藏' : '已取消收藏');
  }
  if (action === 'start-general-knowledge-knowledge') {
    const pointId = actionEl.dataset.pointId;
    if (!GENERAL_KNOWLEDGE_LESSONS[pointId]) { notify('该知识点讲解尚未发布，不能记录完成。'); return; }
    storage.generalKnowledgeStudy = setGeneralKnowledgePointStatus(storage.generalKnowledgeStudy, pointId, 'learning');
    await persistAndRender('已记录正在学习');
  }
  if (action === 'next-general-knowledge-task-point') {
    const task = storage.studyPlanTasks.find((item) => item.id === actionEl.dataset.taskId && item.taskType === 'general_knowledge');
    const point = task?.generalKnowledgeConfig?.knowledgePointIds.includes(actionEl.dataset.pointId)
      ? getGeneralKnowledgePoint(actionEl.dataset.pointId) : null;
    if (!task || !point) { notify('找不到这条计划知识点。'); return; }
    navigate('generalKnowledge', `task=${encodeURIComponent(task.id)}&knowledge=${encodeURIComponent(point.id)}`);
  }
  if (action === 'toggle-general-knowledge-point-favorite' || action === 'toggle-general-knowledge-point-unclear') {
    const flag = action === 'toggle-general-knowledge-point-favorite' ? 'favorite' : 'unclear';
    storage.generalKnowledgeStudy = toggleGeneralKnowledgePointFlag(storage.generalKnowledgeStudy, actionEl.dataset.pointId, flag);
    const enabled = storage.generalKnowledgeStudy[flag === 'favorite' ? 'favoriteKnowledgePointIds' : 'unclearKnowledgePointIds'].includes(actionEl.dataset.pointId);
    await persistAndRender(flag === 'favorite' ? enabled ? '知识点已收藏' : '已取消收藏' : enabled ? '已标记为不理解' : '已取消不理解标记');
  }
  if (action === 'complete-general-knowledge-knowledge') {
    const pointId = actionEl.dataset.pointId;
    if (!GENERAL_KNOWLEDGE_LESSONS[pointId]) { notify('该知识点讲解尚未发布，不能标记为学完。'); return; }
    const completedAt = new Date().toISOString();
    const wasComplete = storage.generalKnowledgeStudy.knowledgeProgress[pointId]?.status === 'completed';
    if (!wasComplete) {
      const point = getGeneralKnowledgePoint(pointId);
      const session = { id: `gk_knowledge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`, moduleId: 'general_knowledge', mode: 'knowledge', status: 'completed', planTaskId: activeGeneralKnowledgePlanTaskId, knowledgePointId: pointId, filters: { subjectId: point?.subjectId || null, topicId: point?.topicId || null }, completionSource: 'manual', startedAt: completedAt, completedAt };
      storage.generalKnowledgeStudy = setGeneralKnowledgePointStatus(storage.generalKnowledgeStudy, pointId, 'completed', completedAt);
      storage.generalKnowledgeStudy.sessions = [...storage.generalKnowledgeStudy.sessions, session];
      syncGeneralKnowledgePlanTaskCompletion(session);
      await persistAndRender('知识点学习记录已保存');
    }
  }
  if (action === 'reveal-general-knowledge-flashcard') {
    revealedGeneralKnowledgeFlashcardId = actionEl.dataset.pointId;
    render();
  }
  if (action === 'review-general-knowledge-flashcard') {
    storage.generalKnowledgeStudy = reviewFlashcard(storage.generalKnowledgeStudy, actionEl.dataset.pointId, actionEl.dataset.rating);
    revealedGeneralKnowledgeFlashcardId = null;
    await persistAndRender('闪卡复习进度已保存');
  }
  if (action === 'leave-general-knowledge-session') navigate('generalKnowledge');
  if (action === 'open-science-practice') openSciencePracticeSetup({ pointId: actionEl.dataset.pointId || '', mode: actionEl.dataset.mode || 'practice' });
  if (action === 'start-science-task') {
    const task = storage.studyPlanTasks.find((item) => item.id === actionEl.dataset.taskId && item.taskType === 'science_reasoning');
    if (!task) { notify('找不到这条科学推理任务。'); return; }
    const config = task.scienceConfig;
    const progress = getPlanTaskProgress(task, storage.scienceStudy.sessions, storage.scienceStudy.answers);
    const targetQuestionCount = progress.targetCount === null ? config.targetQuestionCount : progress.remainingCount;
    if (!Number.isInteger(targetQuestionCount) || targetQuestionCount < 1) { notify('这项计划任务的题量目标已完成。'); return; }
    try {
      const verifiedBank = config.activityType === 'exam'
        ? (() => { const eligibleIds = new Set(getAptitudeMockQuestionBank('science').map((question) => question.id)); return SCIENCE_QUESTION_BANK.filter((question) => eligibleIds.has(question.id)); })()
        : SCIENCE_QUESTION_BANK;
      const started = createScienceSession(verifiedBank, storage.scienceStudy, {
        mode: config.activityType === 'exam' ? 'exam' : 'practice',
        planTaskId: task.id,
        subjectId: config.subjectId,
        topicId: config.topicId,
        knowledgePointIds: config.knowledgePointIds,
        targetQuestionCount,
        durationSeconds: config.durationSeconds || 600,
        sourceFilter: config.sourceFilter,
        difficultyFilter: config.difficultyFilter,
        onlyMistakes: config.activityType === 'mistakes',
        excludeQuestionIds: progress.questionIds,
        randomize: config.activityType === 'exam',
      });
      storage.scienceStudy = started.scienceStudy;
      storage.studyPlanTasks = markPlanTaskInProgress(storage.studyPlanTasks, task.id);
      await persist();
      navigate('science', `task=${encodeURIComponent(task.id)}`);
    } catch (error) { notify(error.message); }
  }
  if (action === 'answer-science-question') {
    try {
      const result = answerScienceQuestion(SCIENCE_QUESTION_BANK, storage.scienceStudy, actionEl.dataset.sessionId, actionEl.dataset.optionId);
      storage.scienceStudy = result.scienceStudy;
      await persistAndRender('答案已加密保存');
    } catch (error) {
      const session = storage.scienceStudy.sessions.find((item) => item.id === actionEl.dataset.sessionId);
      if (session?.deadline && Date.now() >= new Date(session.deadline).valueOf()) {
        storage.scienceStudy = expireScienceSession(SCIENCE_QUESTION_BANK, storage.scienceStudy, session.id);
        syncSciencePlanTaskCompletion(storage.scienceStudy.sessions.find((item) => item.id === session.id));
        await persistAndRender('模拟时间到，已停止接收答案');
      } else notify(error.message);
    }
  }
  if (action === 'continue-science-session') {
    try {
      storage.scienceStudy = continueScienceSession(SCIENCE_QUESTION_BANK, storage.scienceStudy, actionEl.dataset.sessionId);
      const session = storage.scienceStudy.sessions.find((item) => item.id === actionEl.dataset.sessionId);
      const taskCompleted = syncSciencePlanTaskCompletion(session);
      await persistAndRender(session?.status === 'completed' ? taskCompleted ? '训练完成；计划任务已按实际答题量核验' : '训练完成；计划目标尚未满足' : '已进入下一题');
    } catch (error) { notify(error.message); }
  }
  if (action === 'select-exam-answer') {
    try {
      storage.scienceStudy = selectExamAnswer(SCIENCE_QUESTION_BANK, storage.scienceStudy, actionEl.dataset.sessionId, actionEl.dataset.optionId);
      await persistAndRender('选项已保存，可在交卷前修改');
    } catch (error) {
      const session = storage.scienceStudy.sessions.find((item) => item.id === actionEl.dataset.sessionId);
      if (session?.deadline && Date.now() >= new Date(session.deadline).valueOf()) {
        storage.scienceStudy = expireScienceSession(SCIENCE_QUESTION_BANK, storage.scienceStudy, session.id);
        syncSciencePlanTaskCompletion(storage.scienceStudy.sessions.find((item) => item.id === session.id));
        await persistAndRender('模拟时间到，已保存已选答案');
      } else notify(error.message);
    }
  }
  if (action === 'advance-exam-question') {
    try {
      storage.scienceStudy = advanceExamQuestion(storage.scienceStudy, actionEl.dataset.sessionId);
      await persistAndRender('已保存答题进度');
    } catch (error) { notify(error.message); }
  }
  if (action === 'go-to-exam-question') {
    try {
      storage.scienceStudy = goToExamQuestion(storage.scienceStudy, actionEl.dataset.sessionId, Number(actionEl.dataset.index));
      await persistAndRender('已返回所选题目');
    } catch (error) { notify(error.message); }
  }
  if (action === 'finish-science-exam') {
    const active = storage.scienceStudy.sessions.find((item) => item.id === actionEl.dataset.sessionId && item.status === 'active');
    if (!active) { notify('这场模拟已经结束。'); return; }
    const unanswered = active.questionIds.length - Object.keys(active.draftAnswers || {}).length;
    if (unanswered && !window.confirm(`还有 ${unanswered} 题未作答，仍要交卷吗？`)) return;
    try {
      storage.scienceStudy = finishExamSession(SCIENCE_QUESTION_BANK, storage.scienceStudy, active.id);
      const finished = storage.scienceStudy.sessions.find((item) => item.id === active.id);
      const taskCompleted = syncSciencePlanTaskCompletion(finished);
      await persistAndRender(taskCompleted ? '交卷完成；计划任务已按全部作答核验' : '交卷完成；未作答题不计入计划任务完成量');
    } catch (error) { notify(error.message); }
  }
  if (action === 'toggle-science-favorite') {
    storage.scienceStudy = toggleScienceFavorite(storage.scienceStudy, actionEl.dataset.questionId);
    await persistAndRender(storage.scienceStudy.favorites.includes(actionEl.dataset.questionId) ? '题目已收藏' : '已取消收藏');
  }
  if (action === 'start-science-knowledge') {
    const pointId = actionEl.dataset.pointId;
    const point = getKnowledgePoint(pointId);
    if (!point?.content) { notify('该知识点讲义尚未发布，暂不能记录学习。'); return; }
    if (storage.scienceStudy.knowledgeProgress[pointId]?.status === 'completed') return;
    storage.scienceStudy = setKnowledgePointStatus(storage.scienceStudy, pointId, 'learning');
    await persistAndRender('已记录正在学习');
  }
  if (action === 'toggle-science-knowledge-favorite' || action === 'toggle-science-knowledge-unclear') {
    const pointId = actionEl.dataset.pointId;
    const flag = action === 'toggle-science-knowledge-favorite' ? 'favorite' : 'unclear';
    storage.scienceStudy = toggleKnowledgePointFlag(storage.scienceStudy, pointId, flag);
    const enabled = storage.scienceStudy[flag === 'favorite' ? 'favoriteKnowledgePointIds' : 'unclearKnowledgePointIds'].includes(pointId);
    const message = flag === 'favorite'
      ? enabled ? '知识点已收藏' : '已取消收藏'
      : enabled ? '已标记为不理解' : '已取消不理解标记';
    await persistAndRender(message);
  }
  if (action === 'complete-science-knowledge') {
    const pointId = actionEl.dataset.pointId;
    const point = getKnowledgePoint(pointId);
    if (!point?.content) { notify('该知识点讲义尚未发布，暂不能标记为学完。'); return; }
    const completedAt = new Date().toISOString();
    const wasComplete = storage.scienceStudy.knowledgeProgress[pointId]?.status === 'completed';
    if (!wasComplete) {
      const sessionId = `knowledge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      storage.scienceStudy = setKnowledgePointStatus(storage.scienceStudy, pointId, 'completed', completedAt);
      storage.scienceStudy.sessions = [...storage.scienceStudy.sessions, { id: sessionId, mode: 'knowledge', status: 'completed', planTaskId: routeTaskIdForScience(), knowledgePointId: pointId, completionSource: 'manual', startedAt: completedAt, completedAt }];
      const linkedTask = storage.studyPlanTasks.find((task) => task.id === routeTaskIdForScience() && task.taskType === 'science_reasoning');
      if (linkedTask?.scienceConfig.activityType === 'knowledge') {
        const allDone = linkedTask.scienceConfig.knowledgePointIds.every((id) => storage.scienceStudy.knowledgeProgress[id]?.status === 'completed');
        if (allDone) storage.studyPlanTasks = updatePlanTask(storage.studyPlanTasks, linkedTask.id, {
          status: 'completed', completionSource: 'manual',
        });
      }
      await persistAndRender('知识点学习记录已保存');
    }
  }
  if (action === 'leave-science-session') navigate('science');
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
    const position = findPositionByReference(dataset.positions, positionReference);
    if (!position) return;
    const positionKey = positionIdentity(position);
    const isFavorite = hasPositionReference(storage.favorites, position, dataset.positions);
    const isLegacyReference = (item) => item === position.code && findPositionByReference(dataset.positions, item) === position;
    storage.favorites = isFavorite
      ? storage.favorites.filter((item) => item !== positionKey && !isLegacyReference(item))
      : [...storage.favorites, positionKey];
    await persistAndRender(isFavorite ? '已取消收藏' : '已加入收藏');
  }
  if (action === 'compare') {
    const position = findPositionByReference(dataset.positions, positionReference);
    if (!position) return;
    const positionKey = positionIdentity(position);
    if (hasPositionReference(storage.compared, position, dataset.positions)) notify('该岗位已在比较清单中');
    else if (storage.compared.length >= 5) notify('最多同时比较 5 个岗位');
    else { storage.compared.push(positionKey); await persistAndRender('已加入岗位比较'); }
  }
  if (action === 'remove-compare') {
    const position = findPositionByReference(dataset.positions, positionReference);
    const positionKey = position ? positionIdentity(position) : positionReference;
    const isLegacyReference = (item) => position && item === position.code && findPositionByReference(dataset.positions, item) === position;
    storage.compared = storage.compared.filter((item) => item !== positionKey && !isLegacyReference(item));
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
  if (form.id === 'plan-task-form') {
    const existing = form.dataset.taskId
      ? storage.studyPlanTasks.find((task) => task.id === form.dataset.taskId)
      : null;
    const scienceConfig = values.taskType === 'science_reasoning' ? {
      activityType: values.activityType || 'free',
      subjectId: values.scienceSubjectId || null,
      topicId: values.scienceTopicId || null,
      knowledgePointIds: values.scienceKnowledgePointId ? [values.scienceKnowledgePointId] : [],
      targetQuestionCount: values.targetQuestionCount === '' ? null : Number(values.targetQuestionCount),
      durationSeconds: values.durationMinutes === '' ? null : Number(values.durationMinutes) * 60,
      sourceFilter: values.sourceFilter || 'all',
      difficultyFilter: values.difficultyFilter || 'all',
    } : null;
    const generalKnowledgeConfig = values.taskType === 'general_knowledge' ? {
      activityType: values.generalKnowledgeActivityType || 'free',
      subjectId: values.generalKnowledgeSubjectId || null,
      topicId: values.generalKnowledgeTopicId || null,
      knowledgePointIds: values.generalKnowledgePointId ? [values.generalKnowledgePointId] : [],
      targetQuestionCount: values.generalKnowledgeTargetQuestionCount === '' ? null : Number(values.generalKnowledgeTargetQuestionCount),
      durationSeconds: values.generalKnowledgeDurationMinutes === '' ? null : Number(values.generalKnowledgeDurationMinutes) * 60,
      sourceFilter: values.generalKnowledgeSourceFilter || 'all',
      difficultyFilter: values.generalKnowledgeDifficultyFilter || 'all',
    } : null;
    const aptitudeModule = getAptitudeModuleForTaskType(values.taskType);
    const aptitudeConfig = aptitudeModule ? {
      moduleId: aptitudeModule.id,
      activityType: values.aptitudeActivityType || 'free',
      subjectId: values.aptitudeSubjectId || null,
      topicId: values.aptitudeTopicId || null,
      knowledgePointIds: (values.aptitudeKnowledgePointIds || '').split(',').map((id) => id.trim()).filter(Boolean),
      targetQuestionCount: values.aptitudeTargetQuestionCount === '' ? null : Number(values.aptitudeTargetQuestionCount),
      durationSeconds: values.aptitudeDurationMinutes === '' ? null : Number(values.aptitudeDurationMinutes) * 60,
      sourceFilter: values.aptitudeSourceFilter || 'all',
      difficultyFilter: values.aptitudeDifficultyFilter || 'all',
    } : null;
    const input = {
      date: values.date,
      taskType: values.taskType,
      customTypeName: values.customTypeName || '',
      title: values.title,
      description: values.description || '',
      estimatedMinutes: values.estimatedMinutes === '' ? null : Number(values.estimatedMinutes),
      priority: values.priority,
      status: values.status,
      completionSource: existing && existing.status === 'completed' && values.status === 'completed'
        ? existing.completionSource : values.status === 'completed' ? 'manual' : 'not_completed',
      scienceConfig,
      generalKnowledgeConfig,
      aptitudeConfig,
    };
    try {
      if (existing) {
        const scienceConfigChanged = values.taskType === 'science_reasoning'
          && (existing.taskType !== 'science_reasoning' || JSON.stringify(existing.scienceConfig) !== JSON.stringify(input.scienceConfig));
        storage.studyPlanTasks = updatePlanTask(storage.studyPlanTasks, existing.id, input);
        if (scienceConfigChanged) {
          storage.studyPlanTasks = reconcileSciencePlanTaskProgress(
            storage.studyPlanTasks, existing.id, storage.scienceStudy.sessions, storage.scienceStudy.answers,
          );
        }
        const generalKnowledgeConfigChanged = values.taskType === 'general_knowledge'
          && (existing.taskType !== 'general_knowledge' || JSON.stringify(existing.generalKnowledgeConfig) !== JSON.stringify(input.generalKnowledgeConfig));
        if (generalKnowledgeConfigChanged) {
          storage.studyPlanTasks = reconcileGeneralKnowledgePlanTaskProgress(
            storage.studyPlanTasks, existing.id, storage.generalKnowledgeStudy.sessions, storage.generalKnowledgeStudy.answers,
          );
        }
        const aptitudeConfigChanged = Boolean(aptitudeModule)
          && (existing.taskType !== values.taskType || JSON.stringify(existing.aptitudeConfig) !== JSON.stringify(input.aptitudeConfig));
        if (aptitudeConfigChanged) {
          const study = storage.aptitudeModuleStudies[aptitudeModule.id];
          storage.studyPlanTasks = reconcileAptitudeModuleTaskProgress(
            storage.studyPlanTasks, existing.id, study.sessions, study.answers,
          );
        }
      } else storage.studyPlanTasks = [...storage.studyPlanTasks, createPlanTask(input)];
      await persistAndRender(existing ? '学习任务已更新并加密保存' : '学习任务已创建并加密保存');
      modalRoot.innerHTML = '';
    } catch (error) {
      notify(error.message);
    }
  }
  if (form.id === 'aptitude-overall-random-setup') {
    const bank = getAptitudeMockQuestionBank();
    try {
      const created = createScienceSession(bank, storage.aptitudeOverallStudy, {
        mode: 'exam', targetQuestionCount: Number(values.targetQuestionCount),
        durationSeconds: Number(values.durationMinutes) * 60, randomize: true,
      });
      const session = { ...created.session, mockType: 'random', scopeModuleId: null, paperTitle: '行测跨模块随机卷' };
      storage.aptitudeOverallStudy = {
        ...created.scienceStudy,
        sessions: created.scienceStudy.sessions.map((item) => item.id === session.id ? session : item),
      };
      modalRoot.innerHTML = '';
      activeAptitudeOverallSessionId = session.id;
      await persist();
      navigate('aptitude', `session=${encodeURIComponent(session.id)}`);
    } catch (error) { notify(error.message); }
  }
  if (form.id === 'general-knowledge-session-setup') {
    const questionCount = Number(values.targetQuestionCount);
    const mode = values.mode === 'exam' ? 'exam' : 'practice';
    const eligibleIds = new Set(getAptitudeMockQuestionBank('general-knowledge').map((question) => question.id));
    const questionBank = mode === 'exam'
      ? GENERAL_KNOWLEDGE_QUESTION_BANK.filter((question) => eligibleIds.has(question.id))
      : GENERAL_KNOWLEDGE_QUESTION_BANK;
    try {
      const started = createGeneralKnowledgeSession(questionBank, storage.generalKnowledgeStudy, {
        mode, subjectId: values.subjectId || undefined, topicId: values.topicId || undefined,
        knowledgePointId: values.knowledgePointId || undefined, targetQuestionCount: questionCount,
        durationSeconds: mode === 'exam' ? Number(values.durationMinutes) * 60 : null,
        sourceFilter: values.sourceFilter || 'all', difficultyFilter: values.difficultyFilter || 'all',
        onlyMistakes: values.mode === 'mistakes', onlyFavorites: values.mode === 'favorites',
        onlyUnanswered: values.onlyUnanswered === 'true', randomize: mode === 'exam',
      });
      storage.generalKnowledgeStudy = started.generalKnowledgeStudy;
      modalRoot.innerHTML = '';
      await persist();
      navigate('generalKnowledge', `session=${encodeURIComponent(started.session.id)}`);
    } catch (error) { notify(error.message); }
  }
  if (form.id === 'science-session-setup') {
    const point = values.knowledgePointId ? getKnowledgePoint(values.knowledgePointId) : null;
    const questionCount = Number(values.targetQuestionCount);
    const eligibleIds = new Set(getAptitudeMockQuestionBank('science').map((question) => question.id));
    const questionBank = values.mode === 'exam'
      ? SCIENCE_QUESTION_BANK.filter((question) => eligibleIds.has(question.id))
      : SCIENCE_QUESTION_BANK;
    try {
      const started = createScienceSession(questionBank, storage.scienceStudy, {
        mode: values.mode === 'exam' ? 'exam' : 'practice',
        subjectId: values.subjectId || point?.subjectId || undefined,
        topicId: values.topicId || point?.topicId || undefined,
        knowledgePointId: values.knowledgePointId || undefined,
        targetQuestionCount: questionCount,
        durationSeconds: values.mode === 'exam' ? Number(values.durationMinutes) * 60 : null,
        sourceFilter: values.sourceFilter,
        difficultyFilter: values.difficultyFilter,
        onlyMistakes: values.mode === 'mistakes',
        onlyUnanswered: values.onlyUnanswered === 'true',
        randomize: values.mode === 'exam',
      });
      storage.scienceStudy = started.scienceStudy;
      modalRoot.innerHTML = '';
      await persist();
      navigate('science', `session=${encodeURIComponent(started.session.id)}`);
    } catch (error) { notify(error.message); }
  }
  if (form.id === 'aptitude-module-session-setup') {
    const moduleId = form.dataset.moduleId;
    const module = APTITUDE_MODULES.find((item) => item.id === moduleId && item.studyStore === 'aptitudeModuleStudies');
    if (!module) { notify('找不到这条行测模块。'); return; }
    const mode = values.mode === 'exam' ? 'exam' : 'practice';
    try {
      const bank = mode === 'exam' ? getAptitudeMockQuestionBank(module.id) : getAptitudeQuestions(module.id);
      const started = createAptitudeModuleSession(bank, storage.aptitudeModuleStudies, module.id, {
        mode,
        subjectId: values.subjectId || undefined,
        topicId: values.topicId || undefined,
        knowledgePointId: values.knowledgePointId || undefined,
        targetQuestionCount: Number(values.targetQuestionCount),
        durationSeconds: mode === 'exam' ? Number(values.durationMinutes) * 60 : null,
        sourceFilter: values.sourceFilter || 'all',
        difficultyFilter: values.difficultyFilter || 'all',
        onlyMistakes: values.mode === 'mistakes',
        onlyFavorites: values.mode === 'favorites',
        onlyUnanswered: values.onlyUnanswered === 'true',
        randomize: mode === 'exam',
      });
      storage.aptitudeModuleStudies = started.aptitudeModuleStudies;
      modalRoot.innerHTML = '';
      await persist();
      activeAptitudeModuleId = module.id;
      navigate('aptitudeModule', `session=${encodeURIComponent(started.session.id)}`);
    } catch (error) { notify(error.message); }
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
  if (event.target.name === 'title' && event.target.closest('#plan-task-form')) {
    const preview = modalRoot.querySelector('[data-plan-task-preview]');
    if (preview) preview.textContent = event.target.value.trim() || '未命名任务';
  }
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
  syncAptitudeModulePracticeSetup(event.target.closest?.('#aptitude-module-session-setup'));
  if (['plan-task-type', 'science-subject', 'science-topic', 'science-activity-type'].includes(event.target.id)) {
    syncPlanTaskScienceControls(event.target.closest('#plan-task-form'));
  }
  if (['plan-task-type', 'aptitude-activity-type'].includes(event.target.id)) {
    syncAptitudeTaskControls(event.target.closest('#plan-task-form'));
  }
  if (['plan-task-type', 'general-knowledge-subject', 'general-knowledge-topic', 'general-knowledge-activity-type'].includes(event.target.id)) {
    syncGeneralKnowledgeTaskControls(event.target.closest('#plan-task-form') || event.target.closest('#general-knowledge-session-setup'));
  }
  const positionFilter = {
    'job-district': 'districtId', 'decision-district': 'districtId',
    'job-year': 'year', 'decision-year': 'year', 'job-type': 'orgType', 'job-jobtype': 'jobType',
    'job-unit': 'unit', 'job-education': 'education', 'job-politics': 'politicalStatus',
    'job-graduation': 'freshGraduate', 'job-physical-test': 'physicalTest',
    'job-professional-test': 'professionalTest', 'job-recruitment': 'recruitmentGroup',
  }[event.target.id];
  if (positionFilter || event.target.id === 'job-sort') {
    const advancedWasOpen = Boolean(document.querySelector('#job-advanced-filters')?.open);
    if (positionFilter) {
      filters[positionFilter] = event.target.value;
      if (positionFilter === 'year' && event.target.value !== 'all') scenarioYear = event.target.value;
    }
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
    if (event.target.id === 'scenario-year') {
      scenarioYear = event.target.value;
      filters.year = event.target.value;
    }
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
  const route = readRoute();
  page = pageMeta[route.page] ? route.page : 'overview';
  activeAptitudeModuleId = route.aptitudeModuleId;
  activeSciencePlanTaskId = route.taskId;
  selectedScienceKnowledgePointId = route.knowledgePointId;
  activeScienceSessionId = route.sessionId;
  activeAptitudeOverallSessionId = page === 'aptitude' ? route.sessionId : null;
  activeGeneralKnowledgePlanTaskId = route.page === 'generalKnowledge' ? route.taskId : null;
  selectedGeneralKnowledgePointId = route.page === 'generalKnowledge' ? route.knowledgePointId : null;
  activeGeneralKnowledgeSessionId = route.page === 'generalKnowledge' ? route.sessionId : null;
  activeAptitudeModulePlanTaskId = route.page === 'aptitudeModule' ? route.taskId : null;
  activeAptitudeModuleSessionId = route.page === 'aptitudeModule' ? route.sessionId : null;
  selectedAptitudeModuleKnowledgePointId = route.page === 'aptitudeModule' ? route.knowledgePointId : null;
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
