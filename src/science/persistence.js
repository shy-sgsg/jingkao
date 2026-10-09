import { normalizeGeneralKnowledgeStudy } from '../general-knowledge/persistence.js';
import { normalizeAptitudeModuleStudies, normalizeAptitudeOverallStudy } from '../aptitude/persistence.js';

function emptyScienceStudy() {
  return { knowledgeProgress: {}, sessions: [], answers: [], mistakes: {}, favorites: [], favoriteKnowledgePointIds: [], unclearKnowledgePointIds: [] };
}

function isScienceRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeStudyState(source = {}) {
  const state = isScienceRecord(source) ? source : {};
  const science = isScienceRecord(state.scienceStudy) ? state.scienceStudy : {};
  return {
    ...state,
    studyPlanTasks: Array.isArray(state.studyPlanTasks) ? state.studyPlanTasks : [],
    generalKnowledgeStudy: normalizeGeneralKnowledgeStudy(state.generalKnowledgeStudy),
    aptitudeModuleStudies: normalizeAptitudeModuleStudies(state.aptitudeModuleStudies),
    aptitudeOverallStudy: normalizeAptitudeOverallStudy(state.aptitudeOverallStudy),
    scienceStudy: {
      knowledgeProgress: isScienceRecord(science.knowledgeProgress) ? science.knowledgeProgress : {},
      sessions: Array.isArray(science.sessions) ? science.sessions : [],
      answers: Array.isArray(science.answers) ? science.answers : [],
      mistakes: isScienceRecord(science.mistakes) ? science.mistakes : {},
      favorites: Array.isArray(science.favorites) ? [...new Set(science.favorites.filter((id) => typeof id === 'string'))] : [],
      favoriteKnowledgePointIds: Array.isArray(science.favoriteKnowledgePointIds) ? [...new Set(science.favoriteKnowledgePointIds.filter((id) => typeof id === 'string'))] : [],
      unclearKnowledgePointIds: Array.isArray(science.unclearKnowledgePointIds) ? [...new Set(science.unclearKnowledgePointIds.filter((id) => typeof id === 'string'))] : [],
    },
  };
}

export function setKnowledgePointStatus(source, pointId, status, at = new Date().toISOString()) {
  if (!pointId) throw new Error('知识点编号不能为空。');
  if (!['learning', 'completed'].includes(status)) throw new Error('知识点学习状态无效。');
  const state = normalizeStudyState({ scienceStudy: source }).scienceStudy;
  const previous = state.knowledgeProgress[pointId] || {};
  const next = {
    ...state,
    knowledgeProgress: {
      ...state.knowledgeProgress,
      [pointId]: {
        ...previous,
        status,
        startedAt: previous.startedAt || at,
        lastViewedAt: at,
        ...(status === 'completed' ? { completedAt: previous.completedAt || at } : {}),
      },
    },
  };
  return next;
}

export function toggleKnowledgePointFlag(source, pointId, flag) {
  if (!pointId) throw new Error('知识点编号不能为空。');
  const flagKey = flag === 'favorite' ? 'favoriteKnowledgePointIds' : flag === 'unclear' ? 'unclearKnowledgePointIds' : null;
  if (!flagKey) throw new Error('知识点标记类型无效。');
  const state = normalizeStudyState({ scienceStudy: source }).scienceStudy;
  const current = state[flagKey];
  const enabled = !current.includes(pointId);
  return {
    ...state,
    [flagKey]: enabled ? [...current, pointId] : current.filter((id) => id !== pointId),
  };
}

export function createEmptyScienceStudy() {
  return emptyScienceStudy();
}
