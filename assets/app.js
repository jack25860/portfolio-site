/* ============================================================
   Portfolio — front-end renderer
   Reads content.json (falls back to window.__SEED__)
   ============================================================ */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- theme ---------- */
  var THEME_KEY = 'portfolio-theme';
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var btn = $('#themeBtn');
    if (btn) {
      btn.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
      btn.setAttribute('aria-label', t === 'dark' ? '切換淺色模式' : '切換深色模式');
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0C0E11' : '#F5F2EB');
  }
  var storedTheme = null;
  try { storedTheme = localStorage.getItem(THEME_KEY); } catch (e) {}
  if (!storedTheme) {
    storedTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  applyTheme(storedTheme);

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('#themeBtn');
    if (!btn) return;
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (err) {}
  });

  /* ---------- reveal ---------- */
  var io = null;
  function observeReveals() {
    var items = $$('.reveal:not(.is-in)');
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('is-in');
            io.unobserve(en.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    }
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- header ---------- */
  function initHeader() {
    var head = $('#siteHead');
    var bar = $('#headProgress');
    var sections = $$('main section[id]');
    var navLinks = $$('.nav a');

    function onScroll() {
      var y = window.scrollY || document.documentElement.scrollTop;
      if (head) head.classList.toggle('is-stuck', y > 8);
      if (bar) {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (h > 0 ? Math.min(100, (y / h) * 100) : 0) + '%';
      }
      var current = '';
      sections.forEach(function (s) {
        if (s.getBoundingClientRect().top <= 120) current = s.id;
      });
      navLinks.forEach(function (a) {
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + current);
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- render: hero ---------- */
  function renderHero(c) {
    var s = c.site || {};
    var nameEl = $('#brandName'); if (nameEl) nameEl.textContent = s.name || 'Portfolio';
    var roleEl = $('#brandRole'); if (roleEl) roleEl.textContent = s.role || '';
    document.title = (s.name || 'Portfolio') + ' — ' + (s.role || 'Portfolio');

    var t = $('#heroTitle');
    if (t && s.tagline) {
      var parts = String(s.tagline).split(/[，,]/);
      if (parts.length > 1) {
        t.innerHTML = parts.map(function (p, i) {
          return '<span class="hero-line">' + esc(p.trim()) + (i < parts.length - 1 ? '，' : '') + '</span>';
        }).join('');
      } else {
        t.innerHTML = '<span class="hero-line">' + esc(s.tagline) + '</span>';
      }
    }

    var intro = $('#heroIntro'); if (intro) intro.textContent = s.intro || '';

    var img = $('#heroImg');
    if (img && s.heroImage) { img.src = s.heroImage; img.alt = (s.name || '') + ' 的肖像'; }
    var cap = $('#heroCaption'); if (cap) cap.textContent = s.heroCaption || '';

    var stats = $('#stats');
    if (stats && Array.isArray(s.stats)) {
      stats.innerHTML = s.stats.map(function (st) {
        return '<div><dt>' + esc(st.value) + '</dt><dd>' + esc(st.label) + '</dd></div>';
      }).join('');
    }

    var footName = $('#footName'); if (footName) footName.textContent = s.name || '';
    var footTag = $('#footTag'); if (footTag) footTag.textContent = s.tagline || '';
    var footYear = $('#footYear'); if (footYear) footYear.textContent = new Date().getFullYear();

    var footLinks = $('#footLinks');
    if (footLinks && Array.isArray(s.links)) {
      footLinks.innerHTML = s.links.map(function (l) {
        return '<a href="' + esc(l.url) + '"' + (/^https?:/.test(l.url) ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + esc(l.label) + '</a>';
      }).join('');
    }

    var upd = $('#footUpdated');
    if (upd && c.meta && c.meta.updated) {
      var d = new Date(c.meta.updated);
      if (!isNaN(d)) {
        upd.textContent = 'Last updated · ' + d.getFullYear() + '.' +
          String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
      }
    }
  }

  /* ---------- render: features ---------- */
  function renderFeatures(c) {
    var grid = $('#featureGrid');
    if (!grid) return;
    var works = (c.works || []).slice(0, 4);
    grid.innerHTML = works.map(function (w) {
      return '<button class="feature reveal" type="button" data-work="' + esc(w.id) + '">' +
        '<span class="feature-media"><img src="' + esc(w.cover) + '" alt="' + esc(w.title) + '" loading="lazy" decoding="async"></span>' +
        '<span class="feature-meta"><span>' + esc(w.category) + '</span><span class="dot"></span><span>' + esc(w.year) + '</span></span>' +
        '<span class="feature-title">' + esc(w.title) + '</span>' +
        '<span class="feature-summary">' + esc(w.summary) + '</span>' +
        '<span class="feature-tags">' + (w.tags || []).map(function (tg) { return '<span class="tag">' + esc(tg) + '</span>'; }).join('') + '</span>' +
        '</button>';
    }).join('');
  }

  /* ---------- render: skills ---------- */
  function renderSkills(c) {
    var sk = c.skills || {};
    var intro = $('#skillsIntro'); if (intro) intro.textContent = sk.intro || '';

    var grid = $('#skillGrid');
    if (grid) {
      grid.innerHTML = (sk.groups || []).map(function (g) {
        return '<div class="skill-card reveal">' +
          '<h3>' + esc(g.title) + '</h3>' +
          '<ul class="skill-list">' + (g.items || []).map(function (it) {
            return '<li><span class="skill-name">' + esc(it.name) + '</span>' +
              '<span class="skill-level">' + esc(it.level) + '</span>' +
              '<span class="skill-note">' + esc(it.note) + '</span></li>';
          }).join('') + '</ul></div>';
      }).join('');
    }

    var tl = $('#timeline');
    if (tl) {
      tl.innerHTML = (sk.timeline || []).map(function (t) {
        return '<li><span class="tl-period">' + esc(t.period) + '</span>' +
          '<div><p class="tl-role">' + esc(t.role) + '</p>' +
          '<p class="tl-org">' + esc(t.org) + '</p>' +
          '<p class="tl-note">' + esc(t.note) + '</p></div></li>';
      }).join('');
    }
  }

  /* ---------- render: interests ---------- */
  function renderInterests(c) {
    var grid = $('#interestGrid');
    if (!grid) return;
    grid.innerHTML = (c.interests || []).map(function (it) {
      return '<article class="interest reveal">' +
        '<div class="interest-media"><img src="' + esc(it.image) + '" alt="' + esc(it.title) + '" loading="lazy" decoding="async"></div>' +
        '<h3>' + esc(it.title) + '</h3>' +
        '<p>' + esc(it.text) + '</p>' +
        (it.tag ? '<span class="tag">' + esc(it.tag) + '</span>' : '') +
        '</article>';
    }).join('');
  }

  /* ---------- render: life ---------- */
  function renderLife(c) {
    var grid = $('#lifeGrid');
    if (!grid) return;
    grid.innerHTML = (c.life || []).map(function (it) {
      return '<article class="life-item reveal">' +
        '<div class="life-media"><img src="' + esc(it.image) + '" alt="' + esc(it.title) + '" loading="lazy" decoding="async"></div>' +
        '<h3>' + esc(it.title) + '</h3>' +
        '<p>' + esc(it.text) + '</p>' +
        (it.date ? '<span class="life-date">' + esc(it.date) + '</span>' : '') +
        '</article>';
    }).join('');
  }

  /* ---------- render: travel + map ---------- */
  function renderTravel(c) {
    var list = $('#travelList');
    var items = c.travel || [];

    if (list) {
      list.innerHTML = items.map(function (t) {
        return '<article class="travel-item reveal">' +
          '<div class="travel-thumb"><img src="' + esc(t.image) + '" alt="' + esc(t.place) + '" loading="lazy" decoding="async"></div>' +
          '<div><div class="travel-head">' +
          '<span class="travel-place">' + esc(t.place) + '</span>' +
          '<span class="travel-country">' + esc(t.country) + '</span>' +
          '<span class="travel-year">' + esc(t.year) + '</span></div>' +
          '<p class="travel-text">' + esc(t.text) + '</p>' +
          '<span class="travel-coord">' + fmtCoord(t.lat, t.lon) + '</span></div>' +
          '</article>';
      }).join('');
    }

    var dots = $('#mapDots');
    var svg = $('#mapSvg');
    var count = $('#mapCount');
    if (count) count.textContent = items.length + ' 個地點';
    if (!dots || !svg) return;

    var pts = items.filter(function (t) { return typeof t.lat === 'number' && typeof t.lon === 'number'; });
    if (!pts.length) { dots.innerHTML = ''; svg.innerHTML = ''; return; }

    var lats = pts.map(function (p) { return p.lat; });
    var lons = pts.map(function (p) { return p.lon; });
    var minLat = Math.min.apply(null, lats), maxLat = Math.max.apply(null, lats);
    var minLon = Math.min.apply(null, lons), maxLon = Math.max.apply(null, lons);
    var padLat = Math.max((maxLat - minLat) * 0.35, 6);
    var padLon = Math.max((maxLon - minLon) * 0.35, 6);
    minLat -= padLat; maxLat += padLat;
    minLon -= padLon; maxLon += padLon;

    function px(lon) { return ((lon - minLon) / (maxLon - minLon)) * 100; }
    function py(lat) { return ((maxLat - lat) / (maxLat - minLat)) * 100; }

    // graticule
    var g = '';
    var step = 10;
    for (var la = Math.ceil(minLat / step) * step; la <= maxLat; la += step) {
      var y = py(la);
      g += '<line x1="0" y1="' + y.toFixed(2) + '" x2="100" y2="' + y.toFixed(2) + '" stroke="var(--line)" stroke-width="0.25" vector-effect="non-scaling-stroke"/>';
    }
    for (var lo = Math.ceil(minLon / step) * step; lo <= maxLon; lo += step) {
      var x = px(lo);
      g += '<line x1="' + x.toFixed(2) + '" y1="0" x2="' + x.toFixed(2) + '" y2="100" stroke="var(--line)" stroke-width="0.25" vector-effect="non-scaling-stroke"/>';
    }
    // connecting path between points in order
    if (pts.length > 1) {
      var d = pts.map(function (p, i) {
        return (i === 0 ? 'M' : 'L') + px(p.lon).toFixed(2) + ' ' + py(p.lat).toFixed(2);
      }).join(' ');
      g += '<path d="' + d + '" fill="none" stroke="var(--accent)" stroke-width="0.6" stroke-dasharray="2 2" opacity="0.5" vector-effect="non-scaling-stroke"/>';
    }
    svg.innerHTML = g;

    dots.innerHTML = pts.map(function (p) {
      return '<button class="map-dot" type="button" style="left:' + px(p.lon).toFixed(2) + '%;top:' + py(p.lat).toFixed(2) + '%" ' +
        'data-label="' + esc(p.place) + '" aria-label="' + esc(p.place + '，' + p.country) + '"></button>';
    }).join('');
  }

  function fmtCoord(lat, lon) {
    if (typeof lat !== 'number' || typeof lon !== 'number') return '';
    var ns = lat >= 0 ? 'N' : 'S';
    var ew = lon >= 0 ? 'E' : 'W';
    return Math.abs(lat).toFixed(2) + '°' + ns + ' · ' + Math.abs(lon).toFixed(2) + '°' + ew;
  }

  /* ---------- render: work list + filter ---------- */
  var activeFilter = 'All';

  function renderWorkList(c) {
    var list = $('#workList');
    var bar = $('#filterBar');
    var empty = $('#workEmpty');
    if (!list) return;
    var works = c.works || [];

    var cats = ['All'];
    works.forEach(function (w) {
      if (w.category && cats.indexOf(w.category) === -1) cats.push(w.category);
    });

    if (bar) {
      bar.innerHTML = cats.map(function (cat) {
        return '<button class="chip" type="button" data-cat="' + esc(cat) + '" aria-pressed="' +
          (cat === activeFilter ? 'true' : 'false') + '">' + esc(cat === 'All' ? '全部' : cat) + '</button>';
      }).join('');
    }

    var shown = works.filter(function (w) { return activeFilter === 'All' || w.category === activeFilter; });

    list.innerHTML = shown.map(function (w, i) {
      return '<li class="work-row"><button class="work-btn" type="button" data-work="' + esc(w.id) + '">' +
        '<span class="work-idx">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="work-name">' + esc(w.title) + '</span>' +
        '<span class="work-cat">' + esc(w.category) + '</span>' +
        '<span class="work-year">' + esc(w.year) + '</span>' +
        '<span class="work-arrow" aria-hidden="true">→</span>' +
        '</button></li>';
    }).join('');

    if (empty) empty.hidden = shown.length > 0;
  }

  /* ---------- detail dialog ---------- */
  var currentContent = null;

  function openWork(id) {
    var dlg = $('#detailDialog');
    if (!dlg || !currentContent) return;
    var w = (currentContent.works || []).filter(function (x) { return x.id === id; })[0];
    if (!w) return;

    var kicker = $('#detailKicker');
    if (kicker) kicker.textContent = w.category + ' · ' + w.year;

    var body = $('#detailBody');
    var html = '<h2 class="detail-title" id="detailTitle">' + esc(w.title) + '</h2>' +
      '<p class="detail-summary">' + esc(w.summary) + '</p>' +
      '<div class="detail-tags">' + (w.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>';

    (w.blocks || []).forEach(function (b) {
      if (b.type === 'text') {
        html += '<div class="detail-block"><p>' + esc(b.text) + '</p></div>';
      } else if (b.type === 'image') {
        html += '<div class="detail-block"><figure><img src="' + esc(b.src) + '" alt="' + esc(b.alt || '') + '" loading="lazy" decoding="async">' +
          (b.caption ? '<figcaption>' + esc(b.caption) + '</figcaption>' : '') + '</figure></div>';
      } else if (b.type === 'video') {
        html += '<div class="detail-block"><figure><video controls preload="none" playsinline poster="' + esc(b.poster || '') + '">' +
          '<source src="' + esc(b.src) + '"></video>' +
          (b.caption ? '<figcaption>' + esc(b.caption) + '</figcaption>' : '') + '</figure></div>';
      } else if (b.type === 'link') {
        html += '<div class="detail-block"><a class="detail-link" href="' + esc(b.url) + '" target="_blank" rel="noopener noreferrer">' +
          esc(b.label) + ' <span aria-hidden="true">↗</span></a></div>';
      } else if (b.type === 'embed') {
        html += '<div class="detail-block"><figure><div style="position:relative;padding-top:56.25%;border-radius:4px;overflow:hidden;background:var(--bg-sunken)">' +
          '<iframe src="' + esc(b.src) + '" title="' + esc(b.label || 'embed') + '" loading="lazy" allowfullscreen ' +
          'style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe></div>' +
          (b.caption ? '<figcaption>' + esc(b.caption) + '</figcaption>' : '') + '</figure></div>';
      }
    });

    if (Array.isArray(w.links) && w.links.length) {
      html += '<div class="detail-links">' + w.links.map(function (l) {
        return '<a class="detail-link" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' +
          esc(l.label) + ' <span aria-hidden="true">↗</span></a>';
      }).join('') + '</div>';
    }

    body.innerHTML = html;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    dlg.querySelector('.detail-inner').scrollTop = 0;
  }

  function initDialog() {
    var dlg = $('#detailDialog');
    if (!dlg) return;
    var close = $('#detailClose');
    if (close) close.addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) dlg.close();
    });
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-work]');
      if (btn) openWork(btn.getAttribute('data-work'));
      var chip = e.target.closest && e.target.closest('.chip[data-cat]');
      if (chip) {
        activeFilter = chip.getAttribute('data-cat');
        renderWorkList(currentContent);
      }
    });
  }

  /* ---------- boot ---------- */
  function render(c) {
    currentContent = c;
    renderHero(c);
    renderFeatures(c);
    renderSkills(c);
    renderInterests(c);
    renderLife(c);
    renderTravel(c);
    renderWorkList(c);
    observeReveals();
  }

  function boot() {
    initHeader();
    initDialog();

    var url = 'content.json?v=' + Date.now();
    fetch(url, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        if (!data || !data.site) throw new Error('bad shape');
        render(data);
      })
      .catch(function () {
        if (window.__SEED__) render(window.__SEED__);
        else {
          var grid = $('#featureGrid');
          if (grid) grid.innerHTML = '<p class="empty">內容載入失敗。請確認 content.json 存在於網站根目錄。</p>';
        }
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
