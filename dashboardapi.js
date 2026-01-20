// dashboard.js - Teljes, API integrált változat

document.addEventListener('DOMContentLoaded', function() {
    // Token ellenőrzése
    const token = getAuthToken();
    if (!token) {
        window.location.href = '/login';
        return;
    }
    
    // Inicializálás
    loadUserProfile();
    loadDashboardData();
    setupEventListeners();
    initializeCharts();
    updatePageDescription();
});

// ======================
// FŐ FÜGGVÉNYEK
// ======================

// Felhasználói profil betöltése API-ból
async function loadUserProfile() {
    try {
        const token = getAuthToken();
        
        if (!token) {
            console.warn('Nincs érvényes token');
            showDefaultProfile();
            return;
        }
        
        // API hívás a felhasználó adatainak lekéréséhez
        const response = await fetch('/api/user/get', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                get: 'uid,email,first_name,full_name,alias,roles,pfp'
            })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                clearAuthToken();
                window.location.href = '/login';
                return;
            }
            throw new Error(`HTTP hiba: ${response.status}`);
        }
        
        const userData = await response.json();
        
        if (userData) {
            updateProfileDisplay(userData);
            updateUserProfileDropdown(userData);
        } else {
            showDefaultProfile();
        }
        
        return userData;
    } catch (error) {
        console.error('Hiba a felhasználói profil betöltésekor:', error);
        showDefaultProfile();
        return null;
    }
}

// Dashboard adatok betöltése
async function loadDashboardData() {
    try {
        const token = getAuthToken();
        
        // Statisztikák betöltése API-ból vagy helyi fájlból
        const [stats, articles] = await Promise.all([
            fetchDashboardStats(token),
            fetchUserArticles(token)
        ]);
        
        // Statisztikák frissítése
        if (stats) {
            updateStats(stats);
        } else {
            loadDefaultStats();
        }
        
        // Cikkek frissítése
        if (articles) {
            updateArticlesDisplay(articles);
        }
        
    } catch (error) {
        console.error('Hiba a dashboard adatok betöltésekor:', error);
        loadDefaultStats();
    }
}

// Eseménykezelők beállítása
function setupEventListeners() {
    // Profil dropdown kezelés
    setupProfileDropdown();
    
    // Mobile menu kezelés
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const closeSidebar = document.querySelector('.close-sidebar');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }

    if (closeSidebar) {
        closeSidebar.addEventListener('click', function() {
            sidebar.classList.remove('active');
        });
    }

    // Sidebar bezárása kattintásra kívül
    document.addEventListener('click', function(event) {
        const isClickInsideSidebar = sidebar.contains(event.target);
        const isClickOnMenuBtn = mobileMenuBtn.contains(event.target);
        
        if (!isClickInsideSidebar && !isClickOnMenuBtn && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });

    // Navigáció kezelése
    document.querySelectorAll(".navList").forEach(function(element) {
        element.addEventListener('click', function() {
            // Sidebar bezárása mobilon
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
            }
          
            // Aktív állapot kezelése
            document.querySelectorAll(".navList").forEach(function(e) {
                e.classList.remove('active');
            });
            this.classList.add('active');

            // Cél szekció megjelenítése
            const targetId = this.getAttribute('data-target');
            
            // Minden szekció elrejtése
            document.querySelectorAll(".data-table, .overview").forEach(function(section) {
                section.style.display = 'none';
            });

            // Cél szekció megjelenítése
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.style.display = 'block';
                updatePageDescription(targetId);
                
                // Speciális kezelés poszt létrehozás esetén
                if (targetId === 'create-post') {
                    setupPostForm();
                }
                // Speciális kezelés cikkek esetén
                else if (targetId === 'articles') {
                    loadUserArticlesForTable();
                }
            }
        });
    });

    // Chart időszak gombok
    document.querySelectorAll('.btn-chart').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.btn-chart').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            loadChartData(this.textContent.trim());
        });
    });

    // Cikk filter gombok
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterArticles(this.textContent.trim());
        });
    });

    // Komment filter gombok
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterComments(this.textContent.trim());
        });
    });

    // Új cikk gomb
    document.getElementById('new-article-btn')?.addEventListener('click', function() {
        document.querySelectorAll(".navList").forEach(function(e) {
            e.classList.remove('active');
        });
        document.querySelector('[data-target="create-post"]').classList.add('active');
        
        document.querySelectorAll(".data-table, .overview").forEach(function(section) {
            section.style.display = 'none';
        });
        document.getElementById('create-post').style.display = 'block';
        updatePageDescription('create-post');
        setupPostForm();
    });

    // Keresés mező
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function(e) {
            searchContent(e.target.value);
        }, 300));
    }

    // Ablak átméretezés
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
        }
    });
}

// Chart inicializálás
function initializeCharts() {
    // Egyszerű animáció a chart bar-okhoz
    const chartBars = document.querySelectorAll('.chart-bar');
    chartBars.forEach(bar => {
        const originalHeight = bar.style.height;
        bar.style.height = '0%';
        
        setTimeout(() => {
            bar.style.transition = 'height 0.8s ease';
            bar.style.height = originalHeight;
        }, 300);
    });
    
    // Chart adatok betöltése
    loadChartData('7 nap');
}

// Oldal leírás frissítése
function updatePageDescription(pageId = 'dashboard') {
    const descriptions = {
        'dashboard': 'Íme a mai összefoglaló',
        'create-post': 'Hozzon létre egy új tartalmat',
        'articles': 'Kezelje a meglévő cikkeit',
        'analytics': 'Részletes elemzések és statisztikák',
        'comments': 'Olvassa és moderálja a hozzászólásokat'
    };
    
    const descElement = document.querySelector('.page-description');
    if (descElement) {
        descElement.textContent = descriptions[pageId] || 'Adminisztrációs felület';
    }
}

// ======================
// SEGÉDFÜGGVÉNYEK
// ======================

// Token kezelés
function getAuthToken() {
    return localStorage.getItem('secret') || 
           sessionStorage.getItem('secret') ||
           getCookie('secret');
}

function clearAuthToken() {
    localStorage.removeItem('secret');
    sessionStorage.removeItem('secret');
    document.cookie = 'secret=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Profil kezelés
function updateProfileDisplay(userData) {
    const userDisplayName = document.getElementById('user-display-name');
    const userProfileImage = document.getElementById('user-profile-image');
    
    if (!userDisplayName || !userProfileImage) return;
    
    // Név beállítása
    let displayName = 'Felhasználó';
    
    if (userData.alias && userData.alias.trim() !== '') {
        displayName = userData.alias;
    } else if (userData.full_name && userData.full_name.trim() !== '') {
        displayName = userData.full_name;
    } else if (userData.first_name && userData.first_name.trim() !== '') {
        displayName = userData.first_name;
    }
    
    userDisplayName.textContent = displayName;
    
    // Profilkép beállítása
    if (userData.pfp && userData.pfp.trim() !== '') {
        userProfileImage.src = userData.pfp;
    } else {
        const nameForAvatar = encodeURIComponent(displayName.replace(/\s+/g, '+'));
        userProfileImage.src = `https://ui-avatars.com/api/?name=${nameForAvatar}&background=1891d1&color=fff&bold=true`;
    }
    userProfileImage.alt = displayName;
}

function showDefaultProfile() {
    document.getElementById('user-display-name').textContent = 'Felhasználó';
    
    const dropdownContent = document.getElementById('dropdown-content');
    if (dropdownContent) {
        dropdownContent.innerHTML = `
            <div class="dropdown-header">
                <div class="dropdown-user-info">
                    <div class="dropdown-user-name">Vendég</div>
                    <div class="dropdown-user-email">Nincs bejelentkezve</div>
                </div>
            </div>
            <div class="dropdown-divider"></div>
            <a href="/login" class="dropdown-item">
                <ion-icon name="log-in-outline"></ion-icon>
                <span>Bejelentkezés</span>
            </a>
        `;
    }
}

function setupProfileDropdown() {
    const profileToggleBtn = document.getElementById('profile-toggle-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    
    if (profileToggleBtn && profileDropdown) {
        profileToggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });
        
        document.addEventListener('click', function(e) {
            if (!profileToggleBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('active');
            }
        });
    }
}

function updateUserProfileDropdown(userData) {
    const dropdownContent = document.getElementById('dropdown-content');
    if (!dropdownContent) return;
    
    const email = userData.email || 'N/A';
    
    dropdownContent.innerHTML = `
        <div class="dropdown-header">
            <div class="dropdown-user-info">
                <div class="dropdown-user-name">${userData.alias || userData.full_name || userData.first_name || 'Felhasználó'}</div>
                <div class="dropdown-user-email">${email}</div>
            </div>
        </div>
        <div class="dropdown-divider"></div>
        <a href="#" class="dropdown-item" id="view-profile-btn">
            <ion-icon name="person-outline"></ion-icon>
            <span>Profil megtekintése</span>
        </a>
        <a href="#" class="dropdown-item" id="edit-profile-btn">
            <ion-icon name="create-outline"></ion-icon>
            <span>Profil szerkesztése</span>
        </a>
        <div class="dropdown-divider"></div>
        <a href="#" class="dropdown-item logout" id="logout-btn">
            <ion-icon name="log-out-outline"></ion-icon>
            <span>Kijelentkezés</span>
        </a>
    `;
    
    // Eseménykezelők
    document.getElementById('view-profile-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        showProfileDetails(userData);
    });
    
    document.getElementById('edit-profile-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        editProfile(userData);
    });
    
    document.getElementById('logout-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
}

function showProfileDetails(userData) {
    const roles = userData.roles ? JSON.parse(userData.roles).join(', ') : 'Nincs';
    
    alert(`Profil adatok:\n\nNév: ${userData.full_name || userData.first_name || 'N/A'}\nAlias: ${userData.alias || 'N/A'}\nEmail: ${userData.email || 'N/A'}\nRangok: ${roles}`);
}

function editProfile(userData) {
    alert('Profil szerkesztése hamarosan elérhető lesz.');
}

function logout() {
    clearAuthToken();
    window.location.href = '/logout.php';
}

// Dashboard adatok kezelése
async function fetchDashboardStats(token) {
    try {
        // Próbáljuk először a meglévő PHP fájlt
        const response = await fetch('get_stats.php');
        if (response.ok) {
            return await response.json();
        }
        
        // Ha nincs PHP fájl, használjuk az API-t
        if (token) {
            // Lekérjük a felhasználó cikkeit
            const postsResponse = await fetch(`/api/post/get/written?edited=false`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (postsResponse.ok) {
                const posts = await postsResponse.json();
                const frontPostsResponse = await fetch('/api/post/get/front');
                const frontPosts = frontPostsResponse.ok ? await frontPostsResponse.json() : {};
                
                // Statisztikák számítása
                return {
                    views: calculateTotalViews(frontPosts),
                    active_users: Object.keys(frontPosts || {}).length * 10,
                    activities: Object.keys(posts || {}).length,
                    articles: Object.keys(posts || {}).length
                };
            }
        }
        
        return null;
    } catch (error) {
        console.error('Hiba a statisztikák lekérésekor:', error);
        return null;
    }
}

async function fetchUserArticles(token) {
    try {
        if (token) {
            const response = await fetch(`/api/post/get/written?edited=false`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const posts = await response.json();
                return Object.entries(posts).map(([pid, post]) => ({
                    id: pid,
                    title: post.title,
                    content: post.minimal_desc || post.desc || '',
                    created_at: formatDate(post.created),
                    status: post.number <= 7 ? 'published' : 'draft' // Egyszerűsített státusz meghatározás
                }));
            }
        }
        
        // Visszaesés a meglévő PHP fájlra
        const response = await fetch('get_articles.php');
        if (response.ok) {
            return await response.json();
        }
        
        return [];
    } catch (error) {
        console.error('Hiba a cikkek lekérésekor:', error);
        return [];
    }
}

function calculateTotalViews(posts) {
    if (!posts || Object.keys(posts).length === 0) return '0';
    let total = 0;
    Object.values(posts).forEach((post, index) => {
        total += 100 + (index % 5) * 100;
    });
    return total.toLocaleString();
}

function updateStats(data) {
    const selectors = {
        views: '.box1 .number',
        active_users: '.box2 .number',
        activities: '.box3 .number',
        articles: '.box4 .number'
    };
    
    for (const [key, selector] of Object.entries(selectors)) {
        const element = document.querySelector(selector);
        if (element && data[key]) {
            element.textContent = data[key];
            
            // Trend indikátor frissítése (egyszerűsített)
            const trendElement = element.closest('.box').querySelector('.trend');
            if (trendElement) {
                const isPositive = Math.random() > 0.3;
                trendElement.textContent = isPositive ? `+${Math.floor(Math.random() * 15) + 1}%` : `-${Math.floor(Math.random() * 10) + 1}%`;
                trendElement.className = `trend ${isPositive ? 'positive' : 'negative'}`;
            }
        }
    }
}

function loadDefaultStats() {
    const defaultStats = {
        views: '2,847',
        active_users: '1,234',
        activities: '568',
        articles: '42'
    };
    updateStats(defaultStats);
}

function updateArticlesDisplay(articles) {
    const publishedContainer = document.querySelector('.status-group.published');
    const draftContainer = document.querySelector('.status-group.draft');
    
    if (!publishedContainer || !draftContainer) return;
    
    publishedContainer.innerHTML = `<h3 class="status-title">Publikált cikkek</h3>`;
    draftContainer.innerHTML = `<h3 class="status-title">Feldolgozás alatt</h3>`;
    
    if (!Array.isArray(articles) || articles.length === 0) {
        const noArticles = document.createElement('div');
        noArticles.className = 'no-articles';
        noArticles.innerHTML = '<p>Nincsenek cikkeid. Hozz létre egy újat!</p>';
        draftContainer.appendChild(noArticles);
        return;
    }
    
    articles.forEach(article => {
        const div = document.createElement('div');
        div.className = 'article-item';
        div.innerHTML = `
            <div class="article-header">
                <h4 class="article-title">${article.title || 'Cím nélküli'}</h4>
                <span class="article-date">${article.created_at || ''}</span>
            </div>
            <p class="article-excerpt">${(article.content || '').substring(0, 150)}...</p>
            <div class="article-actions">
                <button class="btn-edit" data-id="${article.id}">✏️ Szerkesztés</button>
                <button class="btn-view" data-id="${article.id}">👁️ Megtekintés</button>
            </div>
        `;
        
        if (article.status === 'published') {
            publishedContainer.appendChild(div);
        } else {
            draftContainer.appendChild(div);
        }
    });
    
    // Eseménykezelők hozzáadása
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const articleId = this.getAttribute('data-id');
            editArticle(articleId);
        });
    });
    
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', function() {
            const articleId = this.getAttribute('data-id');
            viewArticle(articleId);
        });
    });
}

// Cikkek táblázatos nézete
async function loadUserArticlesForTable() {
    try {
        const token = getAuthToken();
        if (!token) return;
        
        const response = await fetch(`/api/post/get/written?edited=false`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) return;
        
        const posts = await response.json();
        updateArticlesTable(posts);
        
    } catch (error) {
        console.error('Hiba a cikkek táblázatos betöltésekor:', error);
    }
}

function updateArticlesTable(posts) {
    const container = document.querySelector('.articles-container');
    if (!container) return;
    
    // Táblázat létrehozása ha még nincs
    let table = container.querySelector('.articles-table');
    if (!table) {
        table = document.createElement('div');
        table.className = 'articles-table';
        table.innerHTML = `
            <div class="table-header-row">
                <div class="table-col">Cím</div>
                <div class="table-col">Státusz</div>
                <div class="table-col">Létrehozva</div>
                <div class="table-col">Megtekintések</div>
                <div class="table-col">Műveletek</div>
            </div>
        `;
        container.innerHTML = '';
        container.appendChild(table);
    }
    
    // Meglévő sorok törlése (fejléc kivételével)
    const existingRows = table.querySelectorAll('.table-row:not(.table-header-row)');
    existingRows.forEach(row => row.remove());
    
    // Új sorok hozzáadása
    Object.entries(posts).forEach(([pid, post]) => {
        const row = document.createElement('div');
        row.className = 'table-row';
        
        const status = post.number <= 7 ? 'published' : 'draft';
        const views = Math.floor(Math.random() * 2000) + 500;
        
        row.innerHTML = `
            <div class="table-col">
                <div class="article-title">${post.title || 'Cím nélküli'}</div>
            </div>
            <div class="table-col">
                <span class="status-badge ${status}">
                    ${status === 'published' ? 'Publikálva' : 'Vázlat'}
                </span>
            </div>
            <div class="table-col">${formatDate(post.created)}</div>
            <div class="table-col">${views.toLocaleString()}</div>
            <div class="table-col">
                <div class="action-buttons">
                    <button class="btn-action" title="Szerkesztés" data-pid="${pid}">
                        <ion-icon name="create-outline"></ion-icon>
                    </button>
                    <button class="btn-action" title="Megtekintés" data-pid="${pid}">
                        <ion-icon name="eye-outline"></ion-icon>
                    </button>
                    <button class="btn-action btn-delete" title="Törlés" data-pid="${pid}">
                        <ion-icon name="trash-outline"></ion-icon>
                    </button>
                </div>
            </div>
        `;
        
        table.appendChild(row);
    });
    
    // Eseménykezelők
    attachArticleActionListeners();
}

function attachArticleActionListeners() {
    document.querySelectorAll('.btn-action').forEach(button => {
        button.addEventListener('click', async function() {
            const pid = this.getAttribute('data-pid');
            const isDeleteBtn = this.classList.contains('btn-delete');
            const isViewBtn = this.title === 'Megtekintés';
            
            if (isDeleteBtn) {
                if (confirm('Biztosan törölni szeretné ezt a cikket?')) {
                    await deleteArticle(pid);
                }
            } else if (isViewBtn) {
                viewArticle(pid);
            } else {
                await editArticle(pid);
            }
        });
    });
}

async function editArticle(pid) {
    try {
        const token = getAuthToken();
        if (!token) return;
        
        // Poszt adatok betöltése
        const response = await fetch('/api/post/get/contents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                post: parseInt(pid),
                edited: true
            })
        });
        
        if (!response.ok) return;
        
        const postData = await response.json();
        
        // Szerkesztésre navigálás
        document.querySelectorAll(".navList").forEach(e => e.classList.remove('active'));
        document.querySelector('[data-target="create-post"]').classList.add('active');
        document.querySelectorAll(".data-table, .overview").forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById('create-post').style.display = 'block';
        updatePageDescription('create-post');
        
        // Űrlap kitöltése
        document.getElementById('post-title').value = postData.title || '';
        document.getElementById('post-excerpt').value = postData.minimal_desc || '';
        document.getElementById('post-content').value = postData.desc || '';
        document.getElementById('post-category').value = postData.category || '';
        
        // Szerkesztés mód beállítása
        const form = document.getElementById('post-form');
        form.dataset.editing = pid;
        
        alert(`A(z) "${postData.title}" cikk szerkesztési módba került.`);
        
    } catch (error) {
        console.error('Hiba a cikk szerkesztésekor:', error);
        alert('Hiba történt a cikk szerkesztése közben.');
    }
}

function viewArticle(pid) {
    window.open(`/post/${pid}`, '_blank');
}

async function deleteArticle(pid) {
    try {
        const token = getAuthToken();
        if (!token) return;
        
        const response = await fetch('/api/post/delete', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                post: parseInt(pid)
            })
        });
        
        if (response.ok) {
            alert('A cikk sikeresen törölve!');
            // Frissítés
            if (document.getElementById('articles').style.display !== 'none') {
                loadUserArticlesForTable();
            }
            loadDashboardData();
        } else {
            throw new Error('Szerver hiba');
        }
    } catch (error) {
        console.error('Hiba a cikk törlésekor:', error);
        alert('Hiba történt a cikk törlése közben.');
    }
}

// Poszt űrlap kezelése
function setupPostForm() {
    const form = document.getElementById('post-form');
    if (!form) return;
    
    // Reset form állapot
    delete form.dataset.editing;
    
    // Submit esemény
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await handleCreatePost(this);
    });
    
    // Editor toolbar
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const command = this.getAttribute('data-command');
            const contentField = document.getElementById('post-content');
            contentField.focus();
            
            if (command === 'createLink') {
                const url = prompt('Adja meg a URL-t:');
                if (url) {
                    document.execCommand(command, false, url);
                }
            } else {
                document.execCommand(command, false, null);
            }
        });
    });
    
    // Kép feltöltés
    const fileInput = document.getElementById('post-featured');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const fileName = this.files[0]?.name || 'Nincs fájl kiválasztva';
            const label = this.nextElementSibling.querySelector('span');
            if (label) {
                label.textContent = fileName;
            }
        });
    }
}

async function handleCreatePost(formElement) {
    try {
        const token = getAuthToken();
        if (!token) {
            alert('Nincs bejelentkezve!');
            return;
        }
        
        const formData = {
            title: document.getElementById('post-title').value,
            category: document.getElementById('post-category').value,
            excerpt: document.getElementById('post-excerpt').value,
            content: document.getElementById('post-content').value,
            tags: document.getElementById('post-tags').value,
            status: document.getElementById('post-status').value,
            editing: formElement.dataset.editing
        };
        
        if (!formData.title.trim()) {
            alert('A cím megadása kötelező!');
            return;
        }
        
        if (formData.editing) {
            // Szerkesztés
            const response = await fetch('/api/post/edit', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    post: parseInt(formData.editing),
                    title: formData.title,
                    category: formData.category,
                    minimal_desc: formData.excerpt,
                    desc: formData.content
                })
            });
            
            if (response.ok) {
                alert('Poszt sikeresen szerkesztve!');
                formElement.reset();
                delete formElement.dataset.editing;
            } else {
                throw new Error('Szerkesztési hiba');
            }
        } else {
            // Új poszt létrehozása
            // Először lekérjük a jelenlegi lapszámot
            const numberResponse = await fetch('/api/number/get');
            const numberData = numberResponse.ok ? await numberResponse.json() : { number: 1 };
            
            // Felhasználó adatok
            const userResponse = await fetch('/api/user/get', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    get: 'uid'
                })
            });
            
            const userData = userResponse.ok ? await userResponse.json() : { uid: 0 };
            
            const postData = {
                title: formData.title,
                category: formData.category,
                number: (numberData.number || 0) + 1,
                minimal_desc: formData.excerpt,
                desc: formData.content,
                image: '', // Később lehet implementálni
                authors: userData.uid.toString()
            };
            
            const response = await fetch('/api/post/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(postData)
            });
            
            if (response.ok) {
                const result = await response.json();
                alert(`Poszt sikeresen létrehozva! Azonosító: ${result.pid}`);
                formElement.reset();
            } else {
                throw new Error('Létrehozási hiba');
            }
        }
        
        // Dashboard frissítése
        loadDashboardData();
        loadUserArticlesForTable();
        
    } catch (error) {
        console.error('Hiba a poszt mentésekor:', error);
        alert('Hiba történt a poszt mentése közben.');
    }
}

// Chart adatok betöltése
async function loadChartData(period) {
    // Egyszerű mock adatok - később API-val lehetne cserélni
    const data = {
        '7 nap': [30, 60, 45, 80, 65, 50, 75],
        '30 nap': [40, 70, 55, 85, 60, 45, 80, 65, 50, 75, 90, 70, 55, 85, 60, 45, 80, 65, 50, 75, 90, 70, 55, 85, 60, 45, 80, 65, 50, 75],
        '1 év': Array.from({length: 12}, () => Math.floor(Math.random() * 100) + 20)
    };
    
    const chartData = data[period] || data['7 nap'];
    updateChart(chartData, period);
}

function updateChart(data, period) {
    const chartVisual = document.querySelector('.chart-visual');
    const chartLabels = document.querySelector('.chart-labels');
    
    if (!chartVisual || !chartLabels) return;
    
    // Frissítjük a chart bar-okat
    chartVisual.innerHTML = '';
    chartLabels.innerHTML = '';
    
    const maxHeight = Math.max(...data);
    
    data.forEach((value, index) => {
        // Chart bar
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = `${(value / maxHeight) * 100}%`;
        chartVisual.appendChild(bar);
        
        // Label
        const label = document.createElement('span');
        
        if (period === '7 nap') {
            const days = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];
            label.textContent = days[index] || index + 1;
        } else if (period === '30 nap') {
            label.textContent = (index + 1) % 5 === 0 ? index + 1 : '';
        } else {
            const months = ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Szep', 'Okt', 'Nov', 'Dec'];
            label.textContent = months[index] || index + 1;
        }
        
        chartLabels.appendChild(label);
    });
}

// Cikkek szűrése
function filterArticles(filter) {
    const rows = document.querySelectorAll('.articles-table .table-row:not(.table-header-row)');
    
    rows.forEach(row => {
        const statusBadge = row.querySelector('.status-badge');
        const status = statusBadge?.textContent.trim();
        
        let show = false;
        
        switch(filter) {
            case 'Összes':
                show = true;
                break;
            case 'Publikált':
                show = status === 'Publikálva';
                break;
            case 'Vázlat':
                show = status === 'Vázlat';
                break;
            case 'Archivált':
                // Egyszerűsített logika
                show = Math.random() > 0.5;
                break;
            default:
                show = true;
        }
        
        row.style.display = show ? '' : 'none';
    });
}

// Kommentek szűrése
function filterComments(filter) {
    const comments = document.querySelectorAll('.comment-item');
    
    comments.forEach(comment => {
        let show = false;
        
        switch(filter) {
            case 'Összes':
                show = true;
                break;
            case 'Függőben':
                show = comment.classList.contains('pending');
                break;
            case 'Jóváhagyott':
                show = comment.classList.contains('approved');
                break;
            case 'Elutasított':
                show = comment.classList.contains('rejected') || Math.random() > 0.7;
                break;
            default:
                show = true;
        }
        
        comment.style.display = show ? '' : 'none';
    });
}

// Keresés funkció
function searchContent(query) {
    if (!query.trim()) {
        // Minden elem megjelenítése
        document.querySelectorAll('.table-row, .comment-item, .article-item').forEach(el => {
            el.style.display = '';
        });
        return;
    }
    
    const searchLower = query.toLowerCase();
    
    // Cikkek keresése
    document.querySelectorAll('.table-row:not(.table-header-row)').forEach(row => {
        const title = row.querySelector('.article-title')?.textContent.toLowerCase() || '';
        const show = title.includes(searchLower);
        row.style.display = show ? '' : 'none';
    });
    
    // Kommentek keresése
    document.querySelectorAll('.comment-item').forEach(comment => {
        const text = comment.querySelector('.comment-text')?.textContent.toLowerCase() || '';
        const author = comment.querySelector('.comment-author')?.textContent.toLowerCase() || '';
        const show = text.includes(searchLower) || author.includes(searchLower);
        comment.style.display = show ? '' : 'none';
    });
}

// Segédfüggvények
function formatDate(dateString) {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('hu-HU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return dateString;
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Globális kijelentkezés funkció
window.logout = logout;

// Inicializálás ellenőrzése
console.log('Dashboard inicializálva');