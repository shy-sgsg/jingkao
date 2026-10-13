const normalizeText = (value) => String(value ?? '').replace(/[\s　]+/gu, '').toLocaleLowerCase('zh-CN');

const EDUCATION_RANK = new Map([
  ['大专', 1], ['专科', 1], ['本科', 2], ['大学本科', 2],
  ['硕士', 3], ['硕士研究生', 3], ['研究生', 3], ['博士', 4], ['博士研究生', 4],
]);

function rankForEducation(value) {
  const text = normalizeText(value);
  for (const [label, rank] of EDUCATION_RANK) if (text.includes(normalizeText(label))) return rank;
  return null;
}

function rankForDegree(value) {
  const text = normalizeText(value);
  if (/博士/u.test(text)) return 4;
  if (/硕士/u.test(text)) return 3;
  if (/学士/u.test(text)) return 2;
  return null;
}

function check(status, reason, extra = {}) {
  return { status, reason, ...extra };
}

function selectMajorRequirement(raw, rank) {
  const text = String(raw || '').trim();
  const labels = [
    { key: '本科', rank: 2 }, { key: '硕士研究生', rank: 3 },
    { key: '博士研究生', rank: 4 }, { key: '研究生', rank: 3 },
  ];
  const matcher = /本科\s*[：:]|硕士研究生\s*[：:]|博士研究生\s*[：:]|研究生\s*[：:]/gu;
  const matches = [...text.matchAll(matcher)];
  if (!matches.length) return text;
  const groups = matches.map((match, index) => {
    const label = labels.find((item) => match[0].startsWith(item.key));
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? text.length;
    return { rank: label?.rank, text: text.slice(start, end).replace(/[；;，,。]+$/u, '').trim() };
  });
  return groups.find((group) => group.rank === rank)?.text ?? '';
}

function parseMajorTokens(raw) {
  const tokens = String(raw || '').split(/[、，,；;\n\r]+/u).map((item) => item.trim()).filter(Boolean);
  return tokens.map((token) => {
    const coded = token.match(/^(\d{4,6})\s*(.*)$/u);
    const parentheticalCode = token.match(/[（(]\s*(\d{4,6})\s*[）)]/u);
    const code = coded?.[1] || parentheticalCode?.[1] || '';
    const name = (coded?.[2] || token).replace(/^(?:仅限|只限|限于)\s*/u, '').replace(/[（(].*?[）)]/gu, '').trim();
    return { code, name };
  });
}

function matchMajor(position, profile) {
  const raw = String(position.majorRaw || '').trim();
  if (!raw) return check('review', '职位表专业字段为空，需回到原表确认。');
  if (/不限专业|专业不限|不限制专业/u.test(raw)) return check('match', '职位表明确标注专业不限。', { matchType: 'unrestricted' });

  const rank = rankForEducation(profile.degree);
  const name = rank >= 3 ? profile.graduateMajor : profile.undergraduateMajor;
  const code = rank >= 3 ? profile.graduateMajorCode : profile.undergraduateMajorCode;
  if (!name && !code) return check('missing', '请补充与报考学历层级对应的专业名称或专业代码。');
  if (!rank) return check('missing', '请先补充最高学历，系统才能选择对应阶段的专业资料。');

  const requirement = selectMajorRequirement(raw, rank);
  if (!requirement) return check('review', '职位表没有明确区分当前学历阶段的专业条件，需人工核对。');
  const tokens = parseMajorTokens(requirement);
  const normalizedName = normalizeText(name);
  const normalizedCode = String(code || '').replace(/\D/gu, '');

  for (const token of tokens) {
    if (normalizedName && token.name && normalizeText(token.name) === normalizedName) {
      return check('match', `职位表原文列有专业“${token.name}”，与个人资料中的专业名称一致。`, { matchType: 'exact' });
    }
    if (normalizedCode && token.code && token.code === normalizedCode) {
      return check('match', `职位表专业代码 ${token.code} 与个人资料代码一致。`, { matchType: 'exact' });
    }
    if (normalizedCode && token.code?.length === 4 && normalizedCode.startsWith(token.code)) {
      return check('match', `职位表列出专业类代码 ${token.code}，个人专业代码 ${normalizedCode} 属于该代码范围。`, { matchType: 'category' });
    }
  }
  if (tokens.some((token) => token.code || (token.name && !/类|相关|等|范围|目录|方向/u.test(token.name)))) {
    return check('mismatch', '个人专业名称或代码未与该学历阶段的职位要求精确对应。', { matchType: 'none' });
  }
  return check('review', '职位专业条件包含无法可靠拆分的描述；文本相似度不能代替目录核验。');
}

function matchEducation(raw, profile) {
  const requirement = normalizeText(raw);
  if (!requirement) return check('review', '职位表学历字段为空，需核对原表。');
  if (/不限学历|学历不限|大专及以上|专科及以上/u.test(requirement)) {
    if (/大专|专科/.test(requirement)) {
      const rank = rankForEducation(profile.degree);
      return rank === null ? check('missing', '请补充最高学历。') : rank >= 1
        ? check('match', '个人最高学历达到职位表要求。') : check('mismatch', '学历未达到职位表要求。');
    }
    return check('match', '职位表未限制学历。');
  }
  const ownRank = rankForEducation(profile.degree);
  if (ownRank === null) return check('missing', '请补充最高学历。');
  const only = /仅限|只限/u.test(requirement);
  const requiredRank = rankForEducation(requirement);
  if (requiredRank === null) return check('review', `无法可靠解析学历要求“${raw}”。`);
  if (only) return ownRank === requiredRank
    ? check('match', `职位表明确限定${raw}，个人学历层级一致。`)
    : check('mismatch', `职位表明确限定${raw}，个人最高学历层级不同。`);
  if (/及以上|以上|含以上|不低于/u.test(requirement)) return ownRank >= requiredRank
    ? check('match', `个人学历达到“${raw}”的起始层级。`)
    : check('mismatch', `个人学历低于“${raw}”的起始层级。`);
  const allowed = [...requirement.matchAll(/大专|专科|本科|硕士研究生|硕士|博士研究生|博士/gu)]
    .map((match) => rankForEducation(match[0]));
  if (allowed.length > 1) return allowed.includes(ownRank)
    ? check('match', `个人学历属于职位表列出的层级：${raw}。`)
    : check('mismatch', `个人学历不在职位表列出的层级范围内：${raw}。`);
  return check('review', `学历要求“${raw}”未明确说明是最低层级还是限定层级。`);
}

function matchDegree(raw, profile) {
  const requirement = normalizeText(raw);
  if (!requirement || /不限|无要求/u.test(requirement)) return check('match', '职位表未限制学位。');
  if (/与最高学历对应/u.test(requirement)) {
    return check('match', '职位要求学位与最高学历对应，本项按符合处理。');
  }
  const degreeTitle = normalizeText(profile.degreeTitle);
  if (!degreeTitle) return check('missing', '请补充已取得的学位名称。');
  if (/学士|硕士|博士/u.test(requirement)) {
    const required = requirement.includes('博士') ? 4 : requirement.includes('硕士') ? 3 : 2;
    const provided = rankForDegree(degreeTitle);
    if (!provided) return check('review', `无法解析已填写学位“${profile.degreeTitle}”。`);
    return provided === required ? check('match', '学位层级符合职位表要求。') : check('mismatch', '学位层级与职位表要求不一致。');
  }
  return check('review', `无法可靠解析学位要求“${raw}”。`);
}

function matchPoliticalStatus(raw, profile) {
  const requirement = normalizeText(raw);
  if (!requirement) return check('review', '职位表政治面貌字段为空。');
  if (/不限|无要求/u.test(requirement)) return check('match', '职位表政治面貌不限。');
  const status = normalizeText(profile.politicalStatus);
  if (!status) return check('missing', '请补充政治面貌。');
  if (/中共党员或共青团员|中共党员、共青团员/u.test(requirement)) {
    if (status === normalizeText('中共党员') || status === normalizeText('共青团员')) return check('match', '个人政治面貌属于职位表列出的范围。');
    if (/预备党员/u.test(status)) return check('review', '预备党员是否符合该岗位口径需向招录机关确认。');
    return check('mismatch', '个人政治面貌不在职位表列出的范围内。');
  }
  if (/中共党员/u.test(requirement)) {
    if (/预备党员/u.test(status)) return check('review', '预备党员是否符合该岗位口径需向招录机关确认。');
    return status === normalizeText('中共党员')
      ? check('match', '个人政治面貌符合职位表要求。')
      : check('mismatch', '职位要求中共党员，个人政治面貌不符合。');
  }
  return check('review', `无法可靠解析政治面貌要求“${raw}”。`);
}

const CHINESE_DIGITS = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

function experienceYears(value) {
  const text = normalizeText(value);
  const arabic = text.match(/(\d+(?:\.\d+)?)年/u);
  if (arabic) return Number(arabic[1]);
  const chinese = text.match(/([零一二两三四五六七八九十]+)年/u)?.[1];
  if (!chinese) return null;
  if (chinese === '十') return 10;
  if (chinese.startsWith('十')) return 10 + (CHINESE_DIGITS[chinese[1]] || 0);
  if (chinese.endsWith('十')) return (CHINESE_DIGITS[chinese[0]] || 1) * 10;
  return CHINESE_DIGITS[chinese] ?? null;
}

function matchGrassrootsExperience(raw, profile) {
  const requirement = normalizeText(raw);
  if (!requirement) return check('review', '职位表基层工作经历字段为空。');
  if (/不限|无限制|无要求/u.test(requirement)) return check('match', '职位表未限制基层工作经历。');
  const required = experienceYears(requirement);
  if (required === null) return check('review', `无法可靠解析基层工作经历要求“${raw}”。`);
  const years = Number(profile.grassrootsYears);
  if (!Number.isFinite(years) || profile.grassrootsYears === '') return check('missing', '请补充截至职位表规定日期的基层工作经历年限。');
  return years >= required
    ? check('match', `填写的基层工作经历为 ${years} 年，达到至少 ${required} 年的要求。`)
    : check('mismatch', `职位要求至少 ${required} 年基层工作经历，填写为 ${years} 年。`);
}

function matchGraduation(position, profile) {
  const text = normalizeText(`${position.remarkRaw || ''} ${position.freshGraduateRaw || ''}`);
  if (!/应届/u.test(text)) return check('match', '职位原文没有明确的应届身份限制。');
  const status = normalizeText(profile.graduationStatus);
  if (!status) return check('missing', '请补充毕业身份，并核对当年应届毕业生政策。');
  if (/符合政策/u.test(status)) return check('review', '政策性应届身份须对照2027年官方报考指南人工确认。');
  if (/非应届|社会人员/u.test(status)) return check('mismatch', '个人资料标注为非应届，职位原文要求应届身份。');
  if (/应届/u.test(status)) {
    const year = Number(profile.graduationYear);
    if (year === 2027) return check('match', '个人资料标注为2027届应届毕业生。');
    return check('review', '应届身份不只由毕业年份决定，需核对当年官方政策。');
  }
  return check('review', '当前毕业身份无法对应职位中的应届条件。');
}

function matchSpecialRequirements(position, profile) {
  const service = String(position.serviceProjectRaw || '').trim();
  if (service && !/不限|无限制|无要求/u.test(normalizeText(service))) {
    if (!profile.grassrootsProjectStatus) return check('missing', `请确认是否符合服务基层项目条件：“${service}”。`);
    if (profile.grassrootsProjectStatus === '否') return check('mismatch', '个人资料标注不符合服务基层项目条件。');
    return check('review', `服务基层项目类型需与职位原文逐项核对：“${service}”。`);
  }

  let remark = String(position.remarkRaw || '').trim();
  if (!remark || /^无[。.]?$/u.test(remark)) return check('match', '备注没有额外资格限制。');
  remark = remark.replace(/咨询电话[：:]\s*[\d\-、，,\s]+[。；;]?/gu, '');
  if (!remark.trim()) return check('match', '备注仅含咨询电话，没有额外资格限制。');
  return check('review', '职位备注包含需人工确认的条件，已保留原文供核对。', {
    raw: position.remarkRaw,
    reviewScope: 'remark',
  });
}

export function evaluateNationalEligibility(position, profile = {}) {
  const checks = {
    major: matchMajor(position, profile),
    education: matchEducation(position.educationRaw, profile),
    degree: matchDegree(position.degreeRaw, profile),
    politicalStatus: matchPoliticalStatus(position.politicalStatusRaw, profile),
    graduation: matchGraduation(position, profile),
    grassrootsExperience: matchGrassrootsExperience(position.experienceRaw, profile),
    specialRequirements: matchSpecialRequirements(position, profile),
  };
  const statuses = Object.entries(checks).map(([key, item]) => (
    key === 'specialRequirements' && item.reviewScope === 'remark' ? 'match' : item.status
  ));
  const status = statuses.includes('mismatch') ? 'incompatible'
    : statuses.includes('review') ? 'needsReview'
      : statuses.includes('missing') ? 'incomplete' : 'initialMatch';
  const labels = {
    initialMatch: '初步符合', incompatible: '明确不符合',
    needsReview: '需要人工核验', incomplete: '资料不完整',
  };
  return { status, label: labels[status], checks };
}
