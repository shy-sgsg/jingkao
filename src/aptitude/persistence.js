import { APTITUDE_MODULES, getAptitudeModule } from './modules.js';

const MODULES_WITH_OWN_STATE = APTITUDE_MODULES.filter((module) => module.studyStore === 'aptitudeModuleStudies');

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringIds(value) {
  return Array.isArray(value) ? [...new Set(value.filter((id) => typeof id === 'string' && id.length > 0))] : [];
}

export function emptyAptitudeOverallStudy() {
  return { sessions: [], answers: [], mistakes: {} };
}

export function normalizeAptitudeOverallStudy(source = {}) {
  const state = isRecord(source) ? source : {};
  return {
    ...emptyAptitudeOverallStudy(),
    sessions: Array.isArray(state.sessions) ? state.sessions.filter(isRecord) : [],
    answers: Array.isArray(state.answers) ? state.answers.filter(isRecord) : [],
    mistakes: isRecord(state.mistakes) ? state.mistakes : {},
  };
}

function moduleRecords(value, moduleId) {
  return Array.isArray(value)
    ? value.filter((item) => isRecord(item) && (!item.moduleId || item.moduleId === moduleId))
      .map((item) => ({ ...item, moduleId }))
    : [];
}

function moduleMistakes(value, moduleId) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([, item]) => isRecord(item) && (!item.moduleId || item.moduleId === moduleId))
    .map(([questionId, item]) => [questionId, { ...item, moduleId }]));
}

function requireStudyModule(moduleId) {
  const module = getAptitudeModule(moduleId);
  if (!module || module.studyStore !== 'aptitudeModuleStudies') throw new Error(`行测模块 ${moduleId} 没有独立学习状态。`);
  return module;
}

export function emptyAptitudeModuleStudy(moduleId) {
  requireStudyModule(moduleId);
  return {
    moduleId,
    knowledgeProgress: {},
    sessions: [],
    answers: [],
    mistakes: {},
    favorites: [],
    favoriteKnowledgePointIds: [],
    unclearKnowledgePointIds: [],
  };
}

function normalizeModuleStudy(source, moduleId) {
  const state = isRecord(source) && (!source.moduleId || source.moduleId === moduleId) ? source : {};
  return {
    ...emptyAptitudeModuleStudy(moduleId),
    knowledgeProgress: isRecord(state.knowledgeProgress) ? state.knowledgeProgress : {},
    sessions: moduleRecords(state.sessions, moduleId),
    answers: moduleRecords(state.answers, moduleId),
    mistakes: moduleMistakes(state.mistakes, moduleId),
    favorites: stringIds(state.favorites),
    favoriteKnowledgePointIds: stringIds(state.favoriteKnowledgePointIds),
    unclearKnowledgePointIds: stringIds(state.unclearKnowledgePointIds),
  };
}

export function normalizeAptitudeModuleStudies(source = {}) {
  const state = isRecord(source) ? source : {};
  return Object.fromEntries(MODULES_WITH_OWN_STATE.map((module) => [
    module.id,
    normalizeModuleStudy(state[module.id], module.id),
  ]));
}

function updateModuleStudy(source, moduleId, update) {
  requireStudyModule(moduleId);
  const studies = normalizeAptitudeModuleStudies(source);
  return { ...studies, [moduleId]: update(studies[moduleId]) };
}

export function setAptitudeModulePointStatus(source, moduleId, pointId, status, at = new Date().toISOString()) {
  if (typeof pointId !== 'string' || !pointId.trim()) throw new Error('知识点编号不能为空。');
  if (!['learning', 'completed'].includes(status)) throw new Error('知识点学习状态无效。');
  const viewedAt = new Date(at);
  if (!Number.isFinite(viewedAt.valueOf())) throw new Error('知识点学习时间无效。');
  const timestamp = viewedAt.toISOString();
  return updateModuleStudy(source, moduleId, (study) => {
    const previous = study.knowledgeProgress[pointId] || {};
    return {
      ...study,
      knowledgeProgress: {
        ...study.knowledgeProgress,
        [pointId]: {
          ...previous,
          status,
          startedAt: previous.startedAt || timestamp,
          lastViewedAt: timestamp,
          ...(status === 'completed' ? { completedAt: previous.completedAt || timestamp } : {}),
        },
      },
    };
  });
}

export function toggleAptitudeModulePointFlag(source, moduleId, pointId, flag = 'favorite') {
  if (typeof pointId !== 'string' || !pointId.trim()) throw new Error('知识点编号不能为空。');
  const flagKey = flag === 'favorite' ? 'favoriteKnowledgePointIds'
    : flag === 'unclear' ? 'unclearKnowledgePointIds' : null;
  if (!flagKey) throw new Error('知识点标记类型无效。');
  return updateModuleStudy(source, moduleId, (study) => ({
    ...study,
    [flagKey]: study[flagKey].includes(pointId)
      ? study[flagKey].filter((id) => id !== pointId)
      : [...study[flagKey], pointId],
  }));
}

export function toggleAptitudeModuleFavorite(source, moduleId, questionId) {
  if (typeof questionId !== 'string' || !questionId.trim()) throw new Error('题目编号不能为空。');
  return updateModuleStudy(source, moduleId, (study) => ({
    ...study,
    favorites: study.favorites.includes(questionId)
      ? study.favorites.filter((id) => id !== questionId)
      : [...study.favorites, questionId],
  }));
}
