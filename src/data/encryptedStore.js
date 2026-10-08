const ACCOUNT_KDF = 'PBKDF2-SHA-256';
const ACCOUNT_CIPHER = 'AES-GCM-256';
const ACCOUNT_VERSION = 1;
const ACCOUNT_ITERATIONS = 600000;
const ACCOUNT_SALT_BYTES = 16;
const ACCOUNT_IV_BYTES = 12;
const ACCOUNT_INDEX_KEY = 'changping-jingkao-dashboard:accounts:v1';
const ACCOUNT_INDEX_VERSION = 1;
const ACCOUNT_RECORD_PREFIX = 'changping-jingkao-dashboard:account:';
const LEGACY_STORAGE_KEY = 'changping-jingkao-dashboard:v1';
const saveQueues = new WeakMap();

function encodeText(value) {
  return new TextEncoder().encode(value);
}

function decodeText(value) {
  return new TextDecoder().decode(value);
}

function requireCrypto(cryptoApi) {
  if (!cryptoApi?.subtle || typeof cryptoApi.getRandomValues !== 'function') {
    throw new Error('当前浏览器无法安全加密个人数据，请使用支持 Web Crypto 的 HTTPS 页面或 localhost。');
  }
  if (typeof TextEncoder !== 'function' || typeof TextDecoder !== 'function'
    || typeof btoa !== 'function' || typeof atob !== 'function') {
    throw new Error('当前浏览器缺少安全加密所需的文本或 Base64 API。');
  }
}

function toBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function randomBytes(cryptoApi, length) {
  const bytes = new Uint8Array(length);
  cryptoApi.getRandomValues(bytes);
  return bytes;
}

function createId(cryptoApi) {
  return toBase64(randomBytes(cryptoApi, 16))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('请设置档案密码。');
  }
}

function accountStorageKey(id) {
  return `${ACCOUNT_RECORD_PREFIX}${id}:v1`;
}

function readAccountIndex(storage) {
  const raw = storage.getItem(ACCOUNT_INDEX_KEY);
  if (raw === null) return { version: ACCOUNT_INDEX_VERSION, accounts: [] };
  let index;
  try {
    index = JSON.parse(raw);
  } catch {
    throw new Error('本地档案索引无法读取；为保护数据，未继续操作。');
  }
  if (!index || typeof index !== 'object' || Array.isArray(index)
    || index.version !== ACCOUNT_INDEX_VERSION || !Array.isArray(index.accounts)) {
    throw new Error('本地档案索引格式不受支持；为保护数据，未继续操作。');
  }
  const ids = new Set();
  const slots = new Set();
  for (const account of index.accounts) {
    if (!account || typeof account !== 'object' || Array.isArray(account)
      || Object.keys(account).sort().join(',') !== 'id,slot'
      || typeof account.id !== 'string' || !/^[A-Za-z0-9_-]{20,}$/u.test(account.id)
      || !Number.isSafeInteger(account.slot) || account.slot < 1
      || ids.has(account.id) || slots.has(account.slot)) {
      throw new Error('本地档案索引格式不受支持；为保护数据，未继续操作。');
    }
    ids.add(account.id);
    slots.add(account.slot);
  }
  return { version: ACCOUNT_INDEX_VERSION, accounts: index.accounts.map(({ id, slot }) => ({ id, slot })) };
}

function writeAndVerify(storage, key, value) {
  const serialized = JSON.stringify(value);
  if (typeof serialized !== 'string') throw new Error('加密数据无法序列化，未保存。');
  storage.setItem(key, serialized);
  const readback = storage.getItem(key);
  if (readback !== serialized) throw new Error('本地加密保存校验失败；原有记录未被移除。');
}

function stateSnapshot(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('个人数据格式无效，未保存。');
  }
  let serialized;
  try {
    serialized = JSON.stringify(state);
  } catch {
    throw new Error('个人数据无法序列化，未保存。');
  }
  if (typeof serialized !== 'string') throw new Error('个人数据无法序列化，未保存。');
  return JSON.parse(serialized);
}

async function deriveAccountKey(password, salt, cryptoApi) {
  validatePassword(password);
  const passwordKey = await cryptoApi.subtle.importKey(
    'raw', encodeText(password), 'PBKDF2', false, ['deriveKey'],
  );
  return cryptoApi.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ACCOUNT_ITERATIONS, hash: 'SHA-256' },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function accountAdditionalData(id) {
  return encodeText(`changping-jingkao-account:${id}`);
}

function validateEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)
    || envelope.version !== ACCOUNT_VERSION
    || envelope.kdf !== ACCOUNT_KDF
    || envelope.iterations !== ACCOUNT_ITERATIONS
    || envelope.cipher !== ACCOUNT_CIPHER
    || typeof envelope.salt !== 'string'
    || typeof envelope.iv !== 'string'
    || typeof envelope.ciphertext !== 'string') {
    throw new Error('档案加密格式不受支持或已损坏。');
  }
  const salt = fromBase64(envelope.salt);
  const iv = fromBase64(envelope.iv);
  const ciphertext = fromBase64(envelope.ciphertext);
  if (salt.length !== ACCOUNT_SALT_BYTES || iv.length !== ACCOUNT_IV_BYTES || ciphertext.length < 16) {
    throw new Error('档案加密格式不受支持或已损坏。');
  }
  return { salt, iv, ciphertext };
}

async function encryptPayload({ id, name, state, key, envelope, cryptoApi }) {
  const iv = randomBytes(cryptoApi, ACCOUNT_IV_BYTES);
  const json = JSON.stringify({ name, state });
  if (typeof json !== 'string') throw new Error('个人数据无法序列化，未保存。');
  const ciphertext = await cryptoApi.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: accountAdditionalData(id) },
    key,
    encodeText(json),
  );
  return {
    version: ACCOUNT_VERSION,
    kdf: ACCOUNT_KDF,
    iterations: ACCOUNT_ITERATIONS,
    cipher: ACCOUNT_CIPHER,
    salt: envelope.salt,
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

export async function createEncryptedAccount({ name, password, state, cryptoApi = globalThis.crypto }) {
  requireCrypto(cryptoApi);
  validatePassword(password);
  const cleanName = String(name ?? '').trim();
  if (!cleanName) throw new Error('请填写档案名称。');
  const id = createId(cryptoApi);
  const salt = randomBytes(cryptoApi, ACCOUNT_SALT_BYTES);
  const key = await deriveAccountKey(password, salt, cryptoApi);
  const metadata = { salt: toBase64(salt) };
  const session = { id, name: cleanName, key, envelope: metadata };
  const envelope = await encryptPayload({ id, name: cleanName, state, key, envelope: metadata, cryptoApi });
  session.envelope = envelope;
  return { id, envelope, session };
}

export async function unlockEncryptedAccount({ id, envelope, password, cryptoApi = globalThis.crypto }) {
  requireCrypto(cryptoApi);
  validatePassword(password);
  if (typeof id !== 'string' || !id) throw new Error('档案编号无效。');
  const { salt, iv, ciphertext } = validateEnvelope(envelope);
  const key = await deriveAccountKey(password, salt, cryptoApi);
  let payload;
  try {
    const plaintext = await cryptoApi.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: accountAdditionalData(id) },
      key,
      ciphertext,
    );
    payload = JSON.parse(decodeText(plaintext));
  } catch {
    throw new Error('无法解锁此档案。密码错误或数据已损坏。');
  }
  if (!payload || typeof payload.name !== 'string' || !payload.name
    || !payload.state || typeof payload.state !== 'object' || Array.isArray(payload.state)) {
    throw new Error('无法解锁此档案。密码错误或数据已损坏。');
  }
  const session = { id, name: payload.name, key, envelope };
  return { id, name: payload.name, state: payload.state, session };
}

export async function encryptAccountState({ state, session, cryptoApi = globalThis.crypto }) {
  requireCrypto(cryptoApi);
  if (!session?.id || !session.name || !session.key || !session.envelope) {
    throw new Error('账户尚未解锁，无法加密保存。');
  }
  const { salt } = validateEnvelope(session.envelope);
  return encryptPayload({
    id: session.id,
    name: session.name,
    state,
    key: session.key,
    envelope: { ...session.envelope, salt: toBase64(salt) },
    cryptoApi,
  });
}

export function listEncryptedAccounts(storage) {
  if (!storage || typeof storage.getItem !== 'function') throw new Error('本地档案存储不可用。');
  return readAccountIndex(storage).accounts.sort((a, b) => a.slot - b.slot);
}

export async function createStoredAccount({ name, password, state, storage, cryptoApi = globalThis.crypto }) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new Error('本地档案存储不可用。');
  }
  const snapshot = stateSnapshot(state);
  const { id, envelope, session } = await createEncryptedAccount({ name, password, state: snapshot, cryptoApi });
  const index = readAccountIndex(storage);
  if (index.accounts.some((account) => account.id === id)) throw new Error('档案编号冲突，请重试。');
  const slot = index.accounts.reduce((largest, account) => Math.max(largest, account.slot), 0) + 1;
  const nextIndex = { version: ACCOUNT_INDEX_VERSION, accounts: [...index.accounts, { id, slot }] };
  const recordKey = accountStorageKey(id);
  try {
    writeAndVerify(storage, recordKey, envelope);
    writeAndVerify(storage, ACCOUNT_INDEX_KEY, nextIndex);
  } catch (error) {
    try { storage.removeItem(recordKey); } catch { /* leave encrypted orphan rather than risk plaintext fallback */ }
    throw error;
  }
  return { id, envelope, session, slot };
}

export async function openStoredAccount({ id, password, storage, cryptoApi = globalThis.crypto }) {
  if (!storage || typeof storage.getItem !== 'function') throw new Error('本地档案存储不可用。');
  if (!readAccountIndex(storage).accounts.some((account) => account.id === id)) {
    throw new Error('未找到此本地档案。');
  }
  let envelope;
  try {
    envelope = JSON.parse(storage.getItem(accountStorageKey(id)) || 'null');
  } catch {
    throw new Error('档案加密数据无法读取。');
  }
  if (!envelope) throw new Error('档案加密数据不存在。');
  return unlockEncryptedAccount({ id, envelope, password, cryptoApi });
}

export function saveStoredAccount({ session, state, storage, cryptoApi = globalThis.crypto }) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    return Promise.reject(new Error('本地档案存储不可用。'));
  }
  let snapshot;
  try {
    snapshot = stateSnapshot(state);
  } catch (error) {
    return Promise.reject(error);
  }
  if (!session?.id) return Promise.reject(new Error('账户尚未解锁，无法加密保存。'));
  let accountQueues = saveQueues.get(storage);
  if (!accountQueues) {
    accountQueues = new Map();
    saveQueues.set(storage, accountQueues);
  }
  const previous = accountQueues.get(session.id) || Promise.resolve();
  const operation = previous.catch(() => {}).then(async () => {
    const envelope = await encryptAccountState({ state: snapshot, session, cryptoApi });
    writeAndVerify(storage, accountStorageKey(session.id), envelope);
    session.envelope = envelope;
    return envelope;
  });
  accountQueues.set(session.id, operation);
  operation.then(
    () => { if (accountQueues.get(session.id) === operation) accountQueues.delete(session.id); },
    () => { if (accountQueues.get(session.id) === operation) accountQueues.delete(session.id); },
  );
  return operation;
}

export async function migrateLegacyAccount({ name, password, state: migrationState, storage, cryptoApi = globalThis.crypto }) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.removeItem !== 'function') {
    throw new Error('本地档案存储不可用。');
  }
  const raw = storage.getItem(LEGACY_STORAGE_KEY);
  if (raw === null) throw new Error('没有检测到可迁移的旧版本地记录。');
  let legacyState;
  try {
    legacyState = JSON.parse(raw);
  } catch {
    throw new Error('旧版本地记录无法读取，原记录已保留。');
  }
  const snapshot = stateSnapshot(migrationState ?? legacyState);
  const created = await createStoredAccount({ name, password, state: snapshot, storage, cryptoApi });
  const verified = await openStoredAccount({ id: created.id, password, storage, cryptoApi });
  if (JSON.stringify(verified.state) !== JSON.stringify(snapshot)) {
    throw new Error('旧版记录加密回读不一致；原记录已保留。');
  }
  storage.removeItem(LEGACY_STORAGE_KEY);
  return created;
}
