import { normalizeNationalWorkspace, isNationalPositionId } from './storage.js';

const REQUIRED_HEADERS = [
  'department_code', 'position_code', 'applications', 'qualified',
  'source_name', 'source_url', 'source_updated_at', 'observed_at',
];

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

function compositeKey(departmentCode, positionCode) {
  return `${String(departmentCode ?? '').trim()}\u0000${String(positionCode ?? '').trim()}`;
}

function positionMap(positions) {
  return new Map((Array.isArray(positions) ? positions : [])
    .filter((position) => position?.departmentCode && position?.positionCode)
    .map((position) => [compositeKey(position.departmentCode, position.positionCode), position]));
}

function parseCount(value, label, errors) {
  const clean = String(value ?? '').trim();
  if (!clean) return null;
  if (!/^\d+$/u.test(clean) || !Number.isSafeInteger(Number(clean))) {
    errors.push(`${label}必须是非负整数，未知时留空。`);
    return null;
  }
  return Number(clean);
}

function validTimestamp(value, label, errors, optional = false) {
  const clean = String(value ?? '').trim();
  if (!clean && optional) return '';
  if (!clean || !Number.isFinite(Date.parse(clean))) {
    errors.push(`${label}必须填写有效时间${optional ? '或留空' : ''}。`);
    return '';
  }
  return clean;
}

export function parsePositionMonitorCsv(text, positions) {
  const parsed = parseCsvRows(text);
  if (parsed.syntaxError) return { rows: [], errors: [parsed.syntaxError] };
  if (!parsed.rows.length) return { rows: [], errors: ['CSV 文件为空。'] };

  const headers = parsed.rows[0].values.map((value) => value.trim());
  const headerPositions = new Map();
  headers.forEach((header, index) => {
    if (headerPositions.has(header)) headerPositions.set(header, -1);
    else headerPositions.set(header, index);
  });
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headerPositions.has(header));
  const duplicateHeaders = [...headerPositions.entries()].filter(([, index]) => index === -1).map(([header]) => header);
  const fileErrors = [];
  if (missingHeaders.length) fileErrors.push(`缺少列：${missingHeaders.join('、')}。`);
  if (duplicateHeaders.length) fileErrors.push(`列名重复：${duplicateHeaders.join('、')}。`);
  if (fileErrors.length) return { rows: [], errors: fileErrors };
  if (parsed.rows.length === 1) return { rows: [], errors: ['CSV 中没有职位数据行。'] };

  const byIdentity = positionMap(positions);
  const rows = parsed.rows.slice(1).map(({ line, values }) => {
    const errors = [];
    const get = (name) => String(values[headerPositions.get(name)] ?? '').trim();
    const departmentCode = get('department_code');
    const positionCode = get('position_code');
    if (!departmentCode) errors.push('缺少 department_code。');
    if (!positionCode) errors.push('缺少 position_code。');
    const key = compositeKey(departmentCode, positionCode);
    const applications = parseCount(get('applications'), 'applications', errors);
    const qualified = parseCount(get('qualified'), 'qualified', errors);
    const sourceName = get('source_name');
    const sourceUrl = get('source_url');
    const observedAt = validTimestamp(get('observed_at'), 'observed_at', errors);
    const sourceUpdatedAt = validTimestamp(get('source_updated_at'), 'source_updated_at', errors, true);
    if (!sourceName) errors.push('缺少 source_name。');
    if (!sourceUrl) errors.push('缺少 source_url。');
    else {
      try {
        const url = new URL(sourceUrl);
        if (!['http:', 'https:'].includes(url.protocol)) errors.push('source_url 只支持 http 或 https。');
      } catch {
        errors.push('source_url 不是有效链接。');
      }
    }
    const position = departmentCode && positionCode ? byIdentity.get(key) || null : null;
    return {
      line,
      departmentCode,
      positionCode,
      key,
      positionId: position?.id || '',
      position,
      applications,
      qualified,
      sourceName,
      sourceUrl,
      sourceUpdatedAt,
      observedAt,
      errors,
    };
  });
  return { rows, errors: [] };
}

export function previewPositionMonitorImport(parsed, workspace, positions) {
  const current = normalizeNationalWorkspace(workspace);
  const byIdentity = positionMap(positions);
  const rows = (Array.isArray(parsed?.rows) ? parsed.rows : []).map((row) => {
    const position = byIdentity.get(compositeKey(row.departmentCode, row.positionCode)) || row.position || null;
    const errors = [...(Array.isArray(row.errors) ? row.errors : [])];
    if (!position) errors.push('职位代码未匹配到当前职位库。');
    else if (!isNationalPositionId(position.id)) errors.push('匹配到的职位身份无效。');
    return { ...row, position, positionId: position?.id || '', errors };
  });

  const rowsByKey = new Map();
  for (const row of rows) {
    if (!row.departmentCode || !row.positionCode) continue;
    rowsByKey.set(row.key, [...(rowsByKey.get(row.key) || []), row]);
  }
  const duplicateKeys = [...rowsByKey.entries()].filter(([, sameKeyRows]) => sameKeyRows.length > 1);
  for (const [, sameKeyRows] of duplicateKeys) {
    for (const row of sameKeyRows) row.errors.push('CSV 中存在重复的部门代码与职位代码组合。');
  }

  const hasFormatErrors = (row) => row.errors.some((error) => !error.startsWith('职位代码未匹配')
    && !error.startsWith('CSV 中存在重复'));
  const favoriteIds = new Set(current.favorites.map((favorite) => favorite.positionId));
  const validRows = rows.filter((row) => !row.errors.length);
  const distinctValidIds = new Set(validRows.map((row) => row.positionId));
  const duplicateCount = duplicateKeys.length;
  const unknownCount = rows.filter((row) => row.errors.some((error) => error.startsWith('职位代码未匹配'))).length;
  const formatErrorCount = rows.filter(hasFormatErrors).length;
  const summary = {
    newFavorites: [...distinctValidIds].filter((id) => !favoriteIds.has(id)).length,
    existingFavorites: [...distinctValidIds].filter((id) => favoriteIds.has(id)).length,
    validSnapshots: validRows.length,
    duplicateKeys: duplicateCount,
    unknownPositions: unknownCount,
    formatErrors: formatErrorCount,
  };
  const fileErrors = Array.isArray(parsed?.errors) ? parsed.errors : [];
  return {
    rows,
    errors: fileErrors,
    summary,
    canImport: fileErrors.length === 0 && rows.length > 0 && rows.every((row) => row.errors.length === 0),
  };
}

export function applyPositionMonitorImport(workspace, preview, importedAt) {
  if (!preview?.canImport || !Array.isArray(preview.rows) || !preview.rows.length) {
    throw new Error('导入预览包含错误，无法写入。');
  }
  if (!Number.isFinite(Date.parse(importedAt))) throw new Error('导入时间无效。');
  const next = normalizeNationalWorkspace(workspace);
  const favoritesById = new Map(next.favorites.map((favorite) => [favorite.positionId, favorite]));
  const snapshots = { ...next.monitoringSnapshots };
  for (const row of preview.rows) {
    if (row.errors.length || !isNationalPositionId(row.positionId)) throw new Error('导入预览已失效，请重新选择 CSV。');
    const favorite = favoritesById.get(row.positionId) || {
      id: row.positionId, positionId: row.positionId, addedAt: importedAt, note: '', priority: 'normal',
    };
    favoritesById.set(row.positionId, { ...favorite, localOnly: false });
    snapshots[row.positionId] = {
      applications: row.applications,
      qualified: row.qualified,
      sourceName: row.sourceName,
      sourceUrl: row.sourceUrl,
      sourceUpdatedAt: row.sourceUpdatedAt,
      observedAt: row.observedAt,
      importedAt,
    };
  }
  return normalizeNationalWorkspace({
    ...next,
    favorites: [...favoritesById.values()],
    monitoringSnapshots: snapshots,
  });
}

function isSnapshotNewer(candidate, current) {
  if (!current) return true;
  const candidateObservedAt = Date.parse(candidate?.observedAt || '');
  const currentObservedAt = Date.parse(current?.observedAt || '');
  if (Number.isFinite(candidateObservedAt) && Number.isFinite(currentObservedAt)
    && candidateObservedAt !== currentObservedAt) return candidateObservedAt > currentObservedAt;
  if (Number.isFinite(candidateObservedAt) && !Number.isFinite(currentObservedAt)) return true;
  if (!Number.isFinite(candidateObservedAt) && Number.isFinite(currentObservedAt)) return false;
  const candidateImportedAt = Date.parse(candidate?.importedAt || '');
  const currentImportedAt = Date.parse(current?.importedAt || '');
  return Number.isFinite(candidateImportedAt)
    && (!Number.isFinite(currentImportedAt) || candidateImportedAt > currentImportedAt);
}

export function previewPositionMonitorCloudImport(remoteWorkspace, currentWorkspace, positions) {
  const remote = normalizeNationalWorkspace(remoteWorkspace);
  const current = normalizeNationalWorkspace(currentWorkspace);
  const knownPositionIds = new Set((Array.isArray(positions) ? positions : []).map((position) => position?.id).filter(Boolean));
  const remoteFavorites = new Map(remote.favorites.map((favorite) => [favorite.positionId, favorite]));
  const currentFavoriteIds = new Set(current.favorites.map((favorite) => favorite.positionId));
  const entries = Object.entries(remote.monitoringSnapshots);
  const rows = entries.filter(([positionId]) => knownPositionIds.has(positionId)).map(([positionId, snapshot]) => ({
    positionId,
    snapshot,
    favorite: remoteFavorites.get(positionId) || null,
  }));
  const snapshotsToUpdate = rows.filter((row) => isSnapshotNewer(row.snapshot, current.monitoringSnapshots[row.positionId])).length;
  const favoritesToAdd = rows.filter((row) => !currentFavoriteIds.has(row.positionId)).length;
  const summary = {
    validSnapshots: rows.length,
    snapshotsToUpdate,
    favoritesToAdd,
    unknownPositions: entries.length - rows.length,
  };
  return {
    rows,
    summary,
    canImport: snapshotsToUpdate > 0 || favoritesToAdd > 0,
  };
}

export function applyPositionMonitorCloudImport(workspace, preview) {
  if (!preview?.canImport || !Array.isArray(preview.rows)) throw new Error('云端预览没有可合并的新岗位数据。');
  const next = normalizeNationalWorkspace(workspace);
  const favoritesById = new Map(next.favorites.map((favorite) => [favorite.positionId, favorite]));
  const snapshots = { ...next.monitoringSnapshots };
  for (const row of preview.rows) {
    if (!isNationalPositionId(row.positionId) || !row.snapshot || typeof row.snapshot !== 'object') {
      throw new Error('云端岗位快照格式无效，请重新读取。');
    }
    const favorite = favoritesById.get(row.positionId);
    const remoteFavorite = row.favorite?.positionId === row.positionId ? row.favorite : null;
    favoritesById.set(row.positionId, favorite
      ? { ...favorite, localOnly: false }
      : {
        id: row.positionId,
        positionId: row.positionId,
        addedAt: remoteFavorite?.addedAt || '',
        note: remoteFavorite?.note || '',
        priority: ['high', 'normal', 'watch'].includes(remoteFavorite?.priority) ? remoteFavorite.priority : 'normal',
        localOnly: false,
      });
    if (isSnapshotNewer(row.snapshot, snapshots[row.positionId])) snapshots[row.positionId] = row.snapshot;
  }
  return normalizeNationalWorkspace({
    ...next,
    favorites: [...favoritesById.values()],
    monitoringSnapshots: snapshots,
  });
}

export function classifyFreshGraduateRequirement(position) {
  const text = `${position?.freshGraduateRaw || ''} ${position?.remarkRaw || ''}`.replace(/\s+/gu, ' ');
  if (!text.includes('应届')) return { key: 'not-mentioned', label: '原文未明确提及应届限制' };
  if (/非应届|不限应届|不限制应届|应届.{0,12}(?:不限|无需)|(?:不限|无需).{0,12}应届/u.test(text)) {
    return { key: 'review', label: '待人工核验' };
  }
  return { key: 'required', label: '职位原文明确要求应届' };
}

export function calculateCompetitionRatios(position, snapshot) {
  const plan = Number(position?.recruitCount);
  const validPlan = Number.isFinite(plan) && plan > 0;
  const ratio = (count) => validPlan && Number.isSafeInteger(count) && count >= 0 ? count / plan : null;
  return {
    applicationsRatio: ratio(snapshot?.applications),
    qualifiedRatio: ratio(snapshot?.qualified),
  };
}
