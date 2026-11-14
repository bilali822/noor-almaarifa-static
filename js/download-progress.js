// ============================================================
// نور المعرفة — دائرة تقدم التحميل (في القائمة العليا)
// ============================================================

(function() {
  'use strict';

  const Progress = {
    widget: null,
    circle: null,
    number: null,
    isActive: false,
    isComplete: false,
    autoHideTimer: null,

    // ═══════════════════════════════════════════════════
    // إنشاء الأداة
    // ═══════════════════════════════════════════════════
    init() {
      if (this.widget) return;

      // SVG دائرة تقدم
      const size = 42;
      const strokeWidth = 3;
      const radius = (size - strokeWidth) / 2;
      const circumference = 2 * Math.PI * radius;

      // الحاوية
      this.widget = document.createElement('div');
      this.widget.id = 'nm-dl-circle';
      this.widget.title = 'تقدم تحميل البيانات';
      this.widget.style.cssText = `
        position: relative;
        width: ${size}px;
        height: ${size}px;
        display: none;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.25s ease, opacity 0.3s ease;
        z-index: 100;
        flex-shrink: 0;
        opacity: 0;
      `;

      this.widget.onmouseover = () => { this.widget.style.transform = 'scale(1.08)'; };
      this.widget.onmouseout = () => { this.widget.style.transform = 'scale(1)'; };
      this.widget.onclick = () => this.toggleInfo();

      // SVG
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', size);
      svg.setAttribute('height', size);
      svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
      svg.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        transform: rotate(-90deg);
        filter: drop-shadow(0 2px 6px rgba(108, 99, 255, 0.3));
      `;

      // دائرة الخلفية
      const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bgCircle.setAttribute('cx', size / 2);
      bgCircle.setAttribute('cy', size / 2);
      bgCircle.setAttribute('r', radius);
      bgCircle.setAttribute('fill', 'rgba(108, 99, 255, 0.1)');
      bgCircle.setAttribute('stroke', 'rgba(108, 99, 255, 0.15)');
      bgCircle.setAttribute('stroke-width', strokeWidth);

      // دائرة التقدم
      this.circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      this.circle.setAttribute('cx', size / 2);
      this.circle.setAttribute('cy', size / 2);
      this.circle.setAttribute('r', radius);
      this.circle.setAttribute('fill', 'none');
      this.circle.setAttribute('stroke', '#6C63FF');
      this.circle.setAttribute('stroke-width', strokeWidth);
      this.circle.setAttribute('stroke-linecap', 'round');
      this.circle.setAttribute('stroke-dasharray', circumference);
      this.circle.setAttribute('stroke-dashoffset', circumference);
      this.circle.style.transition = 'stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease';

      // الرقم في المنتصف
      this.number = document.createElement('span');
      this.number.style.cssText = `
        position: relative;
        font-family: 'Tajawal', system-ui, sans-serif;
        font-size: 12px;
        font-weight: 900;
        color: #6C63FF;
        letter-spacing: -0.5px;
        font-variant-numeric: tabular-nums;
        z-index: 2;
        line-height: 1;
        transition: color 0.3s ease;
      `;
      this.number.textContent = '0';

      svg.appendChild(bgCircle);
      svg.appendChild(this.circle);
      this.widget.appendChild(svg);
      this.widget.appendChild(this.number);

      this.circumference = circumference;
    },

    // ═══════════════════════════════════════════════════
    // إضافة الأداة إلى القائمة العليا
    // ═══════════════════════════════════════════════════
    attachToHeader() {
      if (!this.widget) this.init();

      // ابحث عن زر الوضع الليلي
      let anchor = document.querySelector('.theme-toggle') 
                || document.querySelector('.btn-theme')
                || document.getElementById('themeBtn');

      if (!anchor) {
        // جرّب بعد 500ms
        setTimeout(() => this.attachToHeader(), 500);
        return false;
      }

      // ضع الأداة قبل زر الوضع الليلي
      if (this.widget.parentNode !== anchor.parentNode) {
        anchor.parentNode.insertBefore(this.widget, anchor);
      }

      return true;
    },

    // ═══════════════════════════════════════════════════
    // عرض
    // ═══════════════════════════════════════════════════
    show() {
      if (!this.widget) this.init();
      
      if (!this.attachToHeader()) {
        setTimeout(() => this.show(), 300);
        return;
      }

      this.isActive = true;
      this.isComplete = false;
      this.widget.style.display = 'flex';
      // fade in
      requestAnimationFrame(() => {
        this.widget.style.opacity = '1';
      });
      this.setColor('#6C63FF');
      this.update(0);
    },

    // ═══════════════════════════════════════════════════
    // تحديث النسبة
    // ═══════════════════════════════════════════════════
    update(percent) {
      if (!this.widget) return;

      percent = Math.max(0, Math.min(100, Math.round(percent)));
      
      // حدّث الرقم
      if (this.number) {
        this.number.textContent = percent + '%';
        
        // تصغير الخط إذا النسبة 100%
        if (percent === 100) {
          this.number.style.fontSize = '11px';
        } else {
          this.number.style.fontSize = '12px';
        }
      }

      // حدّث الحلقة
      if (this.circle) {
        const offset = this.circumference - (percent / 100) * this.circumference;
        this.circle.setAttribute('stroke-dashoffset', offset);
      }

      // احفظ النسبة
      this._percent = percent;
    },

    // ═══════════════════════════════════════════════════
    // تغيير اللون
    // ═══════════════════════════════════════════════════
    setColor(color) {
      if (this.circle) this.circle.setAttribute('stroke', color);
      if (this.number) this.number.style.color = color;
    },

    // ═══════════════════════════════════════════════════
    // اكتمل
    // ═══════════════════════════════════════════════════
    complete() {
      this.isComplete = true;
      this.update(100);
      this.setColor('#2ECC71');

      // صح صغيرة في المنتصف
      if (this.number) {
        this.number.textContent = '✓';
        this.number.style.fontSize = '16px';
        this.number.style.color = '#2ECC71';
      }

      this.widget.title = '✅ البيانات محمّلة';

      // إخفاء بعد 4 ثوانٍ
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = setTimeout(() => this.hide(), 4000);
    },

    // ═══════════════════════════════════════════════════
    // خطأ
    // ═══════════════════════════════════════════════════
    error() {
      this.setColor('#FF4757');
      if (this.number) {
        this.number.textContent = '!';
        this.number.style.fontSize = '16px';
        this.number.style.color = '#FF4757';
      }
      this.widget.title = '⚠️ فشل التحميل';
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = setTimeout(() => this.hide(), 4000);
    },

    // ═══════════════════════════════════════════════════
    // إخفاء
    // ═══════════════════════════════════════════════════
    hide() {
      if (!this.widget) return;
      this.isActive = false;
      this.widget.style.opacity = '0';
      setTimeout(() => {
        if (this.widget) this.widget.style.display = 'none';
      }, 300);
    },

    // ═══════════════════════════════════════════════════
    // عند الضغط — عرض المعلومات
    // ═══════════════════════════════════════════════════
    toggleInfo() {
      if (this.isComplete || this._percent === 100) {
        // عرض إحصائيات
        if (window.NoorDB && window.NoorDB.getStats) {
          window.NoorDB.getStats().then(stats => {
            alert(
              '📊 حالة البيانات\n\n' +
              '📖 الآيات: ' + (stats.verses || '?') + '\n' +
              '📚 السور: ' + (stats.surahs || '?') + '\n' +
              '📕 التفاسير: ' + (stats.tafsirs || '?') + '\n' +
              '📗 كتب التفسير: ' + (stats.tafsir_books || '?') + '\n\n' +
              '✅ التطبيق يعمل بدون إنترنت'
            );
          });
        }
      } else {
        // عرض نص التقدم
        if (this.number) {
          this.number.textContent = this._percent + '%';
        }
      }
    }
  };

  // ═══════════════════════════════════════════════════
  // ربط تلقائي مع OfflineManager
  // ═══════════════════════════════════════════════════
  function hook() {
    if (!window.OfflineManager || window.OfflineManager._progressHooked) return;
    if (window.OfflineManager._progressHooked) return;

    const original = window.OfflineManager.downloadAll.bind(window.OfflineManager);

    window.OfflineManager.downloadAll = async function(onProgress) {
      Progress.show();
      Progress.update(0);

      const wrapped = (info) => {
        if (info.step === 'quran') {
          Progress.update(15);
        } else if (info.step === 'tafsir') {
          const pct = 15 + (info.progress / info.total) * 80;
          Progress.update(pct);
        } else if (info.step === 'all') {
          Progress.update(100);
        }
        if (typeof onProgress === 'function') onProgress(info);
      };

      try {
        const result = await original(wrapped);
        Progress.complete();
        return result;
      } catch (err) {
        Progress.error();
        throw err;
      }
    };

    window.OfflineManager._progressHooked = true;
    console.log('✅ [Progress] دائرة التقدم مربوطة');
  }

  // ═══════════════════════════════════════════════════
  // ربط مع init لـ OfflineManager
  // ═══════════════════════════════════════════════════
  window.addEventListener('load', () => {
    setTimeout(hook, 500);
    setTimeout(() => Progress.attachToHeader(), 800);
  });

  if (document.readyState === 'complete') {
    setTimeout(hook, 500);
    setTimeout(() => Progress.attachToHeader(), 800);
  }

  window.DownloadProgress = Progress;
  console.log('✅ دائرة تقدم التحميل جاهزة');
})();
