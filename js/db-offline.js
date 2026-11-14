// نور المعرفة — IndexedDB Wrapper
window.NoorDB = (function() {
  const DB_NAME = 'noor_almaarifa';
  const DB_VERSION = 1;
  let dbInstance = null;

  async function open() {
    if (dbInstance) return dbInstance;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('verses')) {
          const s = db.createObjectStore('verses', {keyPath: 'id'});
          s.createIndex('surah_id', 'surah_id');
          s.createIndex('surah_verse', ['surah_id','verse_number'], {unique: true});
        }
        if (!db.objectStoreNames.contains('surahs'))
          db.createObjectStore('surahs', {keyPath: 'id'});
        if (!db.objectStoreNames.contains('tafsirs'))
          db.createObjectStore('tafsirs', {keyPath: 'key'});
        if (!db.objectStoreNames.contains('tafsir_books'))
          db.createObjectStore('tafsir_books', {keyPath: 'key'});
        if (!db.objectStoreNames.contains('pending_sync'))
          db.createObjectStore('pending_sync', {keyPath: 'id', autoIncrement: true});
      };
      req.onsuccess = () => { dbInstance = req.result; resolve(dbInstance); };
      req.onerror = () => reject(req.error);
    });
  }

  async function tx(store, mode, op) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      const r = op(s);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  const getAll = (s) => tx(s, 'readonly', x => x.getAll());
  const get = (s, k) => tx(s, 'readonly', x => x.get(k));
  const put = (s, v) => tx(s, 'readwrite', x => x.put(v));
  const count = (s) => tx(s, 'readonly', x => x.count());
  const clear = (s) => tx(s, 'readwrite', x => x.clear());

  async function putMany(store, values) {
    const db = await open();
    // تقسيم إلى chunks لتفادي تجميد UI
    const CHUNK = 500;
    const chunks = [];
    for (let i = 0; i < values.length; i += CHUNK) {
      chunks.push(values.slice(i, i + CHUNK));
    }
    
    for (const chunk of chunks) {
      await new Promise((resolve, reject) => {
        const t = db.transaction(store, 'readwrite');
        const s = t.objectStore(store);
        chunk.forEach(v => s.put(v));
        t.oncomplete = () => resolve(true);
        t.onerror = () => reject(t.error);
      });
      // اسمح للـ UI بالتنفس
      await new Promise(r => setTimeout(r, 0));
    }
    return true;
  }

  return {
    open,
    async hasQuranData() { return (await count('verses')) > 0; },
    async saveQuran(d) {
      if (d.verses) await putMany('verses', d.verses);
      if (d.surahs) await putMany('surahs', d.surahs);
    },
    saveSurahs: (d) => putMany('surahs', d.surahs || d),
    getSurahs: () => getAll('surahs'),
    async getVerse(sid, vn) {
      const db = await open();
      return new Promise((res, rej) => {
        const t = db.transaction('verses', 'readonly');
        const idx = t.objectStore('verses').index('surah_verse');
        const r = idx.get([sid, vn]);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    },
    async getSurahVerses(sid) {
      const db = await open();
      return new Promise((res, rej) => {
        const t = db.transaction('verses', 'readonly');
        const idx = t.objectStore('verses').index('surah_id');
        const r = idx.getAll(sid);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    },
    async getRandomVerse() {
      const total = await count('verses');
      if (!total) return null;
      const idx = Math.floor(Math.random() * total);
      const db = await open();
      return new Promise((res, rej) => {
        const t = db.transaction('verses', 'readonly');
        const s = t.objectStore('verses');
        let i = 0;
        const r = s.openCursor();
        r.onsuccess = (e) => {
          const c = e.target.result;
          if (!c) return res(null);
          if (i === idx) return res(c.value);
          i++; c.continue();
        };
        r.onerror = () => rej(r.error);
      });
    },
    async searchVerses(kw) {
      const all = await getAll('verses');
      const l = kw.toLowerCase();
      return all.filter(v => (v.verse_text||'').toLowerCase().includes(l)).slice(0, 50);
    },
    async saveTafsirs(d) {
      if (d.books) await putMany('tafsir_books', d.books);
      if (d.tafsirs) {
        for (const [key, content] of Object.entries(d.tafsirs))
          await put('tafsirs', {key, content});
      }
    },
    getTafsirBooks: () => getAll('tafsir_books'),
    getTafsirBook: (k) => get('tafsir_books', k),
    async getTafsir(bk, sid, vn) {
      const b = await get('tafsirs', bk);
      if (!b || !b.content) return '⚠️ لا يوجد تفسير';
      const s = b.content[String(sid)];
      if (!s) return '⚠️ لا يوجد تفسير';
      return s[String(vn)] || `⚠️ لا يوجد تفسير للآية ${sid}:${vn}`;
    },
    async getAllTafsirs(sid, vn) {
      const books = await getAll('tafsir_books');
      const out = [];
      for (const b of books) {
        const text = await this.getTafsir(b.key, sid, vn);
        out.push({...b, text});
      }
      return out;
    },
    addPending: (i) => put('pending_sync', i),
    getPendingSync: () => getAll('pending_sync'),
    removePending: (id) => tx('pending_sync', 'readwrite', s => s.delete(id)),
    clearAll: async () => {
      await clear('verses'); await clear('surahs');
      await clear('tafsirs'); await clear('tafsir_books');
    }
  };
})();
