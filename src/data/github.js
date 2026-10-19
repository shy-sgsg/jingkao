import { validateUserDataBackup } from './sync.js';

export const GITHUB_SYNC_TARGET = Object.freeze({
  owner: 'shy-sgsg',
  repo: 'jingkao',
  defaultBranch: 'main',
  branch: 'sync-data',
  path: 'user-data/backup.json',
});

const API_ROOT = 'https://api.github.com';
const RAW_CONTENTS_ROOT = 'https://raw.githubusercontent.com';
const API_VERSION = '2026-03-10';

export class GitHubSyncError extends Error {
  constructor(code, message, status = null) {
    super(message);
    this.name = 'GitHubSyncError';
    this.code = code;
    this.status = status;
  }
}

function headers(token = null) {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VERSION,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function errorForResponse(status, body = {}, responseHeaders = null) {
  const message = typeof body?.message === 'string' ? body.message : '';
  const remaining = responseHeaders?.get?.('x-ratelimit-remaining');
  if (status === 401) return new GitHubSyncError('unauthorized', 'GitHub 授权无效或已过期，请重新配置 Token。', status);
  if (status === 403 && remaining === '0' || status === 429) {
    return new GitHubSyncError('rate_limited', 'GitHub 请求次数已达限制，请稍后再手动同步。', status);
  }
  if (status === 403) return new GitHubSyncError('forbidden', 'Token 缺少 jingkao 仓库 Contents 写入权限，或请求被 GitHub 限制。', status);
  if (status === 404) return new GitHubSyncError('not_found', '找不到指定仓库、分支或备份文件，请检查 GitHub 同步设置。', status);
  if (status === 409) return new GitHubSyncError('conflict', '云端文件刚刚发生变化，请重新读取云端并检查冲突后再同步。', status);
  if (status === 422) return new GitHubSyncError('validation', 'GitHub 拒绝了这次写入，请检查分支、文件内容和 Token 权限。', status);
  return new GitHubSyncError('http', message ? `GitHub 请求失败（HTTP ${status}）：${message}` : `GitHub 请求失败（HTTP ${status}）。`, status);
}

async function requestJson(url, options, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(url, options);
  } catch {
    throw new GitHubSyncError('network', '无法连接 GitHub，请检查网络后手动重试。');
  }
  let body = {};
  try { body = await response.json(); } catch { /* response may have no JSON body */ }
  if (!response.ok) throw errorForResponse(response.status, body, response.headers);
  return { body, response };
}

function decodeBase64Text(value) {
  if (typeof value !== 'string') throw new GitHubSyncError('invalid_backup', 'GitHub 备份文件内容格式无效。');
  try {
    const binary = atob(value.replace(/\s/gu, ''));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new GitHubSyncError('invalid_backup', 'GitHub 备份文件无法解码；为保护本地记录，已停止同步。');
  }
}

function encodeBase64Text(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function branchUrl(branch) {
  return `${API_ROOT}/repos/${GITHUB_SYNC_TARGET.owner}/${GITHUB_SYNC_TARGET.repo}/branches/${encodeURIComponent(branch)}`;
}

function contentsUrl(branch) {
  const path = GITHUB_SYNC_TARGET.path.split('/').map(encodeURIComponent).join('/');
  return `${API_ROOT}/repos/${GITHUB_SYNC_TARGET.owner}/${GITHUB_SYNC_TARGET.repo}/contents/${path}?ref=${encodeURIComponent(branch)}`;
}

function rawContentsUrl() {
  const path = GITHUB_SYNC_TARGET.path.split('/').map(encodeURIComponent).join('/');
  return `${RAW_CONTENTS_ROOT}/${GITHUB_SYNC_TARGET.owner}/${GITHUB_SYNC_TARGET.repo}/${encodeURIComponent(GITHUB_SYNC_TARGET.branch)}/${path}`;
}

function nationalMonitorRawUrl(requestId) {
  return `${RAW_CONTENTS_ROOT}/${GITHUB_SYNC_TARGET.owner}/${GITHUB_SYNC_TARGET.repo}/${encodeURIComponent(GITHUB_SYNC_TARGET.branch)}/monitoring/national-2027.json?requestId=${encodeURIComponent(requestId)}&t=${Date.now()}`;
}

function requireFetch(fetchImpl) {
  if (typeof fetchImpl !== 'function') throw new GitHubSyncError('network', '当前浏览器无法连接 GitHub。');
}

export async function readRemoteBackup({ token = null, fetchImpl = globalThis.fetch } = {}) {
  requireFetch(fetchImpl);
  const branchRequest = await fetchImpl(branchUrl(GITHUB_SYNC_TARGET.branch), { method: 'GET', headers: headers(token) }).catch(() => {
    throw new GitHubSyncError('network', '无法连接 GitHub，请检查网络后手动重试。');
  });
  if (branchRequest.status === 404) return { branchExists: false, backup: null, sha: null };
  let branchBody = {};
  try { branchBody = await branchRequest.json(); } catch { /* requestJson reports malformed error below */ }
  if (!branchRequest.ok) throw errorForResponse(branchRequest.status, branchBody, branchRequest.headers);

  const fileRequest = await fetchImpl(contentsUrl(GITHUB_SYNC_TARGET.branch), { method: 'GET', headers: headers(token) }).catch(() => {
    throw new GitHubSyncError('network', '无法连接 GitHub，请检查网络后手动重试。');
  });
  if (fileRequest.status === 404) return { branchExists: true, backup: null, sha: null };
  let fileBody = {};
  try { fileBody = await fileRequest.json(); } catch { /* report as invalid remote backup */ }
  if (!fileRequest.ok) throw errorForResponse(fileRequest.status, fileBody, fileRequest.headers);
  if (fileBody.encoding !== 'base64' || typeof fileBody.content !== 'string' || typeof fileBody.sha !== 'string') {
    throw new GitHubSyncError('invalid_backup', 'GitHub 备份文件格式无效；为保护本地记录，已停止同步。');
  }
  let parsed;
  try { parsed = JSON.parse(decodeBase64Text(fileBody.content)); }
  catch (error) {
    if (error instanceof GitHubSyncError) throw error;
    throw new GitHubSyncError('invalid_backup', 'GitHub 备份不是有效 JSON；为保护本地记录，已停止同步。');
  }
  let backup;
  try { backup = validateUserDataBackup(parsed); }
  catch (error) { throw new GitHubSyncError('invalid_backup', error.message); }
  return { branchExists: true, backup, sha: fileBody.sha };
}

export async function readPublicRemoteBackup({ fetchImpl = globalThis.fetch } = {}) {
  requireFetch(fetchImpl);
  let response;
  try {
    response = await fetchImpl(rawContentsUrl(), { method: 'GET', cache: 'no-store' });
  } catch {
    throw new GitHubSyncError('network', '无法连接 GitHub 公开备份，请检查网络后手动重试。');
  }
  if (response.status === 404) return { branchExists: false, backup: null, sha: null };
  if (!response.ok) {
    const rateLimited = response.status === 403 || response.status === 429;
    const message = rateLimited
      ? 'GitHub 暂时拒绝读取公开同步备份，请稍后再试。'
      : `读取公开同步备份失败（HTTP ${response.status}）。`;
    throw new GitHubSyncError(rateLimited ? 'rate_limited' : 'http', message, response.status);
  }
  let parsed;
  try { parsed = await response.json(); }
  catch { throw new GitHubSyncError('invalid_backup', 'GitHub 公开备份不是有效 JSON；为保护本机数据，已停止导入。'); }
  let backup;
  try { backup = validateUserDataBackup(parsed); }
  catch (error) { throw new GitHubSyncError('invalid_backup', error.message); }
  return { branchExists: true, backup, sha: null };
}

function requireMonitorRequestId(requestId) {
  if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(requestId)) {
    throw new GitHubSyncError('invalid_request', '岗位监控刷新请求编号无效，请重新发起更新。');
  }
}

export async function dispatchNationalMonitorRefresh({ token, requestId, fetchImpl = globalThis.fetch } = {}) {
  if (!token) throw new GitHubSyncError('unauthorized', '请先在同步设置中配置具有 Contents 写入权限的 GitHub Token。');
  requireMonitorRequestId(requestId);
  requireFetch(fetchImpl);
  await requestJson(`${API_ROOT}/repos/${GITHUB_SYNC_TARGET.owner}/${GITHUB_SYNC_TARGET.repo}/dispatches`, {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type: 'national-monitor-refresh',
      client_payload: { requestId },
    }),
    signal: AbortSignal.timeout(15000),
  }, fetchImpl);
  return { requestId };
}

function invalidMonitorSnapshot(message = '华图监控快照格式无效，本机数据未更改。') {
  return new GitHubSyncError('invalid_monitor_snapshot', message);
}

function validatePublicNationalMonitorSnapshot(value, requestId) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalidMonitorSnapshot();
  if (value.requestId !== requestId) return null;
  if (value.schemaVersion !== 1 || value.year !== 2027
    || !Number.isFinite(Date.parse(value.fetchedAt))
    || typeof value.sourceUpdatedAt !== 'string'
    || !Number.isSafeInteger(value.expectedPositionCount) || value.expectedPositionCount < 0
    || !Array.isArray(value.records)) throw invalidMonitorSnapshot();

  const seen = new Set();
  const records = value.records.map((record) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)
      || typeof record.departmentCode !== 'string' || !/^\d{4,20}$/u.test(record.departmentCode)
      || typeof record.positionCode !== 'string' || !/^\d{8,20}$/u.test(record.positionCode)
      || seen.has(`${record.departmentCode}\u0000${record.positionCode}`)
      || ![null, undefined].includes(record.applications)
        && (!Number.isSafeInteger(record.applications) || record.applications < 0)
      || ![null, undefined].includes(record.qualified)
        && (!Number.isSafeInteger(record.qualified) || record.qualified < 0)
      || typeof record.sourceUrl !== 'string') throw invalidMonitorSnapshot();
    let sourceUrl;
    try { sourceUrl = new URL(record.sourceUrl); } catch { throw invalidMonitorSnapshot(); }
    if (sourceUrl.protocol !== 'https:' || sourceUrl.hostname !== 'ah.huatu.com') throw invalidMonitorSnapshot();
    seen.add(`${record.departmentCode}\u0000${record.positionCode}`);
    return {
      departmentCode: record.departmentCode,
      positionCode: record.positionCode,
      applications: record.applications ?? null,
      qualified: record.qualified ?? null,
      sourceUrl: sourceUrl.href,
    };
  });
  if (records.length !== value.expectedPositionCount) throw invalidMonitorSnapshot('华图监控快照的职位覆盖数不完整，本机数据未更改。');
  return {
    schemaVersion: 1,
    year: 2027,
    requestId,
    fetchedAt: value.fetchedAt,
    sourceUpdatedAt: value.sourceUpdatedAt,
    expectedPositionCount: value.expectedPositionCount,
    records,
  };
}

export async function readPublicNationalMonitorSnapshot({ requestId, fetchImpl = globalThis.fetch } = {}) {
  requireMonitorRequestId(requestId);
  requireFetch(fetchImpl);
  let response;
  try {
    response = await fetchImpl(nationalMonitorRawUrl(requestId), {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    return null;
  }
  if (response.status === 404) return null;
  if (!response.ok) {
    const rateLimited = response.status === 403 || response.status === 429;
    throw new GitHubSyncError(
      rateLimited ? 'rate_limited' : 'http',
      rateLimited ? 'GitHub 暂时限制读取公开监控快照，请稍后重试。' : `读取公开岗位监控快照失败（HTTP ${response.status}）。`,
      response.status,
    );
  }
  let parsed;
  try { parsed = await response.json(); }
  catch { throw invalidMonitorSnapshot(); }
  return validatePublicNationalMonitorSnapshot(parsed, requestId);
}

export async function createSyncBranch({ token, fetchImpl = globalThis.fetch } = {}) {
  if (!token) throw new GitHubSyncError('unauthorized', '请先在同步设置中配置 GitHub Token。');
  requireFetch(fetchImpl);
  const { body: defaultBranch } = await requestJson(branchUrl(GITHUB_SYNC_TARGET.defaultBranch), {
    method: 'GET', headers: headers(token),
  }, fetchImpl);
  const sha = defaultBranch?.commit?.sha;
  if (typeof sha !== 'string' || !sha) throw new GitHubSyncError('invalid_branch', '无法读取默认分支位置，未创建数据分支。');
  await requestJson(`${API_ROOT}/repos/${GITHUB_SYNC_TARGET.owner}/${GITHUB_SYNC_TARGET.repo}/git/refs`, {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: `refs/heads/${GITHUB_SYNC_TARGET.branch}`, sha }),
  }, fetchImpl);
  return { branch: GITHUB_SYNC_TARGET.branch };
}

export async function writeUserDataBackup({ backup, token, sha = null, fetchImpl = globalThis.fetch } = {}) {
  if (!token) throw new GitHubSyncError('unauthorized', '请先在同步设置中配置 GitHub Token。');
  requireFetch(fetchImpl);
  let validBackup;
  try { validBackup = validateUserDataBackup(backup); }
  catch (error) { throw new GitHubSyncError('invalid_backup', error.message); }
  const serialized = JSON.stringify(validBackup, null, 2);
  const body = {
    message: 'Update personal study backup',
    content: encodeBase64Text(serialized),
    branch: GITHUB_SYNC_TARGET.branch,
    ...(sha ? { sha } : {}),
  };
  const { body: written } = await requestJson(`${API_ROOT}/repos/${GITHUB_SYNC_TARGET.owner}/${GITHUB_SYNC_TARGET.repo}/contents/${GITHUB_SYNC_TARGET.path}`,
    {
      method: 'PUT',
      headers: { ...headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, fetchImpl);
  const verified = await readRemoteBackup({ token, fetchImpl });
  if (!verified.branchExists || !verified.backup
    || stableSerialize(verified.backup) !== stableSerialize(validBackup)) {
    throw new GitHubSyncError('verification', 'GitHub 已响应写入，但回读校验未通过；请重新手动同步确认云端状态。');
  }
  return {
    verified: true,
    fileSha: verified.sha || written?.content?.sha || null,
    commitSha: written?.commit?.sha || null,
    backup: verified.backup,
  };
}
