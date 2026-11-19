/* Fundamentals of Flying Vehicle Technology (2026) — Assignment 2: System Safety Analysis
 * Interactive HARA/FHA Calculator, STPA Filter, FTA Minimal Cut-Set Simulator & GSN Gate Audit
 */

(function () {
  'use strict';

  function isEn() {
    return document.body.classList.contains('E');
  }

  function t(cn, en) {
    return isEn() ? en : cn;
  }

  function prepareCanvas(canvas, cssHeight) {
    if (!canvas) return null;
    var dpr = window.devicePixelRatio || 1;
    var width = canvas.parentElement ? canvas.parentElement.clientWidth : 540;
    if (width < 260) width = 260;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    canvas.style.height = cssHeight + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: width, h: cssHeight };
  }

  /* 1. Language Switcher & Mobile Nav */
  window.toggleLang = function () {
    var en = document.body.classList.toggle('E');
    var btn = document.getElementById('langBtn');
    if (btn) btn.textContent = en ? '中文' : 'EN';
    document.documentElement.lang = en ? 'en' : 'zh-CN';
    try {
      localStorage.setItem('fv_lac_safety_lang', en ? 'E' : 'C');
    } catch (e) {}
    updateRiskCalc();
    updateFtaSim();
    updateSafetyAudit();
  };

  window.toggleNav = function () {
    var links = document.querySelector('.lab-nav-links');
    if (links) links.classList.toggle('open');
  };

  document.addEventListener('click', function (ev) {
    var link = ev.target.closest('.lab-nav-links a');
    if (link && !link.closest('.lab-lang-switch')) {
      var menu = document.querySelector('.lab-nav-links');
      if (menu) menu.classList.remove('open');
    }
  });

  /* 2. Reading Progress Bar & TOC Scroll-Spy */
  function setupScrollSpy() {
    var bar = document.getElementById('readingProgress');
    var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.fv-toc a'));
    var sections = tocLinks
      .map(function (a) {
        var id = a.getAttribute('href');
        return id && id.charAt(0) === '#' ? document.getElementById(id.slice(1)) : null;
      })
      .filter(Boolean);

    function onScroll() {
      var doc = document.documentElement;
      var scrollTop = window.pageYOffset || doc.scrollTop;
      var height = doc.scrollHeight - doc.clientHeight;
      if (bar && height > 0) {
        bar.style.width = Math.min(100, Math.max(0, (scrollTop / height) * 100)).toFixed(1) + '%';
      }

      var currentId = '';
      var offset = 120;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].getBoundingClientRect().top <= offset) {
          currentId = sections[i].id;
        }
      }
      tocLinks.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('href').slice(1) === currentId);
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* 3. STPA UCA Filter */
  window.filterStpa = function (domain, btnEl) {
    var btns = document.querySelectorAll('#stpaFilterBar .fv-filter-btn');
    btns.forEach(function (b) {
      b.classList.remove('active');
    });
    if (btnEl) btnEl.classList.add('active');

    var rows = document.querySelectorAll('#stpaMatrixTable tbody tr');
    rows.forEach(function (row) {
      var d = row.getAttribute('data-domain') || '';
      if (domain === 'all' || d === domain) {
        row.classList.remove('is-hidden');
      } else {
        row.classList.add('is-hidden');
      }
    });
  };

  /* 4. Dual-Domain HARA (ISO 26262) & FHA (ARP4761A / SC-VTOL) Calculator */
  var ASIL_TABLE = {
    1: {
      1: { 1: 'QM', 2: 'QM', 3: 'QM' },
      2: { 1: 'QM', 2: 'QM', 3: 'QM' },
      3: { 1: 'QM', 2: 'QM', 3: 'A' },
      4: { 1: 'QM', 2: 'A', 3: 'B' }
    },
    2: {
      1: { 1: 'QM', 2: 'QM', 3: 'QM' },
      2: { 1: 'QM', 2: 'QM', 3: 'A' },
      3: { 1: 'QM', 2: 'A', 3: 'B' },
      4: { 1: 'A', 2: 'B', 3: 'C' }
    },
    3: {
      1: { 1: 'QM', 2: 'QM', 3: 'A' },
      2: { 1: 'QM', 2: 'A', 3: 'B' },
      3: { 1: 'A', 2: 'B', 3: 'C' },
      4: { 1: 'B', 2: 'C', 3: 'D' }
    }
  };

  function calcAsil(s, e, c) {
    if (s === 0 || e === 0 || c === 0) return 'QM';
    return (ASIL_TABLE[s] && ASIL_TABLE[s][e] && ASIL_TABLE[s][e][c]) || 'QM';
  }

  var RISK_PRESETS = {
    dock_unlock: { s: 3, e: 4, c: 3, airSev: 'hazardous', airCat: 'basic' },
    oei_hover: { s: 2, e: 4, c: 2, airSev: 'catastrophic', airCat: 'basic' },
    rear_fire: { s: 3, e: 4, c: 3, airSev: 'catastrophic', airCat: 'enhanced' },
    slope_dock: { s: 2, e: 3, c: 2, airSev: 'major', airCat: 'basic' }
  };

  window.loadRiskPreset = function (key, btnEl) {
    var preset = RISK_PRESETS[key];
    if (!preset) return;
    document.querySelectorAll('#riskPresetBar .preset-btn').forEach(function (b) {
      b.classList.remove('active');
    });
    if (btnEl) btnEl.classList.add('active');

    document.getElementById('haraS').value = String(preset.s);
    document.getElementById('haraE').value = String(preset.e);
    document.getElementById('haraC').value = String(preset.c);
    document.getElementById('fhaSev').value = preset.airSev;
    document.getElementById('fhaCat').value = preset.airCat;
    updateRiskCalc();
  };

  function updateRiskCalc() {
    var sEl = document.getElementById('haraS');
    if (!sEl) return;
    var s = Number(sEl.value);
    var e = Number(document.getElementById('haraE').value);
    var c = Number(document.getElementById('haraC').value);
    var airSev = document.getElementById('fhaSev').value;
    var airCat = document.getElementById('fhaCat').value;

    var asil = calcAsil(s, e, c);
    var pmhfMap = {
      QM: t('无强制 PMHF 指标', 'No mandatory PMHF'),
      A: '< 10⁻⁶ / h (1000 FIT)',
      B: '< 10⁻⁷ / h (100 FIT)',
      C: '< 10⁻⁷ / h (100 FIT)',
      D: '< 10⁻⁸ / h (10 FIT)'
    };

    var airMap = {
      minor: { prob: '≤ 10⁻³ / fh', dal: 'DAL D', labelCn: '轻微 (Minor)', labelEn: 'Minor' },
      major: { prob: '≤ 10⁻⁵ / fh', dal: 'DAL C', labelCn: '重大 (Major)', labelEn: 'Major' },
      hazardous: {
        prob: airCat === 'enhanced' ? '≤ 10⁻⁷ / fh' : '≤ 10⁻⁶ / fh',
        dal: 'DAL B',
        labelCn: '危险 (Hazardous)',
        labelEn: 'Hazardous'
      },
      catastrophic: {
        prob: airCat === 'enhanced' ? '≤ 10⁻⁹ / fh (单点失效禁入)' : '≤ 10⁻⁷ / fh (LSA/Basic参考)',
        dal: 'DAL A',
        labelCn: '灾难性 (Catastrophic)',
        labelEn: 'Catastrophic'
      }
    };

    var airRes = airMap[airSev];
    var asilBox = document.getElementById('outAsilBox');
    asilBox.classList.remove('warn-ok', 'warn-tight', 'warn-over');
    if (asil === 'D' || asil === 'C') asilBox.classList.add('warn-over');
    else if (asil === 'B' || asil === 'A') asilBox.classList.add('warn-tight');
    else asilBox.classList.add('warn-ok');

    document.getElementById('outAsilVal').textContent =
      (asil === 'QM' ? 'QM' : 'ASIL ' + asil) + ' · ' + pmhfMap[asil];

    var fhaBox = document.getElementById('outFhaBox');
    fhaBox.classList.remove('warn-ok', 'warn-tight', 'warn-over');
    if (airSev === 'catastrophic' || airSev === 'hazardous') fhaBox.classList.add('warn-over');
    else if (airSev === 'major') fhaBox.classList.add('warn-tight');
    else fhaBox.classList.add('warn-ok');

    document.getElementById('outFhaVal').textContent =
      airRes.dal + ' · ' + airRes.prob;

    var bridgeMsg = '';
    if (asil === 'D' && airSev === 'catastrophic') {
      bridgeMsg = t(
        '耦合最高危等级：须同步满足 ISO 26262 ASIL D 硬件双路冗余与航空 DAL A 异构软件隔离，禁止单域降级设计。',
        'Dual Peak Risk: Requires simultaneous ISO 26262 ASIL D hardware redundancy and aviation DAL A dissimilar software assurance.'
      );
    } else if (airSev === 'catastrophic' || asil === 'C' || asil === 'D') {
      bridgeMsg = t(
        '跨界主导原则：取“道路 ASIL 与航空 DAL 两者中更严苛一方”作为接口设计基准（例如 800V 隔离、锁止校验）。',
        'Governing Envelope: Apply the stricter requirement between road ASIL and aviation DAL across shared interfaces.'
      );
    } else {
      bridgeMsg = t(
        '中低风险域：可通过 SOTIF 运行边界约束（ODD）与自检联锁（BIT）有效吸收残余风险。',
        'Moderate/Low Risk: Mitigable via ODD operational restrictions and pre-flight built-in test (BIT) interlocks.'
      );
    }
    document.getElementById('outRiskBridge').textContent = bridgeMsg;
  }

  /* 5. Quantitative 6-Rotor FTA Minimal Cut-Set Simulator */
  var FTA_DEFAULTS = {
    epu: 5,
    beta: 2.0,
    oei: 3.0,
    bms: 1.0,
    lowAgl: 25
  };

  function fmtSci(val) {
    if (val <= 0) return '0';
    var exp = Math.floor(Math.log10(val));
    var mant = val / Math.pow(10, exp);
    return mant.toFixed(2) + '×10^' + exp;
  }

  function updateFtaSim() {
    var epuEl = document.getElementById('ftaLambdaEpu');
    if (!epuEl) return;

    var epuScaled = Number(epuEl.value); // x 1e-5 /fh
    var betaPct = Number(document.getElementById('ftaBeta').value);
    var oeiPct = Number(document.getElementById('ftaOeiFail').value);
    var bmsScaled = Number(document.getElementById('ftaLambdaBms').value); // x 1e-6 /fh
    var lowAglPct = Number(document.getElementById('ftaLowAgl').value);

    var lambdaEpu = epuScaled * 1e-5;
    var beta = betaPct / 100;
    var pOeiFail = oeiPct / 100;
    var lambdaBms = bmsScaled * 1e-6;
    var pLowAgl = lowAglPct / 100;

    document.getElementById('valFtaEpu').textContent = epuScaled + '×10⁻⁵ /fh';
    document.getElementById('valFtaBeta').textContent = betaPct.toFixed(1) + '%';
    document.getElementById('valFtaOei').textContent = oeiPct.toFixed(1) + '%';
    document.getElementById('valFtaBms').textContent = bmsScaled.toFixed(1) + '×10⁻⁶ /fh';
    document.getElementById('valFtaLowAgl').textContent = lowAglPct + '%';

    var lambdaInd = lambdaEpu * (1 - beta);
    var cs1 = 6 * lambdaInd * pOeiFail + 15 * lambdaInd * lambdaInd;
    var cs2 = lambdaEpu * beta;
    var cs3 = lambdaBms;
    var pPreChute = cs1 + cs2 + cs3;
    /* Ballistic chute cannot arrest loss inside low-AGL dead-zone and retains ~10% residual non-deployment/impact fire risk above it */
    var pCat = pPreChute * (pLowAgl + (1 - pLowAgl) * 0.10);

    document.getElementById('outFtaPreChute').textContent = fmtSci(pPreChute) + ' /fh';
    document.getElementById('outFtaCat').textContent = fmtSci(pCat) + ' /fh';

    var domLabel = '';
    if (cs1 >= cs2 && cs1 >= cs3) {
      domLabel = t('CS1：单发失效 × OEI重构失败', 'CS1: Single-EPU × OEI Fail');
    } else if (cs2 >= cs1 && cs2 >= cs3) {
      domLabel = t('CS2：电推共因失效 (β·λ)', 'CS2: DEP Common-Cause (β·λ)');
    } else {
      domLabel = t('CS3：双电池/800V母线共因失能', 'CS3: Dual-BMS/800V CCF');
    }
    document.getElementById('outFtaDom').textContent = domLabel;

    var box = document.getElementById('outFtaVerdictBox');
    var vTxt = document.getElementById('outFtaVerdict');
    box.classList.remove('warn-ok', 'warn-tight', 'warn-over');
    if (pCat <= 1e-8) {
      box.classList.add('warn-ok');
      vTxt.textContent = t('接近 SC-VTOL 增强/商业门槛 (≤10⁻⁸/fh)', 'Approaches SC-VTOL Enhanced Target (≤10⁻⁸/fh)');
    } else if (pCat <= 5e-7) {
      box.classList.add('warn-tight');
      vTxt.textContent = t('匹配 LSA/Basic 私人娱乐边界 (10⁻⁷ 量级)，禁用于密集区商载', 'Fits LSA/Basic Private Limit (~10⁻⁷/fh); Unfit for Urban CAT');
    } else {
      box.classList.add('warn-over');
      vTxt.textContent = t('超出 Basic 10⁻⁷ 容限 — 必须压降 β 因子或 OEI 失控率', 'Exceeds Basic 10⁻⁷ Limit — Reduce β-CCF or OEI Failure');
    }

    drawFtaChart(cs1, cs2, cs3, pPreChute, pCat);
  }

  function drawFtaChart(cs1, cs2, cs3, pPreChute, pCat) {
    var canvas = document.getElementById('ftaBarCanvas');
    var p = prepareCanvas(canvas, 240);
    if (!p) return;
    var ctx = p.ctx, w = p.w, h = p.h;
    ctx.clearRect(0, 0, w, h);

    var pad = { l: 145, r: 28, t: 36, b: 36 };
    var pw = w - pad.l - pad.r;
    var ph = h - pad.t - pad.b;

    /* Log scale from 1e-9 (left) to 1e-3 (right) */
    var minExp = -9;
    var maxExp = -3;
    function toX(val) {
      var exp = Math.log10(Math.max(1e-9, Math.min(1e-3, val)));
      return pad.l + ((exp - minExp) / (maxExp - minExp)) * pw;
    }

    /* Background grid */
    for (var ex = minExp; ex <= maxExp; ex++) {
      var gx = pad.l + ((ex - minExp) / (maxExp - minExp)) * pw;
      ctx.strokeStyle = '#e5e9ed';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx, pad.t);
      ctx.lineTo(gx, h - pad.b);
      ctx.stroke();

      ctx.fillStyle = '#5e646e';
      ctx.font = '10.5px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('10^' + ex, gx, h - pad.b + 16);
    }

    /* Reference lines: Enhanced 1e-9 / 1e-8 & Basic 1e-7 */
    var xBasic = toX(1e-7);
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = '#9a5b13';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xBasic, pad.t);
    ctx.lineTo(xBasic, h - pad.b);
    ctx.stroke();
    ctx.restore();

    var xEnh = toX(1e-9);
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = '#165b3d';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xEnh + 1, pad.t);
    ctx.lineTo(xEnh + 1, h - pad.b);
    ctx.stroke();
    ctx.restore();

    /* Dynamically measured top legends (CN & EN collision-free) */
    ctx.font = '10.5px sans-serif';
    ctx.textAlign = 'right';
    var enhLbl = '│ ' + t('Enhanced 目标 (10⁻⁹)', 'Enhanced Target (10⁻⁹)');
    var basicLbl = '│ ' + t('Basic 参考线 (10⁻⁷)', 'Basic Limit (10⁻⁷)');
    var enhW = ctx.measureText(enhLbl).width;
    ctx.fillStyle = '#165b3d';
    ctx.fillText(enhLbl, w - pad.r, 18);
    ctx.fillStyle = '#9a5b13';
    ctx.fillText(basicLbl, w - pad.r - enhW - 18, 18);

    /* Bars */
    var items = [
      { lbl: t('CS1 单发×OEI/双发', 'CS1 Single×OEI/Dual'), val: cs1, color: '#416d7e' },
      { lbl: t('CS2 电推共因 (β·λ)', 'CS2 DEP CCF (β·λ)'), val: cs2, color: '#2a566b' },
      { lbl: t('CS3 800V/BMS 共因', 'CS3 800V/BMS CCF'), val: cs3, color: '#6b7280' },
      { lbl: t('伞前失控率 P_loss', 'Pre-Chute P_loss'), val: pPreChute, color: '#9a5b13' },
      { lbl: t('伞后灾难概率 P_cat', 'Post-Chute P_cat'), val: pCat, color: pCat > 5e-7 ? '#8e2424' : '#102d3c' }
    ];

    var rowH = ph / items.length;
    items.forEach(function (it, idx) {
      var cy = pad.t + idx * rowH + rowH * 0.22;
      var bh = rowH * 0.56;
      var bx = toX(it.val);
      var bw = Math.max(4, bx - pad.l);

      ctx.fillStyle = '#111214';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(it.lbl, pad.l - 10, cy + bh * 0.72);

      ctx.fillStyle = it.color;
      ctx.fillRect(pad.l, cy, bw, bh);

      ctx.fillStyle = '#25272b';
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'left';
      var valText = fmtSci(it.val);
      var tx = Math.min(w - pad.r - 58, pad.l + bw + 6);
      if (tx < pad.l + bw + 4) {
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.fillText(valText, pad.l + bw - 6, cy + bh * 0.72);
      } else {
        ctx.fillText(valText, tx, cy + bh * 0.72);
      }
    });

    ctx.strokeStyle = '#9aa5ae';
    ctx.strokeRect(pad.l, pad.t, pw, ph);
  }

  window.resetFtaSim = function () {
    document.getElementById('ftaLambdaEpu').value = FTA_DEFAULTS.epu;
    document.getElementById('ftaBeta').value = FTA_DEFAULTS.beta;
    document.getElementById('ftaOeiFail').value = FTA_DEFAULTS.oei;
    document.getElementById('ftaLambdaBms').value = FTA_DEFAULTS.bms;
    document.getElementById('ftaLowAgl').value = FTA_DEFAULTS.lowAgl;
    updateFtaSim();
  };

  /* 6. Interactive GSN Safety Release Readiness Gate Audit */
  window.updateSafetyAudit = function () {
    var checks = Array.prototype.slice.call(document.querySelectorAll('#safetyGateAudit .gate-check'));
    if (!checks.length) return;
    var done = 0;
    checks.forEach(function (cb) {
      var item = cb.closest('.gate-item');
      if (cb.checked) {
        done++;
        if (item) item.classList.add('checked');
      } else if (item) {
        item.classList.remove('checked');
      }
    });

    var pct = Math.round((done / checks.length) * 100);
    var scoreEl = document.getElementById('auditScore');
    var countEl = document.getElementById('auditCount');
    var fillEl = document.getElementById('auditBarFill');
    var verdictEl = document.getElementById('auditVerdict');
    var verdictBox = document.getElementById('auditVerdictBox');

    if (scoreEl) scoreEl.textContent = pct + '%';
    if (countEl) countEl.textContent = done + ' / ' + checks.length;
    if (fillEl) {
      fillEl.style.width = pct + '%';
      fillEl.style.backgroundColor = pct === 100 ? '#165b3d' : pct >= 60 ? '#9a5b13' : '#8e2424';
    }

    if (verdictBox && verdictEl) {
      verdictBox.classList.remove('warn-ok', 'warn-tight', 'warn-over');
      if (done === checks.length) {
        verdictBox.classList.add('warn-ok');
        verdictEl.textContent = t(
          'READY FOR C-END DELIVERY：全部双域关键安全论据与适航/公告闭环',
          'READY FOR C-END DELIVERY: All dual-domain safety case evidence closed'
        );
      } else if (done >= 5) {
        verdictBox.classList.add('warn-tight');
        verdictEl.textContent = t(
          'CONDITIONAL CAMP OPS：仅限受控飞行营地与沙盒运行，暂不建议面向个人公开道路-空域交付',
          'CONDITIONAL CAMP OPS: Restricted to managed flying camps / regulatory sandboxes'
        );
      } else {
        verdictBox.classList.add('warn-over');
        verdictEl.textContent = t(
          'RESTRICTED SANDBOX ONLY：仅限厂商试验与沙盒测试（当前公开证据状态：2026-11-19）',
          'RESTRICTED SANDBOX ONLY: Trial flights & sandbox evaluation only (Status as of 2026-11-19)'
        );
      }
    }
  };

  /* Init */
  document.addEventListener('DOMContentLoaded', function () {
    try {
      if (localStorage.getItem('fv_lac_safety_lang') === 'E') {
        document.body.classList.add('E');
        document.documentElement.lang = 'en';
        var btn = document.getElementById('langBtn');
        if (btn) btn.textContent = '中文';
      }
    } catch (e) {}

    setupScrollSpy();

    ['haraS', 'haraE', 'haraC', 'fhaSev', 'fhaCat'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', updateRiskCalc);
    });

    ['ftaLambdaEpu', 'ftaBeta', 'ftaOeiFail', 'ftaLambdaBms', 'ftaLowAgl'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', updateFtaSim);
    });

    document.querySelectorAll('#safetyGateAudit .gate-check').forEach(function (cb) {
      cb.addEventListener('change', updateSafetyAudit);
    });

    updateRiskCalc();
    updateFtaSim();
    updateSafetyAudit();

    window.addEventListener('resize', function () {
      updateFtaSim();
    });
  });
})();
