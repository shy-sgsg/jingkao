import { GENERAL_KNOWLEDGE_LESSONS } from './lessonContent.js';

const RAW_TREE = [
  ['law', '法律常识', '法', [
    ['law:fundamentals', '法学基础', 'legal-concepts|法的概念与作用;legal-relations|法律规范与法律关系;legal-sources|法律渊源与效力层级;legal-responsibility|权利义务与法律责任'],
    ['law:constitution', '宪法', 'constitutional-principles|宪法基本原则;state-structure|国家性质与国家机构;citizen-rights|公民基本权利;citizen-duties|公民基本义务'],
    ['law:civil-law', '民法', 'civil-subjects|民事主体与行为能力;civil-acts|民事法律行为与代理;civil-code-basics|民法典结构与基本原则;property-contract|物权与合同;personality-family|人格权、婚姻家庭与继承'],
    ['law:criminal-law', '刑法', 'crime-elements|犯罪构成与故意过失;defense|正当防卫与紧急避险;crime-stages|犯罪预备、未遂、中止;accomplice|共同犯罪与刑罚;property-crimes|常见财产犯罪与职务犯罪'],
    ['law:administrative-law', '行政法', 'administrative-subject|行政主体与行政行为;administrative-permission|行政许可;administrative-penalty|行政处罚;administrative-coercion|行政强制;administrative-remedies|行政复议、行政诉讼与国家赔偿'],
    ['law:other-laws', '其他常考法律', 'labor-law|劳动法与劳动合同;social-insurance|社会保险与社会保障;consumer-food|消费者权益与食品安全;personal-data|个人信息、数据与网络安全;environment-civil-service|环境保护法与公务员法'],
    ['law:beijing-local', '北京地方性法规', 'beijing-12345-law|北京市接诉即办工作条例;beijing-street-law|街道办事处与基层治理;beijing-renewal-law|城市更新与历史文化保护;beijing-ecology-law|北京市生态环境规定'],
  ]],
  ['economy', '经济常识', '经', [
    ['economy:basics', '基础经济学', 'scarcity|稀缺性与资源配置;opportunity-cost|机会成本;demand-supply|供给、需求与市场均衡;price-failure|价格机制、市场失灵与公共产品'],
    ['economy:macro', '宏观经济', 'gdp-growth|国内生产总值与经济增长;inflation-cpi|通货膨胀与居民消费价格指数;employment|就业与失业;cycles|产业结构与经济周期'],
    ['economy:finance', '财政与税收', 'fiscal-revenue|财政收入与支出;deficit-debt|财政赤字与政府债务;tax|税收基础;fiscal-policy|财政政策、转移支付与政府采购'],
    ['economy:money', '货币与金融', 'money-functions|货币职能与利率;reserve-ratio|存款准备金与货币政策;central-bank|中央银行与商业银行;exchange-risk|金融市场、汇率与风险'],
    ['economy:development', '经济政策与实践', 'quality-growth|高质量发展与宏观调控;consumption-investment|消费与投资;trade|对外贸易与区域协调;digital-industry|数字经济、产业升级与北京发展'],
  ]],
  ['history', '历史常识', '史', [
    ['history:ancient', '中国古代史', 'pre-qin|先秦与秦汉;wei-jin|魏晋南北朝;隋唐|隋唐;song-yuan|宋元;ming-qing|明清;institutions|重要制度、改革与战争;achievements|古代科技文化成就'],
    ['history:modern', '中国近现代史', 'opium-war|鸦片战争与近代开端;reform-movements|洋务运动与戊戌变法;revolution|辛亥革命与新文化运动;may-fourth|五四运动与中共成立;revolutionary-period|新民主主义革命与抗日战争;new-china|新中国成立与社会主义建设;reform-opening|改革开放'],
    ['history:world', '世界历史', 'ancient-civilizations|古代文明;renaissance|文艺复兴与宗教改革;industrial-revolution|工业革命;world-wars|两次世界大战;international-order|国际秩序演变'],
    ['history:themes', '历史专题', 'political-systems|政治制度演变;science-history|科技史;culture-exchanges|中外交流;historical-chronology|历史年代与事件排序'],
  ]],
  ['humanities', '人文与传统文化', '文', [
    ['humanities:literature', '中国文学', 'classics|先秦诸子与经典;poetry|诗歌体裁与名篇;writers|重要作家与作品;literary-history|文学史常见脉络'],
    ['humanities:tradition', '传统文化', 'solar-terms|二十四节气;calendar|传统历法与干支;festivals|传统节日与民俗;philosophy-schools|儒释道与诸子思想'],
    ['humanities:art', '艺术常识', 'painting|中国绘画;calligraphy|书法与篆刻;music|传统音乐与戏曲;architecture|建筑与园林'],
    ['humanities:heritage', '文化遗产', 'world-heritage|世界遗产;intangible-heritage|非物质文化遗产;museum|博物馆与文物保护;craft|传统工艺'],
    ['humanities:world', '世界人文', 'western-literature|世界文学;world-art|世界艺术;religions|世界宗教基础;mythology|神话与文化符号'],
  ]],
  ['technology', '科技常识', '科', [
    ['technology:physics', '物理生活常识', 'energy|能量与常见能量转换;heat|热传递与物态变化;optics|光学与成像;electricity|电路与用电安全'],
    ['technology:chemistry', '化学生活常识', 'mixtures|物质组成与混合物;reactions|常见化学反应;acids-bases|酸碱与盐;household-chemistry|生活化学与安全'],
    ['technology:biology', '生物与医学基础', 'cells|细胞与遗传;microorganisms|微生物与发酵;human-body|人体系统与健康;vaccines|免疫与疫苗基础'],
    ['technology:space', '航天科技', 'orbit|轨道与卫星;launch|运载火箭与发射;space-station|空间站;remote-sensing|遥感与导航'],
    ['technology:information', '信息技术', 'internet|互联网与通信;ai|人工智能基础;cybersecurity|网络安全;data|数据、云计算与隐私'],
    ['technology:frontier', '重大科技成果', 'materials|新材料;energy-tech|新能源技术;life-science|生命科学;science-literacy|科学方法与科技伦理'],
  ]],
  ['geography', '地理与国情常识', '地', [
    ['geography:china', '中国地理', 'administrative-regions|行政区划;terrain|地形地貌;climate|气候与降水;water-resources|河流湖泊与水资源'],
    ['geography:world', '世界地理', 'continents|大洲大洋;countries|重要国家与首都;routes|海峡、运河与交通要道;resources|世界资源分布'],
    ['geography:natural', '自然地理', 'earth-motion|地球运动与昼夜四季;weather|天气气候与灾害;tectonics|板块构造;landforms|地貌与自然带'],
    ['geography:national', '基本国情', 'population|人口与民族;territory|疆域与邻国;natural-resources|自然资源;development-regions|区域发展格局'],
    ['geography:beijing', '北京地理', 'beijing-position|北京区位与地形;beijing-rivers|河流水系与水资源;beijing-climate|气候特征;beijing-districts|北京行政区划与区情'],
  ]],
  ['ecology', '生态环境常识', '绿', [
    ['ecology:basics', '生态基础', 'ecosystem|生态系统结构;food-chain|食物链与能量流动;biodiversity|生物多样性;carrying-capacity|生态承载力'],
    ['ecology:protection', '环境保护', 'pollution|大气、水与土壤污染;solid-waste|固体废物与循环利用;protected-areas|自然保护地;ecological-restoration|生态修复'],
    ['ecology:climate', '气候与双碳', 'greenhouse|温室气体与气候变化;carbon-sink|碳汇与碳中和;renewable|可再生能源;low-carbon|绿色生产生活'],
  ]],
  ['governance', '社会治理与公共管理', '治', [
    ['governance:public', '公共管理', 'government-functions|政府职能与公共服务;policy-process|公共政策过程;public-finance|公共产品与公共服务;service-design|政务服务与数字政府'],
    ['governance:social-security', '社会保障', 'social-insurance|社会保险;assistance|社会救助;elderly-care|养老与医疗保障;employment-service|就业服务与劳动权益'],
    ['governance:emergency', '应急与安全', 'emergency-levels|突发事件与应急响应;public-health|公共卫生应急;disaster-response|灾害避险;production-safety|生产与消防安全'],
    ['governance:grassroots', '基层工作场景', 'grid-governance|网格化治理;community|社区协商与居民自治;conflict-resolution|矛盾纠纷调处;public-participation|公众参与和信息公开'],
  ]],
  ['beijing', '北京特色常识', '京', [
    ['beijing:capital', '首都功能', 'capital-functions|首都核心功能;urban-position|城市战略定位;central-axis|中轴线与历史文化名城;capital-services|首都公共服务'],
    ['beijing:regional', '京津冀协同发展', 'jingjinji|京津冀协同发展;transport|区域交通;ecology-cooperation|生态协同;industry-cooperation|产业与公共服务协作'],
    ['beijing:city-governance', '北京城市治理', '12345-response|接诉即办的响应办理反馈;active-governance|主动治理与未诉先办;street-town|街道乡镇职责;digital-governance|城市运行与数字治理'],
    ['beijing:construction', '北京城市建设', 'master-plan|城市总体规划;subcenter|城市副中心;urban-renewal|城市更新;historic-protection|历史文化保护'],
    ['beijing:economy-society', '北京经济社会', 'beijing-industries|北京产业结构;science-center|国际科技创新中心;public-culture|公共文化服务;transport-safety|交通治理'],
    ['beijing:districts', '北京区情', 'central-districts|中心城区功能;suburbs|平原新城;mountain-areas|生态涵养区;district-boundaries|十六区区划与空间格局'],
    ['beijing:grassroots', '街道与基层治理', 'community-service|社区服务;12345-process|12345诉求办理流程;grassroots-coordination|街乡吹哨、部门报到;public-participation|基层协商与群众参与'],
  ]],
  ['current-affairs', '时政与政策常识', '政', [
    ['current-affairs:reports', '年度重要报告', 'government-work-report|政府工作报告结构与年度任务;party-congress|党代会报告与政策表述;budget-report|预算报告与民生指标;beijing-report|北京市政府工作报告'],
    ['current-affairs:policy', '国家重大政策', 'five-year-plan|五年规划;high-quality-development|高质量发展;innovation|科技创新与产业政策;common-prosperity|民生与共同发展'],
    ['current-affairs:international', '国际组织与合作', 'un|联合国体系;international-cooperation|国际合作机制;climate-agreement|气候治理;regional-organizations|主要区域组织'],
    ['current-affairs:science', '年度科技与社会', 'annual-science|年度科技进展;public-health|卫生健康政策;ecology-policy|生态政策;digital-policy|数字治理政策'],
    ['current-affairs:update', '时政更新', 'current-version|资料年份与有效期;official-release|官方发布渠道;historical-facts|历史事实与现行政策区分;update-review|过期内容复核规则'],
  ]],
  ['philosophy', '哲学与政治基础补充', '哲', [
    ['philosophy:materialism', '马克思主义哲学基础', 'matter-consciousness|物质与意识;dialectical-change|联系、发展与矛盾;practice-truth|实践与真理;history-society|社会存在与社会意识'],
    ['philosophy:politics', '政治基础概念', 'state|国家与政权;democracy|民主与法治;citizenship|权利、义务与公共责任;governance-system|治理体系与治理能力'],
    ['philosophy:logic', '辩证思维方法', 'whole-part|整体与部分;quantity-quality|量变与质变;cause-effect|因果与条件;contradiction|矛盾分析方法'],
    ['philosophy:ethics', '伦理与公共责任', 'public-interest|公共利益;fairness|公平正义;professional-ethics|职业伦理;rule-of-law-thinking|法治思维'],
  ]],
];

const PUBLISHED_POINT_IDS = new Set(Object.keys(GENERAL_KNOWLEDGE_LESSONS));

function parsePoints(subjectId, subjectTitle, topicId, topicTitle, value) {
  return value.split(';').map((item) => {
    const [slug, title] = item.split('|');
    const id = `${subjectId}:${slug}`;
    return { id, title, subjectId, subjectTitle, topicId, topicTitle, enabled: true, contentStatus: PUBLISHED_POINT_IDS.has(id) ? 'published' : 'outline' };
  });
}

const TREE = RAW_TREE.map(([id, title, symbol, rawTopics]) => ({
  id, title, symbol,
  topics: rawTopics.map(([topicId, topicTitle, rawPoints]) => ({
    id: topicId, title: topicTitle, knowledgePoints: parsePoints(id, title, topicId, topicTitle, rawPoints),
  })),
}));
const POINTS = new Map(TREE.flatMap((subject) => subject.topics.flatMap((topic) => topic.knowledgePoints.map((point) => [point.id, point]))));

export function getGeneralKnowledgeTree() {
  return TREE.map((subject) => ({
    ...subject,
    topics: subject.topics.map((topic) => ({ ...topic, knowledgePoints: topic.knowledgePoints.map((point) => ({ ...point })) })),
  }));
}

export function getGeneralKnowledgePoint(id) {
  const point = POINTS.get(id);
  return point ? { ...point } : null;
}

export function getGeneralKnowledgePointIds() {
  return [...POINTS.keys()];
}
