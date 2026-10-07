// ============================================================
// نور المعرفة — Offline Manager v3.0 (موحّد)
// ============================================================
(function() {
  'use strict';

  const OM = {
    isOnline: navigator.onLine,

    async init() {
      if (!window.NoorDB) {
        console.warn('[Offline] NoorDB غير محمّل');
        return;
      }

      const has = await NoorDB.hasQuranData();
      if (!has && this.isOnline) {
        if (window.ProgressiveLoader) {
          window.ProgressiveLoader.load();
        } else {
          this.downloadAll();
        }
      }

      window.addEventListener('online', () => {
        this.isOnline = true;
        this.status('✅ عاد الاتصال');
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.status('📴 وضع عدم الاتصال');
      });

      // تسجيل hook مع تحسين
      const origFetch = window.fetch;
      let fetchCount = 0;
      window.fetch = async function(...args) {
        fetchCount++;
        // استخدام Cache للطلبات المتكررة
        return origFetch.apply(this, args);
      };
      console.log('[Offline] جاهز. الإنترنت:', this.isOnline);
    },

    async downloadAll(onProgress) {
      const setPct = (pct, msg) => {
        pct = Math.max(0, Math.min(100, Math.round(pct)));
        if (window.DownloadProgress) {
          window.DownloadProgress.show();
          window.DownloadProgress.update(pct);
        }
        if (msg) this.status(msg);
        if (typeof onProgress === 'function') onProgress({ percent: pct });
      };

      setPct(0, '⬇️ بدء التحميل...');

      try {
        const db = await NoorDB.open();

        // ═══ 1. القرآن ═══
        setPct(5, '⬇️ تحميل القرآن...');
        const q = await fetch('./data/quran_offline.json').then(r => r.json());
        setPct(25);
        await NoorDB.saveQuran(q);
        setPct(30, `✅ ${q.verses.length} آية`);

        // ═══ 2. فهرس التفاسير ═══
        setPct(32, '⬇️ فهرس التفاسير...');
        const idx = await fetch('./data/tafsirs_index.json').then(r => r.json());
        const books = idx.books || [];
        setPct(35);
        console.log('[Offline] عدد التفاسير:', books.length);

        // ═══ 3. حمّل كل التفاسير ═══
        let completed = 0;
        const totalBooks = books.length;

        for (const book of books) {
          try {
            // إصلاح المسار
            let file = book.file || ('./data/tafsirs/' + book.key + '.json');
            file = file.replace('/static/data/', './data/');
            file = file.replace('data/data/', 'data/');
            if (!file.startsWith('./') && !file.startsWith('http')) {
              file = './' + file;
            }
            
            const pctBefore = 35 + Math.round((completed / totalBooks) * 55);
            setPct(pctBefore, `⬇️ ${book.short_name || book.key} (${completed+1}/${totalBooks})`);
            
            console.log('[Offline] تحميل:', book.key, 'من', file);
            
            const res = await fetch(file);
            if (!res.ok) {
              throw new Error('HTTP ' + res.status);
            }
            const content = await res.json();
            
            // 💾 احفظ في IndexedDB مباشرة
            const tx = db.transaction('tafsirs', 'readwrite');
            const store = tx.objectStore('tafsirs');
            store.put({ key: book.key, content: content });
            await new Promise((resolve, reject) => {
              tx.oncomplete = resolve;
              tx.onerror = reject;
            });
            
            completed++;
            console.log('[Offline] ✅ ' + book.key + ': ' + Object.keys(content).length + ' سورة');
            
            const pctAfter = 35 + Math.round((completed / totalBooks) * 55);
            setPct(pctAfter, `✅ ${book.short_name || book.key} (${completed}/${totalBooks})`);
            
          } catch (e) {
            console.warn('[Offline] ❌ فشل ' + book.key + ': ' + e.message);
            completed++;
          }
        }

        setPct(92, '💾 حفظ الفهرس...');

        // ═══ 4. احفظ الفهرس ═══
        const booksTx = db.transaction('tafsir_books', 'readwrite');
        const booksStore = booksTx.objectStore('tafsir_books');
        for (const book of books) {
          booksStore.put(book);
        }
        await new Promise((resolve, reject) => {
          booksTx.oncomplete = resolve;
          booksTx.onerror = reject;
        });

        setPct(100);
        if (window.DownloadProgress) window.DownloadProgress.complete();
        this.status('✅ تم التحميل — ' + completed + ' تفاسير جاهزة');
        
        console.log('[Offline] ✅ اكتمل التحميل — ' + completed + ' تفاسير');
        
        return true;
      } catch (e) {
        console.error('[Offline] فشل:', e);
        if (window.DownloadProgress) window.DownloadProgress.error();
        throw e;
      }
    },

    hookFetch() {
      const orig = window.fetch.bind(window);
      const self = this;
      
      window.fetch = async function(input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const path = new URL(url, location.origin).pathname;
        
        // ═══ اعترض الطلبات على /api/ أو api-*.json دائمًا ═══
        if (path.startsWith('/api/') || path.match(/\/api-[a-z]+\.json$/)) {
          // إذا كنا متصلين، جرّب الشبكة أولاً
          if (self.isOnline) {
            try {
              return await orig(input, init);
            } catch (e) {
              // fallback
            }
          }
          // اعتراض محلي
          return self.local(path, init);
        }
        
        // الباقي — مرر عادي
        if (self.isOnline) {
          try { return await orig(input, init); }
          catch { return self.local(url, init); }
        }
        return self.local(url, init);
      };
    },

    async local(url, init) {
      const path = new URL(url, location.origin).pathname;
      const method = (init?.method || 'GET').toUpperCase();

      if (!window.NoorDB) return json({success:false, offline:true});

      // ═══ APIs ═══
      if (path === '/api/surahs') return json({success:true, surahs: await NoorDB.getSurahs(), offline:true});
      if (path === '/api/verse/random') return json({success:true, verse: await NoorDB.getRandomVerse(), offline:true});
      if (path === '/api/tafsir/books') return json({books: await NoorDB.getTafsirBooks(), offline:true});

      // آية محددة
      const m = path.match(/^\/api\/verse\/(\d+)\/(\d+)$/);
      if (m) {
        const v = await NoorDB.getVerse(+m[1], +m[2]);
        return json(v ? {success:true, verse:v, offline:true} : {success:false, error:'غير موجودة'});
      }

      // ═══ الشات ═══
      if (path === '/api/chat/send' && method === 'POST')
        return await this.chat(JSON.parse(init.body || '{}'));

      if (path === '/api/chat/tafsir/select' && method === 'POST')
        return await this.tafsir(JSON.parse(init.body || '{}'));

      return json({success:false, offline:true, error:'غير متوفر offline'});
    },

    // ═══════════════════════════════════════════════════
    // الشات — يستخدم QuranSearchEngine أولاً
    // ═══════════════════════════════════════════════════
    async chat(d) {
      const msg = (d.message || '').trim();
      console.log('[Offline] chat:', msg);

      // ✅ استخدم محرك البحث الجديد
      if (window.QuranSearchEngine) {
        console.log('[Offline] استخدام QuranSearchEngine');
        const result = await window.QuranSearchEngine.search(msg, NoorDB);
        console.log('[Offline] النتيجة:', result);

        // جلب التفاسير للآية إن وُجدت
        let tafsir_books = [];
        if (result.data && result.data.surah_id && result.data.verse_number) {
          tafsir_books = await NoorDB.getAllTafsirs(
            result.data.surah_id,
            result.data.verse_number
          );
          result.data.tafsir_books = tafsir_books;
        } else if (result.data && result.data.verses && result.data.verses.length > 0) {
          // نطاق أو سورة
          const first = result.data.verses[0];
          tafsir_books = await NoorDB.getAllTafsirs(first.surah_id, first.verse_number);
          result.data.tafsir_books = tafsir_books;
        }

        return json({
          success: result.success,
          type: result.type || 'ai_response',
          reply: result.reply,
          data: result.data,
          chat_id: d.chat_id,
          offline: true
        });
      }

      // ❌ fallback قديم
      console.warn('[Offline] QuranSearchEngine غير موجود — استخدم fallback');
      return await this.chatFallback(d);
    },

    async chatFallback(d) {
      const msg = (d.message || '').trim();
      const p = this.parse(msg);

      if (p.sid && p.vn) {
        const v = await NoorDB.getVerse(p.sid, p.vn);
        if (v) {
          const t = await NoorDB.getAllTafsirs(p.sid, p.vn);
          return json({
            success: true, type: 'verse', chat_id: d.chat_id,
            data: {
              surah_name: v.surah_name, surah_id: p.sid, verse_number: p.vn,
              verse_text: v.verse_text, tafsir_books: t, offline: true
            }
          });
        }
        return json({success: false, reply: `❌ لم أجد الآية ${p.vn}`, chat_id: d.chat_id, offline: true});
      }

      if (p.sid && !p.vn) {
        const vs = await NoorDB.getSurahVerses(p.sid);
        if (vs.length) {
          const t = await NoorDB.getAllTafsirs(p.sid, vs[0].verse_number);
          return json({
            success: true, type: 'surah', chat_id: d.chat_id,
            data: {
              surah_name: vs[0].surah_name, surah_id: p.sid, verse_count: vs.length,
              verses: vs.slice(0, 20), tafsir_books: t, offline: true
            }
          });
        }
      }

      return json({success: false, reply: '📴 جرّب اسم سورة أو آية.', chat_id: d.chat_id, offline: true});
    },

    // ═══════════════════════════════════════════════════
    // التفسير — إصلاح جذري
    // ═══════════════════════════════════════════════════
    async tafsir(d) {
      const vi = d.verse_info || {};
      const sel = d.selected_tafsirs || [];
      const vs = (vi.verses && vi.verses.length) ? vi.verses : [vi];

      console.log('[Offline] tafsir — الآيات:', vs.length, 'التفاسير:', sel);

      let out = '';

      for (const v of vs) {
        const sid = v.surah_id || vi.surah_id;
        const vn = v.verse_number || vi.verse_number;
        const sn = v.surah_name || vi.surah_name;
        const vt = v.verse_text || vi.verse_text || '';

        out += `📖 سورة ${sn} — الآية ${vn}\n﴿ ${vt} ﴾\n\n`;

        for (const k of sel) {
          const t = await NoorDB.getTafsir(k, sid, vn);
          const b = await NoorDB.getTafsirBook(k);

          if (t && !t.startsWith('⚠️')) {
            out += `${b?.icon || '📖'} ${b?.name || k}:\n${t}\n\n`;
          } else {
            out += `${b?.icon || '📖'} ${b?.name || k}: ⚠️ غير متوفر\n\n`;
          }
        }
        out += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      }

      out += '\n📚 المصدر: كتب التفسير المعتمدة عند أهل السنة والجماعة';
      return json({success: true, reply: out, chat_id: d.chat_id, offline: true});
    },

    parse(q) {
      const map = {"الفاتحة":1,"البقرة":2,"آل عمران":3,"النساء":4,"المائدة":5,"الأنعام":6,"الأعراف":7,"الأنفال":8,"التوبة":9,"يونس":10,"هود":11,"يوسف":12,"الرعد":13,"إبراهيم":14,"الحجر":15,"النحل":16,"الإسراء":17,"الكهف":18,"مريم":19,"طه":20,"الأنبياء":21,"الحج":22,"المؤمنون":23,"النور":24,"الفرقان":25,"الشعراء":26,"النمل":27,"القصص":28,"العنكبوت":29,"الروم":30,"لقمان":31,"السجدة":32,"الأحزاب":33,"سبأ":34,"فاطر":35,"يس":36,"الصافات":37,"ص":38,"الزمر":39,"غافر":40,"فصلت":41,"الشورى":42,"الزخرف":43,"الدخان":44,"الجاثية":45,"الأحقاف":46,"محمد":47,"الفتح":48,"الحجرات":49,"ق":50,"الذاريات":51,"الطور":52,"النجم":53,"القمر":54,"الرحمن":55,"الواقعة":56,"الحديد":57,"المجادلة":58,"الحشر":59,"الممتحنة":60,"الصف":61,"الجمعة":62,"المنافقون":63,"التغابن":64,"الطلاق":65,"التحريم":66,"الملك":67,"القلم":68,"الحاقة":69,"المعارج":70,"نوح":71,"الجن":72,"المزمل":73,"المدثر":74,"القيامة":75,"الإنسان":76,"المرسلات":77,"النبأ":78,"النازعات":79,"عبس":80,"التكوير":81,"الانفطار":82,"المطففين":83,"الانشقاق":84,"البروج":85,"الطارق":86,"الأعلى":87,"الغاشية":88,"الفجر":89,"البلد":90,"الشمس":91,"الليل":92,"الضحى":93,"الشرح":94,"التين":95,"العلق":96,"القدر":97,"البينة":98,"الزلزلة":99,"العاديات":100,"القارعة":101,"التكاثر":102,"العصر":103,"الهمزة":104,"الفيل":105,"قريش":106,"الماعون":107,"الكوثر":108,"الكافرون":109,"النصر":110,"المسد":111,"الإخلاص":112,"الفلق":113,"الناس":114};
      q = (q || '').trim();
      let m = q.match(/(\d+)[:：](\d+)/);
      if (m) return {sid: +m[1], vn: +m[2]};
      m = q.match(/([^\d]+)\s*(?:آية|اية|الآية|الاية)?\s*(\d+)/);
      if (m) {
        const n = m[1].replace('سورة','').trim();
        if (map[n]) return {sid: map[n], vn: +m[2]};
      }
      const n = q.replace('سورة','').trim();
      if (map[n]) return {sid: map[n], vn: null};
      return {sid: null, vn: null};
    },

    status(msg) {
      let b = document.getElementById('offline-status');
      if (!b) {
        b = document.createElement('div');
        b.id = 'offline-status';
        b.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#6C63FF,#5A4FCF);color:#fff;padding:10px 24px;border-radius:30px;font-weight:700;font-family:Tajawal,sans-serif;font-size:14px;z-index:99999;box-shadow:0 8px 30px rgba(108,99,255,.4);transition:all .3s;opacity:0;pointer-events:none;';
        document.body.appendChild(b);
      }
      b.textContent = msg;
      b.style.opacity = '1';
      clearTimeout(b._t);
      b._t = setTimeout(() => { b.style.opacity = '0'; }, 3000);
    }
  };

  function json(d) {
    return new Response(JSON.stringify(d), {status:200, headers:{'Content-Type':'application/json'}});
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => OM.init());
  else OM.init();

  window.OfflineManager = OM;
  console.log('✅ Offline Manager v3.0 جاهز');
})();
