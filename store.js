// 本機資料庫（IndexedDB）：轉好的文字、詞庫、未完成的進度，全部只存在使用者自己的瀏覽器。
const DB = 'whisper-web';
const VER = 1;
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, VER);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('transcripts')) {
        const s = db.createObjectStore('transcripts', { keyPath: 'id' });
        s.createIndex('owner', 'owner');
      }
      if (!db.objectStoreNames.contains('vocab')) {
        const s = db.createObjectStore('vocab', { keyPath: 'id' });
        s.createIndex('owner', 'owner');
      }
      if (!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts', { keyPath: 'owner' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}

function tx(store, mode, fn) {
  return open().then((db) => new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    Promise.resolve(fn(s)).then((v) => { out = v; });
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  }));
}
const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

async function listBy(store, owner) {
  return tx(store, 'readonly', (s) => req(s.index('owner').getAll(owner)));
}

// ---- 轉錄紀錄 ----
export async function listTranscripts(owner) {
  const all = await listBy('transcripts', owner);
  return all.sort((a, b) => b.created - a.created);
}
export const putTranscript = (t) => tx('transcripts', 'readwrite', (s) => req(s.put(t)));
export const deleteTranscript = (id) => tx('transcripts', 'readwrite', (s) => req(s.delete(id)));

/** 免費版只保留最新 keep 筆，回傳被刪掉的筆數 */
export async function enforceLimit(owner, keep) {
  if (!isFinite(keep)) return 0;
  const all = await listTranscripts(owner);
  const extra = all.slice(keep);
  for (const t of extra) await deleteTranscript(t.id);
  return extra.length;
}

// ---- 詞庫 ----
export async function listVocab(owner) {
  const all = await listBy('vocab', owner);
  return all.sort((a, b) => a.created - b.created);
}
export const putVocab = (v) => tx('vocab', 'readwrite', (s) => req(s.put(v)));
export const deleteVocab = (id) => tx('vocab', 'readwrite', (s) => req(s.delete(id)));

// ---- 未完成的長檔案進度（當掉或關掉後可以接著做）----
export const getDraft = (owner) => tx('drafts', 'readonly', (s) => req(s.get(owner)));
export const putDraft = (d) => tx('drafts', 'readwrite', (s) => req(s.put(d)));
export const clearDraft = (owner) => tx('drafts', 'readwrite', (s) => req(s.delete(owner)));

// ---- 備份／還原（資料只在本機，換電腦或清瀏覽器前要先備份）----
export async function exportAll(owner) {
  return {
    app: 'whisper-web', version: 1, exported: new Date().toISOString(),
    transcripts: await listTranscripts(owner),
    vocab: await listVocab(owner),
  };
}
export async function importAll(owner, data) {
  let n = 0;
  for (const t of data.transcripts || []) { await putTranscript({ ...t, owner }); n++; }
  for (const v of data.vocab || []) { await putVocab({ ...v, owner }); }
  return n;
}

/** 訪客登入帳號後，把訪客時期的資料搬到帳號底下（同一台電腦） */
export async function adopt(fromOwner, toOwner) {
  for (const t of await listTranscripts(fromOwner)) await putTranscript({ ...t, owner: toOwner });
  for (const v of await listVocab(fromOwner)) await putVocab({ ...v, owner: toOwner });
}
