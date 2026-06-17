// ==========================================
// 300 Days Roadmap — Application Logic
// ==========================================

(function () {
    'use strict';

    // ---- State ----
    const STORAGE_KEY = 'roadmap_20lpa_progress';
    let completedDays = loadProgress();
    let currentMonthFilter = -1; // -1 = all
    let currentCategoryFilter = 'all';
    let currentStatusFilter = 'all'; // all, complete, incomplete
    let searchQuery = '';

    // ---- DOM refs ----
    const $grid = document.getElementById('days-grid');
    const $searchInput = document.getElementById('search-input');
    const $monthTabs = document.getElementById('month-tabs');
    const $categoryPills = document.getElementById('category-pills');
    const $progressFill = document.getElementById('progress-fill');
    const $progressGlow = document.getElementById('progress-glow');
    const $progressMilestones = document.getElementById('progress-milestones');
    const $statCompleted = document.getElementById('stat-completed');
    const $statPercent = document.getElementById('stat-percent');
    const $statStreak = document.getElementById('stat-streak');
    const $modalOverlay = document.getElementById('modal-overlay');
    const $modal = document.getElementById('day-modal');
    const $modalClose = document.getElementById('modal-close');
    const $modalDayBadge = document.getElementById('modal-day-badge');
    const $modalCategoryBadge = document.getElementById('modal-category-badge');
    const $modalTitle = document.getElementById('modal-title');
    const $modalDate = document.getElementById('modal-date');
    const $modalBody = document.getElementById('modal-body');
    const $modalCompleteBtn = document.getElementById('modal-complete-btn');
    const $noResults = document.getElementById('no-results');
    const $fabToday = document.getElementById('fab-today');
    const $btnReset = document.getElementById('btn-reset');
    const $btnTheme = document.getElementById('btn-theme');
    const $header = document.getElementById('main-header');
    const $filterAll = document.getElementById('filter-all');
    const $filterIncomplete = document.getElementById('filter-incomplete');
    const $filterComplete = document.getElementById('filter-complete');

    // ---- Helpers ----
    function loadProgress() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? new Set(JSON.parse(data)) : new Set();
        } catch { return new Set(); }
    }

    function saveProgress() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...completedDays]));
    }

    function getDateForDay(dayNum) {
        const d = new Date(START_DATE);
        d.setDate(d.getDate() + dayNum - 1);
        return d;
    }

    function formatDate(date) {
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function formatDateFull(date) {
        return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }

    function getTodayDayNum() {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const start = new Date(START_DATE);
        start.setHours(0, 0, 0, 0);
        const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
        return diff >= 1 && diff <= ROADMAP.length ? diff : -1;
    }

    function getMonthForDay(dayNum) {
        for (const m of MONTHS) {
            if (dayNum >= m.days[0] && dayNum <= m.days[1]) return m;
        }
        return MONTHS[0];
    }

    function calculateStreak() {
        let streak = 0;
        const todayNum = getTodayDayNum();
        const checkFrom = todayNum > 0 ? todayNum : ROADMAP.length;
        for (let d = checkFrom; d >= 1; d--) {
            if (completedDays.has(d)) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    // ---- Render Functions ----
    function updateStats() {
        const completed = completedDays.size;
        const total = ROADMAP.length;
        const percent = Math.round((completed / total) * 100);
        const streak = calculateStreak();

        $statCompleted.textContent = completed;
        $statPercent.textContent = percent + '%';
        $statStreak.textContent = streak;

        $progressFill.style.width = percent + '%';
        $progressGlow.style.width = percent + '%';
    }

    function renderMilestones() {
        $progressMilestones.innerHTML = '';
        MONTHS.forEach(m => {
            const el = document.createElement('span');
            el.className = 'milestone';
            el.textContent = m.label;
            $progressMilestones.appendChild(el);
        });
    }

    function renderMonthTabs() {
        $monthTabs.innerHTML = '';
        // All tab
        const allTab = document.createElement('button');
        allTab.className = 'month-tab' + (currentMonthFilter === -1 ? ' active' : '');
        allTab.textContent = 'All';
        allTab.dataset.month = '-1';
        allTab.addEventListener('click', () => setMonthFilter(-1));
        $monthTabs.appendChild(allTab);

        MONTHS.forEach(m => {
            const tab = document.createElement('button');
            tab.className = 'month-tab' + (currentMonthFilter === m.id ? ' active' : '');
            tab.textContent = m.label + ' — ' + m.title;
            tab.dataset.month = m.id;
            tab.addEventListener('click', () => setMonthFilter(m.id));
            $monthTabs.appendChild(tab);
        });
    }

    function renderCategoryPills() {
        $categoryPills.innerHTML = '';
        const allPill = document.createElement('button');
        allPill.className = 'cat-pill' + (currentCategoryFilter === 'all' ? ' active' : '');
        allPill.dataset.cat = 'all';
        allPill.textContent = '🌐 All';
        allPill.addEventListener('click', () => setCategoryFilter('all'));
        $categoryPills.appendChild(allPill);

        Object.entries(CATEGORIES).forEach(([key, val]) => {
            const pill = document.createElement('button');
            pill.className = 'cat-pill' + (currentCategoryFilter === key ? ' active' : '');
            pill.dataset.cat = key;
            pill.textContent = val.emoji + ' ' + val.label;
            pill.addEventListener('click', () => setCategoryFilter(key));
            $categoryPills.appendChild(pill);
        });
    }

    function getFilteredDays() {
        return ROADMAP.filter(d => {
            // Month filter
            if (currentMonthFilter !== -1) {
                const m = MONTHS[currentMonthFilter];
                if (d.day < m.days[0] || d.day > m.days[1]) return false;
            }
            // Category filter
            if (currentCategoryFilter !== 'all' && d.cat !== currentCategoryFilter) return false;
            // Status filter
            if (currentStatusFilter === 'complete' && !completedDays.has(d.day)) return false;
            if (currentStatusFilter === 'incomplete' && completedDays.has(d.day)) return false;
            // Search filter
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const searchable = (d.title + ' ' + d.details.join(' ') + ' ' + (d.tags || []).join(' ')).toLowerCase();
                if (!searchable.includes(q)) return false;
            }
            return true;
        });
    }

    function renderDays() {
        $grid.innerHTML = '';
        const filtered = getFilteredDays();

        if (filtered.length === 0) {
            $noResults.style.display = 'block';
            return;
        }
        $noResults.style.display = 'none';

        const todayNum = getTodayDayNum();
        let lastMonth = -1;

        filtered.forEach((d, i) => {
            const month = getMonthForDay(d.day);

            // Insert month divider
            if (month.id !== lastMonth && currentMonthFilter === -1 && currentCategoryFilter === 'all' && !searchQuery) {
                lastMonth = month.id;
                const divider = document.createElement('div');
                divider.className = 'month-divider';
                divider.innerHTML = `
                    <div class="month-divider-line"></div>
                    <span class="month-divider-text">${month.label} — ${month.title}</span>
                    <div class="month-divider-line"></div>
                `;
                $grid.appendChild(divider);
            }

            const card = createDayCard(d, todayNum, i);
            $grid.appendChild(card);
        });
    }

    function createDayCard(d, todayNum, index) {
        const card = document.createElement('div');
        card.className = 'day-card';
        const catInfo = CATEGORIES[d.cat] || CATEGORIES.dsa;
        const date = getDateForDay(d.day);
        const isCompleted = completedDays.has(d.day);
        const isToday = d.day === todayNum;

        card.style.setProperty('--card-accent', catInfo.color);
        if (isCompleted) card.classList.add('completed');
        if (isToday) card.classList.add('is-today');
        if (isToday) card.id = 'today-card';

        const detailsPreview = d.details.slice(0, 2).join(' • ');
        const tagHtml = (d.tags || []).slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('');

        card.innerHTML = `
            <div class="day-card-header">
                <span class="day-number">Day ${d.day}</span>
                <span class="day-category">${catInfo.emoji} ${catInfo.label}</span>
                <span class="day-date">${formatDate(date)}</span>
            </div>
            <div class="day-card-title">${isToday ? '📍 ' : ''}${d.title}</div>
            <div class="day-card-details">${detailsPreview}</div>
            <div class="day-card-footer">${tagHtml}</div>
        `;

        card.addEventListener('click', () => openModal(d));
        card.style.animationDelay = `${Math.min(index * 0.02, 0.5)}s`;

        return card;
    }

    // ---- Modal ----
    let currentModalDay = null;

    function openModal(d) {
        currentModalDay = d;
        const catInfo = CATEGORIES[d.cat] || CATEGORIES.dsa;
        const date = getDateForDay(d.day);
        const isCompleted = completedDays.has(d.day);

        $modalDayBadge.textContent = `Day ${d.day}`;
        $modalCategoryBadge.textContent = `${catInfo.emoji} ${catInfo.label}`;
        $modalCategoryBadge.style.background = `color-mix(in srgb, ${catInfo.color} 12%, transparent)`;
        $modalCategoryBadge.style.color = catInfo.color;
        $modalTitle.textContent = d.title;
        $modalDate.textContent = formatDateFull(date);

        // Body
        let bodyHtml = '<h3>📋 Topics to Cover</h3><ul>';
        d.details.forEach(detail => {
            bodyHtml += `<li>${detail}</li>`;
        });
        bodyHtml += '</ul>';

        if (d.tip) {
            bodyHtml += `<div class="tip-box">💡 <strong>Pro Tip:</strong> ${d.tip}</div>`;
        }

        if (d.tags && d.tags.length > 0) {
            bodyHtml += '<h3>🏷️ Tags</h3><ul>';
            d.tags.forEach(tag => {
                bodyHtml += `<li>${tag}</li>`;
            });
            bodyHtml += '</ul>';
        }

        $modalBody.innerHTML = bodyHtml;

        // Complete button
        updateModalButton(isCompleted);

        $modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function updateModalButton(isCompleted) {
        const btnText = $modalCompleteBtn.querySelector('.btn-complete-text');
        if (isCompleted) {
            btnText.textContent = '✓ Completed — Mark Incomplete';
            $modalCompleteBtn.classList.add('is-completed');
        } else {
            btnText.textContent = '✅ Mark as Complete';
            $modalCompleteBtn.classList.remove('is-completed');
        }
    }

    function closeModal() {
        $modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        currentModalDay = null;
    }

    $modalClose.addEventListener('click', closeModal);
    $modalOverlay.addEventListener('click', (e) => {
        if (e.target === $modalOverlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    $modalCompleteBtn.addEventListener('click', () => {
        if (!currentModalDay) return;
        const dayNum = currentModalDay.day;
        if (completedDays.has(dayNum)) {
            completedDays.delete(dayNum);
        } else {
            completedDays.add(dayNum);
        }
        saveProgress();
        updateStats();
        updateModalButton(completedDays.has(dayNum));
        renderDays();
    });

    // ---- Filters ----
    function setMonthFilter(monthId) {
        currentMonthFilter = monthId;
        renderMonthTabs();
        renderDays();
    }

    function setCategoryFilter(cat) {
        currentCategoryFilter = cat;
        renderCategoryPills();
        renderDays();
    }

    function setStatusFilter(status) {
        currentStatusFilter = status;
        [$filterAll, $filterIncomplete, $filterComplete].forEach(btn => btn.classList.remove('active'));
        if (status === 'all') $filterAll.classList.add('active');
        else if (status === 'incomplete') $filterIncomplete.classList.add('active');
        else $filterComplete.classList.add('active');
        renderDays();
    }

    $filterAll.addEventListener('click', () => setStatusFilter('all'));
    $filterIncomplete.addEventListener('click', () => setStatusFilter('incomplete'));
    $filterComplete.addEventListener('click', () => setStatusFilter('complete'));

    // Search
    let searchTimeout;
    $searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchQuery = e.target.value.trim();
            renderDays();
        }, 250);
    });

    // ---- Jump to Today ----
    $fabToday.addEventListener('click', () => {
        // Reset filters
        currentMonthFilter = -1;
        currentCategoryFilter = 'all';
        currentStatusFilter = 'all';
        searchQuery = '';
        $searchInput.value = '';
        [$filterAll, $filterIncomplete, $filterComplete].forEach(btn => btn.classList.remove('active'));
        $filterAll.classList.add('active');
        renderMonthTabs();
        renderCategoryPills();
        renderDays();

        setTimeout(() => {
            const todayCard = document.getElementById('today-card');
            if (todayCard) {
                todayCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                todayCard.style.animation = 'pulse 0.6s ease 2';
            } else {
                // If today is not in range, scroll to first card
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 100);
    });

    // ---- Reset ----
    $btnReset.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset ALL progress? This cannot be undone.')) {
            completedDays = new Set();
            saveProgress();
            updateStats();
            renderDays();
        }
    });

    // ---- Theme ----
    function initTheme() {
        const saved = localStorage.getItem('roadmap_theme');
        if (saved === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }

    $btnTheme.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        if (current === 'light') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('roadmap_theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('roadmap_theme', 'light');
        }
    });

    // ---- Header scroll effect ----
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            $header.classList.add('scrolled');
        } else {
            $header.classList.remove('scrolled');
        }
    });

    // ---- Add pulse animation ----
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(108, 92, 231, 0.4); }
            50% { box-shadow: 0 0 0 12px rgba(108, 92, 231, 0); }
        }
    `;
    document.head.appendChild(style);

    // ---- Initialize ----
    function init() {
        initTheme();
        renderMilestones();
        renderMonthTabs();
        renderCategoryPills();
        updateStats();
        renderDays();
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
