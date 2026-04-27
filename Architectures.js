/**
 * LUXE ESTATE | Enterprise Core v2.1
 * Refactored for Advanced Image Gallery System
 */

const LuxeApp = (() => {
    // Private State
    const _state = {
        properties: [],
        filteredProperties: [],
        favorites: JSON.parse(localStorage.getItem('luxe_wishlist')) || [],
        filters: { search: '' },
        isLoading: true
    };

    /**
     * Data Engine: Connects to your data source
     */
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

    /**
     * UI Manager: Handles DOM injection
     */
    const UIManager = {
        renderGrid() {
            const grid = document.getElementById('property-grid');
            if (!grid) return;

            if (_state.filteredProperties.length === 0) {
                grid.innerHTML = `<div class="no-results">No properties match your criteria.</div>`;
                return;
            }

            grid.innerHTML = _state.filteredProperties.map(item => this.createCardTemplate(item)).join('');
            this.initCardReveal();
        },

        createCardTemplate(item) {
            const isFav = _state.favorites.includes(item.id);
            
            // Generate progress dots for each image in the property
            const dotsHtml = item.images.map((_, index) => 
                `<span class="dot ${index === 0 ? 'active' : ''}"></span>`
            ).join('');

            return `
                <article class="property-card" data-id="${item.id}" style="opacity: 0;">
                    <div class="gallery-viewport">
                        ${item.isNew ? '<span class="badge">New Listing</span>' : ''}
                        
                        <button class="fav-btn ${isFav ? 'active' : ''}" onclick="LuxeApp.toggleWishlist('${item.id}')">
                            <svg viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        </button>

                        <button class="slider-btn prev" onclick="LuxeApp.moveSlider('${item.id}', -1)">❮</button>
                        <button class="slider-btn next" onclick="LuxeApp.moveSlider('${item.id}', 1)">❯</button>

                        <div class="gallery-strip" id="strip-${item.id}">
                            ${item.images.map(img => `<img src="${img}" alt="${item.title}">`).join('')}
                        </div>

                        <div class="slider-dots" id="dots-${item.id}">
                            ${dotsHtml}
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
                        <p class="location">${item.location}</p>
                    </div>
                </article>
            `;
        },

        initCardReveal() {
            const cards = document.querySelectorAll('.property-card');
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = "1";
                    card.style.transform = "translateY(0)";
                }, index * 100);
            });
        }
    };

    /**
     * State Manager: Handles business logic
     */
    const StateManager = {
        filterResults() {
            const query = _state.filters.search;
            _state.filteredProperties = _state.properties.filter(p => 
                p.title.toLowerCase().includes(query) || 
                p.location.toLowerCase().includes(query)
            );
            UIManager.renderGrid();
        },

        toggleFavorite(id) {
            const idx = _state.favorites.indexOf(id);
            if (idx > -1) _state.favorites.splice(idx, 1);
            else _state.favorites.push(id);
            
            localStorage.setItem('luxe_wishlist', JSON.stringify(_state.favorites));
            UIManager.renderGrid();
        }
    };

    // Public API
    return {
        async init() {
            _state.properties = await DataEngine.fetchProperties();
            _state.filteredProperties = [..._state.properties];
            _state.isLoading = false;
            
            UIManager.renderGrid();
            
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
            const property = _state.properties.find(p => p.id === id);
            
            if (!strip.dataset.currentIndex) strip.dataset.currentIndex = 0;
            
            let index = parseInt(strip.dataset.currentIndex) + direction;

            // Loop logic
            if (index >= property.images.length) index = 0;
            if (index < 0) index = property.images.length - 1;

            // Move the strip
            strip.style.transform = `translateX(-${index * 100}%)`;
            strip.dataset.currentIndex = index;

            // Update dots
            const dots = dotsContainer.querySelectorAll('.dot');
            dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
        },

        toggleWishlist(id) {
            StateManager.toggleFavorite(id);
        }
    };
})();

document.addEventListener('DOMContentLoaded', () => LuxeApp.init());