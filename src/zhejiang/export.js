import { evaluateZhejiangEligibility } from './eligibility.js';

function zhejiangCsvCell(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/gu, '""')}"`;
}

export function zhejiangPositionsToCsv(positions, profile = {}, majorCatalog = [], workspace = {}) {
  const headers = [
    '工作表', '职位代码', '招录机关名称', '职位名称', '职位属性', '职位大类', '职位小类',
    '考录人数', '学历要求', '学位要求', '现有身份要求', '政治面貌要求', '年龄要求',
    '专业要求', '职位简介', '是否加试心理测评', '是否体能测评', '是否加试专业', '备注',
    '资格初核', '个人备注',
  ];
  const fields = [
    'sourceSheet', 'positionCode', 'departmentName', 'positionTitle', 'positionAttribute',
    'positionType', 'positionSubType', 'recruitCount', 'educationRaw', 'degreeRaw',
    'existingIdentityRaw', 'politicalStatusRaw', 'ageRaw', 'majorRaw', 'positionDescription',
    'psychologicalTestRaw', 'physicalTestRaw', 'professionalTestRaw', 'remarkRaw',
  ];
  const rows = [headers.map(zhejiangCsvCell).join(',')];
  for (const position of Array.isArray(positions) ? positions : []) {
    const eligibility = evaluateZhejiangEligibility(position, profile, majorCatalog);
    const note = workspace?.notes?.[position.id] || workspace?.favorites?.find((item) => item.positionId === position.id)?.note || '';
    rows.push([...fields.map((key) => position[key] ?? ''), eligibility.label, note].map(zhejiangCsvCell).join(','));
  }
  return `\uFEFF${rows.join('\r\n')}`;
}

export function zhejiangComparisonToCsv(positions, profile = {}, majorCatalog = [], workspace = {}) {
  return zhejiangPositionsToCsv(positions, profile, majorCatalog, workspace);
}
