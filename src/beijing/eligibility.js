const BEIJING_STATUS_LABELS = {
  initialMatch: '初步符合', incompatible: '明确不符合',
  needsReview: '需要人工核验', incomplete: '资料不完整',
};
const BEIJING_DIGITS = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

function beijingNormalize(value) {
  return String(value ?? '').normalize('NFKC').replace(/[\s\u3000]+/gu, '').toLocaleLowerCase('zh-CN');
}

function beijingCheck(status, reason) {
  return { status, reason };
}

function beijingEducationRank(value) {
  const text = beijingNormalize(value);
  if (/博士/u.test(text)) return 4;
  if (/硕士|研究生/u.test(text)) return 3;
  if (/本科|学士/u.test(text)) return 2;
  if (/大专|专科/u.test(text)) return 1;
  if (/高中|中专/u.test(text)) return 0;
  return null;
}

function beijingEducationRequirement(raw) {
  const text = beijingNormalize(raw);
  if (!text) return null;
  if (/不限/u.test(text)) return { any: true };
  const exact = text.match(/仅限(博士研究生|硕士研究生|研究生|本科|大学本科|大专|专科|高中(?:中专)?)/u)?.[1];
  if (exact) return { exact: beijingEducationRank(exact) };
  if (/本科或硕士研究生/u.test(text)) return { allowed: [2, 3] };
  if (/本科或研究生/u.test(text)) return { allowed: [2, 3] };
  if (/硕士研究生及以上|研究生及以上/u.test(text)) return { minimum: 3 };
  if (/博士研究生及以上/u.test(text)) return { minimum: 4 };
  if (/本科及以上|大学本科及以上/u.test(text)) return { minimum: 2 };
  if (/大专及以上|专科及以上/u.test(text)) return { minimum: 1 };
  if (/高中(?:\(中专\)|（中专）)?及以上/u.test(text)) return { minimum: 0 };
  const ranks = [...text.matchAll(/博士研究生|硕士研究生|研究生|本科|大学本科|大专|专科|高中/gu)]
    .map((match) => beijingEducationRank(match[0]));
  return ranks.length ? { allowed: [...new Set(ranks)] } : null;
}

function beijingDegreeTitle(profile) {
  const rank = beijingEducationRank(profile.degree);
  return rank === 4 ? '博士' : rank === 3 ? '硕士' : rank === 2 ? '学士' : '';
}

function beijingMajorLevel(profile) {
  const rank = beijingEducationRank(profile.degree);
  return rank === null ? '' : rank >= 3 ? '研究生' : '本科';
}

function beijingMajorProfile(profile, majorCatalog, level) {
  const major = String((level === '研究生' ? profile.graduateMajor : profile.undergraduateMajor) || '').trim();
  const code = String((level === '研究生' ? profile.graduateMajorCode : profile.undergraduateMajorCode) || '')
    .replace(/[^\da-z]/giu, '').toUpperCase();
  const path = new Set();
  if (major) {
    for (const row of Array.isArray(majorCatalog) ? majorCatalog : []) {
      if (row.level !== level || row.major !== major) continue;
      for (const value of [row.category, row.classification, row.major]) if (value) path.add(value);
    }
    if (!path.size) path.add(major);
  }
  return { major, code, path };
}

function beijingMajorGroups(raw) {
  const text = String(raw || '').replace(/\r/gu, '');
  const pattern = /(本科|博士研究生|硕士研究生|研究生)\s*[：:]/gu;
  const matches = [...text.matchAll(pattern)];
  if (!matches.length) return { found: false, text };
  const groups = matches.map((match, index) => ({
    level: match[1] === '本科' ? '本科' : '研究生',
    text: text.slice(match.index + match[0].length, matches[index + 1]?.index ?? text.length).trim(),
  }));
  return { found: true, groups };
}

function beijingNormalizeMajorName(value) {
  return beijingNormalize(value).replace(/(?:门类|学科|类别|类)$/u, '');
}

function beijingMajorMatches(requirement, own) {
  const terms = String(requirement || '').split(/[、，,；;\n\r]+/u).map((item) => item.trim()).filter(Boolean);
  const ownPath = [...own.path].map(beijingNormalizeMajorName).filter(Boolean);
  const ownCode = own.code;
  return terms.some((term) => {
    const code = term.match(/[（(]([\da-z]{2,8})[）)]/iu)?.[1]?.toUpperCase() || '';
    if (code && ownCode && ownCode.startsWith(code)) return true;
    const name = beijingNormalizeMajorName(term.replace(/[（(].*?[）)]/gu, ''));
    if (!name) return false;
    return ownPath.some((candidate) => candidate === name
      || (name.length >= 3 && candidate.includes(name))
      || (candidate.length >= 3 && name.includes(candidate)));
  });
}

function beijingMatchMajor(position, profile, majorCatalog) {
  const raw = String(position.majorRaw || '').trim();
  if (!raw) return beijingCheck('review', '职位表专业字段为空，需回到原表确认。');
  if (/^(?:不限|专业不限|不限专业|不限制专业)$/u.test(beijingNormalize(raw))) {
    return beijingCheck('match', '职位表明确标注专业不限。');
  }
  const level = beijingMajorLevel(profile);
  if (!level) return beijingCheck('missing', '请补充最高学历后再核对该学历阶段的专业。');
  const own = beijingMajorProfile(profile, majorCatalog, level);
  if (!own.major && !own.code) return beijingCheck('missing', `请补充${level}专业名称或专业代码。`);
  const parsed = beijingMajorGroups(raw);
  if (!parsed.found) {
    if (beijingMajorMatches(raw, own)) return beijingCheck('match', '职位表专业原文命中个人专业或专业目录层级。');
    return beijingCheck('review', '专业要求未标明学历阶段；北京报考指南要求以最高学历报考，需核对职位表原文。');
  }
  const group = parsed.groups.find((item) => item.level === level);
  if (!group) {
    return beijingCheck('review', `职位表没有列出${level}专业条件；按北京报考指南不能用本科专业替代最高学历专业。`);
  }
  if (/不限|专业不限|不限制专业/u.test(group.text)) return beijingCheck('match', `职位表${level}专业不限。`);
  if (beijingMajorMatches(group.text, own)) {
    const path = [...own.path].filter(Boolean).join(' → ') || own.major;
    return beijingCheck('match', `职位表${level}专业要求命中个人专业目录路径：${path}。`);
  }
  const terms = group.text.split(/[、，,；;\n\r]+/u).map((item) => item.trim()).filter(Boolean);
  return terms.length
    ? beijingCheck('mismatch', `个人${level}专业的目录层级未命中职位表列出的范围。`)
    : beijingCheck('review', '职位表专业条件无法可靠拆分，需人工核对原文。');
}

function beijingMatchEducation(position, profile) {
  const rank = beijingEducationRank(profile.degree);
  if (rank === null) return beijingCheck('missing', '请填写最高学历。');
  const requirement = beijingEducationRequirement(position.educationRaw);
  if (!requirement) return beijingCheck('review', `无法可靠解析学历要求“${position.educationRaw || '原表为空'}”。`);
  if (requirement.any || (requirement.minimum !== undefined && rank >= requirement.minimum)
    || (requirement.allowed && requirement.allowed.includes(rank))
    || (requirement.exact !== undefined && rank === requirement.exact)) {
    return beijingCheck('match', `个人最高学历为“${profile.degree}”，符合职位学历范围；按北京报考指南使用最高学历报考。`);
  }
  if (requirement.exact !== undefined && rank > requirement.exact) {
    return beijingCheck('mismatch', `职位要求“${position.educationRaw}”；北京报考指南要求按最高学历报考，不能降级使用较低学历。`);
  }
  return beijingCheck('mismatch', `个人最高学历“${profile.degree}”不在职位要求“${position.educationRaw}”的范围内。`);
}

function beijingMatchDegree(position, profile) {
  const requirement = beijingNormalize(position.degreeRaw);
  if (!requirement || /不限|无要求|未要求/u.test(requirement)) return beijingCheck('match', '职位表未单独限制学位。');
  const title = beijingNormalize(beijingDegreeTitle(profile));
  if (!title) return beijingCheck('missing', '请补充最高学历；对应学位按学历层级推定。');
  if (/与最高学历相对应/u.test(requirement)) return beijingCheck('match', `按最高学历“${profile.degree}”推定对应学位为“${beijingDegreeTitle(profile)}”。`);
  if (requirement.includes(title) || (title === '硕士' && /研究生/u.test(requirement))) {
    return beijingCheck('match', `最高学历对应学位“${beijingDegreeTitle(profile)}”符合要求。`);
  }
  if (/学士|本科/u.test(requirement) && beijingEducationRank(profile.degree) === 2) return beijingCheck('match', '本科对应学士学位，符合职位要求。');
  return beijingCheck('mismatch', `职位要求学位“${position.degreeRaw}”，与个人最高学历对应学位不一致。`);
}

function beijingPoliticalRequirement(position) {
  const note = `${position.otherConditionsRaw || ''}；${position.remarkRaw || ''}`;
  return note.match(/政治面貌要求为\s*([^；;。\n]+)/u)?.[1] || position.politicalStatusRaw || '';
}

function beijingMatchPolitical(position, profile) {
  const raw = beijingNormalize(beijingPoliticalRequirement(position));
  if (!raw || /不限|无要求/u.test(raw)) return beijingCheck('match', '职位表政治面貌不限。');
  const own = beijingNormalize(profile.politicalStatus);
  if (!own) return beijingCheck('missing', '请补充政治面貌。');
  const allowed = ['中共党员', '共青团员', '群众', '民主党派', '无党派人士']
    .filter((item) => raw.includes(beijingNormalize(item)));
  if (/党员/u.test(raw) && !/团员|群众/u.test(raw)) return own.includes('中共党员')
    ? beijingCheck('match', '个人政治面貌符合职位要求。')
    : beijingCheck('mismatch', '职位要求中共党员，个人政治面貌不符合。');
  if (allowed.some((item) => own === beijingNormalize(item))) return beijingCheck('match', '个人政治面貌属于职位表列出的范围。');
  if (allowed.length) return beijingCheck('mismatch', '个人政治面貌不在职位表列出的范围内。');
  return beijingCheck('review', `无法可靠解析政治面貌要求“${beijingPoliticalRequirement(position)}”。`);
}

function beijingAllConditionText(position) {
  return [position.otherConditionsRaw, position.remarkRaw, position.existingIdentityRaw,
    position.rawFields?.['其它条件'], position.rawFields?.['备注']].filter(Boolean).join('；');
}

function beijingMatchGraduation(position, profile) {
  const text = beijingNormalize(`${position.grassrootsRequirementRaw || ''} ${beijingAllConditionText(position)}`);
  if (!/应届高校毕业生|2027应届|限应届|仅限应届|应届毕业生/u.test(text)) {
    return beijingCheck('match', '职位表没有明确的应届身份限制。');
  }
  if (!profile.graduationStatus) return beijingCheck('missing', '请补充是否为应届毕业生；不需要提供毕业年份。');
  if (profile.graduationStatus === '应届毕业生') return beijingCheck('match', '个人为应届毕业生，符合职位表的应届身份要求；毕业年份不作为额外条件。');
  return beijingCheck('mismatch', '职位要求应届毕业生，个人资料标注为非应届。');
}

function beijingChineseNumber(value) {
  if (/^\d+$/u.test(value)) return Number(value);
  if (value === '十') return 10;
  if (value.startsWith('十')) return 10 + (BEIJING_DIGITS[value[1]] || 0);
  if (value.endsWith('十')) return (BEIJING_DIGITS[value[0]] || 1) * 10;
  if (value.includes('十')) return (BEIJING_DIGITS[value[0]] || 0) * 10 + (BEIJING_DIGITS[value[2]] || 0);
  return BEIJING_DIGITS[value] ?? null;
}

function beijingMatchGrassroots(position, profile) {
  const raw = String(position.grassrootsRequirementRaw || '').trim();
  if (!raw || /无限制|不限/u.test(raw)) return beijingCheck('match', '职位表未要求基层工作年限。');
  if (/应届/u.test(raw)) return beijingCheck('match', '职位表此栏标注应届毕业生，不按基层工作年限条件处理。');
  const numbers = [...raw.matchAll(/(\d+|[零一二两三四五六七八九十]+)年/gu)]
    .map((match) => beijingChineseNumber(match[1])).filter(Number.isFinite);
  if (!numbers.length) return beijingCheck('review', `无法可靠解析基层工作经历要求“${raw}”。`);
  if (profile.grassrootsYears === '') return beijingCheck('missing', '请补充基层工作经历年限。');
  const own = Number(profile.grassrootsYears);
  if (!Number.isFinite(own) || own < 0) return beijingCheck('review', '基层工作经历年限格式无效。');
  const needed = Math.max(...numbers);
  return own >= needed
    ? beijingCheck('match', `个人填写基层工作经历 ${own} 年，达到至少 ${needed} 年的要求。`)
    : beijingCheck('mismatch', `职位要求至少 ${needed} 年基层工作经历，个人填写为 ${own} 年。`);
}

function beijingAgeRequirementForProfile(raw, degreeRank) {
  const clauses = String(raw || '').split(/[；;\n]+/u).map((item) => item.trim()).filter(Boolean);
  const ageClauses = clauses.filter((item) => /年龄|周岁/u.test(item));
  const stageClauses = ageClauses.filter((item) => /本科|硕士|博士|研究生/u.test(item));
  if (!stageClauses.length) return String(raw || '');

  const matches = stageClauses.filter((item) => {
    const bachelor = /本科/u.test(item);
    const master = /硕士/u.test(item);
    const doctor = /博士/u.test(item);
    const graduate = /研究生/u.test(item);
    if (degreeRank === 2) return bachelor && !master && !doctor;
    if (degreeRank === 3) return master || (graduate && !bachelor && !doctor);
    if (degreeRank === 4) return doctor || (graduate && !bachelor && !master);
    return false;
  });
  return matches.length === 1 ? matches[0] : '';
}

function beijingMatchAge(position, profile) {
  const raw = String(position.ageRaw || '').trim();
  if (!raw) return beijingCheck('match', '职位表和备注未见可解析的年龄限制。');
  if (profile.age === '') return beijingCheck('missing', '请补充年龄（周岁）。');
  const own = Number(profile.age);
  if (!Number.isFinite(own) || own < 0) return beijingCheck('review', '年龄填写格式无效。');
  const degreeRank = beijingEducationRank(profile.degree);
  const requirement = beijingAgeRequirementForProfile(raw, degreeRank);
  if (!requirement) return beijingCheck('review', `无法从年龄要求中确定“${profile.degree}”适用的年龄范围：“${raw}”。`);
  const bounds = [...requirement.matchAll(/(\d+|[零一二两三四五六七八九十]+)周岁\s*(以上|以下)/gu)]
    .map((match) => ({ value: beijingChineseNumber(match[1]), direction: match[2] }))
    .filter((item) => Number.isFinite(item.value));
  let minimum = Math.max(18, ...bounds.filter((item) => item.direction === '以上').map((item) => item.value));
  let maximum = Math.min(65, ...bounds.filter((item) => item.direction === '以下').map((item) => item.value));
  const freshGraduate = profile.graduationStatus === '应届毕业生' && beijingEducationRank(profile.degree) >= 3;
  if (freshGraduate) {
    const exception = requirement.match(/(?:放宽到|放宽至|年龄可放宽到|年龄可放宽至)\s*(\d+)周岁/u);
    if (exception) maximum = Math.max(maximum, Number(exception[1]));
  }
  if (!bounds.length) return beijingCheck('review', `无法可靠解析年龄要求“${raw}”。`);
  return own >= minimum && own <= maximum
    ? beijingCheck('match', `个人年龄 ${own} 周岁，符合职位注明的 ${minimum} 至 ${maximum} 周岁范围。`)
    : beijingCheck('mismatch', `职位要求年龄 ${minimum} 至 ${maximum} 周岁，个人填写 ${own} 周岁。`);
}

function beijingMatchGender(position, profile) {
  const raw = beijingAllConditionText(position);
  const plannedGender = /计划招录男性\d+人.{0,20}女性\d+人/u.test(raw);
  const hasMale = /(?:限男性|仅限男性|只限男性|男性报考|男性考生)/u.test(raw);
  const hasFemale = /(?:限女性|仅限女性|只限女性|女性报考|女性考生)/u.test(raw);
  if (plannedGender) {
    if (!profile.gender) return beijingCheck('missing', '职位按性别分配招录名额，请补充性别。');
    if (['男性', '女性'].includes(profile.gender)) return beijingCheck('match', '个人性别属于职位计划招录范围。');
    return beijingCheck('mismatch', '职位计划招录男性或女性人员。');
  }
  if (!hasMale && !hasFemale) return beijingCheck('match', '职位原文未见明确性别限制。');
  if (hasMale && hasFemale) return beijingCheck('match', '职位计划招录男、女性人员；个人性别属于计划范围。');
  if (!profile.gender) return beijingCheck('missing', '职位有性别限制，请补充性别。');
  const required = hasMale ? '男性' : '女性';
  return profile.gender === required
    ? beijingCheck('match', `职位要求${required}，与个人资料一致。`)
    : beijingCheck('mismatch', `职位要求${required}。`);
}

function beijingMatchEthnicity(position, profile) {
  const raw = beijingAllConditionText(position);
  const ethnicities = ['汉族', '蒙古族', '回族', '藏族', '维吾尔族', '苗族', '彝族', '壮族', '布依族', '朝鲜族', '满族', '侗族', '瑶族', '白族', '土家族', '哈尼族', '哈萨克族', '傣族', '黎族', '傈僳族', '佤族', '畲族', '高山族', '拉祜族', '水族', '东乡族', '纳西族', '景颇族', '柯尔克孜族', '土族', '达斡尔族', '仫佬族', '羌族', '布朗族', '撒拉族', '毛南族', '仡佬族', '锡伯族', '阿昌族', '普米族', '塔吉克族', '怒族', '乌孜别克族', '俄罗斯族', '鄂温克族', '德昂族', '保安族', '裕固族', '京族', '塔塔尔族', '独龙族', '鄂伦春族', '赫哲族', '门巴族', '珞巴族', '基诺族'];
  const required = ethnicities.filter((item) => raw.includes(item));
  if (/少数民族/u.test(raw)) {
    if (!profile.ethnicity) return beijingCheck('missing', '职位有限定民族范围，请补充民族。');
    return profile.ethnicity === '汉族'
      ? beijingCheck('mismatch', '职位面向少数民族人员，个人民族信息不符合。')
      : beijingCheck('review', '职位要求少数民族人员，需结合职位原文和证明材料核对。');
  }
  if (!required.length) return beijingCheck('match', '职位原文未见明确民族限制。');
  if (!profile.ethnicity) return beijingCheck('missing', '职位有民族要求，请补充民族。');
  return required.includes(profile.ethnicity)
    ? beijingCheck('match', '个人民族符合职位要求。')
    : beijingCheck('mismatch', `职位要求民族为“${required.join('、')}”。`);
}

function beijingMatchLocality(position, profile) {
  const raw = beijingAllConditionText(position);
  const nonBeijingOrigin = /非北京(?:市)?生源/u.test(raw);
  const beijingOrigin = !nonBeijingOrigin && /北京(?:市)?生源/u.test(raw);
  const beijingHukou = /北京(?:市)?(?:常住)?户籍|北京(?:市)?常住户口|北京户口/u.test(raw);
  if (nonBeijingOrigin || beijingOrigin) {
    if (!profile.studentOrigin) return beijingCheck('missing', '职位限制生源地，请补充生源地；户籍不能替代生源地。');
    const isBeijing = /北京/u.test(profile.studentOrigin);
    if (nonBeijingOrigin && !isBeijing) return beijingCheck('match', '个人生源地为非北京，符合职位限定。');
    if (beijingOrigin && isBeijing) return beijingCheck('match', '个人生源地符合职位要求。');
    return beijingCheck('mismatch', nonBeijingOrigin ? '职位要求非北京生源。' : '职位要求北京生源。');
  }
  if (beijingHukou) {
    if (!profile.hukou) return beijingCheck('missing', '职位要求北京户籍，请补充户籍地。');
    return /北京/u.test(profile.hukou)
      ? beijingCheck('match', '个人户籍符合职位要求。')
      : beijingCheck('mismatch', '职位要求北京户籍，个人户籍不符合。');
  }
  const localCondition = raw.match(/(?:限|须具有|具有)([^；;。\n]{1,24}?(?:户籍|户口|生源地|生源))/u)?.[1];
  if (!localCondition) return beijingCheck('match', '职位原文未见明确户籍或生源限制。');
  if (/户籍|户口/u.test(localCondition)) {
    if (!profile.hukou) return beijingCheck('missing', `职位有属地条件“${localCondition}”，请补充户籍。`);
    const place = localCondition.replace(/(?:户籍|户口).*$/u, '').replace(/^(?:限|须具有|具有)/u, '');
    return place && beijingNormalize(profile.hukou).includes(beijingNormalize(place))
      ? beijingCheck('match', '个人户籍命中职位条件。')
      : beijingCheck('review', `请人工核对户籍条件“${localCondition}”与个人户籍。`);
  }
  return profile.studentOrigin
    ? beijingCheck('review', `请人工核对生源条件“${localCondition}”。`)
    : beijingCheck('missing', `职位有生源条件“${localCondition}”，请补充生源地。`);
}

function beijingMatchTargetedIdentity(position, profile) {
  if (position.sourceSheet === '面向退役大学生士兵职位') {
    if (!profile.retiredUniversityStudentSoldier || profile.retiredUniversityStudentSoldier === '待确认') return beijingCheck('missing', '此职位面向退役大学生士兵，请填写是否符合该身份。');
    return profile.retiredUniversityStudentSoldier === '是'
      ? beijingCheck('match', '个人资料标注符合退役大学生士兵身份；证明材料以公告要求为准。')
      : beijingCheck('mismatch', '此职位面向退役大学生士兵。');
  }
  if (position.sourceSheet === '面向乡村振兴协理员等服务基层项目人员职位') {
    if (!profile.serviceProjectStatus || profile.serviceProjectStatus === '待确认') return beijingCheck('missing', '此职位面向服务基层项目人员，请填写是否符合该身份。');
    return profile.serviceProjectStatus === '是'
      ? beijingCheck('review', '个人资料标注符合服务基层项目身份；服务年限与考核条件需按指南核对。')
      : beijingCheck('mismatch', '此职位面向服务基层项目人员。');
  }
  if (position.sourceSheet === '面向残疾人职位') {
    const raw = beijingAllConditionText(position);
    const requiredType = ['听力', '肢体', '视力', '言语'].filter((type) => raw.includes(`${type}残疾`));
    const requiredLevel = raw.match(/残疾([一二三四五六七八九]级)/u)?.[1] || '';
    if (!profile.disabilityStatus || profile.disabilityStatus === '待确认') return beijingCheck('missing', '此职位面向残疾人，请填写残疾类别、等级和持证情况。');
    if (profile.disabilityStatus === '否') return beijingCheck('mismatch', '此职位面向符合条件的残疾人报考。');
    if (!profile.disabilityType || !profile.disabilityLevel || !profile.disabilityCertificate) {
      return beijingCheck('missing', '请补充残疾类别、等级及残疾人证情况。');
    }
    if (requiredType.length && !requiredType.includes(profile.disabilityType)) return beijingCheck('mismatch', `职位要求${requiredType.join('或')}残疾。`);
    if (requiredLevel && profile.disabilityLevel !== requiredLevel) return beijingCheck('mismatch', `职位要求${requiredLevel}残疾。`);
    if (!profile.disabilityCertificate || profile.disabilityCertificate === '待确认') return beijingCheck('missing', '请确认是否持有《中华人民共和国残疾人证》。');
    if (profile.disabilityCertificate !== '是') return beijingCheck('mismatch', '职位要求持有《中华人民共和国残疾人证》。');
    return beijingCheck('match', '填写的类别、等级和证件符合职位明示条件；身体条件仍以招录机关审核为准。');
  }
  return beijingCheck('match', '职位表未限定特定服务项目、退役士兵或残疾人身份。');
}

function beijingMatchSpecialRequirements(position, profile) {
  const raw = beijingAllConditionText(position);
  const checks = [];
  const addChoice = (condition, key, label) => {
    if (!condition) return;
    const value = profile[key];
    if (!value || value === '待确认') checks.push(beijingCheck('missing', `${label}需补充确认。`));
    else if (value === '有' || value === '否') checks.push(beijingCheck('mismatch', `${label}不符合职位条件。`));
    else checks.push(beijingCheck('match', `${label}符合个人填写情况。`));
  };

  addChoice(/最高学历期间必修课程无重修或补考|无重修或补考经历/u.test(raw), 'highestDegreeNoResit', '最高学历期间无重修或补考经历');
  if (/就读最高学历期间不得与任何单位存在劳动|不得缴纳社会保险/u.test(raw)) {
    if (!profile.freshGraduateNoEmployment || profile.freshGraduateNoEmployment === '待确认') checks.push(beijingCheck('missing', '请确认就读最高学历期间是否与单位建立劳动关系或缴纳社会保险。'));
    else if (profile.freshGraduateNoEmployment === '有') checks.push(beijingCheck('mismatch', '职位要求就读最高学历期间不存在劳动关系或社会保险记录。'));
    else checks.push(beijingCheck('match', '个人填写最高学历期间没有劳动关系或社会保险记录。'));
  }
  if (/公安院校公安专业.{0,12}(?:不得报考|不能报考)/u.test(raw)) {
    const value = profile.policeSpecialtyGraduate;
    if (!value || value === '待确认') checks.push(beijingCheck('missing', '请确认是否为公安院校公安专业2027届毕业生。'));
    else if (value === '是') checks.push(beijingCheck('mismatch', '职位明确限制公安院校公安专业2027届毕业生报考。'));
    else checks.push(beijingCheck('match', '个人资料符合公安院校公安专业毕业限制。'));
  }

  if (/体能测评|体能测试/u.test(raw) || position.physicalTestRaw === '是') {
    if (!profile.acceptPhysicalTest || profile.acceptPhysicalTest === '待确认') checks.push(beijingCheck('missing', '该职位涉及体能测评，请确认是否接受并核对标准。'));
    else if (profile.acceptPhysicalTest === '不接受') checks.push(beijingCheck('mismatch', '个人资料标注不接受体能测评。'));
    else checks.push(beijingCheck('review', '个人资料标注接受体能测评；能否达到标准仍需人工核对。'));
  }
  if (/心理测试|心理测评/u.test(raw) || position.psychologicalTestRaw === '是') {
    if (!profile.acceptPsychologicalTest || profile.acceptPsychologicalTest === '待确认') checks.push(beijingCheck('missing', '该职位涉及心理测试，请确认并核对招录要求。'));
    else if (profile.acceptPsychologicalTest === '不接受') checks.push(beijingCheck('mismatch', '个人资料标注不接受心理测试。'));
    else checks.push(beijingCheck('review', '心理测试结果由招录机关审核。'));
  }
  if (/专业能力测试|专业能力测评|专业测试/u.test(raw) || position.professionalTestRaw === '是') {
    if (!profile.acceptProfessionalTest || profile.acceptProfessionalTest === '待确认') checks.push(beijingCheck('missing', '该职位组织专业能力测试，请确认是否接受并核对考试安排。'));
    else if (profile.acceptProfessionalTest === '不接受') checks.push(beijingCheck('mismatch', '个人资料标注不接受专业能力测试。'));
    else checks.push(beijingCheck('review', '个人资料标注接受专业能力测试；具体内容和要求需查看招录机关通知。'));
  }
  if (/最低服务年限|服务期满|服务满\d+年|服务满[一二三四五六七八九十]+年/u.test(raw)) {
    if (!profile.acceptServiceDuration || profile.acceptServiceDuration === '待确认') checks.push(beijingCheck('missing', '职位设有服务期限，请确认能否接受。'));
    else if (profile.acceptServiceDuration === '不接受') checks.push(beijingCheck('mismatch', '个人资料标注不接受职位的服务期限。'));
    else checks.push(beijingCheck('match', '个人资料标注接受职位的服务期限。'));
  }

  const credentialRequirements = [...raw.matchAll(/(?:须|需|要求|取得|通过|持有)[^；;。\n]*(?:法律职业资格|司法考试|资格证书|职业资格|资格证)[^；;。\n]*/gu)]
    .map((match) => match[0]);
  if (credentialRequirements.length) {
    if (!profile.credentials) checks.push(beijingCheck('missing', `职位要求资质，请核对：“${credentialRequirements[0]}”。`));
    else if (credentialRequirements.some((item) => profile.credentials.includes('法律职业资格') && /法律职业资格|司法考试/u.test(item))) {
      checks.push(beijingCheck('review', `个人已填写资质，需对照职位原文核实：“${credentialRequirements[0]}”。`));
    } else checks.push(beijingCheck('review', `职位资质要求需人工核对：“${credentialRequirements[0]}”。`));
  }

  const residual = raw
    .replace(/政治面貌要求为[^；;。\n]*/gu, '')
    .replace(/参照公务员法管理[。；;]?/gu, '')
    .replace(/(?:限|仅限|只限|要求为|计划招录)[^；;。\n]*(?:男性|女性|男生|女生|男女不限)[^；;。\n]*/gu, '')
    .replace(/(?:限|须具有|具有)[^；;。\n]*(?:户籍|常住户口|户口|生源地|生源)[^；;。\n]*/gu, '')
    .replace(/非北京(?:市)?生源|北京(?:市)?生源/gu, '')
    .replace(/(?:年龄须|年龄要求|年龄为)[^；;。\n]*/gu, '')
    .replace(/(?:18|20|25|30|35|38|40)周岁.{0,24}(?:以上|以下)[^；;。\n]*/gu, '')
    .replace(/(?:2027应届毕业生|应届高校毕业生)[^；;。\n]*/gu, '')
    .replace(/(?:无重修或补考经历|最高学历期间必修课程无重修或补考|就读最高学历期间不得与任何单位存在劳动[^；;。\n]*|不得缴纳社会保险)[^；;。\n]*/gu, '')
    .replace(/公安院校公安专业.{0,12}(?:不得报考|不能报考)[^；;。\n]*/gu, '')
    .replace(/(?:体能测评|体能测试|心理测试|心理测评|专业能力测试|专业能力测评|专业测试)[^；;。\n]*/gu, '')
    .replace(/(?:最低服务年限|服务期满|服务满\d+年|服务满[一二三四五六七八九十]+年)[^；;。\n]*/gu, '')
    .replace(/(?:须|需|要求|取得|通过|持有)[^；;。\n]*(?:法律职业资格|司法考试|资格证书|职业资格|资格证)[^；;。\n]*/gu, '')
    .replace(/双学位考生限以主修学位报考[。；;]?/gu, '')
    .replace(/[\s；;。]/gu, '');
  if (residual) checks.push(beijingCheck('review', `职位备注还包含需人工核对的条件：“${raw}”。`));
  const mismatch = checks.find((item) => item.status === 'mismatch');
  if (mismatch) return mismatch;
  const missing = checks.find((item) => item.status === 'missing');
  if (missing) return missing;
  return checks.find((item) => item.status === 'review') || beijingCheck('match', '已列明的其他条件未发现未处理项。');
}

export function evaluateBeijingEligibility(position, profile = {}, majorCatalog = []) {
  const checks = {
    major: beijingMatchMajor(position, profile, majorCatalog),
    education: beijingMatchEducation(position, profile),
    degree: beijingMatchDegree(position, profile),
    politicalStatus: beijingMatchPolitical(position, profile),
    gender: beijingMatchGender(position, profile),
    ethnicity: beijingMatchEthnicity(position, profile),
    graduation: beijingMatchGraduation(position, profile),
    grassrootsExperience: beijingMatchGrassroots(position, profile),
    age: beijingMatchAge(position, profile),
    locality: beijingMatchLocality(position, profile),
    targetedIdentity: beijingMatchTargetedIdentity(position, profile),
    specialRequirements: beijingMatchSpecialRequirements(position, profile),
  };
  const statuses = Object.values(checks).map((item) => item.status);
  const status = statuses.includes('mismatch') ? 'incompatible'
    : statuses.includes('missing') ? 'incomplete'
      : statuses.includes('review') ? 'needsReview' : 'initialMatch';
  return { status, label: BEIJING_STATUS_LABELS[status], checks };
}

export function hasBeijingEligibilityProfile(profile) {
  return Boolean(profile && ['degree', 'graduateMajor', 'undergraduateMajor', 'politicalStatus',
    'graduationStatus', 'age', 'gender', 'hukou', 'studentOrigin'].some((key) => String(profile[key] ?? '').trim()));
}

export function getBeijingMajorCatalogPath(profile = {}, majorCatalog = []) {
  const level = beijingMajorLevel(profile);
  if (!level) return [];
  const { path } = beijingMajorProfile(profile, majorCatalog, level);
  return [...path].filter(Boolean);
}
