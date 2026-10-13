import test from 'node:test';
import assert from 'node:assert/strict';
import { renderNationalWorkspace } from '../src/national/view.js';
import { normalizeNationalWorkspace } from '../src/national/storage.js';

const rawFields = Object.fromEntries([
  '部门代码', '部门名称', '用人司局', '机构性质', '招考职位', '职位属性', '职位分布', '职位简介',
  '职位代码', '机构层级', '考试类别', '招考人数', '专业', '学历', '学位', '政治面貌',
  '基层工作最低年限', '服务基层项目工作经历', '是否在面试阶段组织专业能力测试', '面试人员比例',
  '工作地点', '落户地点', '备注', '部门网站', '咨询电话1', '咨询电话2', '咨询电话3',
].map((field) => [field, field === '备注' ? '<script>alert(1)</script>' : `原文${field}`]));

function position(index, overrides = {}) {
  const code = String(index).padStart(4, '0');
  return {
    id: `national:2027:000001:${code}`, examType: 'national', year: 2027,
    departmentCode: '000001', departmentName: `测试部门 ${index}`, organizationName: '测试司局',
    positionCode: code, positionTitle: `测试职位 ${index}`, sourceSheet: '中央党群机关',
    workProvince: '湖北省', workCity: '武汉市', workDistrict: '武昌区', workLocation: '湖北省武汉市武昌区',
    recruitCount: index, majorRaw: '本科：1204公共管理类', educationRaw: '本科及以上',
    degreeRaw: '学士', politicalStatusRaw: '不限', experienceRaw: '无限制',
    serviceProjectRaw: '无限制', remarkRaw: '无', examCategory: '综合管理类',
    specialRequirementStatus: 'none', rawFields, ...overrides,
  };
}

test('national desktop results expose table headings and paginate instead of rendering all 19K records', () => {
  const html = renderNationalWorkspace({
    positions: Array.from({ length: 31 }, (_, index) => position(index + 1)),
    workspace: normalizeNationalWorkspace({}), tab: 'positions', profile: {},
  });
  assert.equal((html.match(/class="national-position-row"/gu) || []).length, 30);
  assert.match(html, /<th scope="col">招录部门<\/th>/u);
  assert.match(html, /<th scope="col">职位名称<\/th>/u);
  assert.match(html, /<th scope="col">工作地点<\/th>/u);
  assert.match(html, /<th scope="col">计划招录<\/th>/u);
  assert.match(html, /<th scope="col">学历要求<\/th>/u);
  assert.match(html, /<th scope="col">专业匹配<\/th>/u);
  assert.match(html, /<th scope="col">综合资格<\/th>/u);
  assert.match(html, /<th scope="col">备注提示<\/th>/u);
  assert.match(html, /<strong>31<\/strong><span> \/ 31 个职位符合条件/u);
  assert.match(html, /下一页/u);
});

test('public-administration text match displays a preliminary major and overall qualification', () => {
  const html = renderNationalWorkspace({
    positions: [position(1, { majorRaw: '本科：管理学类相关专业', remarkRaw: '职位备注中的条件需核对。' })],
    workspace: normalizeNationalWorkspace({ visibleColumns: ['majorMatch', 'eligibility'] }),
    profile: {
      degree: '本科', undergraduateMajor: '公共管理', undergraduateMajorCode: '120401',
      degreeTitle: '学士学位', politicalStatus: '群众', grassrootsYears: '0',
    },
  });

  const preliminaryBadges = html.match(/class="national-badge is-initialMatch">初步符合<\/span>/gu) || [];
  assert.ok(preliminaryBadges.length >= 2);
});

test('position results show removable filter chips, live summary counts, and column controls', () => {
  const positions = [
    position(1, { workProvince: '湖北省' }),
    position(2, { workProvince: '河南省', remarkRaw: '需满足特殊资格条件。', specialRequirementStatus: 'manual-review' }),
  ];
  const profile = {
    degree: '本科', undergraduateMajor: '行政管理', undergraduateMajorCode: '120402',
    degreeTitle: '学士学位', politicalStatus: '群众', grassrootsYears: '0',
  };
  const html = renderNationalWorkspace({
    positions,
    workspace: normalizeNationalWorkspace({
      filters: { workProvinces: ['湖北省'], minRecruitCount: 2, excludeNeedsReview: true },
      visibleColumns: ['departmentName', 'positionTitle', 'workLocation', 'recruitCount', 'educationRaw', 'majorMatch', 'eligibility', 'remarkHint', 'actions'],
    }),
    profile,
  });
  assert.match(html, /全部职位[\s\S]*2/u);
  assert.match(html, /地区内[\s\S]*1/u);
  assert.match(html, /专业初步匹配/u);
  assert.match(html, /需要人工核验/u);
  assert.match(html, /data-action="national-remove-filter" data-filter-key="workProvinces" data-filter-value="湖北省"/u);
  assert.match(html, /data-action="national-remove-filter" data-filter-key="minRecruitCount"/u);
  assert.match(html, /可能隐藏 0 个/u);
  assert.match(html, /data-filter-key="excludeNeedsReview"/u);
  assert.match(html, /class="national-column-settings"/u);
  assert.match(html, /name="visibleColumns" value="positionCode"/u);
});

test('saved filters include an inline rename form', () => {
  const html = renderNationalWorkspace({
    positions: [position(1)],
    workspace: normalizeNationalWorkspace({ savedFilters: [{ id: 'saved-1', name: '湖北岗位', filters: {} }] }),
    profile: {},
  });
  assert.match(html, /data-action="national-apply-saved-filter"/u);
  assert.match(html, /data-form="national-rename-filter"/u);
  assert.match(html, /name="name" value="湖北岗位"/u);
});

test('position details contain every raw field and escape workbook text', () => {
  const html = renderNationalWorkspace({ positions: [position(1)], workspace: normalizeNationalWorkspace({}), profile: {} });
  assert.equal((html.match(/class="national-raw-field"/gu) || []).length, 27);
  assert.match(html, /查看资格判断与全部 27 项职位表原文/u);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/u);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/u);
});

test('filter dimensions render multi-select controls and show saved selections', () => {
  const html = renderNationalWorkspace({
    positions: [position(1)],
    workspace: normalizeNationalWorkspace({ filters: { sourceSheets: ['中央党群机关'], qualificationStatuses: ['initialMatch'] } }),
    profile: {},
  });
  assert.match(html, /data-filter-name="sourceSheets"/u);
  assert.match(html, /name="sourceSheets" value="中央党群机关" checked/u);
  assert.match(html, /data-filter-name="qualificationStatuses"/u);
  assert.match(html, /name="qualificationStatuses" value="initialMatch" checked/u);
});

test('the preliminary-match checkbox is clearly labeled as a quick filter', () => {
  const html = renderNationalWorkspace({ positions: [position(1)], profile: {} });
  assert.match(html, /快速筛选：只看初步符合岗位/u);
});

test('gender exclusion and public-administration preset expose their saved active states', () => {
  const html = renderNationalWorkspace({
    positions: [position(1)],
    workspace: normalizeNationalWorkspace({ filters: { excludeMaleOnly: true, majorPreset: 'public-administration' } }),
    profile: {},
  });

  assert.match(html, /name="excludeMaleOnly" type="checkbox" checked/u);
  assert.match(html, /data-action="national-toggle-major-preset"[^>]*aria-pressed="true"/u);
  assert.match(html, /公共管理专业一键筛选/u);
  assert.match(html, /公共管理相关专业/u);
});

test('region selectors narrow cities by province and districts by selected cities', () => {
  const alternate = position(2, {
    id: 'national:2027:000002:0002', workProvince: '河南省', workCity: '郑州市',
    workDistrict: '中原区', workLocation: '河南省郑州市中原区',
  });
  const positions = [position(1), alternate];
  const cityOptions = renderNationalWorkspace({
    positions,
    workspace: normalizeNationalWorkspace({ filters: { workProvinces: ['湖北省'] } }),
    profile: {},
  });
  assert.match(cityOptions, /name="workCities" value="武汉市"/u);
  assert.doesNotMatch(cityOptions, /name="workCities" value="郑州市"/u);

  const districtOptions = renderNationalWorkspace({
    positions,
    workspace: normalizeNationalWorkspace({ filters: { workProvinces: ['湖北省'], workCities: ['武汉市'] } }),
    profile: {},
  });
  assert.match(districtOptions, /name="workDistricts" value="武昌区"/u);
  assert.doesNotMatch(districtOptions, /name="workDistricts" value="中原区"/u);
});

test('comparison tab includes only national identifiers and marks differing source fields', () => {
  const first = position(1, { positionTitle: '岗位甲', educationRaw: '本科及以上' });
  const second = position(2, { positionTitle: '岗位乙', educationRaw: '仅限本科', workProvince: '河南省' });
  const workspace = normalizeNationalWorkspace({ comparisons: [first.id, second.id] });
  const html = renderNationalWorkspace({ positions: [first, second], workspace, profile: {}, tab: 'comparison' });
  assert.match(html, /并排比较 2/u);
  assert.match(html, /class="has-difference"/u);
  assert.match(html, /本科及以上/u);
  assert.match(html, /仅限本科/u);
  assert.doesNotMatch(html, /231260001/u);
});
