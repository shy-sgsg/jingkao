export const APTITUDE_MODULES = [
  { id: 'political-theory', area: '政治理论', symbol: '政', hint: '理论政策与时政辨析', route: '#/aptitude/political-theory', taskType: 'political_theory', recordArea: '政治理论', mockKey: 'politicalAndGeneral', mockLabel: '政治理论 + 常识', mockOrder: 5 },
  { id: 'general-knowledge', area: '常识判断', symbol: '常', hint: '法律、经济、科技、人文与北京市情', route: '#/aptitude/general-knowledge', taskType: 'general_knowledge', recordArea: '常识判断', mockKey: 'politicalAndGeneral', mockLabel: '政治理论 + 常识', mockOrder: 5 },
  { id: 'verbal', area: '言语', symbol: '言', hint: '中心理解、逻辑填空与语句表达', route: '#/aptitude/verbal', taskType: 'verbal', recordArea: '言语', mockKey: 'verbal', mockLabel: '言语理解', mockOrder: 4 },
  { id: 'quantitative', area: '数量关系', symbol: '数', hint: '数字推理、应用题与数量模型', route: '#/aptitude/quantitative', taskType: 'quantitative', recordArea: '数量关系', mockKey: 'quantitative', mockLabel: '数量关系', mockOrder: 3 },
  { id: 'reasoning', area: '判断推理', symbol: '判', hint: '图形、演绎、定义、类比与排序', route: '#/aptitude/reasoning', taskType: 'reasoning', recordArea: '判断推理', mockKey: 'reasoning', mockLabel: '判断推理', mockOrder: 1 },
  { id: 'science', area: '科学推理', symbol: '理', hint: '知识点学习、专项练习与错题复习', route: '#/aptitude/science', taskType: 'science_reasoning', recordArea: '科学推理', mockKey: 'science', mockLabel: '科学推理', mockOrder: 2 },
  { id: 'data-analysis', area: '资料分析', symbol: '资', hint: '增长率、比重与综合判断', route: '#/aptitude/data-analysis', taskType: 'data_analysis', recordArea: '资料分析', mockKey: 'dataAnalysis', mockLabel: '资料分析', mockOrder: 0 },
];

const MODULE_BY_ID = new Map(APTITUDE_MODULES.map((module) => [module.id, module]));

export function getAptitudeModule(id) {
  return MODULE_BY_ID.get(id) || null;
}

export function getAptitudeMockModules() {
  const groups = new Map();
  for (const module of APTITUDE_MODULES) {
    if (!groups.has(module.mockKey)) {
      groups.set(module.mockKey, { id: module.mockKey, label: module.mockLabel, order: module.mockOrder });
    }
  }
  return [...groups.values()]
    .sort((left, right) => left.order - right.order)
    .map(({ id, label }) => [id, label]);
}
