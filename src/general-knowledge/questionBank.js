import { IMPORTED_SOURCE_QUESTIONS } from '../aptitude/importedQuestionData.js';
import { JIANGXI_2026_RECALL_QUESTIONS } from '../aptitude/jiangxi2026RecallData.js';
import { JIANGXI_2025_RECALL_QUESTIONS } from '../aptitude/jiangxi2025RecallData.js';
import { HEBEI_2025_RECALL_QUESTIONS } from '../aptitude/hebei2025RecallData.js';
import { HUBEI_2024_RECALL_QUESTIONS } from '../aptitude/hubei2024RecallData.js';
import { NATIONAL_2025_DEPUTY_RECALL_QUESTIONS } from '../aptitude/national2025DeputyRecallData.js';
import { NATIONAL_2026_CITY_RECALL_QUESTIONS } from '../aptitude/national2026CityRecallData.js';
import { BEIJING_2021_DISTRICT_GENERAL_KNOWLEDGE_QUESTIONS } from '../aptitude/beijing2021DistrictGeneralKnowledgeData.js';
import { BEIJING_OFFCN_MOCK_QUESTIONS } from '../aptitude/beijingOffcnMockData.js';
import { getGeneralKnowledgeTree } from './knowledge.js';

const sourcedKnowledgeQuestion = (question, source) => ({
  ...question,
  options: question.options.map((option, index) => {
    const value = typeof option === 'string' ? { text: option } : option || {};
    return { ...value, id: value.id || ['A', 'B', 'C', 'D'][index], text: String(value.text || '') };
  }),
  sourceType: source.sourceType,
  sourceId: source.sourceId,
  sourceTitle: source.sourceTitle,
  sourceNote: source.sourceNote,
  sourceUrl: source.url || null,
  region: source.region,
  examYear: source.examYear,
  paperId: source.paperId,
  paperTitle: source.paperTitle,
  answerSourceUrl: source.answerUrl || null,
  sectionOrder: 2,
  sharedStimulusId: null,
  verificationStatus: 'verified',
  copyrightStatus: (question.copyrightStatus || source.copyrightStatus) === 'user_confirmed_republication_authorization'
    ? 'licensed'
    : question.copyrightStatus || source.copyrightStatus || 'adapted_public_source',
  publishStatus: 'published',
  presentationMode: question.presentationMode || source.presentationMode || 'adapted',
});

const anhuiOutlineSource = {
  sourceType: 'official_outline_example', sourceId: 'anhui-2026-outline',
  sourceTitle: '安徽省2026年度公务员考试大纲公开例题（摘要改写）',
  sourceNote: '来自安徽省2026年度考试大纲中的公开例题。题干与选项作摘要改写，保留考点与答案，不是历年考试真题。',
  region: 'anhui', examYear: 2026, paperId: 'anhui-2026-outline',
  paperTitle: '安徽省2026年行测大纲例题',
  url: 'https://rsj.huainan.gov.cn/group4/M00/11/14/rB40qWlooVmAFWHRAA3nByKSHRA495.pdf?attachDownload=1',
};
const zhejiangRecallSource = {
  sourceType: 'recalled', sourceId: 'zhejiang-2025a-recall',
  sourceTitle: '2025年浙江省考行测A类（考生回忆版，摘要改写）',
  sourceNote: '来源为第三方公开考生回忆版；题干与选项作摘要改写，答案与公开答案页核对。非官方发布原卷。',
  region: 'zhejiang', examYear: 2025, paperId: 'zhejiang-2025-A-类',
  paperTitle: '2025年浙江A类行测回忆卷', url: 'https://gwy.gkzhenti.cn/paper/1739531137130', answerUrl: 'https://gwy.gkzhenti.cn/answer/1739531137130',
};

export const GENERAL_KNOWLEDGE_QUESTION_BANK = [
  {
    id: 'gk-official-2026-fermentation', moduleId: 'general_knowledge', subjectId: 'technology', topicId: 'technology:biology',
    knowledgePointIds: ['technology:microorganisms'], stem: '国考2026年考试大纲常识例题考查传统酿造过程。以下哪项最能解释发酵环节的关键作用？',
    options: [{ id: 'A', text: '微生物参与底物代谢并产生相应产物' }, { id: 'B', text: '原料在密闭条件下自动变成金属' }, { id: 'C', text: '只有水分蒸发，不发生物质变化' }, { id: 'D', text: '必须由阳光直接提供全部反应物' }],
    correctAnswer: 'A', explanation: '发酵依赖微生物代谢。本站用短题意重述官方大纲例题的知识点，不复刻原题题面。', difficulty: 'easy',
    sourceType: 'official_outline_example', sourceId: 'gwy-2026-outline', sourceTitle: '2026年考试大纲常识判断例题（题意重述）',
    sourceNote: '按官方大纲公开例题所考的发酵与微生物知识改写；不是正式考试真题。', region: 'national', examYear: 2026,
    verificationStatus: 'verified', copyrightStatus: 'adapted_public_source', publishStatus: 'published', presentationMode: 'adapted',
  },
  {
    id: 'gk-official-2026-history', moduleId: 'general_knowledge', subjectId: 'history', topicId: 'history:modern',
    knowledgePointIds: ['history:revolutionary-period'], stem: '2026年官方考试大纲公布的常识例题以历史事件对应为考法。与1949年4月人民解放军占领南京这一事件相符的是哪项？',
    options: [{ id: 'A', text: '南京解放，国民党政权在大陆的统治结束' }, { id: 'B', text: '辛亥革命爆发' }, { id: 'C', text: '五四运动发生' }, { id: 'D', text: '抗日战争全面爆发' }],
    correctAnswer: 'A', explanation: '这是官方大纲例题所对应历史事实的题意重述。题目属于大纲例题改写，不是1949年原始试题。', difficulty: 'easy',
    sourceType: 'official_outline_example', sourceId: 'gwy-2026-outline', sourceTitle: '2026年考试大纲常识判断例题（题意重述）',
    sourceNote: '根据官方大纲公开历史例题及其解析重述，不展示原诗句或完整原题。', region: 'national', examYear: 2026,
    verificationStatus: 'verified', copyrightStatus: 'adapted_public_source', publishStatus: 'published', presentationMode: 'adapted',
  },
  {
    id: 'gk-official-2026-reaction', moduleId: 'general_knowledge', subjectId: 'technology', topicId: 'technology:chemistry',
    knowledgePointIds: ['technology:reactions'], stem: '2026年官方大纲常识例题区分了石灰石高温制取二氧化碳的反应类型。该反应属于哪一类？',
    options: [{ id: 'A', text: '分解反应' }, { id: 'B', text: '复分解反应' }, { id: 'C', text: '置换反应' }, { id: 'D', text: '化合反应' }],
    correctAnswer: 'A', explanation: '一种化合物受热生成多种物质，属于分解反应。本站对官方大纲例题作简短改写。', difficulty: 'easy',
    sourceType: 'official_outline_example', sourceId: 'gwy-2026-outline', sourceTitle: '2026年考试大纲常识判断例题（题意重述）',
    sourceNote: '根据官方大纲常识例题涉及的反应类型重述；不是正式考试真题。', region: 'national', examYear: 2026,
    verificationStatus: 'verified', copyrightStatus: 'adapted_public_source', publishStatus: 'published', presentationMode: 'adapted',
  },
  {
    id: 'gk-original-beijing-12345', moduleId: 'general_knowledge', subjectId: 'beijing', topicId: 'beijing:city-governance',
    knowledgePointIds: ['beijing:12345-response'], stem: '按照《北京市接诉即办工作条例》所述机制，接诉即办工作主要包括哪组环节？',
    options: [{ id: 'A', text: '快速响应、高效办理、及时反馈、主动治理' }, { id: 'B', text: '只收集诉求，不进行办理和反馈' }, { id: 'C', text: '由热线平台代替所有承办单位作出决定' }, { id: 'D', text: '只在年度总结时统一处理诉求' }],
    correctAnswer: 'A', explanation: '条例将接诉即办概括为快速响应、高效办理、及时反馈和主动治理。具体诉求仍由依法承担职责的单位办理。', difficulty: 'easy',
    sourceType: 'original', sourceId: 'beijing-12345-regulation', sourceTitle: '依据北京市接诉即办工作条例自编',
    sourceNote: '该练习题由本站根据官方条例概念自编，不冒充考试原题。', region: 'beijing', examYear: null,
    verificationStatus: 'verified', copyrightStatus: 'original', publishStatus: 'published', validAsOf: '2026-10-09',
  },
  {
    id: 'gk-original-opportunity-cost', moduleId: 'general_knowledge', subjectId: 'economy', topicId: 'economy:basics',
    knowledgePointIds: ['economy:opportunity-cost'], stem: '某人选择参加培训，因此放弃了当晚最有价值的一项兼职收入。评价这一选择时，机会成本最接近哪项？',
    options: [{ id: 'A', text: '被放弃的最佳替代方案的价值' }, { id: 'B', text: '所有未选择活动价值之和' }, { id: 'C', text: '以前已经支付且无法收回的费用' }, { id: 'D', text: '培训机构的全部营业收入' }],
    correctAnswer: 'A', explanation: '机会成本是放弃的可选方案中价值最高者。沉没成本是过去已发生且无法收回的费用。', difficulty: 'easy',
    sourceType: 'original', sourceId: 'economics-intro-reference', sourceTitle: '本站原创基础概念练习',
    sourceNote: '公开题源中未找到可确认展示授权的同考点题目，按基础经济学概念自编。', region: 'general', examYear: null,
    verificationStatus: 'verified', copyrightStatus: 'original', publishStatus: 'published',
  },
  {
    id: 'gk-original-law-separation', moduleId: 'general_knowledge', subjectId: 'law', topicId: 'law:administrative-law',
    knowledgePointIds: ['law:administrative-penalty'], stem: '某行政机关拟对违法行为作出处罚。下列哪项最符合依法行政的基本要求？',
    options: [{ id: 'A', text: '有法定依据，并按法定程序查明事实后作出决定' }, { id: 'B', text: '为提高效率，可以不告知当事人任何情况' }, { id: 'C', text: '行政机关可以自行创设任何处罚种类' }, { id: 'D', text: '事实证据不清时先处罚再补证' }],
    correctAnswer: 'A', explanation: '行政处罚须有法定依据并依程序实施；事实不清、证据不足时不得作出处罚决定。此题考查稳定的行政法原则，具体条款须查询现行法律文本。', difficulty: 'medium',
    sourceType: 'original', sourceId: 'npc-law-database', sourceTitle: '依据国家法律法规数据库公开法规自编',
    sourceNote: '本站自编通用原则练习，不复刻培训题库；具体条文请以数据库现行文本为准。', region: 'general', examYear: null,
    verificationStatus: 'verified', copyrightStatus: 'original', publishStatus: 'published', validAsOf: '2026-10-09',
  },
  {
    id: 'gk-original-rights', moduleId: 'general_knowledge', subjectId: 'law', topicId: 'law:constitution',
    knowledgePointIds: ['law:citizen-rights'], stem: '下列哪项最能体现我国宪法中劳动和受教育的双重属性？',
    options: [{ id: 'A', text: '二者既是公民权利，也属于公民义务' }, { id: 'B', text: '二者均只是一种可以任意转让的财产权' }, { id: 'C', text: '二者只适用于国家机关工作人员' }, { id: 'D', text: '二者不受任何法律规则调整' }],
    correctAnswer: 'A', explanation: '宪法规定劳动和受教育既是公民的权利，也是公民的义务。', difficulty: 'easy',
    sourceType: 'original', sourceId: 'npc-constitution', sourceTitle: '依据宪法公开条文自编',
    sourceNote: '本站根据官方宪法条文自编，不冒充考试真题。', region: 'general', examYear: null,
    verificationStatus: 'verified', copyrightStatus: 'original', publishStatus: 'published',
  },
  {
    id: 'gk-original-admin-minor-correction', moduleId: 'general_knowledge', subjectId: 'law', topicId: 'law:administrative-law',
    knowledgePointIds: ['law:administrative-penalty'], stem: '某经营者的违法行为情节轻微，发现后及时改正，且没有造成危害后果。依照《行政处罚法》，下列处理正确的是？',
    options: [{ id: 'A', text: '应当不予行政处罚，但依法仍应进行教育' }, { id: 'B', text: '可以不查明事实，直接从轻处罚' }, { id: 'C', text: '只有初次违法时才必须不予处罚' }, { id: 'D', text: '须先申请听证，才能不予处罚' }],
    correctAnswer: 'A', explanation: '《行政处罚法》第三十三条第一款规定，违法行为轻微并及时改正、没有造成危害后果的，不予行政处罚；该条还要求对依法不予处罚的当事人进行教育。', difficulty: 'easy',
    sourceType: 'original', sourceId: 'admin-penalty-law-2021', sourceTitle: '依据2021年修订《行政处罚法》第三十三条自编',
    sourceNote: '本站根据工信部政府门户发布的法规全文编写原创情境题，不是历年真题。', region: 'general', examYear: null,
    verificationStatus: 'verified', copyrightStatus: 'original', publishStatus: 'published', validAsOf: '2026-10-09',
  },
  {
    id: 'gk-original-admin-first-violation', moduleId: 'general_knowledge', subjectId: 'law', topicId: 'law:administrative-law',
    knowledgePointIds: ['law:administrative-penalty'], stem: '某单位初次发生违法行为，危害后果轻微，并已及时改正。关于行政机关能否不予处罚，正确的是？',
    options: [{ id: 'A', text: '符合条件就一律应当不予处罚' }, { id: 'B', text: '可以不予行政处罚' }, { id: 'C', text: '只能改为行政强制措施' }, { id: 'D', text: '必须处以罚款，不得裁量' }],
    correctAnswer: 'B', explanation: '《行政处罚法》第三十三条第二款使用“可以不予行政处罚”，与第一款满足条件时“不予行政处罚”的规定不同；题目中的“初次违法”不能单独推出必须免罚。', difficulty: 'medium',
    sourceType: 'original', sourceId: 'admin-penalty-law-2021', sourceTitle: '依据2021年修订《行政处罚法》第三十三条自编',
    sourceNote: '本站根据工信部政府门户发布的法规全文编写原创辨析题，不是历年真题。', region: 'general', examYear: null,
    verificationStatus: 'verified', copyrightStatus: 'original', publishStatus: 'published', validAsOf: '2026-10-09',
  },
  {
    id: 'gk-original-admin-hearing-rights', moduleId: 'general_knowledge', subjectId: 'law', topicId: 'law:administrative-law',
    knowledgePointIds: ['law:administrative-penalty'], stem: '行政机关拟对当事人作出行政处罚，当事人提交了陈述、申辩和相关证据。下列做法符合《行政处罚法》的是？',
    options: [{ id: 'A', text: '事前告知拟处罚内容、事实、理由、依据和相关权利，并听取、复核当事人的意见和证据' }, { id: 'B', text: '只要拟处罚事实已告知，就可以不审查当事人新提交的证据' }, { id: 'C', text: '当事人提出申辩的，可以据此加重处罚' }, { id: 'D', text: '先作出处罚决定，再补告知和听取意见' }],
    correctAnswer: 'A', explanation: '第四十四条要求在作出处罚决定前告知拟处罚内容及事实、理由、依据和相关权利；第四十五条要求充分听取陈述申辩、复核相关事实和证据，成立的应予采纳，且不得因当事人陈述申辩而给予更重处罚。第六十二条对违反上述告知、听取要求的决定作了限制。', difficulty: 'medium',
    sourceType: 'original', sourceId: 'admin-penalty-law-2021', sourceTitle: '依据2021年修订《行政处罚法》第四十四、四十五、六十二条自编',
    sourceNote: '本站根据工信部政府门户发布的法规全文编写原创程序辨析题，不是历年真题。', region: 'general', examYear: null,
    verificationStatus: 'verified', copyrightStatus: 'original', publishStatus: 'published', validAsOf: '2026-10-09',
  },
  {
    id: 'gk-original-review-deadline', moduleId: 'general_knowledge', subjectId: 'law', topicId: 'law:administrative-law',
    knowledgePointIds: ['law:administrative-remedies'], stem: '法律没有另行规定更长期限时，公民通常应在知道或者应当知道行政行为之日起多少日内提出行政复议申请？',
    options: [{ id: 'A', text: '三十日' }, { id: 'B', text: '六十日' }, { id: 'C', text: '九十日' }, { id: 'D', text: '六个月' }],
    correctAnswer: 'B', explanation: '2023年修订的《行政复议法》第二十条规定，通常的申请期限为知道或者应当知道行政行为之日起六十日；法律规定期限超过六十日的除外。不可抗力或其他正当理由耽误期限的，障碍消除后继续计算。', difficulty: 'easy',
    sourceType: 'original', sourceId: 'admin-reconsideration-law-2023', sourceTitle: '依据2023年修订《行政复议法》第二十条自编',
    sourceNote: '本站根据中国人大网原文（生态环境部转载）编写原创练习题，不是历年真题。', region: 'general', examYear: null,
    verificationStatus: 'verified', copyrightStatus: 'original', publishStatus: 'published', validAsOf: '2026-10-09',
  },
  {
    id: 'gk-original-review-prerequisite', moduleId: 'general_knowledge', subjectId: 'law', topicId: 'law:administrative-law',
    knowledgePointIds: ['law:administrative-remedies'], stem: '当事人不服行政机关当场作出的行政处罚决定，依照现行《行政复议法》通常应如何寻求救济？',
    options: [{ id: 'A', text: '先申请行政复议；对复议决定不服的，再依法提起行政诉讼' }, { id: 'B', text: '必须先申请行政调解，再决定是否复议' }, { id: 'C', text: '只能申请行政复议，之后不得提起行政诉讼' }, { id: 'D', text: '可以直接起诉，是否复议由行政机关决定' }],
    correctAnswer: 'A', explanation: '《行政复议法》第二十三条将不服当场作出的行政处罚决定列为复议前置情形：先申请行政复议；对复议决定不服的，可以依法向人民法院提起行政诉讼。', difficulty: 'medium',
    sourceType: 'original', sourceId: 'admin-reconsideration-law-2023', sourceTitle: '依据2023年修订《行政复议法》第二十三条自编',
    sourceNote: '本站根据中国人大网原文（生态环境部转载）编写原创程序辨析题，不是历年真题。', region: 'general', examYear: null,
    verificationStatus: 'verified', copyrightStatus: 'original', publishStatus: 'published', validAsOf: '2026-10-09',
  },
  {
    id: 'gk-original-review-oral-application', moduleId: 'general_knowledge', subjectId: 'law', topicId: 'law:administrative-law',
    knowledgePointIds: ['law:administrative-remedies'], stem: '申请人书面提交行政复议申请确有困难时，依照《行政复议法》可以采用哪种方式？',
    options: [{ id: 'A', text: '口头申请，由行政复议机构记录法定事项' }, { id: 'B', text: '只能请律师代为书面申请' }, { id: 'C', text: '向人民法院口头申请行政复议' }, { id: 'D', text: '先申请行政调解，调解不成后才可提出复议申请' }],
    correctAnswer: 'A', explanation: '《行政复议法》第二十二条允许书面申请；书面申请有困难的，也可以口头申请。行政复议机构应记录申请人的基本情况、复议请求、主要事实、理由和时间。', difficulty: 'easy',
    sourceType: 'original', sourceId: 'admin-reconsideration-law-2023', sourceTitle: '依据2023年修订《行政复议法》第二十二条自编',
    sourceNote: '本站根据中国人大网原文（生态环境部转载）编写原创程序辨析题，不是历年真题。', region: 'general', examYear: null,
    verificationStatus: 'verified', copyrightStatus: 'original', publishStatus: 'published', validAsOf: '2026-10-09',
  },
  {
    id: 'gk-original-ballastless-track', moduleId: 'general_knowledge', subjectId: 'technology', topicId: 'technology:physics',
    knowledgePointIds: ['technology:railway-track'], stem: '关于高速铁路常见的无砟轨道，下列说法正确的是？',
    options: [{ id: 'A', text: '以轨道板等结构承托钢轨，具有较好的稳定性和平顺性' }, { id: 'B', text: '轨道结构中必须铺满松散碎石道砟' }, { id: 'C', text: '不需要路基、桥梁等线下基础配合' }, { id: 'D', text: '钢轨直接铺在普通道路表面即可' }],
    correctAnswer: 'A', explanation: '无砟轨道采用轨道板等结构替代散粒道砟。国家铁路局资料介绍了高速铁路无砟轨道结构及其稳定、平顺、耐久等特点；轨道结构仍需与路基、桥梁等基础系统匹配。', difficulty: 'medium',
    sourceType: 'original', sourceId: 'railway-high-speed-design', sourceTitle: '依据国家铁路局高速铁路设计资料自编',
    sourceNote: '独立编写的知识点练习，承接搜集索引中的高速铁路轨道技术考点，不复刻原卷题面。', region: 'general', examYear: null,
    verificationStatus: 'verified', copyrightStatus: 'original', publishStatus: 'published', validAsOf: '2026-10-09',
  },
  {
    id: 'gk-original-lunar-eclipse', moduleId: 'general_knowledge', subjectId: 'geography', topicId: 'geography:natural',
    knowledgePointIds: ['geography:eclipse'], stem: '月全食期间，月面常呈暗红色或古铜色，主要原因是？',
    options: [{ id: 'A', text: '月球内部发光并穿过地球阴影' }, { id: 'B', text: '地球大气折射部分红光进入本影并照到月面' }, { id: 'C', text: '太阳停止发光，月面自行升温' }, { id: 'D', text: '月球进入太阳表面并反射红色火焰' }],
    correctAnswer: 'B', explanation: '地球处在太阳和月球之间时，地球大气会折射部分阳光进入本影；短波长光较易被散射，剩余红色光照到月面，形成暗红或古铜色外观。', difficulty: 'easy',
    sourceType: 'original', sourceId: 'lunar-eclipse-science', sourceTitle: '依据中国科学院紫金山天文台科普资料自编',
    sourceNote: '独立编写的知识点练习，参考搜集索引中的月全食考点，不复制回忆题面。', region: 'general', examYear: null,
    verificationStatus: 'verified', copyrightStatus: 'original', publishStatus: 'published', validAsOf: '2026-10-09',
  },
  {
    id: 'gk-original-thermal-printing', moduleId: 'general_knowledge', subjectId: 'technology', topicId: 'technology:information',
    knowledgePointIds: ['technology:thermal-printing'], stem: '超市小票使用热敏纸打印文字时，文字形成的关键过程是？',
    options: [{ id: 'A', text: '打印针逐点击打纸面留下凹痕' }, { id: 'B', text: '喷墨喷头将颜料液滴喷到普通纸上' }, { id: 'C', text: '打印头加热局部热敏涂层，使其显色' }, { id: 'D', text: '激光把纸张表面直接切开' }],
    correctAnswer: 'C', explanation: '热敏纸表面有热敏涂层，打印头对特定位置加热后，涂层中的显色体系发生变化形成文字，不依靠针头击打或喷墨。', difficulty: 'easy',
    sourceType: 'original', sourceId: 'thermal-printing-science', sourceTitle: '依据政府科普资料自编',
    sourceNote: '独立编写的知识点练习，承接搜集索引中的小票打印技术考点，不采用原题面。', region: 'general', examYear: null,
    verificationStatus: 'verified', copyrightStatus: 'original', publishStatus: 'published', validAsOf: '2026-10-09',
  },
  sourcedKnowledgeQuestion({
    id: 'ah2026-outline-common-1', moduleId: 'general_knowledge', subjectId: 'history', topicId: 'history:ancient',
    knowledgePointIds: ['history:reform-measures'], originalQuestionNo: '常识判断例题1',
    stem: '以下古代改革人物与措施的对应中，哪一项不正确？',
    options: ['商鞅—推动土地制度调整', '王安石—向农户提供青苗类借贷', '张居正—推行土地丈量等改革', '康有为—主张国家垄断山海资源'], correctAnswer: 'D', difficulty: 'medium',
    explanation: '这是安徽省2026年考试大纲公开例题的摘要改写。大纲答案为D；其余三项与常见改革措施对应，D项将相关主张错配给康有为。',
    originalQuestionNo: '常识判断例题1', sectionOrder: 2,
  }, anhuiOutlineSource),
  sourcedKnowledgeQuestion({
    id: 'ah2026-outline-common-2', moduleId: 'general_knowledge', subjectId: 'technology', topicId: 'technology:physics',
    knowledgePointIds: ['technology:isotope-applications'], originalQuestionNo: '常识判断例题2',
    stem: '同位素可用于年代测定、来源追踪、核医学和呼气检测等。以下哪项检查主要利用超声波，而非同位素？',
    options: ['测定化石年代', '识别有机蔬菜产地', '甲状腺超声检查', '呼气法检测幽门螺杆菌'], correctAnswer: 'C', difficulty: 'easy',
    explanation: '安徽省2026年考试大纲的例题答案为C。超声检查利用声波在机体组织中的传播与回波，不属于同位素技术。',
    originalQuestionNo: '常识判断例题2', sectionOrder: 2,
  }, anhuiOutlineSource),
  sourcedKnowledgeQuestion({
    id: 'zja2025-q11', moduleId: 'general_knowledge', subjectId: 'economy', topicId: 'economy:macro',
    knowledgePointIds: ['economy:counter-cyclical-policy'], originalQuestionNo: 11,
    stem: '关于2024年9月中央政治局对经济工作的部署，以下哪项表述不准确？',
    options: ['通过降准和降息增强政策支持', '减少财政支出并降低逆周期调节力度', '把促消费与改善民生结合起来', '我国经济基本面及市场韧性仍有支撑'], correctAnswer: 'B', difficulty: 'medium',
    explanation: '公开答案页给出的答案为B。会议要求加大逆周期调节力度，并将促消费与惠民生结合；选项B把政策方向说反。',
    originalQuestionNo: 11, sectionOrder: 2, factCheckSourceIds: ['politburo-20240926'],
  }, zhejiangRecallSource),
  sourcedKnowledgeQuestion({
    id: 'zja2025-common-13', moduleId: 'general_knowledge', subjectId: 'history', topicId: 'history:ancient',
    knowledgePointIds: ['history:forbidden-city-history'], originalQuestionNo: 13,
    stem: '关于故宫及故宫博物院，以下说法哪项不正确？',
    options: ['紫禁城由明太祖朱元璋决定营建', '故宫位于2024年列入世界遗产名录的北京中轴线上', '故宫收藏有《清明上河图》《平复帖》等文物', '博物院持续开发文创产品传播馆藏文化'], correctAnswer: 'A', difficulty: 'medium',
    explanation: '公开答案页给出的答案为A。紫禁城的营建始于明成祖朱棣时期，并非明太祖朱元璋决定营建。',
    originalQuestionNo: 13, sectionOrder: 2, factCheckSourceIds: ['palace-history'],
  }, zhejiangRecallSource),
  sourcedKnowledgeQuestion({
    id: 'zja2025-common-14', moduleId: 'general_knowledge', subjectId: 'law', topicId: 'law:civil-law',
    knowledgePointIds: ['law:civil-property-transfer'], originalQuestionNo: 14,
    stem: '以下民事法律情形中，哪项符合《民法典》规定？',
    options: ['借款双方可约定完全排除诉讼时效', '成年人可只通过家庭成员口头约定指定意定监护人', '遗产继承开始时，应为尚未出生的胎儿保留继承份额', '承租人对房屋续租一律享有法定优先权'], correctAnswer: 'C', difficulty: 'medium',
    explanation: '公开答案页给出的答案为C。《民法典》规定，遗产分割时应保留胎儿的继承份额；胎儿娩出时为死体的，再按法律规定处理。',
    originalQuestionNo: 14, sectionOrder: 2, factCheckSourceIds: ['npc-civil-code'],
  }, zhejiangRecallSource),
  sourcedKnowledgeQuestion({
    id: 'zja2025-common-15', moduleId: 'general_knowledge', subjectId: 'law', topicId: 'law:constitution',
    knowledgePointIds: ['law:ethnic-autonomy'], originalQuestionNo: 15,
    stem: '关于民族自治地方及其治理，以下哪项说法不正确？',
    options: ['中华民族具有多元一体特征', '自治地方的自治机关包括同级人大和人民政府', '各类少数民族干部均享有普遍优先任用权，自治地方主要负责人除外', '国家推动普及国家通用语言文字和统编教材'], correctAnswer: 'C', difficulty: 'medium',
    explanation: '公开答案页给出的答案为C。法律对自治地方主要负责人的民族身份有规定，但不存在选项所称的普遍少数民族干部优先任用权。',
    originalQuestionNo: 15, sectionOrder: 2, factCheckSourceIds: ['ethnic-autonomy-law'],
  }, zhejiangRecallSource),
  sourcedKnowledgeQuestion({
    id: 'zja2025-common-16', moduleId: 'general_knowledge', subjectId: 'economy', topicId: 'economy:money',
    knowledgePointIds: ['economy:lpr-mechanism'], originalQuestionNo: 16,
    stem: '贷款市场报价利率（LPR）下调后，以下哪项说法不准确？',
    options: ['可以提高居民储蓄收益和收入水平', '有助于减轻部分住房贷款利息负担', '有助于降低企业融资成本', '可能支持企业投资和就业'], correctAnswer: 'A', difficulty: 'medium',
    explanation: '公开答案页给出的答案为A。LPR是贷款定价参考，下降可能降低借款成本，但不会自动增加居民存款利息收入。',
    originalQuestionNo: 16, sectionOrder: 2, factCheckSourceIds: ['pbc-lpr'],
  }, zhejiangRecallSource),
  sourcedKnowledgeQuestion({
    id: 'zja2025-common-17', moduleId: 'general_knowledge', subjectId: 'technology', topicId: 'technology:space',
    knowledgePointIds: ['technology:space-battery'], originalQuestionNo: 17,
    stem: '关于神舟十八号、神舟十九号任务及载人飞船技术，以下哪项表述不正确？',
    options: ['神舟十九号属于空间站应用发展阶段载人飞行任务', '乘组中有两位“90后”航天员', '自神舟十八号起，主电源储能电池由锂离子改为镉镍，且能量密度更高、质量更轻', '神舟飞船是我国自主研制的天地往返载人航天器'], correctAnswer: 'C', difficulty: 'medium',
    explanation: '公开答案页给出的答案为C。技术升级方向是由镉镍电池改为锂离子电池，题目将更换方向和性能特点倒置。',
    originalQuestionNo: 17, sectionOrder: 2, factCheckSourceIds: ['spacecraft-battery-upgrade'],
  }, zhejiangRecallSource),
  sourcedKnowledgeQuestion({
    id: 'zja2025-common-18', moduleId: 'general_knowledge', subjectId: 'history', topicId: 'history:ancient',
    knowledgePointIds: ['history:liangzhu-culture'], originalQuestionNo: 18,
    stem: '关于良渚文化、河姆渡文化及相关活动地点，以下哪项说法不正确？',
    options: ['良渚遗址被发现的时间早于河姆渡遗址', '杭州亚运会火种在河姆渡遗址公园采集', '良渚考古丰富了对中华文明多元起源的认识', '河姆渡文化以稻作农业为重要经济基础'], correctAnswer: 'B', difficulty: 'medium',
    explanation: '公开答案页给出的答案为B。杭州亚运会火种采集于良渚古城遗址，不是河姆渡遗址公园。',
    originalQuestionNo: 18, sectionOrder: 2, factCheckSourceIds: ['hangzhou-2022-flame', 'unesco-liangzhu'],
  }, zhejiangRecallSource),
  sourcedKnowledgeQuestion({
    id: 'zja2025-common-19', moduleId: 'general_knowledge', subjectId: 'humanities', topicId: 'humanities:tradition',
    knowledgePointIds: ['humanities:lantern-festival-poetry'], originalQuestionNo: 19,
    stem: '题干中的诗句描写正月中旬京城夜间灯火盛景。以下哪一项所写节日与之相同？',
    options: ['登高赏菊和佩戴茱萸', '秋月照临中秋之夜', '鼓声中两队龙舟竞渡', '钱塘正月十五灯会'], correctAnswer: 'D', difficulty: 'easy',
    explanation: '公开答案页给出的答案为D。正月十五灯会对应元宵节；登高赏菊对应重阳，秋月常指中秋，龙舟竞渡常指端午。',
    originalQuestionNo: 19, sectionOrder: 2, factCheckSourceIds: ['lantern-festival-poem'],
  }, zhejiangRecallSource),
  sourcedKnowledgeQuestion({
    id: 'zja2025-common-20', moduleId: 'general_knowledge', subjectId: 'technology', topicId: 'technology:chemistry',
    knowledgePointIds: ['technology:capsaicin-solubility'], originalQuestionNo: 20,
    stem: '以下日常生活说法中，哪项正确？',
    options: ['蚊虫叮咬后用热敷可快速消肿止痒', '酒精可溶解辣椒素，手部沾辣后可用其辅助清洁', '煤气泄漏时应立刻开关电灯排查来源', '高血压人群应避免运动以防血管压力升高'], correctAnswer: 'B', difficulty: 'easy',
    explanation: '公开答案页给出的答案为B。辣椒素较易溶于乙醇等有机溶剂。煤气泄漏时不要操作电器开关，应避免产生火花并按消防指引处置。',
    originalQuestionNo: 20, sectionOrder: 2, factCheckSourceIds: ['pku-capsaicin-chemistry', 'china-fire-gas-safety'],
  }, zhejiangRecallSource),
];

const beijing2023RecallSource = {
  sourceType: 'recalled', sourceId: 'beijing-2023-recall',
  sourceTitle: '2023年北京市公务员录用考试《行测》真题（考生回忆版）',
  sourceNote: '题面按星光公考公开考生回忆版原文收录；用户已确认获得题面转载授权。该资料为考生回忆版，非官方原卷；答案与解析根据公开答案资料逐题核验。',
  region: 'beijing', examYear: 2023, paperId: 'bj-2023-全卷-21',
  paperTitle: '2023年北京市公务员录用考试《行测》真题（考生回忆版）',
  url: 'https://upload.xingguanggongkao.com/pdf/2023%E5%8C%97%E4%BA%AC%E8%A1%8C%E6%B5%8B%E7%9C%9F%E9%A2%98.pdf?time=1702375769',
  answerUrl: 'https://exam2.gwyks.cn/papermain/downloadPDF?id=3638388&type=2',
  copyrightStatus: 'user_confirmed_republication_authorization',
  presentationMode: 'verbatim_authorized',
};

GENERAL_KNOWLEDGE_QUESTION_BANK.push(
  sourcedKnowledgeQuestion({
    id: 'bj2023-q1', moduleId: 'general_knowledge', subjectId: 'humanities', topicId: 'humanities:literature',
    knowledgePointIds: ['humanities:people-first-classics'], originalQuestionNo: 1,
    stem: '人民性是马克思主义的本质属性。始终同人民在一起，为人民利益而奋斗，是马克思主义政党同其他政党的根本区别。围绕开辟马克思主义中国化时代化新境界，党的二十大报告明确提出了“六个坚持”，其中居于首位的就是“必须坚持人民至上”。下列古语中，蕴含了“人民至上”观点的有：\n①治国有常，利民为本\n②君子务本，本立而道生\n③民惟邦本，本固邦宁\n④天下之事无小大皆决于上',
    options: ['①②', '①③', '②③', '②④'], correctAnswer: 'B', difficulty: 'easy',
    explanation: '公开解析给出的答案为B。①强调治理以利民为本，③说明人民是国家根本；②谈个人修身，④强调权力集中，均不表达人民至上。',
    originalQuestionNo: 1, factCheckSourceIds: ['cpc-20th-report'],
  }, beijing2023RecallSource),
  sourcedKnowledgeQuestion({
    id: 'bj2023-q2', moduleId: 'general_knowledge', subjectId: 'economy', topicId: 'economy:development',
    knowledgePointIds: ['economy:rural-urban-development'], originalQuestionNo: 2,
    stem: '全面建设社会主义现代化国家，最艰巨最繁重的任务仍然在农村。党的二十大报告强调，要坚持农业农村优先发展，坚持城乡融合发展，畅通城乡要素流动。下列关于现代化进程中城乡关系的理解，不正确的是：',
    options: ['现代化进程中城乡将长期共生并存', '需要强化以工补农、以城带乡，加快形成工农互促、城乡互补、协调发展、共同繁荣的新型工农城乡关系', '现代化进程中应努力使城的比重和乡的比重保持稳定', '应不断缩小城乡发展差距和居民生活水平差距，扎实推进以县城为重要载体的城镇化'], correctAnswer: 'C', difficulty: 'medium',
    explanation: '公开解析给出的答案为C。城镇化过程中城乡人口比例会变化，但乡村不会因此消失；城乡融合强调互补、协调和共同发展。',
    originalQuestionNo: 2, factCheckSourceIds: ['cpc-20th-report'],
  }, beijing2023RecallSource),
  sourcedKnowledgeQuestion({
    id: 'bj2023-q3', moduleId: 'general_knowledge', subjectId: 'economy', topicId: 'economy:basics',
    knowledgePointIds: ['economy:income-distribution'], originalQuestionNo: 3,
    stem: '习近平总书记在党的二十大报告中指出：“坚持按劳分配为主体、多种分配方式并存，构建初次分配、再分配、第三次分配协调配套的制度体系。”这一重要部署，对于正确处理效率与公平的关系，在发展的基础上不断增进人民福祉，逐步缩小收入差距，朝共同富裕的目标迈进具有重要意义。下列关于第三次分配的表述，正确的有：\n①以政府调节机制为主导，通过征收税收和政府非税收入实现\n②社会组织和社会力量是第三次分配的中坚力量\n③“非强制性”是其有别于再分配的关键差异\n④通过社会保障、转移支付等方式，促进基本公共服务均等化',
    options: ['①③', '②③', '②④', '③④'], correctAnswer: 'B', difficulty: 'medium',
    explanation: '公开解析给出的答案为B。第三次分配主要由社会力量依据自愿原则通过公益慈善等方式参与；税收、社会保障和转移支付属于再分配的重要机制。',
    originalQuestionNo: 3, factCheckSourceIds: ['ndrc-three-distributions'],
  }, beijing2023RecallSource),
  sourcedKnowledgeQuestion({
    id: 'bj2023-q4', moduleId: 'general_knowledge', subjectId: 'governance', topicId: 'governance:social-security',
    knowledgePointIds: ['governance:employment-policy'], originalQuestionNo: 4,
    stem: '党的二十大报告指出，健全就业公共服务体系，完善重点群体就业支持体系，加强困难群体就业兜底帮扶。下列措施中，能够对促进更加充分、更高质量就业起到支持作用的有：\n①出台让劳动者免遭歧视的政策细则\n②深化产教融合、校企合作，健全终身职业技能培训制度\n③企业提高产品价格，抵消因最低工资标准提升造成的用工成本增加\n④调整产业布局，逐步淘汰劳动密集型产业和服务外包产业',
    options: ['①②', '①④', '③④', '②④'], correctAnswer: 'A', difficulty: 'medium',
    explanation: '公开解析给出的答案为A。消除不合理就业限制并提升劳动者技能有助于扩大公平就业和岗位匹配；涨价转嫁成本与直接淘汰劳动密集型产业并非就业支持措施。',
    originalQuestionNo: 4, factCheckSourceIds: ['moe-employment-priority'],
  }, beijing2023RecallSource),
  sourcedKnowledgeQuestion({
    id: 'bj2023-q5', moduleId: 'general_knowledge', subjectId: 'philosophy', topicId: 'philosophy:materialism',
    knowledgePointIds: ['philosophy:dialectical-change'], originalQuestionNo: 5,
    stem: '“一微克”行动是指一项针对北京大气污染防治的长期任务，强调细颗粒物治理要一个微克一个微克去抠，综合运用科技、执法、管理等手段，实施大气污染精准治理。北京市践行“一微克”行动，体现了：\n①客观规律不以人的意志为转移\n②量变是质变的必要准备\n③质变可以产生新事物，质变优于量变\n④意识对改造客观世界具有指导作用',
    options: ['①②', '②③', '①④', '②④'], correctAnswer: 'D', difficulty: 'medium',
    explanation: '公开解析给出的答案为D。持续小幅治理体现量变积累，科学治理理念指导实践体现意识的能动作用；题干没有讨论规律是否客观，质变也不必然优于量变。',
    originalQuestionNo: 5, factCheckSourceIds: ['cpc-20th-report'],
  }, beijing2023RecallSource),
  sourcedKnowledgeQuestion({
    id: 'bj2023-q6', moduleId: 'general_knowledge', subjectId: 'philosophy', topicId: 'philosophy:logic',
    knowledgePointIds: ['philosophy:systems-thinking'], originalQuestionNo: 6,
    stem: '党的二十大报告明确提出“必须坚持系统观念”。下列选项中，哪一项没有体现“系统观念”所蕴含的哲理？',
    options: ['不谋万世者，不足谋一时；不谋全局者，不足谋一域', '善弈者谋势，善治者谋全局', '大河有水小河满，小河有水大河满', '一夫当关，万夫莫开'], correctAnswer: 'D', difficulty: 'easy',
    explanation: '公开解析给出的答案为D。系统观念要求看整体、联系与协同；单点防守并不能替代对全局及各部分关系的分析。',
    originalQuestionNo: 6, factCheckSourceIds: ['cpc-20th-report'],
  }, beijing2023RecallSource),
  sourcedKnowledgeQuestion({
    id: 'bj2023-q7', moduleId: 'general_knowledge', subjectId: 'governance', topicId: 'governance:grassroots',
    knowledgePointIds: ['governance:political-consultation'], originalQuestionNo: 7,
    stem: '政治协商是社会主义协商民主的重要形式，是凝聚智慧、增进共识、促进科学民主决策的重要途径。2022年6月13日中共中央发布《中国共产党政治协商工作条例》。根据该条例，下列不属于政治协商对象的是：',
    options: ['民主党派', '无党派人士', '人大代表', '人民团体'], correctAnswer: 'C', difficulty: 'medium',
    explanation: '公开解析给出的答案为C。条例列明民主党派、无党派人士、人民团体等协商对象；人大代表身份本身不属于该项列举。',
    originalQuestionNo: 7, factCheckSourceIds: ['beijing-political-consultation-regulation'],
  }, beijing2023RecallSource),
  sourcedKnowledgeQuestion({
    id: 'bj2023-q8', moduleId: 'general_knowledge', subjectId: 'technology', topicId: 'technology:biology',
    knowledgePointIds: ['technology:salt-tolerant-rice'], originalQuestionNo: 8,
    stem: '我国沿海地区有大片的盐碱滩涂，过去由于无法种植粮食作物而长期抛荒。袁隆平院士等农业科学家艰苦科研攻关，成功培育并种植出了耐盐碱的“海水稻”。这说明：\n①人定胜天，人类一定能战胜大自然\n②物质决定意识，意识反作用于物质\n③科学技术是第一生产力\n④科技的进步速度取决于人的决心大小',
    options: ['①④', '②③', '①③', '②④'], correctAnswer: 'B', difficulty: 'medium',
    explanation: '公开解析给出的答案为B。科研认识和技术应用可以改造利用条件、促进生产力发展，但不能消除自然规律或保证战胜一切自然限制。',
    originalQuestionNo: 8, factCheckSourceIds: ['most-salt-tolerant-rice'],
  }, beijing2023RecallSource),
  sourcedKnowledgeQuestion({
    id: 'bj2023-q9', moduleId: 'general_knowledge', subjectId: 'law', topicId: 'law:constitution',
    knowledgePointIds: ['law:constitutional-oath'], originalQuestionNo: 9,
    stem: '下列人员中，就职时应依照法律规定公开进行宪法宣誓的是：',
    options: ['大学校长', '法院院长', '市委书记', '国企董事长'], correctAnswer: 'B', difficulty: 'easy',
    explanation: '公开解析给出的答案为B。人民法院院长依法属于就职时应进行宪法宣誓的国家工作人员；其他选项不因其职务名称就当然适用这一法定要求。',
    originalQuestionNo: 9, factCheckSourceIds: ['npc-oath-decision', 'court-judge-oath-rules'],
  }, beijing2023RecallSource),
  sourcedKnowledgeQuestion({
    id: 'bj2023-q10', moduleId: 'general_knowledge', subjectId: 'economy', topicId: 'economy:basics',
    knowledgePointIds: ['economy:institutional-transaction-cost'], originalQuestionNo: 10,
    stem: '优化营商环境，降低制度性交易成本是减轻市场主体负担，激发市场活力的重要举措。下列不属于制度性交易成本的是：',
    options: ['市场主体准入成本', '涉企收费', '市场主体办事成本', '技术创新研发成本'], correctAnswer: 'D', difficulty: 'easy',
    explanation: '公开解析给出的答案为D。准入、办事流程和涉企收费都可能由制度安排带来；研发投入属于企业正常的经营和创新成本。',
    originalQuestionNo: 10, factCheckSourceIds: ['mct-transaction-costs'],
  }, beijing2023RecallSource),
  sourcedKnowledgeQuestion({
    id: 'bj2023-q11', moduleId: 'general_knowledge', subjectId: 'economy', topicId: 'economy:basics',
    knowledgePointIds: ['economy:productivity-price'], originalQuestionNo: 11,
    stem: '当今个人计算机市场的趋势里，计算机性能越来越高，价格却越来越低，这主要是因为：',
    options: ['计算机市场供大于求', '计算机进口量大幅提高', '计算机的生产率越来越高', '计算机商品的税率越来越低'], correctAnswer: 'C', difficulty: 'easy',
    explanation: '公开解析给出的答案为C。生产率提高可能降低单位生产成本并改善性能，是题目所述趋势的主要解释；其余选项不能单独说明这一变化。',
    originalQuestionNo: 11, factCheckSourceIds: ['economics-intro-reference'],
  }, beijing2023RecallSource),
  sourcedKnowledgeQuestion({
    id: 'bj2023-q12', moduleId: 'general_knowledge', subjectId: 'law', topicId: 'law:civil-law',
    knowledgePointIds: ['law:civil-property-transfer'], originalQuestionNo: 12,
    stem: '梁奶奶在老伴早亡后，自购二类房产独居，现欲将自己名下房产过户到长期照顾自己生活起居的次女名下，合法手段不包含：',
    options: ['赠与', '拍卖', '买卖交易', '公证遗嘱'], correctAnswer: 'B', difficulty: 'medium',
    explanation: '公开解析给出的答案为B。赠与、买卖和立遗嘱均可作为自然人处分财产的方式；公开解析认为，个人不能以拍卖人身份拍卖房屋。',
    originalQuestionNo: 12, factCheckSourceIds: ['npc-civil-code'],
  }, beijing2023RecallSource),
  sourcedKnowledgeQuestion({
    id: 'bj2023-q13', moduleId: 'general_knowledge', subjectId: 'technology', topicId: 'technology:biology',
    knowledgePointIds: ['technology:seed-dispersal'], originalQuestionNo: 13,
    stem: '碧玉妆成一树高，万条垂下绿丝绦。关于诗中咏柳，下列说法错误的是：',
    options: ['主要分布在温带地区', '是中国的原生树种', '容易进行无性繁殖', '柳絮是杨柳的花'], correctAnswer: 'D', difficulty: 'easy',
    explanation: '公开解析给出的答案为D。杨柳飞絮主要是带有绒毛的种子，有助于随风传播，并不是花朵本身。',
    originalQuestionNo: 13, factCheckSourceIds: ['beijing-willow-fluff'],
  }, beijing2023RecallSource),
  sourcedKnowledgeQuestion({
    id: 'bj2023-q14', moduleId: 'general_knowledge', subjectId: 'technology', topicId: 'technology:chemistry',
    knowledgePointIds: ['technology:chemistry-in-context'], originalQuestionNo: 14,
    stem: '下列诗词与涉及的物理化学知识表述错误的是：',
    options: ['犹比至元无事日，印文铜绿长苔钱——铜绿可溶于水', '落红不是无情物，化作春泥更护花——花变为绿肥主要是化学变化', '北国风光，千里冰封，万里雪飘——冰雪都是固态的', '姑苏城外寒山寺，夜半钟声到客船——声音在空气中沿直线传播'], correctAnswer: 'A', difficulty: 'medium',
    explanation: '公开解析给出的答案为A。铜绿不易溶于水；花叶腐解包含化学变化，冰雪是固态水，声音在均匀介质中的传播方向可按直线模型分析。',
    originalQuestionNo: 14,
  }, beijing2023RecallSource),
  sourcedKnowledgeQuestion({
    id: 'bj2023-q16', moduleId: 'general_knowledge', subjectId: 'technology', topicId: 'technology:physics',
    knowledgePointIds: ['technology:railway-track'], originalQuestionNo: 16,
    stem: '下列技术中，在我国高速铁路得到广泛应用的是：',
    options: ['内燃机', '无缝钢轨', '磁悬浮', '降温池车道'], correctAnswer: 'B', difficulty: 'easy',
    explanation: '公开答案页给出的答案为B。无缝钢轨是我国高速铁路常用轨道技术之一；它与轨道结构、线路平顺性和温度应力管理共同构成线路系统。',
    originalQuestionNo: 16, factCheckSourceIds: ['nra-railway-track'],
  }, beijing2023RecallSource),
  sourcedKnowledgeQuestion({
    id: 'bj2023-q28', moduleId: 'general_knowledge', subjectId: 'history', topicId: 'history:modern',
    knowledgePointIds: ['history:historical-chronology'], originalQuestionNo: 28,
    stem: '为扩大开放，我国采取了一系列创新举措。下列与我国开放相关的重大事件中，按时间先后顺序排序，正确的是：\n①建立深圳、珠海、汕头和厦门四个经济特区\n②开放沿海14个港口城市\n③正式加入世界贸易组织\n④建立海南自由贸易港\n⑤举办首届中国（北京）国际服务贸易交易会',
    options: ['①③②④⑤', '②①③④⑤', '①②③⑤④', '②①③⑤④'], correctAnswer: 'C', difficulty: 'medium',
    explanation: '公开解析给出的顺序为：1980年设立经济特区，1984年开放沿海港口城市，2001年加入世界贸易组织，2012年举办首届京交会，2020年发布海南自由贸易港建设总体方案；对应①②③⑤④。',
    factCheckSourceIds: ['cpc-opening-timeline'],
  }, beijing2023RecallSource),
);

const importedKnowledgeTree = getGeneralKnowledgeTree();
const importedKnowledgeQuestions = [...IMPORTED_SOURCE_QUESTIONS, ...JIANGXI_2026_RECALL_QUESTIONS, ...JIANGXI_2025_RECALL_QUESTIONS, ...HEBEI_2025_RECALL_QUESTIONS, ...HUBEI_2024_RECALL_QUESTIONS, ...NATIONAL_2025_DEPUTY_RECALL_QUESTIONS, ...NATIONAL_2026_CITY_RECALL_QUESTIONS, ...BEIJING_2021_DISTRICT_GENERAL_KNOWLEDGE_QUESTIONS, ...BEIJING_OFFCN_MOCK_QUESTIONS]
  .filter((question) => question.moduleId === 'general-knowledge')
  .map((question) => {
    const subject = importedKnowledgeTree.find((item) => item.id === question.subjectId);
    const topic = subject?.topics.find((item) => item.id === question.topicId);
    const optionText = (option) => typeof option === 'string' ? option : option?.text || '';
    const questionText = `${question.stem} ${(question.options || []).map(optionText).join(' ')} ${question.explanation || ''}`;
    const topicPoints = topic?.knowledgePoints || [];
    const matchingPoint = topicPoints.find((point) => point.title
      .split(/[、，：:与/（）()]/)
      .map((term) => term.trim())
      .filter((term) => term.length > 1)
      .some((term) => questionText.includes(term)));
    const point = topicPoints.find((item) => question.knowledgePointIds?.includes(item.id)) || matchingPoint || topicPoints[0];
    return {
      ...question,
      moduleId: 'general_knowledge',
      copyrightStatus: question.copyrightStatus === 'user_confirmed_republication_authorization'
        ? 'licensed'
        : question.copyrightStatus,
      subjectTitle: subject?.title || question.subjectId,
      topicTitle: topic?.title || question.topicId,
      knowledgePointIds: question.knowledgePointIds?.length ? question.knowledgePointIds : (point ? [point.id] : []),
      knowledgePointTitle: point?.title || null,
      options: question.options.map((option, index) => {
        const value = typeof option === 'string' ? { text: option } : option || {};
        return { ...value, id: value.id || ['A', 'B', 'C', 'D'][index], text: String(value.text || '') };
      }),
    };
  });

GENERAL_KNOWLEDGE_QUESTION_BANK.push(...importedKnowledgeQuestions);
