import { evaluateNationalEligibility } from '../national/eligibility.js';

const ZHEJIANG_CHINESE_DIGITS = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const ZHEJIANG_LABELS = {
  initialMatch: '初步符合', incompatible: '明确不符合', needsReview: '需要人工核验', incomplete: '资料不完整',
};

function zhejiangNormalize(value) {
  return String(value ?? '').replace(/[\s　]+/gu, '').toLocaleLowerCase('zh-CN');
}

function zhejiangCheck(status, reason, extra = {}) {
  return { status, reason, ...extra };
}

function zhejiangProfileHasValues(profile) {
  return ['degree', 'degreeTitle', 'graduateMajor', 'undergraduateMajor', 'politicalStatus',
    'graduationStatus', 'gender', 'age', 'grassrootsYears']
    .some((key) => String(profile?.[key] ?? '').trim() !== '');
}

function zhejiangEducationRank(value) {
  const text = zhejiangNormalize(value);
  if (/博士/u.test(text)) return 4;
  if (/硕士|研究生/u.test(text)) return 3;
  if (/本科/u.test(text)) return 2;
  if (/大专|专科/u.test(text)) return 1;
  return null;
}

function zhejiangDegreeTitle(profile) {
  if (String(profile?.degreeTitle || '').trim()) return profile.degreeTitle;
  const rank = zhejiangEducationRank(profile?.degree);
  return rank === 4 ? '博士' : rank === 3 ? '硕士' : rank === 2 ? '学士' : '';
}

function zhejiangDegreeRank(value) {
  const text = zhejiangNormalize(value);
  if (/博士/u.test(text)) return 4;
  if (/硕士/u.test(text)) return 3;
  if (/学士/u.test(text)) return 2;
  return null;
}

function zhejiangMatchDegree(position, profile) {
  const requirement = zhejiangNormalize(position.degreeRaw);
  if (!requirement || /不限|无要求/u.test(requirement)) return zhejiangCheck('match', '职位表未限制学位。');
  const own = zhejiangDegreeTitle(profile);
  if (!own) return zhejiangCheck('missing', '请补充最高学历；学位按对应层级初核。');
  if (/与最高学历对应|相应学位/u.test(requirement)) return zhejiangCheck('match', `职位要求学位与最高学历对应，按最高学历对应的${own}学位初核。`);
  const rank = zhejiangDegreeRank(own);
  const required = requirement.includes('博士') ? 4 : requirement.includes('硕士') ? 3
    : requirement.includes('学士') ? 2 : null;
  if (required === null) return zhejiangCheck('review', `无法可靠解析学位要求“${position.degreeRaw}”，请核对原表口径。`);
  if (/及以上|以上|不低于/u.test(requirement)) return rank >= required
    ? zhejiangCheck('match', `按最高学历对应的${own}学位初核，达到职位要求。`)
    : zhejiangCheck('mismatch', `职位要求${position.degreeRaw}，按最高学历对应的学位层级未达到。`);
  return rank === required
    ? zhejiangCheck('match', `按最高学历对应的${own}学位初核，层级符合职位要求。`)
    : zhejiangCheck('mismatch', `职位要求${position.degreeRaw}，按最高学历对应的学位层级不一致。`);
}

function zhejiangCatalogLevel(profile) {
  return zhejiangEducationRank(profile?.degree) >= 3 ? '研究生' : '本科';
}

function zhejiangMajorPath(profile, majorCatalog, level) {
  const major = String((level === '研究生' ? profile?.graduateMajor : profile?.undergraduateMajor) || '').trim();
  const code = String((level === '研究生' ? profile?.graduateMajorCode : profile?.undergraduateMajorCode) || '').trim();
  const path = new Set();
  for (const row of Array.isArray(majorCatalog) ? majorCatalog : []) {
    if (row.level !== level || row.major !== major || !major) continue;
    for (const value of [row.category, row.classification, row.major]) if (value) path.add(value);
  }
  if (!path.size && major) path.add(major);
  return { path, major, code };
}

function zhejiangNormalizeMajorName(value) {
  return zhejiangNormalize(value).replace(/(?:门类|类别|类)$/u, '');
}

function zhejiangMajorGroup(raw, rank) {
  const text = String(raw || '').trim();
  const labels = /本科\s*(?:所学)?专业要求为\s*[：:]|硕士研究生\s*(?:所学)?专业要求为\s*[：:]|博士研究生\s*(?:所学)?专业要求为\s*[：:]|研究生\s*(?:所学)?专业要求为\s*[：:]/gu;
  const matches = [...text.matchAll(labels)];
  if (!matches.length) return { found: false, text };
  const groups = matches.map((match, index) => {
    const label = match[0].startsWith('本科') ? 2 : match[0].startsWith('博士') ? 4 : 3;
    return { rank: label, text: text.slice(match.index + match[0].length, matches[index + 1]?.index ?? text.length).trim() };
  });
  return { found: true, text: groups.find((group) => group.rank === rank)?.text || '', groups };
}

function zhejiangMajorMatchesRequirement(requirement, path, code) {
  if (code && String(requirement).includes(code)) return true;
  const terms = String(requirement || '').split(/[、，,；;\n\r]+/u).map((item) => item.trim()).filter(Boolean);
  const normalizedPath = [...path].map(zhejiangNormalizeMajorName).filter(Boolean);
  return terms.some((term) => {
    const normalized = zhejiangNormalizeMajorName(term.replace(/^\d{4,6}\s*/u, '').replace(/[（(].*?[）)]/gu, ''));
    if (!normalized) return false;
    return normalizedPath.includes(normalized)
      || normalizedPath.some((candidate) => normalized.length >= 4 && candidate.includes(normalized));
  });
}

function zhejiangMatchMajor(position, profile, majorCatalog) {
  const raw = String(position.majorRaw || '').trim();
  if (!raw) return zhejiangCheck('review', '职位表专业字段为空，需回到原表确认。');
  if (/不限专业|专业不限|不限制专业|^不限$/u.test(raw)) return zhejiangCheck('match', '职位表明确标注专业不限。');

  const rank = zhejiangEducationRank(profile.degree);
  if (rank === null) return zhejiangCheck('missing', '请补充最高学历后再匹配专业目录。');
  const group = zhejiangMajorGroup(raw, rank);
  if (!group.found) return zhejiangCheck('review', '专业要求未标明学历阶段，需人工核对职位表原文。');
  if (!group.text) {
    const undergraduateGroup = group.groups?.find((item) => item.rank === 2);
    if (rank >= 3 && undergraduateGroup) {
      if (!profile.undergraduateMajor) return zhejiangCheck('missing', '职位只列本科专业条件；请补充本科专业后核对。');
      const undergraduatePath = zhejiangMajorPath(profile, majorCatalog, '本科');
      return zhejiangMajorMatchesRequirement(undergraduateGroup.text, undergraduatePath.path, undergraduatePath.code)
        ? zhejiangCheck('match', '职位列出本科专业条件，个人本科专业目录路径命中。')
        : zhejiangCheck('mismatch', '职位列出的本科专业条件与个人本科专业目录路径未匹配。');
    }
    return zhejiangCheck('review', '职位表没有列出当前学历阶段的专业条件，需人工核对。');
  }

  const level = rank >= 3 ? '研究生' : '本科';
  const own = zhejiangMajorPath(profile, majorCatalog, level);
  if (!own.major && !own.code) return zhejiangCheck('missing', `请补充${level}专业名称或专业代码。`);
  if (zhejiangMajorMatchesRequirement(group.text, own.path, own.code)) {
    const path = [...own.path].filter(Boolean).join(' → ');
    return zhejiangCheck('match', `职位表专业条件命中个人专业目录路径：${path}。`);
  }
  const undergraduateGroup = rank >= 3 ? group.groups?.find((item) => item.rank === 2) : null;
  if (undergraduateGroup && /本科|大学本科/u.test(String(position.educationRaw || ''))) {
    if (!profile.undergraduateMajor && !profile.undergraduateMajorCode) {
      return zhejiangCheck('review', '研究生专业未命中职位列出的研究生范围；职位也列出本科专业条件，请补充本科专业后核对。');
    }
    const undergraduatePath = zhejiangMajorPath(profile, majorCatalog, '本科');
    if (zhejiangMajorMatchesRequirement(undergraduateGroup.text, undergraduatePath.path, undergraduatePath.code)) {
      const path = [...undergraduatePath.path].filter(Boolean).join(' → ');
      return zhejiangCheck('match', `职位表本科专业条件命中个人本科专业目录路径：${path}；职位学历条件包含本科及以上。`);
    }
  }
  const terms = group.text.split(/[、，,；;\n\r]+/u).map((item) => item.trim()).filter(Boolean);
  if (terms.some((term) => /类|门类/u.test(term))) {
    return zhejiangCheck('mismatch', '个人专业的目录层级未命中职位表列出的专业范围。');
  }
  if (terms.length) return zhejiangCheck('mismatch', '个人专业名称或目录层级未命中该学历阶段的职位要求。');
  return zhejiangCheck('review', '职位表专业条件无法可靠拆分，需人工核对原文。');
}

function zhejiangGenderText(position) {
  return [position.remarkRaw, position.positionDescription, position.rawFields?.['职位简介'], position.rawFields?.['备注']]
    .filter(Boolean).join('；');
}

function zhejiangMatchGender(position, profile) {
  const gender = String(profile.gender || '').trim();
  if (!gender) return zhejiangCheck('missing', '请补充性别，系统才能识别职位表中的性别限制。');
  const raw = zhejiangGenderText(position);
  const male = /(?:限男性|仅限男性|只限男性|要求男性|要求为男性|男性报考|男性考生)/u.test(raw);
  const female = /(?:限女性|仅限女性|只限女性|要求女性|要求为女性|女性报考|女性考生)/u.test(raw);
  if (male && female) return zhejiangCheck('review', '职位备注同时出现男女条件，请核对原表的分岗说明。');
  if (male) return gender === '男性'
    ? zhejiangCheck('match', '职位表要求男性，与个人资料一致。')
    : zhejiangCheck('mismatch', '职位表明确要求男性。');
  if (female) return gender === '女性'
    ? zhejiangCheck('match', '职位表要求女性，与个人资料一致。')
    : zhejiangCheck('mismatch', '职位表明确要求女性。');
  if (/适合男性报考|男性优先/u.test(raw)) return zhejiangCheck('review', '职位备注提示男性更适合，未作为硬性限制处理。');
  return zhejiangCheck('match', '职位表未见明确性别限制。');
}

function zhejiangMatchEthnicity(position, profile) {
  const requirement = String(position.ethnicityRaw || '').trim();
  if (!requirement || /不限|无要求/u.test(requirement)) return zhejiangCheck('match', '职位表民族要求不限。');
  const own = String(profile.ethnicity || '').trim();
  if (!own) return zhejiangCheck('missing', `职位有民族要求“${requirement}”，请补充民族信息后核对。`);
  return requirement.includes(own)
    ? zhejiangCheck('match', '个人民族信息符合职位表要求。')
    : zhejiangCheck('mismatch', `职位要求民族为“${requirement}”。`);
}

function zhejiangPoliticalRequirement(position) {
  const note = String(position.remarkRaw || '');
  const explicit = note.match(/政治面貌要求为\s*([^；;。\n]+)/u)?.[1];
  return explicit || String(position.politicalStatusRaw || '').trim();
}

function zhejiangMatchPoliticalStatus(position, profile) {
  const requirement = zhejiangNormalize(zhejiangPoliticalRequirement(position));
  const own = zhejiangNormalize(profile.politicalStatus);
  if (!requirement || /不限|无要求/u.test(requirement)) return zhejiangCheck('match', '职位表政治面貌不限。');
  if (!own) return zhejiangCheck('missing', '请补充政治面貌。');
  if (requirement.includes('中共党员') && !/共青团员|群众/u.test(requirement)) {
    return own.includes('中共党员') ? zhejiangCheck('match', '个人政治面貌符合职位要求。')
      : zhejiangCheck('mismatch', '职位要求中共党员，个人政治面貌不符合。');
  }
  const accepted = ['中共党员', '共青团员', '群众', '民进会员', '无党派人士']
    .filter((candidate) => requirement.includes(zhejiangNormalize(candidate)));
  if (accepted.some((candidate) => zhejiangNormalize(candidate) === own)) return zhejiangCheck('match', '个人政治面貌属于职位表列出的范围。');
  if (accepted.length) return zhejiangCheck('mismatch', '个人政治面貌不在职位表列出的范围内。');
  return zhejiangCheck('review', `无法自动解析政治面貌要求“${zhejiangPoliticalRequirement(position)}”。`);
}

function zhejiangMatchGraduation(position, profile) {
  const requirement = zhejiangNormalize(`${position.existingIdentityRaw || ''} ${position.remarkRaw || ''}`);
  if (!requirement.includes('应届')) return zhejiangCheck('match', '职位表没有明确的应届身份限制。');
  if (!profile.graduationStatus) return zhejiangCheck('missing', '请补充毕业身份。');
  if (profile.graduationStatus !== '应届毕业生') return zhejiangCheck('mismatch', '职位要求应届毕业生，个人资料不是应届。');
  return zhejiangCheck('match', '个人毕业身份符合职位表中的应届要求。');
}

function zhejiangYears(value) {
  const normalized = zhejiangNormalize(value);
  const arabic = normalized.match(/(\d+(?:\.\d+)?)年/u);
  if (arabic) return Number(arabic[1]);
  const chinese = normalized.match(/([零一二两三四五六七八九十]+)年/u)?.[1];
  if (!chinese) return null;
  if (chinese === '十') return 10;
  if (chinese.startsWith('十')) return 10 + (ZHEJIANG_CHINESE_DIGITS[chinese[1]] || 0);
  if (chinese.endsWith('十')) return (ZHEJIANG_CHINESE_DIGITS[chinese[0]] || 1) * 10;
  return ZHEJIANG_CHINESE_DIGITS[chinese] ?? null;
}

function zhejiangMatchGrassroots(position, profile) {
  const requirement = String(position.grassrootsRequirementRaw || '不限').trim();
  if (!/基层工作经历/u.test(requirement)) return zhejiangCheck('match', '职位表未要求基层工作经历。');
  const needed = zhejiangYears(requirement);
  if (needed === null) return zhejiangCheck('review', `无法可靠解析基层工作经历要求“${requirement}”。`);
  if (profile.grassrootsYears === '') return zhejiangCheck('missing', '请补充基层工作经历年限。');
  const own = Number(profile.grassrootsYears);
  if (!Number.isFinite(own) || own < 0) return zhejiangCheck('review', '基层工作经历年限格式无效。');
  return own >= needed
    ? zhejiangCheck('match', `个人填写的基层工作经历为 ${own} 年，达到至少 ${needed} 年的要求。`)
    : zhejiangCheck('mismatch', `职位要求至少 ${needed} 年基层工作经历，个人填写为 ${own} 年。`);
}

function zhejiangMatchAge(position, profile) {
  const raw = String(position.ageRaw || '').trim();
  if (!raw || !/周岁|年龄/u.test(raw)) return zhejiangCheck('match', '职位表没有明确年龄限制。');
  if (profile.age === '') return zhejiangCheck('missing', '请补充年龄，具体年龄口径以2027年招考公告为准。');
  const own = Number(profile.age);
  if (!Number.isFinite(own) || own < 0) return zhejiangCheck('review', '年龄填写格式无效。');
  const range = raw.match(/(\d{1,2})\s*(?:至|到|-|—)\s*(\d{1,2})周岁/u);
  if (!range) return zhejiangCheck('review', `无法可靠解析年龄要求“${raw}”。`);
  const min = Number(range[1]);
  let max = Number(range[2]);
  if (profile.graduationStatus === '应届毕业生' && zhejiangEducationRank(profile.degree) >= 3) {
    const exception = raw.match(/放宽至\s*(\d{1,2})周岁/u);
    if (exception) max = Number(exception[1]);
  }
  return own >= min && own <= max
    ? zhejiangCheck('match', `个人年龄 ${own} 周岁，落在职位表列明的 ${min} 至 ${max} 周岁范围内。`)
    : zhejiangCheck('mismatch', `职位年龄范围为 ${min} 至 ${max} 周岁，个人填写为 ${own} 周岁。`);
}

function zhejiangMatchSpecialRequirements(position, profile) {
  const note = String(position.remarkRaw || '').trim();
  const checks = [];
  const locality = note.match(/限[^；;。\n]*(?:户籍|生源地?|生源)/u)?.[0];
  if (locality) {
    const own = [profile.hukou, profile.studentOrigin].filter(Boolean).join(' ');
    const place = locality.match(/限(?:具有)?(.+?)(?:户籍|生源地?|生源)/u)?.[1]?.trim();
    if (!own) checks.push(zhejiangCheck('missing', `职位限制户籍或生源地（${locality}），请补充对应信息。`));
    else if (place && own.includes(place)) checks.push(zhejiangCheck('match', '户籍或生源地信息命中职位限制。'));
    else checks.push(zhejiangCheck('mismatch', '个人户籍或生源地未命中职位限制。'));
  }

  const serviceProject = note.match(/(?:要求|限|面向)[^；;。\n]*(?:服务基层项目|大学生村官|三支一扶|西部计划|特岗教师)[^；;。\n]*/u)?.[0];
  if (serviceProject) {
    if (!profile.grassrootsProjectStatus) checks.push(zhejiangCheck('missing', `请核对服务基层项目要求：“${serviceProject}”。`));
    else if (profile.grassrootsProjectStatus === '否') checks.push(zhejiangCheck('mismatch', '个人资料标注不符合职位要求的服务基层项目条件。'));
    else checks.push(zhejiangCheck('review', `服务基层项目资格需与原文核对：“${serviceProject}”。`));
  }

  const needsPhysicalTest = /是/u.test(String(position.physicalTestRaw || '')) || /体能测评/u.test(note);
  if (needsPhysicalTest) {
    if (!profile.acceptPhysicalTest || profile.acceptPhysicalTest === '待确认') checks.push(zhejiangCheck('missing', '该职位要求体能测评，请确认是否接受并符合测试要求。'));
    else if (profile.acceptPhysicalTest === '不接受') checks.push(zhejiangCheck('mismatch', '个人资料标注不接受体能测评。'));
    else checks.push(zhejiangCheck('match', '个人资料标注接受体能测评；体测标准仍需核对公告。'));
  }

  const needsPsychologicalTest = /是/u.test(String(position.psychologicalTestRaw || '')) || /心理测评/u.test(note);
  if (needsPsychologicalTest) {
    if (!profile.acceptPsychologicalTest || profile.acceptPsychologicalTest === '待确认') checks.push(zhejiangCheck('missing', '该职位要求心理测评，请确认是否接受并核对招录要求。'));
    else if (profile.acceptPsychologicalTest === '不接受') checks.push(zhejiangCheck('mismatch', '个人资料标注不接受心理测评。'));
    else checks.push(zhejiangCheck('review', '个人资料标注接受心理测评；具体标准仍以公告为准。'));
  }

  const needsProfessionalTest = /是/u.test(String(position.professionalTestRaw || ''));
  if (needsProfessionalTest) {
    if (!profile.acceptProfessionalTest || profile.acceptProfessionalTest === '待确认') checks.push(zhejiangCheck('missing', '该职位有专业加试，请确认是否接受并核对考试安排。'));
    else if (profile.acceptProfessionalTest === '不接受') checks.push(zhejiangCheck('mismatch', '个人资料标注不接受专业加试。'));
    else checks.push(zhejiangCheck('review', '个人资料标注接受专业加试；具体科目仍需核对公告。'));
  }

  if (/最低服务年限|服务满\d+年|服务满[一二三四五六七八九十]+年/u.test(note)) {
    if (!profile.acceptServiceDuration || profile.acceptServiceDuration === '待确认') checks.push(zhejiangCheck('missing', '职位设有最低服务年限，请确认能否接受。'));
    else if (profile.acceptServiceDuration === '不接受') checks.push(zhejiangCheck('mismatch', '个人资料标注不接受职位的最低服务年限。'));
    else checks.push(zhejiangCheck('match', '个人资料标注接受最低服务年限。'));
  }

  const certificate = note.match(/(?:须|需|要求)[^；;。\n]*(?:资格证书|职业资格|法律职业资格)[^；;。\n]*/u)?.[0];
  if (certificate) {
    if (!profile.credentials) checks.push(zhejiangCheck('missing', `职位有证书或职业资格条件，请核对：“${certificate}”。`));
    else if (profile.credentials.includes('法律职业资格') || profile.credentials.includes('资格证')) checks.push(zhejiangCheck('review', `请核对已填资质是否满足：“${certificate}”。`));
    else checks.push(zhejiangCheck('mismatch', `职位要求证书或职业资格：“${certificate}”。`));
  }

  const residual = note
    .replace(/(^|[；;。\n])\s*(?:\d+|[一二三四五六七八九十]+)[.．、)）]\s*/gu, '$1')
    .replace(/参照公务员法管理[。；;]?/gu, '')
    .replace(/(?:要求|限|仅限|只限|性别要求为|性别不限)[^；;。\n]*(?:男性|女性|男生|女生|男女不限|性别不限)[^；;。\n]*/gu, '')
    .replace(/政治面貌要求为[^；;。\n]*/gu, '')
    .replace(/限[^；;。\n]*(?:户籍|生源地?|生源)[^；;。\n]*/gu, '')
    .replace(/(?:要求|限|面向)[^；;。\n]*(?:服务基层项目|大学生村官|三支一扶|西部计划|特岗教师)[^；;。\n]*/gu, '')
    .replace(/(?:须|需|要求)[^；;。\n]*(?:资格证书|职业资格|法律职业资格)[^；;。\n]*/gu, '')
    .replace(/(?:最低服务年限|服务满\d+年|服务满[一二三四五六七八九十]+年)[^；;。\n]*/gu, '')
    .replace(/(?:要求|限|仅限|只限|性别要求为|性别不限)[^；;。\n]*(?:体能测评|心理测评)[^；;。\n]*/gu, '')
    .replace(/[\s；;。]/gu, '');
  if (residual) checks.push(zhejiangCheck('review', `职位备注还包含需人工核对的条件：“${note}”。`));
  const failing = checks.find((item) => item.status === 'mismatch');
  if (failing) return failing;
  const missing = checks.find((item) => item.status === 'missing');
  if (missing) return missing;
  const review = checks.find((item) => item.status === 'review');
  return review || zhejiangCheck('match', '职位备注未发现未处理的额外资格条件。');
}

export function evaluateZhejiangEligibility(position, profile = {}, majorCatalog = []) {
  const national = evaluateNationalEligibility(position, { ...profile, degreeTitle: zhejiangDegreeTitle(profile) });
  const checks = {
    major: zhejiangMatchMajor(position, profile, majorCatalog),
    education: national.checks.education,
    degree: zhejiangMatchDegree(position, profile),
    politicalStatus: zhejiangMatchPoliticalStatus(position, profile),
    gender: zhejiangMatchGender(position, profile),
    ethnicity: zhejiangMatchEthnicity(position, profile),
    graduation: zhejiangMatchGraduation(position, profile),
    grassrootsExperience: zhejiangMatchGrassroots(position, profile),
    age: zhejiangMatchAge(position, profile),
    specialRequirements: zhejiangMatchSpecialRequirements(position, profile),
  };
  const statuses = Object.values(checks).map((item) => item.status);
  const status = statuses.includes('mismatch') ? 'incompatible'
    : statuses.includes('missing') ? 'incomplete'
      : statuses.includes('review') ? 'needsReview' : 'initialMatch';
  return { status, label: ZHEJIANG_LABELS[status], checks };
}

export function hasZhejiangEligibilityProfile(profile) {
  return zhejiangProfileHasValues(profile);
}

export function getZhejiangMajorCatalogPath(profile, majorCatalog) {
  const level = zhejiangCatalogLevel(profile || {});
  return [...zhejiangMajorPath(profile || {}, majorCatalog, level).path].filter(Boolean);
}
