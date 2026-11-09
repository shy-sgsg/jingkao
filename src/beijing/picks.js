import { isBeijingPositionId, normalizeBeijingWorkspace } from './storage.js';

const EXPECTED_PICK_COUNT = 60;

function parseCsvRows(text) {
  const input = String(text ?? '').replace(/^\uFEFF/u, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let afterQuote = false;
  let line = 1;
  let rowLine = 1;
  let syntaxError = '';

  const finishField = () => {
    row.push(field);
    field = '';
    afterQuote = false;
  };
  const finishRow = () => {
    finishField();
    if (row.some((value) => value.trim() !== '')) rows.push({ line: rowLine, values: row });
    row = [];
    rowLine = line;
  };

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (inQuotes) {
      if (char === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
        afterQuote = true;
      } else {
        field += char;
        if (char === '\n' || (char === '\r' && input[index + 1] !== '\n')) line += 1;
      }
      continue;
    }

    if (char === ',') {
      finishField();
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[index + 1] === '\n') index += 1;
      line += 1;
      finishRow();
    } else if (char === '"') {
      if (field.length || afterQuote) {
        syntaxError = `第 ${line} 行引号位置无效。`;
        break;
      }
      inQuotes = true;
    } else if (afterQuote && !/\s/u.test(char)) {
      syntaxError = `第 ${line} 行引号后存在无效内容。`;
      break;
    } else if (!afterQuote) {
      field += char;
    }
  }

  if (!syntaxError && inQuotes) syntaxError = `第 ${rowLine} 行的引号未闭合。`;
  if (!syntaxError && (field.length || row.length)) finishRow();
  return { rows, syntaxError };
}

function positionMap(positions) {
  const byCode = new Map();
  for (const position of Array.isArray(positions) ? positions : []) {
    const code = String(position?.positionCode || '').trim();
    if (!code || !isBeijingPositionId(position.id)) continue;
    byCode.set(code, [...(byCode.get(code) || []), position]);
  }
  return byCode;
}

export function parseBeijingPicksCsv(text, positions) {
  const parsed = parseCsvRows(text);
  if (parsed.syntaxError) return { rows: [], errors: [parsed.syntaxError] };
  if (!parsed.rows.length) return { rows: [], errors: ['CSV 文件为空。'] };

  const headers = parsed.rows[0].values.map((value) => value.trim());
  const indexes = new Map();
  const duplicateHeaders = new Set();
  headers.forEach((header, index) => {
    if (indexes.has(header)) duplicateHeaders.add(header);
    else indexes.set(header, index);
  });
  const errors = [];
  if (!indexes.has('职位代码')) errors.push('CSV 缺少“职位代码”列。');
  if (duplicateHeaders.size) errors.push(`CSV 存在重复列名：${[...duplicateHeaders].join('、')}。`);
  if (errors.length) return { rows: [], errors };
  if (parsed.rows.length === 1) return { rows: [], errors: ['CSV 中没有职位数据行。'] };

  const byCode = positionMap(positions);
  const codeIndex = indexes.get('职位代码');
  const rows = parsed.rows.slice(1).map(({ line, values }) => {
    const code = String(values[codeIndex] ?? '').trim();
    const matches = byCode.get(code) || [];
    const rowErrors = [];
    if (!code) rowErrors.push('缺少职位代码。');
    else if (matches.length === 0) rowErrors.push('职位代码未匹配到 2027 北京市考职位表。');
    else if (matches.length > 1) rowErrors.push('职位代码在当前职位表中不唯一，无法安全匹配。');
    const position = matches.length === 1 ? matches[0] : null;
    return { line, code, positionId: position?.id || '', position, errors: rowErrors };
  });

  const rowsByCode = new Map();
  for (const row of rows) {
    if (!row.code) continue;
    rowsByCode.set(row.code, [...(rowsByCode.get(row.code) || []), row]);
  }
  for (const sameCodeRows of rowsByCode.values()) {
    if (sameCodeRows.length < 2) continue;
    for (const row of sameCodeRows) row.errors.push('CSV 中存在重复的职位代码。');
  }

  return { rows, errors: [] };
}

export function previewBeijingPicksImport(parsed, workspace, positions) {
  const current = normalizeBeijingWorkspace(workspace);
  const byId = new Map((Array.isArray(positions) ? positions : []).map((position) => [position.id, position]));
  const rows = (Array.isArray(parsed?.rows) ? parsed.rows : []).map((row) => {
    const position = byId.get(row.positionId) || row.position || null;
    const errors = [...(Array.isArray(row.errors) ? row.errors : [])];
    if (!position) errors.push('职位代码未匹配到当前职位库。');
    else if (!isBeijingPositionId(position.id)) errors.push('匹配到的职位身份无效。');
    return { ...row, position, positionId: position?.id || '', errors };
  });

  const validRows = rows.filter((row) => row.errors.length === 0);
  const positionIds = validRows.map((row) => row.positionId);
  const distinctPositionIds = [...new Set(positionIds)];
  const duplicateCount = rows.filter((row) => row.errors.some((error) => error.includes('重复'))).length;
  const unknownCount = rows.filter((row) => row.errors.some((error) => error.includes('未匹配'))).length;
  const formatErrorCount = rows.filter((row) => row.errors.some((error) => !error.includes('未匹配'))).length;
  const fileErrors = Array.isArray(parsed?.errors) ? parsed.errors : [];
  const canImport = fileErrors.length === 0
    && rows.length === EXPECTED_PICK_COUNT
    && validRows.length === EXPECTED_PICK_COUNT
    && distinctPositionIds.length === EXPECTED_PICK_COUNT;
  const errors = [...fileErrors];
  if (!fileErrors.length && rows.length !== EXPECTED_PICK_COUNT) {
    errors.push(`当前清单应有 ${EXPECTED_PICK_COUNT} 个职位，文件中识别到 ${rows.length} 行。`);
  }

  return {
    rows,
    positionIds: distinctPositionIds,
    errors,
    summary: {
      totalRows: rows.length,
      validPositions: distinctPositionIds.length,
      existingPositions: distinctPositionIds.filter((id) => current.myPicks.includes(id)).length,
      duplicateRows: duplicateCount,
      unknownPositions: unknownCount,
      formatErrors: formatErrorCount,
    },
    canImport,
  };
}

export function applyBeijingPicksImport(workspace, preview) {
  const ids = Array.isArray(preview?.positionIds) ? preview.positionIds : [];
  if (!preview?.canImport || !Array.isArray(preview.positionIds)
    || ids.length !== EXPECTED_PICK_COUNT
    || new Set(ids).size !== EXPECTED_PICK_COUNT
    || ids.some((id) => !isBeijingPositionId(id))) {
    throw new Error('选岗导入预览无效；请修正 CSV 后重新预览。');
  }
  return normalizeBeijingWorkspace({ ...normalizeBeijingWorkspace(workspace), myPicks: ids });
}
