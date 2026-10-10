import { getAptitudeModuleKnowledgeTree } from './knowledge.js';
import { IMPORTED_SOURCE_QUESTIONS } from './importedQuestionData.js';

const QUESTION_SEEDS = [
  ['political-theory', 'theory', 'practice-and-knowledge', '基础理论', '实践是检验认识是否正确的主要标准，最直接的理由是？', ['实践只会重复已有认识', '理论一经提出便自动成为真理', '实践能把认识与客观效果联系起来检验', '多数人赞同就必然正确'], 'C', '实践把主观认识置于客观活动及其结果中检验；共识和书本结论都不能替代实践检验。', 'easy'],
  ['political-theory', 'theory', 'contradiction-analysis', '矛盾分析', '同一类矛盾在不同发展阶段表现出不同特点，分析时首先应当？', ['照搬其他阶段的处理办法', '从具体条件出发分析矛盾的特殊性', '否认矛盾具有普遍性', '把所有矛盾都视为相同'], 'B', '矛盾具有普遍性，也有特殊性。具体问题具体分析，要求结合事物所处阶段和条件识别矛盾特点。', 'easy'],
  ['political-theory', 'theory', 'quantity-and-quality', '量变与质变', '一项改革措施持续积累小幅改进，达到一定程度后带来治理方式改变。最符合这一过程的概念是？', ['量变积累并在条件具备时引起质变', '质变与量变完全无关', '任何数量变化都会立刻改变性质', '事物发展只能由外力一次完成'], 'A', '量变是数量和程度上的变化，量变达到一定程度并具备条件时可能引起质变。', 'easy'],
  ['political-theory', 'theory', 'principal-contradiction', '主要矛盾', '一个地区同时面临多项发展问题，其中一项制约其他问题的解决并影响全局。这里重点要识别的是？', ['矛盾的普遍性', '矛盾双方的同一性', '矛盾的次要方面', '主要矛盾'], 'D', '主要矛盾是在复杂事物发展过程中起主导、制约作用的矛盾；它与某一矛盾内部的主要方面不同。', 'medium'],
  ['political-theory', 'theory', 'productive-relations', '生产力与生产关系', '生产工具改进后，原有组织方式已明显限制生产效率。调整组织方式的理论依据更接近哪项？', ['生产关系应适应生产力发展状况', '生产力只能由观念决定', '生产关系与生产力永远不发生联系', '组织方式变化必然降低效率'], 'A', '生产力与生产关系相互作用；生产关系需要适应生产力发展状况，适当调整可释放生产潜力。', 'medium'],
  ['political-theory', 'theory', 'people-and-history', '人民群众观点', '公共政策制定前通过调查了解群众的实际需求，最直接体现了哪种工作方法？', ['以主观设想代替调查', '把个别经验当作普遍规律', '坚持从群众中来、到群众中去', '只依据文件形式作结论'], 'C', '调查研究、听取群众意见并把意见转化为政策和实践，体现从群众中来、到群众中去的工作方法。', 'easy'],
  ['political-theory', 'theory', 'truth-and-conditions', '真理与条件', '某结论在特定条件下成立，条件变化后需要重新判断。对此理解正确的是？', ['原结论在任何条件下都不变', '真理具有客观性，也有适用条件', '条件变化说明原结论从未正确', '个人偏好决定结论真伪'], 'B', '真理反映客观规律，同时结论的具体适用范围受条件制约；条件发生变化时需要重新分析。', 'medium'],
  ['political-theory', 'theory', 'economic-base', '经济基础与上层建筑', '社会经济结构发生深刻变化后，相关制度和治理规则也需要相应调整。该联系属于？', ['自然地理对气候的影响', '个体意志对历史的单向决定', '经济基础与上层建筑的相互作用', '偶然事件之间没有条件的联系'], 'C', '经济基础决定上层建筑，上层建筑也会反作用于经济基础；制度调整应立足现实社会条件。', 'medium'],
  ['political-theory', 'theory', 'ecological-development', '人与自然关系', '治理河流污染时，既要减少污染排放，也要遵循水体自净能力和生态承载条件。该做法体现？', ['尊重客观规律并发挥人的能动作用', '人的意志可以替代自然规律', '只要治理投入足够就无需监测', '自然条件与治理效果毫无关系'], 'A', '治理需要认识并遵循生态规律，同时运用科学方法采取行动；发挥主观能动性不能脱离客观条件。', 'easy'],
  ['political-theory', 'theory', 'common-prosperity', '发展与公平', '关于共同富裕，下列理解更准确的是？', ['要求所有人的收入和生活完全相同', '只追求少数地区先行发展', '强调在发展中逐步缩小差距、改善民生', '意味着可以忽视发展质量'], 'C', '共同富裕强调发展成果由人民共享，逐步改善民生、缩小差距，不等于平均主义或放弃发展。', 'medium'],
  ['political-theory', 'theory', 'dialectical-negation', '辩证否定', '技术升级中保留有效经验、淘汰不适用环节并形成新流程，更符合哪种发展观？', ['把过去的一切全部照搬', '通过辩证否定实现扬弃和发展', '否定意味着简单抛弃一切', '新旧事物之间不存在联系'], 'B', '辩证否定既克服旧事物中过时的部分，也保留其中合理因素，是联系和发展的环节。', 'medium'],
  ['political-theory', 'theory', 'system-thinking', '系统观念', '跨部门治理任务中，各单位分别优化本环节，却导致整体办理时间变长。改进时应优先？', ['只考核每个部门的单项速度', '取消部门间信息共享', '把每个环节拆开并忽略衔接', '从整体流程和协同关系分析'], 'D', '系统观念强调整体与部分的联系。治理流程需要检查衔接和协同，不能只优化局部指标。', 'medium'],

  ['verbal', 'reading', 'main-idea', '中心理解', '越来越多公共服务改用线上办理，减少了群众往返窗口的次数。但老年人、残障人士和网络条件有限的群体仍需要线下帮助。完善服务时，应同时优化线上流程和线下支持。文段意在强调？', ['公共服务数字化应与线下服务协同推进', '线上办理会完全取代线下窗口', '只有老年人需要公共服务', '减少窗口数量就能保证服务质量'], 'A', '文段先说线上办理的便利，再指出部分群体仍需要线下帮助，结论是两类服务需要协同，而非相互替代。', 'easy'],
  ['verbal', 'reading', 'word-in-context', '语境填词', '政策能否落地，既取决于目标是否清晰，也取决于部门之间能否形成____，并根据执行反馈及时调整。', ['隔阂', '协同', '偶然', '停滞'], 'B', '“部门之间形成”并与“反馈调整”搭配，表达共同配合之意，“协同”最合适。', 'easy'],
  ['verbal', 'reading', 'inference', '细节判断', '研究人员先提出一个可检验的假设，再设计实验收集证据；若结果与预测不符，就修正解释或重新检验。由此可以推出？', ['科学解释永远不能被修正', '实验结果必须符合研究者预期', '可检验性有助于科学认识接受证据检验', '提出假设后不再需要收集数据'], 'C', '材料说明假设要接受实验结果检验，结果不符时还要修正，因此可检验性和证据检验是科学研究的重要环节。', 'easy'],
  ['verbal', 'reading', 'paragraph-order', '语句排序', '将下列句子排序：①因此，比较不同地区的治理成效时，应先统一指标口径。②地区之间在人口规模、产业结构和资源条件上存在差异。③如果直接比较未经调整的总量，结论可能失真。④统一口径后，还要结合各地实际解释指标差异。', ['②③①④', '①②④③', '③①②④', '④②③①'], 'A', '②提出差异，③说明直接比较的风险，①由此给出统一口径的措施，④补充解释指标差异，逻辑顺序为②③①④。', 'medium'],
  ['verbal', 'reading', 'word-choice', '词语辨析', '面对新情况，基层单位没有照搬旧流程，而是先梳理群众反映集中的问题，再对办理环节作出调整。这种做法更适合概括为？', ['因地制宜', '无所适从', '闭门造车', '削足适履'], 'A', '结合本地实际和具体问题调整办法，符合“因地制宜”。其余词语分别表示不知怎么办、脱离实际或迁就不合适的条件。', 'easy'],
  ['verbal', 'reading', 'main-idea', '中心理解', '一项城市更新试点没有大拆大建，而是先修复老旧管线、补充公共空间，再根据居民使用情况逐步完善。实践表明，更新效果不仅取决于建设投入，也取决于是否回应真实需求。文段主要说明？', ['城市更新应以实际需求和持续改进为依据', '老旧社区不需要基础设施维护', '建设投入越多，更新效果必然越好', '城市更新只能采取大拆大建方式'], 'A', '文段通过试点说明，投入之外还要回应居民需求并根据实际使用持续改进，A概括了主旨。', 'easy'],
  ['verbal', 'reading', 'logical-fill', '逻辑填空', '完整记录数据的来源、时间和统计口径，才能使研究结果可以____，并便于其他人复核。', ['追溯', '替代', '回避', '中断'], 'A', '记录来源和口径的目的在于使数据来龙去脉可查，“追溯”与“复核”语义衔接。', 'easy'],
  ['verbal', 'reading', 'inference', '细节判断', '社区抽样调查显示，受访者普遍认为新增的遮阴设施提升了步行舒适度。调查没有测量居民的整体出行量。根据材料，不能确定的是？', ['受访者对遮阴设施的主观评价', '调查是否覆盖了全部居民', '新增设施是否被部分受访者认可', '居民整体步行出行量是否增加'], 'D', '材料只有受访者的主观评价，明确没有测量整体出行量，因此不能推出整体步行出行量的变化。', 'medium'],
  ['verbal', 'reading', 'sentence-insertion', '语句衔接', '在“平台记录了问题从受理到办结的时间。____。管理者据此发现了重复退回的环节。”中，填入最恰当的一句是？', ['这些记录还可以按业务类型进行汇总分析', '因此平台不再需要保存办理信息', '不过不同环节之间没有任何关系', '这使所有问题都无需人工处理'], 'A', '后句“据此发现”承接记录的汇总分析结果，A与上下文的因果关系连贯。', 'medium'],
  ['verbal', 'reading', 'word-choice', '词语辨析', '对公开统计数据进行解读时，应先核对指标定义和适用范围，避免把个别案例____为整体趋势。', ['概括', '外推', '核实', '标注'], 'B', '从个别案例直接推断整体趋势属于不恰当的“外推”；句中表达的是避免这种做法。', 'medium'],
  ['verbal', 'reading', 'main-idea', '中心理解', '档案数字化提高了检索速度，却也要求长期维护格式、权限和备份。只有把技术投入纳入日常管理，数字化成果才能持续发挥作用。文段强调？', ['数字化建设需要持续的管理维护', '纸质档案永远比电子档案安全', '检索速度是档案工作的唯一目标', '完成扫描即可结束档案管理'], 'A', '材料指出数字化不仅是一次性扫描，还需持续维护格式、权限和备份，A概括了核心意思。', 'easy'],
  ['verbal', 'reading', 'sentence-order', '语句排序', '将下列句子排序：①最后将核验后的结论与限制一并公开。②首先明确需要回答的问题。③再选择与问题相匹配的数据和方法。④随后检查数据来源、口径和缺失情况。', ['②③④①', '③②①④', '④②③①', '②④①③'], 'A', '研究流程先明确问题，再选数据和方法，检查数据质量，最后报告结论及限制。', 'easy'],
  ['verbal', 'reading', 'inference', '逻辑判断', '某部门规定：材料齐全的申请进入审核；材料不齐的申请会被退回补正。现在一份申请已经进入审核，可以推出？', ['这份申请必然已经批准', '这份申请在进入审核时材料齐全', '这份申请不需要审核', '所有申请的材料都相同'], 'B', '规则规定材料齐全是进入审核的条件，因此已进入审核可推出进入时材料齐全；不能推出最终批准。', 'medium'],

  ['quantitative', 'arithmetic', 'linear-equations', '方程应用', '甲、乙、丙三人共有80本书。乙比甲多4本，丙是甲的2倍。甲有多少本？', ['18本', '19本', '20本', '24本'], 'B', '设甲有x本，则乙为x+4，丙为2x。4x+4=80，解得x=19。', 'easy'],
  ['quantitative', 'arithmetic', 'relative-speed', '行程问题', '甲从同一点出发，每小时行3千米；乙晚出发，沿同方向每小时行5千米。乙出发时甲已领先18千米，乙经过多少小时追上甲？', ['6小时', '8小时', '9小时', '12小时'], 'C', '追及速度为5−3=2千米/小时，领先18千米，追及时间为18÷2=9小时。', 'easy'],
  ['quantitative', 'arithmetic', 'number-sequence', '数列规律', '数列2，6，12，20，30，下一项是？', ['36', '40', '42', '44'], 'C', '相邻差为4、6、8、10，下一差为12，所以30+12=42；也可写成连续整数乘积n(n+1)。', 'easy'],
  ['quantitative', 'arithmetic', 'work-rate', '工程问题', '6名工人合作8天完成一项工作，效率相同。若改由8名工人合作，完成同一工作需要多少天？', ['4天', '6天', '8天', '10天'], 'B', '总工作量为6×8=48人日，48÷8=6天。', 'easy'],
  ['quantitative', 'arithmetic', 'discount', '折扣问题', '某商品打八折后售价为240元，原价是多少元？', ['280元', '288元', '300元', '320元'], 'C', '折后价是原价的80%，原价为240÷0.8=300元。', 'easy'],
  ['quantitative', 'arithmetic', 'average', '平均数', '四次测验平均分为72分，前三次分别为70分、80分和75分，第四次得多少分？', ['60分', '63分', '66分', '70分'], 'B', '四次总分为72×4=288分；前三次合计225分，第四次为288−225=63分。', 'easy'],
  ['quantitative', 'arithmetic', 'probability', '概率', '袋中有3个红球和9个蓝球，随机取出1个球，取到红球的概率是？', ['1/12', '1/4', '1/3', '3/4'], 'B', '共12个球，其中3个为红球，概率为3/12=1/4。', 'easy'],
  ['quantitative', 'arithmetic', 'periodic-schedule', '周期问题', '两项每周重复的维护任务分别每4天、每6天进行一次，并在第1天同时进行。30天内两项任务同时进行的日期有几天？', ['2天', '3天', '4天', '5天'], 'B', '同时进行的周期为4和6的最小公倍数12天。第1、13、25天均在30天内，共3天。', 'medium'],
  ['quantitative', 'arithmetic', 'combinations', '排列组合', '从5名候选人中选出2名参加会议，不考虑先后次序，共有多少种选法？', ['5种', '10种', '15种', '20种'], 'B', '不考虑次序，组合数为C(5,2)=5×4÷2=10。', 'easy'],
  ['quantitative', 'arithmetic', 'average-speed', '平均速度', '一段路往返距离相同，去程速度为30千米/时，返程速度为60千米/时。全程平均速度是多少？', ['36千米/时', '40千米/时', '45千米/时', '48千米/时'], 'B', '设单程为d，总时间为d/30+d/60=d/20小时，总路程2d，因此平均速度为2d÷(d/20)=40千米/时。', 'medium'],
  ['quantitative', 'arithmetic', 'ratio-change', '比例与变化', '某物品原价90元，降价18元。降价幅度占原价的百分之几？', ['18%', '20%', '22%', '25%'], 'B', '降价幅度为18÷90=0.2，即20%。', 'easy'],
  ['quantitative', 'arithmetic', 'combined-work', '合作效率', '甲单独完成一项工作需要6小时，乙单独完成需要3小时。两人合作完成需要多少小时？', ['1小时', '2小时', '3小时', '4小时'], 'B', '两人每小时完成1/6+1/3=1/2项工作，因此完成一项需要1÷(1/2)=2小时。', 'medium'],

  ['reasoning', 'logic', 'syllogism', '必然推理', '已知“所有甲类对象都是乙类对象”“有些乙类对象是丙类对象”。必然能推出的是？', ['有些甲类对象是丙类对象', '所有乙类对象都是甲类对象', '所有甲类对象都是乙类对象', '没有甲类对象是丙类对象'], 'C', '第一条已知命题本身必然成立；“有些乙是丙”不能说明这些乙属于甲，因此A无法推出。', 'easy'],
  ['reasoning', 'logic', 'conditional', '条件推理', '若“通过审核”是“获得许可”的必要条件，且某申请未通过审核，则可以推出？', ['该申请已经获得许可', '该申请没有获得许可', '所有申请都未获许可', '通过审核不是必要条件'], 'B', '必要条件关系为“获得许可→通过审核”。未通过审核，即否定后件，可推出未获得许可。', 'medium'],
  ['reasoning', 'argument', 'causal-reasoning', '因果论证', '某地新建公园后，附近居民的健康状况有所改善。要判断改善是否由公园导致，最需要补充核实？', ['公园的命名方式', '居民健康变化前后的其他影响因素及对照情况', '公园里树木的颜色', '报道文章的篇幅'], 'B', '观察到先后变化不能单独证明因果；需要控制或比较其他因素，并设置适当对照。', 'medium'],
  ['reasoning', 'definition', 'definition-application', '定义判断', '某活动被定义为“表演者在现场向观众呈现、且表演过程与观众观看同步的艺术活动”。以下最符合定义的是？', ['观众观看预先录制并随时暂停的视频', '演员在剧场现场演出，观众同时观看', '展厅展出静态绘画作品', '观众阅读演出剧本'], 'B', 'B同时满足现场呈现、面向观众和观看同步三个要件；其余选项不符合现场表演过程。', 'easy'],
  ['reasoning', 'analogy', 'concept-relations', '类比推理', '“板鞋：鞋”的关系与下列哪组最相似？', ['玫瑰：花', '花：植物', '树：森林', '工具：扳手'], 'A', '板鞋是一种鞋，玫瑰是一种花，二者都是“具体种类：上位类别”的关系。', 'easy'],
  ['reasoning', 'logic', 'necessary-condition', '必要条件', '某制度规定：只有完成登记的项目才能申请专项资金。某项目已申请专项资金，必然可以推出？', ['项目已经完成登记', '项目一定获得资金', '项目没有任何风险', '所有登记项目都申请了资金'], 'A', '“只有完成登记才能申请”表示完成登记是申请的必要条件；已申请即可推出已登记，不能推出获批。', 'easy'],
  ['reasoning', 'argument', 'alternative-explanation', '削弱论证', '一项调查发现，参加培训的员工绩效更高，因此研究者认为培训提升了绩效。以下哪项最能削弱这一结论？', ['培训内容包含实际案例', '绩效较高的员工更容易被选入培训', '培训时长可以统计', '员工对培训形式有不同偏好'], 'B', '若高绩效员工本来就更容易参加培训，绩效差异可能来自筛选而非培训效果，因果结论受到动摇。', 'medium'],
  ['reasoning', 'sequence', 'number-pattern', '数字推理', '数列3，7，13，21，31，下一项是？', ['39', '41', '43', '45'], 'C', '相邻差依次为4、6、8、10，下一差为12，因此下一项为31+12=43。', 'easy'],
  ['reasoning', 'logic', 'category-relations', '集合关系', '已知所有松树都是树，且没有树是动物。以下哪项必然正确？', ['有些动物是松树', '所有树都是松树', '没有松树是动物', '有些松树不是树'], 'C', '松树属于树，而树与动物没有交集，因此松树与动物也没有交集。', 'easy'],
  ['reasoning', 'argument', 'evidence-evaluation', '论据评价', '研究者用蜘蛛网上采集到的微塑料数量估计一个地区的空气污染水平。评价这一指标是否可靠，最需要考察？', ['蜘蛛网颜色是否相同', '采样点、采样时间和其他颗粒来源是否可比', '研究者是否喜欢蜘蛛', '样本标签的字体大小'], 'B', '要判断指标能否代表区域空气情况，需检查样本可比性和其他来源等混杂因素。', 'medium'],
  ['reasoning', 'logic', 'statement-inference', '命题推理', '若“所有参加甲项目的人都参加乙项目”，并且小李没有参加乙项目，可以推出？', ['小李参加了甲项目', '小李没有参加甲项目', '小李参加了所有项目', '小李可能参加甲项目且未参加乙项目'], 'B', '甲项目参与者必参加乙项目；小李没有参加乙项目，因此由否定后件可知小李没有参加甲项目。', 'easy'],
  ['reasoning', 'analogy', 'function-relation', '关系类比', '“温度计：测量温度”的关系与下列哪组最相似？', ['指南针：指示方向', '纸张：书写', '医生：医院', '树叶：绿色'], 'A', '温度计的功能是测量温度，指南针的功能是指示方向，均为工具及其主要功能。', 'easy'],

  ['data-analysis', 'statistics', 'growth-rate', '增长率', '某地2024年服务业产值为120亿元，比上年增加20亿元。上年产值是多少亿元？', ['90亿元', '100亿元', '110亿元', '140亿元'], 'B', '上年产值=本年产值−增加量=120−20=100亿元。', 'easy'],
  ['data-analysis', 'statistics', 'share', '比重', '某区年度财政支出总额为500亿元，其中教育支出75亿元。教育支出占总额的比重约为？', ['12%', '15%', '18%', '25%'], 'B', '比重=部分÷整体=75÷500=15%。', 'easy'],
  ['data-analysis', 'statistics', 'base-value', '基期量', '某行业2024年收入为264亿元，同比增长10%。按同比增速计算，2023年收入为？', ['230亿元', '240亿元', '250亿元', '290.4亿元'], 'B', '现期量=基期量×(1+增长率)，所以基期量=264÷1.1=240亿元。', 'medium'],
  ['data-analysis', 'statistics', 'average', '平均数', '某单位第三季度三个月的办件量分别为21万件、24万件和27万件，月均办件量为？', ['22万件', '23万件', '24万件', '25万件'], 'C', '三个月合计72万件，72÷3=24万件。', 'easy'],
  ['data-analysis', 'statistics', 'growth-rate', '增长率', '某项指标由2000增加到2300，增幅为？', ['10%', '12%', '15%', '30%'], 'C', '增幅=(现期−基期)÷基期=(2300−2000)÷2000=15%。', 'easy'],
  ['data-analysis', 'statistics', 'increase-comparison', '增量比较', '甲行业上年规模100亿元、增长20%；乙行业上年规模60亿元、增长50%。哪一行业的增加量较大？', ['甲行业，增加20亿元', '乙行业，增加30亿元', '两者增加量相同', '无法比较'], 'B', '甲增加100×20%=20亿元；乙增加60×50%=30亿元，因此乙行业增加量较大。', 'medium'],
  ['data-analysis', 'statistics', 'percentage-point', '百分点', '一项服务的覆盖率由40%升至44%，覆盖率提高了多少个百分点？', ['4个百分点', '4%', '10个百分点', '44个百分点'], 'A', '百分点是两个百分比直接相减的差值：44%−40%=4个百分点。若问相对增幅，则为10%。', 'medium'],
  ['data-analysis', 'statistics', 'ratio', '比重计算', '某平台全年业务量为3600万件，其中线上办理900万件。线上办理占比为？', ['20%', '25%', '30%', '40%'], 'B', '900÷3600=0.25，线上办理占比为25%。', 'easy'],
  ['data-analysis', 'statistics', 'weighted-growth', '平均增长率', '甲、乙两类业务上年规模分别为200和300，甲增长10%，乙规模不变。两类业务合计增幅为？', ['2%', '4%', '5%', '10%'], 'B', '甲增加20、乙增加0，合计基数500，整体增幅20÷500=4%。', 'medium'],
  ['data-analysis', 'statistics', 'average', '平均数', '某团队上半年完成任务总量为480件，平均每月完成多少件？', ['60件', '70件', '80件', '90件'], 'C', '上半年为6个月，月均量为480÷6=80件。', 'easy'],
  ['data-analysis', 'statistics', 'relative-change', '变化幅度', '某区公共交通日均客流由80万人次增至100万人次，增长了百分之几？', ['20%', '25%', '30%', '125%'], 'B', '增幅=(100−80)÷80=25%。', 'easy'],
  ['data-analysis', 'statistics', 'data-comparison', '数据比较', '甲、乙两地同年公共服务办件量分别为120万件和90万件。甲地比乙地多多少万件？', ['20万件', '25万件', '30万件', '33.3万件'], 'C', '数量差为120−90=30万件。比较“多多少”先计算绝对差；若问“多百分之几”才再除以比较基数。', 'easy'],
];

const MODULE_IDS = ['political-theory', 'verbal', 'quantitative', 'reasoning', 'data-analysis'];

const QUESTION_POINT_SLUGS = {
  'political-theory': {
    基础理论: 'practice-and-knowledge',
    矛盾分析: 'contradiction-analysis',
    量变与质变: 'quantity-and-quality',
    主要矛盾: 'principal-contradiction',
    生产力与生产关系: 'productive-relations',
    人民群众观点: 'people-and-history',
    真理与条件: 'truth-and-conditions',
    经济基础与上层建筑: 'economic-base',
    人与自然关系: 'ecological-development',
    发展与公平: 'common-prosperity',
    辩证否定: 'dialectical-negation',
    系统观念: 'system-thinking',
  },
  verbal: {
    中心理解: 'main-idea',
    语境填词: 'context',
    细节判断: 'detail',
    语句排序: 'sentence-order',
    词语辨析: 'word-choice',
    逻辑填空: 'collocation',
    语句衔接: 'sentence-connection',
    逻辑判断: 'inference',
  },
  quantitative: {
    方程应用: 'equations',
    行程问题: 'travel',
    数列规律: 'number-patterns',
    工程问题: 'work-rate',
    折扣问题: 'profit',
    平均数: 'average',
    概率: 'probability',
    周期问题: 'periodic-schedule',
    排列组合: 'arrangements',
    平均速度: 'travel',
    比例与变化: 'ratio-percentage',
    合作效率: 'work-rate',
    数字推理: 'number-patterns',
  },
  reasoning: {
    必然推理: 'conclusion',
    条件推理: 'conditional-translation',
    因果论证: 'cause-effect',
    定义判断: 'case-matching',
    类比推理: 'logical-relations',
    必要条件: 'necessary-sufficient',
    削弱论证: 'strengthen-weaken',
    集合关系: 'conclusion',
    论据评价: 'assumption',
    命题推理: 'conditional-translation',
    关系类比: 'logical-relations',
  },
  'data-analysis': {
    增长率: 'growth-rate',
    比重: 'current-share',
    基期量: 'base-period',
    平均数: 'average-value',
    增量比较: 'growth-amount',
    百分点: 'share-change',
    比重计算: 'current-share',
    平均增长率: 'average-growth',
    变化幅度: 'growth-rate',
    数据比较: 'ranking',
  },
};

const OUTLINE_ENTRIES = new Map();
for (const moduleId of MODULE_IDS) {
  for (const subject of getAptitudeModuleKnowledgeTree(moduleId)) {
    for (const topic of subject.topics) {
      for (const point of topic.knowledgePoints) {
        OUTLINE_ENTRIES.set(point.id, { subject, topic, point });
      }
    }
  }
}

export const APTITUDE_MODULE_QUESTION_BANKS = Object.fromEntries(
  MODULE_IDS.map((moduleId) => [moduleId, []]),
);

// Keep the original question IDs resolvable for sessions saved before the module mapping was added.
export const APTITUDE_MODULE_SESSION_ARCHIVE = Object.fromEntries(
  MODULE_IDS.map((moduleId) => [moduleId, []]),
);

const archivedSequence = Object.fromEntries(MODULE_IDS.map((moduleId) => [moduleId, 0]));

function questionFromSeed(id, moduleId, subjectId, topicSlug, pointTitle, stem, optionTexts, correctAnswer, explanation, difficulty) {
  return {
    id,
    moduleId,
    subjectId,
    topicId: `${moduleId}:${topicSlug}`,
    knowledgePointIds: [`${moduleId}:${topicSlug}`],
    knowledgePointTitle: pointTitle,
    stem,
    options: optionTexts.map((text, index) => ({ id: ['A', 'B', 'C', 'D'][index], text })),
    correctAnswer,
    explanation,
    difficulty,
    sourceType: 'original',
    sourceId: null,
    sourceTitle: '本站原创专项练习',
    sourceNote: '独立编写的练习题，部分选题参考题源索引中的题型线索；不复刻原卷题面。',
    region: 'general',
    examYear: null,
    verificationStatus: 'verified',
    copyrightStatus: 'original',
    publishStatus: 'published',
  };
}

for (const [moduleId, subjectId, topicSlug, pointTitle, stem, optionTexts, correctAnswer, explanation, difficulty] of QUESTION_SEEDS) {
  const originalId = `apt-${moduleId}-${String(++archivedSequence[moduleId]).padStart(3, '0')}`;
  const archivedQuestion = questionFromSeed(originalId, moduleId, subjectId, topicSlug, pointTitle, stem, optionTexts, correctAnswer, explanation, difficulty);
  APTITUDE_MODULE_SESSION_ARCHIVE[moduleId].push(archivedQuestion);

  const publishedModuleId = moduleId === 'reasoning' && pointTitle === '数字推理' ? 'quantitative' : moduleId;
  const pointSlug = QUESTION_POINT_SLUGS[publishedModuleId]?.[pointTitle];
  const entry = pointSlug ? OUTLINE_ENTRIES.get(`${publishedModuleId}:${pointSlug}`) : null;
  if (!entry) throw new Error(`Missing aptitude outline mapping for ${moduleId}: ${pointTitle}`);

  const publishedBank = APTITUDE_MODULE_QUESTION_BANKS[publishedModuleId];
  const publishedId = publishedModuleId === moduleId
    ? originalId
    : `apt-${publishedModuleId}-${String(publishedBank.length + 1).padStart(3, '0')}`;
  publishedBank.push({
    ...archivedQuestion,
    id: publishedId,
    moduleId: publishedModuleId,
    subjectId: entry.subject.id,
    subjectTitle: entry.subject.title,
    topicId: entry.topic.id,
    topicTitle: entry.topic.title,
    knowledgePointIds: [entry.point.id],
    knowledgePointTitle: entry.point.title,
  });
}

const SOURCE_POINT_IDS = {
  'political-theory:chinese-modernization': 'political-theory:important-concepts',
  'political-theory:rural-development': 'political-theory:policy-implementation',
  'political-theory:party-theory': 'political-theory:innovation-theory',
  'political-theory:reform': 'political-theory:policy-language',
  'political-theory:high-quality-development': 'political-theory:development-concepts',
  'political-theory:public-welfare': 'political-theory:policy-goals',
  'political-theory:education': 'political-theory:policy-measures',
  'political-theory:international-relations': 'political-theory:important-concepts',
  'political-theory:social-work': 'political-theory:policy-implementation',
  'political-theory:national-defense': 'political-theory:policy-goals',
  'political-theory:ecological-civilization': 'political-theory:development-concepts',
  'verbal:contextual-word-choice': 'verbal:context',
  'quantitative:volume-displacement': 'quantitative:geometry',
  'reasoning:definition-judgment': 'reasoning:case-matching',
  'reasoning:paired-tools': 'reasoning:logical-relations',
  'reasoning:argument-criticism': 'reasoning:strengthen-weaken',
};

const sourceQuestion = (question, source) => {
  const sourcePointId = question.knowledgePointIds?.[0] || question.topicId;
  const pointId = SOURCE_POINT_IDS[sourcePointId] || sourcePointId;
  const entry = OUTLINE_ENTRIES.get(pointId);
  if (!entry) throw new Error(`Missing aptitude outline mapping for public question ${question.id}: ${sourcePointId}`);

  return {
    ...question,
    subjectId: entry.subject.id,
    subjectTitle: entry.subject.title,
    topicId: entry.topic.id,
    topicTitle: entry.topic.title,
    knowledgePointIds: [entry.point.id],
    knowledgePointTitle: entry.point.title,
    options: question.options.map((text, index) => ({ id: ['A', 'B', 'C', 'D'][index], text })),
    difficulty: question.difficulty || 'medium',
    sourceType: question.sourceType || source.sourceType,
    sourceId: question.sourceId || source.sourceId,
    sourceTitle: question.sourceTitle || source.sourceTitle,
    sourceNote: question.sourceNote || source.sourceNote,
    sourceUrl: question.sourceUrl || source.url || null,
    region: question.region || source.region,
    examYear: question.examYear ?? source.examYear,
    paperId: question.paperId || source.paperId,
    paperTitle: question.paperTitle || source.paperTitle,
    answerSourceUrl: question.answerSourceUrl || source.answerUrl || null,
    originalQuestionNo: question.originalQuestionNo,
    sectionOrder: question.sectionOrder ?? source.sectionOrder,
    sharedStimulusId: question.sharedStimulusId ?? null,
    verificationStatus: 'verified',
    copyrightStatus: question.copyrightStatus || 'adapted_public_source',
    publishStatus: 'published',
    presentationMode: question.presentationMode || 'adapted',
  };
};

const aptitudeAnhuiOutlineSource = {
  sourceType: 'official_outline_example',
  sourceId: 'anhui-2026-outline',
  sourceTitle: '安徽省2026年度公务员考试大纲公开例题（摘要改写）',
  sourceNote: '来自安徽省2026年度考试大纲中的公开例题。本站对题干与选项作摘要改写，保留考点及答案，不是历年考试真题。',
  region: 'anhui',
  examYear: 2026,
  paperId: 'anhui-2026-outline',
  paperTitle: '安徽省2026年行测大纲例题',
  url: 'https://rsj.huainan.gov.cn/group4/M00/11/14/rB40qWlooVmAFWHRAA3nByKSHRA495.pdf?attachDownload=1',
};
const aptitudeZhejiangRecallSource = {
  sourceType: 'recalled',
  sourceId: 'zhejiang-2025a-recall',
  sourceTitle: '2025年浙江省考行测A类（考生回忆版，摘要改写）',
  sourceNote: '来源为第三方公开考生回忆版；题干与选项作摘要改写，答案与公开答案页核对。非官方发布原卷。',
  region: 'zhejiang',
  examYear: 2025,
  paperId: 'zhejiang-2025-A-类',
  paperTitle: '2025年浙江A类行测回忆卷',
  url: 'https://gwy.gkzhenti.cn/paper/1739531137130',
  answerUrl: 'https://gwy.gkzhenti.cn/answer/1739531137130',
};

const sourcedQuestions = [
  sourceQuestion({
    id: 'ah2026-outline-political-1', moduleId: 'political-theory', subjectId: 'political-theory',
    topicId: 'political-theory:chinese-modernization', knowledgePointIds: ['political-theory:chinese-modernization'],
    originalQuestionNo: '政治理论例题1', sectionOrder: 1,
    stem: '关于中国式现代化的目标、道路和特征，下面五项判断中正确的有几项？①以群众对美好生活的期待引领现代化建设；②共同富裕是这一道路的重要要求；③把超过西方发达国家作为主要目标；④把照搬其他国家的现代化模式作为基本经验；⑤形成新的文明发展形态。',
    options: ['2项', '3项', '4项', '5项'], correctAnswer: 'B', difficulty: 'medium',
    explanation: '①、②、⑤符合官方大纲例题所依据的政策表述；③、④把中国式现代化误写成以超越他国、复制既有模式为目标。共三项正确。',
  }, { ...aptitudeAnhuiOutlineSource, sectionOrder: 1 }),
  sourceQuestion({
    id: 'ah2026-outline-political-2', moduleId: 'political-theory', subjectId: 'political-theory',
    topicId: 'political-theory:rural-development', knowledgePointIds: ['political-theory:rural-development'],
    originalQuestionNo: '政治理论例题2', sectionOrder: 1,
    stem: '围绕缩小城乡差距、巩固脱贫成果和发展乡村产业，以下做法中符合现行政策要求的有几项？①以建制镇为县域经济体系的唯一枢纽；②持续监测返贫风险并增强脱贫地区发展能力；③结合地方条件发展特色产业并推动农村产业融合；④改善农村人居环境并保护传统村落。',
    options: ['①②③', '①②④', '①③④', '②③④'], correctAnswer: 'D', difficulty: 'medium',
    explanation: '持续监测、因地制宜发展产业、改善农村环境和保护特色村落均符合例题所列政策方向；①对城镇化载体和县域经济的表述被绝对化。',
  }, { ...aptitudeAnhuiOutlineSource, sectionOrder: 1 }),

  sourceQuestion({
    id: 'ah2026-outline-verbal-1', moduleId: 'verbal', subjectId: 'reading',
    topicId: 'verbal:contextual-word-choice', knowledgePointIds: ['verbal:contextual-word-choice'],
    originalQuestionNo: '言语例题1', sectionOrder: 3,
    stem: '一段文字对比了战乱年代的离乡处境与当代城市生活者对家乡的情感。依次填入表示“离开故土”和“情感归属”的词语，最恰当的是？',
    options: ['民不聊生；认可', '流离失所；认识', '背井离乡；认同', '饥寒交迫；认知'], correctAnswer: 'C', difficulty: 'medium',
    explanation: '第一空需要表达离开家乡，第二空需要表达情感上的归属；“背井离乡”和“认同”与两处语义分别匹配。',
  }, { ...aptitudeAnhuiOutlineSource, sectionOrder: 3 }),
  sourceQuestion({
    id: 'ah2026-outline-verbal-2', moduleId: 'verbal', subjectId: 'reading',
    topicId: 'verbal:main-idea', knowledgePointIds: ['verbal:main-idea'],
    originalQuestionNo: '言语例题2', sectionOrder: 3,
    stem: '文段指出，传统手艺曾代表当时的重要生产力；现代科技取代了许多手工技能，但也能帮助传统工艺提升并继续服务社会。文段主要说明？',
    options: ['传统工艺可借助现代科技获得发展', '社会发展只取决于生产力', '现代科技对传统手工艺只有冲击', '科技能够解决传统工艺的所有困难'], correctAnswer: 'A', difficulty: 'easy',
    explanation: '文段的落脚点是现代科技能够帮助传统工艺提升和延续，A概括了这一观点；其余选项扩大或改变了文意。',
  }, { ...aptitudeAnhuiOutlineSource, sectionOrder: 3 }),
  sourceQuestion({
    id: 'ah2026-outline-verbal-3', moduleId: 'verbal', subjectId: 'reading',
    topicId: 'verbal:contextual-word-choice', knowledgePointIds: ['verbal:contextual-word-choice'],
    originalQuestionNo: '言语例题3', sectionOrder: 3,
    stem: '数字网络要真正服务公众，离不开网络参与者之间建立信任，也离不开共同治理。填入横线处的观点最恰当的是？',
    options: ['信任与共治共同构成网络发展的基础原则', '信任只是治理完成后的结果', '共治是信任的未来替代品', '只有信任重要，共治并非必要'], correctAnswer: 'A', difficulty: 'easy',
    explanation: '下文分别说明信任与共治的作用，横线处应概括二者共同发挥基础作用，A与后文并列关系一致。',
  }, { ...aptitudeAnhuiOutlineSource, sectionOrder: 3 }),
  sourceQuestion({
    id: 'ah2026-outline-verbal-4', moduleId: 'verbal', subjectId: 'reading',
    topicId: 'verbal:sentence-order', knowledgePointIds: ['verbal:sentence-order'],
    originalQuestionNo: '言语例题4', sectionOrder: 3,
    stem: '将下列句子排序，使关于工匠文化与教育传承的论述连贯：①这种精神融入技艺训练，也体现修身与服务社会的追求。②古代工匠文化强调品德与技艺并重。③古代教育思想也把教师职责与技艺传授联系起来。④韩愈的相关论述也表达了相近思想。⑤中外都形成了悠久的工艺传统。⑥《礼记》以工艺传承说明教学传授的道理。',
    options: ['⑤⑥④②③①', '③⑤②⑥④①', '⑤②①③⑥④', '⑥④②①③⑤'], correctAnswer: 'C', difficulty: 'hard',
    explanation: '⑤先作总述，②概括中国古代工匠精神，①接着解释其内容；③引出教育与技艺的联系，再由⑥、④举例补充，顺序为⑤②①③⑥④。',
  }, { ...aptitudeAnhuiOutlineSource, sectionOrder: 3 }),

  sourceQuestion({
    id: 'ah2026-outline-quantitative-1', moduleId: 'quantitative', subjectId: 'geometry',
    topicId: 'quantitative:volume-displacement', knowledgePointIds: ['quantitative:volume-displacement'],
    originalQuestionNo: '数量关系例题', sectionOrder: 4,
    stem: '圆柱容器与三个实心球的半径均为4厘米。放入三个球后，水面刚好没过最上方的球，且水没有溢出。放球前的水面高度是多少？',
    options: ['2厘米', '4厘米', '6厘米', '8厘米'], correctAnswer: 'D', difficulty: 'medium',
    explanation: '三个球的排水体积合计为3×(4/3)π×4³=256π立方厘米。圆柱底面积为16π平方厘米，因此水面上升16厘米；最终水深为24厘米，原水深为8厘米。',
  }, { ...aptitudeAnhuiOutlineSource, sectionOrder: 4 }),

  sourceQuestion({
    id: 'ah2026-outline-reasoning-1', moduleId: 'reasoning', subjectId: 'definition',
    topicId: 'reasoning:definition-judgment', knowledgePointIds: ['reasoning:definition-judgment'],
    originalQuestionNo: '判断推理定义例题', sectionOrder: 5,
    stem: '共享经济依托网络平台，暂时转移闲置资源的使用权，以提升存量资产利用效率。下列哪项活动不符合这一概念？',
    options: ['通过平台预约网约车出行', '通过平台借款后用于股票投资', '在线订购餐食并送到家中', '出行前在线预订民宿'], correctAnswer: 'B', difficulty: 'medium',
    explanation: 'B是借贷和金融投资活动，并未体现闲置资源使用权的临时转移；网约车和民宿预订都可能利用闲置运力或房屋。',
  }, { ...aptitudeAnhuiOutlineSource, sectionOrder: 5 }),
  sourceQuestion({
    id: 'ah2026-outline-reasoning-2', moduleId: 'reasoning', subjectId: 'analogy',
    topicId: 'reasoning:paired-tools', knowledgePointIds: ['reasoning:paired-tools'],
    originalQuestionNo: '判断推理类比例题', sectionOrder: 5,
    stem: '一组零件需要配套使用。以下哪一组物品之间也具有相近的配套关系？',
    options: ['水杯与暖瓶', '线与纽扣', '插头与插座', '筷子与碗'], correctAnswer: 'C', difficulty: 'easy',
    explanation: '螺丝与螺帽、插头与插座都是必须配合连接或使用的一对部件；其余选项是容器关系或缝制关系。',
  }, { ...aptitudeAnhuiOutlineSource, sectionOrder: 5 }),
  sourceQuestion({
    id: 'ah2026-outline-reasoning-3', moduleId: 'reasoning', subjectId: 'argument',
    topicId: 'reasoning:argument-criticism', knowledgePointIds: ['reasoning:argument-criticism'],
    originalQuestionNo: '判断推理逻辑例题', sectionOrder: 5,
    stem: '唐代墓葬中出现先秦纹样陶片，有专家推测陶片被雨水带入墓中。以下哪项事实最能削弱这一解释？',
    options: ['墓中还发现西汉时期的器物', '墓室保存完好，没有进水或坍塌迹象', '唐代文人也曾使用类似纹样', '唐人会把生前喜爱的物品随葬'], correctAnswer: 'B', difficulty: 'medium',
    explanation: '专家以雨水冲刷解释陶片进入墓穴；若墓室保存完好、没有进水迹象，便直接削弱了该解释的关键前提。',
  }, { ...aptitudeAnhuiOutlineSource, sectionOrder: 5 }),

  sourceQuestion({
    id: 'ah2026-outline-data-1', moduleId: 'data-analysis', subjectId: 'statistics',
    topicId: 'data-analysis:share-change', knowledgePointIds: ['data-analysis:share-change'],
    originalQuestionNo: '资料分析例题', sectionOrder: 6,
    stem: '某年5月，股份制银行资产为431150亿元，同比增长11.5%；银行业金融机构资产为2328934亿元，同比增长12.5%。股份制银行资产占比与上年同期相比约有何变化？',
    options: ['增加2个百分点', '减少2个百分点', '增加0.2个百分点', '减少0.2个百分点'], correctAnswer: 'D', difficulty: 'hard',
    explanation: '本年占比为431150÷2328934。上年同期占比为本年占比×(1+12.5%)÷(1+11.5%)，因此本年占比较上年约下降0.2个百分点。',
  }, { ...aptitudeAnhuiOutlineSource, sectionOrder: 6 }),

  sourceQuestion({
    id: 'zja2025-q1', moduleId: 'political-theory', subjectId: 'party-theory',
    topicId: 'political-theory:party-theory', knowledgePointIds: ['political-theory:party-theory'],
    originalQuestionNo: 1, sectionOrder: 1,
    stem: '关于习近平新时代中国特色社会主义思想与中国特色社会主义事业，判断以下表述正确的有几项：①深化了对执政、建设和社会发展规律的认识；②“六个必须坚持”概括了相关世界观和方法论；③“两个确立”包括确立党中央核心地位和指导思想地位；④新时代坚持和发展中国特色社会主义的总任务包含现代化建设和民族复兴。',
    options: ['1项', '2项', '3项', '4项'], correctAnswer: 'D', difficulty: 'medium',
    explanation: '公开答案页给出的答案为D。四项均符合该题回忆文本所对应的理论表述；题库保留原卷题号并以摘要方式呈现。',
  }, { ...aptitudeZhejiangRecallSource, sectionOrder: 1 }),
  sourceQuestion({
    id: 'zja2025-political-2', moduleId: 'political-theory', subjectId: 'party-theory',
    topicId: 'political-theory:reform', knowledgePointIds: ['political-theory:reform'],
    originalQuestionNo: 2, sectionOrder: 1,
    stem: '关于2024年党的二十届三中全会精神，下列表述中哪项不准确？',
    options: ['全面深化改革要围绕中国式现代化展开', '以人民为中心被题目表述为改革开放成功推进的根本保证和最大政治优势', '改革举措要加强协调，防止局部利益妨碍改革全局', '尊重基层和群众首创经验，鼓励试点并形成可推广做法'], correctAnswer: 'B', difficulty: 'medium',
    explanation: '公开答案页给出的答案为B。题目考查政策表述与概念归属的准确性；复习应核对全会正式文件，不把方向正确的观点误当成原文中的概念定义。',
  }, { ...aptitudeZhejiangRecallSource, sectionOrder: 1 }),
  sourceQuestion({
    id: 'zja2025-political-3', moduleId: 'political-theory', subjectId: 'party-theory',
    topicId: 'political-theory:high-quality-development', knowledgePointIds: ['political-theory:high-quality-development'],
    originalQuestionNo: 3, sectionOrder: 1,
    stem: '关于高质量发展及相关宏观政策，以下哪项表述不准确？',
    options: ['新质生产力的发展既涉及技术和业态，也涉及管理制度创新', '财政与货币政策可以配合弥补需求不足，货币政策保持流动性合理充裕', '房地产政策同时强调严控增量、优化存量、提高质量和盘活闲置土地', '参与国际绿色金融、数字金融规则制定有助于提升我国影响力'], correctAnswer: 'C', difficulty: 'medium',
    explanation: '公开答案页给出的答案为C。该题属于政策措辞辨析，题库使用回忆版答案；具体年度政策内容以正式文件为准。',
  }, { ...aptitudeZhejiangRecallSource, sectionOrder: 1 }),
  sourceQuestion({
    id: 'zja2025-political-4', moduleId: 'political-theory', subjectId: 'party-theory',
    topicId: 'political-theory:public-welfare', knowledgePointIds: ['political-theory:public-welfare'],
    originalQuestionNo: 4, sectionOrder: 1,
    stem: '关于民生与社会保障，以下表述中哪项不准确？',
    options: ['改善民生要兼顾积极作为与财力条件', '就业是基础性民生，应扩大高质量就业', '截至2023年底，医保仅覆盖约10亿人而基本养老保险覆盖约14亿人', '提高人民生活品质是全面深化改革的重要着力点之一'], correctAnswer: 'C', difficulty: 'medium',
    explanation: '公开答案页给出的答案为C。题干中的参保人数口径与真实统计不符；使用统计数字时要核对统计年度和统计范围。',
  }, { ...aptitudeZhejiangRecallSource, sectionOrder: 1 }),
  sourceQuestion({
    id: 'zja2025-political-5', moduleId: 'political-theory', subjectId: 'party-theory',
    topicId: 'political-theory:education', knowledgePointIds: ['political-theory:education'],
    originalQuestionNo: 5, sectionOrder: 1,
    stem: '关于建设教育强国，判断以下表述正确的有几项：①到2035年总体实现教育现代化；②统筹教育、科技和人才发展；③推动义务教育优质均衡并缩小差距；④促进职业教育、高等教育和继续教育协同；⑤提升教师社会地位和职业荣誉。',
    options: ['2项', '3项', '4项', '5项'], correctAnswer: 'D', difficulty: 'medium',
    explanation: '公开答案页给出的答案为D；五项表述均符合题目所引用的教育强国政策方向。',
  }, { ...aptitudeZhejiangRecallSource, sectionOrder: 1 }),
  sourceQuestion({
    id: 'zja2025-political-6', moduleId: 'political-theory', subjectId: 'party-theory',
    topicId: 'political-theory:international-relations', knowledgePointIds: ['political-theory:international-relations'],
    originalQuestionNo: 6, sectionOrder: 1,
    stem: '关于和平共处五项原则与国际合作，下列哪项说法不符合相关讲话精神？',
    options: ['国际规则应由各国共同参与制定和维护', '以合作推进发展与安全', '倡导平等有序的多极化格局', '帮助其他国家选择适合其国情的道路和制度'], correctAnswer: 'D', difficulty: 'medium',
    explanation: '公开答案页给出的答案为D。国际合作应尊重各国自主选择发展道路的权利，不能替他国作出制度选择。',
  }, { ...aptitudeZhejiangRecallSource, sectionOrder: 1 }),
  sourceQuestion({
    id: 'zja2025-political-8', moduleId: 'political-theory', subjectId: 'party-theory',
    topicId: 'political-theory:social-work', knowledgePointIds: ['political-theory:social-work'],
    originalQuestionNo: 8, sectionOrder: 1,
    stem: '关于我国社会工作体制与队伍建设，以下哪项表述不准确？',
    options: ['社会治理和服务工作在党的重要会议部署中不断拓展', '各级党委均已在乡镇层面设立与省市县相同的社会工作部门', '专业人才、社区工作者和志愿者队伍都可发挥作用', '新经济组织、新社会组织和新就业群体党建是重要工作内容'], correctAnswer: 'B', difficulty: 'medium',
    explanation: '公开答案页给出的答案为B。社会工作部门的设置层级不能扩大为所有乡镇均设有与省市县同样的部门。',
  }, { ...aptitudeZhejiangRecallSource, sectionOrder: 1 }),
  sourceQuestion({
    id: 'zja2025-political-9', moduleId: 'political-theory', subjectId: 'party-theory',
    topicId: 'political-theory:national-defense', knowledgePointIds: ['political-theory:national-defense'],
    originalQuestionNo: 9, sectionOrder: 1,
    stem: '关于新时代政治建军与国防改革，以下哪项表述不准确？',
    options: ['政治建设关系到人民军队根本方向', '新时代通过政治整训和从严治军加强队伍建设', '科技创新是提升战斗力的重要支撑', '深化改革后现役军队员额已增加至300万人'], correctAnswer: 'D', difficulty: 'medium',
    explanation: '公开答案页给出的答案为D。军队员额并未因改革增加到题干所说的规模；涉及国防数据时应注意统计口径与官方公开资料。',
  }, { ...aptitudeZhejiangRecallSource, sectionOrder: 1 }),
  sourceQuestion({
    id: 'zja2025-political-10', moduleId: 'political-theory', subjectId: 'party-theory',
    topicId: 'political-theory:ecological-civilization', knowledgePointIds: ['political-theory:ecological-civilization'],
    originalQuestionNo: 10, sectionOrder: 1,
    stem: '关于生态文明建设，以下四项判断中正确的有几项？①绿色发展是高质量发展的底色；②我国提出2035年前实现碳达峰、2050年前实现碳中和；③推进双碳政策须结合能源资源禀赋；④生态修复应以工程修复为主、自然恢复为辅。',
    options: ['1项', '2项', '3项', '4项'], correctAnswer: 'B', difficulty: 'medium',
    explanation: '公开答案页给出的答案为B。①、③正确；②的时间目标与国家提出的目标不符，④把自然恢复与人工修复的主次关系说反。',
  }, { ...aptitudeZhejiangRecallSource, sectionOrder: 1 }),
];

for (const question of sourcedQuestions) {
  APTITUDE_MODULE_QUESTION_BANKS[question.moduleId].push(question);
}

for (const question of IMPORTED_SOURCE_QUESTIONS.filter((item) => item.moduleId !== 'general-knowledge')) {
  APTITUDE_MODULE_QUESTION_BANKS[question.moduleId].push(sourceQuestion(question, question));
}
