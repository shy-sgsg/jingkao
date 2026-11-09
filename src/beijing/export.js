import { evaluateBeijingEligibility } from './eligibility.js';

function beijingCsvCell(value) {
  return `"${String(value ?? '').replace(/"/gu, '""')}"`;
}

export function beijingPositionsToCsv(positions, profile = {}, majorCatalog = [], workspace = {}) {
  const items = Array.isArray(positions) ? positions : [];
  const rawHeaders = Object.keys(items[0]?.rawFields || {});
  const headers = [...rawHeaders, '个人资格初核', '个人备注'];
  const rows = [headers.map(beijingCsvCell).join(',')];
  for (const position of items) {
    const eligibility = evaluateBeijingEligibility(position, profile, majorCatalog);
    const note = workspace?.notes?.[position.id]
      || workspace?.favorites?.find((item) => item.positionId === position.id)?.note || '';
    rows.push([
      ...rawHeaders.map((field) => position.rawFields?.[field] ?? ''),
      eligibility.label,
      note,
    ].map(beijingCsvCell).join(','));
  }
  return `\uFEFF${rows.join('\r\n')}`;
}

export function beijingComparisonToCsv(positions, profile = {}, majorCatalog = [], workspace = {}) {
  return beijingPositionsToCsv(positions, profile, majorCatalog, workspace);
}
