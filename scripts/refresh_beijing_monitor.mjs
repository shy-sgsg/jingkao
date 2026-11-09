import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const SOURCE_ORIGIN = 'https://ah.huatu.com';
const STATS_URL = `${SOURCE_ORIGIN}/zw/bjgwy/bmrs/`;
const LIST_URL = `${SOURCE_ORIGIN}/zw/bjgwy/2027.html`;
const REGISTRATION_START = Date.parse('2026-11-12T09:00:00+08:00');
const EXPECTED_POSITIONS = 1446;
const FETCH_CONCURRENCY = 6;
const PAGE_TIMEOUT_MS = 30000;

function argument(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || '' : fallback;
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&#x([\da-f]+);/giu, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/gu, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&nbsp;/giu, ' ')
    .replace(/&amp;/giu, '&')
    .replace(/&quot;/giu, '"')
    .replace(/&#39;|&apos;/giu, "'")
    .replace(/&lt;/giu, '<')
    .replace(/&gt;/giu, '>');
}

function textContent(value) {
  return decodeHtml(String(value ?? '')
    .replace(/<!--[\s\S]*?-->/gu, ' ')
    .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/giu, ' ')
    .replace(/<br\b[^>]*>/giu, ' ')
    .replace(/<[^>]*>/gu, ' '))
    .replace(/[\s\u3000]+/gu, ' ')
    .trim();
}

function extractAttribute(tag, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const match = tag.match(new RegExp(`\\b${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'iu'));
  return decodeHtml(match?.[1] ?? match?.[2] ?? match?.[3] ?? '');
}

function candidateUrl(href, fromUrl) {
  if (!href || href.startsWith('#') || /^(?:javascript|mailto|tel):/iu.test(href)) return null;
  let url;
  try { url = new URL(href, fromUrl); } catch { return null; }
  if (url.protocol !== 'https:' || url.hostname !== 'ah.huatu.com' || url.search || url.hash) return null;
  if (/^\/zw\/bjgwy\/2027\.html$/u.test(url.pathname)) return url.href;
  if (/^\/zw\/bjgwy\/[a-z0-9_-]+(?:zw|renshu)\/$/iu.test(url.pathname)) return url.href;
  return null;
}

function extractLinks(html, pageUrl) {
  const links = new Set();
  for (const match of html.matchAll(/<a\b[^>]*>/giu)) {
    const url = candidateUrl(extractAttribute(match[0], 'href'), pageUrl);
    if (url) links.add(url);
  }
  return [...links];
}

function normalizedHeader(value) {
  return textContent(value).replace(/[\s\u3000:：/（）()]+/gu, '');
}

function parseCount(value, label, positionCode, sourceUrl) {
  const clean = textContent(value).replace(/,/gu, '').replace(/人$/u, '').trim();
  if (!clean || /^(?:--|—|-|暂无|未知)$/u.test(clean)) return null;
  if (/^\d+$/u.test(clean) && Number.isSafeInteger(Number(clean))) return Number(clean);
  throw new Error(`华图北京市考职位 ${positionCode} 的${label}无法识别（${sourceUrl}）：${clean.slice(0, 80)}`);
}

function buildPositionCatalog(positions) {
  if (!Array.isArray(positions) || positions.length !== EXPECTED_POSITIONS) {
    throw new Error(`本地北京市考职位目录应为 ${EXPECTED_POSITIONS} 条，当前读取 ${Array.isArray(positions) ? positions.length : 0} 条。`);
  }
  const byCode = new Map();
  for (const position of positions) {
    if (typeof position?.positionCode !== 'string' || !/^\d{9}$/u.test(position.positionCode)
      || byCode.has(position.positionCode)) throw new Error('本地北京市考目录的职位代码格式错误或不唯一。');
    byCode.set(position.positionCode, position);
  }
  return byCode;
}

function parseTableRows(html, sourceUrl, catalog) {
  const records = [];
  for (const tableMatch of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table\s*>/giu)) {
    const rows = [...tableMatch[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/giu)]
      .map((rowMatch) => [...rowMatch[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)\s*>/giu)]
        .map((cell) => cell[1]));
    const headerIndex = rows.findIndex((row) => row.map(normalizedHeader)
      .some((header) => /^(?:职位|岗位)(?:代码|编号)$/u.test(header)));
    if (headerIndex < 0) continue;

    const headers = rows[headerIndex].map(normalizedHeader);
    const codeIndex = headers.findIndex((header) => /^(?:职位|岗位)(?:代码|编号)$/u.test(header));
    const applicationsIndex = headers.findIndex((header) => /报名人数|报考人数/u.test(header));
    const qualifiedIndex = headers.findIndex((header) => /资格审查通过人数|资格审核通过人数|合格人数|过审人数/u.test(header));
    const hasPositionTableShape = applicationsIndex >= 0 || qualifiedIndex >= 0
      || headers.some((header) => /招考人数|招聘人数|职位名称|招录单位|单位名称/u.test(header));
    if (!hasPositionTableShape) continue;
    if (codeIndex < 0) continue;

    for (const row of rows.slice(headerIndex + 1)) {
      if (row.length <= codeIndex) continue;
      const positionCode = textContent(row[codeIndex]);
      if (!catalog.has(positionCode)) continue;
      const applications = applicationsIndex >= 0 && row.length > applicationsIndex
        ? parseCount(row[applicationsIndex], '报名人数', positionCode, sourceUrl) : null;
      const qualified = qualifiedIndex >= 0 && row.length > qualifiedIndex
        ? parseCount(row[qualifiedIndex], '资格审查通过人数', positionCode, sourceUrl) : null;
      records.push({ positionCode, applications, qualified, sourceUrl });
    }
  }
  return records;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'beijing-position-monitor/1.0 (+https://github.com/shy-sgsg/jingkao)',
    },
    signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`华图页面读取失败（HTTP ${response.status}）：${url}`);
  const contentType = response.headers.get('content-type') || '';
  if (contentType && !/html|xhtml/iu.test(contentType)) throw new Error(`华图页面不是 HTML：${url}`);
  return response.text();
}

async function fetchPositionScript(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/javascript,text/javascript,text/plain,*/*',
      'User-Agent': 'beijing-position-monitor/1.0 (+https://github.com/shy-sgsg/jingkao)',
    },
    signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`华图职位数据脚本读取失败（HTTP ${response.status}）：${url}`);
  const contentType = response.headers.get('content-type') || '';
  if (contentType && !/javascript|ecmascript|text|octet-stream/iu.test(contentType)) {
    throw new Error(`华图职位数据脚本格式无效：${url}`);
  }
  return response.text();
}

async function fetchBatch(urls, fetcher = fetchHtml) {
  const results = new Array(urls.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(FETCH_CONCURRENCY, urls.length) }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= urls.length) return;
      results[index] = await fetcher(urls[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

function regionUrlsFromPages(pages) {
  return [...new Set(pages.flatMap(([html, pageUrl]) => extractLinks(html, pageUrl)))]
    .filter((url) => /^\/zw\/bjgwy\/[a-z0-9_-]+zw\/$/iu.test(new URL(url).pathname))
    .sort();
}

function extractPositionScriptUrl(html, regionUrl) {
  const candidates = [];
  for (const match of html.matchAll(/<script\b[^>]*>/giu)) {
    const src = extractAttribute(match[0], 'src');
    if (!src) continue;
    let url;
    try { url = new URL(src, regionUrl); } catch { continue; }
    if (url.protocol === 'https:' && url.hostname === 'ah.huatu.com' && !url.search && !url.hash
      && /^\/zw\/bjgwy\/[a-z0-9_-]+zw\/2027\.js$/iu.test(url.pathname)) candidates.push(url.href);
  }
  const unique = [...new Set(candidates)];
  if (unique.length !== 1) throw new Error(`无法从华图地区页唯一识别 2027 职位脚本：${regionUrl}`);
  return unique[0];
}

function parsePositionScript(script, scriptUrl, catalog) {
  const match = script.match(/\blet\s+tabletxt\s*=\s*`([^`]*)`\s*;/u);
  if (!match || match[1].includes('${')) throw new Error(`华图职位脚本的 tabletxt 格式无法安全解析：${scriptUrl}`);
  const rows = match[1].split('^').map((row) => row.split('#'));
  const expectedHeaders = ['岗位代码', '单位名称', '职位名称', '学历要求', '专业要求', '招考人数', '详细'];
  if (!rows.length || rows[0].length !== expectedHeaders.length
    || rows[0].some((value, index) => textContent(value) !== expectedHeaders[index])) {
    throw new Error(`华图职位脚本字段结构发生变化：${scriptUrl}`);
  }
  const sourceUrl = new URL('.', scriptUrl).href;
  const records = [];
  for (const row of rows.slice(1)) {
    if (row.length !== expectedHeaders.length) throw new Error(`华图职位脚本含列数异常的职位：${scriptUrl}`);
    const positionCode = textContent(row[0]);
    const detailPath = textContent(row[6]);
    if (!/^\d{9}$/u.test(positionCode) || !catalog.has(positionCode)
      || !/^2027\/\d+$/u.test(detailPath)) {
      throw new Error(`华图职位脚本含无效或目录外职位代码：${scriptUrl}`);
    }
    records.push({ positionCode, applications: null, qualified: null, sourceUrl });
  }
  if (!records.length) throw new Error(`华图职位脚本没有职位数据：${scriptUrl}`);
  return records;
}

async function crawl(catalog, preRegistration, listHtml, statsPageHtml) {
  const regionUrls = regionUrlsFromPages([[listHtml, LIST_URL], [statsPageHtml, STATS_URL]]);
  if (!regionUrls.length) throw new Error('华图北京市考页面没有发现地区职位目录链接。');

  const regionHtml = await fetchBatch(regionUrls);
  const scriptUrls = regionHtml.map((html, index) => extractPositionScriptUrl(html, regionUrls[index]));
  if (new Set(scriptUrls).size !== scriptUrls.length) throw new Error('华图地区职位脚本链接重复，停止发布。');
  const scripts = await fetchBatch(scriptUrls, fetchPositionScript);
  const collected = new Map();
  for (let index = 0; index < scripts.length; index += 1) {
    for (const record of parsePositionScript(scripts[index], scriptUrls[index], catalog)) {
      if (collected.has(record.positionCode)) throw new Error(`华图地区职位脚本重复包含代码 ${record.positionCode}，停止发布。`);
      collected.set(record.positionCode, record);
    }
  }

  const missing = [...catalog.keys()].filter((code) => !collected.has(code));
  if (missing.length || collected.size !== EXPECTED_POSITIONS) {
    throw new Error(`华图职位覆盖不完整：本地目录 ${EXPECTED_POSITIONS} 个职位，地区脚本解析 ${collected.size} 个，缺少 ${missing.length} 个；停止发布。`);
  }

  const statsByCode = new Map();
  for (const record of parseTableRows(statsPageHtml, STATS_URL, catalog)) {
    if (statsByCode.has(record.positionCode)) throw new Error(`华图统计页重复列出职位代码 ${record.positionCode}，停止发布。`);
    statsByCode.set(record.positionCode, record);
  }
  if (!statsByCode.size) throw new Error(`华图统计页没有职位报名人数记录：${STATS_URL}`);
  for (const [positionCode, stats] of statsByCode) {
    const position = collected.get(positionCode);
    position.applications = preRegistration ? null : stats.applications;
    position.qualified = preRegistration ? null : stats.qualified;
    if (position.applications !== null || position.qualified !== null) position.sourceUrl = STATS_URL;
  }

  return [...collected.values()].sort((left, right) => left.positionCode.localeCompare(right.positionCode));
}

function sourceUpdatedAt(html) {
  const text = textContent(html);
  const match = text.match(/更新时间\s*[:：]?\s*((?:20\d{2}[-年]\s*)?\d{1,2}[月/-]\s*\d{1,2}日?\s*\d{1,2}:\d{2})/u);
  if (!match) return '';
  const remainder = text.slice((match.index ?? 0) + match[0].length).trimStart();
  if (/^(?:-|—|~|～|至|到)\s*\d/u.test(remainder)) return '';
  return match[1];
}

async function writeSnapshot(outputPath, value) {
  const target = resolve(outputPath);
  const temporary = `${target}.tmp`;
  await mkdir(dirname(target), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'w' });
  await rename(temporary, target);
}

async function main() {
  const requestId = argument('--request-id');
  const outputPath = argument('--output', 'monitoring/beijing-2027.json');
  const catalogPath = argument('--catalog', 'public/beijing/positions-2027.json');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(requestId)) {
    throw new Error('repository_dispatch 缺少有效的随机 requestId。');
  }

  let catalogData;
  try { catalogData = JSON.parse(await readFile(resolve(catalogPath), 'utf8')); }
  catch { throw new Error(`无法读取北京市考职位目录：${catalogPath}`); }
  const catalog = buildPositionCatalog(Array.isArray(catalogData) ? catalogData : catalogData?.positions);
  const fetchedAt = new Date().toISOString();
  const preRegistration = Date.parse(fetchedAt) < REGISTRATION_START;
  const [listHtml, statsHtml] = await fetchBatch([LIST_URL, STATS_URL]);
  const records = await crawl(catalog, preRegistration, listHtml, statsHtml);
  const snapshot = {
    schemaVersion: 1,
    year: 2027,
    requestId,
    fetchedAt,
    sourceUpdatedAt: sourceUpdatedAt(statsHtml),
    expectedPositionCount: EXPECTED_POSITIONS,
    preRegistration,
    records: records.map((record) => ({
      ...record,
      applications: preRegistration ? null : record.applications,
      qualified: preRegistration ? null : record.qualified,
    })),
  };
  await writeSnapshot(outputPath, snapshot);
  process.stdout.write(`Published ${snapshot.records.length}/${snapshot.expectedPositionCount} Beijing positions; ${preRegistration ? 'pre-registration counts withheld' : 'registration counts collected'}; source update: ${snapshot.sourceUpdatedAt || 'not provided'}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error?.message || String(error)}\n`);
  process.exitCode = 1;
});
