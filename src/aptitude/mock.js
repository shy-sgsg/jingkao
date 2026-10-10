import { APTITUDE_MODULES } from './modules.js';
import { getAptitudeQuestions } from './questions.js';

const PAPER_CATALOG = [
  {
    id: 'jiangxi-2026-recall',
    title: '2026年江西省公务员录用考试《行测》题（网友回忆版）',
    region: '江西',
    examYear: 2026,
    questionCount: 130,
    sourceUrl: 'https://www.aipta.com/article/10594.html',
    answerUrl: null,
    sourceType: 'recalled',
    ranges: {
      'political-theory': [1, 20],
      'general-knowledge': [21, 35],
      verbal: [36, 65],
      quantitative: [66, 75],
      reasoning: [76, 110],
      'data-analysis': [111, 130],
    },
  },
  {
    "id": "zhanhong-2025-guangdong-mock-2",
    "title": "展鸿 2025 年广东省公务员录用考试《行测》模拟卷（二）",
    "region": "广东",
    "examYear": 2025,
    "questionCount": 100,
    "sourceUrl": null,
    "answerUrl": null,
    "sourceType": "third_party_mock",
    "ranges": {
      "general-knowledge": [
        16,
        25
      ],
      "verbal": [
        26,
        40
      ],
      "quantitative": [
        41,
        55
      ],
      "reasoning": [
        56,
        75
      ],
      "science": [
        76,
        80
      ],
      "data-analysis": [
        81,
        100
      ]
    }
  },
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
  {
    id: 'zhanhong-2025-mock-A 类',
    title: '展鸿 2025 年浙江省考行测模拟卷 A 类',
    region: '浙江',
    examYear: 2025,
    questionCount: 125,
    sourceUrl: 'https://static.32xueyuan.com/zq/u/cms/zj/202411/202048155177.pdf',
    answerUrl: 'https://zhanhong-32-read-able.oss-cn-hangzhou.aliyuncs.com/upload/videos/2024/11/02/%E5%B1%95%E9%B8%BF2025%E5%B9%B4%E6%B5%99%E6%B1%9F%E7%9C%81%E8%80%83%E3%80%8A%E8%A1%8C%E6%94%BF%E8%81%8C%E4%B8%9A%E8%83%BD%E5%8A%9B%E6%B5%8B%E9%AA%8C%E3%80%8B%E6%A8%A1%E6%8B%9F%E5%8D%B7110344187.pdf',
    sourceType: 'third_party_mock',
    ranges: {
      'general-knowledge': [1, 20], verbal: [21, 50], quantitative: [51, 70],
      reasoning: [71, 110], 'data-analysis': [111, 125],
    },
  },
  {
    id: 'zhanhong-2025-mock-B 类',
    title: '展鸿 2025 年浙江省考行测模拟卷 B 类',
    region: '浙江',
    examYear: 2025,
    questionCount: 120,
    sourceUrl: 'https://static.32xueyuan.com/zq/u/cms/zj/202411/202048155177.pdf',
    answerUrl: 'https://zhanhong-32-read-able.oss-cn-hangzhou.aliyuncs.com/upload/videos/2024/11/02/%E5%B1%95%E9%B8%BF2025%E5%B9%B4%E6%B5%99%E6%B1%9F%E7%9C%81%E8%80%83%E3%80%8A%E8%A1%8C%E6%94%BF%E8%81%8C%E4%B8%9A%E8%83%BD%E5%8A%9B%E6%B5%8B%E9%AA%8C%E3%80%8B%E6%A8%A1%E6%8B%9F%E5%8D%B7110344187.pdf',
    sourceType: 'third_party_mock',
    ranges: {
      'general-knowledge': [1, 20], verbal: [21, 50], quantitative: [51, 70],
      reasoning: [71, 105], 'data-analysis': [106, 120],
    },
  },
  {
    id: 'zhanhong-2025-mock-C 类',
    title: '展鸿 2025 年浙江省考行测模拟卷 C 类',
    region: '浙江',
    examYear: 2025,
    questionCount: 115,
    sourceUrl: 'https://static.32xueyuan.com/zq/u/cms/zj/202411/202048155177.pdf',
    answerUrl: 'https://zhanhong-32-read-able.oss-cn-hangzhou.aliyuncs.com/upload/videos/2024/11/02/%E5%B1%95%E9%B8%BF2025%E5%B9%B4%E6%B5%99%E6%B1%9F%E7%9C%81%E8%80%83%E3%80%8A%E8%A1%8C%E6%94%BF%E8%81%8C%E4%B8%9A%E8%83%BD%E5%8A%9B%E6%B5%8B%E9%AA%8C%E3%80%8B%E6%A8%A1%E6%8B%9F%E5%8D%B7110344187.pdf',
    sourceType: 'third_party_mock',
    ranges: {
      'general-knowledge': [1, 20], verbal: [21, 50], quantitative: [51, 65],
      reasoning: [66, 100], 'data-analysis': [101, 115],
    },
  },
  {
    id: 'jiangsu-2024-A-class',
    title: '2024 年江苏省公务员录用考试行测 A 类真题',
    region: '江苏',
    examYear: 2024,
    questionCount: 135,
    sourceUrl: 'https://static.32xueyuan.com/zq//u/cms/zj/202411/221409378lxq.pdf',
    answerUrl: 'https://static.32xueyuan.com/zq//u/cms/zj/202411/221409378lxq.pdf',
    sourceType: 'verified_exam',
    ranges: {
      'general-knowledge': [1, 15], verbal: [16, 45], quantitative: [46, 65],
      reasoning: [66, 115], 'data-analysis': [116, 135],
    },
  },
  {
    id: 'zhejiang-2023-A-class',
    title: '2023 年浙江省公务员录用考试行测 A 卷（考生回忆题）',
    region: '浙江',
    examYear: 2023,
    questionCount: 125,
    sourceUrl: 'https://www.aipta.com/article/3524.html',
    answerUrl: 'https://static.32xueyuan.com/zq//u/cms/zj/202310/20144954ob39.pdf',
    sourceType: 'recalled',
    ranges: {
      'general-knowledge': [1, 20], verbal: [21, 50], quantitative: [51, 70],
      reasoning: [71, 110], 'data-analysis': [111, 125],
    },
  },
  {
    id: "jiangxi-2025-zhanhong-mock-1",
    title: "展鸿 2025 年江西省公务员录用考试模拟卷（一）《行测》",
    region: '江西',
    examYear: 2025,
    questionCount: 135,
    sourceUrl: "https://static.32xueyuan.com/zq/u/cms/jx/202503/120855429qnm.pdf",
    answerUrl: "https://static.32xueyuan.com/zq/u/cms/jx/202503/12085541lobk.pdf",
    sourceType: 'third_party_mock',
    ranges: {
      'political-theory': [1, 15],
      'general-knowledge': [16, 35],
      verbal: [36, 60],
      quantitative: [61, 80],
      reasoning: [81, 115],
      'data-analysis': [116, 135],
    },
  },
  {
    id: "jiangxi-2025-zhanhong-mock-3",
    title: "展鸿 2025 年江西省公务员录用考试模拟卷（三）《行测》",
    region: '江西',
    examYear: 2025,
    questionCount: 135,
    sourceUrl: "https://static.32xueyuan.com/zq/u/cms/jx/202503/12085542c2xs.pdf",
    answerUrl: "https://static.32xueyuan.com/zq/u/cms/jx/202503/051709044zd4.pdf",
    sourceType: 'third_party_mock',
    ranges: {
      'political-theory': [1, 15],
      'general-knowledge': [16, 35],
      verbal: [36, 60],
      quantitative: [61, 80],
      reasoning: [81, 115],
      'data-analysis': [116, 135],
    },
  },
  {
    id: 'henan-2026-recall',
    title: '2026 年河南省公务员录用考试《行测》题（网友回忆版）',
    region: '河南',
    examYear: 2026,
    questionCount: 120,
    sourceUrl: 'https://gwy.gkzhenti.cn/paper/1775360735848',
    answerUrl: 'https://gwy.gkzhenti.cn/answer/1775360735848',
    sourceType: 'recalled',
    ranges: {
      'political-theory': [76, 90],
      'general-knowledge': [91, 105],
    },
  },
  {
    id: 'anhui-2022-zhanhong-qae',
    title: '2022年安徽省公务员录用考试《行测》题（展鸿整理版）',
    region: '安徽',
    examYear: 2022,
    questionCount: 110,
    sourceType: 'recalled',
    ranges: {
      quantitative: [1, 15],
      verbal: [16, 40],
      'general-knowledge': [41, 60],
      reasoning: [61, 95],
      'data-analysis': [96, 110],
    },
  },
];

const PLACEHOLDER_STEMS = new Set([
  '本卷来源于考生回忆，本题暂缺失',
  '原卷题面已保留；文本抽取或必要材料待核。',
]);

function hasCompleteQuestion(question) {
  const hasOptionContent = (option) => Boolean(option?.text?.trim()
    || option?.imageUrl?.trim()
    || option?.imageUrls?.some((url) => typeof url === 'string' && url.trim()));
  const optionCountIsValid = question?.optionType === 'true_false'
    ? question.options?.length === 2
    : question.options?.length === 4;
  const visualOptionsArePresent = Boolean(question?.visualOptionsInStem
    && question.stemImageUrls?.some((url) => typeof url === 'string' && url.trim()));
  return Boolean(question && question.id && question.stem?.trim()
    && !PLACEHOLDER_STEMS.has(question.stem.trim())
    && Array.isArray(question.options) && optionCountIsValid
    && question.options.every((option) => option?.id && (hasOptionContent(option) || visualOptionsArePresent))
    && question.options.some((option) => option.id === question.correctAnswer)
    && question.explanation?.trim() && question.explanation.trim() !== '缺'
    && question.verificationStatus === 'verified'
    && question.publishStatus === 'published'
    && question.sourceType && question.sourceTitle?.trim() && question.sourceNote?.trim());
}

function stimulusIsComplete(stimulus) {
  if (typeof stimulus === 'string') return Boolean(stimulus.trim());
  if (!stimulus || typeof stimulus !== 'object') return false;
  return Boolean(stimulus.text?.trim() || stimulus.caption?.trim()
    || stimulus.imageUrl?.trim() || stimulus.assetUrl?.trim()
    || stimulus.imageUrls?.some((url) => typeof url === 'string' && url.trim()));
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

export function getUniqueAptitudeRandomQuestionBank(moduleId = null) {
  const seen = new Set();
  return getAptitudeMockQuestionBank(moduleId).filter((question) => {
    if (question.sharedStimulusId) return true;
    const normalize = (value) => String(value || '').normalize('NFKC').replace(/\s+/g, '').trim();
    const signature = [
      normalize(question.stem),
      (question.stemImageUrls || []).join('|'),
      (question.options || []).map((option) => [
        normalize(typeof option === 'string' ? option : option?.text),
        (typeof option === 'string' ? [] : option?.imageUrls || []).join(','),
      ].join(':')).join('|'),
      question.correctAnswer || '',
    ].join('\u001f');
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
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
