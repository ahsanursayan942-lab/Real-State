/**
 * LUXE ESTATE | Enterprise Core v3.0
 * Enhanced with: scroll reveal, stat counters, result count, dynamic cards
 */

const LuxeApp = (() => {
    const _state = {
        properties: [],
        filteredProperties: [],
        favorites: JSON.parse(localStorage.getItem('luxe_wishlist')) || [],
        filters: { search: '' },
        isLoading: true
    };

    /* ── Custom Cursor ─────────────────────────────────────────── */
    const CursorEngine = {
        init() {
            const cursor = document.querySelector('.custom-cursor');
            if (!cursor) return;
            document.addEventListener('mousemove', e => {
                cursor.style.left = e.clientX + 'px';
                cursor.style.top  = e.clientY + 'px';
            });
            document.addEventListener('mouseleave', () => { cursor.style.opacity = '0'; });
            document.addEventListener('mouseenter', () => { cursor.style.opacity = '1'; });
        }
    };

    /* ── Stat Counter Animations ───────────────────────────────── */
    const StatCounter = {
        animateAll() {
            const nums = document.querySelectorAll('.stat-num');
            nums.forEach(el => {
                const target = parseInt(el.dataset.target, 10);
                const duration = 1800;
                const start = performance.now();
                const step = (now) => {
                    const progress = Math.min((now - start) / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    el.textContent = Math.floor(eased * target).toLocaleString();
                    if (progress < 1) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
            });
        }
    };

    /* ── Scroll Reveal via IntersectionObserver ────────────────── */
    const ScrollReveal = {
        init() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const card = entry.target;
                        const delay = card.dataset.revealDelay || 0;
                        setTimeout(() => {
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        }, parseInt(delay));
                        observer.unobserve(card);
                    }
                });
            }, { threshold: 0.1 });

            document.querySelectorAll('.property-card').forEach((card, i) => {
                card.dataset.revealDelay = i * 80;
                observer.observe(card);
            });
        }
    };

    /* ── Data Engine ───────────────────────────────────────────── */
    const DataEngine = {
        async fetchProperties() {
            try {
                const response = await fetch('properties.json');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                return data.properties || [];
            } catch (error) {
                console.error("Critical: Could not load property data", error);
                return [];
            }
        }
    };

    /* ── Result Count ──────────────────────────────────────────── */
    const updateResultCount = () => {
        const el = document.getElementById('result-count');
        if (!el) return;
        const n = _state.filteredProperties.length;
        const total = _state.properties.length;
        if (_state.filters.search) {
            el.textContent = n === 0
                ? 'No properties found.'
                : `Showing ${n} of ${total} propert${n === 1 ? 'y' : 'ies'}`;
        } else {
            el.textContent = `${total} exclusive propert${total === 1 ? 'y' : 'ies'} available`;
        }
    };

    /* ── UI Manager ────────────────────────────────────────────── */
    const UIManager = {
        renderGrid() {
            const grid = document.getElementById('property-grid');
            if (!grid) return;

            if (_state.filteredProperties.length === 0) {
                grid.innerHTML = `<div class="no-results">No properties match your criteria.</div>`;
                updateResultCount();
                return;
            }

            grid.innerHTML = _state.filteredProperties.map(item => this.createCardTemplate(item)).join('');
            updateResultCount();
            ScrollReveal.init();
        },

        createCardTemplate(item) {
            const isFav = _state.favorites.includes(item.id);
            const dotsHtml = item.images.map((_, index) =>
                `<span class="dot ${index === 0 ? 'active' : ''}"></span>`
            ).join('');
            const totalImgs = item.images.length;

            return `
                <article class="property-card" data-id="${item.id}" style="opacity:0; transform:translateY(24px);">
                    <div class="gallery-viewport">
                        ${item.isNew ? '<span class="badge">New Listing</span>' : ''}

                        <button class="fav-btn ${isFav ? 'active' : ''}" onclick="LuxeApp.toggleWishlist('${item.id}')">
                            <svg viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        </button>

                        <button class="slider-btn prev" onclick="LuxeApp.moveSlider('${item.id}', -1)">❮</button>
                        <button class="slider-btn next" onclick="LuxeApp.moveSlider('${item.id}', 1)">❯</button>

                        <div class="gallery-strip" id="strip-${item.id}">
                            ${item.images.map(img => `<img src="${img}" alt="${item.title}" loading="lazy">`).join('')}
                        </div>

                        <div class="img-counter" id="counter-${item.id}">1 / ${totalImgs}</div>

                        <div class="slider-dots" id="dots-${item.id}">
                            ${dotsHtml}
                        </div>

                        <div class="card-cta">
                            <span>View Details</span>
                        </div>
                    </div>

                    <div class="card-content">
                        <div class="price">$${item.price.toLocaleString()}</div>
                        <h3 class="title">${item.title}</h3>
                        <div class="meta-tags">
                            <span>${item.beds} Beds</span><span>•</span>
                            <span>${item.baths} Baths</span><span>•</span>
                            <span>${item.sqft.toLocaleString()} sqft</span>
                        </div>
                        <p class="location">
                            <svg style="width:11px;height:11px;display:inline;vertical-align:middle;margin-right:3px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            ${item.location}
                        </p>
                    </div>
                </article>
            `;
        }
    };

    /* ── State Manager ─────────────────────────────────────────── */
    const StateManager = {
        async init() {
            try {
                // Fetch the external JSON file
                const response = await fetch('properties.json');
                const data = await response.json();
                
                // Update state with fetched data
                _state.properties = data.properties;
                _state.filteredProperties = [...data.properties];
                
                // Continue with app setup
                this.renderAll();
                this.updateCount();
            } catch (error) {
                console.error("Failed to load property data:", error);
            }
        },

        toggleFavorite(id) {
            const idx = _state.favorites.indexOf(id);
            if (idx > -1) _state.favorites.splice(idx, 1);
            else _state.favorites.push(id);
            localStorage.setItem('luxe_wishlist', JSON.stringify(_state.favorites));
            UIManager.renderGrid();
        }
    };

    /* ── Public API ────────────────────────────────────────────── */
    return {
        async init() {
            CursorEngine.init();

            _state.properties = await DataEngine.fetchProperties();
            _state.filteredProperties = [..._state.properties];
            _state.isLoading = false;

            UIManager.renderGrid();
            setTimeout(() => StatCounter.animateAll(), 400);

            const search = document.querySelector('.search-bar input');
            if (search) {
                search.addEventListener('input', (e) => {
                    _state.filters.search = e.target.value.toLowerCase();
                    StateManager.filterResults();
                });
            }

            document.body.classList.remove('loading');
        },

        moveSlider(id, direction) {
            const strip = document.getElementById(`strip-${id}`);
            const dotsContainer = document.getElementById(`dots-${id}`);
            const counterEl = document.getElementById(`counter-${id}`);
            const property = _state.properties.find(p => p.id === id);
            if (!strip || !property) return;

            if (!strip.dataset.currentIndex) strip.dataset.currentIndex = 0;
            let index = parseInt(strip.dataset.currentIndex) + direction;
            if (index >= property.images.length) index = 0;
            if (index < 0) index = property.images.length - 1;

            strip.style.transform = `translateX(-${index * 100}%)`;
            strip.dataset.currentIndex = index;

            const dots = dotsContainer.querySelectorAll('.dot');
            dots.forEach((dot, i) => dot.classList.toggle('active', i === index));

            if (counterEl) counterEl.textContent = `${index + 1} / ${property.images.length}`;
        },

        toggleWishlist(id) {
            StateManager.toggleFavorite(id);
        }
    };
})();

document.addEventListener('DOMContentLoaded', () => LuxeApp.init());
