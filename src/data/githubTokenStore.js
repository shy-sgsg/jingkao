const DATABASE_NAME = 'changping-jingkao-github-credentials';
const DATABASE_VERSION = 1;
const KEY_STORE = 'crypto-keys';
const TOKEN_STORE = 'encrypted-tokens';
const DEVICE_KEY_ID = 'device-key-v1';
const TOKEN_ID = 'github-token-v1';

function openDatabase(indexedDBImpl) {
  if (!indexedDBImpl || typeof indexedDBImpl.open !== 'function') {
    throw new Error('浏览器不支持 IndexedDB。');
  }
  return new Promise((resolve, reject) => {
    let request;
    try { request = indexedDBImpl.open(DATABASE_NAME, DATABASE_VERSION); }
    catch { reject(new Error('无法打开设备凭据存储。')); return; }
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(KEY_STORE)) database.createObjectStore(KEY_STORE);
      if (!database.objectStoreNames.contains(TOKEN_STORE)) database.createObjectStore(TOKEN_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('无法打开设备凭据存储。'));
    request.onblocked = () => reject(new Error('设备凭据存储正被其他页面占用。'));
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('设备凭据存储操作失败。'));
  });
}

function getValue(database, storeName, key) {
  return requestResult(database.transaction(storeName, 'readonly').objectStore(storeName).get(key));
}

function putValue(database, storeName, key, value) {
  return requestResult(database.transaction(storeName, 'readwrite').objectStore(storeName).put(value, key));
}

function deleteValue(database, storeName, key) {
  return requestResult(database.transaction(storeName, 'readwrite').objectStore(storeName).delete(key));
}

function requireCrypto(cryptoApi) {
  if (!cryptoApi?.subtle || typeof cryptoApi.getRandomValues !== 'function') {
    throw new Error('浏览器不支持 Web Crypto。');
  }
}

function validDeviceKey(key) {
  return Boolean(key && key.type === 'secret' && key.extractable === false
    && key.algorithm?.name === 'AES-GCM'
    && Array.isArray(key.usages) && key.usages.includes('encrypt') && key.usages.includes('decrypt'));
}

async function getOrCreateDeviceKey(database, cryptoApi) {
  const existing = await getValue(database, KEY_STORE, DEVICE_KEY_ID);
  if (existing !== undefined) {
    if (!validDeviceKey(existing)) throw new Error('本机加密密钥无法安全读取。');
    return existing;
  }
  const key = await cryptoApi.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  if (!validDeviceKey(key)) throw new Error('无法创建不可导出的设备密钥。');
  await putValue(database, KEY_STORE, DEVICE_KEY_ID, key);
  const storedKey = await getValue(database, KEY_STORE, DEVICE_KEY_ID);
  if (!validDeviceKey(storedKey)) throw new Error('设备密钥未能可靠保存在浏览器中。');
  return storedKey;
}

async function decryptPayload(payload, key, cryptoApi) {
  if (!payload || payload.version !== 1 || !Array.isArray(payload.iv) || payload.iv.length !== 12
    || !Array.isArray(payload.ciphertext) || payload.ciphertext.length < 1) {
    throw new Error('本机 GitHub 凭据格式无效，请重新配置 Token。');
  }
  const plaintext = await cryptoApi.subtle.decrypt(
    { name: 'AES-GCM', iv: Uint8Array.from(payload.iv) },
    key,
    Uint8Array.from(payload.ciphertext),
  );
  return new TextDecoder('utf-8', { fatal: true }).decode(plaintext);
}

async function removeStoredCredentials(indexedDBImpl) {
  const database = await openDatabase(indexedDBImpl);
  try {
    await Promise.all([
      deleteValue(database, TOKEN_STORE, TOKEN_ID),
      deleteValue(database, KEY_STORE, DEVICE_KEY_ID),
    ]);
  } finally { database.close?.(); }
}

export async function saveGitHubToken(token, {
  indexedDBImpl = globalThis.indexedDB,
  cryptoApi = globalThis.crypto,
} = {}) {
  if (typeof token !== 'string' || !token.trim()) throw new Error('GitHub Token 不能为空。');
  const cleanToken = token.trim();
  let database;
  try {
    requireCrypto(cryptoApi);
    database = await openDatabase(indexedDBImpl);
    const key = await getOrCreateDeviceKey(database, cryptoApi);
    const iv = cryptoApi.getRandomValues(new Uint8Array(12));
    const ciphertext = await cryptoApi.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(cleanToken));
    const payload = { version: 1, iv: Array.from(iv), ciphertext: Array.from(new Uint8Array(ciphertext)) };
    await putValue(database, TOKEN_STORE, TOKEN_ID, payload);
    const storedPayload = await getValue(database, TOKEN_STORE, TOKEN_ID);
    if (await decryptPayload(storedPayload, key, cryptoApi) !== cleanToken) {
      throw new Error('加密凭据回读校验失败。');
    }
    return { persistence: 'device' };
  } catch {
    database?.close?.();
    try { await removeStoredCredentials(indexedDBImpl); } catch { /* a failed store is never reported as persistent */ }
    return { persistence: 'session', token: cleanToken };
  } finally { database?.close?.(); }
}

export async function loadGitHubToken({
  indexedDBImpl = globalThis.indexedDB,
  cryptoApi = globalThis.crypto,
} = {}) {
  if (!indexedDBImpl || typeof indexedDBImpl.open !== 'function') return null;
  requireCrypto(cryptoApi);
  const database = await openDatabase(indexedDBImpl);
  try {
    const payload = await getValue(database, TOKEN_STORE, TOKEN_ID);
    if (payload === undefined) return null;
    const key = await getValue(database, KEY_STORE, DEVICE_KEY_ID);
    if (!validDeviceKey(key)) throw new Error('本机加密密钥无法读取，请重新配置 GitHub Token。');
    const token = await decryptPayload(payload, key, cryptoApi);
    if (!token) throw new Error('本机 GitHub Token 为空，请重新配置。');
    return { token, persistence: 'device' };
  } finally { database.close?.(); }
}

export async function clearGitHubToken({ indexedDBImpl = globalThis.indexedDB } = {}) {
  if (!indexedDBImpl || typeof indexedDBImpl.open !== 'function') return;
  await removeStoredCredentials(indexedDBImpl);
}
