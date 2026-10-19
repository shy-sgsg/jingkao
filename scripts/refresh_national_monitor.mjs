import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const SOURCE_ORIGIN = 'https://ah.huatu.com';
const STATS_URL = `${SOURCE_ORIGIN}/zw/bmrs/2027.html`;
const PROVINCES = [
  'anhui', 'beijing', 'chongqing', 'fujian', 'gansu', 'guangdong', 'guangxi',
  'guizhou', 'hainan', 'hebei', 'heilongjiang', 'henan', 'hubei', 'hunan',
  'jiangsu', 'jiangxi', 'jilin', 'liaoning', 'neimenggu', 'ningxia', 'qinghai',
  'shandong', 'shanghai', 'shanxi', 'shanxisheng', 'sichuan', 'tianjin', 'xicang',
  'xinjiang', 'yunnan', 'zhejiang',
];
const MAX_PAGES = 8000;
const FETCH_CONCURRENCY = 8;
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

  const match = url.pathname.match(/^\/zw\/([a-z]+)\/(.*)$/u);
  if (!match || !PROVINCES.includes(match[1])) return null;
  const rest = match[2];
  if (!rest || /^[a-z0-9_-]+\/$/u.test(rest) || /^(?:[a-z0-9_-]+\/)?2027_\d+\.html$/u.test(rest)) {
    return url.href;
  }
  return null;
}

function extractLinks(html, pageUrl) {
  const links = new Set();
  for (const match of html.matchAll(/<a\b[^>]*>/giu)) {
    const href = extractAttribute(match[0], 'href');
    const url = candidateUrl(href, pageUrl);
    if (url) links.add(url);
  }
  return [...links];
}

function parseDeclaredPositionCount(html) {
  const text = textContent(html);
  const match = text.match(/([\d,]+)\s*个职位/u);
  if (!match) return null;
  const count = Number(match[1].replace(/,/gu, ''));
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

function parseCount(value, label, positionCode, sourceUrl) {
  const clean = textContent(value).replace(/,/gu, '').replace(/人$/u, '').trim();
  if (!clean || /^(?:--|—|-|暂无|未知)$/u.test(clean)) return null;
  if (/^\d+$/u.test(clean) && Number.isSafeInteger(Number(clean))) return Number(clean);
  throw new Error(`华图职位 ${positionCode} 的${label}无法识别（${sourceUrl}）：${clean.slice(0, 80)}`);
}

function normalizedHeader(value) {
  return textContent(value).replace(/[\s\u3000:：/（）()]+/gu, '');
}

function sourceIdentityKey({ departmentName, organizationName, positionCode, positionTitle }) {
  return JSON.stringify([departmentName, organizationName, positionCode, positionTitle]);
}

function buildPositionCatalog(positions) {
  if (!Array.isArray(positions) || !positions.length) {
    throw new Error('国考职位目录为空或格式无效，无法可靠识别华图页面中的部门。');
  }
  const bySourceIdentity = new Map();
  const departmentNames = new Set();
  for (const position of positions) {
    if (typeof position?.departmentCode !== 'string'
      || typeof position?.departmentName !== 'string'
      || typeof position?.organizationName !== 'string'
      || typeof position?.positionCode !== 'string'
      || typeof position?.positionTitle !== 'string') continue;
    const departmentName = textContent(position.departmentName);
    const organizationName = textContent(position.organizationName);
    const positionCode = textContent(position.positionCode);
    const positionTitle = textContent(position.positionTitle);
    const key = sourceIdentityKey({ departmentName, organizationName, positionCode, positionTitle });
    bySourceIdentity.set(key, [...(bySourceIdentity.get(key) || []), position.departmentCode]);
    departmentNames.add(departmentName);
  }
  if (!bySourceIdentity.size || !departmentNames.size) {
    throw new Error('国考职位目录缺少部门、司局或职位字段，无法匹配华图数据。');
  }
  return { bySourceIdentity, departmentNames };
}

function parseDepartmentName(html, departmentNames, sourceUrl) {
  const headingMatch = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/iu);
  const heading = textContent(headingMatch?.[1] || '');
  const headingSuffix = '国家公务员职位表';
  const suffixIndex = heading.lastIndexOf(headingSuffix);
  if (!heading || suffixIndex < 0) {
    throw new Error(`华图职位页标题格式无法识别，停止发布：${sourceUrl}`);
  }
  const titlePrefix = heading.slice(0, suffixIndex).trim();
  const candidates = [...departmentNames].filter((name) => titlePrefix.endsWith(name));
  const longestLength = Math.max(0, ...candidates.map((name) => name.length));
  const longest = candidates.filter((name) => name.length === longestLength);
  if (longest.length !== 1) {
    throw new Error(`无法从华图职位页标题唯一识别招录部门，停止发布：${sourceUrl}`);
  }
  return longest[0];
}

function parseTableRows(html, sourceUrl, catalog) {
  const records = [];
  for (const tableMatch of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table\s*>/giu)) {
    const rows = [...tableMatch[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/giu)]
      .map((rowMatch) => [...rowMatch[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)\s*>/giu)]
        .map((cell) => cell[1]));
    const headerIndex = rows.findIndex((row) => {
      const headers = row.map(normalizedHeader);
      return headers.some((header) => header.includes('岗位代码') || header.includes('职位代码'))
        && headers.some((header) => header.includes('报名人数'))
        && headers.some((header) => header.includes('合格人数'));
    });
    if (headerIndex < 0) continue;

    const headers = rows[headerIndex].map(normalizedHeader);
    const codeIndex = headers.findIndex((header) => header.includes('岗位代码') || header.includes('职位代码'));
    const departmentIndex = headers.findIndex((header) => header.includes('招录机关') || header.includes('招录单位'));
    const organizationIndex = headers.findIndex((header) => header.includes('用人司局'));
    const titleIndex = headers.findIndex((header) => header.includes('职位名称') || header.includes('招考职位'));
    const applicationsIndex = headers.findIndex((header) => header.includes('报名人数'));
    const qualifiedIndex = headers.findIndex((header) => header.includes('合格人数'));
    if (organizationIndex < 0 || titleIndex < 0) {
      throw new Error(`华图职位表缺少用人司局或职位名称列，停止发布：${sourceUrl}`);
    }
    const pageDepartmentName = departmentIndex < 0
      ? parseDepartmentName(html, catalog.departmentNames, sourceUrl)
      : '';
    for (const row of rows.slice(headerIndex + 1)) {
      if (row.length <= Math.max(codeIndex, departmentIndex, organizationIndex, titleIndex, applicationsIndex, qualifiedIndex)) continue;
      const positionCode = textContent(row[codeIndex]);
      if (!/^\d{8,20}$/u.test(positionCode)) continue;
      const departmentName = departmentIndex < 0 ? pageDepartmentName : textContent(row[departmentIndex]);
      const organizationName = textContent(row[organizationIndex]);
      const positionTitle = textContent(row[titleIndex]);
      if (!departmentName || !organizationName || !positionTitle) {
        throw new Error(`华图职位 ${positionCode} 缺少招录机关、用人司局或职位名称，停止发布：${sourceUrl}`);
      }
      const identity = { departmentName, organizationName, positionCode, positionTitle };
      const departmentCodes = catalog.bySourceIdentity.get(sourceIdentityKey(identity)) || [];
      if (departmentCodes.length !== 1) {
        throw new Error(`华图职位 ${positionCode} 无法与本地公开职位目录唯一匹配，停止发布：${sourceUrl}`);
      }
      records.push({
        departmentCode: departmentCodes[0],
        positionCode,
        applications: parseCount(row[applicationsIndex], '报名人数', positionCode, sourceUrl),
        qualified: parseCount(row[qualifiedIndex], '合格人数', positionCode, sourceUrl),
        sourceUrl,
      });
    }
  }
  return records;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'national-position-monitor/1.0 (+https://github.com/shy-sgsg/jingkao)',
    },
    signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`华图页面读取失败（HTTP ${response.status}）：${url}`);
  const contentType = response.headers.get('content-type') || '';
  if (contentType && !/html|xhtml/iu.test(contentType)) throw new Error(`华图页面不是 HTML：${url}`);
  return response.text();
}

async function fetchBatch(urls) {
  const results = new Array(urls.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(FETCH_CONCURRENCY, urls.length) }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= urls.length) return;
      results[index] = await fetchHtml(urls[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function crawl(catalog) {
  const expectedByProvince = new Map();
  const visited = new Set();
  const queued = new Set(PROVINCES.map((province) => `${SOURCE_ORIGIN}/zw/${province}/`));
  const collected = new Map();
  const conflicts = new Set();

  while (queued.size) {
    if (visited.size + queued.size > MAX_PAGES) {
      throw new Error(`华图页面数量超过上限 ${MAX_PAGES}，停止发布以避免不完整数据。`);
    }
    const batch = [...queued];
    queued.clear();
    const htmlPages = await fetchBatch(batch);
    for (let index = 0; index < batch.length; index += 1) {
      const pageUrl = batch[index];
      const html = htmlPages[index];
      visited.add(pageUrl);
      const province = new URL(pageUrl).pathname.match(/^\/zw\/([a-z]+)\//u)?.[1];
      if (province && pageUrl === `${SOURCE_ORIGIN}/zw/${province}/`) {
        const expected = parseDeclaredPositionCount(html);
        if (expected === null) throw new Error(`无法从华图省级页面读取职位总数：${pageUrl}`);
        expectedByProvince.set(province, expected);
      }

      for (const record of parseTableRows(html, pageUrl, catalog)) {
        const identityKey = `${record.departmentCode}\u0000${record.positionCode}`;
        if (conflicts.has(identityKey)) continue;
        const prior = collected.get(identityKey);
        if (!prior) collected.set(identityKey, record);
        else if (prior.applications !== record.applications || prior.qualified !== record.qualified) {
          collected.delete(identityKey);
          conflicts.add(identityKey);
        }
      }

      for (const link of extractLinks(html, pageUrl)) {
        if (!visited.has(link) && !batch.includes(link)) queued.add(link);
      }
    }
  }

  if (expectedByProvince.size !== PROVINCES.length) {
    throw new Error(`省级页面覆盖不完整：读取 ${expectedByProvince.size}/${PROVINCES.length} 个省级职位总数。`);
  }
  const expectedPositionCount = [...expectedByProvince.values()].reduce((total, count) => total + count, 0);
  if (collected.size !== expectedPositionCount) {
    throw new Error(`职位覆盖数不匹配：华图声明 ${expectedPositionCount} 个职位，当前解析 ${collected.size} 个唯一部门与职位代码组合，另有 ${conflicts.size} 个冲突组合。`);
  }

  return {
    records: [...collected.values()].sort((left, right) => left.departmentCode.localeCompare(right.departmentCode)
      || left.positionCode.localeCompare(right.positionCode)),
    expectedPositionCount,
  };
}

function sourceUpdatedAt(html) {
  const text = textContent(html);
  const match = text.match(/更新时间\s*[:：]\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?)/u);
  return match?.[1] || '';
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
  const outputPath = argument('--output', 'monitoring/national-2027.json');
  const catalogPath = argument('--catalog', 'public/national/positions-2027.json');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(requestId)) {
    throw new Error('repository_dispatch 缺少有效的随机 requestId。');
  }

  let catalogData;
  try { catalogData = JSON.parse(await readFile(resolve(catalogPath), 'utf8')); }
  catch { throw new Error(`无法读取国考职位目录：${catalogPath}`); }
  const catalog = buildPositionCatalog(Array.isArray(catalogData) ? catalogData : catalogData?.positions);
  const [result, statsHtml] = await Promise.all([crawl(catalog), fetchHtml(STATS_URL)]);
  const snapshot = {
    schemaVersion: 1,
    year: 2027,
    requestId,
    fetchedAt: new Date().toISOString(),
    sourceUpdatedAt: sourceUpdatedAt(statsHtml),
    expectedPositionCount: result.expectedPositionCount,
    records: result.records,
  };
  await writeSnapshot(outputPath, snapshot);
  process.stdout.write(`Published ${snapshot.records.length}/${snapshot.expectedPositionCount} positions; source update: ${snapshot.sourceUpdatedAt || 'not provided'}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error?.message || String(error)}\n`);
  process.exitCode = 1;
});
