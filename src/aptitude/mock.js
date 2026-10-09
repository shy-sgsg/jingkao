import { APTITUDE_MODULES } from './modules.js';
import { getAptitudeQuestions } from './questions.js';

const PAPER_CATALOG = [
  {
    id: 'zhejiang-2025-A-类',
    title: '2025 年浙江省考行测 A 类（考生回忆版）',
    region: '浙江',
    examYear: 2025,
    questionCount: 125,
    sourceUrl: 'https://gwy.gkzhenti.cn/paper/1739531137130',
    answerUrl: 'https://gwy.gkzhenti.cn/answer/1739531137130',
    sourceType: 'recalled',
    ranges: {
      'political-theory': [1, 10],
      'general-knowledge': [11, 20],
      verbal: [21, 50],
      quantitative: [51, 70],
      reasoning: [71, 100],
      'data-analysis': [101, 125],
    },
  },
];

function hasCompleteQuestion(question) {
  return Boolean(question && question.id && question.stem?.trim()
    && Array.isArray(question.options) && question.options.length >= 2
    && question.options.every((option) => option?.id && option.text?.trim())
    && question.options.some((option) => option.id === question.correctAnswer)
    && question.explanation?.trim()
    && question.verificationStatus === 'verified'
    && question.publishStatus === 'published'
    && question.sourceType && question.sourceTitle?.trim() && question.sourceNote?.trim());
}

function stimulusIsComplete(stimulus) {
  if (typeof stimulus === 'string') return Boolean(stimulus.trim());
  if (!stimulus || typeof stimulus !== 'object') return false;
  return Boolean(stimulus.text?.trim() || stimulus.caption?.trim()
    || stimulus.imageUrl?.trim() || stimulus.assetUrl?.trim());
}

function hasCompleteSharedStimuli(questions, fullBank) {
  const grouped = new Map();
  for (const question of questions) {
    if (!question.sharedStimulusId) continue;
    if (!grouped.has(question.sharedStimulusId)) grouped.set(question.sharedStimulusId, []);
    grouped.get(question.sharedStimulusId).push(question);
  }
  for (const [stimulusId, group] of grouped) {
    const shared = fullBank.filter((question) => question.sharedStimulusId === stimulusId);
    if (!group.every(hasCompleteQuestion) || !shared.some((question) => stimulusIsComplete(question.sharedStimulus))) return false;
    if (shared.some((question) => !hasCompleteQuestion(question))) return false;
  }
  return true;
}

export function getAptitudeMockQuestionBank(moduleId = null) {
  const modules = moduleId ? APTITUDE_MODULES.filter((module) => module.id === moduleId) : APTITUDE_MODULES;
  const published = modules.flatMap((module) => getAptitudeQuestions(module.id)
    .map((question) => ({ ...question, moduleId: module.id })));
  const materials = new Map();
  for (const question of published) {
    if (question.sharedStimulusId && stimulusIsComplete(question.sharedStimulus)) {
      materials.set(question.sharedStimulusId, question.sharedStimulus);
    }
  }
  return published
    .filter(hasCompleteQuestion)
    .filter((question) => {
      if (!question.sharedStimulusId) return true;
      const group = published.filter((item) => item.sharedStimulusId === question.sharedStimulusId);
      return group.length > 0 && group.every(hasCompleteQuestion) && materials.has(question.sharedStimulusId);
    })
    .map((question) => question.sharedStimulusId && !question.sharedStimulus
      ? { ...question, sharedStimulus: materials.get(question.sharedStimulusId) }
      : question);
}

export function getCompleteAptitudePapers(moduleId = null, questionBank = getAptitudeMockQuestionBank()) {
  const modules = moduleId ? [moduleId] : [null];
  const groups = new Map();
  for (const question of questionBank) {
    if (!question.paperId) continue;
    if (!groups.has(question.paperId)) groups.set(question.paperId, []);
    groups.get(question.paperId).push(question);
  }

  const complete = [];
  for (const paper of PAPER_CATALOG) {
    const sourceItems = groups.get(paper.id) || [];
    for (const candidateModuleId of modules) {
      const range = candidateModuleId ? paper.ranges[candidateModuleId] : [1, paper.questionCount];
      if (!range) continue;
      const [first, last] = range;
      const selected = sourceItems.filter((question) => Number(question.originalQuestionNo) >= first
        && Number(question.originalQuestionNo) <= last
        && (!candidateModuleId || question.moduleId === candidateModuleId));
      const byNumber = new Map();
      for (const question of selected) {
        const number = Number(question.originalQuestionNo);
        if (!Number.isInteger(number) || byNumber.has(number)) { byNumber.clear(); break; }
        byNumber.set(number, question);
      }
      const expectedCount = last - first + 1;
      if (byNumber.size !== expectedCount) continue;
      const questions = Array.from({ length: expectedCount }, (_, index) => byNumber.get(first + index));
      if (questions.some((question) => !hasCompleteQuestion(question))
        || questions.some((question) => question.sourceType !== paper.sourceType)
        || !hasCompleteSharedStimuli(questions, sourceItems)) continue;
      complete.push({
        ...paper,
        moduleId: candidateModuleId || null,
        questions,
        questionCount: questions.length,
        isFullPaper: !candidateModuleId,
      });
    }
  }
  return complete;
}

export function getAptitudeModuleLabel(moduleId) {
  return APTITUDE_MODULES.find((module) => module.id === moduleId)?.area || '行测';
}
