import { evaluateBeijingEligibility, getBeijingMajorCatalogPath, hasBeijingEligibilityProfile } from './eligibility.js';
import { filterBeijingPositions, sortBeijingPositions } from './filters.js';
import { buildBeijingHistoricalComparisons } from './history.js';
import { BEIJING_REGISTRATION_START, filterAndSortBeijingMonitorRows } from './monitoring.js';
import { normalizeBeijingWorkspace } from './storage.js';

const historicalComparisonCache = new WeakMap();

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

function beijingEligibilityPanel(position, workspace, profile, majorCatalog, result) {
  const automatic = evaluateBeijingEligibility(position, profile, majorCatalog);
  const savedReviews = workspace.manualReviews?.[position.id] || {};
  const checks = Object.entries(result.checks).map(([key, item]) => {
    const kind = item.status === 'match' ? 'initialMatch' : item.status === 'mismatch' ? 'incompatible'
      : item.status === 'missing' ? 'incomplete' : 'needsReview';
    const label = item.manual ? `人工核验${item.status === 'match' ? '符合' : '不符合'}`
      : item.status === 'match' ? '符合' : item.status === 'mismatch' ? '不符合'
        : item.status === 'missing' ? '待补资料' : '待核验';
    const savedReview = savedReviews[key];
    const canReview = automatic.checks[key].status === 'review';
    const manualActions = canReview || savedReview ? `<div class="beijing-manual-review-actions">${savedReview && !item.manual ? '<small>岗位条件或个人资料已变化，之前的人工结论未应用。</small>' : ''}${canReview ? `<button type="button" class="button button-quiet button-small" data-action="beijing-set-manual-review" data-position-id="${escapeBeijingHtml(position.id)}" data-check-key="${escapeBeijingHtml(key)}" data-outcome="match" aria-pressed="${item.manual && item.status === 'match' ? 'true' : 'false'}">人工核验为符合</button><button type="button" class="button button-quiet button-small" data-action="beijing-set-manual-review" data-position-id="${escapeBeijingHtml(position.id)}" data-check-key="${escapeBeijingHtml(key)}" data-outcome="mismatch" aria-pressed="${item.manual && item.status === 'mismatch' ? 'true' : 'false'}">人工核验为不符合</button>` : ''}${savedReview ? `<button type="button" class="button button-quiet button-small" data-action="beijing-clear-manual-review" data-position-id="${escapeBeijingHtml(position.id)}" data-check-key="${escapeBeijingHtml(key)}">撤销人工核验</button>` : ''}</div>` : '';
    return `<li>${beijingBadge(label, kind)}<div><strong>${escapeBeijingHtml(BEIJING_CHECK_LABELS[key] || key)}</strong><small>职位要求：${escapeBeijingHtml(beijingRequirementValue(key, position) || '原表为空')}</small><small>个人资料：${escapeBeijingHtml(beijingPersonalCheckValue(key, profile) || '未填写')}</small><span>判断依据：${escapeBeijingHtml(item.reason)}</span>${manualActions}</div></li>`;
  }).join('');
  const path = getBeijingMajorCatalogPath(profile, majorCatalog);
  return `<section class="national-eligibility"><h4>逐项资格初核 · ${escapeBeijingHtml(result.label)}</h4>${path.length ? `<p>专业目录路径：${escapeBeijingHtml([profile.degree, ...path].join(' → '))}</p>` : ''}<ul>${checks}</ul><p>按北京报考指南使用最高学历核对学历与专业；学位按最高学历推定。未明确写入岗位条件的毕业年份和证书名称不单独触发待核验。人工结论仅用于你的个人筛选，可随时撤销。</p></section>`;
}

function beijingPositionDetails(position, workspace, profile, majorCatalog, eligibility) {
  const favorite = workspace.favorites.find((item) => item.positionId === position.id);
  const note = favorite?.note || workspace.notes[position.id] || '';
  return `<details class="national-position-details"><summary>查看资格初核与职位表原文</summary>${beijingEligibilityPanel(position, workspace, profile, majorCatalog, eligibility)}<dl class="national-raw-grid">${beijingRawFields(position)}</dl><form class="national-note-form" data-form="beijing-note" data-position-id="${escapeBeijingHtml(position.id)}"><label class="form-field"><span>个人备注</span><textarea name="note" rows="2" maxlength="2000" placeholder="例如：向招录机关核对专业口径或应届身份">${escapeBeijingHtml(note)}</textarea></label><label class="form-field"><span>优先级</span><select name="priority"><option value="normal" ${favorite?.priority !== 'high' && favorite?.priority !== 'watch' ? 'selected' : ''}>普通</option><option value="high" ${favorite?.priority === 'high' ? 'selected' : ''}>优先核对</option><option value="watch" ${favorite?.priority === 'watch' ? 'selected' : ''}>继续关注</option></select></label><button type="submit" class="button button-secondary button-small">保存备注</button></form></details>`;
}

function beijingPositionCard(position, workspace, profile, majorCatalog, eligibilityCache) {
  const eligibility = eligibilityCache.get(position) || evaluateBeijingEligibility(position, profile, majorCatalog, workspace.manualReviews?.[position.id]);
  const favorite = workspace.favorites.find((item) => item.positionId === position.id);
  const compared = workspace.comparisons.includes(position.id);
  const kind = eligibility.status === 'initialMatch' ? 'initialMatch' : eligibility.status === 'incompatible'
    ? 'incompatible' : eligibility.status === 'incomplete' ? 'incomplete' : 'needsReview';
  return `<article class="national-position-card" data-position-id="${escapeBeijingHtml(position.id)}"><div class="national-position-head"><div><div class="national-kicker">${escapeBeijingHtml(position.sourceSheet)} · ${escapeBeijingHtml(position.positionCode)}</div><h3>${escapeBeijingHtml(position.positionTitle)}</h3><p>${escapeBeijingHtml(position.departmentName)} · ${escapeBeijingHtml(position.hiringDepartment || '')}</p></div>${beijingBadge(eligibility.label, kind)}</div><div class="national-position-meta"><span>机构性质：${escapeBeijingHtml(position.positionAttribute || '原表为空')}</span><span>职位类别：${escapeBeijingHtml(position.positionType || '原表为空')}</span><span>职位层级：${escapeBeijingHtml(position.positionSubType || '原表为空')}</span><span>招录人数：${escapeBeijingHtml(position.recruitCount ?? '原表为空')}</span><span>学历：${escapeBeijingHtml(position.educationRaw || '原表为空')}</span><span>政治面貌：${escapeBeijingHtml(position.politicalStatusRaw || '原表为空')}</span></div><div class="national-position-actions"><button type="button" class="button button-secondary button-small" data-action="beijing-toggle-favorite" data-position-id="${escapeBeijingHtml(position.id)}">${favorite ? '★ 已收藏' : '☆ 收藏'}</button><button type="button" class="button button-quiet button-small" data-action="beijing-toggle-compare" data-position-id="${escapeBeijingHtml(position.id)}">${compared ? '✓ 已加入比较' : '＋ 加入比较'}</button><button type="button" class="button button-quiet button-small" data-action="beijing-copy-position" data-position-id="${escapeBeijingHtml(position.id)}">复制原文</button></div>${beijingPositionDetails(position, workspace, profile, majorCatalog, eligibility)}</article>`;
}

function historySourceLink(source) {
  const url = String(source?.url || '').trim();
  const safeHref = /^https?:\/\//iu.test(url) ? url : '';
  const title = safeHref
    ? `<a href="${escapeBeijingHtml(safeHref)}" target="_blank" rel="noreferrer">${escapeBeijingHtml(source.title || '打开来源')} ↗</a>`
    : escapeBeijingHtml(source?.title || '来源信息待补');
  const metadata = [source?.publisher, source?.level === 'official' ? '官方' : source?.level === 'secondary' ? '第三方' : '', source?.accessedAt]
    .filter(Boolean).map(escapeBeijingHtml).join(' · ');
  return `${title}${metadata ? ` · ${metadata}` : ''}`;
}

function historyRatio(ratio) {
  if (!Number.isFinite(ratio)) return '暂无可计算比值';
  const rounded = Number(ratio.toFixed(1));
  return `${rounded.toLocaleString('zh-CN')} : 1`;
}

function historicalMatchMarkup(match) {
  const observations = match.observations.length
    ? `<div class="beijing-history-metrics">${match.observations.map((item) => `<article><strong>${escapeBeijingHtml(item.label)}</strong><span>人数：${item.count === null ? '未提供' : `${item.count.toLocaleString('zh-CN')} 人`}</span><span>计划招录：${item.recruitCount === null ? '未提供' : `${item.recruitCount} 人`}</span><span>人数 / 计划：${historyRatio(item.ratio)}</span><small>${escapeBeijingHtml(item.observedAt || '统计时点未注明')}${item.notes ? ` · ${escapeBeijingHtml(item.notes)}` : ''}</small><small>${historySourceLink(item.source)}</small></article>`).join('')}</div>`
    : '<p class="beijing-history-empty">暂无可追溯的岗位级报名或资格审查快照；不以区级、单位级汇总替代。</p>';
  const scores = match.scores.length
    ? `<div class="beijing-history-scores"><strong>第三方公开进面分样本</strong>${match.scores.map((item) => `<article><span>${item.score === null ? '未提供分数' : `${item.score} 分`}</span><small>${escapeBeijingHtml(item.notes || '具体统计口径以来源页面为准')}</small><small>${historySourceLink(item.source)}</small></article>`).join('')}</div>`
    : '<p class="beijing-history-empty">暂无能唯一对应到该历史职位的高置信进面分样本。</p>';
  const sources = match.positionSources.length
    ? `<div class="beijing-history-position-sources"><strong>历史职位信息来源</strong>${match.positionSources.map((source) => `<span>${historySourceLink(source)}${source.level ? ` · ${escapeBeijingHtml(source.level === 'official' ? '官方' : '第三方')}` : ''}</span>`).join('')}</div>`
    : '';
  return `<details class="beijing-history-match"><summary><span>${match.year} · ${escapeBeijingHtml(match.unit)} · ${escapeBeijingHtml(match.title)}</span><small>代码 ${escapeBeijingHtml(match.positionCode)} · 计划招录 ${match.recruitCount === null ? '未提供' : `${match.recruitCount} 人`}</small></summary><div class="beijing-history-match-body"><div class="beijing-history-reasons">${match.matchReasons.map((reason) => `<span>${escapeBeijingHtml(reason)}</span>`).join('')}</div><div class="beijing-history-conditions"><span>学历：${escapeBeijingHtml(match.education || '未提供')}</span><span>专业：${escapeBeijingHtml(match.majorText || '未提供')}</span><span>区县：${escapeBeijingHtml(match.district || '未识别')}</span><span>${escapeBeijingHtml(match.departmentNote)}</span></div>${observations}${scores}${sources}</div></details>`;
}

function beijingPicksImportPanel(importPreview) {
  const partialWarning = importPreview?.isPartial
    ? `<p class="beijing-picks-partial-warning">这是部分清单：文件中识别到 ${importPreview.summary?.totalRows || 0} 行，少于原始 60 个岗位；核对后仍可导入。</p>`
    : '';
  const preview = importPreview ? `<section class="beijing-picks-preview" id="beijing-picks-preview"><div class="panel-heading"><div><h2>导入预览</h2><p>只使用“职位代码”匹配职位；不会读取或展示 CSV 中的个人资格初核和个人备注。</p></div><span>${importPreview.summary?.validPositions || 0} / 60 个有效岗位</span></div>${partialWarning}${importPreview.errors?.length ? `<ul class="beijing-picks-errors">${importPreview.errors.map((error) => `<li>${escapeBeijingHtml(error)}</li>`).join('')}</ul>` : ''}${importPreview.rows?.length ? `<div class="beijing-picks-preview-list">${importPreview.rows.map((row) => `<div class="beijing-picks-preview-row ${row.errors.length ? 'has-error' : ''}"><span>${escapeBeijingHtml(row.code || '缺少代码')}</span><span>${row.position ? `${escapeBeijingHtml(row.position.departmentName)} · ${escapeBeijingHtml(row.position.positionTitle)}` : '未匹配到职位'}</span><small>${row.errors.length ? escapeBeijingHtml(row.errors.join('；')) : '可导入'}</small></div>`).join('')}</div>` : ''}<div class="form-actions"><button type="button" class="button button-primary" data-action="beijing-picks-confirm-import" ${importPreview.canImport ? '' : 'disabled'}>确认并保存到本机加密档案</button><button type="button" class="button button-quiet" data-action="beijing-picks-cancel-import">取消预览</button></div></section>` : '';
  return `<section class="panel beijing-picks-import"><div class="panel-heading"><div><div class="eyebrow muted">PRIVATE POSITION LIST</div><h2>导入我的选岗</h2><p>选择职位筛选导出的 CSV，可导入 1–60 个岗位。确认后只把职位代码保存在本机加密档案。</p></div></div><form id="beijing-picks-import-form"><label class="form-field"><span>CSV 文件</span><input id="beijing-picks-csv" name="file" type="file" accept=".csv,text/csv" required/></label><div class="form-actions"><button type="submit" class="button button-secondary">读取并预览</button><a class="button button-quiet" href="#/beijing">打开 2027 北京市考职位库</a></div></form>${preview}</section>`;
}

function beijingHistoricalSection(title, matches, emptyText, { positionId = '', limit = Infinity, expanded = false } = {}) {
  const visible = expanded ? matches : matches.slice(0, limit);
  const partial = visible.length < matches.length;
  const action = matches.length > limit
    ? `<button type="button" class="button button-quiet button-small" data-action="beijing-picks-expand-similar" data-position-id="${escapeBeijingHtml(positionId)}">${expanded ? '收起' : `展开其余 ${matches.length - visible.length} 条`}</button>`
    : '';
  return `<section class="beijing-history-section"><div class="beijing-history-heading"><h3>${escapeBeijingHtml(title)}</h3><span>${visible.length}${partial ? ` / ${matches.length}` : ''} 条</span></div>${matches.length ? visible.map(historicalMatchMarkup).join('') : `<p class="beijing-history-empty">${escapeBeijingHtml(emptyText)}</p>`}${action}</section>`;
}

function beijingPicksFilterPanel(positions, filters, matchedCount) {
  const select = (name, label) => {
    const options = beijingOptions(positions, name).map((value) => `<option value="${escapeBeijingHtml(value)}" ${filters[name] === value ? 'selected' : ''}>${escapeBeijingHtml(value)}</option>`).join('');
    return `<label class="form-field national-filter-field"><span>${escapeBeijingHtml(label)}</span><select name="${name}" data-pick-filter="${name}"><option value="">不限</option>${options}</select></label>`;
  };
  return `<form id="beijing-picks-filter-form" class="panel beijing-picks-filter"><div class="panel-heading"><div><h2>快速筛选</h2><p>关键词和独立条件同时生效，结果按重点岗位优先排列。</p></div><strong>${matchedCount} / ${positions.length} 个匹配岗位</strong></div><div class="beijing-picks-filter-grid"><label class="form-field national-filter-field"><span>即时关键词</span><input id="beijing-picks-keyword" name="keyword" data-pick-filter="keyword" type="search" value="${escapeBeijingHtml(filters.keyword)}" placeholder="职位代码、单位、区县、专业和报考条件" autocomplete="off"/></label>${select('workDistrict', '区县')}${select('majorRaw', '专业要求')}${select('educationRaw', '学历要求')}${select('politicalStatusRaw', '政治面貌')}${select('freshGraduateRaw', '应届要求')}${select('existingIdentityRaw', '身份 / 定向要求')}<label class="beijing-picks-only-priority"><input type="checkbox" name="onlyPriority" data-pick-filter="onlyPriority" ${filters.onlyPriority ? 'checked' : ''}/><span>只看重点</span></label></div><div class="form-actions"><button type="button" class="button button-quiet button-small" data-action="beijing-picks-clear-filters">清除筛选</button></div></form>`;
}

function beijingPickMatches(position, filters, priorityIds) {
  if (filters.onlyPriority && !priorityIds.has(position.id)) return false;
  for (const field of ['workDistrict', 'majorRaw', 'educationRaw', 'politicalStatusRaw', 'freshGraduateRaw', 'existingIdentityRaw']) {
    if (filters[field] && String(position[field] || '') !== filters[field]) return false;
  }
  const keyword = String(filters.keyword || '').trim().toLocaleLowerCase('zh-CN');
  if (!keyword) return true;
  const searchable = [
    position.searchText, position.positionCode, position.departmentName, position.hiringDepartment,
    position.positionTitle, position.workDistrict, position.majorText, position.majorRaw,
    position.educationRaw, position.degreeRaw, position.politicalStatusRaw, position.freshGraduateRaw,
    position.existingIdentityRaw, position.grassrootsRequirementRaw, position.otherConditionsRaw,
    position.remarkRaw, ...Object.entries(position.rawFields || {}).flatMap(([key, value]) => [key, value]),
  ].filter(Boolean).join(' ').toLocaleLowerCase('zh-CN');
  return searchable.includes(keyword);
}

export function renderBeijingPicksPage({ positions = [], workspace = {}, dataset = {}, importPreview = null, expandedSimilarIds = [] }) {
  const currentWorkspace = normalizeBeijingWorkspace(workspace);
  const byId = new Map(positions.map((position) => [position.id, position]));
  const allPicked = currentWorkspace.myPicks
    .map((id) => byId.get(id)).filter(Boolean);
  const priorityIds = new Set(currentWorkspace.pickPriorities);
  const filters = currentWorkspace.pickFilters;
  const orderedPicked = [...allPicked].sort((left, right) => Number(priorityIds.has(right.id)) - Number(priorityIds.has(left.id)));
  const picked = orderedPicked.filter((position) => beijingPickMatches(position, filters, priorityIds));
  let cachedById = historicalComparisonCache.get(dataset);
  if (!cachedById) {
    cachedById = new Map();
    historicalComparisonCache.set(dataset, cachedById);
  }
  const comparisons = picked.map((position) => {
    if (!cachedById.has(position.id)) cachedById.set(position.id, buildBeijingHistoricalComparisons(position, dataset));
    return { position, evidence: cachedById.get(position.id) };
  });
  const withCompetition = comparisons.filter(({ evidence }) => [...evidence.directMatches, ...evidence.similarMatches]
    .some((match) => match.observations.length || match.scores.length)).length;
  const withDirectHistory = comparisons.filter(({ evidence }) => evidence.directMatches.length).length;
  const cards = comparisons.map(({ position, evidence }) => {
    const isPriority = priorityIds.has(position.id);
    const direct = beijingHistoricalSection('同单位、同职位名称', evidence.directMatches, '历史职位库没有找到单位名称和职位名称都相同的岗位。');
    const similar = beijingHistoricalSection('报名条件与招录部门 / 工作区县相近', evidence.similarMatches, '当前历史记录中没有找到报名条件与招录部门或工作区县都相近、且有竞争数据的岗位。', {
      positionId: position.id,
      limit: 8,
      expanded: expandedSimilarIds.includes(position.id),
    });
    return `<article class="panel beijing-pick-history-card ${isPriority ? 'is-priority' : ''}"><header><div><div class="eyebrow muted">${escapeBeijingHtml(position.positionCode)} · ${escapeBeijingHtml(position.sourceSheet)}</div><h2>${escapeBeijingHtml(position.positionTitle)}${isPriority ? ' <span class="beijing-pick-priority-badge">重点</span>' : ''}</h2><p>${escapeBeijingHtml(position.departmentName)} · ${escapeBeijingHtml(position.hiringDepartment || '')}</p></div><span class="national-badge">招录 ${escapeBeijingHtml(position.recruitCount ?? '未提供')} 人</span></header><div class="beijing-pick-current-conditions"><span>学历：${escapeBeijingHtml(position.educationRaw || '原表为空')}</span><span>专业：${escapeBeijingHtml(position.majorRaw || '原表为空')}</span><span>政治面貌：${escapeBeijingHtml(position.politicalStatusRaw || '原表为空')}</span><span>应届 / 身份：${escapeBeijingHtml(position.existingIdentityRaw || position.freshGraduateRaw || '原表未注明')}</span><span>备注：${escapeBeijingHtml(position.remarkRaw || '原表未注明')}</span></div><details class="beijing-pick-history-details"><summary>往届竞争数据 · ${evidence.directMatches.length} 条同岗 · ${evidence.similarMatches.length} 条近似</summary>${direct}${similar}<p class="beijing-history-caution">往届职位名称相同不代表招录科室或资格条件完全相同。报考人数与资格审查人数分开列示，快照比值按人数 ÷ 计划招录计算；公开分数只作样本参考。空值表示当前没有可追溯记录，不是 0。</p></details><div class="beijing-pick-actions"><button type="button" class="button ${isPriority ? 'button-primary' : 'button-secondary'} button-small" data-action="beijing-picks-toggle-priority" data-position-id="${escapeBeijingHtml(position.id)}">${isPriority ? '★ 取消重点' : '☆ 标为重点'}</button><button type="button" class="button button-quiet button-small" data-action="beijing-toggle-compare" data-position-id="${escapeBeijingHtml(position.id)}">加入岗位比较 ⇄</button></div></article>`;
  }).join('');
  const content = allPicked.length
    ? `${beijingPicksFilterPanel(allPicked, filters, picked.length)}<div class="beijing-picks-summary"><article><span>已选职位</span><strong>${allPicked.length} / 60</strong></article><article><span>当前筛选结果</span><strong>${picked.length}</strong></article><article><span>找到同岗历史记录</span><strong>${withDirectHistory}</strong></article><article><span>有岗位级竞争 / 分数证据</span><strong>${withCompetition}</strong></article></div>${picked.length ? `<div class="beijing-picks-list">${cards}</div>` : '<div class="empty-state">没有符合当前条件的岗位。调整筛选条件或清除筛选后重试。</div>'}`
    : '<div class="empty-state">尚未导入选岗清单。选择包含 1–60 个唯一“职位代码”的 CSV 后，可查看每个岗位对应的历年竞争资料。</div>';
  return `<div class="page-body national-page beijing-page beijing-picks-page"><div class="page-heading-row"><div><div class="eyebrow muted">BEIJING · MY PICKS & HISTORICAL COMPETITION</div><h1>我的选岗与往届竞争资料</h1><p>同岗按招录单位和职位名称核对；近似岗位主要看报名条件及招录部门 / 工作区县关系，职位名称和职能词只作补充。竞争人数、比例和进面分均保留来源口径。</p></div><a class="button button-secondary" href="#/beijing">打开 2027 职位库</a></div>${beijingPicksImportPanel(importPreview)}${content}</div>`;
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
    if (key === 'eligibility') return (eligibilityCache.get(position) || evaluateBeijingEligibility(position, profile, majorCatalog, workspace.manualReviews?.[position.id])).label;
    return String(position[key] ?? '');
  };
  const visibleRows = workspace.comparisonOnlyDifferences ? rows.filter(([, key]) => new Set(items.map((position) => valueFor(position, key))).size > 1) : rows;
  return `<section class="national-comparison"><div class="national-results-summary"><div><strong>${items.length}</strong><span> / 10 个职位</span><small>逐项比较职位表字段和个人资格初核。</small></div><div class="national-comparison-actions"><button type="button" class="button button-quiet" data-action="beijing-toggle-difference-only">${workspace.comparisonOnlyDifferences ? '显示全部字段' : '只看差异'}</button><button type="button" class="button button-secondary" data-action="beijing-clear-comparison" ${items.length ? '' : 'disabled'}>清空比较</button><button type="button" class="button button-secondary" data-action="beijing-export-comparison" ${items.length ? '' : 'disabled'}>导出 CSV</button></div></div>${items.length ? `<div class="national-compare-scroll"><table class="national-compare-table"><thead><tr><th>比较项目</th>${items.map((position, index) => `<th>${escapeBeijingHtml(position.positionTitle)}<small>${escapeBeijingHtml(position.departmentName)}</small><span class="national-compare-reorder"><button type="button" aria-label="上移职位" data-action="beijing-move-compare" data-position-id="${escapeBeijingHtml(position.id)}" data-direction="-1" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" aria-label="下移职位" data-action="beijing-move-compare" data-position-id="${escapeBeijingHtml(position.id)}" data-direction="1" ${index === items.length - 1 ? 'disabled' : ''}>↓</button></span><button type="button" data-action="beijing-toggle-compare" data-position-id="${escapeBeijingHtml(position.id)}">移出比较</button></th>`).join('')}</tr></thead><tbody>${visibleRows.map(([label, key]) => {
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
  const tabs = [['positions', '职位筛选'], ['overview', '数据概览'], ['favorites', `我的收藏 ${workspace.favorites.length}`], ['monitor', `我的选岗监控 ${workspace.myPicks.length}`], ['comparison', `并排比较 ${workspace.comparisons.length}`]];
  return `<nav class="national-tabs" aria-label="北京市考职位工具">${tabs.map(([key, label]) => `<a class="national-tab ${tab === key ? 'is-active' : ''}" href="#/beijing?tab=${key}" ${tab === key ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`;
}

function beijingMonitorDate(value) {
  if (!String(value || '').trim()) return '未提供';
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? new Date(parsed).toLocaleString('zh-CN', { hour12: false }) : String(value);
}

function beijingMonitorSource(metric) {
  if (!metric) return '<span class="national-empty-value">暂无数据</span>';
  const name = escapeBeijingHtml(metric.sourceName || (metric.sourceType === 'official' ? '官方补录' : '第三方'));
  const link = /^https:\/\//u.test(metric.sourceUrl || '')
    ? `<a href="${escapeBeijingHtml(metric.sourceUrl)}" target="_blank" rel="noreferrer">${name}</a>` : name;
  const sourceType = metric.sourceType === 'official' ? '官方' : metric.sourceType === 'manual' ? '手动' : '第三方';
  return `<small class="beijing-monitor-provenance">${link} · ${sourceType}<br/>观测时间 ${escapeBeijingHtml(beijingMonitorDate(metric.observedAt))}${metric.sourceUpdatedAt ? `<br/>来源更新时间 ${escapeBeijingHtml(beijingMonitorDate(metric.sourceUpdatedAt))}` : ''}</small>`;
}

function beijingMonitorCount(metric) {
  return Number.isSafeInteger(metric?.value) ? Number(metric.value).toLocaleString('zh-CN') : '暂无';
}

function beijingMonitorRatio(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)} : 1` : '暂无';
}

function beijingMonitorPreview(preview, kind) {
  if (!preview) return '';
  const isRefresh = kind === 'refresh';
  const previewId = isRefresh ? 'beijing-monitor-refresh-preview' : 'beijing-monitor-import-preview';
  const cancelAction = isRefresh ? 'beijing-monitor-refresh-cancel' : 'beijing-monitor-clear-preview';
  const confirmAction = isRefresh ? 'beijing-monitor-refresh-confirm' : 'beijing-monitor-import-confirm';
  const summary = preview.summary || {};
  if (preview.loading) {
    return `<section id="${previewId}" class="national-monitor-preview" aria-live="polite"><p>${escapeBeijingHtml(preview.message || '正在处理北京市考岗位数据…')}</p></section>`;
  }
  if (preview.error) {
    const settingsAction = isRefresh && preview.requiresToken
      ? '<button type="button" class="button button-secondary" data-action="cloud-sync-settings">打开同步设置</button>' : '';
    return `<section id="${previewId}" class="national-monitor-preview" aria-live="polite"><p class="national-monitor-errors">${escapeBeijingHtml(preview.error)}</p><div class="national-monitor-preview-actions">${settingsAction}<button type="button" class="button button-quiet" data-action="${cancelAction}">关闭</button></div></section>`;
  }
  const counts = isRefresh
    ? [['选岗', summary.selectedPositions], ['匹配岗位', summary.matched], ['待更新人数项', summary.metricsToUpdate], ['无数据人数项', summary.missingMetrics]]
    : [['CSV 行', summary.totalRows], ['有效行', summary.validRows], ['待更新人数项', summary.metricsToUpdate], ['留空人数项', summary.missingMetrics]];
  const errors = [...(Array.isArray(preview.errors) ? preview.errors : []),
    ...(Array.isArray(preview.rows) ? preview.rows.flatMap((row) => (row.errors || []).map((error) => `第 ${row.line || ''} 行：${error}`)) : [])];
  const status = preview.canImport
    ? '人数和岗位代码校验通过。确认后按报名人数、过审人数分别合并到本机。'
    : isRefresh && preview.preRegistration
      ? '报名尚未开始；第三方页面中的占位 0 不会写入为真实人数。'
      : '没有可更新的人数项，或预览中存在需要修正的问题。';
  return `<section id="${previewId}" class="national-monitor-preview" aria-live="polite"><div class="national-monitor-preview-heading"><h3>${isRefresh ? '华图公开数据预览' : '官方 CSV 导入预览'}</h3><button type="button" class="button button-quiet" data-action="${cancelAction}">取消预览</button></div><div class="national-monitor-preview-counts">${counts.map(([label, value]) => `<div><strong>${Number(value || 0).toLocaleString('zh-CN')}</strong><span>${escapeBeijingHtml(label)}</span></div>`).join('')}</div>${isRefresh ? `<p>采集时间：${escapeBeijingHtml(beijingMonitorDate(preview.fetchedAt))} · 来源更新时间：${escapeBeijingHtml(preview.sourceUpdatedAt || '未提供')}</p>` : ''}<p>${escapeBeijingHtml(status)}</p>${errors.length ? `<details><summary>查看 ${errors.length} 条问题</summary><ul class="national-monitor-errors">${errors.map((error) => `<li>${escapeBeijingHtml(error)}</li>`).join('')}</ul></details>` : ''}<div class="national-monitor-preview-actions"><button type="button" class="button button-primary" data-action="${confirmAction}" ${preview.canImport ? '' : 'disabled'}>确认并保存到本机</button></div></section>`;
}

function renderBeijingMonitoringTab({ positions, workspace, importPreview, refreshPreview }) {
  const rows = filterAndSortBeijingMonitorRows(positions, workspace);
  const filters = workspace.monitorFilters;
  const allRows = (workspace.myPicks || []).map((id) => workspace.monitoringSnapshots?.[id] || {});
  const applicationsCount = allRows.filter((snapshot) => Number.isSafeInteger(snapshot.applications?.value)).length;
  const qualifiedCount = allRows.filter((snapshot) => Number.isSafeInteger(snapshot.qualified?.value)).length;
  const sortLabel = (key, label) => {
    const [currentKey, direction] = (workspace.monitorSort || 'applicationsRatio-desc').split(/-(?=[^-]+$)/u);
    return `<button type="button" class="national-monitor-sort ${currentKey === key ? 'is-active' : ''}" data-action="beijing-monitor-sort" data-sort-key="${key}">${escapeBeijingHtml(label)}${currentKey === key ? (direction === 'asc' ? ' ↑' : ' ↓') : ''}</button>`;
  };
  const tableRows = rows.map(({ position, snapshot, ratios }) => {
    const positionId = escapeBeijingHtml(position.id);
    const savedApplications = Number.isSafeInteger(snapshot.applications?.value) ? snapshot.applications.value : '';
    const manualEntry = `<div class="beijing-monitor-manual-entry"><input type="number" min="0" step="1" inputmode="numeric" value="${savedApplications}" placeholder="手动填写" aria-label="${escapeBeijingHtml(position.positionCode)} 报名人数" data-manual-applications="${positionId}"/><button type="button" class="button button-secondary button-small" data-action="beijing-monitor-manual-save" data-position-id="${positionId}">保存</button></div>`;
    return `<tr><td>${escapeBeijingHtml(position.workDistrict || position.workLocation || '未注明')}<small>${escapeBeijingHtml(position.workCity || '')}</small></td><td>${escapeBeijingHtml(position.departmentName || '')}<small>${escapeBeijingHtml(position.hiringDepartment || '')}</small></td><td><strong>${escapeBeijingHtml(position.positionTitle || '')}</strong><small>${escapeBeijingHtml(position.positionCode || '')}</small></td><td>${escapeBeijingHtml(position.recruitCount ?? '未提供')}</td><td><strong>${beijingMonitorCount(snapshot.applications)}</strong>${beijingMonitorSource(snapshot.applications)}${manualEntry}</td><td>${beijingMonitorRatio(ratios.applicationsRatio)}</td><td><strong>${beijingMonitorCount(snapshot.qualified)}</strong>${beijingMonitorSource(snapshot.qualified)}</td><td>${beijingMonitorRatio(ratios.qualifiedRatio)}</td></tr>`;
  }).join('');
  const registrationStart = new Date(BEIJING_REGISTRATION_START).toLocaleString('zh-CN', { hour12: false });
  const registrationNote = `<p class="national-monitor-csv-hint">华图来源：<a href="https://ah.huatu.com/zw/bjgwy/bmrs/" target="_blank" rel="noreferrer">2027 北京市考报名统计</a>；<a href="https://fuwu.rsj.beijing.gov.cn/gwyquery/publicQuery/gzwbkrssscx" target="_blank" rel="noreferrer">北京人社各职位报考人数查询</a>。华图目前只在“招聘人数最多的十大职位”表中公开职位级报名人数（10 个岗位），其他岗位暂无华图人数；华图没有提供岗位级过审人数。官方查询按职位代码并需验证码。2027 报名开始时间：${escapeBeijingHtml(registrationStart)}；官方 CSV 仅接受此时间之后的观测记录。可在每个岗位的“报名人数”格手动填写并保存，记录会标注为手动填写和当前观测时间。</p>`;
  const csvHint = '列名：position_code,applications,qualified,source_name,source_url,source_updated_at,observed_at。人数未知留空，0 表示来源明确显示为零；source_url 必须是北京市政府网站 HTTPS 链接。';
  return `<section class="beijing-monitor"><div class="beijing-picks-summary"><article><span>当前选岗</span><strong>${workspace.myPicks.length} / 60</strong></article><article><span>有报名人数</span><strong>${applicationsCount}</strong></article><article><span>有过审人数</span><strong>${qualifiedCount}</strong></article></div>${registrationNote}<section class="national-monitor-import"><div class="national-monitor-refresh"><div><strong>自动更新第三方数据</strong><span>读取华图公开页面的 2027 岗位统计；只把我的选岗数据保存到本机。</span></div><button type="button" class="button button-primary" data-action="beijing-monitor-refresh" ${refreshPreview?.loading || !workspace.myPicks.length ? 'disabled' : ''}>${refreshPreview?.loading ? '正在更新…' : '从华图更新我的选岗'}</button></div>${beijingMonitorPreview(refreshPreview, 'refresh')}<div class="national-monitor-import-heading"><div><h2>补录官方数据</h2><p>官方查询页须逐个输入职位代码并完成验证码；CSV 预览后再保存。</p></div></div><form id="beijing-monitor-import-form"><label class="form-field"><span>官方数据 CSV</span><input id="beijing-monitor-file" name="file" type="file" accept=".csv,text/csv" required/></label><button type="submit" class="button button-secondary">读取并预览</button></form><p class="national-monitor-csv-hint">${escapeBeijingHtml(csvHint)}</p>${beijingMonitorPreview(importPreview, 'import')}</section><form id="beijing-monitor-filter-form" class="national-monitor-filters"><label class="form-field"><span>关键词</span><input name="query" value="${escapeBeijingHtml(filters.query)}" placeholder="部门、职位、区县或代码"/></label><label class="form-field"><span>报名人数至少</span><input name="minApplications" type="number" min="0" step="1" value="${escapeBeijingHtml(filters.minApplications)}"/></label><label class="form-field"><span>过审人数至少</span><input name="minQualified" type="number" min="0" step="1" value="${escapeBeijingHtml(filters.minQualified)}"/></label><label class="form-field"><span>报名/计划至少</span><input name="minApplicationsRatio" type="number" min="0" step="0.1" value="${escapeBeijingHtml(filters.minApplicationsRatio)}" placeholder="例如 10"/></label><label class="form-field"><span>过审/计划至少</span><input name="minQualifiedRatio" type="number" min="0" step="0.1" value="${escapeBeijingHtml(filters.minQualifiedRatio)}" placeholder="例如 5"/></label><label class="form-field"><span>数据状态</span><select name="dataStatus"><option value="all" ${filters.dataStatus === 'all' ? 'selected' : ''}>全部</option><option value="has-data" ${filters.dataStatus === 'has-data' ? 'selected' : ''}>至少一项有数据</option><option value="missing" ${filters.dataStatus === 'missing' ? 'selected' : ''}>两项都无数据</option></select></label><button type="submit" class="button button-secondary">筛选岗位</button></form><div class="national-results-summary"><div><strong>${rows.length}</strong><span> / ${workspace.myPicks.length} 个选岗</span><small>人数比值 = 报考 / 资格审查通过人数 ÷ 招录计划；缺数据时显示“暂无”。</small></div></div>${rows.length ? `<div class="national-monitor-table-scroll"><table class="national-monitor-table beijing-monitor-table"><thead><tr><th>工作区县</th><th>招录部门 / 用人部门</th><th>职位名称 / 代码</th><th>计划</th><th>${sortLabel('applications', '报名人数')}</th><th>${sortLabel('applicationsRatio', '报名/计划')}</th><th>${sortLabel('qualified', '过审人数')}</th><th>${sortLabel('qualifiedRatio', '过审/计划')}</th></tr></thead><tbody>${tableRows}</tbody></table></div>` : '<div class="empty-state">没有符合条件的选岗。可清除筛选条件，或先导入 60 个职位代码。</div>'}</section>`;
}

export function renderBeijingWorkspace({ positions = [], metadata = {}, profile = {}, majorCatalog = [], workspace, tab = 'positions', monitorImportPreview = null, monitorRefreshPreview = null }) {
  const state = normalizeBeijingWorkspace(workspace);
  const eligibilityCache = new Map();
  const filtered = filterBeijingPositions(positions, state.filters, profile, majorCatalog, eligibilityCache, state.manualReviews);
  const counts = hasBeijingEligibilityProfile(profile)
    ? { initialMatch: 0, incompatible: 0, needsReview: 0, incomplete: 0, majorMatches: 0 } : null;
  if (counts) {
    for (const position of positions) {
      const result = eligibilityCache.get(position) || evaluateBeijingEligibility(position, profile, majorCatalog, state.manualReviews?.[position.id]);
      eligibilityCache.set(position, result);
      counts[result.status] += 1;
      if (result.checks.major.status === 'match') counts.majorMatches += 1;
    }
  }
  const currentTab = ['positions', 'overview', 'favorites', 'monitor', 'comparison'].includes(tab) ? tab : 'positions';
  const content = currentTab === 'overview' ? beijingOverviewTab(metadata, filtered.length, counts)
    : currentTab === 'favorites' ? beijingFavoritesTab({ positions, workspace: state, profile, majorCatalog, eligibilityCache })
      : currentTab === 'comparison' ? beijingComparisonTab({ positions, workspace: state, profile, majorCatalog, eligibilityCache })
        : currentTab === 'monitor' ? renderBeijingMonitoringTab({ positions, workspace: state, importPreview: monitorImportPreview, refreshPreview: monitorRefreshPreview })
        : beijingPositionsTab({ positions, filtered: sortBeijingPositions(filtered, state.filters.sort), counts, workspace: state, profile, majorCatalog, eligibilityCache });
  return `<div class="page-body national-page beijing-page"><div class="page-heading-row"><div><div class="eyebrow muted">BEIJING CIVIL SERVICE EXAM · 2027</div><h1>2027 北京市考职位筛选</h1><p>${Number(metadata.positionCount || positions.length).toLocaleString('zh-CN')} 个职位 · 计划招录 ${Number(metadata.recruitCount || 0).toLocaleString('zh-CN')} 人 · 保留职位表原文与逐项资格初核</p></div><a class="button button-secondary" href="#/profile">查看个人资料</a></div>${beijingProfileForm(profile, majorCatalog)}${beijingTabs(currentTab, state)}${content}</div>`;
}
