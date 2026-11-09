import { evaluateBeijingEligibility, getBeijingMajorCatalogPath, hasBeijingEligibilityProfile } from './eligibility.js';
import { filterBeijingPositions, sortBeijingPositions } from './filters.js';

function escapeBeijingHtml(value) {
  return String(value ?? '').replace(/[&<>"']/gu, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function beijingBadge(text, kind = '') {
  return `<span class="national-badge ${kind ? `is-${kind}` : ''}">${escapeBeijingHtml(text)}</span>`;
}

function beijingInput(name, label, value, placeholder = '', type = 'text') {
  return `<label class="form-field national-filter-field"><span>${escapeBeijingHtml(label)}</span><input name="${name}" type="${type}" value="${escapeBeijingHtml(value)}" placeholder="${escapeBeijingHtml(placeholder)}"/></label>`;
}

function beijingSelect(name, label, value, choices, allLabel = '不限') {
  const options = choices.map((item) => {
    const optionValue = typeof item === 'string' ? item : item.value;
    const optionLabel = typeof item === 'string' ? item : item.label;
    return `<option value="${escapeBeijingHtml(optionValue)}" ${String(value ?? '') === String(optionValue) ? 'selected' : ''}>${escapeBeijingHtml(optionLabel)}</option>`;
  }).join('');
  return `<label class="form-field national-filter-field"><span>${escapeBeijingHtml(label)}</span><select name="${name}"><option value="">${escapeBeijingHtml(allLabel)}</option>${options}</select></label>`;
}

function beijingProfileSelect(name, label, value, choices) {
  const options = choices.map((item) => `<option value="${escapeBeijingHtml(item)}" ${value === item ? 'selected' : ''}>${escapeBeijingHtml(item)}</option>`).join('');
  return `<label class="form-field"><span>${escapeBeijingHtml(label)}</span><select name="${name}"><option value="">待填写</option>${options}</select></label>`;
}

function beijingRawFields(position) {
  return Object.entries(position.rawFields || {}).map(([label, value]) => `<div class="national-raw-field"><dt>${escapeBeijingHtml(label)}</dt><dd>${value ? escapeBeijingHtml(value) : '<span class="national-empty-value">原表为空</span>'}</dd></div>`).join('');
}

const BEIJING_CHECK_LABELS = {
  major: '专业', education: '学历', degree: '学位', politicalStatus: '政治面貌', gender: '性别',
  ethnicity: '民族', graduation: '毕业身份', grassrootsExperience: '基层工作经历', age: '年龄',
  locality: '户籍 / 生源', targetedIdentity: '定向身份', specialRequirements: '备注 / 加试 / 其他条件',
};

function beijingPersonalCheckValue(key, profile) {
  const inferredDegree = /博士/u.test(profile.degree || '') ? '博士'
    : /硕士|研究生/u.test(profile.degree || '') ? '硕士'
      : /本科/u.test(profile.degree || '') ? '学士' : '';
  const values = {
    major: [profile.graduateMajor && `研究生：${[profile.graduateMajor, profile.graduateMajorCode].filter(Boolean).join(' · ')}`,
      profile.undergraduateMajor && `本科：${[profile.undergraduateMajor, profile.undergraduateMajorCode].filter(Boolean).join(' · ')}`]
      .filter(Boolean).join('；'),
    education: profile.degree,
    degree: inferredDegree,
    politicalStatus: profile.politicalStatus,
    gender: profile.gender,
    ethnicity: profile.ethnicity,
    graduation: profile.graduationStatus,
    grassrootsExperience: profile.grassrootsYears === '' ? '' : `${profile.grassrootsYears} 年`,
    age: profile.age ? `${profile.age} 周岁` : '',
    locality: [profile.hukou, profile.studentOrigin].filter(Boolean).join(' · '),
    targetedIdentity: [profile.retiredUniversityStudentSoldier && `退役大学生士兵：${profile.retiredUniversityStudentSoldier}`,
      profile.serviceProjectStatus && `服务基层项目：${profile.serviceProjectStatus}`,
      profile.disabilityStatus && `残疾人身份：${profile.disabilityStatus}`].filter(Boolean).join(' · '),
    specialRequirements: [profile.hukou, profile.studentOrigin, profile.credentials,
      profile.acceptPhysicalTest, profile.acceptPsychologicalTest, profile.acceptProfessionalTest,
      profile.acceptServiceDuration, profile.highestDegreeNoResit, profile.freshGraduateNoEmployment].filter(Boolean).join(' · '),
  };
  return values[key] || '';
}

function beijingRequirementValue(key, position) {
  const values = {
    major: position.majorRaw,
    education: position.educationRaw,
    degree: position.degreeRaw,
    politicalStatus: position.politicalStatusRaw || position.specialRequirementRaw,
    gender: position.specialRequirementRaw || '原表未见明确性别限制',
    ethnicity: position.ethnicityRaw || position.specialRequirementRaw,
    graduation: position.existingIdentityRaw,
    grassrootsExperience: position.grassrootsRequirementRaw,
    age: position.ageRaw,
    locality: position.specialRequirementRaw || position.remarkRaw || '原表未见户籍 / 生源限制',
    targetedIdentity: position.sourceSheet,
    specialRequirements: [position.otherConditionsRaw, position.remarkRaw,
      position.psychologicalTestRaw && `心理测试：${position.psychologicalTestRaw}`,
      position.physicalTestRaw && `体能测评：${position.physicalTestRaw}`,
      position.professionalTestRaw && `专业能力测试：${position.professionalTestRaw}`]
      .filter(Boolean).join('；') || '原表未注明',
  };
  return values[key] || '';
}

function beijingEligibilityPanel(position, profile, majorCatalog, result) {
  const checks = Object.entries(result.checks).map(([key, item]) => {
    const kind = item.status === 'match' ? 'initialMatch' : item.status === 'mismatch' ? 'incompatible'
      : item.status === 'missing' ? 'incomplete' : 'needsReview';
    return `<li>${beijingBadge(item.status === 'match' ? '符合' : item.status === 'mismatch' ? '不符合' : item.status === 'missing' ? '待补资料' : '待核验', kind)}<div><strong>${escapeBeijingHtml(BEIJING_CHECK_LABELS[key] || key)}</strong><small>职位要求：${escapeBeijingHtml(beijingRequirementValue(key, position) || '原表为空')}</small><small>个人资料：${escapeBeijingHtml(beijingPersonalCheckValue(key, profile) || '未填写')}</small><span>判断依据：${escapeBeijingHtml(item.reason)}</span></div></li>`;
  }).join('');
  const path = getBeijingMajorCatalogPath(profile, majorCatalog);
  return `<section class="national-eligibility"><h4>逐项资格初核 · ${escapeBeijingHtml(result.label)}</h4>${path.length ? `<p>专业目录路径：${escapeBeijingHtml([profile.degree, ...path].join(' → '))}</p>` : ''}<ul>${checks}</ul><p>按北京报考指南使用最高学历核对学历与专业；学位按最高学历推定。未明确写入岗位条件的毕业年份和证书名称不单独触发待核验。</p></section>`;
}

function beijingPositionDetails(position, workspace, profile, majorCatalog, eligibility) {
  const favorite = workspace.favorites.find((item) => item.positionId === position.id);
  const note = favorite?.note || workspace.notes[position.id] || '';
  return `<details class="national-position-details"><summary>查看资格初核与职位表原文</summary>${beijingEligibilityPanel(position, profile, majorCatalog, eligibility)}<dl class="national-raw-grid">${beijingRawFields(position)}</dl><form class="national-note-form" data-form="beijing-note" data-position-id="${escapeBeijingHtml(position.id)}"><label class="form-field"><span>个人备注</span><textarea name="note" rows="2" maxlength="2000" placeholder="例如：向招录机关核对专业口径或应届身份">${escapeBeijingHtml(note)}</textarea></label><label class="form-field"><span>优先级</span><select name="priority"><option value="normal" ${favorite?.priority !== 'high' && favorite?.priority !== 'watch' ? 'selected' : ''}>普通</option><option value="high" ${favorite?.priority === 'high' ? 'selected' : ''}>优先核对</option><option value="watch" ${favorite?.priority === 'watch' ? 'selected' : ''}>继续关注</option></select></label><button type="submit" class="button button-secondary button-small">保存备注</button></form></details>`;
}

function beijingPositionCard(position, workspace, profile, majorCatalog, eligibilityCache) {
  const eligibility = eligibilityCache.get(position) || evaluateBeijingEligibility(position, profile, majorCatalog);
  const favorite = workspace.favorites.find((item) => item.positionId === position.id);
  const compared = workspace.comparisons.includes(position.id);
  const kind = eligibility.status === 'initialMatch' ? 'initialMatch' : eligibility.status === 'incompatible'
    ? 'incompatible' : eligibility.status === 'incomplete' ? 'incomplete' : 'needsReview';
  return `<article class="national-position-card" data-position-id="${escapeBeijingHtml(position.id)}"><div class="national-position-head"><div><div class="national-kicker">${escapeBeijingHtml(position.sourceSheet)} · ${escapeBeijingHtml(position.positionCode)}</div><h3>${escapeBeijingHtml(position.positionTitle)}</h3><p>${escapeBeijingHtml(position.departmentName)} · ${escapeBeijingHtml(position.hiringDepartment || '')}</p></div>${beijingBadge(eligibility.label, kind)}</div><div class="national-position-meta"><span>机构性质：${escapeBeijingHtml(position.positionAttribute || '原表为空')}</span><span>职位类别：${escapeBeijingHtml(position.positionType || '原表为空')}</span><span>职位层级：${escapeBeijingHtml(position.positionSubType || '原表为空')}</span><span>招录人数：${escapeBeijingHtml(position.recruitCount ?? '原表为空')}</span><span>学历：${escapeBeijingHtml(position.educationRaw || '原表为空')}</span><span>政治面貌：${escapeBeijingHtml(position.politicalStatusRaw || '原表为空')}</span></div><div class="national-position-actions"><button type="button" class="button button-secondary button-small" data-action="beijing-toggle-favorite" data-position-id="${escapeBeijingHtml(position.id)}">${favorite ? '★ 已收藏' : '☆ 收藏'}</button><button type="button" class="button button-quiet button-small" data-action="beijing-toggle-compare" data-position-id="${escapeBeijingHtml(position.id)}">${compared ? '✓ 已加入比较' : '＋ 加入比较'}</button><button type="button" class="button button-quiet button-small" data-action="beijing-copy-position" data-position-id="${escapeBeijingHtml(position.id)}">复制原文</button></div>${beijingPositionDetails(position, workspace, profile, majorCatalog, eligibility)}</article>`;
}

function beijingOptions(positions, key) {
  return [...new Set(positions.map((position) => position[key]).filter(Boolean))].sort((left, right) => left.localeCompare(right, 'zh-CN'));
}

function beijingFilterForm(positions, filters) {
  const statusChoices = [
    { value: 'initialMatch', label: '初步符合' }, { value: 'incompatible', label: '明确不符合' },
    { value: 'needsReview', label: '需要人工核验' }, { value: 'incomplete', label: '资料不完整' },
  ];
  return `<form id="beijing-filter-form" class="national-filter-panel"><div class="national-filter-heading"><div><div class="eyebrow muted">BEIJING CIVIL SERVICE EXAM · 2027</div><h2>筛选北京市考职位</h2><p>任一条件命中当前字段即可；资格初核按职位表原文和北京报考指南做初步比对。</p></div><button type="button" class="button button-quiet button-small" data-action="beijing-clear-filters">清除条件</button></div><div class="national-filter-grid">${beijingInput('keyword', '关键词', filters.keyword || '', '单位、部门、职位、专业或代码')}${beijingSelect('sourceSheet', '职位表类别', filters.sourceSheet, beijingOptions(positions, 'sourceSheet'))}${beijingSelect('workDistrict', '单位名识别区县', filters.workDistrict, beijingOptions(positions, 'workDistrict'))}${beijingSelect('positionAttribute', '机构性质', filters.positionAttribute, beijingOptions(positions, 'positionAttribute'))}${beijingSelect('positionType', '职位类别', filters.positionType, beijingOptions(positions, 'positionType'))}${beijingSelect('positionSubType', '职位层级', filters.positionSubType, beijingOptions(positions, 'positionSubType'))}${beijingSelect('educationRaw', '学历要求', filters.educationRaw, beijingOptions(positions, 'educationRaw'))}${beijingSelect('politicalStatusRaw', '政治面貌', filters.politicalStatusRaw, beijingOptions(positions, 'politicalStatusRaw'))}${beijingSelect('existingIdentityRaw', '基层经历 / 应届要求', filters.existingIdentityRaw, beijingOptions(positions, 'existingIdentityRaw'))}${beijingSelect('qualificationStatus', '资格初核', filters.qualificationStatus, statusChoices)}${beijingInput('minRecruitCount', '最少招录人数', filters.minRecruitCount || '', '例如 2', 'number')}<label class="form-field national-filter-field"><span>排序方式</span><select name="sort"><option value="recruit-desc" ${filters.sort !== 'recruit-asc' && filters.sort !== 'department' && filters.sort !== 'position-code' ? 'selected' : ''}>招录人数降序</option><option value="recruit-asc" ${filters.sort === 'recruit-asc' ? 'selected' : ''}>招录人数升序</option><option value="department" ${filters.sort === 'department' ? 'selected' : ''}>招录单位</option><option value="position-code" ${filters.sort === 'position-code' ? 'selected' : ''}>职位代码</option></select></label></div><div class="national-filter-toggles"><label><input type="checkbox" name="excludeExplicitMismatch" ${filters.excludeExplicitMismatch !== false ? 'checked' : ''}/><span>排除明确不符合岗位</span></label><label><input type="checkbox" name="onlyMajorMatch" ${filters.onlyMajorMatch ? 'checked' : ''}/><span>只看专业初核匹配岗位</span></label></div><p class="national-filter-definition">职位表没有独立工作地址字段；“单位名识别区县”仅按单位名称提取，不代表实际工作地点。</p><div class="national-filter-footer"><button type="submit" class="button button-primary">应用筛选</button><button type="button" class="button button-secondary" data-action="beijing-export-filtered">导出当前结果 CSV</button></div></form>`;
}

function beijingSavedFilters(workspace) {
  return `<section class="national-saved-filters"><strong>已保存的筛选</strong>${workspace.savedFilters.length ? workspace.savedFilters.map((item) => `<div class="national-saved-filter"><button type="button" class="button button-quiet button-small" data-action="beijing-apply-saved-filter" data-filter-id="${escapeBeijingHtml(item.id)}">${escapeBeijingHtml(item.name)}</button><button type="button" class="national-delete-filter" aria-label="删除 ${escapeBeijingHtml(item.name)}" data-action="beijing-delete-saved-filter" data-filter-id="${escapeBeijingHtml(item.id)}">×</button></div>`).join('') : '<span class="muted">暂无已保存方案</span>'}<form id="beijing-save-filter-form" class="national-save-filter"><label class="form-field"><span>保存当前筛选</span><input name="name" maxlength="80" placeholder="例如：省直应届岗位" required/></label><button type="submit" class="button button-secondary button-small">保存方案</button></form></section>`;
}

function beijingPositionList({ positions, page, pageSize, workspace, profile, majorCatalog, eligibilityCache }) {
  const pageCount = Math.max(1, Math.ceil(positions.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const start = (currentPage - 1) * pageSize;
  const items = positions.slice(start, start + pageSize);
  const cards = items.map((position) => beijingPositionCard(position, workspace, profile, majorCatalog, eligibilityCache)).join('');
  return `${items.length ? `<div class="national-position-list">${cards}</div>` : '<div class="empty-state">没有符合当前筛选条件的职位，请调整关键词或筛选项。</div>'}<div class="national-pagination"><button type="button" class="button button-secondary button-small" data-action="beijing-page" data-page="${Math.max(1, currentPage - 1)}" ${currentPage <= 1 ? 'disabled' : ''}>上一页</button><span>第 ${currentPage} / ${pageCount} 页</span><button type="button" class="button button-secondary button-small" data-action="beijing-page" data-page="${Math.min(pageCount, currentPage + 1)}" ${currentPage >= pageCount ? 'disabled' : ''}>下一页</button></div>`;
}

function beijingPositionsTab({ positions, filtered, counts, workspace, profile, majorCatalog, eligibilityCache }) {
  const countItems = counts ? [
    ['majorMatch', '专业初核匹配', counts.majorMatches, workspace.filters.onlyMajorMatch && !workspace.filters.qualificationStatus],
    ['initialMatch', '初步符合', counts.initialMatch, workspace.filters.qualificationStatus === 'initialMatch'],
    ['needsReview', '需人工核验', counts.needsReview, workspace.filters.qualificationStatus === 'needsReview'],
    ['incomplete', '资料不完整', counts.incomplete, workspace.filters.qualificationStatus === 'incomplete'],
    ['incompatible', '明确不符合', counts.incompatible, workspace.filters.qualificationStatus === 'incompatible'],
  ] : [];
  const countCards = counts ? `<div class="national-filter-counts">${countItems.map(([filter, label, count, active]) => `<button type="button" class="national-filter-count" data-action="beijing-filter-count" data-filter="${filter}" aria-pressed="${active ? 'true' : 'false'}" title="点击查看此类职位；再点一次清除快速筛选"><span>${label}</span><strong>${count.toLocaleString('zh-CN')}</strong></button>`).join('')}</div>` : '';
  const profileNote = hasBeijingEligibilityProfile(profile) ? '' : '<div class="notice notice-soft"><span>ⓘ</span><p>先填写本页的个人条件，职位卡片会按学历、专业目录、性别、政治面貌、应届身份和基层经历逐项初核。</p></div>';
  return `<div class="national-results-layout"><aside class="national-filters-column"><details class="national-filter-drawer" open><summary class="national-filter-drawer-toggle">职位筛选条件</summary><div class="national-filter-drawer-content">${beijingFilterForm(positions, workspace.filters)}${beijingSavedFilters(workspace)}</div></details></aside><section class="national-results-column">${profileNote}<div class="national-results-summary"><div><strong>${filtered.length.toLocaleString('zh-CN')}</strong><span> / ${positions.length.toLocaleString('zh-CN')} 个职位</span><small>单位区县按名称识别；职位表未提供工作地址。资格状态仅供初步核对。</small></div></div>${countCards}${beijingPositionList({ positions: filtered, page: workspace.filters.page || 1, pageSize: 30, workspace, profile, majorCatalog, eligibilityCache })}</section></div>`;
}

function beijingOverviewTab(metadata, filteredCount, counts) {
  const sheets = (metadata.sheets || []).map((sheet) => `<tr><th>${escapeBeijingHtml(sheet.name)}</th><td>${Number(sheet.positionCount || 0).toLocaleString('zh-CN')}</td><td>${Number(sheet.recruitCount || 0).toLocaleString('zh-CN')}</td></tr>`).join('');
  return `<section class="national-overview"><div class="national-metric-grid"><article><span>职位总数</span><strong>${Number(metadata.positionCount || 0).toLocaleString('zh-CN')}</strong></article><article><span>计划招录人数</span><strong>${Number(metadata.recruitCount || 0).toLocaleString('zh-CN')}</strong></article><article><span>当前匹配结果</span><strong>${filteredCount.toLocaleString('zh-CN')}</strong></article><article><span>专业初核匹配</span><strong>${Number(counts?.majorMatches || 0).toLocaleString('zh-CN')}</strong></article></div><section class="panel"><div class="panel-heading"><div><div class="eyebrow muted">SOURCE SHEETS</div><h2>岗位表工作表</h2></div></div><div class="table-scroll"><table class="data-table"><thead><tr><th>工作表</th><th>职位数</th><th>计划招录</th></tr></thead><tbody>${sheets}<tr><th>合计</th><td>${Number(metadata.positionCount || 0).toLocaleString('zh-CN')}</td><td>${Number(metadata.recruitCount || 0).toLocaleString('zh-CN')}</td></tr></tbody></table></div></section><section class="notice notice-soft"><span>ⓘ</span><p>职位字段来自“${escapeBeijingHtml(metadata.positionSource || '北京市考职位表')}”，专业层级来自“${escapeBeijingHtml(metadata.majorCatalogSource || '专业目录')}”。本表未提供报名人数或竞争比。单位区县${escapeBeijingHtml(metadata.workDistrictDerivation || '由单位名称识别')}；职位未提供实际工作地址。专业目录仅辅助显示个人专业路径，资格比对以职位表专业原文为准。应届身份按职位是否限应届核对，不额外要求毕业年份或学位证书名称。</p></section><button type="button" class="button button-primary" data-action="beijing-go-positions">开始筛选职位</button></section>`;
}

function beijingFavoritesTab({ positions, workspace, profile, majorCatalog, eligibilityCache }) {
  const byId = new Map(positions.map((position) => [position.id, position]));
  const query = String(workspace.favoriteQuery || '').trim().toLocaleLowerCase('zh-CN');
  const favorites = workspace.favorites.filter((favorite) => workspace.favoritePriority === 'all' || favorite.priority === workspace.favoritePriority);
  const items = favorites.map((favorite) => byId.get(favorite.positionId)).filter(Boolean).filter((position) => {
    const favorite = workspace.favorites.find((item) => item.positionId === position.id);
    return !query || `${position.searchText || ''} ${workspace.notes[position.id] || ''} ${favorite?.note || ''}`
      .toLocaleLowerCase('zh-CN').includes(query);
  });
  return `<section class="national-favorites"><form id="beijing-favorite-search-form" class="national-favorite-search"><label class="form-field"><span>搜索收藏职位</span><input name="query" value="${escapeBeijingHtml(workspace.favoriteQuery || '')}" placeholder="机关、职位、专业或个人备注"/></label><label class="form-field"><span>优先级</span><select name="priority"><option value="all">全部</option><option value="high" ${workspace.favoritePriority === 'high' ? 'selected' : ''}>优先核对</option><option value="normal" ${workspace.favoritePriority === 'normal' ? 'selected' : ''}>普通</option><option value="watch" ${workspace.favoritePriority === 'watch' ? 'selected' : ''}>继续关注</option></select></label><button type="submit" class="button button-secondary">筛选收藏</button></form><div class="national-results-summary"><div><strong>${items.length}</strong><span> / ${workspace.favorites.length} 个收藏职位</span></div><button type="button" class="button button-secondary" data-action="beijing-export-favorites">导出收藏 CSV</button></div>${items.length ? `<div class="national-position-list">${items.map((position) => beijingPositionCard(position, workspace, profile, majorCatalog, eligibilityCache)).join('')}</div>` : '<div class="empty-state">暂无匹配的收藏职位，可先到职位筛选页收藏岗位。</div>'}</section>`;
}

function beijingComparisonTab({ positions, workspace, profile, majorCatalog, eligibilityCache }) {
  const byId = new Map(positions.map((position) => [position.id, position]));
  const items = workspace.comparisons.map((id) => byId.get(id)).filter(Boolean);
  const rows = [
    ['招录机关', 'departmentName'], ['职位名称', 'positionTitle'], ['职位代码', 'positionCode'],
    ['用人部门', 'hiringDepartment'], ['单位名识别区县', 'workDistrict'],
    ['职位表类别', 'sourceSheet'], ['职位属性', 'positionAttribute'],
    ['职位类别', 'positionType'], ['职位层级', 'positionSubType'],
    ['计划招录', 'recruitCount'], ['学历要求', 'educationRaw'], ['学位要求', 'degreeRaw'],
    ['专业要求', 'majorRaw'], ['政治面貌', 'politicalStatusRaw'], ['现有身份要求', 'existingIdentityRaw'],
    ['年龄要求', 'ageRaw'], ['体能 / 心理 / 专业加试', 'tests'], ['备注', 'remarkRaw'], ['个人资格初核', 'eligibility'],
  ];
  const valueFor = (position, key) => {
    if (key === 'tests') return [`心理 ${position.psychologicalTestRaw || '未注明'}`, `体能 ${position.physicalTestRaw || '未注明'}`, `专业 ${position.professionalTestRaw || '未注明'}`].join(' / ');
    if (key === 'eligibility') return (eligibilityCache.get(position) || evaluateBeijingEligibility(position, profile, majorCatalog)).label;
    return String(position[key] ?? '');
  };
  const visibleRows = workspace.comparisonOnlyDifferences ? rows.filter(([, key]) => new Set(items.map((position) => valueFor(position, key))).size > 1) : rows;
  return `<section class="national-comparison"><div class="national-results-summary"><div><strong>${items.length}</strong><span> / 6 个职位</span><small>逐项比较职位表字段和个人资格初核。</small></div><div class="national-comparison-actions"><button type="button" class="button button-quiet" data-action="beijing-toggle-difference-only">${workspace.comparisonOnlyDifferences ? '显示全部字段' : '只看差异'}</button><button type="button" class="button button-secondary" data-action="beijing-clear-comparison" ${items.length ? '' : 'disabled'}>清空比较</button><button type="button" class="button button-secondary" data-action="beijing-export-comparison" ${items.length ? '' : 'disabled'}>导出 CSV</button></div></div>${items.length ? `<div class="national-compare-scroll"><table class="national-compare-table"><thead><tr><th>比较项目</th>${items.map((position, index) => `<th>${escapeBeijingHtml(position.positionTitle)}<small>${escapeBeijingHtml(position.departmentName)}</small><span class="national-compare-reorder"><button type="button" aria-label="上移职位" data-action="beijing-move-compare" data-position-id="${escapeBeijingHtml(position.id)}" data-direction="-1" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" aria-label="下移职位" data-action="beijing-move-compare" data-position-id="${escapeBeijingHtml(position.id)}" data-direction="1" ${index === items.length - 1 ? 'disabled' : ''}>↓</button></span><button type="button" data-action="beijing-toggle-compare" data-position-id="${escapeBeijingHtml(position.id)}">移出比较</button></th>`).join('')}</tr></thead><tbody>${visibleRows.map(([label, key]) => {
    const values = items.map((position) => valueFor(position, key));
    const different = new Set(values).size > 1;
    return `<tr class="${different ? 'has-difference' : ''}"><th>${escapeBeijingHtml(label)}</th>${values.map((value) => `<td>${value ? escapeBeijingHtml(value) : '<span class="national-empty-value">原表为空</span>'}</td>`).join('')}</tr>`;
  }).join('')}</tbody></table></div>` : '<div class="empty-state">加入职位后，可在这里并排核对专业、学历、招录人数和备注条件。</div>'}</section>`;
}

function beijingProfileForm(profile, majorCatalog) {
  const path = getBeijingMajorCatalogPath(profile, majorCatalog);
  const profileOpen = !hasBeijingEligibilityProfile(profile);
  return `<details class="national-column-settings beijing-profile" ${profileOpen ? 'open' : ''}><summary>我的报考条件${hasBeijingEligibilityProfile(profile) ? ' · 已填写' : ' · 请填写'}</summary><form id="beijing-profile-form" class="beijing-profile-form"><div class="beijing-profile-grid">
    ${beijingProfileSelect('degree', '最高学历', profile.degree, ['本科', '研究生', '硕士研究生', '博士研究生'])}
    ${beijingInput('graduateMajor', '研究生专业', profile.graduateMajor || '', '按专业目录名称填写')}
    ${beijingInput('graduateMajorCode', '研究生专业代码（选填）', profile.graduateMajorCode || '', '无代码可留空')}
    ${beijingInput('undergraduateMajor', '本科专业（选填）', profile.undergraduateMajor || '', '职位只列本科专业时用于人工参考')}
    ${beijingProfileSelect('gender', '性别', profile.gender, ['女性', '男性', '其他'])}
    ${beijingInput('ethnicity', '民族', profile.ethnicity || '', '如有明确民族限制才参与初筛')}
    ${beijingProfileSelect('politicalStatus', '政治面貌', profile.politicalStatus, ['共青团员', '中共党员', '群众', '其他'])}
    ${beijingProfileSelect('graduationStatus', '毕业身份', profile.graduationStatus, ['应届毕业生', '非应届', '其他'])}
    ${beijingInput('grassrootsYears', '基层工作经历年限', profile.grassrootsYears ?? '', '无基层工作经历填 0', 'number')}
    ${beijingInput('age', '年龄（周岁）', profile.age || '', '仅在职位有年龄要求时参与初筛', 'number')}
    ${beijingInput('hukou', '户籍', profile.hukou || '', '只在职位明确限制户籍时填写')}
    ${beijingInput('studentOrigin', '生源地（选填）', profile.studentOrigin || '', '生源地与户籍分别核对')}
    ${beijingProfileSelect('retiredUniversityStudentSoldier', '是否符合退役大学生士兵身份', profile.retiredUniversityStudentSoldier, ['是', '否', '待确认'])}
    ${beijingProfileSelect('serviceProjectStatus', '是否符合服务基层项目人员条件', profile.serviceProjectStatus, ['是', '否', '待确认'])}
    ${beijingProfileSelect('disabilityStatus', '是否符合残疾人职位身份条件', profile.disabilityStatus, ['是', '否', '待确认'])}
    ${beijingProfileSelect('disabilityType', '残疾类别', profile.disabilityType, ['听力', '肢体', '视力', '言语', '其他'])}
    ${beijingProfileSelect('disabilityLevel', '残疾等级', profile.disabilityLevel, ['一级', '二级', '三级', '四级'])}
    ${beijingProfileSelect('disabilityCertificate', '是否持有残疾人证', profile.disabilityCertificate, ['是', '否', '待确认'])}
    ${beijingProfileSelect('freshGraduateNoEmployment', '最高学历期间劳动关系 / 社保', profile.freshGraduateNoEmployment, ['有', '没有', '待确认'])}
    ${beijingProfileSelect('highestDegreeNoResit', '最高学历期间是否无重修 / 补考', profile.highestDegreeNoResit, ['是', '否', '待确认'])}
    ${beijingProfileSelect('policeSpecialtyGraduate', '是否公安院校公安专业2027届毕业生', profile.policeSpecialtyGraduate, ['是', '否', '待确认'])}
    ${beijingInput('credentials', '资格证书（选填）', profile.credentials || '', '填职位明示的证书或资格')}
    ${beijingProfileSelect('acceptPhysicalTest', '是否接受体能测评', profile.acceptPhysicalTest, ['接受', '不接受', '待确认'])}
    ${beijingProfileSelect('acceptPsychologicalTest', '是否接受心理测试', profile.acceptPsychologicalTest, ['接受', '不接受', '待确认'])}
    ${beijingProfileSelect('acceptProfessionalTest', '是否接受专业能力测试', profile.acceptProfessionalTest, ['接受', '不接受', '待确认'])}
    ${beijingProfileSelect('acceptServiceDuration', '是否接受职位最低服务年限', profile.acceptServiceDuration, ['接受', '不接受', '待确认'])}
  </div>${path.length ? `<p class="beijing-major-path">专业目录路径：${escapeBeijingHtml([profile.degree || '学历未填', ...path].join(' → '))}</p>` : ''}<div class="form-actions"><button type="submit" class="button button-primary">保存个人条件</button><span>按最高学历核对学历与专业；学位根据学历层级推定。无岗位明文要求时不要求填写毕业年份或学位证书名称。资料保存在本机加密档案。</span></div></form></details>`;
}
function beijingTabs(tab, workspace) {
  const tabs = [['positions', '职位筛选'], ['overview', '数据概览'], ['favorites', `我的收藏 ${workspace.favorites.length}`], ['comparison', `并排比较 ${workspace.comparisons.length}`]];
  return `<nav class="national-tabs" aria-label="北京市考职位工具">${tabs.map(([key, label]) => `<a class="national-tab ${tab === key ? 'is-active' : ''}" href="#/beijing?tab=${key}" ${tab === key ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`;
}

export function renderBeijingWorkspace({ positions = [], metadata = {}, profile = {}, majorCatalog = [], workspace, tab = 'positions' }) {
  const state = workspace || { filters: {}, savedFilters: [], favorites: [], comparisons: [], notes: {} };
  const eligibilityCache = new Map();
  const filtered = filterBeijingPositions(positions, state.filters, profile, majorCatalog, eligibilityCache);
  const counts = hasBeijingEligibilityProfile(profile)
    ? { initialMatch: 0, incompatible: 0, needsReview: 0, incomplete: 0, majorMatches: 0 } : null;
  if (counts) {
    for (const position of positions) {
      const result = eligibilityCache.get(position) || evaluateBeijingEligibility(position, profile, majorCatalog);
      eligibilityCache.set(position, result);
      counts[result.status] += 1;
      if (result.checks.major.status === 'match') counts.majorMatches += 1;
    }
  }
  const currentTab = ['positions', 'overview', 'favorites', 'comparison'].includes(tab) ? tab : 'positions';
  const content = currentTab === 'overview' ? beijingOverviewTab(metadata, filtered.length, counts)
    : currentTab === 'favorites' ? beijingFavoritesTab({ positions, workspace: state, profile, majorCatalog, eligibilityCache })
      : currentTab === 'comparison' ? beijingComparisonTab({ positions, workspace: state, profile, majorCatalog, eligibilityCache })
        : beijingPositionsTab({ positions, filtered: sortBeijingPositions(filtered, state.filters.sort), counts, workspace: state, profile, majorCatalog, eligibilityCache });
  return `<div class="page-body national-page beijing-page"><div class="page-heading-row"><div><div class="eyebrow muted">BEIJING CIVIL SERVICE EXAM · 2027</div><h1>2027 北京市考职位筛选</h1><p>${Number(metadata.positionCount || positions.length).toLocaleString('zh-CN')} 个职位 · 计划招录 ${Number(metadata.recruitCount || 0).toLocaleString('zh-CN')} 人 · 保留职位表原文与逐项资格初核</p></div><a class="button button-secondary" href="#/profile">查看个人资料</a></div>${beijingProfileForm(profile, majorCatalog)}${beijingTabs(currentTab, state)}${content}</div>`;
}
