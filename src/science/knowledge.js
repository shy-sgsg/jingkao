import { SCIENCE_LESSONS } from './lessonContent.js';

const sciencePoint = (id, title, content = null) => ({
  id,
  title,
  enabled: true,
  contentStatus: content || SCIENCE_LESSONS[id] ? 'published' : 'outline',
  content: content || SCIENCE_LESSONS[id] || null,
});

const scienceTopic = (id, title, knowledgePoints) => ({ id, title, knowledgePoints });

export const SCIENCE_TREE = [
  {
    id: 'physics', title: '物理', topics: [
      scienceTopic('physics:kinematics', '运动学', [
        sciencePoint('physics:displacement-distance', '位移与路程'),
        sciencePoint('physics:speed', '速度'),
        sciencePoint('physics:average-speed', '平均速度'),
        sciencePoint('physics:acceleration', '加速度'),
        sciencePoint('physics:uniform-motion', '匀速直线运动'),
        sciencePoint('physics:relative-motion', '相对运动'),
        sciencePoint('physics:motion-graphs', '运动图像'),
      ]),
      scienceTopic('physics:mechanics', '力学', [
        sciencePoint('physics:inertia', '惯性'),
        sciencePoint('physics:newton-laws', '牛顿运动定律'),
        sciencePoint('physics:gravity', '重力'),
        sciencePoint('physics:elastic-force', '弹力'),
        sciencePoint('physics:friction', '摩擦力'),
        sciencePoint('physics:force-analysis', '受力分析'),
        sciencePoint('physics:force-equilibrium', '力的平衡'),
        sciencePoint('physics:motion-state', '运动状态变化'),
      ]),
      scienceTopic('physics:pressure', '压强与浮力', [
        sciencePoint('physics:solid-pressure', '固体压强'),
        sciencePoint('physics:liquid-pressure', '液体压强'),
        sciencePoint('physics:atmospheric-pressure', '大气压强'),
        sciencePoint('physics:density', '密度'),
        sciencePoint('physics:buoyancy', '浮力与阿基米德原理', {
          summary: '液体或气体对浸在其中的物体产生向上的浮力，其大小等于物体排开流体的重力。',
          explanation: '流体内部压强随深度增加。物体下表面受到的向上压力通常大于上表面受到的向下压力，合力向上，这个合力就是浮力。计算时看物体排开了多少流体，而不是物体本身的总体积；物体没有完全浸没时，排开体积只算浸入部分。',
          everydayExample: '游泳时身体浸入水中会感到变轻；船装载货物后下沉更深，是因为它需要排开更多水来获得更大的浮力。',
          principle: '阿基米德原理：浸在流体中的物体受到的浮力，等于它排开流体所受的重力。',
          formulas: [{ expression: 'F浮 = ρ液 g V排', variables: 'ρ液为流体密度，g为重力加速度，V排为排开流体的体积。', conditions: '适用于静止流体中的浮力计算；V排取实际浸入流体的体积。' }],
          examples: [
            { id: 'physics-buoyancy-example-1', title: '完全浸没时的浮力', stem: '一个体积为 800 cm³ 的物体完全浸没在水中。取水的密度为 1000 kg/m³、g=9.8 N/kg。物体受到的浮力是多少？', options: [{ id: 'A', text: '0.784 N' }, { id: 'B', text: '7.84 N' }, { id: 'C', text: '78.4 N' }, { id: 'D', text: '无法确定' }], answer: 'B', steps: ['800 cm³ = 8×10⁻⁴ m³。', 'F浮=ρ水gV排=1000×9.8×8×10⁻⁴=7.84 N。'], optionExplanations: { A: '少乘了一个数量级。', B: '正确，代入排开水的体积得到 7.84 N。', C: '体积换算或乘法多了一个数量级。', D: '题目已给流体密度、排开体积和 g，信息充分。' } },
            { id: 'physics-buoyancy-example-2', title: '比较浮力与重力', stem: '一个物体完全浸没在水中，排开水的体积为 400 cm³，物体质量为 0.60 kg。取水的密度为 1000 kg/m³、g=9.8 N/kg。松手后物体将如何运动？', options: [{ id: 'A', text: '上浮，因为浮力大于重力' }, { id: 'B', text: '下沉，因为重力大于浮力' }, { id: 'C', text: '悬浮，因为浮力等于重力' }, { id: 'D', text: '无法判断' }], answer: 'B', steps: ['V排=400 cm³=4×10⁻⁴ m³，F浮=1000×9.8×4×10⁻⁴=3.92 N。', 'G=mg=0.60×9.8=5.88 N。', '重力大于浮力，合力向下，物体下沉。'], optionExplanations: { A: '计算结果表明浮力小于重力。', B: '正确，5.88 N 大于 3.92 N。', C: '悬浮要求浮力与重力平衡。', D: '已给计算所需的质量、排开体积和流体密度。' } },
          ],
          commonMistakes: ['把物体总体积直接当作排开体积，即使物体只部分浸入。', '只比较密度或体积，不先比较浮力与重力。'],
          quickMethod: '先算 F浮，再算 G；比较二者方向和大小。漂浮、悬浮时二力平衡。',
          relatedKnowledgePointIds: ['physics:floating-sinking', 'physics:liquid-pressure'],
        }),
        sciencePoint('physics:archimedes-principle', '阿基米德原理'),
        sciencePoint('physics:floating-sinking', '漂浮、悬浮与沉浮条件'),
        sciencePoint('physics:buoyancy-conditions', '沉浮条件'),
        sciencePoint('physics:communicating-vessels', '连通器'),
      ]),
      scienceTopic('physics:simple-machines', '简单机械', [
        sciencePoint('physics:levers', '杠杆'),
        sciencePoint('physics:lever-arm', '力臂'),
        sciencePoint('physics:pulleys', '滑轮'),
        sciencePoint('physics:inclined-plane', '斜面'),
        sciencePoint('physics:work', '功'),
        sciencePoint('physics:power', '功率'),
        sciencePoint('physics:mechanical-efficiency', '机械效率'),
        sciencePoint('physics:mechanical-energy', '机械能'),
      ]),
      scienceTopic('physics:electricity', '电学', [
        sciencePoint('physics:electric-current', '电流'),
        sciencePoint('physics:voltage', '电压'),
        sciencePoint('physics:resistance', '电阻'),
        sciencePoint('physics:electrostatics', '静电与电荷相互作用'),
        sciencePoint('physics:ohms-law', '欧姆定律', {
          summary: '在导体温度等条件不变时，通过导体的电流与导体两端电压成正比，与电阻成反比。',
          explanation: '欧姆定律把电流、电压和电阻联系起来：电压增大而电阻不变时，电流增大；电阻增大而电压不变时，电流减小。电阻是导体本身的属性，不能因为电流变化就说电阻必然变化。',
          everydayExample: '同一电源给不同阻值的电阻供电，阻值较小的支路电流较大；给同一电阻提高电压，电流随之增大。',
          principle: '欧姆定律：I=U/R。对符合欧姆定律的导体，在温度等物理条件不变时成立。',
          formulas: [{ expression: 'I = U / R', variables: 'I为电流（A），U为电压（V），R为电阻（Ω）。', conditions: '导体温度等条件保持不变；不可把该线性关系直接套用到所有非线性元件。' }],
          examples: [
            { id: 'physics-ohm-example-1', title: '求电流', stem: '一个 6 Ω 的电阻两端电压为 12 V，且温度保持不变。通过它的电流是多少？', options: [{ id: 'A', text: '0.5 A' }, { id: 'B', text: '2 A' }, { id: 'C', text: '6 A' }, { id: 'D', text: '72 A' }], answer: 'B', steps: ['使用 I=U/R。', 'I=12/6=2 A。'], optionExplanations: { A: '把电压和电阻的比值算小了。', B: '正确，12 V 除以 6 Ω 等于 2 A。', C: '把电阻值误当成电流。', D: '误把电压与电阻相乘。' } },
            { id: 'physics-ohm-example-2', title: '比较串联后的电流', stem: '一个 4 Ω 电阻接在 8 V 电源上。再串联一个 4 Ω 电阻后，电源电压不变。电路总电流变为多少？', options: [{ id: 'A', text: '2 A' }, { id: 'B', text: '1 A' }, { id: 'C', text: '0.5 A' }, { id: 'D', text: '4 A' }], answer: 'B', steps: ['串联总电阻为 4+4=8 Ω。', '总电流 I=U/R总=8/8=1 A。'], optionExplanations: { A: '这是只接一个 4 Ω 电阻时的电流。', B: '正确，串联后总电阻为 8 Ω，电流为 1 A。', C: '总电阻或除法计算错误。', D: '误把电压除以单个电阻并忽略新增串联电阻。' } },
          ],
          commonMistakes: ['把串联电阻当作并联电阻处理。', '认为电流变化必然意味着电阻变化。'],
          quickMethod: '先判断连接方式并求等效电阻，再用 I=U/R；电压、电流、电阻单位保持一致。',
          relatedKnowledgePointIds: ['physics:series-circuits', 'physics:parallel-circuits', 'physics:dynamic-circuits'],
        }),
        sciencePoint('physics:series-circuits', '串联电路'),
        sciencePoint('physics:parallel-circuits', '并联电路'),
        sciencePoint('physics:dynamic-circuits', '动态电路'),
        sciencePoint('physics:electric-work', '电功'),
        sciencePoint('physics:electric-power', '电功率'),
        sciencePoint('physics:circuit-faults', '电路故障'),
      ]),
      scienceTopic('physics:optics', '光学', [
        sciencePoint('physics:straight-line-propagation', '光的直线传播'),
        sciencePoint('physics:reflection', '光的反射'),
        sciencePoint('physics:refraction', '光的折射'),
        sciencePoint('physics:plane-mirror', '平面镜'),
        sciencePoint('physics:lenses', '透镜'),
        sciencePoint('physics:lens-imaging', '透镜成像规律'),
        sciencePoint('physics:optical-phenomena', '常见光学现象'),
      ]),
      scienceTopic('physics:thermal', '热学', [
        sciencePoint('physics:phase-change', '物态变化'),
        sciencePoint('physics:heat', '热量'),
        sciencePoint('physics:internal-energy', '内能'),
        sciencePoint('physics:specific-heat', '比热容'),
        sciencePoint('physics:heat-transfer', '热传递'),
        sciencePoint('physics:thermal-expansion', '热胀冷缩'),
      ]),
      scienceTopic('physics:sound-electromagnetism', '声学与电磁学', [
        sciencePoint('physics:sound-production', '声音的产生'),
        sciencePoint('physics:sound-propagation', '声音的传播'),
        sciencePoint('physics:pitch-loudness', '音调和响度'),
        sciencePoint('physics:magnetic-field', '磁场'),
        sciencePoint('physics:electromagnetic-induction', '电磁感应'),
        sciencePoint('physics:motors-generators', '发电机和电动机'),
      ]),
    ],
  },
  {
    id: 'chemistry', title: '化学', topics: [
      scienceTopic('chemistry:changes-reactions', '物质变化与反应', [
        sciencePoint('chemistry:physical-chemical-change', '物理变化与化学变化'),
        sciencePoint('chemistry:common-reactions', '常见化学反应'),
        sciencePoint('chemistry:redox-basics', '氧化还原基础'),
        sciencePoint('chemistry:combustion', '燃烧'),
      ]),
      scienceTopic('chemistry:solutions-acids-bases', '溶液、酸碱与盐', [
        sciencePoint('chemistry:acids-bases-salts', '酸、碱和盐'),
        sciencePoint('chemistry:ph', 'pH'),
        sciencePoint('chemistry:neutralization', '中和反应'),
        sciencePoint('chemistry:solutions', '溶液'),
        sciencePoint('chemistry:solubility', '溶解度'),
      ]),
      scienceTopic('chemistry:materials-experiments', '物质性质与实验', [
        sciencePoint('chemistry:common-gases', '常见气体'),
        sciencePoint('chemistry:metal-activity', '金属活动性'),
        sciencePoint('chemistry:metal-corrosion', '金属腐蚀'),
        sciencePoint('chemistry:experiments', '化学实验'),
        sciencePoint('chemistry:substance-identification', '物质鉴别'),
      ]),
      scienceTopic('chemistry:environment-life', '生活与环境化学', [
        sciencePoint('chemistry:water-purification', '水的净化'),
        sciencePoint('chemistry:everyday-chemistry', '生活化学'),
        sciencePoint('chemistry:environmental-chemistry', '环境化学'),
      ]),
    ],
  },
  {
    id: 'biology', title: '生物', topics: [
      scienceTopic('biology:cells-metabolism', '细胞与生命活动', [
        sciencePoint('biology:cells', '细胞'),
        sciencePoint('biology:photosynthesis', '光合作用'),
        sciencePoint('biology:respiration', '呼吸作用'),
        sciencePoint('biology:transpiration', '蒸腾作用'),
        sciencePoint('biology:plant-growth', '植物生长'),
      ]),
      scienceTopic('biology:human-body', '人体生命活动', [
        sciencePoint('biology:digestion', '人体消化'),
        sciencePoint('biology:musculoskeletal-system', '骨骼、关节与运动'),
        sciencePoint('biology:hormonal-regulation', '激素调节与血糖'),
        sciencePoint('biology:respiratory-circulatory-systems', '呼吸与血液循环'),
        sciencePoint('biology:nervous-regulation', '神经调节'),
        sciencePoint('biology:immunity', '免疫'),
      ]),
      scienceTopic('biology:inheritance-microbes', '遗传与微生物', [
        sciencePoint('biology:reproduction-inheritance', '生殖与遗传'),
        sciencePoint('biology:microorganisms', '微生物'),
      ]),
      scienceTopic('biology:ecology', '生态系统', [
        sciencePoint('biology:ecosystems', '生态系统'),
        sciencePoint('biology:food-chains', '食物链'),
        sciencePoint('biology:energy-flow', '能量流动'),
        sciencePoint('biology:organisms-environment', '生物与环境'),
      ]),
    ],
  },
  {
    id: 'geography', title: '地理', topics: [
      scienceTopic('geography:earth-sun-moon', '地球、太阳与月球', [
        sciencePoint('geography:rotation', '地球自转'),
        sciencePoint('geography:revolution', '地球公转'),
        sciencePoint('geography:day-night', '昼夜交替'),
        sciencePoint('geography:day-length', '昼夜长短'),
        sciencePoint('geography:seasons', '四季变化'),
        sciencePoint('geography:solar-altitude', '太阳高度角'),
        sciencePoint('geography:eclipses', '日食与月食'),
      ]),
      scienceTopic('geography:atmosphere-weather', '大气与天气', [
        sciencePoint('geography:atmospheric-motion', '大气运动'),
        sciencePoint('geography:air-pressure', '气压'),
        sciencePoint('geography:wind', '风'),
        sciencePoint('geography:fronts-precipitation', '锋面和降水'),
        sciencePoint('geography:weather-systems', '天气系统'),
      ]),
      scienceTopic('geography:land-water', '地形与水文', [
        sciencePoint('geography:contour-lines', '等高线'),
        sciencePoint('geography:terrain-reading', '地形判断'),
        sciencePoint('geography:snowline', '雪线与影响因素'),
        sciencePoint('geography:map-directions', '方位与反向方位'),
        sciencePoint('geography:water-cycle', '水循环'),
        sciencePoint('geography:tides', '潮汐'),
        sciencePoint('geography:ocean-currents', '洋流'),
      ]),
      scienceTopic('geography:geological-processes', '地质过程', [
        sciencePoint('geography:earthquakes', '地震'),
        sciencePoint('geography:volcanoes', '火山'),
      ]),
    ],
  },
];

const sciencePointIndex = new Map(SCIENCE_TREE.flatMap((subject) => subject.topics.flatMap((topic) => topic.knowledgePoints.map((point) => [point.id, {
  ...point,
  subjectId: subject.id,
  subjectTitle: subject.title,
  topicId: topic.id,
  topicTitle: topic.title,
}]))));

export function getScienceTree() {
  return SCIENCE_TREE;
}

export function getKnowledgePoint(id) {
  return sciencePointIndex.get(id) || null;
}

export function getEnabledKnowledgePointIds() {
  return [...sciencePointIndex.values()].filter((point) => point.enabled).map((point) => point.id);
}
