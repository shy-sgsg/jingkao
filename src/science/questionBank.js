const LETTERS = ['A', 'B', 'C', 'D'];
const SUBJECT_TITLES = { physics: '物理', chemistry: '化学', biology: '生物', geography: '地理' };
const SCIENCE_QUESTION_BANK = [];

function addQuestion(subjectId, topicId, pointId, difficulty, reasoningType, stem, optionTexts, correctAnswer, explanation) {
  const subjectIndex = SCIENCE_QUESTION_BANK.filter((question) => question.subjectId === subjectId).length + 1;
  SCIENCE_QUESTION_BANK.push({
    id: `science-${subjectId}-${String(subjectIndex).padStart(3, '0')}`,
    subjectId,
    subjectTitle: SUBJECT_TITLES[subjectId],
    topicId,
    knowledgePointIds: [pointId],
    difficulty,
    reasoningType,
    stem,
    options: optionTexts.map((text, index) => ({ id: LETTERS[index], text })),
    correctAnswer,
    explanation,
    sourceType: 'original',
    sourceId: null,
    sourceTitle: '项目原创练习题，非历年真题',
    sourceNote: '按所属基础科学知识点原创编写；题干、选项与解析均非考试原题转载。',
    verificationStatus: 'verified',
    copyrightStatus: 'original',
    region: 'general',
    examYear: null,
    publishStatus: 'published',
  });
}

// Physics: 40 original items covering motion, forces, fluids, machines, circuits, light, heat, and sound.
const physicsQuestions = [
  ['physics:kinematics', 'physics:speed', 'easy', 'calculation', '一辆车 2 小时行驶 120 千米，平均速度是多少？', ['40 千米/时', '60 千米/时', '120 千米/时', '240 千米/时'], 'B', '平均速度等于总路程除以总时间：120÷2=60 千米/时。'],
  ['physics:kinematics', 'physics:displacement-distance', 'easy', 'classification', '小明沿操场一圈回到起点。关于这次运动，哪项一定正确？', ['路程为零，位移为零', '路程不为零，位移为零', '路程和位移都等于操场周长', '路程为零，位移不为零'], 'B', '路程累计实际走过的轨迹长度；起点和终点重合，所以位移为零。'],
  ['physics:kinematics', 'physics:average-speed', 'medium', 'calculation', '骑行者前 10 分钟以 12 千米/时行驶，后 20 分钟以 6 千米/时行驶。全程平均速度是多少？', ['7 千米/时', '8 千米/时', '9 千米/时', '10 千米/时'], 'B', '前段路程为 2 千米，后段为 2 千米；总路程 4 千米、总时间 0.5 小时，平均速度为 8 千米/时。'],
  ['physics:kinematics', 'physics:relative-motion', 'medium', 'calculation', '甲、乙两车在直路上相向行驶，速度分别为 50 千米/时和 70 千米/时。两车间距每小时缩短多少？', ['20 千米', '50 千米', '70 千米', '120 千米'], 'D', '相向运动时接近速度为两车速度之和：50+70=120 千米/时。'],
  ['physics:kinematics', 'physics:acceleration', 'easy', 'calculation', '物体速度从 4 米/秒增加到 10 米/秒，用时 3 秒。平均加速度是多少？', ['2 米/秒²', '3 米/秒²', '4.7 米/秒²', '14 米/秒²'], 'A', '平均加速度等于速度变化量除以时间：(10−4)÷3=2 米/秒²。'],
  ['physics:kinematics', 'physics:motion-graphs', 'medium', 'data_interpretation', '匀速直线运动的路程—时间图像应呈现什么特征？', ['一条经过原点的直线，斜率不变', '一条水平直线', '斜率不断增大的曲线', '路程随时间先增后减'], 'A', '匀速直线运动中路程与时间成正比，路程—时间图像是斜率恒定的直线。'],
  ['physics:kinematics', 'physics:uniform-motion', 'easy', 'causal_inference', '一辆车在直路上连续 5 秒每秒都行驶 8 米。若运动方向不变，可判断它做什么运动？', ['静止', '匀速直线运动', '加速直线运动', '曲线运动'], 'B', '相等时间内通过相等路程且方向不变，符合匀速直线运动的定义。'],
  ['physics:kinematics', 'physics:acceleration', 'medium', 'calculation', '列车从静止开始做匀加速运动，4 秒后速度为 8 米/秒。加速度是多少？', ['0.5 米/秒²', '2 米/秒²', '4 米/秒²', '32 米/秒²'], 'B', '初速度为零，速度变化量是 8 米/秒；8÷4=2 米/秒²。'],
  ['physics:mechanics', 'physics:inertia', 'easy', 'causal_inference', '公交车突然刹车时，乘客身体向前倾。最直接的原因是什么？', ['乘客受到向前的惯性力', '乘客具有保持原运动状态的惯性', '刹车使乘客质量变大', '车厢内气压突然增大'], 'B', '乘客身体原本向前运动，车辆减速时身体倾向保持原来的运动状态；惯性不是一种力。'],
  ['physics:mechanics', 'physics:newton-laws', 'medium', 'causal_inference', '甲推乙，甲对乙的作用力与乙对甲的反作用力有什么关系？', ['大小相等、方向相反，作用在不同物体上', '大小相等、方向相同，作用在同一物体上', '甲的力一定更大', '反作用力晚于作用力出现'], 'A', '相互作用力大小相等、方向相反，同时产生，分别作用于相互作用的两个物体。'],
  ['physics:mechanics', 'physics:friction', 'easy', 'causal_inference', '用力推桌子但桌子没有移动，水平方向上的推力与静摩擦力如何比较？', ['推力大于静摩擦力', '推力小于静摩擦力', '二者大小相等、方向相反', '静摩擦力为零'], 'C', '桌子静止且水平方向合力为零，静摩擦力与推力平衡。'],
  ['physics:mechanics', 'physics:force-equilibrium', 'medium', 'classification', '物体在水平地面上静止，受到重力和地面支持力。可判断这两个力是什么关系？', ['一对平衡力', '一对相互作用力', '大小一定不相等', '作用在两个物体上'], 'A', '重力和支持力都作用在物体上、方向相反、大小相等，使物体保持静止，是一对平衡力。'],
  ['physics:mechanics', 'physics:motion-state', 'easy', 'causal_inference', '物体受到的合力为零时，关于它的运动状态，哪项正确？', ['一定静止', '一定做匀速直线运动', '可能静止，也可能做匀速直线运动', '一定做加速运动'], 'C', '合力为零表示加速度为零；物体可保持静止，也可保持匀速直线运动。'],
  ['physics:mechanics', 'physics:force-analysis', 'medium', 'experiment_design', '要研究滑动摩擦力与压力的关系，应如何设计对照实验？', ['改变接触面粗糙程度并保持压力相同', '在同一接触面上改变压力并测量摩擦力', '同时改变压力和接触面材料', '只改变物体运动速度'], 'B', '探究一个因素时应控制其他主要因素不变；保持接触面和运动状态一致，只改变压力。'],
  ['physics:pressure', 'physics:solid-pressure', 'easy', 'calculation', '重 200 牛的箱子放在面积 0.5 平方米的地面上，对地面的压强是多少？', ['100 帕', '200 帕', '400 帕', '1000 帕'], 'C', '压强 p=F/S=200÷0.5=400 帕。'],
  ['physics:pressure', 'physics:liquid-pressure', 'easy', 'causal_inference', '同一种液体静止时，其他条件相同，液体内部压强随深度如何变化？', ['深度越大压强越大', '深度越大压强越小', '压强与深度无关', '只与容器宽度有关'], 'A', '液体压强满足 p=ρgh；同一液体中深度 h 越大，压强越大。'],
  ['physics:pressure', 'physics:atmospheric-pressure', 'medium', 'experiment_design', '吸管能把饮料吸入口中，主要是因为哪种作用？', ['吸管把饮料向上拉', '口腔压强降低后，大气压推动饮料上升', '饮料受到重力向上', '吸管内形成绝对真空'], 'B', '吸吮使吸管内气压降低，外界大气压作用于液面并推动饮料进入吸管。'],
  ['physics:pressure', 'physics:buoyancy', 'medium', 'calculation', '物体排开水的体积为 2×10⁻³ 立方米。取水密度 1000 千克/立方米、g=10 牛/千克，浮力多大？', ['2 牛', '20 牛', '200 牛', '2000 牛'], 'B', '阿基米德原理给出 F浮=ρgV排=1000×10×0.002=20 牛。'],
  ['physics:pressure', 'physics:floating-sinking', 'easy', 'causal_inference', '一个物体漂浮在水面上且处于静止状态，它受到的浮力与重力有什么关系？', ['浮力大于重力', '浮力小于重力', '浮力等于重力', '浮力为零'], 'C', '漂浮静止时竖直方向合力为零，因此浮力与重力大小相等、方向相反。'],
  ['physics:pressure', 'physics:buoyancy-conditions', 'medium', 'comparison', '同一物体在水中完全浸没后继续下沉，忽略水的密度变化。它受到的浮力如何变化？', ['持续随深度增大', '保持不变', '持续减小', '先增大再减小'], 'B', '完全浸没后排开水的体积固定，同种液体的密度也不变，所以浮力不随深度改变。'],
  ['physics:simple-machines', 'physics:levers', 'medium', 'calculation', '杠杆左侧距支点 0.4 米处挂 30 牛的物体。右侧施加 20 牛的力，力臂应为多少才能平衡？', ['0.2 米', '0.4 米', '0.6 米', '1.2 米'], 'C', '杠杆平衡条件为动力×动力臂=阻力×阻力臂；20×L=30×0.4，所以 L=0.6 米。'],
  ['physics:simple-machines', 'physics:work', 'easy', 'calculation', '用 50 牛的力沿力的方向推动物体 4 米，做功多少？', ['12.5 焦', '46 焦', '200 焦', '400 焦'], 'C', '力与位移同向时，功 W=Fs=50×4=200 焦。'],
  ['physics:simple-machines', 'physics:power', 'medium', 'calculation', '某机器 10 秒完成 600 焦的功，平均功率是多少？', ['6 瓦', '60 瓦', '600 瓦', '6000 瓦'], 'B', '功率 P=W/t=600÷10=60 瓦。'],
  ['physics:simple-machines', 'physics:mechanical-efficiency', 'medium', 'calculation', '机械输入功为 500 焦，有用功为 400 焦，机械效率是多少？', ['20%', '80%', '100%', '125%'], 'B', '机械效率等于有用功与总输入功之比：400÷500=0.8，即 80%。'],
  ['physics:simple-machines', 'physics:pulleys', 'easy', 'classification', '理想定滑轮提升重物时，主要作用是什么？', ['省一半力', '改变施力方向', '省功', '同时省力和省距离'], 'B', '理想定滑轮不省力，也不省功；它把向下拉的力改变为向上的提升作用。'],
  ['physics:simple-machines', 'physics:mechanical-energy', 'medium', 'causal_inference', '忽略空气阻力，球从高处下落的过程中，重力势能和动能如何变化？', ['势能减小、动能增大', '势能增大、动能减小', '两者均增大', '两者均减小'], 'A', '球下落时高度降低，重力势能减小；速度增大，动能增大，机械能总量近似守恒。'],
  ['physics:electricity', 'physics:electric-current', 'easy', 'classification', '在金属导线中形成电流的带电粒子主要是什么？', ['质子定向移动', '电子定向移动', '原子核整体移动', '中子定向移动'], 'B', '金属导体中的自由电子在电场作用下定向移动，形成电流。'],
  ['physics:electricity', 'physics:ohms-law', 'easy', 'calculation', '电阻为 8 欧的导体两端电压为 24 伏，温度不变时电流是多少？', ['0.3 安', '3 安', '16 安', '192 安'], 'B', '欧姆定律 I=U/R，24÷8=3 安。'],
  ['physics:electricity', 'physics:resistance', 'medium', 'calculation', '两只 3 欧电阻串联，等效电阻是多少？', ['1.5 欧', '3 欧', '6 欧', '9 欧'], 'C', '串联电路的总电阻等于各电阻之和，3+3=6 欧。'],
  ['physics:electricity', 'physics:parallel-circuits', 'medium', 'causal_inference', '两个相同灯泡并联接在理想电源两端，拿掉其中一个，另一个灯泡通常会怎样？', ['也熄灭', '亮度不变', '亮度减半', '电源电压变为零'], 'B', '并联各支路两端电压相同；移除一支路不会切断另一支路，理想电源电压不变。'],
  ['physics:electricity', 'physics:series-circuits', 'easy', 'causal_inference', '两个灯泡串联，其中一个灯丝断开后，另一个灯泡为何熄灭？', ['电源电压消失', '电路被断开，电流停止', '另一个灯泡电阻变成零', '断点产生反向电流'], 'B', '串联电路只有一条电流路径；任一处断开都会使回路电流中断。'],
  ['physics:electricity', 'physics:electric-power', 'medium', 'calculation', '电器两端电压为 12 伏，通过电流为 2 安，电功率是多少？', ['6 瓦', '10 瓦', '14 瓦', '24 瓦'], 'D', '电功率 P=UI=12×2=24 瓦。'],
  ['physics:electricity', 'physics:electric-work', 'medium', 'calculation', '一盏 100 瓦灯连续工作 2 小时，消耗多少千瓦时电能？', ['0.02 千瓦时', '0.2 千瓦时', '2 千瓦时', '200 千瓦时'], 'B', '100 瓦=0.1 千瓦；电能为 0.1×2=0.2 千瓦时。'],
  ['physics:optics', 'physics:reflection', 'easy', 'classification', '平面镜成像时，像与物体的大小关系是什么？', ['像总比物大', '像总比物小', '像与物等大', '大小由镜面颜色决定'], 'C', '平面镜所成的虚像与物体等大，像到镜面的距离等于物到镜面的距离。'],
  ['physics:optics', 'physics:refraction', 'medium', 'causal_inference', '筷子斜插入水中，看起来像在水面处弯折，主要原因是什么？', ['光在水和空气的界面发生折射', '筷子的质量改变', '水面反射了全部光线', '大气压使筷子弯曲'], 'A', '从水中射出的光进入空气时传播方向改变，眼睛沿直线反向延长光线，产生位置偏移的视觉效果。'],
  ['physics:optics', 'physics:lens-imaging', 'medium', 'classification', '凸透镜把物体成在光屏上，说明该像具有什么性质？', ['虚像，正立', '实像，倒立', '虚像，倒立', '实像，正立'], 'B', '能在光屏上承接的像是实像；凸透镜形成的实像通常倒立。'],
  ['physics:thermal', 'physics:specific-heat', 'medium', 'comparison', '质量相同的水和铁吸收相同热量，若都不发生物态变化，哪种物质温度升高较多？', ['水，因为比热容大', '铁，因为比热容小', '温度升高相同', '无法判断任何趋势'], 'B', '由 Q=cmΔT，在质量和吸热量相同的条件下，比热容较小的铁温升较大。'],
  ['physics:thermal', 'physics:heat-transfer', 'easy', 'causal_inference', '热水杯外壁放入冷水中后，热量净传递方向是什么？', ['冷水传给热杯壁', '热杯壁传给冷水', '没有热量传递', '两者同时净吸热'], 'B', '热量自发地从温度较高的物体传向温度较低的物体，直至趋于热平衡。'],
  ['physics:thermal', 'physics:phase-change', 'medium', 'data_interpretation', '标准大气压下，冰正在熔化且持续吸热时，冰水混合物的温度如何变化？', ['持续升高', '持续降低', '熔化过程中保持约 0℃', '立即达到 100℃'], 'C', '标准大气压下冰的熔点约为 0℃；熔化吸收的热量用于物态变化，温度在熔化期间基本不变。'],
  ['physics:sound-electromagnetism', 'physics:sound-propagation', 'easy', 'classification', '声音不能在什么环境中传播？', ['空气', '水', '钢铁', '真空'], 'D', '声音传播需要介质，真空中没有可传递振动的粒子。'],
  ['physics:sound-electromagnetism', 'physics:pitch-loudness', 'medium', 'comparison', '同一介质中，音调较高的声音具有怎样的特征？', ['频率较高', '振幅一定较大', '传播速度一定更快', '响度一定更大'], 'A', '音调主要由声波频率决定；频率越高，音调越高。响度主要与振幅相关。'],
  ['physics:sound-electromagnetism', 'physics:electromagnetic-induction', 'hard', 'causal_inference', '线圈和磁铁相对静止时，线圈中没有感应电流。要产生感应电流，最直接的做法是什么？', ['保持不动并增大线圈质量', '让磁铁相对线圈运动', '把线圈换成绝缘塑料', '只改变线圈颜色'], 'B', '闭合线圈中的磁通量发生变化时可产生感应电流；相对运动能改变穿过线圈的磁场。'],
];

for (const [topicId, pointId, difficulty, type, stem, options, answer, explanation] of physicsQuestions) {
  addQuestion('physics', topicId, pointId, difficulty, type, stem, options, answer, explanation);
}

// Chemistry: 35 original items covering matter, reactions, solutions, materials, and daily-life chemistry.
const chemistryQuestions = [
  ['chemistry:changes-reactions', 'chemistry:physical-chemical-change', 'easy', 'classification', '下列变化中，哪一项属于化学变化？', ['冰块融化', '酒精挥发', '铁钉生锈', '玻璃破碎'], 'C', '铁与氧气、水等发生反应生成铁锈，产生了新物质，属于化学变化。'],
  ['chemistry:changes-reactions', 'chemistry:physical-chemical-change', 'medium', 'classification', '判断是否发生化学变化，最可靠的依据是什么？', ['颜色是否改变', '是否生成新物质', '状态是否改变', '是否吸收热量'], 'B', '化学变化的本质特征是有新物质生成；颜色、状态或能量变化单独出现时不能作为充分依据。'],
  ['chemistry:changes-reactions', 'chemistry:common-reactions', 'medium', 'conservation', '密闭容器中完成化学反应，反应前后总质量如何变化？', ['一定增加', '一定减少', '保持不变', '取决于反应是否放热'], 'C', '化学反应前后原子的种类和数目不变，密闭体系中总质量守恒。'],
  ['chemistry:changes-reactions', 'chemistry:combustion', 'easy', 'causal_inference', '蜡烛在空气中燃烧需要持续满足哪些基本条件？', ['可燃物、氧气和达到着火点', '可燃物、氮气和低温', '水、氧气和光照', '二氧化碳和高压'], 'A', '燃烧通常需要可燃物、助燃物（常为氧气）并达到着火点；缺少任一条件都可使燃烧停止。'],
  ['chemistry:changes-reactions', 'chemistry:redox-basics', 'medium', 'classification', '铜器表面逐渐形成绿色铜锈，铜在这个过程中发生了什么？', ['被氧化', '被还原', '只发生物态变化', '没有化学变化'], 'A', '铜与空气中的氧、水和二氧化碳等反应生成铜锈，铜失去电子或化合价升高，属于氧化过程。'],
  ['chemistry:changes-reactions', 'chemistry:common-reactions', 'medium', 'causal_inference', '把二氧化锰加入过氧化氢溶液后，气泡明显增多。二氧化锰最可能起什么作用？', ['反应物被大量消耗', '催化剂，加快反应但反应前后自身质量和化学性质基本不变', '生成氧气的唯一来源', '降低氧气的溶解度'], 'B', '二氧化锰可催化过氧化氢分解；催化剂改变反应速率，不作为反应物被消耗。'],
  ['chemistry:solutions-acids-bases', 'chemistry:acids-bases-salts', 'easy', 'classification', '稀盐酸使紫色石蕊试液呈现什么颜色？', ['蓝色', '红色', '绿色', '无色'], 'B', '酸性溶液能使紫色石蕊试液变红。'],
  ['chemistry:solutions-acids-bases', 'chemistry:ph', 'easy', 'data_interpretation', '某溶液的 pH 为 3。在常见水溶液定义下，它呈什么性质？', ['酸性', '中性', '碱性', '无法判断'], 'A', '25℃附近，pH 小于 7 表示酸性，等于 7 为中性，大于 7 为碱性。'],
  ['chemistry:solutions-acids-bases', 'chemistry:neutralization', 'medium', 'causal_inference', '盐酸与氢氧化钠恰好完全反应，主要生成什么？', ['氯化钠和水', '氢气和氧气', '碳酸钙和水', '钠和氯气'], 'A', '酸碱中和反应可表示为 HCl+NaOH→NaCl+H₂O，生成盐和水。'],
  ['chemistry:solutions-acids-bases', 'chemistry:solutions', 'easy', 'classification', '将食盐加入水中搅拌至看不见固体，得到的均一液体属于什么？', ['纯净物', '溶液', '悬浊液', '乳浊液'], 'B', '食盐均匀分散并溶解在水中，形成组成均一、稳定的混合物，即溶液。'],
  ['chemistry:solutions-acids-bases', 'chemistry:solubility', 'medium', 'data_interpretation', '某固体在 20℃时最多溶解 36 克/100 克水，实际加入 20 克并完全溶解。该溶液属于什么状态？', ['饱和溶液', '不饱和溶液', '悬浊液', '无法判断'], 'B', '该温度下 100 克水还能继续溶解固体，实际溶质未达到溶解度上限，因此是不饱和溶液。'],
  ['chemistry:solutions-acids-bases', 'chemistry:solutions', 'medium', 'calculation', '将 10 克食盐完全溶于 90 克水，所得溶液中食盐的质量分数是多少？', ['10%', '11.1%', '90%', '100%'], 'A', '溶液总质量为 10+90=100 克，食盐质量分数为 10÷100=10%。'],
  ['chemistry:solutions-acids-bases', 'chemistry:ph', 'medium', 'comparison', '同温下，pH=2 的溶液与 pH=5 的溶液相比，哪项正确？', ['pH=2 的溶液酸性更强', 'pH=5 的溶液酸性更强', '二者酸性相同', 'pH 数值越小越接近中性'], 'A', '在稀水溶液的常见比较中，pH 越低，酸性越强；二者 pH 相差 3 个单位。'],
  ['chemistry:materials-experiments', 'chemistry:experiments', 'easy', 'experiment_design', '要从食盐水中得到较纯的食盐固体，较合适的操作是什么？', ['过滤', '蒸发结晶', '磁选', '用漏斗分液'], 'B', '水蒸发后食盐留在容器中，可通过蒸发结晶回收溶质；过滤不能除去已溶解的食盐。'],
  ['chemistry:materials-experiments', 'chemistry:experiments', 'medium', 'experiment_design', '要分离水和不互溶的食用油，优先选择哪种方法？', ['过滤', '蒸馏', '静置后分液', '蒸发'], 'C', '油水不互溶且密度不同，静置分层后用分液操作分离最直接。'],
  ['chemistry:materials-experiments', 'chemistry:experiments', 'medium', 'experiment_design', '海水淡化若要收集可饮用的水蒸气冷凝液，主要利用哪种操作？', ['蒸馏', '磁铁吸引', '过滤', '沉淀'], 'A', '蒸馏先汽化水，再冷凝收集；不挥发的盐留在蒸馏烧瓶中。'],
  ['chemistry:materials-experiments', 'chemistry:common-gases', 'easy', 'experiment_design', '检验一瓶气体是否为氧气，常用的方法是什么？', ['伸入带火星木条，木条复燃', '滴入紫色石蕊，立即变红', '倒入澄清石灰水，必然浑浊', '靠近火焰，发出爆鸣声'], 'A', '氧气能支持燃烧，带火星木条伸入后复燃是常用检验现象。'],
  ['chemistry:materials-experiments', 'chemistry:common-gases', 'easy', 'experiment_design', '要检验无色气体是否含有二氧化碳，可观察什么现象？', ['澄清石灰水变浑浊', '带火星木条复燃', '湿润蓝色石蕊变蓝', '出现银白色金属'], 'A', '二氧化碳通入澄清石灰水可生成碳酸钙沉淀，使溶液变浑浊。'],
  ['chemistry:materials-experiments', 'chemistry:common-gases', 'medium', 'experiment_design', '检验氢气纯度时，实验人员通常应怎样处理？', ['收集后直接闻气味', '点燃前先验纯，防止混入空气引发危险', '先加入酸液', '把容器完全密封后加热'], 'B', '氢气与空气混合可能形成爆炸性混合物，点燃前应按规范验纯并远离不必要的火源。'],
  ['chemistry:materials-experiments', 'chemistry:metal-activity', 'medium', 'comparison', '把锌片放入稀盐酸中产生气泡，而铜片放入相同稀盐酸中无明显变化。可推断什么？', ['锌比铜活泼', '铜比锌活泼', '锌和铜活泼性相同', '盐酸没有酸性'], 'A', '锌能置换酸中的氢并放出氢气，铜在此条件下不能；可判断锌比铜活泼。'],
  ['chemistry:materials-experiments', 'chemistry:metal-corrosion', 'medium', 'causal_inference', '铁制品在干燥、隔绝氧气的环境中更不易生锈，说明铁生锈通常需要什么？', ['铁、氧气和水共同参与', '只有氮气', '只有光照', '只有低温'], 'A', '一般条件下铁生锈与氧气和水共同作用有关；减少水或氧气接触可减缓锈蚀。'],
  ['chemistry:materials-experiments', 'chemistry:metal-corrosion', 'easy', 'causal_inference', '在铁表面涂防锈漆，主要通过什么方式减缓锈蚀？', ['让铁更容易接触水', '隔绝铁与水、氧气接触', '提高铁的温度', '把铁变成非金属'], 'B', '涂层形成屏障，减少水和氧气到达铁表面，从而减缓腐蚀。'],
  ['chemistry:materials-experiments', 'chemistry:metal-activity', 'easy', 'classification', '黄铜通常属于哪一类物质？', ['纯铜元素', '铜和锌等组成的合金', '氧化铜单一化合物', '铜的同位素'], 'B', '黄铜是以铜、锌为主要成分的合金，属于混合物，通常比纯铜更硬。'],
  ['chemistry:changes-reactions', 'chemistry:combustion', 'medium', 'comparison', '木炭在氧气中充分燃烧的主要产物是什么？', ['一氧化碳', '二氧化碳', '氢气', '水蒸气'], 'B', '碳在氧气充足时充分燃烧，主要反应为 C+O₂→CO₂。'],
  ['chemistry:changes-reactions', 'chemistry:redox-basics', 'medium', 'classification', '氧化反应与还原反应在同一氧化还原反应中通常有什么关系？', ['只发生其中一种', '二者同时发生并相互对应', '二者必定在不同容器', '二者都不涉及电子变化'], 'B', '氧化与还原是相互关联的过程；一种物质失电子被氧化时，另一种物质得电子被还原。'],
  ['chemistry:environment-life', 'chemistry:water-purification', 'easy', 'classification', '静置后过滤浑浊水，可以有效去除哪类杂质？', ['溶解的食盐', '不溶性固体颗粒', '所有溶解气体', '水中的全部离子'], 'B', '过滤可截留不溶性颗粒；溶解的离子和小分子通常会随水通过滤纸。'],
  ['chemistry:environment-life', 'chemistry:water-purification', 'medium', 'experiment_design', '自来水煮沸后能减少许多致病微生物，但不能去除水中所有溶解盐类。原因是什么？', ['煮沸可杀灭许多微生物，但盐不随水蒸气一起挥发', '盐会被煮沸转化为氧气', '微生物无法受热', '水沸腾会增加盐的种类'], 'A', '煮沸能通过高温降低许多微生物风险，但非挥发性盐仍留在液体中。'],
  ['chemistry:environment-life', 'chemistry:everyday-chemistry', 'easy', 'causal_inference', '洗涤剂能帮助去除油污，主要因为它有助于什么过程？', ['使油污与水更易混合并分散', '把油污变成金属', '消除水的所有分子', '让油污密度变为零'], 'A', '表面活性剂可降低界面张力、包裹油污，使油滴分散并更容易被水冲走。'],
  ['chemistry:environment-life', 'chemistry:environmental-chemistry', 'medium', 'causal_inference', '大量含氮、含磷营养物进入湖泊后，最可能出现什么生态问题？', ['水体富营养化和藻类异常繁殖', '水的沸点立即降为 0℃', '所有溶解氧永久增加', '湖水变成纯净水'], 'A', '氮、磷过量可促进藻类繁殖；藻类死亡分解会消耗水中氧，破坏水生态。'],
  ['chemistry:solutions-acids-bases', 'chemistry:acids-bases-salts', 'medium', 'causal_inference', '碳酸钙与稀盐酸反应时，常观察到气泡。该气体是什么？', ['氧气', '二氧化碳', '氢气', '氮气'], 'B', '碳酸盐与酸反应生成盐、水和二氧化碳，因此出现二氧化碳气泡。'],
  ['chemistry:solutions-acids-bases', 'chemistry:neutralization', 'medium', 'calculation', '25 毫升 0.2 摩尔/升的盐酸与氢氧化钠恰好中和，需要多少毫升 0.1 摩尔/升氢氧化钠？', ['25 毫升', '50 毫升', '100 毫升', '200 毫升'], 'B', 'HCl 与 NaOH 按 1:1 反应。盐酸物质的量为 0.025×0.2=0.005 摩尔，所需碱液体积为 0.005÷0.1=0.05 升，即 50 毫升。'],
  ['chemistry:materials-experiments', 'chemistry:experiments', 'easy', 'experiment_design', '实验中要闻气体气味时，规范做法是什么？', ['把鼻子贴近瓶口深吸', '用手轻轻扇动，让少量气体飘向鼻子', '直接用嘴吸取', '加热后再闻'], 'B', '规范操作是轻轻扇闻，避免吸入过量或刺激性气体；不得直接凑近瓶口闻。'],
  ['chemistry:changes-reactions', 'chemistry:common-reactions', 'medium', 'classification', '水通电分解生成氢气和氧气。反应前后，氢原子与氧原子的总数如何变化？', ['氢原子增加，氧原子减少', '氢原子减少，氧原子增加', '两种原子总数各自守恒', '原子全部变成电子'], 'C', '化学反应中原子重新组合，原子种类和数目守恒；水分子分解为氢分子和氧分子。'],
  ['chemistry:changes-reactions', 'chemistry:combustion', 'medium', 'causal_inference', '面粉厂需要控制粉尘并远离明火，主要是因为悬浮的细粉尘可能怎样？', ['增加与氧气接触面积并迅速燃烧', '使氧气失去质量', '降低空气中全部温度', '变成不燃液体'], 'A', '细小粉尘分散后与空气接触面积大，达到条件时燃烧迅速，可能造成粉尘爆燃。'],
  ['chemistry:solutions-acids-bases', 'chemistry:solubility', 'medium', 'data_interpretation', '多数固体在水中的溶解度随温度升高而增大。将热的饱和溶液缓慢冷却后，最可能发生什么？', ['部分溶质析出', '溶剂全部消失', '溶液质量必定增加', '溶解度变成零'], 'A', '多数固体冷却时溶解度减小，原本超过低温溶解度的部分会结晶析出；具体仍取决于物质。'],
  ['chemistry:materials-experiments', 'chemistry:substance-identification', 'medium', 'experiment_design', '要区分蒸馏水和稀食盐水，哪种简单观察更直接？', ['分别蒸干少量样品，观察是否有固体残留', '比较液面颜色', '用磁铁靠近', '测量容器质量而不取样'], 'A', '蒸馏水蒸发后通常无溶质残留；食盐水蒸干后会留下食盐固体。'],
  ['chemistry:environment-life', 'chemistry:everyday-chemistry', 'easy', 'causal_inference', '密封包装可延缓部分食品变质，最直接的原因是什么？', ['减少食品与氧气、水分或微生物接触', '使食品质量归零', '让所有化学反应停止', '自动降低食品的营养成分'], 'A', '密封可减少空气、水分及外来微生物进入，从而减缓部分氧化和微生物作用，但不代表所有变化停止。'],
];

for (const [topicId, pointId, difficulty, type, stem, options, answer, explanation] of chemistryQuestions) {
  addQuestion('chemistry', topicId, pointId, difficulty, type, stem, options, answer, explanation);
}

// Biology: 35 original items on cells, plant and human physiology, inheritance, microbes, and ecology.
const biologyQuestions = [
  ['biology:cells-metabolism', 'biology:cells', 'easy', 'classification', '下列哪项最能概括细胞的基本作用？', ['生命活动的基本结构和功能单位', '所有生物的唯一组成物质', '只负责储存水分', '只存在于动物体内'], 'A', '细胞是多数生物体结构和功能的基本单位；病毒等非细胞结构是例外。'],
  ['biology:cells-metabolism', 'biology:cells', 'easy', 'classification', '在典型真核细胞中，遗传物质主要储存在哪里？', ['细胞核', '细胞壁', '液泡', '细胞外液'], 'A', '真核细胞的大部分遗传物质位于细胞核内；线粒体和叶绿体也含少量遗传物质。'],
  ['biology:cells-metabolism', 'biology:cells', 'easy', 'comparison', '植物细胞通常具有而动物细胞通常没有的结构组合是什么？', ['细胞膜和细胞质', '细胞核和线粒体', '细胞壁和叶绿体', '核糖体和细胞膜'], 'C', '植物细胞通常有细胞壁；绿色植物细胞常有叶绿体。动物细胞没有细胞壁和叶绿体。'],
  ['biology:cells-metabolism', 'biology:cells', 'medium', 'causal_inference', '细胞膜具有选择透过性，最直接的意义是什么？', ['控制部分物质进出细胞', '把细胞变成固体', '使细胞停止代谢', '让所有物质自由通过'], 'A', '细胞膜选择性地调节物质进出，有助于细胞维持内部环境。'],
  ['biology:cells-metabolism', 'biology:photosynthesis', 'easy', 'classification', '绿色植物进行光合作用时，主要吸收哪些原料并生成什么？', ['二氧化碳和水，生成有机物并释放氧气', '氧气和糖，生成氮气', '氮气和水，生成盐', '蛋白质和氧气，生成二氧化碳'], 'A', '光合作用利用光能，将二氧化碳和水合成为有机物，并释放氧气。'],
  ['biology:cells-metabolism', 'biology:photosynthesis', 'medium', 'experiment_design', '要探究光照是否影响叶片光合作用产物形成，实验中最重要的对照做法是什么？', ['一组见光、一组遮光，其他条件尽量相同', '两组植物品种和水量都不同', '只改变植物颜色', '不设置对照，只观察一片叶子'], 'A', '对照实验应只改变要研究的因素，并尽量保持植物、水分、温度等其他条件一致。'],
  ['biology:cells-metabolism', 'biology:photosynthesis', 'medium', 'causal_inference', '温室中光照不足且其他条件适宜时，增加适量光照最可能带来什么变化？', ['光合作用速率可能上升，达到其他限制因素后不再明显增加', '植物立即停止呼吸', '所有植物都无限加快生长', '二氧化碳变成氧气而无有机物产生'], 'A', '光照不足时增加光照可提高光合作用速率；当其他因素成为限制条件后，增光效应会减弱。'],
  ['biology:cells-metabolism', 'biology:respiration', 'easy', 'comparison', '关于植物呼吸作用，哪项正确？', ['只在夜间进行', '活细胞通常昼夜都进行', '只在叶片进行', '有光时必定完全停止'], 'B', '呼吸作用为细胞生命活动释放能量，活细胞通常昼夜都进行；光照不会让它必然停止。'],
  ['biology:cells-metabolism', 'biology:respiration', 'medium', 'causal_inference', '植物种子萌发时呼吸作用增强，主要是因为萌发过程需要什么？', ['为细胞分裂和生长提供能量', '把种子变成无机盐', '停止物质运输', '消除全部水分'], 'A', '萌发需要细胞代谢、分裂和生长，呼吸作用释放的能量为这些活动提供支持。'],
  ['biology:cells-metabolism', 'biology:transpiration', 'medium', 'causal_inference', '叶片气孔大量关闭后，植物蒸腾作用通常会怎样？', ['减弱', '增强到无限大', '完全不受影响', '转变为光合作用'], 'A', '蒸腾水分主要经叶片气孔散失；气孔关闭会减少水蒸气外逸。'],
  ['biology:cells-metabolism', 'biology:transpiration', 'medium', 'experiment_design', '测量枝条蒸腾强弱时，为减少误把水面蒸发当成蒸腾，宜怎样处理装置？', ['在水面覆盖一层油', '把枝条剪去全部叶片', '不断向水中加盐', '把装置放入水中'], 'A', '油层可抑制容器水面直接蒸发，使水量变化更能反映植物蒸腾。'],
  ['biology:cells-metabolism', 'biology:plant-growth', 'easy', 'classification', '水和无机盐主要通过植物体内哪种组织向上运输？', ['木质部导管', '韧皮部筛管', '表皮蜡层', '花粉管'], 'A', '木质部中的导管主要运输水和无机盐，通常由根向茎叶方向输送。'],
  ['biology:human-body', 'biology:digestion', 'easy', 'sequence', '食物经过人体消化道的正确顺序是？', ['口腔—食道—胃—小肠—大肠', '口腔—胃—食道—大肠—小肠', '胃—口腔—小肠—食道—大肠', '口腔—小肠—食道—胃—大肠'], 'A', '食物依次经口腔、咽和食道进入胃，再进入小肠和大肠。'],
  ['biology:human-body', 'biology:digestion', 'medium', 'classification', '人体吸收大多数营养物质的主要场所是什么？', ['口腔', '胃', '小肠', '食道'], 'C', '小肠内表面积大、绒毛丰富，营养物质主要在小肠被吸收。'],
  ['biology:human-body', 'biology:digestion', 'medium', 'causal_inference', '胆汁本身不含消化酶，它帮助脂肪消化的主要方式是什么？', ['把大脂肪滴分散成小脂肪滴，增加酶作用面积', '直接把脂肪合成蛋白质', '使胃酸完全消失', '把脂肪变成水'], 'A', '胆汁可乳化脂肪，使脂肪分散成较小颗粒，增加脂肪酶接触面积；胆汁不是消化酶。'],
  ['biology:human-body', 'biology:digestion', 'easy', 'causal_inference', '充分咀嚼有助于淀粉消化，主要因为唾液中哪类成分开始分解淀粉？', ['唾液淀粉酶', '血红蛋白', '胆汁盐', '胰岛素'], 'A', '唾液含淀粉酶，可开始将淀粉分解为较小的糖类。'],
  ['biology:human-body', 'biology:respiratory-circulatory-systems', 'medium', 'classification', '肺泡适于进行气体交换的主要结构特点是什么？', ['数量多、壁薄，周围毛细血管丰富', '壁厚且无血管', '只由骨组织组成', '内部充满食物'], 'A', '大量肺泡提供较大交换表面积，薄壁和密集毛细血管有利于氧气与二氧化碳扩散。'],
  ['biology:human-body', 'biology:respiratory-circulatory-systems', 'easy', 'classification', '血液中主要负责运输氧气的成分是什么？', ['红细胞中的血红蛋白', '血小板中的纤维', '淋巴液中的胆汁', '白细胞中的叶绿素'], 'A', '红细胞中的血红蛋白能与氧结合并运输氧气。'],
  ['biology:human-body', 'biology:respiratory-circulatory-systems', 'medium', 'comparison', '动脉的常见结构和功能特点是什么？', ['通常把血液从心脏送往身体各处，管壁较厚', '总是把静脉血送回心脏', '管壁最薄且只负责物质交换', '一定含有瓣膜'], 'A', '动脉通常将血液从心脏输送出去，管壁较厚、有弹性；肺动脉是输送静脉血的例外。'],
  ['biology:human-body', 'biology:respiratory-circulatory-systems', 'medium', 'causal_inference', '剧烈运动时心率上升，主要有助于什么？', ['加快向组织输送氧和营养物质并带走代谢产物', '让细胞停止呼吸', '把血液全部移出身体', '使肺泡消失'], 'A', '运动使组织耗氧和代谢需求增加，心率上升可提高循环输送能力。'],
  ['biology:human-body', 'biology:nervous-regulation', 'easy', 'classification', '手碰到很烫的物体后迅速缩回，通常属于什么反应？', ['反射', '光合作用', '消化', '蒸腾'], 'A', '缩手是神经系统对刺激作出的快速反应，属于反射活动。'],
  ['biology:human-body', 'biology:nervous-regulation', 'medium', 'sequence', '典型反射弧传递信息的顺序是什么？', ['感受器—传入神经—神经中枢—传出神经—效应器', '效应器—感受器—传入神经—神经中枢', '神经中枢—感受器—效应器—传入神经', '传出神经—感受器—效应器—神经中枢'], 'A', '刺激由感受器接收，经传入神经进入神经中枢，再通过传出神经作用于效应器。'],
  ['biology:human-body', 'biology:nervous-regulation', 'medium', 'classification', '人体调节呼吸和心跳等基本生命活动的重要中枢主要位于哪里？', ['脑干', '指甲', '胃壁', '皮肤表面'], 'A', '脑干含有调节呼吸、心跳等重要生命活动的中枢；相关调节还受其他脑区和反馈共同影响。'],
  ['biology:human-body', 'biology:nervous-regulation', 'easy', 'causal_inference', '青少年长期保持良好睡眠和规律作息，最合理的生理意义是什么？', ['支持神经系统恢复、学习记忆和身体发育', '让脑细胞永久停止活动', '替代饮食和运动', '消除所有疾病风险'], 'A', '充足规律睡眠有助于神经系统功能、记忆加工和生长发育，但不能替代健康生活其他方面。'],
  ['biology:human-body', 'biology:immunity', 'medium', 'comparison', '疫苗通常如何帮助降低某种传染病的风险？', ['刺激免疫系统形成针对病原体的免疫记忆', '直接让所有病原体变成无害水分子', '保证接种者永远不会感染任何病原体', '替代所有医疗措施'], 'A', '疫苗训练免疫系统识别特定病原体，可降低感染或重症风险，但保护程度并非绝对。'],
  ['biology:human-body', 'biology:immunity', 'medium', 'causal_inference', '抗生素滥用为什么会促使耐药菌增加？', ['敏感菌被抑制后，耐药菌更容易存活繁殖', '所有细菌会主动学会耐药', '抗生素让病毒变成细菌', '耐药性与细菌遗传无关'], 'A', '抗生素施加选择压力；耐药菌更可能存活并传代，群体中耐药比例会上升。'],
  ['biology:inheritance-microbes', 'biology:reproduction-inheritance', 'easy', 'classification', '孩子的遗传信息主要通过什么传递？', ['亲代生殖细胞中的遗传物质', '食物颜色', '后天练习形成的肌肉', '环境温度本身'], 'A', '遗传信息主要通过亲代生殖细胞中的 DNA 等遗传物质传给后代。'],
  ['biology:inheritance-microbes', 'biology:reproduction-inheritance', 'medium', 'comparison', '下列哪项通常属于后天获得的特征，而不是直接遗传的特征？', ['因长期训练形成的特定技能', '血型', '天然发色', '某些遗传性疾病倾向'], 'A', '训练形成的技能主要受后天学习影响；血型和天然发色等通常与遗传因素有关。'],
  ['biology:inheritance-microbes', 'biology:reproduction-inheritance', 'medium', 'probability', '某基因位点上，父母双方都只传递同一等位基因，子代在该位点最可能是什么情况？', ['从父母各获得一个相同等位基因', '没有该基因位点', '只从母方获得全部染色体', '遗传信息完全由环境决定'], 'A', '有性生殖中，子代通常分别从父母获得一份等位基因；题设下两份相同。'],
  ['biology:inheritance-microbes', 'biology:microorganisms', 'medium', 'causal_inference', '酵母在适宜条件下发酵糖，可产生酒精和二氧化碳。面团发酵后变松的主要原因是什么？', ['产生的二氧化碳气体形成气泡', '酵母消耗了全部面筋', '淀粉变成金属', '面团失去所有水分'], 'A', '酵母发酵产生二氧化碳，气体在面团中形成气泡，使面团膨松。'],
  ['biology:inheritance-microbes', 'biology:microorganisms', 'medium', 'causal_inference', '抗生素对普通流感病毒通常无效，最主要的原因是什么？', ['抗生素主要针对细菌的结构或代谢，流感由病毒引起', '病毒比细菌颜色浅', '抗生素只能在冬天使用', '病毒没有任何遗传物质'], 'A', '抗生素主要作用于细菌特有结构或过程；流感是病毒感染，应按医疗建议处置。'],
  ['biology:ecology', 'biology:food-chains', 'easy', 'sequence', '“草→兔→狐”这条食物链中，草属于什么角色？', ['生产者', '初级消费者', '分解者', '顶级捕食者'], 'A', '草能够通过光合作用制造有机物，是生产者；兔和狐分别为消费者。'],
  ['biology:ecology', 'biology:energy-flow', 'medium', 'causal_inference', '食物链中能量沿营养级传递时，通常总体呈现什么趋势？', ['逐级减少', '逐级增加且无损失', '只在分解者中流动', '循环回到太阳'], 'A', '能量在传递中部分用于生命活动并以热散失，故可供下一营养级利用的能量通常减少。'],
  ['biology:ecology', 'biology:energy-flow', 'medium', 'causal_inference', '若一片草地中捕食昆虫的鸟类大量减少，短期内昆虫数量最可能怎样变化？', ['可能增加，但还受食物、疾病和其他捕食者影响', '必定立刻归零', '一定完全不变', '所有植物都会立即消失'], 'A', '捕食压力减弱可能使昆虫增加；生态系统还受多种因素影响，因此不能断言必然结果。'],
  ['biology:ecology', 'biology:organisms-environment', 'easy', 'classification', '生态系统中的细菌和真菌常发挥什么作用？', ['分解遗体和排泄物，促进物质循环', '制造全部阳光', '只捕食大型动物', '停止物质循环'], 'A', '许多细菌和真菌作为分解者分解有机物，使营养元素回到环境。'],
  ['biology:ecology', 'biology:ecosystems', 'medium', 'causal_inference', '湿地植被被大面积清除后，最可能出现哪种连锁影响？', ['栖息地减少，部分物种数量和水体调节能力可能下降', '所有物种数量必定增加', '水循环立即停止', '湿地自动变成海洋'], 'A', '植被为生物提供栖息地并参与涵养水源；大面积清除可能降低生境质量和生态调节能力。'],
];

for (const [topicId, pointId, difficulty, type, stem, options, answer, explanation] of biologyQuestions) {
  addQuestion('biology', topicId, pointId, difficulty, type, stem, options, answer, explanation);
}

// Geography: 35 original items on Earth–Sun relations, weather, landforms, water, and hazards.
const geographyQuestions = [
  ['geography:earth-sun-moon', 'geography:rotation', 'easy', 'causal_inference', '地球自转造成的主要地理现象之一是什么？', ['昼夜交替', '四季更替', '板块漂移停止', '月相完全不变'], 'A', '地球自转使不同经度地区依次面向太阳和背向太阳，形成昼夜交替。'],
  ['geography:earth-sun-moon', 'geography:rotation', 'medium', 'comparison', '从北极上空观察，地球自转方向通常描述为哪一项？', ['自东向西', '自西向东', '每天改变一次方向', '沿南北方向翻滚'], 'B', '地球自转方向为自西向东；从北极上空看呈逆时针方向。'],
  ['geography:earth-sun-moon', 'geography:rotation', 'medium', 'calculation', '地球约 24 小时自转一周。相差 30°经度的两地，地方时约相差多少？', ['30 分钟', '1 小时', '2 小时', '4 小时'], 'C', '地球每小时约转过 15°；30°÷15°/小时=2 小时。'],
  ['geography:earth-sun-moon', 'geography:revolution', 'easy', 'causal_inference', '地球出现四季变化的主要天文原因是什么？', ['地轴倾斜且地球绕太阳公转', '地球每天自转一次', '月球遮挡太阳', '地球与太阳距离全年剧烈改变'], 'A', '地轴倾斜并保持近似同一指向，地球公转使各地太阳高度和昼长随季节改变。'],
  ['geography:earth-sun-moon', 'geography:seasons', 'medium', 'causal_inference', '北半球夏季通常比冬季气温高，最主要的原因是什么？', ['太阳高度较高、白昼较长，地表获得更多太阳能', '地球夏季离太阳一定更近', '北半球夏季自转停止', '大气中氧气更多'], 'A', '夏季太阳高度较高且白昼较长，单位面积和单位时间获得的太阳辐射通常更多；距离不是主要原因。'],
  ['geography:earth-sun-moon', 'geography:day-length', 'medium', 'comparison', '北半球夏至前后，北半球多数地区的白昼长度通常怎样？', ['一年中较长', '一年中较短', '昼夜必定各 12 小时', '与季节无关'], 'A', '北半球夏至前后太阳直射点位于北回归线附近，北半球多数地区白昼较长。'],
  ['geography:earth-sun-moon', 'geography:day-length', 'medium', 'data_interpretation', '春分或秋分日前后，赤道地区昼夜长度通常呈现什么特点？', ['昼夜接近等长', '白昼接近 24 小时', '黑夜接近 24 小时', '全年只有白昼'], 'A', '春分和秋分日前后太阳直射赤道，全球多数地方昼夜时长接近相等；实际还受大气折射等影响。'],
  ['geography:earth-sun-moon', 'geography:solar-altitude', 'easy', 'causal_inference', '同一地点、同一时刻附近，物体影子通常在太阳高度较高时怎样变化？', ['变短', '变长', '长度不变', '方向必定转向正北'], 'A', '太阳高度越高，光线越接近竖直照射地面，直立物体的影子通常越短。'],
  ['geography:earth-sun-moon', 'geography:solar-altitude', 'medium', 'comparison', '同一纬度、同一季节的北半球中纬度地区，正午太阳高度一般在什么季节较高？', ['夏季', '冬季', '每季完全相同', '只由海拔决定'], 'A', '北半球夏季太阳直射点北移，正午太阳高度通常高于冬季。'],
  ['geography:earth-sun-moon', 'geography:rotation', 'medium', 'calculation', '甲地地方时为 12 时，乙地位于甲地以东 45°。忽略日期变更线，乙地地方时约为几时？', ['9 时', '12 时', '15 时', '18 时'], 'C', '地球自西向东转，东边地方时较早；45°对应约 3 小时，乙地为 15 时。'],
  ['geography:atmosphere-weather', 'geography:air-pressure', 'easy', 'causal_inference', '近地面水平气流通常从哪里流向哪里？', ['低气压区流向高气压区', '高气压区流向低气压区', '只从海洋流向陆地', '与气压分布完全无关'], 'B', '水平气压梯度力推动空气由高气压区向低气压区运动；实际风向还受地转偏向力和摩擦影响。'],
  ['geography:atmosphere-weather', 'geography:wind', 'easy', 'classification', '风的本质是什么？', ['空气的水平运动', '海水的垂直运动', '岩石的缓慢移动', '水蒸气凝结成雨'], 'A', '风通常指空气的水平运动，方向和强弱受气压差及地表条件影响。'],
  ['geography:atmosphere-weather', 'geography:wind', 'medium', 'causal_inference', '夏季晴朗白天，海风通常从海洋吹向陆地。主要原因是什么？', ['陆地升温快，近地面气压相对较低', '海洋升温快，海面气压必定更低', '地球停止自转', '陆地没有空气'], 'A', '白天陆地升温较快，近地面空气受热上升，陆地气压相对偏低，较凉空气由海面吹向陆地。'],
  ['geography:atmosphere-weather', 'geography:wind', 'medium', 'causal_inference', '晴朗夜晚，陆地降温通常快于海洋，近地面常形成什么局地风？', ['陆风，由陆地吹向海洋', '海风，由海洋吹向陆地', '季风，全年固定不变', '没有空气流动'], 'A', '夜间陆地降温较快，海面相对较暖，气流在近地面可由陆地吹向海洋，形成陆风。'],
  ['geography:atmosphere-weather', 'geography:atmospheric-motion', 'medium', 'causal_inference', '山谷地区白天受热较强时，近地面气流可能怎样运动？', ['沿山坡向上，形成谷风', '沿山坡向下，形成山风', '始终垂直向下', '与山地热力差异无关'], 'A', '白天山坡升温较快，空气沿坡上升，常形成由谷地吹向山坡的谷风。'],
  ['geography:atmosphere-weather', 'geography:fronts-precipitation', 'medium', 'classification', '冷暖空气交汇形成锋面时，天气变化主要与什么有关？', ['不同气团交汇、暖空气抬升及水汽凝结', '地球磁场突然消失', '海底地形改变', '月球停止公转'], 'A', '锋面附近气团性质不同，暖湿空气抬升冷却后可能形成云和降水。'],
  ['geography:atmosphere-weather', 'geography:fronts-precipitation', 'medium', 'comparison', '与冷锋相比，暖锋过境时常见的降水特点更可能是什么？', ['暖空气沿冷空气缓慢爬升，降水范围较广且持续较久', '冷空气猛烈下沉，绝不形成云', '只有锋后无云无雨', '降水只出现在赤道'], 'A', '暖锋通常由暖空气沿冷空气缓慢爬升，常出现较大范围、持续时间较长的层状云和降水。'],
  ['geography:atmosphere-weather', 'geography:weather-systems', 'medium', 'comparison', '“天气”和“气候”的主要区别是什么？', ['天气描述短时间大气状况，气候描述较长时期平均特征及变化', '天气只指温度，气候只指降水', '二者完全同义', '气候每天变化，天气几十年不变'], 'A', '天气是短时的大气状态；气候概括较长时间内天气的统计特征和变化规律。'],
  ['geography:atmosphere-weather', 'geography:fronts-precipitation', 'medium', 'causal_inference', '暖湿空气被迫抬升后，若冷却到露点，最可能发生什么？', ['水汽凝结形成云或雾滴', '空气中的氮全部变成液体', '气压变成零', '水滴立即全部蒸发'], 'A', '空气冷却达到饱和后，水汽可凝结成微小水滴或冰晶，形成云。'],
  ['geography:atmosphere-weather', 'geography:weather-systems', 'medium', 'data_interpretation', '相对湿度接近 100% 通常表示什么？', ['空气接近该温度下的水汽饱和状态', '空气中没有水汽', '降水一定已经发生', '气温等于 100℃'], 'A', '相对湿度是实际水汽含量相对于同温度饱和水汽量的比例，接近 100% 表示接近饱和。'],
  ['geography:land-water', 'geography:water-cycle', 'easy', 'sequence', '太阳辐射驱动的水循环中，海洋水面蒸发后，水汽主要经历什么过程返回地表？', ['凝结成云并降水', '直接变成岩浆', '沉入地核', '变成氧气'], 'A', '水汽随大气运动，冷却凝结形成云，再以降水等形式返回地表或海洋。'],
  ['geography:land-water', 'geography:water-cycle', 'medium', 'causal_inference', '在其他条件相同的情况下，风速增大通常会怎样影响水面的蒸发？', ['促进蒸发', '完全阻止蒸发', '使水不再吸收热量', '使水立即结冰'], 'A', '风可带走水面附近较湿的空气，减弱局地水汽积累，通常促进蒸发。'],
  ['geography:land-water', 'geography:contour-lines', 'easy', 'classification', '等高线图上，同一条等高线上的各点海拔有什么关系？', ['相同', '从左到右逐渐增加', '必定都在海平面', '与高度无关'], 'A', '等高线连接海拔相同的各点。'],
  ['geography:land-water', 'geography:contour-lines', 'easy', 'data_interpretation', '等高线图中，等高线越密集的坡面通常意味着什么？', ['坡度越陡', '坡度越缓', '海拔一定为零', '地形必定平坦'], 'A', '相邻等高线的高差固定时，水平距离越短，坡面坡度越陡。'],
  ['geography:land-water', 'geography:terrain-reading', 'medium', 'comparison', '在等高距相同的条件下，两座山同一高差带的等高线疏密不同。哪座山坡更陡？', ['等高线较密的山', '等高线较疏的山', '两者一定相同', '无法用等高线判断'], 'A', '等高线越密集，单位水平距离内海拔变化越大，坡度越陡。'],
  ['geography:land-water', 'geography:terrain-reading', 'easy', 'classification', '地图未另行标注方向时，通常采用哪种默认方位？', ['上北下南、左西右东', '上南下北、左东右西', '上东下西、左南右北', '没有任何默认方位'], 'A', '常见地图默认上北、下南、左西、右东；实际使用仍应优先查看指北针或图例。'],
  ['geography:land-water', 'geography:water-cycle', 'medium', 'causal_inference', '植被覆盖较好的坡地通常比裸地更不易发生强烈地表侵蚀，主要因为植被能怎样？', ['减缓地表径流并以根系固土', '增加所有降雨的强度', '使坡面完全不受重力影响', '阻止水循环'], 'A', '植被截留雨滴、减缓径流并通过根系固定土壤，可降低部分侵蚀风险。'],
  ['geography:land-water', 'geography:terrain-reading', 'medium', 'classification', '分水岭最主要的地理作用是什么？', ['分隔相邻流域的地面分水界线', '连接海洋和地核', '表示气温相同的线', '表示经度相同的线'], 'A', '分水岭是相邻流域之间的地面分界，降水通常向其两侧不同流域汇流。'],
  ['geography:land-water', 'geography:tides', 'medium', 'causal_inference', '海水潮汐主要受哪些天体引力作用影响？', ['月球和太阳', '火星和木星 בלבד', '只有地球磁场', '只有风力'], 'A', '潮汐主要由月球和太阳对地球海水的引力及地球—天体相对运动共同造成。'],
  ['geography:land-water', 'geography:ocean-currents', 'medium', 'causal_inference', '暖流经过的沿岸地区，在其他条件相近时，冬季气温通常有什么倾向？', ['较温和', '必定更寒冷', '昼夜温差必定为零', '全年不再降水'], 'A', '暖流能向沿岸输送热量，通常使沿岸气候较温和；具体还受风向、地形等影响。'],
  ['geography:land-water', 'geography:ocean-currents', 'medium', 'comparison', '寒流流经的沿岸地区，常见的气候影响是什么？', ['沿岸空气较凉，部分地区容易形成雾', '所有地区降水必定增多', '海水温度立即达到沸点', '洋流会停止流动'], 'A', '寒流使沿岸海面和近海空气偏凉，稳定层结可能抑制对流；某些海岸易出现平流雾。'],
  ['geography:land-water', 'geography:tides', 'easy', 'data_interpretation', '河流进入海洋前，若沿途地势逐渐降低，河水总体流向通常是什么？', ['由高处流向低处', '由低处自动流向高处', '始终沿等高线流动', '流向由经度单独决定'], 'A', '河流受重力影响，通常由地势较高处沿河道流向较低处。'],
  ['geography:geological-processes', 'geography:earthquakes', 'medium', 'classification', '地震震源和震中分别指什么位置？', ['震源在地下发生破裂处，震中是震源在地表的垂直投影附近', '两者都只指海底', '震中在地核，震源在大气层', '二者与地震位置无关'], 'A', '震源是地下岩层破裂并释放能量的位置；震中是其在地表的投影点附近。'],
  ['geography:geological-processes', 'geography:earthquakes', 'medium', 'causal_inference', '许多强地震发生在板块边界附近，主要因为那里容易发生什么？', ['板块相互作用造成岩层应力积累与突然释放', '太阳辐射直接熔化地表', '大气风力推动地壳', '海水每天涨落'], 'A', '板块边界的挤压、拉张或错动可使岩层积累应力，断层突然滑动时释放地震能量。'],
  ['geography:geological-processes', 'geography:volcanoes', 'easy', 'classification', '火山喷发时从地表流出的熔融岩石称为什么？', ['岩浆', '熔岩', '地下水', '沉积物'], 'B', '岩浆到达地表后通常称为熔岩。'],
  ['geography:geological-processes', 'geography:volcanoes', 'medium', 'causal_inference', '活火山附近开展建设和居住规划时，首要考虑什么？', ['喷发、火山灰和熔岩流等危险并设置监测预案', '把所有坡地改为住宅', '忽略历史活动记录', '只考虑地图颜色'], 'A', '火山危险区需依据活动历史、地形和监测资料评估喷发、火山灰、熔岩流等风险并做好避险。'],
  ['geography:geological-processes', 'geography:volcanoes', 'medium', 'classification', '岩石循环中，岩浆冷却凝固最直接形成哪类岩石？', ['岩浆岩', '沉积岩', '变质岩', '土壤'], 'A', '岩浆或熔岩冷却结晶形成岩浆岩。'],
  ['geography:land-water', 'geography:terrain-reading', 'hard', 'causal_inference', '连续强降雨后，陡坡浅层土体变得饱和。该坡地最需要关注的地质灾害是什么？', ['滑坡或崩塌风险上升', '地球自转停止', '海啸必定发生', '火山灰降落'], 'A', '强降雨会增加土体含水量和自重、降低部分坡体稳定性，陡坡滑坡或崩塌风险可能上升。'],
];

for (const [topicId, pointId, difficulty, type, stem, options, answer, explanation] of geographyQuestions) {
  addQuestion('geography', topicId, pointId, difficulty, type, stem, options, answer, explanation);
}

function addPublishedReferenceQuestion(question) {
  SCIENCE_QUESTION_BANK.push({
    ...question,
    subjectTitle: SUBJECT_TITLES[question.subjectId],
    options: question.options.map((text, index) => ({ id: LETTERS[index], text })),
    verificationStatus: 'verified',
    copyrightStatus: 'reference_only',
    publishStatus: 'published',
  });
}

const dragonflyDiagram = `<svg viewBox="0 0 420 160" role="img" aria-label="三个水波圆依次由右向左变小，表示蜻蜓连续点水的位置和先后"><line x1="45" y1="125" x2="375" y2="125" stroke="#9aa7ba" stroke-dasharray="4 5"/><circle cx="300" cy="80" r="66" fill="#dbeafe" fill-opacity=".35" stroke="#3878be" stroke-width="2"/><circle cx="190" cy="80" r="42" fill="#dbeafe" fill-opacity=".35" stroke="#3878be" stroke-width="2"/><circle cx="95" cy="80" r="22" fill="#dbeafe" fill-opacity=".35" stroke="#3878be" stroke-width="2"/><circle cx="300" cy="80" r="4" fill="#1d4ed8"/><circle cx="190" cy="80" r="4" fill="#1d4ed8"/><circle cx="95" cy="80" r="4" fill="#1d4ed8"/><text x="279" y="154" fill="#42536d" font-size="12">最早点水</text><text x="77" y="154" fill="#42536d" font-size="12">最近点水</text><text x="181" y="22" fill="#42536d" font-size="12">水波扩散示意（重绘）</text></svg>`;
const trainCupDiagram = `<svg viewBox="0 0 360 150" role="img" aria-label="列车向右行驶并制动，杯中水面右侧较高"><path d="M100 36h160l20 25v61H80V61z" fill="#eff6ff" stroke="#55708e" stroke-width="3"/><path d="M88 78 Q170 88 284 60v44H88z" fill="#8bd0e8" fill-opacity=".72" stroke="#1684a8" stroke-width="2"/><line x1="90" y1="105" x2="280" y2="105" stroke="#55708e" stroke-width="3"/><path d="M125 24h116" stroke="#55708e" stroke-width="3" marker-end="url(#train-arrow)"/><text x="150" y="17" fill="#42536d" font-size="12">列车向右</text><path d="M330 55v43" stroke="#c2413a" stroke-width="3" marker-end="url(#brake-arrow)"/><text x="300" y="45" fill="#8b2d2b" font-size="12">制动</text><defs><marker id="train-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="#55708e"/></marker><marker id="brake-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="#c2413a"/></marker></defs></svg>`;

addPublishedReferenceQuestion({
  id: 'beijing-2026-outline-dragonfly', subjectId: 'physics', topicId: 'physics:kinematics', knowledgePointIds: ['physics:uniform-motion'],
  difficulty: 'medium', reasoningType: 'data_interpretation', sourceType: 'official_outline_example', sourceId: 'beijing-2026-outline',
  sourceTitle: '北京市 2026 年公务员考试大纲科学推理例题', region: '北京', examYear: 2026, diagramSvg: dragonflyDiagram,
  sourceNote: '题面和答案来自官方大纲；图为便于阅读的重绘示意，不是原 PDF 截图。',
  stem: '无人机俯拍到平静湖面上一只蜻蜓连续三次点水的波纹。图中三个圆为三次点水产生的波纹；水波匀速扩散，蜻蜓沿直线匀速运动。根据波纹大小和圆心位置，判断蜻蜓的运动情况。',
  options: ['自右向左飞，速度比水波传播速度快', '自右向左飞，速度比水波传播速度慢', '自左向右飞，速度比水波传播速度快', '自左向右飞，速度比水波传播速度慢'],
  correctAnswer: 'A', explanation: '圆心对应点水位置；波纹越大，点水越早。最大圆在右侧，因此蜻蜓由右向左。两次点水间隔相同，若蜻蜓在这段时间的位移大于最早波纹的半径，则飞行速度大于水波扩散速度。官方大纲给出的答案为 A。',
});

addPublishedReferenceQuestion({
  id: 'sh-2020-outline-bicycle-friction', subjectId: 'physics', topicId: 'physics:mechanics', knowledgePointIds: ['physics:friction'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'official_outline_example', sourceId: 'sh-2020-admin-outline',
  sourceTitle: '上海市 2020 年行政执法类公务员考试大纲例题', region: '上海', examYear: 2020,
  sourceNote: '官方 PDF 原件给出例题和答案；此处按题意重述，选项顺序与原件一致。',
  stem: '自行车向前行驶时，地面对前轮和后轮的摩擦力方向分别是什么？',
  options: ['前轮向后、后轮向前', '前轮向前、后轮向后', '前轮和后轮都向后', '前轮和后轮都向前'],
  correctAnswer: 'A', explanation: '后轮由链条驱动，地面对驱动轮的静摩擦力向前；前轮是从动轮，地面的静摩擦力帮助车轮转动，方向向后。官方大纲答案为 A。',
});

addPublishedReferenceQuestion({
  id: 'gd-2019-township-wind-energy', subjectId: 'physics', topicId: 'physics:simple-machines', knowledgePointIds: ['physics:mechanical-energy'],
  difficulty: 'easy', reasoningType: 'causal_inference', sourceType: 'recalled', sourceId: 'gd-2019-township-recall',
  sourceTitle: '2019 广东省考乡镇卷回忆题 · 风能发电', region: '广东', examYear: 2019,
  sourceNote: '考生回忆版；答案 D 与另一公开题解交叉核对。',
  stem: '风能是一种清洁的可再生能源。下列关于利用风能发电的说法，不正确的是哪一项？',
  options: ['风力发电场可以建在海上', '风力发电是将风的动能转化为电能', '风力发电的能量最终来源于太阳能', '风力发电过程中不会有能量损失'],
  correctAnswer: 'D', explanation: '能量转化过程中会有一部分能量以热、声等形式散失。风轮先把风能转为机械能，再由发电机转为电能；“不会有能量损失”不正确。',
});

addPublishedReferenceQuestion({
  id: 'gd-2019-township-ear-pressure', subjectId: 'physics', topicId: 'physics:pressure', knowledgePointIds: ['physics:atmospheric-pressure'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'recalled', sourceId: 'gd-2019-township-recall',
  sourceTitle: '2019 广东省考乡镇卷回忆题 · 高海拔耳压', region: '广东', examYear: 2019,
  sourceNote: '考生回忆版；题面和答案在闻思教育公开 PDF 中可复核。',
  stem: '短时间从低海拔升到高海拔时，外界气压下降，鼓膜会感到不适。咀嚼或大口吞咽能缓解不适，主要原理是什么？',
  options: ['转移注意力，减少不适感', '吸入更多氧气，使新陈代谢加快', '疏通咽鼓管，使鼓室与外界气压趋于平衡', '提高鼓膜振动频率'],
  correctAnswer: 'C', explanation: '咽鼓管连通鼓室和咽部。吞咽、咀嚼可使其短暂开放，帮助鼓膜两侧气压趋于平衡，从而缓解压迫感。',
});

addPublishedReferenceQuestion({
  id: 'gd-2019-township-hammer-lever', subjectId: 'physics', topicId: 'physics:simple-machines', knowledgePointIds: ['physics:levers'],
  difficulty: 'easy', reasoningType: 'causal_inference', sourceType: 'recalled', sourceId: 'gd-2019-township-recall',
  sourceTitle: '2019 广东省考乡镇卷回忆题 · 起钉锤', region: '广东', examYear: 2019,
  sourceNote: '题目引用其公开题干；答案由华图公开解析页核对。原题配图未纳入，文字保留支点和力臂标记。',
  stem: '锤子可用作起钉杠杆。若想起钉时更省力，最科学的做法是什么？',
  options: ['适当延长把手 BC 的长度', '适当延长起钉部位 OA 的长度', '增加锤子的重量', '增加把手的重量'],
  correctAnswer: 'A', explanation: '以 O 为支点，延长把手 BC 会增大动力臂；在阻力和阻力臂不变时，根据杠杆平衡条件，所需动力减小。',
});

addPublishedReferenceQuestion({
  id: 'gd-2021-township-steelmaking', subjectId: 'chemistry', topicId: 'chemistry:changes-reactions', knowledgePointIds: ['chemistry:physical-chemical-change'],
  difficulty: 'easy', reasoningType: 'classification', sourceType: 'recalled', sourceId: 'gd-2021-township-recall',
  sourceTitle: '2021 广东省考乡镇卷回忆题 · 物理变化与化学变化', region: '广东', examYear: 2021,
  sourceNote: '考生回忆版；“百炼成钢”涉及炼铁、炼钢中的化学反应。',
  stem: '下列词语所描述的场景中，涉及化学变化的是哪一项？',
  options: ['聚沙成塔', '百炼成钢', '香气四溢', '冰冻三尺'],
  correctAnswer: 'B', explanation: '炼钢过程中，铁水中的碳等杂质与氧发生反应，物质组成发生变化，属于化学变化。聚沙、扩散和结冰没有生成新物质，属于物理变化。',
});

addPublishedReferenceQuestion({
  id: 'gd-2021-township-cooling-rate', subjectId: 'physics', topicId: 'physics:thermal', knowledgePointIds: ['physics:heat-transfer'],
  difficulty: 'medium', reasoningType: 'comparison', sourceType: 'recalled', sourceId: 'gd-2021-township-recall',
  sourceTitle: '2021 广东省考乡镇卷回忆题 · 水的降温速度', region: '广东', examYear: 2021,
  sourceNote: '考生回忆版；按同杯、等量水、同一冰箱的常见散热条件理解“降温更快”。',
  stem: '两个相同玻璃杯中装有等量水，甲杯水温高于乙杯。将两杯同时放进更冷的冰箱，哪种判断更合理？',
  options: ['乙杯水温下降更快', '甲杯水温下降更快', '两杯降温速度一样', '条件不足，无法比较'],
  correctAnswer: 'B', explanation: '在相同容器和相同环境下，温差较大时向环境传热通常更快；甲杯与冰箱的初始温差更大，因此初始降温更快。温度变化过程中两杯温差会逐渐缩小。',
});

addPublishedReferenceQuestion({
  id: 'gd-2023-township-karting-friction', subjectId: 'physics', topicId: 'physics:mechanics', knowledgePointIds: ['physics:friction'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'recalled', sourceId: 'gd-2023-township-recall',
  sourceTitle: '2023 广东省考乡镇卷回忆题 · 卡丁车过弯', region: '广东', examYear: 2023,
  sourceNote: '第三方考生回忆整理；本题为无图文字题。',
  stem: '卡丁车经过半圆形弯道时容易向外滑出。下列做法中，最可能提高过弯抓地能力的是哪一项？',
  options: ['增加卡丁车质量', '减少卡丁车质量', '换用摩擦力更大的轮胎', '减小弯道半径'],
  correctAnswer: 'C', explanation: '转弯需要轮胎与地面之间的侧向摩擦力提供向心力。提高轮胎抓地能力可增大可提供的摩擦力；质量增大或弯道半径减小都会提高所需向心力。',
});

addPublishedReferenceQuestion({
  id: 'gd-2023-township-sunlit-city', subjectId: 'geography', topicId: 'geography:earth-sun-moon', knowledgePointIds: ['geography:solar-altitude'],
  difficulty: 'medium', reasoningType: 'data_interpretation', sourceType: 'recalled', sourceId: 'gd-2023-township-recall',
  sourceTitle: '2023 广东省考乡镇卷回忆题 · 住宅朝向与太阳直射', region: '广东', examYear: 2023,
  sourceNote: '第三方考生回忆整理；结论依据给定城市选项和太阳直射点季节移动。',
  stem: '某住宅北侧夏季能被阳光照到，南侧冬季能被阳光照到。以下城市中，该住宅最可能位于哪里？',
  options: ['海口', '武汉', '上海', '北京'],
  correctAnswer: 'A', explanation: '夏至时太阳直射北回归线附近。北回归线以南的海口位于热带范围内，夏季正午太阳可位于天顶以北，照到住宅北侧；冬季太阳位于南侧。其余城市均在北回归线以北。',
});

addPublishedReferenceQuestion({
  id: 'mock-train-cup-inertia', subjectId: 'physics', topicId: 'physics:mechanics', knowledgePointIds: ['physics:inertia'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'third_party_mock', sourceId: 'gd-2027-zhonggong-mock',
  sourceTitle: '中公科学推理模拟题 · 列车制动与水面倾斜', region: '广东', examYear: null, diagramSvg: trainCupDiagram,
  sourceNote: '机构模拟题，图形依据来源页面的水面倾斜示意重绘；非历年真题。',
  stem: '列车沿直线运动，杯中水面如图向右升高。下列哪种列车运动状态可能造成这一现象？',
  options: ['列车向右行驶时突然刹车', '列车向右匀速行驶', '列车向左行驶时突然刹车', '列车向左匀速行驶'],
  correctAnswer: 'A', explanation: '列车向右运动时突然制动，水因惯性仍有向右运动的趋势，于是右侧水面升高。匀速运动不会造成这一倾斜；向左制动时倾斜方向相反。',
});

addPublishedReferenceQuestion({
  id: 'gd-2020-township-seed-storage', subjectId: 'biology', topicId: 'biology:inheritance-microbes', knowledgePointIds: ['biology:plant-growth'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'recalled', sourceId: 'gd-2020-township-recall',
  sourceTitle: '2020 广东省考乡镇卷回忆题 · 种子储藏', region: '广东', examYear: 2020, presentationMode: 'adapted',
  sourceNote: '按回忆题公开题意改述；答案 B 与公开参考解析核对，非官方答案。',
  stem: '农技人员要储藏下一季播种用的种子，以下哪种环境更有利于减少种子消耗和霉变？',
  options: ['浸泡在水中保存', '放在干燥且氧气含量很低的环境中', '置于温暖潮湿的仓库', '只遮光但保持潮湿'],
  correctAnswer: 'B', explanation: '干燥能降低霉变风险，减少氧气可减慢种子的呼吸消耗。储藏目标是保持种子活性并避免提前萌发，单独遮光或浸水都不能达到这一点。',
});

addPublishedReferenceQuestion({
  id: 'gd-2020-township-snowline', subjectId: 'geography', topicId: 'geography:land-water', knowledgePointIds: ['geography:snowline'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'recalled', sourceId: 'gd-2020-township-recall',
  sourceTitle: '2020 广东省考乡镇卷回忆题 · 雪线变化', region: '广东', examYear: 2020, presentationMode: 'adapted',
  sourceNote: '按回忆题公开题意改述；参考答案 D 与公开解析核对，非官方答案。',
  stem: '若气候和降雪量发生变化，哪种组合与雪线“向高处移动”最不相符？',
  options: ['变暖、降雪增加', '变暖、降雪减少', '变冷、降雪减少', '变冷、降雪增加'],
  correctAnswer: 'D', explanation: '气候变冷和降雪增加都会让积雪更容易维持到较低海拔，雪线倾向下移，因此与“雪线上移”不相符。',
});

addPublishedReferenceQuestion({
  id: 'gd-2020-township-seawater-density', subjectId: 'physics', topicId: 'physics:pressure', knowledgePointIds: ['physics:density'],
  difficulty: 'easy', reasoningType: 'comparison', sourceType: 'recalled', sourceId: 'gd-2020-township-recall',
  sourceTitle: '2020 广东省考乡镇卷回忆题 · 海水密度', region: '广东', examYear: 2020, presentationMode: 'adapted',
  sourceNote: '按回忆题公开题意改述；答案与闻思教育公开解析及华图题库条目交叉核对。',
  stem: '在其他条件相同的情况下，海水温度和含盐量的哪种变化组合通常会使密度增大？',
  options: ['温度升高、盐度降低', '温度降低、盐度升高', '温度升高、盐度升高', '温度降低、盐度降低'],
  correctAnswer: 'B', explanation: '在常见海水条件下，降温通常使海水密度增大，盐度升高也使密度增大；两种影响方向相同。',
});

addPublishedReferenceQuestion({
  id: 'gd-2020-township-acid-indicator', subjectId: 'chemistry', topicId: 'chemistry:solutions-acids-bases', knowledgePointIds: ['chemistry:ph'],
  difficulty: 'easy', reasoningType: 'classification', sourceType: 'recalled', sourceId: 'gd-2020-township-recall',
  sourceTitle: '2020 广东省考乡镇卷回忆题 · 植物色素指示剂', region: '广东', examYear: 2020, presentationMode: 'adapted',
  sourceNote: '题意改述自考生回忆版；颜色规则由题干给定，答案 C 与公开解析核对。',
  stem: '某植物色素在酸性溶液中显红色、碱性溶液中显黄色、中性溶液中保持紫色。滴入小苏打水后，最可能看到什么？',
  options: ['红色，因为小苏打水呈酸性', '无色，因为小苏打水不含指示剂', '黄色，因为小苏打水呈碱性', '颜色不变，因为指示剂只能测强酸'],
  correctAnswer: 'C', explanation: '小苏打水通常呈弱碱性；按题目给出的指示剂规则，溶液呈黄色。判断以题目指定的变色条件为准。',
});

addPublishedReferenceQuestion({
  id: 'gd-2020-township-gas-properties', subjectId: 'chemistry', topicId: 'chemistry:materials-experiments', knowledgePointIds: ['chemistry:common-gases'],
  difficulty: 'medium', reasoningType: 'classification', sourceType: 'recalled', sourceId: 'gd-2020-township-recall',
  sourceTitle: '2020 广东省考乡镇卷回忆题 · 常见气体与用途', region: '广东', examYear: 2020, presentationMode: 'adapted',
  sourceNote: '按回忆题中物质性质与用途的配对关系改述；答案 A 与公开中公解析核对。',
  stem: '下列“物质—用途”配对中，哪一项都符合常见化学性质？',
  options: ['臭氧作氧化剂；液氮用于低温冷却', '二氧化碳作干燥剂；氦气作燃料', '氮气作助燃剂；氧气作食品防腐气体', '氦气作燃料；臭氧作灭火气体'],
  correctAnswer: 'A', explanation: '臭氧有较强氧化性；液氮汽化吸热明显，可提供低温。二氧化碳不能按一般干燥剂使用，氦气不燃烧，氮气也不助燃。',
});

addPublishedReferenceQuestion({
  id: 'gd-2020-township-reverse-bearing', subjectId: 'geography', topicId: 'geography:land-water', knowledgePointIds: ['geography:map-directions'],
  difficulty: 'easy', reasoningType: 'data_interpretation', sourceType: 'recalled', sourceId: 'gd-2020-township-recall',
  sourceTitle: '2020 广东省考乡镇卷回忆题 · 反向方位', region: '广东', examYear: 2020, presentationMode: 'adapted',
  sourceNote: '依据回忆题的方向关系改述；参考答案 A 与公开解析核对。',
  stem: '乙位于甲的东偏北 37°方向。若方向信息准确，从乙看甲应位于什么方向？',
  options: ['西偏南 37°', '西偏南 53°', '西偏北 37°', '东偏南 37°'],
  correctAnswer: 'A', explanation: '两点间的反向方位要把东、西和南、北同时反转，偏转角保持不变，因此为西偏南 37°。',
});

addPublishedReferenceQuestion({
  id: 'gd-2020-township-electric-charge', subjectId: 'physics', topicId: 'physics:electricity', knowledgePointIds: ['physics:electrostatics'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'recalled', sourceId: 'gd-2020-township-recall',
  sourceTitle: '2020 广东省考乡镇卷回忆题 · 轻质小球带电', region: '广东', examYear: 2020, presentationMode: 'adapted',
  sourceNote: '按回忆题的吸引、排斥条件改述；答案 D 与公开参考解析核对。',
  stem: '轻质小球甲吸引乙、排斥丙。下列说法中哪一项可能成立？',
  options: ['若乙带正电，丙也可能带正电', '若乙带正电，丙可能不带电', '若丙带负电，乙可能带负电', '若丙带负电，乙可能不带电'],
  correctAnswer: 'D', explanation: '甲与丙排斥，说明甲、丙都带电且同号。若丙带负电，则甲也带负电；甲与乙相吸，乙可以带正电，也可以不带电，因此 D 可能成立。',
});

addPublishedReferenceQuestion({
  id: 'gd-2020-township-everyday-materials', subjectId: 'chemistry', topicId: 'chemistry:materials-experiments', knowledgePointIds: ['chemistry:everyday-chemistry'],
  difficulty: 'medium', reasoningType: 'classification', sourceType: 'recalled', sourceId: 'gd-2020-township-recall',
  sourceTitle: '2020 广东省考乡镇卷回忆题 · 生活材料性质', region: '广东', examYear: 2020, presentationMode: 'adapted',
  sourceNote: '按回忆题的性质判断关系改述；答案 B 与公开解析核对。',
  stem: '关于常见生活材料和用途，以下哪项说法正确？',
  options: ['不锈钢在任何环境下都不会被腐蚀', '食品包装中使用氮气可减少氧化并抑制需氧微生物', '小苏打使面团膨松是因为它具有乳化作用', '洗洁精去油污会把油脂转化为新物质'],
  correctAnswer: 'B', explanation: '氮气在常见条件下化学性质较稳定，减少氧气可降低食品氧化，也不利于需氧微生物活动。洗洁精主要通过乳化分散油污，不等于生成新物质。',
});

addPublishedReferenceQuestion({
  id: 'gd-2020-township-saline-concentration', subjectId: 'chemistry', topicId: 'chemistry:solutions-acids-bases', knowledgePointIds: ['chemistry:solutions'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'recalled', sourceId: 'gd-2020-township-recall',
  sourceTitle: '2020 广东省考乡镇卷回忆题 · 氯化钠溶液配制', region: '广东', examYear: 2020, presentationMode: 'adapted',
  sourceNote: '题意按回忆版改述；答案 C 与公开解析核对。',
  stem: '配制目标质量分数为 8% 的氯化钠溶液，以下哪种操作失误会使最终溶液浓度偏低？',
  options: ['称盐时天平指针偏右仍继续加盐', '使用实际质量偏大的锈蚀砝码称盐', '量取水时视线低于液面刻度线读数', '混合后有一部分水洒出容器'],
  correctAnswer: 'C', explanation: '仰视量筒刻度会使实际取出的水多于目标量，溶剂增多使质量分数降低。多加盐或洒出部分水通常会使浓度升高。',
});

addPublishedReferenceQuestion({
  id: 'sh-2019-b-exposure-time', subjectId: 'physics', topicId: 'physics:kinematics', knowledgePointIds: ['physics:speed'],
  difficulty: 'medium', reasoningType: 'data_interpretation', sourceType: 'recalled', sourceId: 'sh-2019-b-recall',
  sourceTitle: '2019 上海市考 B 卷回忆题 · 曝光时间与运动成像', region: '上海', examYear: 2019, presentationMode: 'adapted',
  sourceNote: '由回忆题中的车速、成像比例和允许模糊量化简重述；答案按比例和单位换算复核。',
  stem: '汽车以 54 km/h 行驶，照片中车长 2 cm，而实车长 3 m。若底片上像的移动不超过 0.1 mm，曝光时间最多约为多少？',
  options: ['0.001 s', '0.002 s', '0.004 s', '0.008 s'],
  correctAnswer: 'A', explanation: '成像比例为 2 cm / 300 cm = 1/150。底片移动 0.1 mm 对应实车移动 15 mm；54 km/h = 15 m/s，所以最长曝光时间为 0.015/15 = 0.001 s。',
});

addPublishedReferenceQuestion({
  id: 'sh-2019-b-slide-kinetic-energy', subjectId: 'physics', topicId: 'physics:simple-machines', knowledgePointIds: ['physics:mechanical-energy'],
  difficulty: 'medium', reasoningType: 'comparison', sourceType: 'recalled', sourceId: 'sh-2019-b-recall',
  sourceTitle: '2019 上海市考 B 卷回忆题 · 斜面滑行与质量', region: '上海', examYear: 2019, presentationMode: 'adapted',
  sourceNote: '按回忆题关于相同斜面和相同动摩擦条件改述；用能量关系复核结论。',
  stem: '体重不同的乘客沿同一条充气逃生滑道下滑，假设斜面和动摩擦条件相同且忽略空气阻力。到达地面时哪项判断更合理？',
  options: ['质量较大者速度和动能都更大', '速度相同，质量较大者动能更大', '质量较大者速度更小但动能相同', '速度和动能都与质量无关'],
  correctAnswer: 'B', explanation: '重力势能和摩擦做功都与质量成正比，求速度时质量可约去，因此相同条件下到达速度相同。动能为 1/2mv²，速度相同而质量较大者动能较大。',
});

addPublishedReferenceQuestion({
  id: 'sh-2021-b-pressure-estimate', subjectId: 'physics', topicId: 'physics:pressure', knowledgePointIds: ['physics:solid-pressure'],
  difficulty: 'medium', reasoningType: 'data_interpretation', sourceType: 'recalled', sourceId: 'sh-2021-b-recall',
  sourceTitle: '2021 上海市考 B 卷回忆题 · 常见物理量估测', region: '上海', examYear: 2021, presentationMode: 'adapted',
  sourceNote: '题目见上海 B 卷回忆版；估测答案另见华图公开解析，题干已简化重述。',
  stem: '下列生活中的物理量估测，哪一项最接近实际？',
  options: ['一页书纸厚约 0.01 m', '一粒西瓜子平放桌面时压强约 20 Pa', '成年人上楼一层克服重力做功约 150 J', '教室日光灯工作电流约 10 mA'],
  correctAnswer: 'B', explanation: '按估算质量约 0.2 g、接触面积约 1 cm²，压力约 0.002 N、面积约 10⁻⁴ m²，压强约为 20 Pa。纸厚和上楼做功都明显被低估，日光灯工作电流通常高于 10 mA。',
});

addPublishedReferenceQuestion({
  id: 'mock-rollercoaster-energy', subjectId: 'physics', topicId: 'physics:simple-machines', knowledgePointIds: ['physics:mechanical-energy'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'third_party_mock', sourceId: 'gd-2027-zhonggong-mock',
  sourceTitle: '中公科学推理模拟题 · 过山车机械能', region: '广东', examYear: null, presentationMode: 'adapted',
  sourceNote: '中公解析转载的机构模拟题；按公开题意重述，假设不计摩擦和能量损失，非历年真题。',
  stem: '过山车从较低的 D 点驶向较高的 A 点，忽略摩擦和能量损失。以下判断正确的是哪一项？',
  options: ['A 点的机械能小于 D 点', 'D 点动能较大，A 点重力势能较大', 'A 点和 D 点的动能相同', 'A 点的重力势能小于 D 点'],
  correctAnswer: 'B', explanation: '忽略能量损失时机械能守恒。D 点较低，速度通常较大、动能较大；A 点较高，重力势能较大。',
});

addPublishedReferenceQuestion({
  id: 'sh-2025-b-railway-resonance', subjectId: 'physics', topicId: 'physics:mechanics', knowledgePointIds: ['physics:elastic-force'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'recalled', sourceId: 'sh-2025-b-recall',
  sourceTitle: '2025 上海市考 B 类回忆题 · 动车减振与共振', region: '上海', examYear: 2025, presentationMode: 'adapted',
  sourceNote: '按第三方回忆卷中的弹簧支撑车厢题改述；原题参考答案 D，改写后正确项为 A，答案与独立答案页交叉核对，非官方答案。',
  stem: '动车车厢由弹簧支撑，并受到周期性轨道振动。若外部激励频率接近车厢的固有频率，最可能出现什么现象？',
  options: ['发生共振，车厢振幅可能增大', '阻尼越大，车厢振幅一定越大', '车厢固有频率只由弹簧决定，与质量无关', '只要增加弹簧刚度，任何频率下的振幅都会减小'],
  correctAnswer: 'A', explanation: '受迫振动的激励频率接近系统固有频率时可能发生共振，使振幅明显增大。阻尼通常会耗散振动能量；固有频率还与系统质量有关，单纯提高弹簧刚度也不能保证所有激励条件下振幅都减小。',
});

addPublishedReferenceQuestion({
  id: 'sh-2025-b-absorption-spectrum', subjectId: 'physics', topicId: 'physics:optics', knowledgePointIds: ['physics:optical-phenomena'],
  difficulty: 'easy', reasoningType: 'causal_inference', sourceType: 'recalled', sourceId: 'sh-2025-b-recall',
  sourceTitle: '2025 上海市考 B 类回忆题 · 光谱吸收', region: '上海', examYear: 2025, presentationMode: 'adapted',
  sourceNote: '依据第三方回忆卷题意改述；参考答案 A 与独立答案页交叉核对，非官方答案。',
  stem: '光谱仪把光分解成不同颜色；样品吸收某些波长后，对应位置会出现暗线。若入射光只含红、黄、蓝三种单色光，最可能看到什么？',
  options: ['红、黄、蓝对应位置各有一条暗线', '三种颜色之间各有一条暗线', '三种颜色合成一个连续的宽暗带', '不会出现暗线'],
  correctAnswer: 'A', explanation: '吸收线对应被样品吸收的特定波长。入射光只有三种离散波长时，暗线应分别出现在这三种颜色对应的位置。',
});

addPublishedReferenceQuestion({
  id: 'sh-2025-b-space-elevator', subjectId: 'physics', topicId: 'physics:mechanics', knowledgePointIds: ['physics:gravity'],
  difficulty: 'medium', reasoningType: 'classification', sourceType: 'recalled', sourceId: 'sh-2025-b-recall',
  sourceTitle: '2025 上海市考 B 类回忆题 · 太空电梯', region: '上海', examYear: 2025, presentationMode: 'adapted',
  sourceNote: '依据第三方回忆卷题意改述；参考答案 D 与独立答案页交叉核对，非官方答案。',
  stem: '设想太空电梯缆绳连接赤道附近地面与地球同步轨道。下列说法中错误的是哪一项？',
  options: ['基座适合设置在赤道附近', '电梯与地球同步自转，离地轴越远线速度越大', '高强度轻质缆绳材料是建造难点之一', '同步轨道外的配重只用于抵消缆绳自身重力'],
  correctAnswer: 'D', explanation: '同步轨道外的配重用于维持缆绳张力和整体旋转平衡，不只是抵消缆绳重力。赤道位置和同步旋转来自轨道几何条件；同角速度下，离转轴越远线速度越大。',
});

addPublishedReferenceQuestion({
  id: 'sh-2026-outline-hall-effect', subjectId: 'physics', topicId: 'physics:sound-electromagnetism', knowledgePointIds: ['physics:magnetic-field'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'official_outline_example', sourceId: 'sh-2026-official-outline',
  sourceTitle: '上海市 2026 年公务员大纲科学素养例题 · 霍尔传感器', region: '上海', examYear: 2026, presentationMode: 'adapted',
  sourceNote: '题意改述自上海市公务员局官方大纲例题；原题答案 C，改写后正确项仍为 C。该年度大纲将相关考查称为“科学素养”。',
  stem: '工业机器人用传感器测量关节转速和位置，器件在磁场作用下按磁场强度输出电压信号。最可能利用什么原理？',
  options: ['安培力使关节直接转动', '洛伦兹力直接推动整个关节运动', '霍尔效应使载流元件两侧形成横向电压', '光电效应使元件受光后发射电子'],
  correctAnswer: 'C', explanation: '霍尔元件中的载流子在磁场作用下发生偏转并在两侧积累电荷，形成横向霍尔电压。测量该电压可推知磁场变化，进而检测转速或位置。',
});

addPublishedReferenceQuestion({
  id: 'gd-2024-soot-ink', subjectId: 'chemistry', topicId: 'chemistry:changes-reactions', knowledgePointIds: ['chemistry:combustion'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'recalled', sourceId: 'gd-2024-recall',
  sourceTitle: '2024 广东省考回忆题 · 蜡烛制墨', region: '广东', examYear: 2024, presentationMode: 'adapted',
  sourceNote: '据 2024 年广东省考考生回忆版改述，答案 A 与公开解析核对；原题及答案非官方发布。',
  stem: '传统制墨时，可将冷器皿置于蜡烛火焰上方收集黑色炭质物。下列对这一过程的说法不正确的是哪一项？',
  options: ['蜡烛燃料主要由收集到的炭黑制成', '炭黑中的碳在一定条件下可作还原剂', '冷器皿可能影响氧气补充，使蜡烛不完全燃烧', '冷器皿能带走热量，使附着的炭黑不易继续燃烧'],
  correctAnswer: 'A', explanation: '蜡烛通常以石蜡为燃料，炭黑是燃烧不充分时形成的含碳颗粒，并非制造蜡烛的主要燃料。碳在适当条件下有还原性；器皿遮挡和冷却会影响局部供氧及炭黑继续燃烧。',
});

addPublishedReferenceQuestion({
  id: 'gd-2024-insulin-glucose', subjectId: 'biology', topicId: 'biology:human-body', knowledgePointIds: ['biology:hormonal-regulation'],
  difficulty: 'easy', reasoningType: 'classification', sourceType: 'recalled', sourceId: 'gd-2024-recall',
  sourceTitle: '2024 广东省考回忆题 · 胰岛素与血糖', region: '广东', examYear: 2024, presentationMode: 'adapted',
  sourceNote: '据 2024 年广东省考考生回忆版改述，答案 D 与公开解析核对；原题及答案非官方发布。',
  stem: '胰岛素是一种蛋白质激素。下列关于胰岛素的说法，哪一项正确？',
  options: ['胰岛素会抑制血糖被组织利用', '胰岛素主要由肝脏分泌', '通常通过口服胰岛素治疗糖尿病', '血液中胰岛素过多可能导致低血糖'],
  correctAnswer: 'D', explanation: '胰岛素由胰岛 β 细胞分泌，促进葡萄糖摄取和利用；分泌或用量过多时可能使血糖过低。它是蛋白质，通常采用注射而非口服给药。',
});

addPublishedReferenceQuestion({
  id: 'gd-2025-outline-grain-storage', subjectId: 'biology', topicId: 'biology:cells-metabolism', knowledgePointIds: ['biology:plant-growth'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'official_outline_example', sourceId: 'gd-2025-official-outline',
  sourceTitle: '广东省 2025 年公务员考试笔试大纲例题 · 粮食储藏', region: '广东', examYear: 2025, presentationMode: 'adapted',
  sourceNote: '据广东省 2025 年笔试大纲例题改述，答案 C；属于官方大纲例题，不是已举行考试的历年真题。',
  stem: '为延长粮食储存时间，以下做法中最不合理的是哪一项？',
  options: ['将粮库温度保持在较低水平', '对稻米进行真空包装以减少氧气接触', '向粮库洒水以提高空气湿度', '向粮库充入二氧化碳'],
  correctAnswer: 'C', explanation: '低温、降低氧气供应或提高二氧化碳浓度有助于减缓种子呼吸和生物活动。提高湿度会增加种子萌发、霉变和储藏损耗的风险，因此 C 最不合理。',
});

addPublishedReferenceQuestion({
  id: 'gd-2025-recall-bacteria', subjectId: 'biology', topicId: 'biology:inheritance-microbes', knowledgePointIds: ['biology:microorganisms'],
  difficulty: 'easy', reasoningType: 'classification', sourceType: 'recalled', sourceId: 'gd-2025-recall',
  sourceTitle: '2025 广东省考回忆题 · 细菌的特征与用途', region: '广东', examYear: 2025, presentationMode: 'adapted',
  sourceNote: '据 2025 年广东省考考生回忆卷第 70 题改述；原题及答案非官方发布，答案 D 按基础生物学事实核对。',
  stem: '下列关于细菌的说法，哪一项错误？',
  options: ['鼠疫由细菌引起', '有些细菌可用于食品生产、污水处理或生物分解', '细菌是有细胞结构的微生物，通常通过分裂繁殖', '杀灭细菌只能依靠人体自身的免疫力'],
  correctAnswer: 'D', explanation: '细菌可由人体免疫系统清除，也可通过适当的物理或化学消毒方法杀灭，因此“只能依靠免疫力”错误。鼠疫由鼠疫耶尔森菌引起；一些细菌参与食品生产和有机物分解；细菌具有细胞结构并通常以分裂方式繁殖。',
});

addPublishedReferenceQuestion({
  id: 'mock-huatu-buoyancy-load', subjectId: 'physics', topicId: 'physics:pressure', knowledgePointIds: ['physics:floating-sinking'],
  difficulty: 'medium', reasoningType: 'comparison', sourceType: 'third_party_mock', sourceId: 'huatu-2022-science-examples',
  sourceTitle: '华图科学推理例题 · 轮船装载', region: '广东', examYear: null, presentationMode: 'adapted',
  sourceNote: '华图科学推理讲解中的机构例题，按题意重述；非历年真题。',
  stem: '下列情形中，物体受到的浮力会增大的是哪一项？',
  options: ['游泳者从深水处走向浅滩', '漂浮的轮船从长江驶入大海', '正在下沉的潜水艇保持完全浸没', '漂浮在码头的轮船装载更多货物'],
  correctAnswer: 'D', explanation: '漂浮轮船静止时浮力等于总重力。装载货物使轮船总重力增加，船体下沉并排开更多水，浮力随之增加。其余情形中浮力不增大：浅水处游泳者浸入体积减小；漂浮船在不同盐度水域始终以浮力平衡重力；完全浸没且体积不变的潜水艇浮力不变。',
});

addPublishedReferenceQuestion({
  id: 'zj-2024-c-knuckle-evidence', subjectId: 'biology', topicId: 'biology:human-body', knowledgePointIds: ['biology:musculoskeletal-system'],
  difficulty: 'medium', reasoningType: 'experiment_design', sourceType: 'recalled', sourceId: 'zj-2024-c-recall',
  sourceTitle: '2024 浙江省考 C 类回忆题 · 掰指与关节炎', region: '浙江', examYear: 2024, presentationMode: 'adapted',
  sourceNote: '据浙江省 2024 年 C 类行测回忆卷第 94 题改述；出自判断推理中的科学论证题，不标为省考专项科学推理题；参考答案 D 与公开答案页核对。',
  stem: '一项对照观察未发现习惯性掰指与手指关节炎明显相关。以下哪项最可能是支持这一结果的实验观察？',
  options: ['掰指的声响来自关节腔内气泡变化，而非骨面摩擦', '习惯性掰指者的手部握力和关节强度都低于对照组', '手指关节炎发生率与年龄明显相关', '习惯性掰指组中只有一人患关节炎，且该人有遗传风险'],
  correctAnswer: 'D', explanation: 'D 描述了实验组关节炎病例很少，且病例存在其他风险因素，与“掰指本身和关节炎没有明显相关”的结果相符。A 是关于响声机制的另一类证据；B、C 并未直接显示实验组的关节炎发生情况。',
});

addPublishedReferenceQuestion({
  id: 'zj-2024-c-animal-aging', subjectId: 'biology', topicId: 'biology:ecology', knowledgePointIds: ['biology:organisms-environment'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'recalled', sourceId: 'zj-2024-c-recall',
  sourceTitle: '2024 浙江省考 C 类回忆题 · 变温动物与衰老', region: '浙江', examYear: 2024, presentationMode: 'adapted',
  sourceNote: '据浙江省 2024 年 C 类行测回忆卷第 95 题改述；出自判断推理中的科学论证题，不标为省考专项科学推理题；参考答案 B 与公开答案解析核对。',
  stem: '一种假说认为，变温动物因代谢率较低而比恒温动物衰老得慢。以下哪项最能削弱该假说？',
  options: ['海龟的长寿也可能与外壳提供的保护有关', '相似体型的变温动物之间，衰老率差异很大，有些远高于、有些远低于恒温动物', '相关研究只涉及少数动物，现有证据还不充分', '部分变温动物在繁殖期后死亡率变化不明显'],
  correctAnswer: 'B', explanation: 'B 直接显示变温动物并不都呈现同一种衰老模式，削弱了“变温动物普遍衰老更慢”的概括。A 只提供一种替代解释，C 质疑研究证据，D 的例子反而可能支持该假说。',
});

addPublishedReferenceQuestion({
  id: 'zj-2024-c-cholera-transmission', subjectId: 'biology', topicId: 'biology:inheritance-microbes', knowledgePointIds: ['biology:microorganisms'],
  difficulty: 'easy', reasoningType: 'causal_inference', sourceType: 'recalled', sourceId: 'zj-2024-c-recall',
  sourceTitle: '2024 浙江省考 C 类回忆题 · 霍乱传播途径', region: '浙江', examYear: 2024, presentationMode: 'adapted',
  sourceNote: '据浙江省 2024 年 C 类行测回忆卷第 96 题改述；出自判断推理中的科学论证题，不标为省考专项科学推理题；参考答案 B 与公开答案解析核对，传播知识另经中国疾控中心资料核对。',
  stem: '附近出现霍乱病例后，有人据此认为居民近期应减少外出，以降低感染风险。以下哪项最能削弱这一建议？',
  options: ['我国近年霍乱病例较少，但不能据此判断此次感染风险', '霍乱主要经受污染的水和食物传播，普通户外活动本身不是主要传播途径', '接触患者或带菌者后及时清洁和消毒即可避免所有感染', '霍乱被列为甲类传染病，说明其发病和传播风险需要重视'],
  correctAnswer: 'B', explanation: 'B 给出与感染有关的主要传播路径，说明“减少一般外出”与切断主要传播途径之间没有直接联系。题目考查论证强弱；实际预防应关注安全饮水、食品卫生和手卫生。',
});

addPublishedReferenceQuestion({
  id: 'zj-2024-c-breath-biometrics', subjectId: 'biology', topicId: 'biology:human-body', knowledgePointIds: ['biology:respiratory-circulatory-systems'],
  difficulty: 'medium', reasoningType: 'data_interpretation', sourceType: 'recalled', sourceId: 'zj-2024-c-recall',
  sourceTitle: '2024 浙江省考 C 类回忆题 · 呼气成分与身份识别', region: '浙江', examYear: 2024, presentationMode: 'adapted',
  sourceNote: '据浙江省 2024 年 C 类行测回忆卷第 100 题改述；出自判断推理中的科学论证题，不标为省考专项科学推理题；参考答案 B 与公开答案页核对。',
  stem: '研究者用传感器分析呼气成分，并据此区分受试者，进而提出呼气可用于身份识别。以下哪项最能削弱这一结论？',
  options: ['实验受试者人数较少', '呼气样本容易受到饮食、环境和情绪等因素影响', '传感器通道数较少，识别准确率可能不稳定', '患呼吸道疾病后，人的呼吸动作特征仍可能保持较长时间'],
  correctAnswer: 'B', explanation: '若呼气样本随饮食、环境或情绪大幅变化，同一人的样本可能不稳定，削弱了用呼气成分识别个人身份的结论。样本少和准确率不稳定也可能削弱证据，但 B 直接指出了关键特征的变化来源。',
});

addPublishedReferenceQuestion({
  id: 'zj-2025-mock-mars-microbes', subjectId: 'biology', topicId: 'biology:inheritance-microbes', knowledgePointIds: ['biology:microorganisms'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'third_party_mock', sourceId: 'zj-2025-32xueyuan-mock',
  sourceTitle: '浙江省考 2025 模拟卷 · 火星环境与微生物', region: '浙江', examYear: null, presentationMode: 'adapted',
  sourceNote: '据 32 学苑第三方模拟卷第 92 题改述，不是省考真题；卷内答案为 D，实验背景与公开研究论文交叉核对。',
  stem: '模拟火星紫外线环境的实验发现，高氯酸镁会使枯草芽孢杆菌在数分钟内失去活性。以下哪项新发现最能支持“火星表面目前不利于微生物存活”的判断？',
  options: ['有些微生物可能在其他环境中利用高氯酸盐', '地球多数土壤中的高氯酸镁含量较低', '高氯酸镁接触人体皮肤时可能产生刺激', '在接近火星表面的紫外照射条件下，高氯酸镁的杀菌作用会进一步增强'],
  correctAnswer: 'D', explanation: 'D 把更强的杀菌作用放在接近火星表面的照射条件下，补强了实验结果与结论之间的联系。其他选项没有说明火星表面条件下微生物的存活情况。',
});

addPublishedReferenceQuestion({
  id: 'zj-2026-c-corn-rows', subjectId: 'biology', topicId: 'biology:inheritance-microbes', knowledgePointIds: ['biology:reproduction-inheritance'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'recalled', sourceId: 'zj-2026-c-recall',
  sourceTitle: '2026 浙江省考 C 类回忆题 · 玉米穗行数与转基因识别', region: '浙江', examYear: 2026, presentationMode: 'adapted',
  sourceNote: '据 2026 年浙江省考 C 类回忆卷第 90 题改述；出自判断推理中的科学论证题，不标为专项科学推理题；参考答案 D 与公开答案页核对。',
  stem: '有说法称，只看玉米果穗的籽粒行数就能识别转基因玉米：恰好 12 行的是非转基因，多于 12 行的就是转基因。以下哪项不能反驳这一判断？',
  options: ['现有技术很难通过转基因直接改变玉米穗行数', '转入玉米的基因通常针对抗虫、抗倒等性状，一般不改变外观', '同一玉米品种的穗行数也会因遗传和环境等因素而波动', '玉米穗行数通常为偶数，因为穗轴上的小花成对排列'],
  correctAnswer: 'D', explanation: 'A、B、C 都在质疑穗行数能否稳定区分转基因与非转基因玉米。D 只说明行数的奇偶规律；“12 行或多于 12 行”的划分仍可能成立，因此没有反驳原判断。',
});

addPublishedReferenceQuestion({
  id: 'zj-2026-c-hair-follicle-stem-cells', subjectId: 'biology', topicId: 'biology:cells-metabolism', knowledgePointIds: ['biology:stem-cell-regeneration'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'recalled', sourceId: 'zj-2026-c-recall',
  sourceTitle: '2026 浙江省考 C 类回忆题 · miR-205 与毛囊再生', region: '浙江', examYear: 2026, presentationMode: 'adapted',
  sourceNote: '据 2026 年浙江省考 C 类回忆卷第 91 题改述；出自判断推理中的科学论证题，不标为专项科学推理题；参考答案 D 与公开答案页核对，研究机制另与小鼠实验论文交叉核对。',
  stem: '研究发现，衰老会使毛囊干细胞变得僵硬，妨碍毛发再生；当细胞骨架软化时，老龄小鼠的毛发再生会增强。因此，有人推断，提高毛囊干细胞中 miR-205 的表达可促进毛发生长。要使这一推断成立，以下哪项必须为真？',
  options: ['miR-205 会改变毛发本身的软硬程度', '可以用基因技术提高 miR-205 的表达', 'miR-205 会抑制毛囊干细胞增殖和分化', 'miR-205 能调节细胞骨架的收缩作用并促使其软化'],
  correctAnswer: 'D', explanation: '结论需要连接“提高 miR-205 表达”与“细胞骨架软化”这两步。D 补上了该机制联系；A 说的是毛发而非毛囊干细胞，B 只说明技术上可操作，C 与毛发生长所需的细胞增殖和分化方向相反。',
});

addPublishedReferenceQuestion({
  id: 'zj-2025-c-stork-migration', subjectId: 'biology', topicId: 'biology:ecology', knowledgePointIds: ['biology:organisms-environment'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'recalled', sourceId: 'zj-2025-c-recall',
  sourceTitle: '2025 浙江省考 C 类回忆题 · 白鹳迁徙路线学习', region: '浙江', examYear: 2025, presentationMode: 'adapted',
  sourceNote: '据 2025 年浙江省考 C 类回忆卷第 95 题改述；出自判断推理中的科学论证题，不标为专项科学推理题；参考答案 D 与公开答案页核对。',
  stem: '研究者多年跟踪白鹳迁徙路线，发现它们会经过新的地点。专家据此认为，白鹳能通过学习逐步改进迁徙路线。以下哪项最可能是专家作出这一判断的依据？',
  options: ['成年白鹳会教幼鸟不同的捕食技能', '白鹳在越冬地附近探索新地点，以便更好地度过冬季', '迁徙途中遇到突发危险时，白鹳会临时绕行，但目的地不变', '随着迁徙次数增多，白鹳路线变得更高效，完成迁徙所需时间和能量都减少'],
  correctAnswer: 'D', explanation: 'D 表明白鹳经历更多次迁徙后，路线效率持续提高，最符合“通过学习不断改进路线”的判断。A 说明它们可能学习捕食技能，B 是在越冬地附近探索，C 只是临时避险，都没有直接说明迁徙路线因经验而优化。',
});

addPublishedReferenceQuestion({
  id: 'sh-2026-bci-decoding', subjectId: 'biology', topicId: 'biology:human-body', knowledgePointIds: ['biology:nervous-regulation'],
  difficulty: 'medium', reasoningType: 'classification', sourceType: 'recalled', sourceId: 'sh-2026-science-literacy-recall',
  sourceTitle: '2026 上海市考回忆题 · 脑机接口实时解码', region: '上海', examYear: 2026, presentationMode: 'adapted',
  sourceNote: '据回忆卷第 82 题改述；题面属于“科学素养”部分，答案 A 与公开答案页核对。该来源是第三方回忆版，非官方原卷。',
  stem: '侵入式脑机接口让受试者借助设备完成游戏操作。以下哪一环节是把脑活动转成可执行指令的关键？',
  options: ['实时在线解码', '脑功能成像', '高精度导航', '语言合成'],
  correctAnswer: 'A', explanation: '系统需连续采集脑信号并实时解码用户意图，再把结果转成设备指令。成像、导航或语言合成可以服务于其他任务，但不能代替实时解码。',
});

addPublishedReferenceQuestion({
  id: 'sh-2026-bladeless-fan-airflow', subjectId: 'physics', topicId: 'physics:pressure', knowledgePointIds: ['physics:fluid-flow'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'recalled', sourceId: 'sh-2026-science-literacy-recall',
  sourceTitle: '2026 上海市考回忆题 · 无叶风扇气流', region: '上海', examYear: 2026, presentationMode: 'adapted',
  sourceNote: '据回忆卷第 83 题改述；题面属于“科学素养”部分，答案 C 与公开答案页核对。该来源是第三方回忆版，非官方原卷。',
  stem: '无叶风扇从底座吸入空气，再由环形窄缝高速喷出。下列说法错误的是：',
  options: ['高速喷流可带动周围空气形成更大的气流', '电机输入的电能有一部分转化为空气的动能', '没有外露扇叶，所以运行时空气不会因摩擦而产生热量', '喷流与周围空气混合后，整体气流速度会逐渐减小'],
  correctAnswer: 'C', explanation: '没有外露扇叶不等于没有空气摩擦。空气与风道、周围空气相互作用时会有能量损耗，部分机械能转化为内能。',
});

addPublishedReferenceQuestion({
  id: 'sh-2026-capacitive-touchscreen', subjectId: 'physics', topicId: 'physics:electricity', knowledgePointIds: ['physics:electrostatics'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'recalled', sourceId: 'sh-2026-science-literacy-recall',
  sourceTitle: '2026 上海市考回忆题 · 电容触屏与导电手套', region: '上海', examYear: 2026, presentationMode: 'adapted',
  sourceNote: '据回忆卷第 84 题改述；题面属于“科学素养”部分，答案 D 与公开答案页核对。该来源是第三方回忆版，非官方原卷。',
  stem: '电容式手机屏幕能识别指尖带导电纤维的触屏手套。对此现象，哪项解释正确？',
  options: ['指尖被水浸湿绝不会影响触屏性能', '环境温度低就必定无法操作触屏', '手和屏幕之间组成了微型变压器', '手指接触时会改变屏幕表面的局部电场或电容'],
  correctAnswer: 'D', explanation: '电容屏通过检测局部电场或电容变化定位触点，导电纤维可帮助手指与屏幕形成有效的电容耦合。水分、温度和手套结构会影响识别，不能据此断言完全不受影响或必定失效。',
});

addPublishedReferenceQuestion({
  id: 'sh-2026-fast-charging-battery', subjectId: 'chemistry', topicId: 'chemistry:materials-experiments', knowledgePointIds: ['chemistry:electrochemical-cells'],
  difficulty: 'medium', reasoningType: 'data_interpretation', sourceType: 'recalled', sourceId: 'sh-2026-science-literacy-recall',
  sourceTitle: '2026 上海市考回忆题 · 锂电池快速充电', region: '上海', examYear: 2026, presentationMode: 'adapted',
  sourceNote: '据回忆卷第 86 题改述；题面属于“科学素养”部分，答案 B 与公开答案页核对。该来源是第三方回忆版，非官方原卷。',
  stem: '实验发现，改变锂电池的充电电流密度后，锂离子在电解液中的迁移速度明显变化，充电时间也随之改变。哪项最能解释其快充性能？',
  options: ['电池外壳隔热，阻止所有能量损耗', '锂离子迁移较快，提高了电荷传输效率', '电极颜色稳定，说明充电速度快', '电池屏蔽电磁波，减少外部干扰'],
  correctAnswer: 'B', explanation: '电流密度变化会影响电解液中离子的迁移；迁移更快有助于电荷传输并缩短充电时间。低温升本身不能单独说明快充机制。',
});

addPublishedReferenceQuestion({
  id: 'sh-2026-mask-layers', subjectId: 'chemistry', topicId: 'chemistry:materials-experiments', knowledgePointIds: ['chemistry:polymer-materials'],
  difficulty: 'easy', reasoningType: 'classification', sourceType: 'recalled', sourceId: 'sh-2026-science-literacy-recall',
  sourceTitle: '2026 上海市考回忆题 · 口罩聚丙烯材料层次', region: '上海', examYear: 2026, presentationMode: 'adapted',
  sourceNote: '据回忆卷第 87 题改述；题面属于“科学素养”部分，答案 B 与公开答案页核对。该来源是第三方回忆版，非官方原卷。',
  stem: '某多层口罩使用三种聚丙烯材料：A 拒水并抑制微生物，B 由细纤维构成、适于过滤颗粒，C 柔软且透气。由外向内的合理排列是：',
  options: ['C—A—B', 'A—B—C', 'B—C—A', 'B—A—C'],
  correctAnswer: 'B', explanation: '外层主要阻挡飞沫和液态水，中间层负责过滤颗粒，贴肤内层兼顾舒适与透气，因此排列为 A—B—C。',
});

addPublishedReferenceQuestion({
  id: 'sh-2026-click-chemistry', subjectId: 'chemistry', topicId: 'chemistry:changes-reactions', knowledgePointIds: ['chemistry:common-reactions'],
  difficulty: 'medium', reasoningType: 'classification', sourceType: 'recalled', sourceId: 'sh-2026-science-literacy-recall',
  sourceTitle: '2026 上海市考回忆题 · 点击化学反应特征', region: '上海', examYear: 2026, presentationMode: 'adapted',
  sourceNote: '据回忆卷第 89 题改述；题面属于“科学素养”部分，答案 C 与公开答案页核对。选项改写以保留“题干给定特征不符”这一判断；该来源是第三方回忆版，非官方原卷。',
  stem: '题干给出的点击化学反应特征包括条件温和、选择性较强、副产物少且无害，并且不产生无关气体。下列案例中，哪项不符合这些条件？',
  options: ['在温和溶液条件下专一连接分子，用于细胞成像', '无需金属催化且不放气，完成活细胞表面标记', '反应虽能快速配对目标分子，却持续释放大量无关气体', '通过偶联反应形成环状结构，用于材料表面功能化'],
  correctAnswer: 'C', explanation: '按题干列出的特征逐项判断，C 明确说明反应释放大量无关气体，因此不符合题设。不同点击反应的具体条件和副产物可能不同，不能把题干的特征推广成所有反应的绝对规律。',
});

addPublishedReferenceQuestion({
  id: 'sh-2026-infrared-thermal-imaging', subjectId: 'physics', topicId: 'physics:thermal', knowledgePointIds: ['physics:thermal-radiation'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'recalled', sourceId: 'sh-2026-science-literacy-recall',
  sourceTitle: '2026 上海市考回忆题 · 红外热像与辐射', region: '上海', examYear: 2026, presentationMode: 'adapted',
  sourceNote: '据回忆卷第 91 题改述；题面属于“科学素养”部分，答案 B 与公开答案页核对。该来源是第三方回忆版，非官方原卷。',
  stem: '关于红外热像仪的成像和反侦察原理，下列说法错误的是：',
  options: ['高于绝对零度的物体会发出热辐射', '人体核心体温相对稳定，所以人体发出的红外辐射强度始终不变', '高温火源可产生较强红外辐射，干扰探测', '具有反射性的材料可能改变热像仪接收到的红外信号'],
  correctAnswer: 'B', explanation: '核心体温稳定不代表各处皮肤表面温度、发射率和环境条件都不变；衣物、出汗、风和背景反射都会影响热像仪接收到的红外信号。',
});

addPublishedReferenceQuestion({
  id: 'sh-2026-bowl-water-resonance', subjectId: 'physics', topicId: 'physics:sound-electromagnetism', knowledgePointIds: ['physics:pitch-loudness'],
  difficulty: 'easy', reasoningType: 'causal_inference', sourceType: 'recalled', sourceId: 'sh-2026-science-literacy-recall',
  sourceTitle: '2026 上海市考回忆题 · 盛水铜碗的音调变化', region: '上海', examYear: 2026, presentationMode: 'adapted',
  sourceNote: '据回忆卷第 92 题改述；题面属于“科学素养”部分，答案 B 与公开答案页核对。该来源是第三方回忆版，非官方原卷。',
  stem: '敲击盛水铜碗时，加入的水参与振动。下列解释正确的是：',
  options: ['水晃动改变了铜的材料密度', '水增大了振动系统的有效质量，使固有频率降低、音调变低', '水的晃动产生次声波并改变铜碗音调', '铜碗表面的花纹改变了声音在空气中的传播速度'],
  correctAnswer: 'B', explanation: '水会改变铜碗—水组成的振动系统的有效质量和阻尼；有效质量增大时，固有频率通常降低，因此音调变低。',
});

addPublishedReferenceQuestion({
  id: 'sh-2026-vr-force-feedback', subjectId: 'physics', topicId: 'physics:sound-electromagnetism', knowledgePointIds: ['physics:motors-generators'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'recalled', sourceId: 'sh-2026-science-literacy-recall',
  sourceTitle: '2026 上海市考回忆题 · VR 手套电磁力反馈', region: '上海', examYear: 2026, presentationMode: 'adapted',
  sourceNote: '据回忆卷第 93 题改述；题面属于“科学素养”部分，答案 B 与公开答案页核对。该来源是第三方回忆版，非官方原卷。',
  stem: 'VR 手套通过电磁模块给手部施加随虚拟物体设置变化的反向力，以模拟虚拟物体的重量和移动阻力。其工作原理最可能是：',
  options: ['控制手套温度来模拟重量感', '动态调整机械阻力，对抗手部运动以模拟负载', '用颜色刺激诱发触觉错觉', '让高频电流直接传递虚拟物体的真实重量'],
  correctAnswer: 'B', explanation: '电磁执行器把控制电流转成可调机械力，在手部运动时提供反向阻力，以模拟虚拟负载；用户感受到的是设备施加的力，不是虚拟物体真实的重力。',
});

addPublishedReferenceQuestion({
  id: 'gd-2026-outline-slope-forces', subjectId: 'physics', topicId: 'physics:mechanics',
  knowledgePointIds: ['physics:friction', 'physics:work', 'physics:mechanical-energy'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'official_outline_example', sourceId: 'gd-2026-official-outline',
  sourceTitle: '广东省 2026 年公务员笔试大纲例题 · 粗糙斜面上的物体', region: '广东', examYear: 2026, presentationMode: 'adapted',
  sourceNote: '据广东省 2026 年官方笔试大纲科学推理例题 1 改述；答案 D 与公开大纲全文核对。属于官方大纲例题，不是已举行考试的历年真题。',
  stem: '物体 M 在恒力 F 作用下沿粗糙斜面匀速向上移动。下列说法不准确的是：',
  options: ['恒力 F 对物体做正功', '物体的重力势能逐渐增大', '物体受到的摩擦力与运动方向相反', '斜面对物体的支持力与物体所受重力是一对平衡力'],
  correctAnswer: 'D', explanation: '物体匀速运动，合力为零；但物体还受沿斜面向上的恒力和向下的摩擦力，支持力与重力不能单独构成平衡力。A、B、C 均符合题设。',
});

addPublishedReferenceQuestion({
  id: 'mock-zhonggong-2027-red-object-color', subjectId: 'physics', topicId: 'physics:optics',
  knowledgePointIds: ['physics:optical-phenomena'], difficulty: 'medium', reasoningType: 'classification',
  sourceType: 'third_party_mock', sourceId: 'mock-zhonggong-2027-light',
  sourceTitle: '中公 2027 广东行测科学推理模拟题 · 光的反射与颜色', region: '广东', examYear: null, presentationMode: 'adapted',
  sourceNote: '据中公网校科学推理模拟题第 2 题改述；答案 D 及解析可在原页面核对。为避免绝对化，白色物体的反射表述作了限定。属于机构模拟题，不是省考真题。',
  stem: '关于物体对光和辐射热的反射、吸收，下列说法不正确的是：',
  options: ['金属箔可反射较多辐射能，从而减少部分热辐射传递', '白色物体对可见光中的多种波长都有较强反射，因此看起来呈白色', '在积雪上撒炭黑，可增加对太阳辐射的吸收并促进积雪融化', '红色衣物呈红色，是因为它吸收红光并反射其他颜色的光'],
  correctAnswer: 'D', explanation: '物体呈现的颜色主要取决于它反射到眼中的可见光。红色物体主要反射红光、较多吸收其他波长的光，因此 D 把吸收和反射关系说反了。',
});

addPublishedReferenceQuestion({
  id: 'mock-zhanhong-water-mechanical-energy', subjectId: 'physics', topicId: 'physics:mechanics',
  knowledgePointIds: ['physics:mechanical-energy'], difficulty: 'medium', reasoningType: 'causal_inference',
  sourceType: 'third_party_mock', sourceId: 'zhanhong-zhejiang-mock',
  sourceTitle: '展鸿行测模拟卷第 78 题 · 爬山与矿泉水', region: '浙江', examYear: null, presentationMode: 'adapted',
  sourceNote: '据展鸿模拟卷第 78 题改述；答案 A 与同卷解析核对。属于第三方模拟题，不是公务员考试真题。',
  stem: '一名志愿者携带冰镇矿泉水从山脚爬到山腰，取出时发现水温升高。下列说法正确的是：',
  options: ['水的位置升高，使它的重力势能和机械能增加', '水温上升只能由外界对水做功造成', '水分子运动加剧会使静止的水面明显起伏', '冲剂颗粒在水中很快溶解，说明它的熔点较低'],
  correctAnswer: 'A', explanation: '矿泉水随志愿者升高，重力势能增加，因此机械能增加。水温升高主要来自与环境的热传递；分子热运动不等于液面出现明显宏观起伏，溶解也不等于熔化。',
});

addPublishedReferenceQuestion({
  id: 'mock-zhanhong-seashore-specific-heat', subjectId: 'physics', topicId: 'physics:thermal',
  knowledgePointIds: ['physics:specific-heat'], difficulty: 'easy', reasoningType: 'causal_inference',
  sourceType: 'third_party_mock', sourceId: 'zhanhong-zhejiang-mock',
  sourceTitle: '展鸿行测模拟卷第 79 题 · 海滨与沙漠温差', region: '浙江', examYear: null, presentationMode: 'adapted',
  sourceNote: '据展鸿模拟卷第 79 题改述；答案 C 与同卷解析核对。属于第三方模拟题，不是公务员考试真题。',
  stem: '夏季海滨白天有海风，夜间仍较凉爽，而沙漠地区的昼夜温差较大。最主要的原因是：',
  options: ['海滨地区日照时间总是更短', '海边白天有风而沙漠夜间没有风', '水的比热容通常大于沙石，同样吸放热时温度变化较小', '太阳光全年直射沙漠而斜射海边'],
  correctAnswer: 'C', explanation: '水的比热容通常大于沙石，在相同质量和热量条件下温度变化较小。因此海水白天升温、夜间降温都较慢，海滨昼夜温差通常较小。',
});

addPublishedReferenceQuestion({
  id: 'mock-zhanhong-blind-path-pressure', subjectId: 'physics', topicId: 'physics:pressure',
  knowledgePointIds: ['physics:solid-pressure'], difficulty: 'easy', reasoningType: 'causal_inference',
  sourceType: 'third_party_mock', sourceId: 'zhanhong-zhejiang-mock',
  sourceTitle: '展鸿行测模拟卷第 81 题 · 盲道与压强', region: '浙江', examYear: null, presentationMode: 'adapted',
  sourceNote: '据展鸿模拟卷第 81 题改述；答案 B 与同卷解析核对。属于第三方模拟题，不是公务员考试真题。',
  stem: '盲道表面凸起的条形砖和圆点砖能让使用者通过脚底感知路面提示。主要原因是凸起部分：',
  options: ['增大脚底所受压力', '减小受力面积，使脚底局部压强增大', '减小脚底所受压力', '增大受力面积，使脚底局部压强减小'],
  correctAnswer: 'B', explanation: '人体重力及脚底承受的总压力并未因盲道凸起而明显增加；凸起使局部接触面积减小，所以压强增大，更容易被脚底感知。',
});

addPublishedReferenceQuestion({
  id: 'mock-zhanhong-gas-identification', subjectId: 'chemistry', topicId: 'chemistry:materials-experiments',
  knowledgePointIds: ['chemistry:common-gases'], difficulty: 'medium', reasoningType: 'experiment_design',
  sourceType: 'third_party_mock', sourceId: 'zhanhong-zhejiang-mock',
  sourceTitle: '展鸿行测模拟卷第 83 题 · 常见气体鉴别', region: '浙江', examYear: null, presentationMode: 'adapted',
  sourceNote: '据展鸿模拟卷第 83 题改述；答案 C 与同卷解析核对。实际检验氢气需少量取样并遵守实验安全要求。属于第三方模拟题，不是公务员考试真题。',
  stem: '三份少量气体样品分别为空气、氧气和氢气。按实验规范操作时，以下哪种方法最能区分它们？',
  options: ['观察气体颜色', '分别倒入澄清石灰水', '用燃着的木条检验', '闻气体的气味'],
  correctAnswer: 'C', explanation: '三种气体均无色、无明显气味。少量取样时，氧气能使木条燃烧更旺，氢气能燃烧，空气通常只支持木条正常燃烧，故燃着的木条可区分三者。真实操作须遵守氢气验纯和防火规范。',
});

addPublishedReferenceQuestion({
  id: 'sh-2014-a-wetting-adhesion', subjectId: 'physics', topicId: 'physics:surface-phenomena',
  knowledgePointIds: ['physics:wetting-adhesion'], difficulty: 'medium', reasoningType: 'causal_inference',
  sourceType: 'recalled', sourceId: 'sh-2014-a-recall',
  sourceTitle: '2014 上海市考 A 卷回忆题 · 内聚力与附着力', region: '上海', examYear: 2014, presentationMode: 'adapted',
  sourceNote: '据回忆卷第 26 题改述，题目位于判断推理部分；答案 C 与中公网校同题解析核对。来源为考生回忆版，不是官方原卷或官方答案。',
  stem: '题目给出：同种物质内部的吸引作用称为内聚力，不同物质接触面间的吸引作用称为附着力；附着力较强时容易发生润湿。下列说法正确的是：',
  options: ['雨衣不透水，说明水对雨衣的附着力强于水的内聚力', '防水剂处理棉布会增强水对棉布的附着作用，使水更易渗入', '憎水涂层可削弱水对玻璃的附着作用，使水不易铺展', '雨水在普通挡风玻璃上铺展，说明水对玻璃的附着力弱于水的内聚力'],
  correctAnswer: 'C', explanation: '题干将附着作用较强与润湿联系起来。雨衣和防水布料不易被水润湿，附着作用应减弱；普通玻璃上的雨水会铺展，说明附着作用相对较强。憎水涂层通过降低水对玻璃的附着作用减少铺展，因此 C 正确。',
});

addPublishedReferenceQuestion({
  id: 'gd-2021-outline-ladder-climber', subjectId: 'physics', topicId: 'physics:mechanics',
  knowledgePointIds: ['physics:levers', 'physics:force-equilibrium', 'physics:force-analysis'],
  difficulty: 'medium', reasoningType: 'causal_inference', sourceType: 'official_outline_example', sourceId: 'gd-2021-official-outline',
  sourceTitle: '广东省 2021 年公务员笔试大纲例题 · 梯子与工人', region: '广东', examYear: 2021, presentationMode: 'adapted',
  sourceNote: '据 2021 年官方笔试大纲科学推理示例改述；答案 B 与公开大纲文本核对。属于官方大纲例题，不是已举行考试的历年真题。',
  stem: '一架梯子靠在光滑的竖直墙面上，底端放在水平地面，梯子保持静止。一名工人沿梯子匀速向上攀爬。下列判断正确的是：',
  options: ['地面对梯子的支持力逐渐减小', '墙面对梯子的支持力逐渐增大', '地面对梯子的摩擦力保持不变', '梯子对工人的作用力逐渐减小'],
  correctAnswer: 'B', explanation: '以梯子底端为支点，工人沿梯子向上时，其重力对支点的力矩增大；墙面对梯子的支持力力矩臂（梯子顶部高度）不变，因此墙面对梯子的支持力增大。水平方向地面摩擦力与墙面支持力平衡，也随之增大；竖直方向地面支持力支撑梯子和工人总重，保持不变。工人匀速运动时，梯子对人的合接触力与其重力平衡，不会逐渐减小。',
});

addPublishedReferenceQuestion({
  id: 'gd-2022-recall-water-purification', subjectId: 'chemistry', topicId: 'chemistry:environment-life',
  knowledgePointIds: ['chemistry:water-purification'], difficulty: 'medium', reasoningType: 'classification',
  sourceType: 'recalled', sourceId: 'gd-2022-township-recall',
  sourceTitle: '2022 年广东省考乡镇卷回忆题 · 水的净化方法', region: '广东', examYear: 2022, presentationMode: 'adapted',
  sourceNote: '据考生回忆题改述；答案 D 与公开解析核对。为避免“蒸馏可去除所有杂质”的绝对化说法，将该选项限定为去除非挥发性溶解物。',
  stem: '关于常见水处理方法的作用，下列说法不准确的是：',
  options: ['静置沉淀可帮助去除水中较大的不溶性颗粒', '消毒剂可通过化学作用杀灭部分微生物', '蒸馏可分离水并去除大多数非挥发性溶解物', '过滤可降低硬水硬度，使硬水软化'],
  correctAnswer: 'D', explanation: '过滤主要截留不溶性颗粒，不能除去造成硬度的溶解钙、镁离子；蒸馏可通过汽化、冷凝分离水与大多数非挥发性杂质。',
});

addPublishedReferenceQuestion({
  id: 'gd-2022-recall-thermal-expansion', subjectId: 'physics', topicId: 'physics:thermal',
  knowledgePointIds: ['physics:thermal-expansion'], difficulty: 'medium', reasoningType: 'classification',
  sourceType: 'recalled', sourceId: 'gd-2022-township-recall',
  sourceTitle: '2022 年广东省考乡镇卷回忆题 · 热胀冷缩', region: '广东', examYear: 2022, presentationMode: 'adapted',
  sourceNote: '据乡镇卷回忆题改述；同一热胀冷缩判断也见县级卷回忆资料，答案 A 与公开解析核对。',
  stem: '关于物体的热胀冷缩现象，下列说法不准确的是：',
  options: ['温度升高时，物体内的分子本身会变大', '金属受热时，长度通常会增加', '温度变化可引起物体体积变化', '物体受热膨胀通常与微观粒子平均间距变化有关'],
  correctAnswer: 'A', explanation: '热胀冷缩通常来自粒子热运动增强后平均间距改变；分子本身的大小不会因升温而变大。',
});

addPublishedReferenceQuestion({
  id: 'gd-2022-recall-pendulum-energy', subjectId: 'physics', topicId: 'physics:mechanics',
  knowledgePointIds: ['physics:mechanical-energy'], difficulty: 'medium', reasoningType: 'causal_inference',
  sourceType: 'recalled', sourceId: 'gd-2022-township-recall',
  sourceTitle: '2022 年广东省考乡镇卷回忆题 · 单摆机械能', region: '广东', examYear: 2022, presentationMode: 'adapted',
  sourceNote: '据考生回忆题改述；答案 D 与公开解析核对。',
  stem: '将单摆小球从 A 点释放，使其经过最低点 B 后摆到 C 点。忽略空气阻力，下列说法不正确的是：',
  options: ['小球从 A 到 B 的过程中动能增大', '小球从 B 到 C 的过程中重力势能增大', '小球经过 B 点时动能最大', '小球从 A 到 C 的过程中机械能逐渐增大'],
  correctAnswer: 'D', explanation: '忽略空气阻力时，摆动过程中动能和重力势能相互转化，机械能守恒，不会逐渐增大。',
});

addPublishedReferenceQuestion({
  id: 'gd-2022-recall-excavator-tracks', subjectId: 'physics', topicId: 'physics:pressure',
  knowledgePointIds: ['physics:solid-pressure'], difficulty: 'easy', reasoningType: 'causal_inference',
  sourceType: 'recalled', sourceId: 'gd-2022-township-recall',
  sourceTitle: '2022 年广东省考乡镇卷回忆题 · 挖掘机履带', region: '广东', examYear: 2022, presentationMode: 'adapted',
  sourceNote: '据考生回忆题改述；答案 A 与华图公开解析核对。',
  stem: '挖掘机装有宽大的履带，主要有助于：',
  options: ['增大与地面的接触面积，减小对地面的压强', '减小与地面的接触面积，增大对地面的压强', '增大挖掘机对地面的压力', '减小挖掘机自身重力'],
  correctAnswer: 'A', explanation: '挖掘机的重力近似不变，宽履带增大受力面积；由 p=F/S 可知，对地面的压强减小，能降低陷入松软地面的风险。',
});

addPublishedReferenceQuestion({
  id: 'gd-2022-recall-floating-density', subjectId: 'physics', topicId: 'physics:pressure',
  knowledgePointIds: ['physics:buoyancy', 'physics:floating-sinking'], difficulty: 'medium', reasoningType: 'comparison',
  sourceType: 'recalled', sourceId: 'gd-2022-township-recall',
  sourceTitle: '2022 年广东省考回忆题 · 漂浮小球与液体密度', region: '广东', examYear: 2022, presentationMode: 'adapted',
  sourceNote: '据乡镇卷回忆图示改写为文字；同类题见县级卷回忆资料。选项顺序已调整，答案 B 与浮力关系及公开解析核对。',
  stem: '两个相同小球分别静止漂浮在甲、乙两种液体中。已知小球在甲液体中排开液体的体积大于在乙液体中的排开体积。下列判断正确的是：',
  options: ['甲液体密度大于乙液体密度', '甲液体密度小于乙液体密度', '小球在甲液体中受到的浮力大于在乙液体中受到的浮力', '小球在乙液体中受到的浮力大于在甲液体中受到的浮力'],
  correctAnswer: 'B', explanation: '相同小球都处于漂浮静止状态，浮力分别等于各自小球的重力，因此两处浮力相等。由 F浮=ρ液gV排，在浮力相等时排开体积较大的甲液体密度较小。',
});

addPublishedReferenceQuestion({
  id: 'mock-zhonggong-2027-rocks-relative-motion', subjectId: 'physics', topicId: 'physics:kinematics',
  knowledgePointIds: ['physics:relative-motion'], difficulty: 'medium', reasoningType: 'causal_inference',
  sourceType: 'third_party_mock', sourceId: 'gd-2027-zhonggong-mock',
  sourceTitle: '中公 2027 广东行测科学推理模拟题 08.28 · 同速列车掷石子', region: '广东', examYear: null, presentationMode: 'adapted',
  sourceNote: '据中公科学推理模拟题第 2 题改述；答案 C 与原页面解析核对。属于机构模拟题，不是省考真题。',
  stem: '甲、乙两车以相同速度沿直轨道同向行驶，甲车在前、乙车在后。两车上分别有人 a、b，同时以相对于本车速度大小相同的石子沿水平方向瞄准对方投出。忽略石子的竖直下落，两人谁会先被击中？',
  options: ['a 先被击中', 'b 先被击中', 'a、b 同时被击中', '石子只能击中 b，不能击中 a'],
  correctAnswer: 'C', explanation: '以列车为参考系，两车和两人相对静止，两颗石子分别以相同速度沿相反方向飞向对方，初始距离相同，因此到达时间相同。',
});

addPublishedReferenceQuestion({
  id: 'sh-2018-b-jump-landing-force', subjectId: 'physics', topicId: 'physics:mechanics',
  knowledgePointIds: ['physics:mechanical-energy'], difficulty: 'medium', reasoningType: 'causal_inference',
  sourceType: 'recalled', sourceId: 'sh-2018-b-recall',
  sourceTitle: '2018 年上海 B 类回忆题 · 跳下窗台后的地面作用力', region: '上海', examYear: 2018, presentationMode: 'adapted',
  sourceNote: '据上海 B 类回忆题第 29 题改述；答案 C 与公开 PDF 解析核对。该材料为第三方回忆整理，不是官方原卷。',
  stem: '一名战士从离地 3 米的窗台跳下，双脚触地后屈膝，使重心继续下降 0.5 米。若用恒定的平均地面作用力近似缓冲过程，该力约为自身重力的几倍？',
  options: ['4 倍', '6 倍', '7 倍', '10 倍'],
  correctAnswer: 'C', explanation: '从开始下落到最终静止，重心共下降 3.5 米，重力势能减少 3.5mg。接触地面后的缓冲距离为 0.5 米，地面作用力所做的功需抵消这部分重力做功并耗尽动能，因此平均作用力约为 7mg，即自身重力的 7 倍。',
});

addPublishedReferenceQuestion({
  id: 'sh-2018-b-camera-lens', subjectId: 'physics', topicId: 'physics:optics',
  knowledgePointIds: ['physics:lens-imaging'], difficulty: 'medium', reasoningType: 'causal_inference',
  sourceType: 'recalled', sourceId: 'sh-2018-b-recall',
  sourceTitle: '2018 年上海 B 类回忆题 · 合照改拍单人照', region: '上海', examYear: 2018, presentationMode: 'adapted',
  sourceNote: '据上海 B 类回忆题第 32 题改述；答案 B 与公开 PDF 解析核对。该材料为第三方回忆整理，不是官方原卷。',
  stem: '摄影师用同一台相机拍完集体照后，改为逐人拍摄单人照。为缩小视野并使人物在成像面上的像变大，应怎样调整？',
  options: ['相机离人物近些，镜头向感光面移动', '相机离人物近些，镜头远离感光面移动', '相机离人物远些，镜头向感光面移动', '相机离人物远些，镜头远离感光面移动'],
  correctAnswer: 'B', explanation: '拍单人照时相机靠近人物以缩小取景范围。物体仍在焦点外时，物距减小会使像距增大；为使实像重新落在感光面上，镜头应远离感光面移动，像的放大率也会增加。',
});

addPublishedReferenceQuestion({
  id: 'sh-2018-b-earth-magnetic-force', subjectId: 'physics', topicId: 'physics:sound-electromagnetism',
  knowledgePointIds: ['physics:magnetic-field'], difficulty: 'medium', reasoningType: 'causal_inference',
  sourceType: 'recalled', sourceId: 'sh-2018-b-recall',
  sourceTitle: '2018 年上海 B 类回忆题 · 避雷针放电与地磁场', region: '上海', examYear: 2018, presentationMode: 'adapted',
  sourceNote: '据上海 B 类回忆题第 35 题改述；答案 A 与公开 PDF 解析核对。该材料为第三方回忆整理，不是官方原卷。',
  stem: '在赤道上方，带正电的云层经过竖直避雷针上方并开始向地面放电。已知当地地磁场方向由南向北，地磁场对避雷针中电流的作用力大致指向哪个方向？',
  options: ['正东', '正南', '正西', '正北'],
  correctAnswer: 'A', explanation: '传统电流方向由正电荷流向负电荷，题设中可近似看作竖直向下。将磁场方向标为向北，依据左手定则判断，载流导体受力方向约为正东。',
});

export { SCIENCE_QUESTION_BANK };
