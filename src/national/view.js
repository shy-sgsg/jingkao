import { evaluateNationalEligibility } from './eligibility.js';
import { filterNationalPositions, sortNationalPositions } from './filters.js';
import { NATIONAL_DEFAULT_VISIBLE_COLUMNS } from './storage.js';

const escapeNationalHtml = (value) => String(value ?? '').replace(/[&<>"']/gu, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

const labelMap = {
  initialMatch: '初步符合', incompatible: '明确不符合', needsReview: '需要人工核验', incomplete: '资料不完整',
};

function hasNationalProfile(profile) {
  return ['degree', 'degreeTitle', 'undergraduateMajor', 'undergraduateMajorCode', 'graduateMajor', 'graduateMajorCode',
    'politicalStatus', 'graduationStatus', 'graduationYear', 'grassrootsYears', 'grassrootsProjectStatus']
    .some((key) => String(profile?.[key] ?? '').trim());
}

function input(name, label, value, placeholder = '', type = 'text') {
  return `<label class="form-field national-filter-field"><span>${label}</span><input name="${name}" type="${type}" value="${escapeNationalHtml(value)}" placeholder="${escapeNationalHtml(placeholder)}"/></label>`;
}

function select(name, label, value, choices) {
  return `<label class="form-field national-filter-field"><span>${label}</span><select name="${name}"><option value="">全部</option>${choices.map((item) => {
    const choiceValue = typeof item === 'string' ? item : item.value;
    const choiceLabel = typeof item === 'string' ? item : item.label;
    return `<option value="${escapeNationalHtml(choiceValue)}" ${String(value ?? '') === String(choiceValue) ? 'selected' : ''}>${escapeNationalHtml(choiceLabel)}</option>`;
  }).join('')}</select></label>`;
}

function multiSelect(name, label, selected, choices, emptyPrompt = '暂无可选项') {
  const values = Array.isArray(selected) ? selected : [];
  const summary = values.length ? `已选 ${values.length} 项` : choices.length ? '全部' : emptyPrompt;
  return `<div class="form-field national-filter-field national-multi-field"><span>${label}</span><details class="national-multi-select" data-filter-name="${escapeNationalHtml(name)}"><summary>${summary}</summary><div class="national-multi-options">${choices.length ? choices.map((item) => {
    const choiceValue = typeof item === 'string' ? item : item.value;
    const choiceLabel = typeof item === 'string' ? item : item.label;
    return `<label><input type="checkbox" name="${name}" value="${escapeNationalHtml(choiceValue)}" ${values.includes(choiceValue) ? 'checked' : ''}/><span>${escapeNationalHtml(choiceLabel)}</span></label>`;
  }).join('') : `<p class="national-multi-empty">${escapeNationalHtml(emptyPrompt)}</p>`}</div></details></div>`;
}

function badge(text, kind = '') {
  return `<span class="national-badge ${kind ? `is-${kind}` : ''}">${escapeNationalHtml(text)}</span>`;
}

function fieldRows(position) {
  return Object.entries(position.rawFields || {}).map(([label, value]) => `<div class="national-raw-field"><dt>${escapeNationalHtml(label)}</dt><dd>${value ? escapeNationalHtml(value) : '<span class="national-empty-value">原表为空</span>'}</dd></div>`).join('');
}

function eligibilityBadge(position, profile, cache = null) {
  if (!hasNationalProfile(profile)) return badge('待填写个人条件', 'neutral');
  const result = getEligibility(position, profile, cache);
  return badge(result.label, result.status);
}

function getEligibility(position, profile, cache) {
  if (cache?.has(position)) return cache.get(position);
  const result = evaluateNationalEligibility(position, profile);
  cache?.set(position, result);
  return result;
}

function personalValueForCheck(key, profile) {
  const education = String(profile?.degree || '');
  const isGraduate = /硕士|博士|研究生/u.test(education);
  const major = isGraduate
    ? [profile?.graduateMajor, profile?.graduateMajorCode].filter(Boolean).join(' · ')
    : [profile?.undergraduateMajor, profile?.undergraduateMajorCode].filter(Boolean).join(' · ');
  const values = {
    major, education, degree: profile?.degreeTitle, politicalStatus: profile?.politicalStatus,
    graduation: [profile?.graduationStatus, profile?.graduationYear].filter(Boolean).join(' · '),
    grassrootsExperience: profile?.grassrootsYears ? `${profile.grassrootsYears} 年` : '',
    specialRequirements: [profile?.grassrootsProjectStatus, profile?.credentials, profile?.hukou, profile?.studentOrigin]
      .filter(Boolean).join(' · '),
  };
  return values[key] || '';
}

function requirementForCheck(key, position) {
  const values = {
    major: position.majorRaw, education: position.educationRaw, degree: position.degreeRaw,
    politicalStatus: position.politicalStatusRaw,
    graduation: [position.freshGraduateRaw, position.remarkRaw].filter(Boolean).join('；') || '原文未明确限制',
    grassrootsExperience: position.experienceRaw,
    specialRequirements: [position.serviceProjectRaw, position.remarkRaw].filter(Boolean).join('；') || '原表为空',
  };
  return values[key] || '';
}

function renderPositionDetails(position, workspace, profile, favorite, eligibilityCache = null) {
  const note = favorite?.note || workspace.notes[position.id] || '';
  const status = hasNationalProfile(profile)
    ? getEligibility(position, profile, eligibilityCache) : null;
  const checkRows = status ? Object.entries(status.checks).map(([key, check]) => `<li><strong>${escapeNationalHtml(({ major: '专业', education: '学历', degree: '学位', politicalStatus: '政治面貌', graduation: '毕业身份', grassrootsExperience: '基层经历', specialRequirements: '备注 / 项目' })[key] || key)}</strong><small>职位要求：${escapeNationalHtml(requirementForCheck(key, position) || '原表为空')}</small><small>我的资料：${escapeNationalHtml(personalValueForCheck(key, profile) || '未填写')}</small><span>判断依据：${escapeNationalHtml(check.reason)}</span></li>`).join('') : '';
  return `<details class="national-position-details"><summary>查看资格判断与全部 27 项职位表原文</summary>
      ${status ? `<section class="national-eligibility"><h4>逐项资格核对 · ${escapeNationalHtml(labelMap[status.status])}</h4><ul>${checkRows}</ul><p>系统只做初步核对。含糊专业、服务基层项目、应届口径和备注仍需人工回看官方职位表。</p></section>` : '<p class="national-review-note">补充个人资料后可查看逐项初步核对；当前不会根据搜索命中推断资格。</p>'}
      <dl class="national-raw-grid">${fieldRows(position)}</dl>
      <form class="national-note-form" id="national-note-form" data-position-id="${escapeNationalHtml(position.id)}"><label class="form-field"><span>个人备注</span><textarea name="note" rows="2" maxlength="2000" placeholder="例如：向招录机关核对专业目录或应届身份">${escapeNationalHtml(note)}</textarea></label><label class="form-field"><span>优先级</span><select name="priority"><option value="normal" ${favorite?.priority !== 'high' && favorite?.priority !== 'watch' ? 'selected' : ''}>普通</option><option value="high" ${favorite?.priority === 'high' ? 'selected' : ''}>优先核对</option><option value="watch" ${favorite?.priority === 'watch' ? 'selected' : ''}>继续关注</option></select></label><button type="submit" class="button button-secondary button-small">保存个人备注</button></form>
    </details>`;
}

function renderPositionCard(position, workspace, profile, eligibilityCache = null) {
  const favorite = workspace.favorites.find((item) => item.positionId === position.id);
  const compared = workspace.comparisons.includes(position.id);
  return `<article class="national-position-card" data-position-id="${escapeNationalHtml(position.id)}">
    <div class="national-position-head"><div><div class="national-kicker">${escapeNationalHtml(position.departmentCode)} · ${escapeNationalHtml(position.positionCode)} · ${escapeNationalHtml(position.sourceSheet)}</div><h3>${escapeNationalHtml(position.positionTitle)}</h3><p>${escapeNationalHtml(position.departmentName)} · ${escapeNationalHtml(position.organizationName)}</p></div>${eligibilityBadge(position, profile)}</div>
    <div class="national-position-meta"><span>工作地点：${escapeNationalHtml(position.workLocation || '原表为空')}</span><span>计划招录：${escapeNationalHtml(position.recruitCount)} 人</span><span>考试类别：${escapeNationalHtml(position.examCategory || '原表为空')}</span><span>报名 / 竞争数据：暂未填入</span></div>
    <div class="national-position-actions"><button type="button" class="button button-secondary button-small" data-action="national-toggle-favorite" data-position-id="${escapeNationalHtml(position.id)}">${favorite ? '★ 已收藏' : '☆ 收藏'}</button><button type="button" class="button button-quiet button-small" data-action="national-toggle-compare" data-position-id="${escapeNationalHtml(position.id)}">${compared ? '✓ 已加入比较' : '＋ 加入比较'}</button><button type="button" class="button button-quiet button-small" data-action="national-copy-position" data-position-id="${escapeNationalHtml(position.id)}">复制职位信息</button></div>
    ${renderPositionDetails(position, workspace, profile, favorite, eligibilityCache)}
  </article>`;
}

const TABLE_COLUMN_DEFS = [
  ['favorite', '收藏'], ['departmentName', '招录部门'], ['organizationName', '用人司局'],
  ['positionTitle', '职位名称'], ['positionCode', '职位代码'], ['departmentCode', '部门代码'],
  ['organizationType', '机构性质'], ['sourceSheet', '职位表类型'], ['workLocation', '工作地点'],
  ['settlementLocation', '落户地点'], ['recruitCount', '计划招录'], ['educationRaw', '学历要求'],
  ['degreeRaw', '学位要求'], ['majorRaw', '专业要求'], ['majorMatch', '专业匹配'],
  ['eligibility', '综合资格'], ['politicalStatusRaw', '政治面貌'], ['experienceRaw', '基层经历'],
  ['professionalTestRaw', '专业能力测试'], ['interviewRatioRaw', '面试比例'], ['remarkHint', '备注提示'],
];

function renderTableColumnSettings(visibleColumns) {
  return `<details class="national-column-settings"><summary>设置表格列</summary><form id="national-column-form" class="national-column-options">${TABLE_COLUMN_DEFS.map(([key, label]) => `<label><input type="checkbox" name="visibleColumns" value="${key}" ${visibleColumns.includes(key) ? 'checked' : ''}/><span>${label}</span></label>`).join('')}<button type="submit" class="button button-secondary button-small">应用列设置</button></form></details>`;
}

function renderMajorBadge(position, profile, eligibilityCache) {
  if (!hasNationalProfile(profile)) return badge('待填写个人条件', 'neutral');
  const status = getEligibility(position, profile, eligibilityCache).checks.major.status;
  const labels = { match: '初步匹配', mismatch: '明确不符合', review: '待人工核验', missing: '资料不完整' };
  return badge(labels[status] || '待核验', status === 'match' ? 'initialMatch' : status === 'mismatch' ? 'incompatible' : status === 'missing' ? 'incomplete' : 'needsReview');
}

function renderTableCell(key, position, workspace, profile, eligibilityCache, favorite, compared) {
  if (key === 'favorite') return `<button type="button" class="button button-quiet button-small" data-action="national-toggle-favorite" data-position-id="${escapeNationalHtml(position.id)}" aria-label="${favorite ? '取消收藏' : '收藏'} ${escapeNationalHtml(position.positionTitle)}">${favorite ? '★' : '☆'}</button>`;
  if (key === 'majorMatch') return renderMajorBadge(position, profile, eligibilityCache);
  if (key === 'eligibility') return eligibilityBadge(position, profile, eligibilityCache);
  if (key === 'remarkHint') {
    const value = String(position.remarkRaw || '').trim();
    const hint = value && !/^无[。.]?$/u.test(value) ? value : '无特殊备注';
    return `<span class="national-remark-hint" title="${escapeNationalHtml(value || '原表为空')}">${escapeNationalHtml(hint || '原表为空')}</span>`;
  }
  if (key === 'recruitCount') return `${escapeNationalHtml(position.recruitCount)} 人`;
  if (key === 'departmentName') return escapeNationalHtml(position.departmentName || '原表为空');
  if (key === 'organizationName') return escapeNationalHtml(position.organizationName || '原表为空');
  if (key === 'positionTitle') return `<div class="national-table-title"><strong>${escapeNationalHtml(position.positionTitle)}</strong><small>${escapeNationalHtml(position.positionCode)} · ${escapeNationalHtml(position.sourceSheet)}</small></div>`;
  if (key === 'actions') return `<div class="national-position-actions"><button type="button" class="button button-quiet button-small" data-action="national-toggle-compare" data-position-id="${escapeNationalHtml(position.id)}">${compared ? '✓ 已比较' : '＋ 比较'}</button><button type="button" class="button button-quiet button-small" data-action="national-copy-position" data-position-id="${escapeNationalHtml(position.id)}">复制原文</button></div>`;
  if (key === 'organizationType') return escapeNationalHtml(position.organizationType || '原表为空');
  if (key === 'sourceSheet') return escapeNationalHtml(position.sourceSheet || '原表为空');
  if (key === 'workLocation') return escapeNationalHtml(position.workLocation || '原表为空');
  if (key === 'settlementLocation') return escapeNationalHtml(position.settlementLocation || '原表为空');
  if (key === 'departmentCode') return escapeNationalHtml(position.departmentCode || '原表为空');
  if (key === 'positionCode') return escapeNationalHtml(position.positionCode || '原表为空');
  if (key === 'professionalTestRaw') return escapeNationalHtml(position.professionalTestRaw || '原表为空');
  if (key === 'interviewRatioRaw') return escapeNationalHtml(position.interviewRatioRaw || '原表为空');
  return escapeNationalHtml(position[key] || '原表为空');
}

function renderPositionTableRows(position, workspace, profile, columns, eligibilityCache) {
  const favorite = workspace.favorites.find((item) => item.positionId === position.id);
  const compared = workspace.comparisons.includes(position.id);
  const cells = columns.map(([key, label]) => `<td data-label="${label}">${renderTableCell(key, position, workspace, profile, eligibilityCache, favorite, compared)}</td>`).join('');
  return `<tr class="national-position-row" data-position-id="${escapeNationalHtml(position.id)}">${cells}</tr><tr class="national-position-detail-row"><td colspan="${columns.length}">${renderPositionDetails(position, workspace, profile, favorite, eligibilityCache)}</td></tr>`;
}

function renderTabs(tab, workspace) {
  const tabs = [['positions', '职位筛选'], ['overview', '数据概览'], ['favorites', `我的收藏 ${workspace.favorites.length}`], ['comparison', `并排比较 ${workspace.comparisons.length}`]];
  return `<nav class="national-tabs" aria-label="国考职位工具">${tabs.map(([key, label]) => `<a class="national-tab ${tab === key ? 'is-active' : ''}" href="#/national?tab=${key}" ${tab === key ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`;
}

function activeFilterEntries(filters) {
  const entries = [];
  const labels = {
    workProvinces: '省份', workCities: '城市', workDistricts: '区县', departments: '招录部门',
    sourceSheets: '职位表类型', educationRequirements: '学历原文', degrees: '学位要求',
    politicalStatuses: '政治面貌', grassrootsRequirements: '基层经历', examCategories: '考试类别',
    qualificationStatuses: '资格状态',
  };
  for (const [key, label] of Object.entries(labels)) {
    for (const value of Array.isArray(filters[key]) ? filters[key] : []) entries.push({ key, value: String(value), label: `${label}：${value}` });
  }
  if (filters.keyword) entries.push({ key: 'keyword', value: '', label: `关键词：${filters.keyword}` });
  if (filters.majorQuery) entries.push({ key: 'majorQuery', value: '', label: `专业原文：${filters.majorQuery}` });
  const departmentSearches = Array.isArray(filters.departmentQueries) && filters.departmentQueries.length
    ? filters.departmentQueries : filters.departmentQuery ? [filters.departmentQuery] : [];
  for (const value of departmentSearches) {
    entries.push({ key: 'departmentQueries', value: String(value), label: `招录部门：${value}` });
  }
  if (filters.minRecruitCount !== '' && filters.minRecruitCount !== undefined && filters.minRecruitCount !== null) entries.push({ key: 'minRecruitCount', value: '', label: `招录人数 ≥ ${filters.minRecruitCount}` });
  if (filters.maxRecruitCount !== '' && filters.maxRecruitCount !== undefined && filters.maxRecruitCount !== null) entries.push({ key: 'maxRecruitCount', value: '', label: `招录人数 ≤ ${filters.maxRecruitCount}` });
  const enabled = {
    onlyUnrestrictedMajor: '只看专业不限', onlyInitialMatch: '只看初步符合',
    excludeNeedsReview: '排除需人工核验', excludeExplicitMismatch: '排除明确不符合',
    excludeMajorMismatch: '排除专业不符合', excludeEducationMismatch: '排除学历不符合',
    excludePoliticalMismatch: '排除政治面貌不符合', excludeGrassrootsMismatch: '排除基层经历不符合',
    excludeSpecialReview: '排除特殊条件待核验', onlyRecruitAtLeastTwo: '只看招录 2 人及以上',
    onlyWithCompleteRawFields: '只看关键条件完整',
  };
  for (const [key, label] of Object.entries(enabled)) if (filters[key]) entries.push({ key, value: 'true', label });
  if (typeof filters.hasProfessionalTest === 'boolean') entries.push({ key: 'hasProfessionalTest', value: String(filters.hasProfessionalTest), label: `面试专业能力测试：${filters.hasProfessionalTest ? '有' : '无'}` });
  if (typeof filters.hasSpecialRequirement === 'boolean') entries.push({ key: 'hasSpecialRequirement', value: String(filters.hasSpecialRequirement), label: `特殊条件：${filters.hasSpecialRequirement ? '有' : '无'}` });
  const statuses = { initialMatch: '初步符合', incompatible: '明确不符合', needsReview: '需要人工核验', incomplete: '资料不完整' };
  return entries.map((entry) => entry.key === 'qualificationStatuses'
    ? { ...entry, label: `资格状态：${statuses[entry.value] || entry.value}` } : entry);
}

function renderActiveFilters(filters) {
  const entries = activeFilterEntries(filters);
  if (!entries.length) return '';
  return `<section class="national-active-filters" aria-label="已启用筛选条件"><strong>已启用条件</strong><div>${entries.map((item) => `<button type="button" class="national-filter-chip" data-action="national-remove-filter" data-filter-key="${escapeNationalHtml(item.key)}" data-filter-value="${escapeNationalHtml(item.value)}" aria-label="移除${escapeNationalHtml(item.label)}">${escapeNationalHtml(item.label)} <span aria-hidden="true">×</span></button>`).join('')}<button type="button" class="button button-quiet button-small" data-action="national-clear-filters">清空全部</button></div></section>`;
}

function renderFilters(positions, filters, excludedReviewCount, hasProfile) {
  const selectedProvinces = Array.isArray(filters.workProvinces) ? filters.workProvinces : [];
  const selectedCities = Array.isArray(filters.workCities) ? filters.workCities : [];
  const mergeSelected = (values, selected) => [...new Set([...values, ...selected])].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const provinces = mergeSelected([...new Set(positions.map((position) => position.workProvince).filter(Boolean))], selectedProvinces);
  const departments = mergeSelected([...new Set(positions.map((position) => position.departmentName).filter(Boolean))], filters.departments || []);
  const cityRows = positions.filter((position) => !selectedProvinces.length || selectedProvinces.includes(position.workProvince));
  const cities = mergeSelected([...new Set(cityRows.map((position) => position.workCity).filter(Boolean))], selectedCities);
  const districtRows = positions.filter((position) => (!selectedProvinces.length || selectedProvinces.includes(position.workProvince))
    && selectedCities.length && selectedCities.includes(position.workCity));
  const districts = mergeSelected([...new Set(districtRows.map((position) => position.workDistrict).filter(Boolean))], filters.workDistricts || []);
  const sheets = [...new Set(positions.map((position) => position.sourceSheet))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const education = [...new Set(positions.map((position) => position.educationRaw).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const degrees = [...new Set(positions.map((position) => position.degreeRaw).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const political = [...new Set(positions.map((position) => position.politicalStatusRaw).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const grassroots = [...new Set(positions.map((position) => position.experienceRaw).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const categories = [...new Set(positions.map((position) => position.examCategory).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const hasProfessionalTest = filters.hasProfessionalTest === true ? 'true' : filters.hasProfessionalTest === false ? 'false' : '';
  const hasSpecialRequirement = filters.hasSpecialRequirement === true ? 'true' : filters.hasSpecialRequirement === false ? 'false' : '';
  return `<form id="national-filter-form" class="national-filter-panel"><div class="national-filter-heading"><div><div class="eyebrow muted">2027 NATIONAL EXAM · FILTERS</div><h2>筛选职位</h2><p>筛选输入会自动更新；同一条件多选按“或”匹配，条件之间按“且”匹配。</p></div><button type="button" class="button button-quiet button-small" data-action="national-clear-filters">清除条件</button></div>
    <div class="national-filter-grid">${input('keyword', '职位 / 单位 / 地点关键词', filters.keyword || '', '例如：税务、湖北省武汉市')}${input('majorQuery', '专业名称 / 代码原文检索', filters.majorQuery || '', '查找职位表原文，不代表专业符合')}${multiSelect('workProvinces', '工作省份', selectedProvinces, provinces)}${multiSelect('workCities', '工作城市', selectedCities, cities, '先选择省份')}${multiSelect('workDistricts', '区县 / 地区', filters.workDistricts, districts, '先选择城市')}${multiSelect('departments', '具体招录部门', filters.departments, departments)}${input('departmentQuery', '部门 / 用人司局搜索', (filters.departmentQueries || []).join('、') || filters.departmentQuery || '', '支持多个关键词，命中任一项')}${multiSelect('sourceSheets', '职位表机关类别', filters.sourceSheets, sheets)}${multiSelect('educationRequirements', '学历要求原文', filters.educationRequirements, education)}${multiSelect('degrees', '学位要求', filters.degrees, degrees)}${multiSelect('politicalStatuses', '政治面貌', filters.politicalStatuses, political)}${multiSelect('grassrootsRequirements', '基层工作年限', filters.grassrootsRequirements, grassroots)}${multiSelect('examCategories', '考试类别', filters.examCategories, categories)}${multiSelect('qualificationStatuses', '综合资格初步核对', filters.qualificationStatuses, [{ value: 'initialMatch', label: '初步符合' }, { value: 'incompatible', label: '明确不符合' }, { value: 'needsReview', label: '需要人工核验' }, { value: 'incomplete', label: '资料不完整' }])}${select('hasProfessionalTest', '面试专业能力测试', hasProfessionalTest, [{ value: 'true', label: '有' }, { value: 'false', label: '无' }])}${select('hasSpecialRequirement', '备注 / 项目条件', hasSpecialRequirement, [{ value: 'true', label: '有' }, { value: 'false', label: '无' }])}${input('minRecruitCount', '招录人数从', filters.minRecruitCount ?? '', '不限', 'number')}${input('maxRecruitCount', '招录人数至', filters.maxRecruitCount ?? '', '不限', 'number')}</div>
    <div class="national-filter-toggles"><label><input name="onlyUnrestrictedMajor" type="checkbox" ${filters.onlyUnrestrictedMajor ? 'checked' : ''}/>只看专业不限</label><label><input name="onlyInitialMatch" type="checkbox" ${filters.onlyInitialMatch ? 'checked' : ''}/>只看初步符合</label><label><input name="excludeNeedsReview" type="checkbox" ${filters.excludeNeedsReview ? 'checked' : ''}/>排除需人工核验</label><label><input name="excludeExplicitMismatch" type="checkbox" ${filters.excludeExplicitMismatch ? 'checked' : ''}/>排除明确不符合</label><label><input name="excludeMajorMismatch" type="checkbox" ${filters.excludeMajorMismatch ? 'checked' : ''}/>排除专业不符合</label><label><input name="excludeEducationMismatch" type="checkbox" ${filters.excludeEducationMismatch ? 'checked' : ''}/>排除学历不符合</label><label><input name="excludePoliticalMismatch" type="checkbox" ${filters.excludePoliticalMismatch ? 'checked' : ''}/>排除政治面貌不符合</label><label><input name="excludeGrassrootsMismatch" type="checkbox" ${filters.excludeGrassrootsMismatch ? 'checked' : ''}/>排除基层经历不符合</label><label><input name="excludeSpecialReview" type="checkbox" ${filters.excludeSpecialReview ? 'checked' : ''}/>排除特殊条件待核验</label><label><input name="onlyRecruitAtLeastTwo" type="checkbox" ${filters.onlyRecruitAtLeastTwo ? 'checked' : ''}/>只看招录 2 人及以上</label><label><input name="onlyWithCompleteRawFields" type="checkbox" ${filters.onlyWithCompleteRawFields ? 'checked' : ''}/>只看关键条件字段完整</label></div><p class="national-filter-definition">“关键条件字段完整”检查职位代码、职位名称、工作地点及专业、学历、学位、政治面貌、基层经历、服务基层项目、专业测试字段；部门电话和备注允许原表为空。</p>${filters.excludeNeedsReview || filters.excludeSpecialReview ? `<p class="national-exclusion-count" role="status">${hasProfile ? `可能隐藏 ${excludedReviewCount} 个待人工核验职位；请核对原表条件后再排除。` : '补充个人条件后才能计算可能隐藏的待人工核验职位数量。'}</p>` : ''}
    <div class="national-filter-footer"><label class="form-field national-sort"><span>排序方式</span><select name="sort"><option value="recruit-desc" ${filters.sort === 'recruit-desc' ? 'selected' : ''}>招录人数降序</option><option value="recruit-asc" ${filters.sort === 'recruit-asc' ? 'selected' : ''}>招录人数升序</option><option value="department" ${filters.sort === 'department' ? 'selected' : ''}>部门名称</option><option value="location" ${filters.sort === 'location' ? 'selected' : ''}>工作地点</option><option value="position-code" ${filters.sort === 'position-code' ? 'selected' : ''}>职位代码</option></select></label><button type="submit" class="button button-primary">应用筛选</button><button type="button" class="button button-secondary" data-action="national-export-filtered">导出当前结果 CSV</button></div></form>`;
}

function renderSavedFilters(workspace) {
  if (!workspace.savedFilters.length) return '';
  return `<section class="national-saved-filters"><strong>已保存的筛选</strong>${workspace.savedFilters.map((item) => `<div class="national-saved-filter"><button type="button" class="button button-quiet button-small" data-action="national-apply-saved-filter" data-filter-id="${escapeNationalHtml(item.id)}">${escapeNationalHtml(item.name)}</button><details><summary>重命名</summary><form class="national-rename-filter-form" data-form="national-rename-filter" data-filter-id="${escapeNationalHtml(item.id)}"><input name="name" value="${escapeNationalHtml(item.name)}" maxlength="80" required/><button type="submit" class="button button-secondary button-small">保存名称</button></form></details><button type="button" class="national-delete-filter" aria-label="删除 ${escapeNationalHtml(item.name)}" data-action="national-delete-saved-filter" data-filter-id="${escapeNationalHtml(item.id)}">×</button></div>`).join('')}</section>`;
}

function renderPositionsTab({ positions, filtered, counts, excludedReviewCount, regionCount, page, pageSize, workspace, profile, eligibilityCache }) {
  const start = (page - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const hasEligibilityProfile = hasNationalProfile(profile);
  const profileNote = hasEligibilityProfile ? '' : `<div class="notice notice-soft compact-notice national-profile-note"><span>ⓘ</span><p>填写最高学历和对应阶段的专业后，才能显示资格初步核对。资料不全不会被误判为不符合。</p><a href="#/profile">补充个人资料 →</a></div>`;
  const allColumns = TABLE_COLUMN_DEFS.filter(([key]) => key !== 'actions');
  const visibleColumnKeys = workspace.visibleColumns === null || workspace.visibleColumns === undefined
    ? NATIONAL_DEFAULT_VISIBLE_COLUMNS : workspace.visibleColumns;
  const columns = allColumns.filter(([key]) => visibleColumnKeys.includes(key));
  columns.push(['actions', '操作']);
  const countCards = `<section class="national-filter-counts" aria-label="筛选条件与资格阶段数量"><article><span>全部职位</span><strong>${positions.length.toLocaleString('zh-CN')}</strong></article><article><span>地区内</span><strong>${regionCount.toLocaleString('zh-CN')}</strong></article>${counts ? `<article><span>专业初步匹配</span><strong>${counts.majorMatches.toLocaleString('zh-CN')}</strong></article><article><span>初步符合</span><strong>${counts.initialMatch.toLocaleString('zh-CN')}</strong></article><article><span>需要人工核验</span><strong>${counts.needsReview.toLocaleString('zh-CN')}</strong></article><article><span>明确不符合</span><strong>${counts.incompatible.toLocaleString('zh-CN')}</strong></article><article><span>资料不完整</span><strong>${counts.incomplete.toLocaleString('zh-CN')}</strong></article>` : `<article><span>资格阶段</span><strong>填写个人条件后显示</strong></article>`}</section>${counts ? '<p class="national-counts-note">资格阶段数量按其他筛选条件统计，未应用资格状态排除开关。</p>' : ''}`;
  const resultList = visible.length ? `<div class="national-position-table-scroll"><table class="national-position-table"><thead><tr>${columns.map(([, label]) => `<th scope="col">${escapeNationalHtml(label)}</th>`).join('')}</tr></thead><tbody>${visible.map((position) => renderPositionTableRows(position, workspace, profile, columns, eligibilityCache)).join('')}</tbody></table></div>`
    : `<div class="empty-state">没有符合条件的职位。可尝试清除地点筛选、放宽学历或包含待人工核验职位。<div><button type="button" class="button button-secondary" data-action="national-clear-filters">重置筛选</button></div></div>`;
  return `<div class="national-results-layout"><aside class="national-filters-column"><details id="national-filter-drawer" class="national-filter-drawer" open><summary class="national-filter-drawer-toggle">筛选条件</summary><div class="national-filter-drawer-content">${renderFilters(positions, workspace.filters, excludedReviewCount, hasEligibilityProfile)}<form id="national-save-filter-form" class="national-save-filter"><label class="form-field"><span>筛选方案名称</span><input name="name" maxlength="80" placeholder="例如：湖北本科岗位" required/></label><button type="submit" class="button button-secondary button-small">保存当前筛选</button></form>${renderSavedFilters(workspace)}</div></details></aside><section class="national-results-column">${profileNote}<div class="national-results-summary"><div><strong>${filtered.length.toLocaleString('zh-CN')}</strong><span> / ${positions.length.toLocaleString('zh-CN')} 个职位符合条件</span><small>当前位置 ${filtered.length ? start + 1 : 0}–${Math.min(start + pageSize, filtered.length)} · 资格判断仅供初步核对</small></div><button type="button" class="button button-quiet button-small" data-action="national-export-filtered">导出 CSV</button></div>${countCards}${renderActiveFilters(workspace.filters)}${renderTableColumnSettings(workspace.visibleColumns === null || workspace.visibleColumns === undefined ? NATIONAL_DEFAULT_VISIBLE_COLUMNS : workspace.visibleColumns)}${resultList}<div class="national-pagination"><button type="button" class="button button-secondary button-small" data-action="national-page" data-page="${Math.max(1, page - 1)}" ${page <= 1 ? 'disabled' : ''}>上一页</button><span>第 ${page} / ${pageCount} 页</span><button type="button" class="button button-secondary button-small" data-action="national-page" data-page="${Math.min(pageCount, page + 1)}" ${page >= pageCount ? 'disabled' : ''}>下一页</button></div></section></div>`;
}

function renderOverviewTab(metadata, positions, filteredCount, workspace) {
  const provinceCount = Object.keys(metadata?.provinceCounts || {}).length;
  const rows = Object.entries(metadata?.sheetCounts || {}).map(([name, count]) => `<tr><th>${escapeNationalHtml(name)}</th><td>${Number(count).toLocaleString('zh-CN')}</td></tr>`).join('');
  return `<section class="national-overview"><div class="national-metric-grid"><article><span>职位数</span><strong>${Number(metadata?.positionCount || positions.length).toLocaleString('zh-CN')}</strong></article><article><span>计划招录</span><strong>${Number(metadata?.recruitCountTotal || 0).toLocaleString('zh-CN')}</strong></article><article><span>当前筛选结果</span><strong>${filteredCount.toLocaleString('zh-CN')}</strong></article><article><span>我的收藏</span><strong>${workspace.favorites.length}</strong></article><article><span>比较清单</span><strong>${workspace.comparisons.length} / 6</strong></article><article><span>工作省级地区</span><strong>${provinceCount}</strong></article></div><div class="national-overview-actions"><a class="button button-primary" href="#/national?tab=positions">开始筛选</a><a class="button button-secondary" href="#/profile">根据个人资料匹配</a><a class="button button-secondary" href="#/national?tab=favorites">查看收藏</a><a class="button button-secondary" href="#/national?tab=comparison">岗位对比</a></div><section class="panel"><div class="panel-heading"><div><div class="eyebrow muted">SOURCE SHEETS</div><h2>来源工作表行数</h2></div></div><div class="table-scroll"><table class="data-table"><tbody>${rows}<tr><th>总计</th><td>${Number(metadata?.positionCount || positions.length).toLocaleString('zh-CN')}</td></tr></tbody></table></div></section><section class="notice notice-soft"><span>ⓘ</span><p>数据来自用户提供的 2027 年职位表副本。官方专题公告披露招录规模约 3.57 万人；本表逐岗合计 35,691 人。当前环境未能连接官方附件，因此未做附件字节校验。专业、备注、应届与服务基层规则中有大量无法可靠自动解析的文本，系统会保留原文并提示人工复核。</p></section><p class="national-source-link"><a href="https://bm.scs.gov.cn/kl2027" target="_blank" rel="noreferrer">打开国家公务员局 2027 专题网站 ↗</a></p></section>`;
}

function renderFavoritesTab({ positions, workspace, profile }) {
  const byId = new Map(positions.map((position) => [position.id, position]));
  const query = String(workspace.favoriteQuery || '').trim().toLocaleLowerCase('zh-CN');
  const favorites = workspace.favorites.filter((favorite) => workspace.favoritePriority === 'all' || favorite.priority === workspace.favoritePriority);
  const items = favorites.map((favorite) => byId.get(favorite.positionId)).filter(Boolean).filter((position) => {
    if (!query) return true;
    const favorite = workspace.favorites.find((item) => item.positionId === position.id);
    return `${position.searchText || ''} ${workspace.notes[position.id] || ''} ${favorite?.note || ''}`.toLocaleLowerCase('zh-CN').includes(query);
  });
  return `<section class="national-favorites"><form id="national-favorite-search-form" class="national-favorite-search"><label class="form-field"><span>搜索收藏职位</span><input name="query" value="${escapeNationalHtml(workspace.favoriteQuery || '')}" placeholder="部门、职位、地区或个人备注"/></label><label class="form-field"><span>优先级</span><select name="priority"><option value="all">全部优先级</option><option value="high" ${workspace.favoritePriority === 'high' ? 'selected' : ''}>重点关注</option><option value="normal" ${workspace.favoritePriority === 'normal' ? 'selected' : ''}>普通备选</option><option value="watch" ${workspace.favoritePriority === 'watch' ? 'selected' : ''}>暂时观察</option></select></label><button type="submit" class="button button-secondary">筛选收藏</button></form><div class="national-results-summary"><div><strong>${items.length}</strong><span> / ${workspace.favorites.length} 个收藏职位</span></div><button type="button" class="button button-secondary" data-action="national-export-favorites">导出收藏 CSV</button></div>${items.length ? items.map((position) => renderPositionCard(position, workspace, profile)).join('') : '<div class="empty-state">没有匹配的收藏职位。可清除搜索词或调整优先级筛选。</div>'}</section>`;
}

function renderComparisonTab({ positions, workspace, profile }) {
  const byId = new Map(positions.map((position) => [position.id, position]));
  const items = workspace.comparisons.map((id) => byId.get(id)).filter(Boolean);
  const rows = [
    ['职位名称', 'positionTitle'], ['部门', 'departmentName'], ['用人司局', 'organizationName'],
    ['工作地点', 'workLocation'], ['落户地点', 'settlementLocation'], ['职位代码', 'positionCode'], ['招录人数', 'recruitCount'], ['专业原文', 'majorRaw'],
    ['学历', 'educationRaw'], ['学位', 'degreeRaw'], ['政治面貌', 'politicalStatusRaw'],
    ['基层工作年限', 'experienceRaw'], ['服务基层项目', 'serviceProjectRaw'], ['职位简介', 'positionDescription'], ['考试类别', 'examCategory'],
    ['面试专业测试', 'professionalTestRaw'], ['面试人员比例', 'interviewRatioRaw'], ['备注', 'remarkRaw'], ['资格初步核对', 'eligibility'],
  ];
  const tableRows = workspace.comparisonOnlyDifferences ? rows.filter(([, key]) => {
    const values = items.map((position) => key === 'eligibility' ? evaluateNationalEligibility(position, profile).label : String(position[key] ?? ''));
    return new Set(values).size > 1;
  }) : rows;
  return `<section class="national-comparison"><div class="national-results-summary"><div><strong>${items.length}</strong><span> / 6 个职位</span><small>逐项对照职位表原文；报名数和竞争比暂未填入。</small></div><div class="national-comparison-actions"><button type="button" class="button button-quiet" data-action="national-toggle-difference-only">${workspace.comparisonOnlyDifferences ? '显示全部项目' : '只看差异项'}</button><button type="button" class="button button-secondary" data-action="national-clear-comparison" ${items.length ? '' : 'disabled'}>清空比较</button><button type="button" class="button button-secondary" data-action="national-export-comparison" ${items.length ? '' : 'disabled'}>导出比较 CSV</button></div></div>${items.length ? `<div class="national-compare-scroll"><table class="national-compare-table"><thead><tr><th>比较项目</th>${items.map((position, index) => `<th>${escapeNationalHtml(position.positionTitle)}<small>${escapeNationalHtml(position.departmentName)}</small><span class="national-compare-reorder"><button type="button" aria-label="上移岗位" data-action="national-move-compare" data-position-id="${escapeNationalHtml(position.id)}" data-direction="-1" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" aria-label="下移岗位" data-action="national-move-compare" data-position-id="${escapeNationalHtml(position.id)}" data-direction="1" ${index === items.length - 1 ? 'disabled' : ''}>↓</button></span><button type="button" data-action="national-toggle-compare" data-position-id="${escapeNationalHtml(position.id)}">移出比较</button></th>`).join('')}</tr></thead><tbody>${tableRows.map(([label, key]) => {
    const values = items.map((position) => key === 'eligibility' ? evaluateNationalEligibility(position, profile).label : String(position[key] ?? ''));
    const different = new Set(values).size > 1;
    return `<tr class="${different ? 'has-difference' : ''}"><th>${label}</th>${values.map((value) => `<td>${value ? escapeNationalHtml(value) : '<span class="national-empty-value">原表为空</span>'}</td>`).join('')}</tr>`;
  }).join('')}</tbody></table></div>` : '<div class="empty-state">加入 2–6 个职位后，可以在此并排核对核心条件。</div>'}</section>`;
}

export function renderNationalWorkspace({ positions = [], metadata = {}, profile = {}, workspace, tab = 'positions' }) {
  const state = workspace || { filters: {}, savedFilters: [], favorites: [], comparisons: [], notes: {} };
  const filters = state.filters || {};
  const eligibilityCache = new Map();
  const filtered = filterNationalPositions(positions, filters, profile, eligibilityCache);
  const qualificationFilters = {
    ...filters, qualificationStatuses: [], onlyInitialMatch: false, excludeNeedsReview: false,
    excludeExplicitMismatch: false, excludeMajorMismatch: false, excludeEducationMismatch: false,
    excludePoliticalMismatch: false, excludeGrassrootsMismatch: false, excludeSpecialReview: false,
  };
  const qualificationRows = hasNationalProfile(profile)
    ? filterNationalPositions(positions, qualificationFilters, profile, eligibilityCache) : [];
  const counts = hasNationalProfile(profile) ? { initialMatch: 0, incompatible: 0, needsReview: 0, incomplete: 0, majorMatches: 0 } : null;
  if (counts) {
    for (const position of qualificationRows) {
      const result = eligibilityCache.get(position) || getEligibility(position, profile, eligibilityCache);
      counts[result.status] += 1;
      if (result.checks.major.status === 'match') counts.majorMatches += 1;
    }
  }
  const excludedReviewCount = qualificationRows.filter((position) => {
    const result = eligibilityCache.get(position) || getEligibility(position, profile, eligibilityCache);
    return result.status === 'needsReview' || (result.checks.specialRequirements.status === 'review' || result.checks.specialRequirements.status === 'missing');
  }).length;
  const regionFilters = {
    workProvinces: filters.workProvinces || [], workCities: filters.workCities || [], workDistricts: filters.workDistricts || [],
  };
  const regionCount = filterNationalPositions(positions, regionFilters).length;
  const sort = filters.sort || 'recruit-desc';
  const sorted = sortNationalPositions(filtered, sort);
  const currentTab = ['positions', 'overview', 'favorites', 'comparison'].includes(tab) ? tab : 'positions';
  const content = currentTab === 'overview' ? renderOverviewTab(metadata, positions, filtered.length, state)
    : currentTab === 'favorites' ? renderFavoritesTab({ positions, workspace: state, profile })
      : currentTab === 'comparison' ? renderComparisonTab({ positions, workspace: state, profile })
      : renderPositionsTab({ positions, filtered: sorted, counts, excludedReviewCount, regionCount, page: Math.max(1, Number(filters.page) || 1), pageSize: 30, workspace: state, profile, eligibilityCache });
  return `<div class="page-body national-page"><div class="page-heading-row"><div><div class="eyebrow muted">NATIONAL CIVIL SERVICE EXAM · 2027</div><h1>2027 国考职位筛选</h1><p>19,426 个职位 · 计划招录 35,691 人 · 原始字段可逐条核对 · 选择结果仅作初步参考</p></div><a class="button button-secondary" href="#/profile">完善个人报考资料</a></div>${renderTabs(currentTab, state)}${content}</div>`;
}
