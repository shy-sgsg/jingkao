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

for (const moduleId of ['political-theory', 'verbal', 'quantitative', 'reasoning', 'data-analysis']) {
  DIRECTORY_PROVIDERS[moduleId] = () => [];
  LESSON_PROVIDERS[moduleId] = () => ({});
}

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

export function findAptitudeModuleKnowledgePoint(content, pointId) {
  if (!isRecord(content) || typeof pointId !== 'string' || !pointId) return null;
  for (const subject of Array.isArray(content.directory) ? content.directory : []) {
    for (const topic of Array.isArray(subject?.topics) ? subject.topics : []) {
      const point = (Array.isArray(topic?.knowledgePoints) ? topic.knowledgePoints : [])
        .find((item) => item?.id === pointId);
      if (point) {
        return {
          subject,
          topic,
          point,
          lesson: content.lessons?.[pointId] || point.content || null,
        };
      }
    }
  }
  return null;
}

export function getAptitudeModuleKnowledgePoints(content) {
  return (Array.isArray(content?.directory) ? content.directory : []).flatMap((subject) =>
    (Array.isArray(subject?.topics) ? subject.topics : []).flatMap((topic) =>
      (Array.isArray(topic?.knowledgePoints) ? topic.knowledgePoints : []).map((point) => ({
        ...point,
        subjectId: point.subjectId || subject.id,
        subjectTitle: point.subjectTitle || subject.title,
        topicId: point.topicId || topic.id,
        topicTitle: point.topicTitle || topic.title,
      }))));
}
