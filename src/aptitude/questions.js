import { getAptitudeModule } from './modules.js';
import { SCIENCE_QUESTION_BANK } from '../science/questionBank.js';
import { GENERAL_KNOWLEDGE_QUESTION_BANK } from '../general-knowledge/questionBank.js';
import { APTITUDE_MODULE_QUESTION_BANKS } from './questionBank.js';

const QUESTION_BANK_PROVIDERS = {
  'political-theory': () => APTITUDE_MODULE_QUESTION_BANKS['political-theory'],
  science: () => SCIENCE_QUESTION_BANK,
  'general-knowledge': () => GENERAL_KNOWLEDGE_QUESTION_BANK,
  verbal: () => APTITUDE_MODULE_QUESTION_BANKS.verbal,
  quantitative: () => APTITUDE_MODULE_QUESTION_BANKS.quantitative,
  reasoning: () => APTITUDE_MODULE_QUESTION_BANKS.reasoning,
  'data-analysis': () => APTITUDE_MODULE_QUESTION_BANKS['data-analysis'],
};

const FILTER_FIELDS = ['subjectId', 'topicId', 'sourceType', 'difficulty'];

export function getAptitudeQuestions(moduleId, filters = {}) {
  const module = getAptitudeModule(moduleId);
  if (!module) throw new Error(`Unknown aptitude module: ${moduleId}`);
  const provider = module.questionProvider ? QUESTION_BANK_PROVIDERS[module.questionProvider] : null;
  const bank = provider ? provider() : [];
  return bank.filter((question) => {
    if (question.publishStatus !== 'published') return false;
    for (const field of FILTER_FIELDS) {
      const value = filters[field];
      if (value && value !== 'all' && question[field] !== value) return false;
    }
    const pointId = filters.knowledgePointId;
    return !pointId || (question.knowledgePointIds || []).includes(pointId);
  });
}
