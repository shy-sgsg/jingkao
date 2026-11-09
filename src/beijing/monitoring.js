import { isBeijingPositionId, normalizeBeijingWorkspace } from './storage.js';

const BEIJING_MONITOR_REQUIRED_HEADERS = [
  'position_code', 'applications', 'qualified', 'source_name', 'source_url', 'source_updated_at', 'observed_at',
];
const METRIC_KEYS = ['applications', 'qualified'];
const OFFICIAL_HOST_SUFFIXES = ['beijing.gov.cn'];
export const BEIJING_REGISTRATION_START = '2026-11-12T09:00:00+08:00';

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value, limit = 240) {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim().slice(0, limit) : '';
}

function parseCsvRows(value) {
  const input = String(value ?? '').replace(/^\uFEFF/u, '');
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
    if (row.some((cell) => cell.trim())) rows.push({ line: rowLine, values: row });
    row = [];
    rowLine = line;
  };

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (inQuotes) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
        afterQuote = true;
      } else {
        field += character;
        if (character === '\n' || (character === '\r' && input[index + 1] !== '\n')) line += 1;
      }
      continue;
    }

    if (character === ',') finishField();
    else if (character === '\n' || character === '\r') {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      line += 1;
      finishRow();
    } else if (character === '"') {
      if (field.length || afterQuote) {
        syntaxError = `第 ${line} 行引号位置无效。`;
        break;
      }
      inQuotes = true;
    } else if (afterQuote && !/\s/u.test(character)) {
      syntaxError = `第 ${line} 行引号后存在无效内容。`;
      break;
    } else if (!afterQuote) field += character;
  }

  if (!syntaxError && inQuotes) syntaxError = `第 ${rowLine} 行的引号未闭合。`;
  if (!syntaxError && (field.length || row.length)) finishRow();
  return { rows, syntaxError };
}

function officialUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && OFFICIAL_HOST_SUFFIXES.some((suffix) =>
      url.hostname === suffix || url.hostname.endsWith(`.${suffix}`)) ? url.href : '';
  } catch {
    return '';
  }
}

function parseCount(value, label, errors) {
  const clean = String(value ?? '').trim();
  if (!clean) return null;
  if (!/^\d+$/u.test(clean) || !Number.isSafeInteger(Number(clean))) {
    errors.push(`${label}必须是非负整数；未知时留空。`);
    return null;
  }
  return Number(clean);
}

function parseTimestamp(value, label, errors, optional = false) {
  const clean = String(value ?? '').trim();
  if (!clean && optional) return '';
  if (!clean || !Number.isFinite(Date.parse(clean))) {
    errors.push(`${label}必须填写有效时间${optional ? '或留空' : ''}。`);
    return '';
  }
  return clean;
}

function codeMap(positions) {
  const byCode = new Map();
  for (const position of Array.isArray(positions) ? positions : []) {
    const code = text(position?.positionCode, 32);
    if (!code || !isBeijingPositionId(position?.id)) continue;
    byCode.set(code, [...(byCode.get(code) || []), position]);
  }
  return byCode;
}

function parsedRows(textValue, positions, myPicks, now = Date.now()) {
  const parsed = parseCsvRows(textValue);
  if (parsed.syntaxError) return { rows: [], errors: [parsed.syntaxError] };
  if (!parsed.rows.length) return { rows: [], errors: ['CSV 文件为空。'] };

  const headers = parsed.rows[0].values.map((header) => header.trim());
  const indexByHeader = new Map();
  for (const [index, header] of headers.entries()) {
    if (indexByHeader.has(header)) indexByHeader.set(header, -1);
    else indexByHeader.set(header, index);
  }
  const missing = BEIJING_MONITOR_REQUIRED_HEADERS.filter((header) => !indexByHeader.has(header));
  const duplicate = [...indexByHeader.entries()].filter(([, index]) => index < 0).map(([header]) => header);
  const fileErrors = [];
  if (missing.length) fileErrors.push(`缺少列：${missing.join('、')}。`);
  if (duplicate.length) fileErrors.push(`列名重复：${duplicate.join('、')}。`);
  if (fileErrors.length) return { rows: [], errors: fileErrors };
  if (parsed.rows.length === 1) return { rows: [], errors: ['CSV 中没有职位数据行。'] };

  const positionsByCode = codeMap(positions);
  const pickedIds = new Set(Array.isArray(myPicks) ? myPicks : []);
  const rows = parsed.rows.slice(1).map(({ line, values }) => {
    const errors = [];
    const get = (name) => String(values[indexByHeader.get(name)] ?? '').trim();
    const positionCode = get('position_code');
    const matches = positionsByCode.get(positionCode) || [];
    const position = matches.length === 1 ? matches[0] : null;
    if (!positionCode) errors.push('缺少 position_code。');
    else if (!matches.length) errors.push('职位代码未匹配到 2027 北京职位表。');
    else if (matches.length > 1) errors.push('职位代码在当前职位表中不唯一。');
    else if (!pickedIds.has(position.id)) errors.push('该职位不在“我的选岗”清单中。');

    const applications = parseCount(get('applications'), 'applications', errors);
    const qualified = parseCount(get('qualified'), 'qualified', errors);
    if (applications === null && qualified === null) errors.push('报名人数和过审人数至少填写一项。');
    const sourceName = get('source_name');
    const sourceUrl = officialUrl(get('source_url'));
    if (!sourceName) errors.push('缺少 source_name。');
    if (!sourceUrl) errors.push('source_url 必须是北京市政府网站的 HTTPS 链接。');
    const observedAt = parseTimestamp(get('observed_at'), 'observed_at', errors);
    if (observedAt && Date.parse(observedAt) < Date.parse(BEIJING_REGISTRATION_START)) {
      errors.push('仅接受 2027 年报名开始后的官方观测时间，避免把往年数据写入本年度监控。');
    } else if (observedAt && Date.parse(observedAt) > Number(now)) {
      errors.push('observed_at 不能晚于当前时间。');
    }
    const sourceUpdatedAt = parseTimestamp(get('source_updated_at'), 'source_updated_at', errors, true);
    return {
      line,
      positionCode,
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

  const byCode = new Map();
  for (const row of rows) byCode.set(row.positionCode, [...(byCode.get(row.positionCode) || []), row]);
  for (const sameCodeRows of byCode.values()) {
    if (sameCodeRows.length < 2) continue;
    for (const row of sameCodeRows) row.errors.push('CSV 中存在重复的职位代码。');
  }
  return { rows, errors: [] };
}

function isNewerMetric(candidate, current) {
  if (!current) return true;
  const candidateAt = Date.parse(candidate?.observedAt || '');
  const currentAt = Date.parse(current?.observedAt || '');
  if (Number.isFinite(candidateAt) && Number.isFinite(currentAt) && candidateAt !== currentAt) return candidateAt > currentAt;
  if (Number.isFinite(candidateAt) && !Number.isFinite(currentAt)) return true;
  if (!Number.isFinite(candidateAt) && Number.isFinite(currentAt)) return false;
  if (candidate?.sourceType !== current?.sourceType) return candidate?.sourceType === 'official';
  const candidateImportedAt = Date.parse(candidate?.importedAt || '');
  const currentImportedAt = Date.parse(current?.importedAt || '');
  return Number.isFinite(candidateImportedAt) && (!Number.isFinite(currentImportedAt) || candidateImportedAt > currentImportedAt);
}

function metricRecord(value, source, importedAt) {
  return {
    value,
    sourceType: source.sourceType,
    sourceName: text(source.sourceName),
    sourceUrl: text(source.sourceUrl, 2000),
    sourceUpdatedAt: text(source.sourceUpdatedAt, 120),
    observedAt: text(source.observedAt, 120),
    importedAt,
  };
}

function mergeMetrics(snapshots, positionId, incoming, importedAt) {
  const current = snapshots[positionId] || {};
  const next = { ...current };
  for (const key of METRIC_KEYS) {
    if (!Number.isSafeInteger(incoming[key]) || incoming[key] < 0) continue;
    const candidate = metricRecord(incoming[key], incoming, importedAt);
    if (isNewerMetric(candidate, current[key])) next[key] = candidate;
  }
  if (Object.keys(next).length) snapshots[positionId] = next;
}

export function parseBeijingMonitorCsv(csvText, positions, myPicks, now = Date.now()) {
  return parsedRows(csvText, positions, myPicks, now);
}

export function previewBeijingMonitorImport(parsed, workspace) {
  const current = normalizeBeijingWorkspace(workspace);
  const pickedIds = new Set(current.myPicks);
  const rows = (Array.isArray(parsed?.rows) ? parsed.rows : []).map((row) => ({
    ...row,
    errors: [...(Array.isArray(row.errors) ? row.errors : [])],
    position: row?.positionId && pickedIds.has(row.positionId) ? row.position : null,
  }));
  const validRows = rows.filter((row) => row.errors.length === 0);
  const snapshots = current.monitoringSnapshots;
  const updates = validRows.reduce((count, row) => count + METRIC_KEYS.filter((key) => {
    if (!Number.isSafeInteger(row[key])) return false;
    const candidate = metricRecord(row[key], { ...row, sourceType: 'official' }, '');
    return isNewerMetric(candidate, snapshots[row.positionId]?.[key]);
  }).length, 0);
  return {
    rows,
    errors: Array.isArray(parsed?.errors) ? parsed.errors : [],
    summary: {
      totalRows: rows.length,
      validRows: validRows.length,
      metricsToUpdate: updates,
      missingMetrics: validRows.reduce((count, row) => count + METRIC_KEYS.filter((key) => !Number.isSafeInteger(row[key])).length, 0),
      duplicateRows: rows.filter((row) => row.errors.some((error) => error.includes('重复'))).length,
      unknownPositions: rows.filter((row) => row.errors.some((error) => error.includes('未匹配'))).length,
    },
    canImport: !(parsed?.errors?.length) && rows.length > 0 && validRows.length === rows.length && updates > 0,
  };
}

export function applyBeijingMonitorImport(workspace, preview, importedAt) {
  if (!preview?.canImport || !Array.isArray(preview.rows) || !preview.rows.length
    || !Number.isFinite(Date.parse(importedAt))) throw new Error('官方监控 CSV 预览无效，请重新导入。');
  const next = normalizeBeijingWorkspace(workspace);
  const pickedIds = new Set(next.myPicks);
  const monitoringSnapshots = { ...next.monitoringSnapshots };
  for (const row of preview.rows) {
    if (row.errors?.length || !isBeijingPositionId(row.positionId) || !pickedIds.has(row.positionId)
      || !officialUrl(row.sourceUrl) || !Number.isFinite(Date.parse(row.observedAt))) {
      throw new Error('官方监控预览已失效，清单或岗位数据已变化，请重新导入。');
    }
    mergeMetrics(monitoringSnapshots, row.positionId, { ...row, sourceType: 'official' }, importedAt);
  }
  return normalizeBeijingWorkspace({ ...next, monitoringSnapshots });
}

function publicSnapshotUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === 'ah.huatu.com' ? parsed.href : '';
  } catch {
    return '';
  }
}

export function previewBeijingMonitorRefresh(snapshot, workspace, positions) {
  const current = normalizeBeijingWorkspace(workspace);
  const allPositions = Array.isArray(positions) ? positions : [];
  const byCode = codeMap(allPositions);
  const sourceRecords = Array.isArray(snapshot?.records) ? snapshot.records : [];
  const sourceByCode = new Map(sourceRecords.map((record) => [text(record?.positionCode, 32), record]));
  const expectedCount = Number.isSafeInteger(snapshot?.expectedPositionCount) ? snapshot.expectedPositionCount : -1;
  const catalogCodes = allPositions.map((position) => text(position?.positionCode, 32)).filter(Boolean);
  const catalogUnique = new Set(catalogCodes);
  const complete = expectedCount === allPositions.length
    && sourceRecords.length === expectedCount
    && catalogUnique.size === allPositions.length
    && catalogCodes.every((code) => sourceByCode.has(code));
  if (!complete) {
    return {
      rows: [],
      errors: ['华图快照职位覆盖与本地 2027 北京职位表不一致；本机数据未更改。'],
      summary: { selectedPositions: current.myPicks.length, matched: 0, missing: current.myPicks.length, metricsToUpdate: 0 },
      canImport: false,
    };
  }

  const positionById = new Map(allPositions.map((position) => [position.id, position]));
  const rows = current.myPicks.flatMap((positionId) => {
    const position = positionById.get(positionId);
    if (!position) return [];
    const source = sourceByCode.get(text(position.positionCode, 32));
    const sourceUrl = publicSnapshotUrl(source?.sourceUrl);
    if (!source || !sourceUrl) return [{ positionId, position, source: null, incoming: {}, updates: [], errors: ['公开来源记录缺失或来源域名无效。'] }];
    const incoming = {
      sourceType: 'third-party',
      sourceName: '华图教育（第三方）',
      sourceUrl,
      sourceUpdatedAt: text(snapshot.sourceUpdatedAt, 120),
      observedAt: text(snapshot.fetchedAt, 120),
    };
    const errors = [];
    for (const key of METRIC_KEYS) {
      const count = source[key];
      if (count !== null && count !== undefined && (!Number.isSafeInteger(count) || count < 0)) errors.push(`${key} 数值无效。`);
      else incoming[key] = count ?? null;
    }
    const updates = METRIC_KEYS.filter((key) => Number.isSafeInteger(incoming[key])
      && isNewerMetric(metricRecord(incoming[key], incoming, ''), current.monitoringSnapshots[positionId]?.[key]));
    return [{ positionId, position, source, incoming, updates, errors }];
  });
  const errors = rows.flatMap((row) => row.errors);
  const matched = rows.filter((row) => row.source).length;
  const metricsToUpdate = rows.reduce((total, row) => total + row.updates.length, 0);
  return {
    rows,
    errors,
    requestId: text(snapshot.requestId, 80),
    fetchedAt: text(snapshot.fetchedAt, 120),
    sourceUpdatedAt: text(snapshot.sourceUpdatedAt, 120),
    preRegistration: snapshot.preRegistration === true,
    summary: {
      selectedPositions: current.myPicks.length,
      matched,
      missing: current.myPicks.length - matched,
      metricsToUpdate,
      missingMetrics: rows.reduce((total, row) => total + METRIC_KEYS.filter((key) => row.incoming?.[key] === null).length, 0),
    },
    canImport: errors.length === 0 && metricsToUpdate > 0,
  };
}

export function applyBeijingMonitorRefresh(workspace, preview, importedAt) {
  if (!preview?.canImport || !Array.isArray(preview.rows) || !preview.rows.length
    || !Number.isFinite(Date.parse(importedAt))) throw new Error('华图监控预览无效，请重新获取数据。');
  const next = normalizeBeijingWorkspace(workspace);
  const pickedIds = new Set(next.myPicks);
  const monitoringSnapshots = { ...next.monitoringSnapshots };
  for (const row of preview.rows) {
    if (row.errors?.length || !isBeijingPositionId(row.positionId) || !pickedIds.has(row.positionId)
      || !row.incoming || !publicSnapshotUrl(row.incoming.sourceUrl)
      || !Number.isFinite(Date.parse(row.incoming.observedAt))) {
      throw new Error('华图监控预览已失效，请重新获取数据。');
    }
    mergeMetrics(monitoringSnapshots, row.positionId, row.incoming, importedAt);
  }
  return normalizeBeijingWorkspace({ ...next, monitoringSnapshots });
}

export function calculateBeijingMonitorRatios(position, snapshot) {
  const plan = Number(position?.recruitCount);
  const validPlan = Number.isFinite(plan) && plan > 0;
  const ratio = (metric) => validPlan && Number.isSafeInteger(metric?.value) && metric.value >= 0
    ? metric.value / plan : null;
  return {
    applicationsRatio: ratio(snapshot?.applications),
    qualifiedRatio: ratio(snapshot?.qualified),
  };
}

function monitorValue(row, key) {
  if (key === 'applications') return Number.isSafeInteger(row.snapshot?.applications?.value) ? row.snapshot.applications.value : null;
  if (key === 'qualified') return Number.isSafeInteger(row.snapshot?.qualified?.value) ? row.snapshot.qualified.value : null;
  return row.ratios[key] ?? null;
}

export function filterAndSortBeijingMonitorRows(positions, workspace) {
  const current = normalizeBeijingWorkspace(workspace);
  const filters = current.monitorFilters;
  const positionById = new Map((Array.isArray(positions) ? positions : []).map((position) => [position.id, position]));
  const query = filters.query.toLocaleLowerCase('zh-CN');
  const items = current.myPicks.map((positionId) => positionById.get(positionId)).filter(Boolean)
    .map((position) => {
      const snapshot = current.monitoringSnapshots[position.id] || {};
      return { position, snapshot, ratios: calculateBeijingMonitorRatios(position, snapshot) };
    })
    .filter((row) => {
      const { position, snapshot, ratios } = row;
      if (query && ![position.departmentName, position.hiringDepartment, position.positionTitle, position.positionCode]
        .some((value) => text(value).toLocaleLowerCase('zh-CN').includes(query))) return false;
      const hasData = METRIC_KEYS.some((key) => Number.isSafeInteger(snapshot[key]?.value));
      if (filters.dataStatus === 'has-data' && !hasData || filters.dataStatus === 'missing' && hasData) return false;
      const thresholds = [
        ['minApplications', snapshot.applications?.value],
        ['minQualified', snapshot.qualified?.value],
        ['minApplicationsRatio', ratios.applicationsRatio],
        ['minQualifiedRatio', ratios.qualifiedRatio],
      ];
      return thresholds.every(([key, value]) => !filters[key] || value !== null && value !== undefined && value >= Number(filters[key]));
    });
  const [sortKey, direction] = current.monitorSort.split(/-(?=[^-]+$)/u);
  const multiplier = direction === 'asc' ? 1 : -1;
  return items.sort((left, right) => {
    const leftValue = monitorValue(left, sortKey);
    const rightValue = monitorValue(right, sortKey);
    if (leftValue === null && rightValue !== null) return 1;
    if (leftValue !== null && rightValue === null) return -1;
    if (leftValue !== null && rightValue !== null && leftValue !== rightValue) return (leftValue - rightValue) * multiplier;
    return text(left.position.positionCode).localeCompare(text(right.position.positionCode));
  });
}

export function beijingMonitorRegistrationStarted(now = Date.now()) {
  return Number(now) >= Date.parse(BEIJING_REGISTRATION_START);
}
