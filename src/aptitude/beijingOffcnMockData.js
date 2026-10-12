export const BEIJING_OFFCN_MOCK_QUESTIONS = (() => {
const source = (sourceId, sourceTitle, sourceUrl, examYear, paperId, sectionOrder) => ({
  sourceType: 'third_party_mock',
  sourceId,
  sourceTitle,
  sourceNote: '题目来自中公网校公开的北京公务员行测模拟题页面，按页面原题号收录。',
  sourceUrl,
  answerSourceUrl: sourceUrl,
  explanationSourceUrl: sourceUrl,
  region: '北京',
  examYear,
  paperId,
  paperTitle: sourceTitle,
  sectionOrder,
  sharedStimulusId: null,
  verificationStatus: 'verified',
  copyrightStatus: 'user_confirmed_republication_authorization',
  publishStatus: 'published',
  presentationMode: 'verbatim_authorized',
});

const commonKnowledgeSource = source(
  'offcn-beijing-2024-common-2023-08-09',
  '2024北京公务员考试行测题库：行测常识判断模拟题2023.08.09',
  'https://www.eoffcn.com/kszx/detail/1173526.html',
  2024,
  'beijing-offcn-2024-common-2023-08-09',
  1,
);
const reasoningSource = source(
  'offcn-beijing-2025-reasoning-2024-03-21',
  '2025北京公务员考试行测题库：行测判断推理模拟题2024.3.21',
  'https://www.eoffcn.com/kszx/detail/1306300.html',
  2025,
  'beijing-offcn-2025-reasoning-2024-03-21',
  4,
);
const verbalSource = source(
  'offcn-beijing-2025-verbal-2024-05-07',
  '2025北京公务员考试行测言语理解模拟题2024.5.7',
  'https://www.eoffcn.com/kszx/detail/1339318.html',
  2025,
  'beijing-offcn-2025-verbal-2024-05-07',
  2,
);
const dataAnalysisSource = source(
  'offcn-beijing-2025-data-2024-05-16',
  '2025北京公务员考试行测资料分析模拟题2024.5.16',
  'https://www.eoffcn.com/kszx/detail/1349450.html',
  2025,
  'beijing-offcn-2025-data-2024-05-16',
  5,
);
const quantitativeSource = source(
  'offcn-beijing-2025-quantitative-2024-09-19',
  '2025北京公务员考试行测题库：行测数学运算模拟题2024.09.19',
  'https://www.eoffcn.com/kszx/detail/1461668.html',
  2025,
  'beijing-offcn-2025-quantitative-2024-09-19',
  3,
);

const question = (sourceData, fields) => ({
  ...sourceData,
  ...fields,
  difficulty: fields.difficulty || 'medium',
});

return [
  question(commonKnowledgeSource, {
    id: 'bj2024offcn-common-q1', moduleId: 'general-knowledge', subjectId: 'geography',
    topicId: 'geography:world', knowledgePointIds: ['geography:countries'], originalQuestionNo: 1,
    stem: '下列城市不在北回归线穿过的国家的是( )',
    options: ['开罗', '罗马', '迪拜', '孟买'], correctAnswer: 'B',
    explanation: '中公解析：开罗在埃及，罗马在意大利，迪拜在阿联酋，孟买在印度，北回归线没有穿过意大利，故本题答案为B。',
  }),
  question(commonKnowledgeSource, {
    id: 'bj2024offcn-common-q2', moduleId: 'general-knowledge', subjectId: 'history',
    topicId: 'history:ancient', knowledgePointIds: ['history:ming-qing'], originalQuestionNo: 2,
    stem: '“民贵君轻”，“君舟民水”，“天下为主君为客”，民本思想在古代各个历史时期都有着丰硕的成果，明末清初的思想家中也提出类似观点的是( )',
    options: ['孟子', '李世民', '黄宗羲', '王夫之'], correctAnswer: 'C',
    explanation: '中公解析：明末清初三位具有代表性的思想家中，黄宗羲强烈反对君主专制，主张限制君权，把百姓利益放在首位。故本题答案为C。',
  }),
  question(reasoningSource, {
    id: 'bj2025offcn-reasoning-q1', moduleId: 'reasoning', subjectId: 'reasoning',
    topicId: 'reasoning:logical-judgment', knowledgePointIds: ['reasoning:conclusion'], originalQuestionNo: 1,
    stem: '某学校学雷锋小组决定给校园的小树浇水，可当他们到达学校之后，发现学校正好有3个学生，而小树已经浇过水了，老师问小树是谁浇水的，甲说：“是乙浇的”，乙说：“不是我浇的”，丙说：“不是我浇的”。这三个人有两个人说了假话，一个人说了真话。由此可知，说真话的是：',
    options: ['甲', '乙', '丙', '无法确定'], correctAnswer: 'B',
    explanation: '中公解析：甲和乙的话互为矛盾，一真一假。因为三人中只有一人说真话，丙的话必为假话，因此是丙浇的水。由此可知甲说“是乙浇的”为假，乙说“不是我浇的”为真，本题选择B。',
  }),
  question(reasoningSource, {
    id: 'bj2025offcn-reasoning-q2', moduleId: 'reasoning', subjectId: 'reasoning',
    topicId: 'reasoning:logical-judgment', knowledgePointIds: ['reasoning:assumption'], originalQuestionNo: 2,
    stem: '针对地球冰川的研究发现，当冰川之下的火山开始喷发后，会快速产生蒸汽流，爆炸式穿透冰层，释放灰烬进入高空，并且产生出沸石、硫化物和黏土等物质。日前人们发现，在火星表面的一些圆形平顶山丘也探测到这些矿物质，并且广泛而大量地存在。因此，人们推测火星早期是覆盖着冰原的，那里曾有过较多的火山活动。要得到上述结论，需要补充的前提是：',
    options: [
      '近日火星侦察影像频谱仪发现，火星南极存在火山',
      '火星地质活动不活跃，地表地貌大部分形成于远古较活跃的时期',
      '沸石、硫化物和黏土这三类物质是仅在冰川下的火山活动后才会产生的独特物质',
      '在火星平顶山丘的岩石中发现了某种远古细菌，说明这里很可能曾经有水源',
    ], correctAnswer: 'C',
    explanation: '中公解析：题干由火星表面探测到沸石、硫化物和黏土，推出火星早期覆盖冰原且曾有较多火山活动。若这三类物质仅在冰川下的火山活动后产生，就能把论据与结论联系起来，因此C是必要前提。',
  }),
  question(reasoningSource, {
    id: 'bj2025offcn-reasoning-q3', moduleId: 'reasoning', subjectId: 'reasoning',
    topicId: 'reasoning:logical-judgment', knowledgePointIds: ['reasoning:conclusion'], originalQuestionNo: 3,
    stem: '在本届运动会上，所有参加4×100米比赛的田径运动员都参加了100米比赛。再加上以下哪项前提，可以合乎逻辑地推出“有些参加200米比赛的田径运动员没有参加4×100米比赛”?',
    options: [
      '有些参加200米比赛的田径运动员也参加了100米比赛',
      '有些参加4×100米比赛的田径运动员没有参加200米决赛',
      '有些没有参加100米比赛的田径运动员参加了200米比赛',
      '有些没有参加200米比赛的田径运动员也没有参加100米比赛',
    ], correctAnswer: 'C',
    explanation: '中公解析：所有参加4×100米比赛的人都参加了100米比赛；若有些参加200米比赛的人没有参加100米比赛，就可以推出这些人没有参加4×100米比赛，因此选择C。',
  }),
  question(verbalSource, {
    id: 'bj2025offcn-verbal-q1', moduleId: 'verbal', subjectId: 'verbal',
    topicId: 'verbal:reading', knowledgePointIds: ['verbal:main-idea'], originalQuestionNo: 1,
    stem: '甜菜的上部叶片垂直生长，叶簇呈漏斗形，这种生长方式所形成的叶面空间的配制结构，极有利于光照的吸收，植株和群体的光合效率。而车前草的叶片是轮生的，叶片夹角为137.5度，这正是圆的黄金分割的弦角，叶片按照这个角度生长，可以充分利用光照。梨树随着树干长高，叶片沿对数螺旋上升，每个叶片都不会遮蔽下面的叶片。这段文字表达的中心意思是：',
    options: [
      '光照吸收率是影响植物生长的关键因素',
      '符合数学规律的叶片结构对植物生长有利',
      '不同的生长环境造成了植物叶片生长的差异',
      '对光照的吸收影响叶片的生长角度',
    ], correctAnswer: 'B',
    explanation: '中公解析：甜菜、车前草和梨树的叶片结构都利于光照吸收和植物生长，说明符合数学规律的叶片结构对植物生长有利，答案为B。',
  }),
  question(verbalSource, {
    id: 'bj2025offcn-verbal-q2', moduleId: 'verbal', subjectId: 'verbal',
    topicId: 'verbal:reading', knowledgePointIds: ['verbal:title'], originalQuestionNo: 2,
    stem: '荆轲，那个“风萧萧兮易水寒，壮士一去兮今不复还〞的勇士，在我国历史上是个特有的文化符号。然而，在手游里，“荆轲〞二字变成了刺客家族世代传承的名号;刘备变成了肩扛火枪身穿风衣的黑帮教父;“刺秦”的故事也被胡编乱造得南辕北辙……在手游里，几千年来人们熟知的历史人物变得面目全非。这对缺少历史知识的少年儿童来说很容易产生迷惑，历史在这里，真成了可以“被随意打扮的小姑娘”。最适合做以上文字标题的一项是：',
    options: ['手游也需要尊重历史', '手游不该“游戏”历史', '对历史的演绎不能过火', '历史不该被手游过度消费'], correctAnswer: 'B',
    explanation: '中公解析：文段列举手游中历史人物与事件被改得面目全非的例子，指出这容易使少年儿童产生迷惑，强调手游不应篡改、扭曲历史，标题选B。',
  }),
  question(verbalSource, {
    id: 'bj2025offcn-verbal-q3', moduleId: 'verbal', subjectId: 'verbal',
    topicId: 'verbal:reading', knowledgePointIds: ['verbal:main-idea'], originalQuestionNo: 3,
    stem: '检测机构的检测结果显示，节能灯的紫外线辐射的总能量只占节能灯释放总能量6%，即15瓦节能灯的紫外线功率仅为0.09瓦，而且节能灯里的长波紫外线不会穿透人体的真皮层。一般来说，只要符合标准的合格节能灯，都能把紫外线辐射量控制在安全范围内。此外，一个节能灯中仅有几毫克汞被封在灯里面，只有在一个很小的密闭环境下，几百个灯同时碎掉，汞全被一个人吸入才有可能对人造成危害。这种事件发生的概率几乎为零。对文段的主要观点概括最准确的一项是：',
    options: [
      '机构关于节能灯安全的检测结论可信',
      '人体的真皮层对紫外线具有自我隔离能力',
      '正常情况下的节能灯不会对人体造成伤害',
      '使用我国生产的节能灯不必担心安全问题',
    ], correctAnswer: 'C',
    explanation: '中公解析：文段说明合格节能灯的紫外线辐射量在安全范围内，灯中汞在正常情况下也不会造成危害，主要观点是正常情况下节能灯不会对人体造成伤害，选择C。',
  }),
  question(dataAnalysisSource, {
    id: 'bj2025offcn-data-q1', moduleId: 'data-analysis', subjectId: 'data-analysis',
    topicId: 'data-analysis:comprehensive-analysis', knowledgePointIds: ['data-analysis:mixed-indicators'], originalQuestionNo: 1,
    stem: '2021年1-3月份，全国社会消费品零售总额105221亿元。按经营单位所在地分，城镇消费品零售额91345亿元，同比增长34.6%;乡村消费品零售额13876亿元，增长29.4%。问题：2021年1-3月份，全国社会消费品零售总额比上年同期增长：',
    options: ['33.9%', '28.6%', '37.5%', '26.1%'], correctAnswer: 'A',
    explanation: '中公解析：城镇消费品零售额同比增长34.6%，乡村消费品零售额同比增长29.4%。全国总额的同比增速介于两者之间；结合选项，答案为A。',
  }),
  question(dataAnalysisSource, {
    id: 'bj2025offcn-data-q2', moduleId: 'data-analysis', subjectId: 'data-analysis',
    topicId: 'data-analysis:growth', knowledgePointIds: ['data-analysis:growth-rate'], originalQuestionNo: 2,
    stem: '1—8月，房地产开发企业土地购置面积12236万平方米，同比下降25.6%，每平方米土地价格同比上涨4.5%，土地成交额6374亿元。问题：2019年1—8月，房地产开发企业土地成交额与去年同期相比增长约：',
    options: ['-17%', '-22%', '-27%', '1.2%'], correctAnswer: 'B',
    explanation: '中公解析：土地成交额等于土地购置面积乘以每平方米土地价格，增长率约为(1−25.6%)×(1+4.5%)−1≈−22%，选择B。',
  }),
  question(quantitativeSource, {
    id: 'bj2025offcn-quant-q1', moduleId: 'quantitative', subjectId: 'quantitative',
    topicId: 'quantitative:common-models', knowledgePointIds: ['quantitative:periodic-schedule'], originalQuestionNo: 1,
    stem: '由于国庆节的到来，某旅游城市的游客数量大幅上涨，公交公司决定简化公交车的线路，缩短单程时间。现有1、2、3路公交车，于上午7点同时从车站发车，三辆公交车再次回到车站所用时间分别为30分钟、45分钟、60分钟。这三辆公交车中间不休息，请问第二次它们同时到达车站将是几点?',
    options: ['10点', '10点30分', '13点', '13点30分'], correctAnswer: 'C',
    explanation: '中公解析：30、45、60的最小公倍数为180分钟，因此它们每隔180分钟同时到达一次。第二次同时到达需要360分钟，即6小时后，为13点，选择C。',
  }),
  question(quantitativeSource, {
    id: 'bj2025offcn-quant-q3', moduleId: 'quantitative', subjectId: 'quantitative',
    topicId: 'quantitative:arithmetic-basics', knowledgePointIds: ['quantitative:profit'], originalQuestionNo: 3,
    stem: '双十一来临之际，某商家开始进行活动，已知某件商品原价999,在使用了100元抵199元的优惠券后打九折并减40元，这时候的价格仍有10%的利润，那么这件商品进价是多少?',
    options: ['600', '660', '700', '770'], correctAnswer: 'C',
    explanation: '中公解析：使用100元抵199元的优惠券后，价格为999−99=900元；打九折并减40元后售价为900×0.9−40=770元。售价是进价的1.1倍，因此进价为770÷1.1=700元，选择C。',
  }),
];
})();
