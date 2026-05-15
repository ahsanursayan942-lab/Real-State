/**
 * LUXE ESTATE — Ultra Premium JS v6.0
 * Features: dual-layer cursor · typewriter · stat counters · scroll-reveal
 *           filter/sort/view · touch swipe · modal + thumbnails · wishlist
 *           toast · newsletter · keyboard nav · back-to-top · header shadow
 */

const LuxeApp = (() => {

  /* ── STATE ─────────────────────────────────────────────────── */
  const S = {
    properties : [],
    filtered   : [],
    favorites  : JSON.parse(localStorage.getItem('luxe_fav') || '[]'),
    filter     : { search:'', status:'all', type:'all' },
    sort       : 'default',
    viewMode   : 'grid',
    modalIdx   : 0,
    modalProp  : null,
  };

  /* ── CURSOR ─────────────────────────────────────────────────── */
  const Cursor = {
    dot : null, ring : null,
    rx  : 0, ry : 0,   // ring current position (lerped)
    mx  : 0, my : 0,   // mouse target
    init() {
      this.dot  = document.getElementById('cursor-dot');
      this.ring = document.getElementById('cursor-ring');
      if (!this.dot || window.matchMedia('(pointer:coarse)').matches) {
        this.dot?.remove(); this.ring?.remove();
        document.body.style.cursor = 'auto'; return;
      }
      document.addEventListener('mousemove', e => {
        this.mx = e.clientX; this.my = e.clientY;
        this.dot.style.left = e.clientX + 'px';
        this.dot.style.top  = e.clientY + 'px';
      });
      document.addEventListener('mouseleave', () => { this.dot.style.opacity = '0'; this.ring.style.opacity = '0'; });
      document.addEventListener('mouseenter', () => { this.dot.style.opacity = '1'; this.ring.style.opacity = '.4'; });
      this._lerp();
    },
    _lerp() {
      this.rx += (this.mx - this.rx) * .12;
      this.ry += (this.my - this.ry) * .12;
      this.ring.style.left = this.rx + 'px';
      this.ring.style.top  = this.ry + 'px';
      requestAnimationFrame(() => this._lerp());
    }
  };

  /* ── TYPEWRITER ─────────────────────────────────────────────── */
  const Typewriter = {
    words   : ['Precision Living.','Elevated Design.','Curated Homes.','Iconic Addresses.','Enduring Legacy.'],
    idx     : 0, charIdx : 0, del : false, el : null,
    init() {
      this.el = document.getElementById('typewriter-text');
      if (this.el) this.tick();
    },
    tick() {
      const w = this.words[this.idx];
      const s = this.del ? w.slice(0, this.charIdx-1) : w.slice(0, this.charIdx+1);
      this.el.textContent = s;
      this.charIdx = this.del ? this.charIdx-1 : this.charIdx+1;
      let d = this.del ? 50 : 88;
      if (!this.del && s === w) { d = 1900; this.del = true; }
      if (this.del && s === '') { this.del = false; this.idx = (this.idx+1) % this.words.length; d = 380; }
      setTimeout(() => this.tick(), d);
    }
  };

  /* ── STAT COUNTER ───────────────────────────────────────────── */
  const StatCounter = {
    run() {
      document.querySelectorAll('.stat-num[data-target]').forEach(el => {
        const target = +el.dataset.target;
        const start  = performance.now();
        const dur    = 1900;
        const step   = now => {
          const p = Math.min((now - start) / dur, 1);
          const e = 1 - Math.pow(1-p, 3);
          el.textContent = Math.floor(e * target).toLocaleString();
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }
  };

  /* ── SCROLL REVEAL ──────────────────────────────────────────── */
  const Reveal = {
    init() {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          const el  = e.target;
          const d   = +el.dataset.delay || 0;
          setTimeout(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }, d);
          obs.unobserve(el);
        });
      }, { threshold: .08 });
      document.querySelectorAll('.property-card').forEach((c, i) => {
        c.dataset.delay = i * 70;
        obs.observe(c);
      });
    }
  };

  /* ── TOAST ──────────────────────────────────────────────────── */
  const Toast = {
    show(msg, type = 'add') {
      const c = document.getElementById('toast-container');
      if (!c) return;
      const t = document.createElement('div');
      t.className = `toast${type === 'remove' ? ' remove' : ''}`;
      t.innerHTML = `<span class="toast-icon">${type === 'add' ? '♥' : '♡'}</span>${msg}`;
      c.appendChild(t);
      requestAnimationFrame(() => t.classList.add('show'));
      setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 420); }, 3400);
    }
  };

  /* ── WISHLIST BADGE ─────────────────────────────────────────── */
  const Badge = {
    update() {
      const b = document.getElementById('wishlist-count');
      if (!b) return;
      b.textContent = S.favorites.length;
      b.style.display = S.favorites.length ? 'inline-flex' : 'none';
      b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    }
  };

  /* ── HEADER SHADOW ──────────────────────────────────────────── */
  const Header = {
    init() {
      const h = document.getElementById('main-header');
      if (!h) return;
      window.addEventListener('scroll', () => h.classList.toggle('scrolled', scrollY > 12), { passive:true });
    }
  };

  /* ── BACK TO TOP ────────────────────────────────────────────── */
  const BackToTop = {
    init() {
      const b = document.getElementById('back-to-top');
      if (!b) return;
      window.addEventListener('scroll', () => b.classList.toggle('visible', scrollY > 400), { passive:true });
      b.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));
    }
  };

  /* ── DATA ───────────────────────────────────────────────────── */
  const Data = {
    async fetch() {
      try {
        const r = await fetch('properties.json');
        if (!r.ok) throw Error(r.status);
        const d = await r.json();
        return { properties: d.properties || [], testimonials: d.testimonials || [] };
      } catch { return { properties:[], testimonials:[] }; }
    }
  };

  /* ── FILTER / SORT ──────────────────────────────────────────── */
  const Filter = {
    apply() {
      let r = [...S.properties];
      if (S.filter.search) {
        const q = S.filter.search;
        r = r.filter(p =>
          p.title.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          (p.type||'').toLowerCase().includes(q)
        );
      }
      if (S.filter.status !== 'all') r = r.filter(p => p.status === S.filter.status);
      if (S.filter.type   !== 'all') r = r.filter(p => p.type   === S.filter.type);
      if (S.sort === 'price-asc')  r.sort((a,b) => a.price - b.price);
      if (S.sort === 'price-desc') r.sort((a,b) => b.price - a.price);
      if (S.sort === 'newest')     r.sort((a,b) => b.yearBuilt - a.yearBuilt);
      if (S.sort === 'sqft-desc')  r.sort((a,b) => b.sqft - a.sqft);
      S.filtered = r;
    }
  };

  const resultCount = () => {
    const el = document.getElementById('result-count');
    if (!el) return;
    const n = S.filtered.length, t = S.properties.length;
    const filt = S.filter.search || S.filter.status !== 'all' || S.filter.type !== 'all';
    el.textContent = filt
      ? (n === 0 ? 'No properties match your criteria.' : `Showing ${n} of ${t} properties`)
      : `${t} exclusive properties available`;
  };

  /* ── UI ─────────────────────────────────────────────────────── */
  const UI = {
    skeletons(n = 6) {
      const g = document.getElementById('property-grid');
      if (!g) return;
      g.innerHTML = Array.from({length:n}, () => `
        <div class="skeleton-card">
          <div class="skeleton-image shimmer"></div>
          <div class="skeleton-text shimmer"></div>
          <div class="skeleton-text shimmer"></div>
          <div class="skeleton-text short shimmer"></div>
        </div>`).join('');
    },

    grid() {
      const g = document.getElementById('property-grid');
      if (!g) return;
      if (!S.filtered.length) {
        g.innerHTML = `<div class="no-results">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <p>No properties match your criteria.</p>
        </div>`;
        resultCount(); return;
      }
      g.innerHTML = S.filtered.map((p,i) => this.card(p,i)).join('');
      resultCount();
      Reveal.init();
      S.filtered.forEach(p => Swipe.bind(p.id));
    },

    card(p, i) {
      const fav  = S.favorites.includes(p.id);
      const sClass = p.status === 'For Rent' ? 'for-rent' : 'for-sale';
      const dots   = p.images.map((_,j) => `<span class="dot${j===0?' active':''}"></span>`).join('');
      const feat   = p.isNew || i < 2;
      return `
<article class="property-card${feat?' featured':''}" data-id="${p.id}" style="opacity:0;transform:translateY(24px)">
  <div class="gallery-viewport">
    ${p.isNew ? '<span class="badge">New Listing</span>' : ''}
    <span class="badge-status ${sClass}">${p.status}</span>

    <button class="fav-btn${fav?' active':''}" onclick="LuxeApp.toggleFav('${p.id}',event)" aria-label="Save">
      <svg viewBox="0 0 24 24" fill="${fav?'currentColor':'none'}" stroke="currentColor" stroke-width="1.8">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </button>

    <button class="slider-btn prev" onclick="LuxeApp.slide('${p.id}',-1,event)">&#10094;</button>
    <button class="slider-btn next" onclick="LuxeApp.slide('${p.id}',1,event)">&#10095;</button>

    <div class="gallery-strip" id="strip-${p.id}">
      ${p.images.map(img => `<img src="${img}" alt="${p.title}" loading="lazy">`).join('')}
    </div>
    <div class="gallery-fade"></div>
    <div class="img-counter" id="counter-${p.id}">1 / ${p.images.length}</div>
    <div class="slider-dots" id="dots-${p.id}">${dots}</div>
    <div class="card-cta" onclick="LuxeApp.openModal('${p.id}')"><span>View Property</span></div>
  </div>

  <div class="card-content" onclick="LuxeApp.openModal('${p.id}')">
    <div class="price">$${p.price.toLocaleString()}</div>
    <h3 class="title">${p.title}</h3>
    <div class="meta-tags">
      <span>${p.beds} Beds</span><span>·</span>
      <span>${p.baths} Baths</span><span>·</span>
      <span>${p.sqft.toLocaleString()} sqft</span>
    </div>
    <p class="location">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      ${p.location}
    </p>
  </div>
</article>`;
    },

    testimonials(list) {
      const g = document.getElementById('testimonials-grid');
      if (!g || !list.length) return;
      g.innerHTML = list.map(t => `
<div class="testimonial-card">
  <div class="testimonial-stars">${'<span>★</span>'.repeat(5)}</div>
  <p class="testimonial-quote">${t.quote}</p>
  <div class="testimonial-author">
    <img src="${t.avatar}" alt="${t.name}" loading="lazy">
    <div>
      <div class="author-name">${t.name}</div>
      <div class="author-role">${t.role}</div>
    </div>
  </div>
</div>`).join('');
    }
  };

  /* ── TOUCH SWIPE ────────────────────────────────────────────── */
  const Swipe = {
    bind(id) {
      const el = document.getElementById('strip-'+id);
      if (!el) return;
      let sx = 0;
      el.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive:true });
      el.addEventListener('touchend',   e => {
        const d = sx - e.changedTouches[0].clientX;
        if (Math.abs(d) > 38) LuxeApp.slide(id, d>0?1:-1, null);
      }, { passive:true });
    }
  };

  /* ── MODAL ──────────────────────────────────────────────────── */
  const Modal = {
    open(id) {
      const p = S.properties.find(x => x.id === id);
      if (!p) return;
      S.modalProp = p; S.modalIdx = 0;

      const set = (sel, val) => { const el = document.getElementById(sel); if (el) el.textContent = val; };
      set('modal-price',       '$'+p.price.toLocaleString());
      set('modal-title',       p.title);
      set('modal-location',    p.location);
      set('modal-desc',        p.description);
      set('modal-beds',        p.beds);
      set('modal-baths',       p.baths);
      set('modal-sqft',        p.sqft.toLocaleString());
      set('modal-type',        p.type || '—');
      set('modal-status',      p.status);
      set('modal-built',       p.yearBuilt);
      set('modal-garage',      p.garage ? p.garage+' Car' : '—');
      set('modal-agent-name',  p.agent.name);
      set('modal-agent-title', p.agent.title || 'Luxury Advisor');
      set('modal-agent-phone', p.agent.phone);
      set('modal-agent-email', p.agent.email || '');

      const av = document.getElementById('modal-agent-avatar');
      if (av) av.src = p.agent.avatar;
      const ph = document.getElementById('modal-agent-phone-link');
      const em = document.getElementById('modal-agent-email-link');
      if (ph) ph.href = 'tel:'+p.agent.phone;
      if (em) em.href = 'mailto:'+(p.agent.email||'');

      // Chips
      const chips = {
        'modal-chip-beds':   p.beds+' Bedrooms',
        'modal-chip-baths':  p.baths+' Bathrooms',
        'modal-chip-sqft':   p.sqft.toLocaleString()+' sqft',
        'modal-chip-type':   p.type||'',
        'modal-chip-status': p.status,
      };
      Object.entries(chips).forEach(([id,val]) => { const el=document.getElementById(id); if(el) el.textContent=val; });

      // Gallery
      const strip = document.getElementById('modal-strip');
      if (strip) strip.innerHTML = p.images.map(img => `<img src="${img}" alt="${p.title}">`).join('');
      this.goTo(0);

      // Thumbs
      const thumbs = document.getElementById('modal-thumbs');
      if (thumbs) thumbs.innerHTML = p.images.map((img,i) => `
        <div class="modal-thumb${i===0?' active':''}" onclick="LuxeApp.modalGoTo(${i})">
          <img src="${img}" alt="">
        </div>`).join('');

      // Features
      const feats = document.getElementById('modal-features');
      if (feats) feats.innerHTML = (p.features||[]).map(f => `<span class="feature-tag">${f}</span>`).join('');

      const ov = document.getElementById('modal-overlay');
      if (ov) ov.classList.add('open');
      document.body.style.overflow = 'hidden';
    },

    close() {
      document.getElementById('modal-overlay')?.classList.remove('open');
      document.body.style.overflow = '';
    },

    goTo(idx) {
      const p = S.modalProp; if (!p) return;
      const strip = document.getElementById('modal-strip');
      if (strip) strip.style.transform = `translateX(-${idx*100}%)`;
      document.querySelectorAll('.modal-thumb').forEach((t,i) => t.classList.toggle('active', i===idx));
      const ctr = document.getElementById('modal-img-counter');
      if (ctr) ctr.textContent = `${idx+1} / ${p.images.length}`;
      S.modalIdx = idx;
    },

    slide(dir) {
      const p = S.modalProp; if (!p) return;
      let n = S.modalIdx + dir;
      if (n >= p.images.length) n = 0;
      if (n < 0) n = p.images.length - 1;
      this.goTo(n);
    }
  };

  /* ── CONTROLS ───────────────────────────────────────────────── */
  const Controls = {
    init() {
      // Pills
      document.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const { filterGroup, filterValue } = pill.dataset;
          document.querySelectorAll(`.pill[data-filter-group="${filterGroup}"]`)
            .forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          S.filter[filterGroup] = filterValue;
          this.refresh();
        });
      });

      // Sort
      const sort = document.getElementById('sort-select');
      if (sort) sort.addEventListener('change', () => { S.sort = sort.value; this.refresh(); });

      // View
      document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          S.viewMode = btn.dataset.view;
          document.getElementById('property-grid')?.classList.toggle('list-view', S.viewMode === 'list');
        });
      });

      // Search
      const search = document.getElementById('property-search');
      if (search) {
        let t;
        search.addEventListener('input', () => {
          clearTimeout(t);
          t = setTimeout(() => { S.filter.search = search.value.toLowerCase().trim(); this.refresh(); }, 240);
        });
      }
    },

    refresh() { Filter.apply(); UI.grid(); }
  };

  /* ── NEWSLETTER ─────────────────────────────────────────────── */
  const Newsletter = {
    init() {
      const f = document.getElementById('newsletter-form');
      if (!f) return;
      f.addEventListener('submit', e => {
        e.preventDefault();
        const inp = f.querySelector('input');
        if (inp?.value.includes('@')) {
          Toast.show("You're on the list. Expect excellence.", 'add');
          inp.value = '';
        } else {
          Toast.show('Please enter a valid email address.', 'remove');
        }
      });
    }
  };

  /* ── KEYBOARD ───────────────────────────────────────────────── */
  const Keyboard = {
    init() {
      document.addEventListener('keydown', e => {
        const ov = document.getElementById('modal-overlay');
        if (!ov?.classList.contains('open')) return;
        if (e.key === 'Escape')     Modal.close();
        if (e.key === 'ArrowRight') Modal.slide(1);
        if (e.key === 'ArrowLeft')  Modal.slide(-1);
      });
    }
  };

  /* ── PUBLIC API ─────────────────────────────────────────────── */
  return {
    async init() {
      UI.skeletons(6);
      Cursor.init();
      Header.init();
      BackToTop.init();
      Keyboard.init();
      Typewriter.init();

      const { properties, testimonials } = await Data.fetch();
      S.properties = properties;
      S.filtered   = [...properties];

      UI.grid();
      UI.testimonials(testimonials);
      Controls.init();
      Newsletter.init();
      Badge.update();

      setTimeout(() => StatCounter.run(), 500);
      document.body.classList.remove('loading');

      // Showing CTA
      document.getElementById('showing-btn')?.addEventListener('click', () => {
        Toast.show('Private showing requested — an advisor will contact you shortly.', 'add');
      });
    },

    slide(id, dir, ev) {
      if (ev) ev.stopPropagation();
      const strip = document.getElementById('strip-'+id);
      if (!strip) return;
      const p = S.properties.find(x => x.id === id); if (!p) return;
      let idx = +(strip.dataset.idx||0) + dir;
      if (idx >= p.images.length) idx = 0;
      if (idx < 0) idx = p.images.length - 1;
      strip.style.transform = `translateX(-${idx*100}%)`;
      strip.dataset.idx = idx;
      document.getElementById('dots-'+id)?.querySelectorAll('.dot')
        .forEach((d,i) => d.classList.toggle('active', i===idx));
      const ctr = document.getElementById('counter-'+id);
      if (ctr) ctr.textContent = `${idx+1} / ${p.images.length}`;
    },

    toggleFav(id, ev) {
      if (ev) ev.stopPropagation();
      const i = S.favorites.indexOf(id);
      const p = S.properties.find(x => x.id === id);
      if (i > -1) {
        S.favorites.splice(i, 1);
        Toast.show(`Removed from your collection`, 'remove');
      } else {
        S.favorites.push(id);
        Toast.show(`${p?.title||'Property'} saved to your collection`, 'add');
      }
      localStorage.setItem('luxe_fav', JSON.stringify(S.favorites));
      Badge.update();
      const btn = document.querySelector(`.property-card[data-id="${id}"] .fav-btn`);
      if (btn) {
        const isFav = S.favorites.includes(id);
        btn.classList.toggle('active', isFav);
        btn.querySelector('svg')?.setAttribute('fill', isFav ? 'currentColor' : 'none');
      }
    },

    openModal(id)  { Modal.open(id)  },
    closeModal()   { Modal.close()   },
    modalSlide(d)  { Modal.slide(d)  },
    modalGoTo(idx) { Modal.goTo(idx) },
    fireToast(m,t) { Toast.show(m,t) },

    toggleShowingForm() {
      const panel   = document.getElementById('showing-form-panel');
      const btn     = document.getElementById('showing-btn');
      const success = document.getElementById('sf-success');
      if (!panel) return;
      const open = panel.classList.toggle('open');
      if (btn) btn.textContent = open ? 'Close' : 'Schedule Tour';
      // Reset success state if re-opening
      if (open && success) success.style.display = 'none';
      if (open) {
        const form = document.getElementById('showing-form');
        if (form) {
          form.querySelectorAll('.sf-row, .sf-field, .sf-actions').forEach(el => el.style.display = '');
          form.reset();
          const submitBtn = document.getElementById('sf-submit-btn');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.querySelector('.sf-submit-text').style.display = 'inline';
            submitBtn.querySelector('.sf-submit-spinner').style.display = 'none';
          }
        }
      }
    },

    // Expose toggleWishlist alias for backwards compat
    toggleWishlist(id, ev) { this.toggleFav(id, ev); }
  };

})();

document.addEventListener('DOMContentLoaded', () => LuxeApp.init());

/* ================================================================
   PREMIUM CHARTS ENGINE — rings, bars, donut, area sparkline
   ================================================================ */
const Charts = {

  /* circumference for r=33: 2π×33 = 207.35 */
  C: 2 * Math.PI * 33,

  /* ── Ring progress animations ─────────────────────────────── */
  initRings() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.querySelectorAll('.ring-prog[data-pct]').forEach(ring => {
          const pct = parseFloat(ring.dataset.pct) / 100;
          setTimeout(() => {
            ring.style.strokeDashoffset = this.C * (1 - pct);
          }, 300);
        });
        // mini bars
        en.target.querySelectorAll('.rb-fill[data-w]').forEach(bar => {
          setTimeout(() => { bar.style.width = bar.dataset.w + '%'; }, 500);
        });
        obs.unobserve(en.target);
      });
    }, { threshold: 0.15 });

    const dash = document.getElementById('ring-dashboard');
    if (dash) obs.observe(dash);
  },

  /* ── Bar chart: avg price per property type ───────────────── */
  renderBar(properties) {
    const el = document.getElementById('bar-chart');
    if (!el || !properties.length) return;

    const map = {};
    properties.forEach(p => {
      if (!p.type) return;
      if (!map[p.type]) map[p.type] = { sum: 0, n: 0 };
      map[p.type].sum += p.price;
      map[p.type].n++;
    });

    const rows = Object.entries(map)
      .map(([type, { sum, n }]) => ({ type, avg: Math.round(sum / n) }))
      .sort((a, b) => b.avg - a.avg);

    const max = rows[0].avg;

    el.innerHTML = rows.map(r => {
      const pct = ((r.avg / max) * 100).toFixed(1);
      const label = r.avg >= 1e6
        ? '$' + (r.avg / 1e6).toFixed(1) + 'M'
        : '$' + (r.avg / 1e3).toFixed(0) + 'K';
      return `
<div class="bc-row">
  <span class="bc-type">${r.type}</span>
  <div class="bc-track"><div class="bc-fill" data-pct="${pct}"></div></div>
  <span class="bc-val">${label}</span>
</div>`;
    }).join('');

    // Animate bars in after paint
    requestAnimationFrame(() => {
      el.querySelectorAll('.bc-fill[data-pct]').forEach((bar, i) => {
        setTimeout(() => { bar.style.width = bar.dataset.pct + '%'; }, i * 90);
      });
    });
  },

  /* ── Donut chart: property count by type ──────────────────── */
  renderDonut(properties) {
    const segsEl = document.getElementById('donut-segs');
    const legEl  = document.getElementById('donut-legend');
    const numEl  = document.getElementById('donut-num');
    if (!segsEl || !legEl || !properties.length) return;

    const counts = {};
    properties.forEach(p => { if (p.type) counts[p.type] = (counts[p.type] || 0) + 1; });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const total   = properties.length;
    if (numEl) numEl.textContent = total;

    const palette = ['#c9a96e','#9a7a44','#e0c898','#6a6050','#ddd5c2','#b8975a','#8f7040','#f0ebe0'];
    const cx = 60, cy = 60, r = 42;
    const circ = 2 * Math.PI * r;

    let cum = 0;
    segsEl.innerHTML = entries.map(([type, count], i) => {
      const pct  = count / total;
      const dash = circ * pct;
      const gap  = circ - dash;
      const rot  = cum * 360 - 90;
      cum += pct;
      const color = palette[i % palette.length];
      return `<circle class="donut-seg"
        cx="${cx}" cy="${cy}" r="${r}"
        stroke="${color}"
        stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}"
        stroke-dashoffset="${circ}"
        transform="rotate(${rot.toFixed(2)} ${cx} ${cy})"
        data-circ="${circ}" data-dash="${dash.toFixed(2)}"/>`;
    }).join('');

    // Animate segments in
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        segsEl.querySelectorAll('.donut-seg').forEach((seg, i) => {
          const d = parseFloat(seg.dataset.dash);
          const c = parseFloat(seg.dataset.circ);
          setTimeout(() => {
            seg.style.transition = `stroke-dashoffset ${0.9 + i * 0.1}s cubic-bezier(.4,0,.2,1)`;
            seg.style.strokeDashoffset = c - d;
          }, i * 110);
        });
        obs.unobserve(en.target);
      });
    }, { threshold: 0.2 });
    const sec = document.querySelector('.market-section');
    if (sec) obs.observe(sec);

    legEl.innerHTML = entries.map(([type, count], i) => `
<div class="dl-item">
  <span class="dl-dot" style="background:${palette[i % palette.length]}"></span>
  <span class="dl-name">${type}</span>
  <span class="dl-pct">${Math.round((count / total) * 100)}%</span>
</div>`).join('');
  },

  /* ── Area / trend chart ────────────────────────────────────── */
  renderArea() {
    const lineEl  = document.getElementById('area-line');
    const fillEl  = document.getElementById('area-fill');
    const dotEl   = document.getElementById('area-dot');
    const monthEl = document.getElementById('area-months');
    if (!lineEl) return;

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];
    const vals   = [62,65,61,68,72,70,75,73,78,80,77,83,85,88,84,90,94,97];
    const W = 300, H = 72, pad = 3;
    const minV = Math.min(...vals) - 4, maxV = Math.max(...vals) + 4;

    const xs = vals.map((_, i) => pad + (i / (vals.length - 1)) * (W - 2 * pad));
    const ys = vals.map(v  => H - pad - ((v - minV) / (maxV - minV)) * (H - 2 * pad));
    const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`);

    const linePts = pts.join(' L ');
    lineEl.setAttribute('d', `M ${linePts}`);
    fillEl.setAttribute('d', `M ${xs[0].toFixed(1)},${H} L ${linePts} L ${xs[xs.length-1].toFixed(1)},${H} Z`);
    dotEl.setAttribute('cx', xs[xs.length-1].toFixed(1));
    dotEl.setAttribute('cy', ys[ys.length-1].toFixed(1));

    // Draw-on animation
    const len = lineEl.getTotalLength ? lineEl.getTotalLength() : 550;
    lineEl.style.strokeDasharray  = len;
    lineEl.style.strokeDashoffset = len;

    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        setTimeout(() => {
          lineEl.style.transition = 'stroke-dashoffset 2.2s cubic-bezier(.4,0,.2,1)';
          lineEl.style.strokeDashoffset = 0;
        }, 300);
        obs.unobserve(en.target);
      });
    }, { threshold: 0.2 });
    const sec = document.querySelector('.mchart-area');
    if (sec) obs.observe(sec);

    // Month labels every 3rd
    if (monthEl) {
      monthEl.innerHTML = months
        .filter((_, i) => i % 3 === 0)
        .map(m => `<span>${m}</span>`)
        .join('');
    }
  },

  /* ── Boot all charts ───────────────────────────────────────── */
  init(properties) {
    this.initRings();
    this.renderBar(properties);
    this.renderDonut(properties);
    this.renderArea();
  }
};

/* Patch LuxeApp.init to also boot charts after data loads */
const _origInit = LuxeApp.init.bind(LuxeApp);
LuxeApp.init = async function () {
  await _origInit();
  try {
    const res  = await fetch('properties.json');
    const data = await res.json();
    Charts.init(data.properties || []);
  } catch (e) {
    Charts.init([]);
  }
};
