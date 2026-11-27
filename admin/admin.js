/* ============================================================
   Admin — Content Studio
   Static-site content editor with GitHub publish.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- config ---------------- */
  var CONFIG = {
    // SHA-256 of the site-owner passphrase. Change via the Publish view.
    passHash: '9881928f60e14fcbd7a28d2166ee4e8ba456daa9df696159dcae35050762895b',
    contentPath: 'content.json',
    seedPath: 'assets/seed.js',
    defaultOwner: 'jack25860',
    defaultRepo: 'portfolio-site',
    defaultBranch: 'main'
  };

  var LS = {
    session: 'portfolio-admin-session',
    repo: 'portfolio-admin-repo',
    token: 'portfolio-admin-token',
    hash: 'portfolio-admin-hash'
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function store(key, val) {
    try {
      if (val === null) localStorage.removeItem(key);
      else localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
    } catch (e) {}
  }
  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  /* ---------------- toast ---------------- */
  function toast(msg, kind) {
    var stack = $('#toastStack');
    if (!stack) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.innerHTML = '<span class="bar"></span><span>' + esc(msg) + '</span>';
    stack.appendChild(el);
    setTimeout(function () {
      el.classList.add('is-out');
      setTimeout(function () { el.remove(); }, 200);
    }, kind === 'err' ? 5200 : 3000);
  }

  /* ---------------- confirm ---------------- */
  var confirmResolve = null;
  function askConfirm(title, text) {
    var dlg = $('#confirmModal');
    $('#confirmTitle').textContent = title;
    $('#confirmText').textContent = text;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    return new Promise(function (res) { confirmResolve = res; });
  }
  function initConfirm() {
    var dlg = $('#confirmModal');
    $('#confirmYes').addEventListener('click', function () {
      dlg.close(); if (confirmResolve) { confirmResolve(true); confirmResolve = null; }
    });
    $('#confirmNo').addEventListener('click', function () {
      dlg.close(); if (confirmResolve) { confirmResolve(false); confirmResolve = null; }
    });
    dlg.addEventListener('cancel', function () {
      if (confirmResolve) { confirmResolve(false); confirmResolve = null; }
    });
  }

  /* ---------------- sha256 ---------------- */
  function sha256(str) {
    if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
      var buf = new TextEncoder().encode(str);
      return window.crypto.subtle.digest('SHA-256', buf).then(function (h) {
        return Array.prototype.map.call(new Uint8Array(h), function (b) {
          return ('00' + b.toString(16)).slice(-2);
        }).join('');
      });
    }
    return Promise.reject(new Error('此瀏覽器不支援 Web Crypto，請改用現代瀏覽器。'));
  }

  /* ---------------- state ---------------- */
  var state = {
    content: null,
    view: 'site',
    dirty: false,
    repo: readJSON(LS.repo, { owner: CONFIG.defaultOwner, repo: CONFIG.defaultRepo, branch: CONFIG.defaultBranch })
  };

  function markDirty(v) {
    state.dirty = v !== false;
    var flag = $('#dirtyFlag');
    if (flag) flag.hidden = !state.dirty;
  }

  /* ---------------- field builders ---------------- */
  function field(label, value, opts) {
    opts = opts || {};
    var id = 'f_' + Math.random().toString(36).slice(2, 9);
    var hint = opts.hint ? '<span class="field-hint">' + esc(opts.hint) + '</span>' : '';
    var input;
    if (opts.type === 'textarea') {
      input = '<textarea id="' + id + '" data-bind="' + esc(opts.bind) + '" rows="' + (opts.rows || 3) + '"' +
        (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : '') + '>' + esc(value) + '</textarea>';
    } else if (opts.type === 'select') {
      input = '<select id="' + id + '" data-bind="' + esc(opts.bind) + '">' +
        (opts.options || []).map(function (o) {
          return '<option value="' + esc(o) + '"' + (o === value ? ' selected' : '') + '>' + esc(o) + '</option>';
        }).join('') + '</select>';
    } else {
      input = '<input type="' + (opts.type || 'text') + '" id="' + id + '" data-bind="' + esc(opts.bind) + '" value="' + esc(value) + '"' +
        (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : '') +
        (opts.step ? ' step="' + esc(opts.step) + '"' : '') + '>';
    }
    return '<label class="field" for="' + id + '"><span class="field-label">' + esc(label) + '</span>' + input + hint + '</label>';
  }

  function mediaField(label, value, bind, hint) {
    var id = 'm_' + Math.random().toString(36).slice(2, 9);
    var hasImg = value && /\.(webp|png|jpe?g|gif|svg|avif)(\?|$)/i.test(value);
    var src = /^https?:/i.test(value || '') ? value : '../' + value;
    return '<div class="field"><span class="field-label">' + esc(label) + '</span>' +
      '<div class="media-field">' +
      '<div class="media-prev" id="prev_' + id + '">' +
      (hasImg ? '<img src="' + esc(src) + '" alt="">' : '無預覽') +
      '</div>' +
      '<div>' +
      '<input type="text" id="' + id + '" data-bind="' + esc(bind) + '" data-media="1" value="' + esc(value) + '" placeholder="images/example.webp">' +
      '<span class="field-hint">' + esc(hint || '相對於網站根目錄的路徑，例如 images/photo.webp') + '</span>' +
      '</div></div></div>';
  }

  /* ---------------- bind engine ---------------- */
  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) {
      if (o == null) return undefined;
      return o[k];
    }, obj);
  }
  function setPath(obj, path, val) {
    var keys = path.split('.');
    var last = keys.pop();
    var t = keys.reduce(function (o, k) { return o[k]; }, obj);
    t[last] = val;
  }

  function bindCanvas() {
    $$('[data-bind]', $('#canvas')).forEach(function (el) {
      el.addEventListener('input', function () {
        var path = el.getAttribute('data-bind');
        var val = el.value;
        if (el.type === 'number') val = val === '' ? null : Number(val);
        setPath(state.content, path, val);
        markDirty(true);
        if (el.hasAttribute('data-media')) {
          var prev = el.parentNode.parentNode.querySelector('.media-prev');
          if (prev) {
            var pv = /^https?:/i.test(val) ? val : '../' + val;
            prev.innerHTML = /\.(webp|png|jpe?g|gif|svg|avif)(\?|$)/i.test(val)
              ? '<img src="' + esc(pv) + '" alt="">' : '無預覽';
          }
        }
      });
    });
  }

  /* ---------------- repeatable helper ---------------- */
  function repRow(idx, total, inner, bindBase) {
    return '<div class="rep-row" data-rep="' + esc(bindBase) + '">' +
      '<div class="rep-row-head">' +
      '<span class="rep-row-idx">#' + String(idx + 1).padStart(2, '0') + '</span>' +
      '<div class="rep-actions">' +
      '<button class="mini-btn" type="button" data-move="up" data-base="' + esc(bindBase) + '" data-idx="' + idx + '"' + (idx === 0 ? ' disabled' : '') + ' aria-label="上移">↑</button>' +
      '<button class="mini-btn" type="button" data-move="down" data-base="' + esc(bindBase) + '" data-idx="' + idx + '"' + (idx === total - 1 ? ' disabled' : '') + ' aria-label="下移">↓</button>' +
      '<button class="mini-btn danger" type="button" data-del="' + esc(bindBase) + '" data-idx="' + idx + '" aria-label="刪除">✕</button>' +
      '</div></div>' + inner + '</div>';
  }

  function initRepControls() {
    var canvas = $('#canvas');
    canvas.addEventListener('click', function (e) {
      var del = e.target.closest('[data-del]');
      var mv = e.target.closest('[data-move]');
      if (del) {
        var base = del.getAttribute('data-del');
        var i = Number(del.getAttribute('data-idx'));
        var arr = getPath(state.content, base);
        if (!Array.isArray(arr)) return;
        askConfirm('刪除這一項？', '這個動作只會改動目前編輯中的內容，發布後才會影響網站。').then(function (ok) {
          if (!ok) return;
          arr.splice(i, 1);
          markDirty(true);
          renderView();
          toast('已刪除一項');
        });
      } else if (mv) {
        var b2 = mv.getAttribute('data-base');
        var j = Number(mv.getAttribute('data-idx'));
        var a2 = getPath(state.content, b2);
        if (!Array.isArray(a2)) return;
        var to = mv.getAttribute('data-move') === 'up' ? j - 1 : j + 1;
        if (to < 0 || to >= a2.length) return;
        var tmp = a2[j]; a2[j] = a2[to]; a2[to] = tmp;
        markDirty(true);
        renderView();
      }
    });
  }

  /* ---------------- views ---------------- */
  var VIEWS = {
    site: { title: '網站設定', sub: 'Site · 首頁文案與基本資料' },
    skills: { title: '專業技能', sub: 'Skills · 技能分組與經歷' },
    interests: { title: '興趣', sub: 'Interests · 圖文磚' },
    life: { title: '生活', sub: 'Life · 瀑布流項目' },
    travel: { title: '旅行', sub: 'Travel · 地點與座標' },
    works: { title: '開發成果', sub: 'Works · 專案與內容區塊' },
    publish: { title: '發布', sub: 'Publish · 寫回 GitHub' }
  };

  function renderView() {
    var v = VIEWS[state.view];
    $('#viewTitle').textContent = v.title;
    $('#viewSub').textContent = v.sub;
    $$('.side-item').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-view') === state.view);
    });
    var canvas = $('#canvas');
    canvas.innerHTML = (RENDER[state.view] || function () { return ''; })();
    bindCanvas();
    if (state.view === 'publish') initPublishView();
  }

  var RENDER = {};

  /* ---- site ---- */
  RENDER.site = function () {
    var s = state.content.site || {};
    var links = (s.links || []).map(function (l, i) {
      return repRow(i, s.links.length,
        '<div class="grid-2">' +
        field('名稱', l.label, { bind: 'site.links.' + i + '.label' }) +
        field('連結', l.url, { bind: 'site.links.' + i + '.url', type: 'url' }) +
        '</div>', 'site.links');
    }).join('');

    var stats = (s.stats || []).map(function (st, i) {
      return repRow(i, s.stats.length,
        '<div class="grid-2">' +
        field('數值', st.value, { bind: 'site.stats.' + i + '.value' }) +
        field('說明', st.label, { bind: 'site.stats.' + i + '.label' }) +
        '</div>', 'site.stats');
    }).join('');

    return '<div class="panel"><div class="panel-head"><h3 class="panel-title">基本資料</h3></div><div class="panel-body">' +
      '<div class="grid-2">' +
      field('名稱', s.name, { bind: 'site.name' }) +
      field('職稱', s.role, { bind: 'site.role' }) +
      '</div>' +
      field('一句話標語', s.tagline, { bind: 'site.tagline', hint: '會拆成兩行顯示在首頁大標。用逗號分隔。' }) +
      field('自我介紹', s.intro, { bind: 'site.intro', type: 'textarea', rows: 5 }) +
      '<div class="grid-2">' +
      field('所在地', s.location, { bind: 'site.location' }) +
      field('Email', s.email, { bind: 'site.email', type: 'email' }) +
      '</div>' +
      mediaField('首頁照片', s.heroImage, 'site.heroImage') +
      field('照片說明', s.heroCaption, { bind: 'site.heroCaption' }) +
      '</div></div>' +

      '<div class="panel"><div class="panel-head"><h3 class="panel-title">數字摘要</h3>' +
      '<button class="add-btn" type="button" data-add="site.stats">＋ 新增</button></div>' +
      '<div class="panel-body"><div class="rep">' + (stats || '<p class="field-hint">尚無項目。</p>') + '</div></div></div>' +

      '<div class="panel"><div class="panel-head"><h3 class="panel-title">外部連結</h3>' +
      '<button class="add-btn" type="button" data-add="site.links">＋ 新增</button></div>' +
      '<div class="panel-body"><div class="rep">' + (links || '<p class="field-hint">尚無項目。</p>') + '</div></div></div>';
  };

  /* ---- skills ---- */
  RENDER.skills = function () {
    var sk = state.content.skills || {};
    var groups = (sk.groups || []).map(function (g, gi) {
      var items = (g.items || []).map(function (it, ii) {
        return repRow(ii, g.items.length,
          '<div class="grid-3">' +
          field('名稱', it.name, { bind: 'skills.groups.' + gi + '.items.' + ii + '.name' }) +
          field('熟練度', it.level, { bind: 'skills.groups.' + gi + '.items.' + ii + '.level', type: 'select', options: ['深度', '熟練', '中等', '入門'] }) +
          field('備註', it.note, { bind: 'skills.groups.' + gi + '.items.' + ii + '.note' }) +
          '</div>', 'skills.groups.' + gi + '.items');
      }).join('');
      return '<div class="panel"><div class="panel-head"><h3 class="panel-title">' + esc(g.title || '未命名分組') + '</h3>' +
        '<button class="add-btn" type="button" data-add="skills.groups.' + gi + '.items">＋ 技能</button></div>' +
        '<div class="panel-body">' +
        field('分組名稱', g.title, { bind: 'skills.groups.' + gi + '.title' }) +
        '<div class="rep">' + (items || '<p class="field-hint">尚無技能。</p>') + '</div>' +
        '</div></div>';
    }).join('');

    var tl = (sk.timeline || []).map(function (t, i) {
      return repRow(i, sk.timeline.length,
        '<div class="grid-2">' +
        field('期間', t.period, { bind: 'skills.timeline.' + i + '.period' }) +
        field('職稱', t.role, { bind: 'skills.timeline.' + i + '.role' }) +
        '</div>' +
        field('單位', t.org, { bind: 'skills.timeline.' + i + '.org' }) +
        field('說明', t.note, { bind: 'skills.timeline.' + i + '.note', type: 'textarea', rows: 2 }),
        'skills.timeline');
    }).join('');

    return '<div class="panel"><div class="panel-head"><h3 class="panel-title">區塊說明</h3></div><div class="panel-body">' +
      field('引言', sk.intro, { bind: 'skills.intro', type: 'textarea', rows: 3 }) +
      '</div></div>' +

      '<div class="panel"><div class="panel-head"><h3 class="panel-title">技能分組</h3>' +
      '<button class="add-btn" type="button" data-add="skills.groups">＋ 新增分組</button></div>' +
      '<div class="panel-body"><div class="rep">' + (groups || '<p class="field-hint">尚無分組。</p>') + '</div></div></div>' +

      '<div class="panel"><div class="panel-head"><h3 class="panel-title">經歷時間軸</h3>' +
      '<button class="add-btn" type="button" data-add="skills.timeline">＋ 新增</button></div>' +
      '<div class="panel-body"><div class="rep">' + (tl || '<p class="field-hint">尚無項目。</p>') + '</div></div></div>';
  };

  /* ---- interests ---- */
  RENDER.interests = function () {
    var arr = state.content.interests || [];
    var rows = arr.map(function (it, i) {
      return repRow(i, arr.length,
        field('標題', it.title, { bind: 'interests.' + i + '.title' }) +
        field('說明', it.text, { bind: 'interests.' + i + '.text', type: 'textarea', rows: 3 }) +
        mediaField('圖片', it.image, 'interests.' + i + '.image') +
        field('標籤', it.tag, { bind: 'interests.' + i + '.tag' }),
        'interests');
    }).join('');
    return '<div class="panel"><div class="panel-head"><h3 class="panel-title">興趣項目</h3>' +
      '<button class="add-btn" type="button" data-add="interests">＋ 新增</button></div>' +
      '<div class="panel-body"><div class="rep">' + (rows || '<p class="field-hint">尚無項目。</p>') + '</div></div></div>';
  };

  /* ---- life ---- */
  RENDER.life = function () {
    var arr = state.content.life || [];
    var rows = arr.map(function (it, i) {
      return repRow(i, arr.length,
        field('標題', it.title, { bind: 'life.' + i + '.title' }) +
        field('說明', it.text, { bind: 'life.' + i + '.text', type: 'textarea', rows: 3 }) +
        mediaField('圖片', it.image, 'life.' + i + '.image') +
        field('日期', it.date, { bind: 'life.' + i + '.date', hint: '例如 2026.11' }),
        'life');
    }).join('');
    return '<div class="panel"><div class="panel-head"><h3 class="panel-title">生活項目</h3>' +
      '<button class="add-btn" type="button" data-add="life">＋ 新增</button></div>' +
      '<div class="panel-body"><div class="rep">' + (rows || '<p class="field-hint">尚無項目。</p>') + '</div></div></div>';
  };

  /* ---- travel ---- */
  RENDER.travel = function () {
    var arr = state.content.travel || [];
    var rows = arr.map(function (t, i) {
      return repRow(i, arr.length,
        '<div class="grid-3">' +
        field('地點', t.place, { bind: 'travel.' + i + '.place' }) +
        field('國家', t.country, { bind: 'travel.' + i + '.country' }) +
        field('年份', t.year, { bind: 'travel.' + i + '.year' }) +
        '</div>' +
        field('說明', t.text, { bind: 'travel.' + i + '.text', type: 'textarea', rows: 3 }) +
        mediaField('照片', t.image, 'travel.' + i + '.image') +
        '<div class="grid-2">' +
        field('緯度', t.lat, { bind: 'travel.' + i + '.lat', type: 'number', step: '0.01', hint: '北緯為正，南緯為負' }) +
        field('經度', t.lon, { bind: 'travel.' + i + '.lon', type: 'number', step: '0.01', hint: '東經為正，西經為負' }) +
        '</div>',
        'travel');
    }).join('');
    return '<div class="panel"><div class="panel-head"><h3 class="panel-title">旅行地點</h3>' +
      '<button class="add-btn" type="button" data-add="travel">＋ 新增</button></div>' +
      '<div class="panel-body"><div class="rep">' + (rows || '<p class="field-hint">尚無項目。</p>') + '</div></div></div>';
  };

  /* ---- works ---- */
  RENDER.works = function () {
    var arr = state.content.works || [];
    var rows = arr.map(function (w, i) {
      var blocks = (w.blocks || []).map(function (b, bi) {
        var base = 'works.' + i + '.blocks.' + bi;
        var inner = field('區塊類型', b.type, {
          bind: base + '.type', type: 'select',
          options: ['text', 'image', 'video', 'link', 'embed']
        });
        if (b.type === 'text') {
          inner += field('內文', b.text, { bind: base + '.text', type: 'textarea', rows: 4 });
        } else if (b.type === 'image') {
          inner += mediaField('圖片', b.src, base + '.src') +
            field('替代文字（必填）', b.alt, { bind: base + '.alt', hint: '描述圖片內容，供螢幕閱讀器使用。' }) +
            field('圖說', b.caption, { bind: base + '.caption' });
        } else if (b.type === 'video') {
          inner += field('影片網址', b.src, { bind: base + '.src', type: 'url', hint: 'MP4 直連網址，或 YouTube 連結（會以嵌入呈現）' }) +
            field('封面圖', b.poster, { bind: base + '.poster' }) +
            field('圖說', b.caption, { bind: base + '.caption' });
        } else if (b.type === 'link') {
          inner += field('連結文字', b.label, { bind: base + '.label' }) +
            field('網址', b.url, { bind: base + '.url', type: 'url' });
        } else if (b.type === 'embed') {
          inner += field('嵌入網址', b.src, { bind: base + '.src', type: 'url', hint: '例如 CodePen、Figma、YouTube 嵌入網址' }) +
            field('標題', b.label, { bind: base + '.label' }) +
            field('圖說', b.caption, { bind: base + '.caption' });
        }
        return repRow(bi, w.blocks.length, inner, base);
      }).join('');

      var links = (w.links || []).map(function (l, li) {
        return repRow(li, w.links.length,
          '<div class="grid-2">' +
          field('名稱', l.label, { bind: 'works.' + i + '.links.' + li + '.label' }) +
          field('網址', l.url, { bind: 'works.' + i + '.links.' + li + '.url', type: 'url' }) +
          '</div>', 'works.' + i + '.links');
      }).join('');

      return '<div class="panel"><div class="panel-head"><h3 class="panel-title">' + esc(w.title || '未命名專案') + '</h3>' +
        '<div class="rep-actions">' +
        '<button class="mini-btn" type="button" data-move="up" data-base="works" data-idx="' + i + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="上移">↑</button>' +
        '<button class="mini-btn" type="button" data-move="down" data-base="works" data-idx="' + i + '"' + (i === arr.length - 1 ? ' disabled' : '') + ' aria-label="下移">↓</button>' +
        '<button class="mini-btn danger" type="button" data-del="works" data-idx="' + i + '" aria-label="刪除">✕</button>' +
        '</div></div>' +
        '<div class="panel-body">' +
        '<div class="grid-2">' +
        field('專案 ID', w.id, { bind: 'works.' + i + '.id', hint: '英文小寫與連字號，用於網址與詳情頁' }) +
        field('標題', w.title, { bind: 'works.' + i + '.title' }) +
        '</div>' +
        '<div class="grid-3">' +
        field('分類', w.category, { bind: 'works.' + i + '.category' }) +
        field('年份', w.year, { bind: 'works.' + i + '.year' }) +
        field('標籤（逗號分隔）', (w.tags || []).join(', '), { bind: 'works.' + i + '.tags', hint: '發布時會自動轉成陣列' }) +
        '</div>' +
        field('摘要', w.summary, { bind: 'works.' + i + '.summary', type: 'textarea', rows: 3 }) +
        mediaField('封面圖', w.cover, 'works.' + i + '.cover') +
        '<div class="panel-head" style="margin:16px -20px 16px;padding:12px 20px"><h4 class="panel-title">內容區塊</h4>' +
        '<button class="add-btn" type="button" data-add="works.' + i + '.blocks">＋ 區塊</button></div>' +
        '<div class="rep">' + (blocks || '<p class="field-hint">尚無內容區塊。</p>') + '</div>' +
        '<div class="panel-head" style="margin:16px -20px 16px;padding:12px 20px"><h4 class="panel-title">外部連結</h4>' +
        '<button class="add-btn" type="button" data-add="works.' + i + '.links">＋ 連結</button></div>' +
        '<div class="rep">' + (links || '<p class="field-hint">尚無連結。</p>') + '</div>' +
        '</div></div>';
    }).join('');

    return '<div class="panel"><div class="panel-head"><h3 class="panel-title">專案清單</h3>' +
      '<button class="add-btn" type="button" data-add="works">＋ 新增專案</button></div>' +
      '<div class="panel-body"><p class="field-hint" style="margin:0">前 4 個專案會出現在首頁「精選成果」，全部專案會列在「開發成果」。</p></div></div>' +
      (rows || '<div class="panel"><div class="panel-body"><p class="field-hint">尚無專案。</p></div></div>');
  };

  /* ---- publish ---- */
  RENDER.publish = function () {
    var r = state.repo;
    var hasToken = !!read(LS.token);
    return '<div class="pub-grid">' +
      '<div class="stat-card"><p class="k">內容版本</p><p class="v">v' + ((state.content.meta && state.content.meta.version) || 1) + '</p>' +
      '<p class="n">' + esc((state.content.meta && state.content.meta.updated) || '—') + '</p></div>' +
      '<div class="stat-card"><p class="k">專案數</p><p class="v">' + (state.content.works || []).length + '</p>' +
      '<p class="n">' + (state.content.travel || []).length + ' 個旅行地點 · ' + (state.content.life || []).length + ' 則生活</p></div>' +
      '</div>' +

      '<div class="panel"><div class="panel-head"><h3 class="panel-title">GitHub 連線</h3></div><div class="panel-body">' +
      '<div class="grid-3">' +
      field('帳號 / 組織', r.owner, { bind: '__repo.owner' }) +
      field('專案名稱', r.repo, { bind: '__repo.repo' }) +
      field('分支', r.branch, { bind: '__repo.branch' }) +
      '</div>' +
      '<label class="field"><span class="field-label">Personal Access Token</span>' +
      '<input type="password" id="tokenInput" value="' + (hasToken ? '••••••••••••••••' : '') + '" placeholder="ghp_..." autocomplete="off">' +
      '<span class="field-hint">需要 <b>Contents: Read and write</b> 權限（Fine-grained token）。只存在這台裝置的瀏覽器，不會傳到任何第三方。</span></label>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn-primary btn-sm" id="publishBtn" type="button">發布到 GitHub</button>' +
      '<button class="btn btn-ghost btn-sm" id="testBtn" type="button">測試連線</button>' +
      '<button class="btn btn-ghost btn-sm" id="clearTokenBtn" type="button">清除 Token</button>' +
      '</div>' +
      '</div></div>' +

      '<div class="panel"><div class="panel-head"><h3 class="panel-title">發布紀錄</h3></div><div class="panel-body">' +
      '<div class="log" id="pubLog"><span class="dim">尚未發布。按「發布到 GitHub」開始。</span></div>' +
      '</div></div>' +

      '<div class="panel"><div class="panel-head"><h3 class="panel-title">變更登入密碼</h3></div><div class="panel-body">' +
      '<p class="field-hint" style="margin:0 0 12px">密碼雜湊存在 <code>admin/admin.js</code> 的 <code>CONFIG.passHash</code>。在這裡改會存在本機瀏覽器，換裝置需重新設定。</p>' +
      '<div class="grid-2">' +
      '<label class="field"><span class="field-label">新密碼</span><input type="password" id="newPw" autocomplete="new-password" placeholder="至少 8 個字元"></label>' +
      '<label class="field"><span class="field-label">再輸入一次</span><input type="password" id="newPw2" autocomplete="new-password"></label>' +
      '</div>' +
      '<button class="btn btn-ghost btn-sm" id="setPwBtn" type="button">更新本機密碼</button>' +
      '</div></div>';
  };

  function initPublishView() {
    // repo fields bind to state.repo, not content
    $$('[data-bind^="__repo."]', $('#canvas')).forEach(function (el) {
      el.addEventListener('input', function () {
        var k = el.getAttribute('data-bind').split('.')[1];
        state.repo[k] = el.value.trim();
        store(LS.repo, state.repo);
        var sub = $('#sideRepo');
        if (sub) sub.textContent = state.repo.owner + '/' + state.repo.repo;
      });
    });

    var tokenInput = $('#tokenInput');
    if (tokenInput) {
      tokenInput.addEventListener('focus', function () {
        if (tokenInput.value.indexOf('•') === 0) tokenInput.value = '';
      });
    }

    var pubBtn = $('#publishBtn');
    if (pubBtn) pubBtn.addEventListener('click', doPublish);

    var testBtn = $('#testBtn');
    if (testBtn) testBtn.addEventListener('click', doTest);

    var clearBtn = $('#clearTokenBtn');
    if (clearBtn) clearBtn.addEventListener('click', function () {
      store(LS.token, null);
      toast('已清除 Token');
      renderView();
    });

    var setPw = $('#setPwBtn');
    if (setPw) setPw.addEventListener('click', function () {
      var a = $('#newPw').value, b = $('#newPw2').value;
      if (a.length < 8) return toast('密碼至少 8 個字元', 'err');
      if (a !== b) return toast('兩次輸入不一致', 'err');
      sha256(a).then(function (h) {
        store(LS.hash, h);
        toast('本機密碼已更新', 'ok');
        $('#newPw').value = ''; $('#newPw2').value = '';
      }).catch(function (e) { toast(e.message, 'err'); });
    });
  }

  /* ---------------- publish log ---------------- */
  function logLine(msg, kind) {
    var log = $('#pubLog');
    if (!log) return;
    if (log.querySelector('.dim') && log.children.length === 1) log.innerHTML = '';
    var t = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    var span = document.createElement('span');
    span.className = kind || '';
    span.textContent = '[' + t + '] ' + msg + '\n';
    log.appendChild(span);
    log.scrollTop = log.scrollHeight;
  }

  function getToken() {
    var input = $('#tokenInput');
    if (input && input.value && input.value.indexOf('•') !== 0) {
      store(LS.token, input.value.trim());
      return input.value.trim();
    }
    return read(LS.token) || '';
  }

  function ghHeaders(token) {
    return {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }

  function b64(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function doTest() {
    var token = getToken();
    if (!token) return toast('請先貼上 Token', 'err');
    logLine('測試連線…', 'dim');
    fetch('https://api.github.com/repos/' + state.repo.owner + '/' + state.repo.repo, {
      headers: ghHeaders(token)
    }).then(function (r) {
      if (r.status === 404) throw new Error('找不到專案（或 Token 無權限）');
      if (r.status === 401) throw new Error('Token 無效或已過期');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (d) {
      logLine('✓ 連線成功：' + d.full_name + '（預設分支 ' + d.default_branch + '）', 'ok');
      toast('連線成功', 'ok');
    }).catch(function (e) {
      logLine('✗ ' + e.message, 'err');
      toast(e.message, 'err');
    });
  }

  /* ---------------- publish ---------------- */
  function normalize(content) {
    // tags typed as comma string -> array
    (content.works || []).forEach(function (w) {
      if (typeof w.tags === 'string') {
        w.tags = w.tags.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      }
      if (!Array.isArray(w.tags)) w.tags = [];
      if (!Array.isArray(w.links)) w.links = [];
      if (!Array.isArray(w.blocks)) w.blocks = [];
    });
    return content;
  }

  function doPublish() {
    var token = getToken();
    if (!token) return toast('請先貼上 GitHub Token', 'err');

    var content = normalize(JSON.parse(JSON.stringify(state.content)));
    content.meta = content.meta || {};
    content.meta.version = (content.meta.version || 1) + 1;
    content.meta.updated = new Date().toISOString();

    var json = JSON.stringify(content, null, 2) + '\n';
    var seed = '/* Auto-generated fallback copy of content.json.\n   Regenerated by the admin panel on publish. Do not edit by hand. */\n' +
      'window.__SEED__ = ' + JSON.stringify(content, null, 2) + ';\n';

    var btn = $('#publishBtn');
    if (btn) { btn.disabled = true; btn.textContent = '發布中…'; }
    logLine('開始發布 v' + content.meta.version + '…', 'dim');

    putFile(CONFIG.contentPath, json, 'content: update site content (v' + content.meta.version + ')', token)
      .then(function () {
        logLine('✓ content.json 已更新', 'ok');
        return putFile(CONFIG.seedPath, seed, 'content: regenerate seed fallback (v' + content.meta.version + ')', token);
      })
      .then(function () {
        logLine('✓ assets/seed.js 已更新', 'ok');
        state.content = content;
        markDirty(false);
        logLine('✓ 發布完成。GitHub Pages 約 1 分鐘後生效。', 'ok');
        toast('發布成功', 'ok');
        renderView();
      })
      .catch(function (e) {
        logLine('✗ ' + e.message, 'err');
        toast(e.message, 'err');
      })
      .then(function () {
        var b = $('#publishBtn');
        if (b) { b.disabled = false; b.textContent = '發布到 GitHub'; }
      });
  }

  function putFile(path, text, message, token) {
    var api = 'https://api.github.com/repos/' + state.repo.owner + '/' + state.repo.repo + '/contents/' + path;
    var headers = ghHeaders(token);
    headers['Content-Type'] = 'application/json';

    return fetch(api + '?ref=' + encodeURIComponent(state.repo.branch), { headers: headers })
      .then(function (r) {
        if (r.status === 404) return null;
        if (r.status === 401) throw new Error('Token 無效或已過期');
        if (r.status === 403) throw new Error('Token 權限不足（需要 Contents: Read and write）');
        if (!r.ok) throw new Error('讀取 ' + path + ' 失敗：HTTP ' + r.status);
        return r.json();
      })
      .then(function (existing) {
        var body = {
          message: message,
          content: b64(text),
          branch: state.repo.branch
        };
        if (existing && existing.sha) body.sha = existing.sha;
        return fetch(api, { method: 'PUT', headers: headers, body: JSON.stringify(body) });
      })
      .then(function (r) {
        if (r.status === 401) throw new Error('Token 無效或已過期');
        if (r.status === 403) throw new Error('Token 權限不足（需要 Contents: Read and write）');
        if (r.status === 409) throw new Error('分支衝突，請重新載入後再試');
        if (!r.ok) {
          return r.text().then(function (t) {
            var m = 'HTTP ' + r.status;
            try { m = JSON.parse(t).message || m; } catch (e) {}
            throw new Error(path + '：' + m);
          });
        }
        return r.json();
      });
  }

  /* ---------------- add items ---------------- */
  var TEMPLATES = {
    'site.stats': function () { return { value: '0', label: '說明' }; },
    'site.links': function () { return { label: '連結', url: 'https://' }; },
    'skills.groups': function () { return { title: '新分組', items: [{ name: '技能', level: '熟練', note: '' }] }; },
    'skills.timeline': function () { return { period: '2026 — 現在', role: '職稱', org: '單位', note: '' }; },
    'interests': function () { return { title: '新興趣', text: '', image: 'images/life-coffee.webp', tag: '' }; },
    'life': function () { return { title: '新項目', text: '', image: 'images/work-desk.webp', date: '' }; },
    'travel': function () { return { place: '新地點', country: '', year: '2026', text: '', image: 'images/travel-taipei.webp', lat: 25.03, lon: 121.57 }; },
    'works': function () {
      return {
        id: 'new-project-' + Date.now().toString(36),
        title: '新專案', category: 'Side Project', year: '2026',
        summary: '', cover: 'images/work-desk.webp', tags: [], links: [],
        blocks: [{ type: 'text', text: '' }]
      };
    }
  };

  function initAdd() {
    $('#canvas').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-add]');
      if (!btn) return;
      var base = btn.getAttribute('data-add');
      var arr = getPath(state.content, base);
      if (!Array.isArray(arr)) return;

      var tpl;
      if (TEMPLATES[base]) tpl = TEMPLATES[base]();
      else if (/\.items$/.test(base)) tpl = { name: '新技能', level: '熟練', note: '' };
      else if (/\.blocks$/.test(base)) tpl = { type: 'text', text: '' };
      else if (/\.links$/.test(base)) tpl = { label: '連結', url: 'https://' };
      else tpl = {};

      arr.push(tpl);
      markDirty(true);
      renderView();
      toast('已新增一項');
    });
  }

  /* ---------------- load / save ---------------- */
  function loadContent() {
    return fetch('../content.json?v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
  }

  function enterApp() {
    $('#gate').hidden = true;
    $('#app').hidden = false;
    var sub = $('#sideRepo');
    if (sub) sub.textContent = state.repo.owner + '/' + state.repo.repo;

    loadContent().then(function (c) {
      state.content = c;
      renderView();
    }).catch(function (e) {
      toast('無法載入 content.json：' + e.message, 'err');
      state.content = { meta: { version: 1 }, site: {}, skills: {}, interests: [], life: [], travel: [], works: [] };
      renderView();
    });
  }

  /* ---------------- login ---------------- */
  function initLogin() {
    var form = $('#loginForm');
    var input = $('#pwInput');
    var err = $('#pwErr');
    var btn = $('#loginBtn');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var pw = input.value;
      err.hidden = true;
      input.removeAttribute('aria-invalid');

      if (!pw) {
        err.textContent = '請輸入密碼。';
        err.hidden = false;
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }

      btn.disabled = true;
      btn.textContent = '驗證中…';

      var localHash = read(LS.hash);
      sha256(pw).then(function (h) {
        var ok = (localHash && h === localHash) || h === CONFIG.passHash;
        if (ok) {
          store(LS.session, '1');
          enterApp();
        } else {
          err.textContent = '密碼不正確，請再試一次。';
          err.hidden = false;
          input.setAttribute('aria-invalid', 'true');
          input.select();
        }
      }).catch(function (ex) {
        err.textContent = ex.message;
        err.hidden = false;
      }).then(function () {
        btn.disabled = false;
        btn.textContent = '登入';
      });
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    initConfirm();
    initLogin();
    initRepControls();
    initAdd();

    $$('.side-item').forEach(function (b) {
      b.addEventListener('click', function () {
        state.view = b.getAttribute('data-view');
        renderView();
      });
    });

    var logout = $('#logoutBtn');
    if (logout) logout.addEventListener('click', function () {
      store(LS.session, null);
      location.reload();
    });

    var reload = $('#reloadBtn');
    if (reload) reload.addEventListener('click', function () {
      if (state.dirty) {
        askConfirm('放棄未發布的變更？', '重新載入會從 content.json 取回最新內容，目前編輯中的變更會遺失。').then(function (ok) {
          if (!ok) return;
          loadContent().then(function (c) {
            state.content = c; markDirty(false); renderView(); toast('已重新載入');
          });
        });
      } else {
        loadContent().then(function (c) {
          state.content = c; renderView(); toast('已重新載入');
        });
      }
    });

    var quick = $('#quickPublish');
    if (quick) quick.addEventListener('click', function () {
      state.view = 'publish';
      renderView();
    });

    if (read(LS.session) === '1') enterApp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
