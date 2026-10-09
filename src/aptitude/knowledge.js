const OUTLINE_SPECS = {
  'political-theory': {
    title: '政治理论',
    topics: [
      ['innovation-theory', '党的创新理论', 'innovation-theory|党的创新理论基本框架;important-concepts|重要概念和理论表述理解;development-concepts|新发展理念与高质量发展;theory-practice|理论观点与工作实践对应'],
      ['party-policy', '党和国家方针政策', 'policy-goals|政策目标和主要任务;policy-measures|政策举措与实施主体;policy-scope|政策适用对象和范围;policy-links|政策要求间的衔接关系'],
      ['policy-reading', '政策材料阅读与应用', 'meeting-documents|重要会议和文件要点识别;policy-language|政策表述辨析;policy-implementation|政策落实和基层工作要求;policy-sources|政策来源和时效核对'],
    ],
  },
  verbal: {
    title: '言语理解与表达',
    topics: [
      ['reading', '阅读理解', 'main-idea|主旨概括;intent|意图判断;detail|细节判断;inference|推断理解;title|标题填入;word-sentence-meaning|词句理解'],
      ['logical-cloze', '逻辑填空', 'context|上下文语境分析;word-choice|实词辨析;idiom|成语辨析;collocation|固定搭配与词语照应;relations|句间逻辑关系'],
      ['sentence-expression', '语句表达', 'sentence-order|语句排序;sentence-connection|语句衔接;sentence-completion|语句填空;sentence-structure|句子结构与表达准确'],
    ],
  },
  quantitative: {
    title: '数量关系',
    topics: [
      ['number-reasoning', '数字推理', 'number-patterns|数列规律识别;difference-ratio|差数与倍数关系;recurrence|递推关系;grouped-sequences|分组与交叉数列'],
      ['arithmetic-basics', '数学运算基础', 'equations|方程与不定方程;ratio-percentage|比例、百分数与浓度;average|平均数与加权平均;profit|利润、折扣与费用'],
      ['common-models', '常见数量模型', 'work-rate|工程与工作效率;travel|行程与相遇追及;arrangements|排列组合;probability|概率;geometry|几何与空间测量'],
      ['calculation-strategy', '计算与解题策略', 'estimation|估算与数量级判断;option-substitution|代入选项;equivalent-relations|等量关系转换;calculation-simplification|分数与比例简算'],
    ],
  },
  reasoning: {
    title: '判断推理',
    topics: [
      ['graphic-reasoning', '图形推理', 'graphic-patterns|图形规律识别;position|位置与移动规律;quantity|数量与元素关系;attributes|属性与样式规律;spatial|立体展开与空间关系'],
      ['definition-judgment', '定义判断', 'definition-elements|定义要素提取;qualifiers|主体、条件与结果限定;case-matching|题干与选项逐项匹配;negative-conditions|不符合项与反向条件'],
      ['analogy-reasoning', '类比推理', 'logical-relations|逻辑关系辨析;semantic-relations|近反义与词义关系;part-whole|组成、种属与整体关系;cause-effect|因果、条件与功能关系'],
      ['logical-judgment', '逻辑判断', 'conditional-translation|条件命题与逻辑翻译;necessary-sufficient|必要条件与充分条件;strengthen-weaken|加强与削弱;assumption|前提与假设;conclusion|结论推出与解释评价'],
      ['event-ordering', '事件排序', 'time-order|时间先后关系;causal-order|原因与结果关系;constraint-order|条件约束与排除;workflow-order|流程和步骤排序'],
    ],
  },
  'data-analysis': {
    title: '资料分析',
    topics: [
      ['material-reading', '资料解读', 'material-types|统计资料类型识别;indicators|统计指标含义;units-time|单位、时间与口径;chart-reading|表格与图表信息读取'],
      ['growth', '增长量与增长率', 'growth-amount|增长量计算;growth-rate|增长率计算;base-period|基期与现期换算;average-growth|年均增长与累计增长'],
      ['proportion', '比重与结构', 'current-share|现期比重;prior-share|基期比重;share-change|比重变化量;share-compare|比重比较'],
      ['averages-multiples', '平均数与倍数', 'average-value|平均数计算;average-change|平均数变化;multiple|倍数与翻番;relative-comparison|倍数和比例比较'],
      ['comprehensive-analysis', '综合判断与速算', 'ranking|排序与趋势判断;mixed-indicators|多指标综合比较;estimation|估算与有效数字;calculation-choice|列式、拆分与计算选择'],
    ],
  },
};

function parseKnowledgePoints(moduleId, subjectTitle, topicId, topicTitle, source) {
  return source.split(';').map((item) => {
    const [slug, title] = item.split('|');
    return {
      id: `${moduleId}:${slug}`,
      title,
      subjectId: moduleId,
      subjectTitle,
      topicId,
      topicTitle,
      enabled: true,
      contentStatus: 'outline',
    };
  });
}

function buildTree(moduleId, spec) {
  return [{
    id: moduleId,
    title: spec.title,
    topics: spec.topics.map(([topicSlug, title, points]) => {
      const topicId = `${moduleId}:${topicSlug}`;
      return {
        id: topicId,
        title,
        knowledgePoints: parseKnowledgePoints(moduleId, spec.title, topicId, title, points),
      };
    }),
  }];
}

const TREES = Object.fromEntries(Object.entries(OUTLINE_SPECS)
  .map(([moduleId, spec]) => [moduleId, buildTree(moduleId, spec)]));

export function getAptitudeModuleKnowledgeTree(moduleId) {
  return (TREES[moduleId] || []).map((subject) => ({
    ...subject,
    topics: subject.topics.map((topic) => ({
      ...topic,
      knowledgePoints: topic.knowledgePoints.map((point) => ({ ...point })),
    })),
  }));
}
