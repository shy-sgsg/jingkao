import { getAptitudeModule } from './modules.js';
import { getScienceTree } from '../science/knowledge.js';
import { SCIENCE_LESSONS } from '../science/lessonContent.js';
import { getGeneralKnowledgeTree } from '../general-knowledge/knowledge.js';
import { GENERAL_KNOWLEDGE_LESSONS } from '../general-knowledge/lessonContent.js';

const DIRECTORY_PROVIDERS = {
  science: getScienceTree,
  'general-knowledge': getGeneralKnowledgeTree,
};

const LESSON_PROVIDERS = {
  science: () => SCIENCE_LESSONS,
  'general-knowledge': () => GENERAL_KNOWLEDGE_LESSONS,
};

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function getAptitudeModuleContent(moduleId, testContent = null) {
  const module = getAptitudeModule(moduleId);
  if (!module) throw new Error(`Unknown aptitude module: ${moduleId}`);
  if (testContent !== null) {
    return {
      directory: Array.isArray(testContent.directory) ? testContent.directory : [],
      lessons: isRecord(testContent.lessons) ? testContent.lessons : {},
    };
  }
  const directoryProvider = module.directoryProvider ? DIRECTORY_PROVIDERS[module.directoryProvider] : null;
  const lessonProvider = module.lessonProvider ? LESSON_PROVIDERS[module.lessonProvider] : null;
  return {
    directory: directoryProvider ? directoryProvider() : [],
    lessons: lessonProvider ? lessonProvider() : {},
  };
}
