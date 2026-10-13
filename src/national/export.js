const EXPORT_FIELDS = [
  ['部门', 'departmentName'], ['职位', 'positionTitle'], ['职位代码', 'positionCode'],
  ['工作地点', 'workLocation'], ['招录人数', 'recruitCount'], ['专业', 'majorRaw'],
  ['学历', 'educationRaw'], ['学位', 'degreeRaw'], ['政治面貌', 'politicalStatusRaw'],
  ['基层工作最低年限', 'experienceRaw'], ['备注', 'remarkRaw'], ['资格初步判断', 'eligibilitySummary'], ['个人备注', 'personalNote'],
];

function escapeCsv(value) {
  let text = String(value ?? '');
  if (/^[\u0000-\u0020]*[=+\-@]/u.test(text)) text = `'${text}`;
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function nationalPositionsToCsv(positions) {
  const rows = [EXPORT_FIELDS.map(([label]) => escapeCsv(label)).join(',')];
  for (const position of Array.isArray(positions) ? positions : []) {
    rows.push(EXPORT_FIELDS.map(([, key]) => escapeCsv(position[key])).join(','));
  }
  return `\uFEFF${rows.join('\r\n')}`;
}

export function nationalComparisonToCsv(positions) {
  return nationalPositionsToCsv(positions);
}
