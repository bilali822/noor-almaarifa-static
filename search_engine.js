// محرك البحث القرآني — v1.0
(function() {
  'use strict';

  const SURAH_MAP = {
    "الفاتحة":1,"البقرة":2,"آل عمران":3,"النساء":4,"المائدة":5,"الأنعام":6,"الأعراف":7,"الأنفال":8,"التوبة":9,"يونس":10,"هود":11,"يوسف":12,"الرعد":13,"إبراهيم":14,"الحجر":15,"النحل":16,"الإسراء":17,"الكهف":18,"مريم":19,"طه":20,"الأنبياء":21,"الحج":22,"المؤمنون":23,"النور":24,"الفرقان":25,"الشعراء":26,"النمل":27,"القصص":28,"العنكبوت":29,"الروم":30,"لقمان":31,"السجدة":32,"الأحزاب":33,"سبأ":34,"فاطر":35,"يس":36,"الصافات":37,"ص":38,"الزمر":39,"غافر":40,"فصلت":41,"الشورى":42,"الزخرف":43,"الدخان":44,"الجاثية":45,"الأحقاف":46,"محمد":47,"الفتح":48,"الحجرات":49,"ق":50,"الذاريات":51,"الطور":52,"النجم":53,"القمر":54,"الرحمن":55,"الواقعة":56,"الحديد":57,"المجادلة":58,"الحشر":59,"الممتحنة":60,"الصف":61,"الجمعة":62,"المنافقون":63,"التغابن":64,"الطلاق":65,"التحريم":66,"الملك":67,"القلم":68,"الحاقة":69,"المعارج":70,"نوح":71,"الجن":72,"المزمل":73,"المدثر":74,"القيامة":75,"الإنسان":76,"المرسلات":77,"النبأ":78,"النازعات":79,"عبس":80,"التكوير":81,"الانفطار":82,"المطففين":83,"الانشقاق":84,"البروج":85,"الطارق":86,"الأعلى":87,"الغاشية":88,"الفجر":89,"البلد":90,"الشمس":91,"الليل":92,"الضحى":93,"الشرح":94,"التين":95,"العلق":96,"القدر":97,"البينة":98,"الزلزلة":99,"العاديات":100,"القارعة":101,"التكاثر":102,"العصر":103,"الهمزة":104,"الفيل":105,"قريش":106,"الماعون":107,"الكوثر":108,"الكافرون":109,"النصر":110,"المسد":111,"الإخلاص":112,"الفلق":113,"الناس":114
  };

  const SPECIAL = {
    "آية الكرسي": {s:2, v:255}, "اية الكرسي": {s:2, v:255},
    "آية النور": {s:24, v:35}, "آية المواريث": {s:4, v:11},
    "آية الدين": {s:2, v:282}, "آية الوضوء": {s:5, v:6},
    "خواتيم البقرة": {s:2, v:285, e:286}
  };

  function normalize(t) {
    if (!t) return '';
    return String(t)
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[ًٌٍَُِّْـ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function findSurah(text) {
    if (!text) return null;
    const n = normalize(text);

    for (const [name, id] of Object.entries(SURAH_MAP)) {
      if (normalize(name) === n) return id;
    }
    for (const [name, id] of Object.entries(SURAH_MAP)) {
      if (n.includes(normalize(name))) return id;
    }
    const words = n.split(/\s+/);
    for (const w of words) {
      if (w.length < 3) continue;
      for (const [name, id] of Object.entries(SURAH_MAP)) {
        const nn = normalize(name);
        if (nn.includes(w) || w.includes(nn)) return id;
      }
    }
    return null;
  }

  function parse(q) {
    const original = String(q || '').trim();
    const n = normalize(original);

    // آيات خاصة
    for (const [name, info] of Object.entries(SPECIAL)) {
      if (n.includes(normalize(name))) {
        return {type: info.e ? 'range' : 'verse', surahId: info.s, verseNumber: info.v, startVerse: info.v, endVerse: info.e || null, original};
      }
    }

    // S:V
    let m = original.match(/(\d+)\s*[:：]\s*(\d+)/);
    if (m) {
      const sid = +m[1], vn = +m[2];
      if (sid >= 1 && sid <= 114) return {type: 'verse', surahId: sid, verseNumber: vn, original};
    }

    // نطاق
    m = original.match(/(\d+)\s*(?:إلى|الى|حتى|-|–)\s*(\d+)/);
    if (m) {
      const v1 = +m[1], v2 = +m[2];
      const sid = findSurah(original);
      if (sid && v1 <= v2 && v2 - v1 < 200) return {type: 'range', surahId: sid, startVerse: v1, endVerse: v2, original};
    }

    // سورة + رقم
    const nums = original.match(/\d+/g) || [];
    const sid = findSurah(original);
    if (sid && nums.length > 0) {
      const vn = parseInt(nums[nums.length - 1]);
      if (vn >= 1 && vn <= 300) return {type: 'verse', surahId: sid, verseNumber: vn, original};
    }

    // سورة فقط
    if (sid) return {type: 'surah', surahId: sid, original};

    // رقم فقط
    if (/^\d+$/.test(original)) {
      const v = +original;
      if (v >= 1 && v <= 114) return {type: 'surah', surahId: v, original};
    }

    // بحث
    return {type: 'search', term: n.length >= 2 ? n : null, original};
  }

  async function search(query, NoorDB) {
    const p = parse(query);
    console.log('[SearchEngine] parsed:', p);

    try {
      // ═══ آية محددة ═══
      if (p.type === 'verse' && p.surahId && p.verseNumber) {
        console.log('[SearchEngine] آية:', p.surahId, p.verseNumber);
        const v = await NoorDB.getVerse(p.surahId, p.verseNumber);
        
        if (!v) {
          return {success: false, reply: `❌ لم أجد الآية ${p.verseNumber} في السورة ${p.surahId}`};
        }

        const tafsirs = await NoorDB.getAllTafsirs(p.surahId, p.verseNumber);

        return {
          success: true,
          type: 'verse',
          reply: `📖 سورة ${v.surah_name} — الآية ${v.verse_number}\n\n﴿ ${v.verse_text} ﴾`,
          data: {
            surah_name: v.surah_name,
            surah_id: p.surahId,
            verse_number: p.verseNumber,
            verse_text: v.verse_text,
            tafsir_books: tafsirs
          }
        };
      }

      // ═══ نطاق ═══
      if (p.type === 'range' && p.surahId) {
        const all = await NoorDB.getSurahVerses(p.surahId);
        const range = all.filter(v => v.verse_number >= p.startVerse && v.verse_number <= p.endVerse);
        if (range.length > 0) {
          const tafsirs = await NoorDB.getAllTafsirs(p.surahId, range[0].verse_number);
          let reply = `📖 سورة ${range[0].surah_name} — ${p.startVerse}-${p.endVerse}\n\n`;
          range.forEach(v => { reply += `${v.verse_number}. ﴿ ${v.verse_text} ﴾\n\n`; });
          return {
            success: true, type: 'range', reply,
            data: {
              surah_name: range[0].surah_name, surah_id: p.surahId,
              start_verse: p.startVerse, end_verse: p.endVerse,
              verses: range, tafsir_books: tafsirs
            }
          };
        }
      }

      // ═══ سورة ═══
      if (p.type === 'surah' && p.surahId) {
        const vs = await NoorDB.getSurahVerses(p.surahId);
        if (vs.length > 0) {
          const tafsirs = await NoorDB.getAllTafsirs(p.surahId, vs[0].verse_number);
          let reply = `📖 سورة ${vs[0].surah_name} (${vs.length} آية)\n\n`;
          vs.slice(0, 20).forEach(v => { reply += `${v.verse_number}. ﴿ ${v.verse_text} ﴾\n\n`; });
          if (vs.length > 20) reply += `\n... و ${vs.length - 20} آية أخرى\n💡 لرؤية المزيد: "${vs[0].surah_name} 21-${Math.min(40, vs.length)}"`;

          return {
            success: true, type: 'surah', reply,
            data: {
              surah_name: vs[0].surah_name, surah_id: p.surahId,
              verse_count: vs.length, verses: vs.slice(0, 20),
              tafsir_books: tafsirs
            }
          };
        }
      }

      // ═══ بحث ═══
      if (p.type === 'search' && p.term) {
        const results = await NoorDB.searchVerses(p.term);
        if (results.length > 0) {
          let reply = `🔍 نتائج "${p.term}" (${results.length})\n\n`;
          results.slice(0, 10).forEach((r, i) => {
            reply += `${i + 1}. ${r.surah_name} ${r.verse_number}\n   ﴿ ${r.verse_text.substring(0, 120)}... ﴾\n\n`;
          });
          return {success: true, type: 'search', reply, data: {results}};
        }
        return {success: false, reply: `❌ لا نتائج لـ "${p.term}"`};
      }

      // ═══ لم أفهم ═══
      return {
        success: false,
        reply: `🤔 لم أفهم "${p.original}"\n\n📚 جرّب:\n• اسم سورة: "البقرة"\n• آية: "2:255"\n• نطاق: "البقرة 1-5"\n• بحث: "الرحمن"`
      };

    } catch (e) {
      console.error('[SearchEngine] خطأ:', e);
      return {success: false, reply: `⚠️ خطأ: ${e.message}`};
    }
  }

  window.QuranSearchEngine = {
    search, parse, findSurah, normalize, SURAH_MAP, SPECIAL
  };
  console.log('✅ QuranSearchEngine v1.0 جاهز');
})();
