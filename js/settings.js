// ============================================================
// نور المعرفة - تطبيق الإعدادات فعلياً
// ملف مستقل - لا يلمس templates.py
// ============================================================

(function(){
    'use strict';

    // ═══════════════ قراءة/حفظ الإعدادات ═══════════════
    function nmRead(key, fallback){
        try {
            var v = localStorage.getItem('nm_' + key);
            return v === null ? fallback : JSON.parse(v);
        } catch(e){ return fallback; }
    }

    function nmWrite(key, val){
        try { localStorage.setItem('nm_' + key, JSON.stringify(val)); } catch(e){}
    }

    // ═══════════════ CSS للتأثيرات ═══════════════
    function injectCSS(){
        if (document.getElementById('nm-settings-effects')) return;
        var style = document.createElement('style');
        style.id = 'nm-settings-effects';
        style.textContent = `
            /* حجم خط القرآن */
            body.nm-font-0 .message pre { font-size: 14px !important; line-height: 1.8 !important; }
            body.nm-font-1 .message pre { font-size: 17px !important; line-height: 2 !important; }
            body.nm-font-2 .message pre { font-size: 21px !important; line-height: 2.2 !important; }
            body.nm-font-3 .message pre { font-size: 26px !important; line-height: 2.4 !important; }

            /* حجم الخط في نافذة التفسير */
            body.nm-font-0 .popup-verse { font-size: 17px !important; }
            body.nm-font-1 .popup-verse { font-size: 20px !important; }
            body.nm-font-2 .popup-verse { font-size: 24px !important; }
            body.nm-font-3 .popup-verse { font-size: 28px !important; }

            /* لون خلفية القراءة */
            body.nm-bg-sepia {
                --bg-body: #f4ecd8 !important;
                --bg-chat: rgba(253, 246, 227, 0.9) !important;
                --bg-message-ai: rgba(255, 250, 240, 0.95) !important;
                --text-primary: #3d3425 !important;
            }
            body.nm-bg-sepia { background: #f4ecd8 !important; }

            body.nm-bg-white {
                --bg-body: #ffffff !important;
                --bg-chat: rgba(255, 255, 255, 0.95) !important;
                --bg-message-ai: #ffffff !important;
            }
            body.nm-bg-white { background: #ffffff !important; }

            body.nm-bg-night {
                --bg-body: #0a0a1a !important;
                --bg-chat: rgba(15, 15, 35, 0.95) !important;
                --bg-message-ai: rgba(25, 25, 50, 0.9) !important;
            }
            body.nm-bg-night { background: #0a0a1a !important; }

            /* إخفاء الحركات */
            body.nm-no-tashkeel .message pre,
            body.nm-no-tashkeel .popup-verse,
            body.nm-no-tashkeel .verse-text {
                font-feature-settings: "ss01", "ss02" !important;
            }

            /* إيقاف الحركات */
            body.nm-no-animations *,
            body.nm-no-animations *::before,
            body.nm-no-animations *::after {
                animation: none !important;
                transition: none !important;
            }

            /* التصميم المضغوط */
            body.nm-compact .message {
                padding: 10px 16px !important;
                font-size: 15px !important;
                border-radius: 14px !important;
                margin-bottom: 4px !important;
            }
            body.nm-compact .messages {
                padding: 12px 16px !important;
                gap: 6px !important;
            }
            body.nm-compact .header {
                padding: 8px 16px !important;
                min-height: 56px !important;
            }
            body.nm-compact .welcome h2 { font-size: 22px !important; }
            body.nm-compact .welcome .main-icon { font-size: 48px !important; }
            body.nm-compact .usage-box { padding: 12px 16px !important; }
            body.nm-compact .examples button { padding: 6px 14px !important; font-size: 12px !important; }

            /* وضع القراءة */
            body.reading-mode .header { opacity: 0.5 !important; }
            body.reading-mode .header:hover { opacity: 1 !important; }
            body.reading-mode .input-area { opacity: 0.7 !important; }
            body.reading-mode .input-area:focus-within { opacity: 1 !important; }
            body.reading-mode .welcome { display: none !important; }

            /* اتجاه اللغة */
            html[dir="ltr"] .message pre,
            html[dir="ltr"] .popup-verse {
                direction: ltr !important;
                text-align: left !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ═══════════════ تطبيق الإعدادات ═══════════════
    function applySettings(){
        // حجم الخط
        var font = Number(nmRead('quranFont', 1));
        document.body.classList.remove('nm-font-0', 'nm-font-1', 'nm-font-2', 'nm-font-3');
        document.body.classList.add('nm-font-' + font);

        // الوضع العام
        var theme = localStorage.getItem('theme') || 'light';
        document.body.classList.remove('dark-mode');
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else if (theme === 'auto') {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.body.classList.add('dark-mode');
            }
        }

        // لون خلفية القراءة
        var bg = nmRead('quranBg', 'default');
        document.body.classList.remove('nm-bg-sepia', 'nm-bg-white', 'nm-bg-night');
        if (bg === 'sepia') document.body.classList.add('nm-bg-sepia');
        else if (bg === 'white') document.body.classList.add('nm-bg-white');
        else if (bg === 'night') document.body.classList.add('nm-bg-night');

        // التشكيل
        var tashkeel = nmRead('tashkeel', true);
        document.body.classList.toggle('nm-no-tashkeel', !tashkeel);

        // الحركات
        var animations = nmRead('animations', true);
        document.body.classList.toggle('nm-no-animations', !animations);

        // التصميم المضغوط
        var compact = nmRead('compact', false);
        document.body.classList.toggle('nm-compact', compact);

        // وضع القراءة
        try {
            if (localStorage.getItem('readingMode') === '1') {
                document.body.classList.add('reading-mode');
            }
        } catch(e){}

        // اللغة
        var lang = nmRead('language', 'ar');
        document.documentElement.lang = lang;
        document.documentElement.dir = (lang === 'en' || lang === 'fr') ? 'ltr' : 'rtl';
    }

    // ═══════════════ التذكير اليومي ═══════════════
    function scheduleDailyReminder(){
        var enabled = nmRead('dailyReminder', false);
        if (!enabled) return;
        var time = nmRead('dailyTime', '08:00');
        
        // احفظ آخر تنبيه
        var lastShown = nmRead('lastReminderDate', '');
        var today = new Date().toDateString();
        
        if (lastShown === today) return; // سبق وأُظهر
        
        // احسب الوقت
        var now = new Date();
        var h = parseInt(time.split(':')[0]);
        var m = parseInt(time.split(':')[1]);
        var target = new Date();
        target.setHours(h, m, 0, 0);
        
        var delay = target.getTime() - now.getTime();
        if (delay < 0) delay = 0; // الوقت فات
        
        setTimeout(function(){
            if (Notification && Notification.permission === 'granted') {
                new Notification('📖 نور المعرفة', {
                    body: 'حان وقت قراءة وردك اليومي من القرآن',
                    icon: '/favicon.ico'
                });
                nmWrite('lastReminderDate', today);
            }
        }, delay);
    }

    // ═══════════════ التذكير بآية اليوم ═══════════════
    function scheduleAyahNotification(){
        var enabled = nmRead('ayahDaily', true);
        if (!enabled) return;
        
        var lastShown = nmRead('lastAyahDate', '');
        var today = new Date().toDateString();
        if (lastShown === today) return;
        
        // بعد 5 ثوانٍ من فتح الصفحة
        setTimeout(function(){
            fetch('/api/daily/reminder')
                .then(function(r){ return r.json(); })
                .then(function(d){
                    if (d.success && d.verse && Notification && Notification.permission === 'granted') {
                        new Notification('🌟 آية اليوم', {
                            body: 'سورة ' + d.verse.surah_name + ' — الآية ' + d.verse.verse_number + '\n' + d.verse.verse_text.substring(0, 80) + '...'
                        });
                        nmWrite('lastAyahDate', today);
                    }
                })
                .catch(function(){});
        }, 5000);
    }

    // ═══════════════ طلب إذن الإشعارات ═══════════════
    function requestNotificationPermission(){
        if (!('Notification' in window)) return;
        var daily = nmRead('dailyReminder', false);
        var ayah = nmRead('ayahDaily', true);
        var account = nmRead('accountNotifications', true);
        
        if ((daily || ayah || account) && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    // ═══════════════ حساب عدد الإحصائيات ═══════════════
    function updateStats(){
        // آيات مقروءة
        var versesRead = parseInt(nmRead('stat_verses', 0)) || 0;
        // تفاسير
        var tafsirsRead = parseInt(nmRead('stat_tafsirs', 0)) || 0;
        // محادثات
        var chats = parseInt(nmRead('stat_chats', 0)) || 0;
        
        // المفضلة
        var favs = 0;
        try {
            var arr = JSON.parse(localStorage.getItem('quranFavorites') || '[]');
            favs = arr.length;
        } catch(e){}
        
        // حدّث العناصر إن وُجدت
        var el;
        if (el = document.getElementById('nmStatVerses')) el.textContent = versesRead;
        if (el = document.getElementById('nmStatTafsirs')) el.textContent = tafsirsRead;
        if (el = document.getElementById('nmStatFavs')) el.textContent = favs;
        if (el = document.getElementById('nmStatChats')) el.textContent = chats;
        
        // آخر قراءة
        var lastEl = document.getElementById('nmStatLastRead');
        if (lastEl) {
            var last = null;
            try { last = JSON.parse(localStorage.getItem('lastRead') || 'null'); } catch(e){}
            if (last && last.surah_name) {
                lastEl.textContent = 'سورة ' + last.surah_name + (last.verse_number ? ' — الآية ' + last.verse_number : '');
            } else {
                lastEl.textContent = 'لا يوجد';
            }
        }
    }

    // ═══════════════ زيادة الإحصائيات ═══════════════
    window.nmIncrementStat = function(key){
        var current = parseInt(nmRead('stat_' + key, 0)) || 0;
        nmWrite('stat_' + key, current + 1);
        updateStats();
    };

    // ═══════════════ تصفير الإحصائيات ═══════════════
    window.nmClearStats = function(){
        nmWrite('stat_verses', 0);
        nmWrite('stat_tafsirs', 0);
        nmWrite('stat_chats', 0);
        updateStats();
    };

    // ═══════════════ مراقبة تغييرات الإعدادات ═══════════════
    function watchSettings(){
        // من نفس الصفحة
        window.addEventListener('nm-settings-changed', function(e){
            applySettings();
            if (e.detail && e.detail.key) {
                // إذا تغيّر شيء معين
                if (e.detail.key === 'theme') {
                    var btn = document.getElementById('themeBtn');
                    if (btn) btn.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
                }
            }
        });
        
        // من تبويب آخر
        window.addEventListener('storage', function(e){
            if (e.key && e.key.startsWith('nm_')) {
                applySettings();
            }
        });
    }

    // ═══════════════ متابعة تغيير حجم الخط ═══════════════
    document.addEventListener('input', function(e){
        if (e.target.id === 'nmSetFont') {
            var v = Number(e.target.value);
            nmWrite('quranFont', v);
            document.body.classList.remove('nm-font-0','nm-font-1','nm-font-2','nm-font-3');
            document.body.classList.add('nm-font-' + v);
            var lbl = document.getElementById('nmSetFontLabel');
            if (lbl) lbl.textContent = ['صغير','متوسط','كبير','ضخم'][v] || 'متوسط';
        }
    });

    // ═══════════════ متابعة تغيير الإعدادات (selects + switches) ═══════════════
    document.addEventListener('change', function(e){
        var id = e.target.id;
        var val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        
        // الخريطة
        var map = {
            'nmSetAutoTafsir': 'autoTafsir',
            'nmSetDaily': 'dailyReminder',
            'nmSetAccount': 'accountNotifications',
            'nmSetLang': 'language',
            'nmSetBg': 'quranBg',
            'nmSetDefaultTafsir': 'defaultTafsir',
            'nmSetPageSize': 'pageSize',
            'nmSetTashkeel': 'tashkeel',
            'nmSetAyahDaily': 'ayahDaily',
            'nmSetEmailNotif': 'emailNotif',
            'nmSetSound': 'sound',
            'nmSetAnimations': 'animations',
            'nmSetCompact': 'compact',
            'nmSet2FA': 'enable2FA',
            'nmSetLoginAlerts': 'loginAlerts',
            'nmSetTimezone': 'timezone',
            'nmSetCalendar': 'calendar',
            'nmSetTimeFormat': 'timeFormat'
        };
        
        if (map[id]) {
            nmWrite(map[id], val);
            applySettings();
            // بث الحدث
            window.dispatchEvent(new CustomEvent('nm-settings-changed', {
                detail: { key: map[id], value: val }
            }));
        }
        
        // الوضع
        if (id === 'nmSetTheme') {
            localStorage.setItem('theme', val);
            applySettings();
            var btn = document.getElementById('themeBtn');
            if (btn) btn.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
        }
        
        // وقت التذكير
        if (id === 'nmSetDailyTime') {
            nmWrite('dailyTime', val);
            scheduleDailyReminder();
        }
    });

    // ═══════════════ إعادة جدولة التذكيرات عند التحميل ═══════════════
    function init(){
        injectCSS();
        applySettings();
        watchSettings();
        requestNotificationPermission();
        scheduleDailyReminder();
        scheduleAyahNotification();
        
        // حدّث الإحصائيات عند فتح الإعدادات
        document.addEventListener('click', function(e){
            var t = e.target;
            while (t && t !== document) {
                if (t.dataset && t.dataset.nmTab === 'activity') {
                    updateStats();
                    break;
                }
                t = t.parentElement;
            }
        });
        
        console.log('✅ settings.js محمّل — الإعدادات تعمل فعلياً');
    }

    // تشغيل
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
