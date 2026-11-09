import { evaluateZhejiangEligibility, getZhejiangMajorCatalogPath, hasZhejiangEligibilityProfile } from './eligibility.js';
import { filterZhejiangPositions, sortZhejiangPositions } from './filters.js';

function escapeZhejiangHtml(value) {
  return String(value ?? '').replace(/[&<>"']/gu, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function zhejiangBadge(text, kind = '') {
  return `<span class="national-badge ${kind ? `is-${kind}` : ''}">${escapeZhejiangHtml(text)}</span>`;
}

function zhejiangInput(name, label, value, placeholder = '', type = 'text') {
  return `<label class="form-field national-filter-field"><span>${escapeZhejiangHtml(label)}</span><input name="${name}" type="${type}" value="${escapeZhejiangHtml(value)}" placeholder="${escapeZhejiangHtml(placeholder)}"/></label>`;
}

function zhejiangSelect(name, label, value, choices, allLabel = '不限') {
  const options = choices.map((item) => {
    const optionValue = typeof item === 'string' ? item : item.value;
    const optionLabel = typeof item === 'string' ? item : item.label;
    return `<option value="${escapeZhejiangHtml(optionValue)}" ${String(value ?? '') === String(optionValue) ? 'selected' : ''}>${escapeZhejiangHtml(optionLabel)}</option>`;
  }).join('');
  return `<label class="form-field national-filter-field"><span>${escapeZhejiangHtml(label)}</span><select name="${name}"><option value="">${escapeZhejiangHtml(allLabel)}</option>${options}</select></label>`;
}

function zhejiangProfileSelect(name, label, value, choices) {
  const options = choices.map((item) => `<option value="${escapeZhejiangHtml(item)}" ${value === item ? 'selected' : ''}>${escapeZhejiangHtml(item)}</option>`).join('');
  return `<label class="form-field"><span>${escapeZhejiangHtml(label)}</span><select name="${name}"><option value="">待填写</option>${options}</select></label>`;
}

function zhejiangRawFields(position) {
  return Object.entries(position.rawFields || {}).map(([label, value]) => `<div class="national-raw-field"><dt>${escapeZhejiangHtml(label)}</dt><dd>${value ? escapeZhejiangHtml(value) : '<span class="national-empty-value">原表为空</span>'}</dd></div>`).join('');
}

const ZHEJIANG_CHECK_LABELS = {
  major: '专业', education: '学历', degree: '学位', politicalStatus: '政治面貌', gender: '性别',
  ethnicity: '民族', graduation: '毕业身份', grassrootsExperience: '基层工作经历', age: '年龄',
  specialRequirements: '备注 / 加试 / 其他条件',
};

function zhejiangPersonalCheckValue(key, profile) {
  const inferredDegree = profile.degreeTitle || (/博士/u.test(profile.degree || '') ? '博士'
    : /硕士|研究生/u.test(profile.degree || '') ? '硕士'
      : /本科/u.test(profile.degree || '') ? '学士' : '');
  const values = {
    major: [profile.graduateMajor, profile.graduateMajorCode].filter(Boolean).join(' · '),
    education: profile.degree,
    degree: inferredDegree,
    politicalStatus: profile.politicalStatus,
    gender: profile.gender,
    ethnicity: profile.ethnicity,
    graduation: profile.graduationStatus,
    grassrootsExperience: profile.grassrootsYears === '' ? '' : `${profile.grassrootsYears} 年`,
    age: profile.age ? `${profile.age} 周岁` : '',
    specialRequirements: [profile.hukou, profile.studentOrigin, profile.credentials,
      profile.acceptPhysicalTest, profile.acceptPsychologicalTest, profile.acceptProfessionalTest,
      profile.acceptServiceDuration, profile.grassrootsProjectStatus].filter(Boolean).join(' · '),
  };
  return values[key] || '';
}

function zhejiangRequirementValue(key, position) {
  const values = {
    major: position.majorRaw,
    education: position.educationRaw,
    degree: position.degreeRaw,
    politicalStatus: position.politicalStatusRaw,
    gender: position.remarkRaw || '原表未见单独性别字段',
    ethnicity: position.ethnicityRaw,
    graduation: position.existingIdentityRaw,
    grassrootsExperience: position.grassrootsRequirementRaw,
    age: position.ageRaw,
    specialRequirements: [position.psychologicalTestRaw && `心理测评：${position.psychologicalTestRaw}`,
      position.physicalTestRaw && `体能测评：${position.physicalTestRaw}`,
      position.professionalTestRaw && `专业加试：${position.professionalTestRaw}`, position.remarkRaw]
      .filter(Boolean).join('；') || '原表未注明',
  };
  return values[key] || '';
}

function zhejiangEligibilityPanel(position, profile, majorCatalog, result) {
  const checks = Object.entries(result.checks).map(([key, item]) => {
    const kind = item.status === 'match' ? 'initialMatch' : item.status === 'mismatch' ? 'incompatible'
      : item.status === 'missing' ? 'incomplete' : 'needsReview';
    return `<li>${zhejiangBadge(item.status === 'match' ? '符合' : item.status === 'mismatch' ? '不符合' : item.status === 'missing' ? '待补资料' : '待核验', kind)}<div><strong>${escapeZhejiangHtml(ZHEJIANG_CHECK_LABELS[key] || key)}</strong><small>职位要求：${escapeZhejiangHtml(zhejiangRequirementValue(key, position) || '原表为空')}</small><small>个人资料：${escapeZhejiangHtml(zhejiangPersonalCheckValue(key, profile) || '未填写')}</small><span>判断依据：${escapeZhejiangHtml(item.reason)}</span></div></li>`;
  }).join('');
  const path = getZhejiangMajorCatalogPath(profile, majorCatalog);
  return `<section class="national-eligibility"><h4>逐项资格初核 · ${escapeZhejiangHtml(result.label)}</h4>${path.length ? `<p>专业目录路径：${escapeZhejiangHtml([profile.degree, ...path].join(' → '))}</p>` : ''}<ul>${checks}</ul><p>系统按职位表原文做初步比对。年龄、应届口径、户籍、生源及备注条件仍以招录公告和招录机关答复为准。</p></section>`;
}

function zhejiangPositionDetails(position, workspace, profile, majorCatalog, eligibility) {
  const favorite = workspace.favorites.find((item) => item.positionId === position.id);
  const note = favorite?.note || workspace.notes[position.id] || '';
  return `<details class="national-position-details"><summary>查看资格初核与职位表原文</summary>${zhejiangEligibilityPanel(position, profile, majorCatalog, eligibility)}<dl class="national-raw-grid">${zhejiangRawFields(position)}</dl><form class="national-note-form" data-form="zhejiang-note" data-position-id="${escapeZhejiangHtml(position.id)}"><label class="form-field"><span>个人备注</span><textarea name="note" rows="2" maxlength="2000" placeholder="例如：向招录机关核对专业口径或应届身份">${escapeZhejiangHtml(note)}</textarea></label><label class="form-field"><span>优先级</span><select name="priority"><option value="normal" ${favorite?.priority !== 'high' && favorite?.priority !== 'watch' ? 'selected' : ''}>普通</option><option value="high" ${favorite?.priority === 'high' ? 'selected' : ''}>优先核对</option><option value="watch" ${favorite?.priority === 'watch' ? 'selected' : ''}>继续关注</option></select></label><button type="submit" class="button button-secondary button-small">保存备注</button></form></details>`;
}

function zhejiangPositionCard(position, workspace, profile, majorCatalog, eligibilityCache) {
  const eligibility = eligibilityCache.get(position) || evaluateZhejiangEligibility(position, profile, majorCatalog);
  const favorite = workspace.favorites.find((item) => item.positionId === position.id);
  const compared = workspace.comparisons.includes(position.id);
  const kind = eligibility.status === 'initialMatch' ? 'initialMatch' : eligibility.status === 'incompatible'
    ? 'incompatible' : eligibility.status === 'incomplete' ? 'incomplete' : 'needsReview';
  return `<article class="national-position-card" data-position-id="${escapeZhejiangHtml(position.id)}"><div class="national-position-head"><div><div class="national-kicker">${escapeZhejiangHtml(position.sourceSheet)} · ${escapeZhejiangHtml(position.positionCode)}</div><h3>${escapeZhejiangHtml(position.positionTitle)}</h3><p>${escapeZhejiangHtml(position.departmentName)}</p></div>${zhejiangBadge(eligibility.label, kind)}</div><div class="national-position-meta"><span>职位类别：${escapeZhejiangHtml(position.positionAttribute || '原表为空')}</span><span>招录人数：${escapeZhejiangHtml(position.recruitCount ?? '原表为空')}</span><span>学历：${escapeZhejiangHtml(position.educationRaw || '原表为空')}</span><span>政治面貌：${escapeZhejiangHtml(position.politicalStatusRaw || '原表为空')}</span></div><div class="national-position-actions"><button type="button" class="button button-secondary button-small" data-action="zhejiang-toggle-favorite" data-position-id="${escapeZhejiangHtml(position.id)}">${favorite ? '★ 已收藏' : '☆ 收藏'}</button><button type="button" class="button button-quiet button-small" data-action="zhejiang-toggle-compare" data-position-id="${escapeZhejiangHtml(position.id)}">${compared ? '✓ 已加入比较' : '＋ 加入比较'}</button><button type="button" class="button button-quiet button-small" data-action="zhejiang-copy-position" data-position-id="${escapeZhejiangHtml(position.id)}">复制原文</button></div>${zhejiangPositionDetails(position, workspace, profile, majorCatalog, eligibility)}</article>`;
}

function zhejiangOptions(positions, key) {
  return [...new Set(positions.map((position) => position[key]).filter(Boolean))].sort((left, right) => left.localeCompare(right, 'zh-CN'));
}

function zhejiangFilterForm(positions, filters) {
  const statusChoices = [
    { value: 'initialMatch', label: '初步符合' }, { value: 'incompatible', label: '明确不符合' },
    { value: 'needsReview', label: '需要人工核验' }, { value: 'incomplete', label: '资料不完整' },
  ];
  return `<form id="zhejiang-filter-form" class="national-filter-panel"><div class="national-filter-heading"><div><div class="eyebrow muted">ZHEJIANG CIVIL SERVICE EXAM · 2027</div><h2>筛选浙江省考职位</h2><p>任一条件命中当前字段即可；资格初核保留未提供条件的待补与待核状态。</p></div><button type="button" class="button button-quiet button-small" data-action="zhejiang-clear-filters">清除条件</button></div><div class="national-filter-grid">${zhejiangInput('keyword', '关键词', filters.keyword || '', '机关、职位、专业或代码')}${zhejiangSelect('sourceSheet', '职位表类别', filters.sourceSheet, zhejiangOptions(positions, 'sourceSheet'))}${zhejiangSelect('positionAttribute', '职位属性', filters.positionAttribute, zhejiangOptions(positions, 'positionAttribute'))}${zhejiangSelect('positionType', '职位大类', filters.positionType, zhejiangOptions(positions, 'positionType'))}${zhejiangSelect('educationRaw', '学历要求', filters.educationRaw, zhejiangOptions(positions, 'educationRaw'))}${zhejiangSelect('politicalStatusRaw', '政治面貌', filters.politicalStatusRaw, zhejiangOptions(positions, 'politicalStatusRaw'))}${zhejiangSelect('existingIdentityRaw', '身份 / 基层要求', filters.existingIdentityRaw, zhejiangOptions(positions, 'existingIdentityRaw'))}${zhejiangSelect('qualificationStatus', '资格初核', filters.qualificationStatus, statusChoices)}${zhejiangInput('minRecruitCount', '最少招录人数', filters.minRecruitCount || '', '例如 2', 'number')}<label class="form-field national-filter-field"><span>排序方式</span><select name="sort"><option value="recruit-desc" ${filters.sort !== 'recruit-asc' && filters.sort !== 'department' && filters.sort !== 'position-code' ? 'selected' : ''}>招录人数降序</option><option value="recruit-asc" ${filters.sort === 'recruit-asc' ? 'selected' : ''}>招录人数升序</option><option value="department" ${filters.sort === 'department' ? 'selected' : ''}>招录机关</option><option value="position-code" ${filters.sort === 'position-code' ? 'selected' : ''}>职位代码</option></select></label></div><div class="national-filter-toggles"><label><input type="checkbox" name="excludeExplicitMismatch" ${filters.excludeExplicitMismatch !== false ? 'checked' : ''}/><span>排除明确不符合岗位</span></label><label><input type="checkbox" name="onlyMajorMatch" ${filters.onlyMajorMatch ? 'checked' : ''}/><span>只看专业初核匹配岗位</span></label></div><div class="national-filter-footer"><button type="submit" class="button button-primary">应用筛选</button><button type="button" class="button button-secondary" data-action="zhejiang-export-filtered">导出当前结果 CSV</button></div></form>`;
}

function zhejiangSavedFilters(workspace) {
  return `<section class="national-saved-filters"><strong>已保存的筛选</strong>${workspace.savedFilters.length ? workspace.savedFilters.map((item) => `<div class="national-saved-filter"><button type="button" class="button button-quiet button-small" data-action="zhejiang-apply-saved-filter" data-filter-id="${escapeZhejiangHtml(item.id)}">${escapeZhejiangHtml(item.name)}</button><button type="button" class="national-delete-filter" aria-label="删除 ${escapeZhejiangHtml(item.name)}" data-action="zhejiang-delete-saved-filter" data-filter-id="${escapeZhejiangHtml(item.id)}">×</button></div>`).join('') : '<span class="muted">暂无已保存方案</span>'}<form id="zhejiang-save-filter-form" class="national-save-filter"><label class="form-field"><span>保存当前筛选</span><input name="name" maxlength="80" placeholder="例如：省直应届岗位" required/></label><button type="submit" class="button button-secondary button-small">保存方案</button></form></section>`;
}

function zhejiangPositionList({ positions, page, pageSize, workspace, profile, majorCatalog, eligibilityCache }) {
  const pageCount = Math.max(1, Math.ceil(positions.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const start = (currentPage - 1) * pageSize;
  const items = positions.slice(start, start + pageSize);
  const cards = items.map((position) => zhejiangPositionCard(position, workspace, profile, majorCatalog, eligibilityCache)).join('');
  return `${items.length ? `<div class="national-position-list">${cards}</div>` : '<div class="empty-state">没有符合当前筛选条件的职位，请调整关键词或筛选项。</div>'}<div class="national-pagination"><button type="button" class="button button-secondary button-small" data-action="zhejiang-page" data-page="${Math.max(1, currentPage - 1)}" ${currentPage <= 1 ? 'disabled' : ''}>上一页</button><span>第 ${currentPage} / ${pageCount} 页</span><button type="button" class="button button-secondary button-small" data-action="zhejiang-page" data-page="${Math.min(pageCount, currentPage + 1)}" ${currentPage >= pageCount ? 'disabled' : ''}>下一页</button></div>`;
}

function zhejiangPositionsTab({ positions, filtered, counts, workspace, profile, majorCatalog, eligibilityCache }) {
  const countCards = counts ? `<div class="national-filter-counts"><article><span>专业初核匹配</span><strong>${counts.majorMatches.toLocaleString('zh-CN')}</strong></article><article><span>初步符合</span><strong>${counts.initialMatch.toLocaleString('zh-CN')}</strong></article><article><span>需人工核验</span><strong>${counts.needsReview.toLocaleString('zh-CN')}</strong></article><article><span>资料不完整</span><strong>${counts.incomplete.toLocaleString('zh-CN')}</strong></article><article><span>明确不符合</span><strong>${counts.incompatible.toLocaleString('zh-CN')}</strong></article></div>` : '';
  const profileNote = hasZhejiangEligibilityProfile(profile) ? '' : '<div class="notice notice-soft"><span>ⓘ</span><p>先填写本页的个人条件，职位卡片会按学历、专业目录、性别、政治面貌、应届身份和基层经历逐项初核。</p></div>';
  return `<div class="national-results-layout"><aside class="national-filters-column"><details class="national-filter-drawer" open><summary class="national-filter-drawer-toggle">职位筛选条件</summary><div class="national-filter-drawer-content">${zhejiangFilterForm(positions, workspace.filters)}${zhejiangSavedFilters(workspace)}</div></details></aside><section class="national-results-column">${profileNote}<div class="national-results-summary"><div><strong>${filtered.length.toLocaleString('zh-CN')}</strong><span> / ${positions.length.toLocaleString('zh-CN')} 个职位</span><small>资格状态仅作初步核对；计划招录人数来自用户提供的职位表。</small></div></div>${countCards}${zhejiangPositionList({ positions: filtered, page: workspace.filters.page || 1, pageSize: 30, workspace, profile, majorCatalog, eligibilityCache })}</section></div>`;
}

function zhejiangOverviewTab(metadata, filteredCount, counts) {
  const sheets = (metadata.sheets || []).map((sheet) => `<tr><th>${escapeZhejiangHtml(sheet.name)}</th><td>${Number(sheet.positionCount || 0).toLocaleString('zh-CN')}</td><td>${Number(sheet.recruitCount || 0).toLocaleString('zh-CN')}</td></tr>`).join('');
  return `<section class="national-overview"><div class="national-metric-grid"><article><span>职位总数</span><strong>${Number(metadata.positionCount || 0).toLocaleString('zh-CN')}</strong></article><article><span>计划招录人数</span><strong>${Number(metadata.recruitCount || 0).toLocaleString('zh-CN')}</strong></article><article><span>当前匹配结果</span><strong>${filteredCount.toLocaleString('zh-CN')}</strong></article><article><span>专业初核匹配</span><strong>${Number(counts?.majorMatches || 0).toLocaleString('zh-CN')}</strong></article></div><section class="panel"><div class="panel-heading"><div><div class="eyebrow muted">SOURCE SHEETS</div><h2>岗位表工作表</h2></div></div><div class="table-scroll"><table class="data-table"><thead><tr><th>工作表</th><th>职位数</th><th>计划招录</th></tr></thead><tbody>${sheets}<tr><th>合计</th><td>${Number(metadata.positionCount || 0).toLocaleString('zh-CN')}</td><td>${Number(metadata.recruitCount || 0).toLocaleString('zh-CN')}</td></tr></tbody></table></div></section><section class="notice notice-soft"><span>ⓘ</span><p>职位字段来自“${escapeZhejiangHtml(metadata.positionSource || '浙江省考职位表')}”，专业层级来自“${escapeZhejiangHtml(metadata.majorCatalogSource || '专业目录')}”。本表未提供报名人数或竞争比；年龄、户籍、生源、备注及测评条件需结合官方公告核实。</p></section><button type="button" class="button button-primary" data-action="zhejiang-go-positions">开始筛选职位</button></section>`;
}

function zhejiangFavoritesTab({ positions, workspace, profile, majorCatalog, eligibilityCache }) {
  const byId = new Map(positions.map((position) => [position.id, position]));
  const query = String(workspace.favoriteQuery || '').trim().toLocaleLowerCase('zh-CN');
  const favorites = workspace.favorites.filter((favorite) => workspace.favoritePriority === 'all' || favorite.priority === workspace.favoritePriority);
  const items = favorites.map((favorite) => byId.get(favorite.positionId)).filter(Boolean).filter((position) => {
    const favorite = workspace.favorites.find((item) => item.positionId === position.id);
    return !query || `${position.searchText || ''} ${workspace.notes[position.id] || ''} ${favorite?.note || ''}`
      .toLocaleLowerCase('zh-CN').includes(query);
  });
  return `<section class="national-favorites"><form id="zhejiang-favorite-search-form" class="national-favorite-search"><label class="form-field"><span>搜索收藏职位</span><input name="query" value="${escapeZhejiangHtml(workspace.favoriteQuery || '')}" placeholder="机关、职位、专业或个人备注"/></label><label class="form-field"><span>优先级</span><select name="priority"><option value="all">全部</option><option value="high" ${workspace.favoritePriority === 'high' ? 'selected' : ''}>优先核对</option><option value="normal" ${workspace.favoritePriority === 'normal' ? 'selected' : ''}>普通</option><option value="watch" ${workspace.favoritePriority === 'watch' ? 'selected' : ''}>继续关注</option></select></label><button type="submit" class="button button-secondary">筛选收藏</button></form><div class="national-results-summary"><div><strong>${items.length}</strong><span> / ${workspace.favorites.length} 个收藏职位</span></div><button type="button" class="button button-secondary" data-action="zhejiang-export-favorites">导出收藏 CSV</button></div>${items.length ? `<div class="national-position-list">${items.map((position) => zhejiangPositionCard(position, workspace, profile, majorCatalog, eligibilityCache)).join('')}</div>` : '<div class="empty-state">暂无匹配的收藏职位，可先到职位筛选页收藏岗位。</div>'}</section>`;
}

function zhejiangComparisonTab({ positions, workspace, profile, majorCatalog, eligibilityCache }) {
  const byId = new Map(positions.map((position) => [position.id, position]));
  const items = workspace.comparisons.map((id) => byId.get(id)).filter(Boolean);
  const rows = [
    ['招录机关', 'departmentName'], ['职位名称', 'positionTitle'], ['职位代码', 'positionCode'],
    ['职位表类别', 'sourceSheet'], ['职位属性', 'positionAttribute'], ['职位大类 / 小类', 'positionType'],
    ['计划招录', 'recruitCount'], ['学历要求', 'educationRaw'], ['学位要求', 'degreeRaw'],
    ['专业要求', 'majorRaw'], ['政治面貌', 'politicalStatusRaw'], ['现有身份要求', 'existingIdentityRaw'],
    ['年龄要求', 'ageRaw'], ['体能 / 心理 / 专业加试', 'tests'], ['备注', 'remarkRaw'], ['个人资格初核', 'eligibility'],
  ];
  const valueFor = (position, key) => {
    if (key === 'tests') return [`心理 ${position.psychologicalTestRaw || '未注明'}`, `体能 ${position.physicalTestRaw || '未注明'}`, `专业 ${position.professionalTestRaw || '未注明'}`].join(' / ');
    if (key === 'eligibility') return (eligibilityCache.get(position) || evaluateZhejiangEligibility(position, profile, majorCatalog)).label;
    return String(position[key] ?? '');
  };
  const visibleRows = workspace.comparisonOnlyDifferences ? rows.filter(([, key]) => new Set(items.map((position) => valueFor(position, key))).size > 1) : rows;
  return `<section class="national-comparison"><div class="national-results-summary"><div><strong>${items.length}</strong><span> / 6 个职位</span><small>逐项比较职位表字段和个人资格初核。</small></div><div class="national-comparison-actions"><button type="button" class="button button-quiet" data-action="zhejiang-toggle-difference-only">${workspace.comparisonOnlyDifferences ? '显示全部字段' : '只看差异'}</button><button type="button" class="button button-secondary" data-action="zhejiang-clear-comparison" ${items.length ? '' : 'disabled'}>清空比较</button><button type="button" class="button button-secondary" data-action="zhejiang-export-comparison" ${items.length ? '' : 'disabled'}>导出 CSV</button></div></div>${items.length ? `<div class="national-compare-scroll"><table class="national-compare-table"><thead><tr><th>比较项目</th>${items.map((position, index) => `<th>${escapeZhejiangHtml(position.positionTitle)}<small>${escapeZhejiangHtml(position.departmentName)}</small><span class="national-compare-reorder"><button type="button" aria-label="上移职位" data-action="zhejiang-move-compare" data-position-id="${escapeZhejiangHtml(position.id)}" data-direction="-1" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" aria-label="下移职位" data-action="zhejiang-move-compare" data-position-id="${escapeZhejiangHtml(position.id)}" data-direction="1" ${index === items.length - 1 ? 'disabled' : ''}>↓</button></span><button type="button" data-action="zhejiang-toggle-compare" data-position-id="${escapeZhejiangHtml(position.id)}">移出比较</button></th>`).join('')}</tr></thead><tbody>${visibleRows.map(([label, key]) => {
    const values = items.map((position) => valueFor(position, key));
    const different = new Set(values).size > 1;
    return `<tr class="${different ? 'has-difference' : ''}"><th>${escapeZhejiangHtml(label)}</th>${values.map((value) => `<td>${value ? escapeZhejiangHtml(value) : '<span class="national-empty-value">原表为空</span>'}</td>`).join('')}</tr>`;
  }).join('')}</tbody></table></div>` : '<div class="empty-state">加入职位后，可在这里并排核对专业、学历、招录人数和备注条件。</div>'}</section>`;
}

function zhejiangProfileForm(profile, majorCatalog) {
  const path = getZhejiangMajorCatalogPath(profile, majorCatalog);
  const profileOpen = !hasZhejiangEligibilityProfile(profile);
  return `<details class="national-column-settings zhejiang-profile" ${profileOpen ? 'open' : ''}><summary>我的报考条件${hasZhejiangEligibilityProfile(profile) ? ' · 已填写' : ' · 请填写'}</summary><form id="zhejiang-profile-form" class="zhejiang-profile-form"><div class="zhejiang-profile-grid">${zhejiangProfileSelect('degree', '最高学历', profile.degree, ['本科', '研究生', '硕士研究生', '博士研究生'])}${zhejiangInput('graduateMajor', '研究生专业', profile.graduateMajor || '', '按专业目录名称填写')}${zhejiangInput('graduateMajorCode', '研究生专业代码（选填）', profile.graduateMajorCode || '', '无代码可留空')}${zhejiangInput('undergraduateMajor', '本科专业（选填）', profile.undergraduateMajor || '', '职位只列本科专业时用于核对')}${zhejiangProfileSelect('gender', '性别', profile.gender, ['女性', '男性', '其他'])}${zhejiangInput('ethnicity', '民族', profile.ethnicity || '', '如有明确民族限制才参与初筛')}${zhejiangProfileSelect('politicalStatus', '政治面貌', profile.politicalStatus, ['共青团员', '中共党员', '群众', '其他'])}${zhejiangProfileSelect('graduationStatus', '毕业身份', profile.graduationStatus, ['应届毕业生', '非应届', '其他'])}${zhejiangInput('grassrootsYears', '基层工作经历年限', profile.grassrootsYears ?? '', '无基层工作经历填 0', 'number')}${zhejiangInput('age', '年龄（周岁）', profile.age || '', '仅在职位有年龄要求时参与初筛', 'number')}${zhejiangInput('hukou', '户籍', profile.hukou || '', '只在职位有属地限制时填写')}${zhejiangInput('studentOrigin', '生源地（选填）', profile.studentOrigin || '', '只在职位有属地限制时填写')}${zhejiangInput('credentials', '资格证书（选填）', profile.credentials || '', '多个项目用逗号分隔')}${zhejiangProfileSelect('grassrootsProjectStatus', '是否符合服务基层项目条件', profile.grassrootsProjectStatus, ['是', '否'])}${zhejiangProfileSelect('acceptPhysicalTest', '是否接受体能测评', profile.acceptPhysicalTest, ['接受', '不接受', '待确认'])}${zhejiangProfileSelect('acceptPsychologicalTest', '是否接受心理测评', profile.acceptPsychologicalTest, ['接受', '不接受', '待确认'])}${zhejiangProfileSelect('acceptProfessionalTest', '是否接受专业加试', profile.acceptProfessionalTest, ['接受', '不接受', '待确认'])}${zhejiangProfileSelect('acceptServiceDuration', '是否接受职位最低服务年限', profile.acceptServiceDuration, ['接受', '不接受', '待确认'])}</div>${path.length ? `<p class="zhejiang-major-path">专业目录路径：${escapeZhejiangHtml([profile.degree || '学历未填', ...path].join(' → '))}</p>` : ''}<div class="form-actions"><button type="submit" class="button button-primary">保存个人条件</button><span>毕业身份只按是否应届比对；学位按学历层级初核。资料保存在本机加密档案。</span></div></form></details>`;
}

function zhejiangTabs(tab, workspace) {
  const tabs = [['positions', '职位筛选'], ['overview', '数据概览'], ['favorites', `我的收藏 ${workspace.favorites.length}`], ['comparison', `并排比较 ${workspace.comparisons.length}`]];
  return `<nav class="national-tabs" aria-label="浙江省考职位工具">${tabs.map(([key, label]) => `<a class="national-tab ${tab === key ? 'is-active' : ''}" href="#/zhejiang?tab=${key}" ${tab === key ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`;
}

export function renderZhejiangWorkspace({ positions = [], metadata = {}, profile = {}, majorCatalog = [], workspace, tab = 'positions' }) {
  const state = workspace || { filters: {}, savedFilters: [], favorites: [], comparisons: [], notes: {} };
  const eligibilityCache = new Map();
  const filtered = filterZhejiangPositions(positions, state.filters, profile, majorCatalog, eligibilityCache);
  const counts = hasZhejiangEligibilityProfile(profile)
    ? { initialMatch: 0, incompatible: 0, needsReview: 0, incomplete: 0, majorMatches: 0 } : null;
  if (counts) {
    for (const position of positions) {
      const result = eligibilityCache.get(position) || evaluateZhejiangEligibility(position, profile, majorCatalog);
      eligibilityCache.set(position, result);
      counts[result.status] += 1;
      if (result.checks.major.status === 'match') counts.majorMatches += 1;
    }
  }
  const currentTab = ['positions', 'overview', 'favorites', 'comparison'].includes(tab) ? tab : 'positions';
  const content = currentTab === 'overview' ? zhejiangOverviewTab(metadata, filtered.length, counts)
    : currentTab === 'favorites' ? zhejiangFavoritesTab({ positions, workspace: state, profile, majorCatalog, eligibilityCache })
      : currentTab === 'comparison' ? zhejiangComparisonTab({ positions, workspace: state, profile, majorCatalog, eligibilityCache })
        : zhejiangPositionsTab({ positions, filtered: sortZhejiangPositions(filtered, state.filters.sort), counts, workspace: state, profile, majorCatalog, eligibilityCache });
  return `<div class="page-body national-page zhejiang-page"><div class="page-heading-row"><div><div class="eyebrow muted">ZHEJIANG CIVIL SERVICE EXAM · 2027</div><h1>2027 浙江省考职位筛选</h1><p>${Number(metadata.positionCount || positions.length).toLocaleString('zh-CN')} 个职位 · 计划招录 ${Number(metadata.recruitCount || 0).toLocaleString('zh-CN')} 人 · 保留职位表原文与逐项资格初核</p></div><a class="button button-secondary" href="#/profile">查看个人资料</a></div>${zhejiangProfileForm(profile, majorCatalog)}${zhejiangTabs(currentTab, state)}${content}</div>`;
}
