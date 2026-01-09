
fetch('get_stats.php')
  .then(res => res.json())
  .then(data => {
    document.querySelector('.box1 .number').textContent = data.views;
    document.querySelector('.box2 .number').textContent = data.active_users;
    document.querySelector('.box3 .number').textContent = data.activities;
    document.querySelector('.box4 .number').textContent = data.articles;
  });

fetch('get_articles.php')
  .then(res => res.json())
  .then(data => {
    const publishedContainer = document.querySelector('.status-group.published');
    const draftContainer = document.querySelector('.status-group.draft');

    publishedContainer.innerHTML = `<h3 class="status-title">Publikált cikkek</h3>`;
    draftContainer.innerHTML = `<h3 class="status-title">Feldolgozás alatt</h3>`;

    data.forEach(article => {
      const div = document.createElement('div');
      div.classList.add('article-item');
      div.innerHTML = `
        <div class="article-header">
          <h4 class="article-title">${article.title}</h4>
          <span class="article-date">${article.created_at}</span>
        </div>
        <p class="article-excerpt">${article.content.substring(0,150)}...</p>
        <div class="article-actions">
          <button class="btn-edit">✏️ Szerkesztés</button>
          <button class="btn-view">👁️ Megtekintés</button>
        </div>
      `;
      if (article.status === 'published') {
        publishedContainer.appendChild(div);
      } else {
        draftContainer.appendChild(div);
      }
    });
  });

async function checkUserPermissions() {
    console.log('===== JOGOSULTSÁGOK ELLENŐRZÉSE =====');
    
    const token = await getAuthToken();
    if (!token) {
        console.error('Nincs token a jogosultságok ellenőrzéséhez');
        return false;
    }
    
    try {
        const response = await fetch('/api/user/get', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                get: 'roles'
            })
        });
        
        console.log('Jogosultság API válasz státusz:', response.status);
        
        if (!response.ok) {
            console.error('Hiba a jogosultságok lekérése során:', response.status);
            return false;
        }
        
        const data = await response.json();
        console.log('API válasz teljes:', data);
        
        let rolesArray = [];
        
        // 1. Ha a roles már tömb formátumban van
        if (Array.isArray(data.roles)) {
            rolesArray = data.roles;
        } 
        // 2. Ha a roles stringként van (JSON string)
        else if (typeof data.roles === 'string') {
            try {
                // Először próbáljuk meg parse-olni JSON-ként
                const parsed = JSON.parse(data.roles);
                
                // Ha tömb, akkor jó
                if (Array.isArray(parsed)) {
                    rolesArray = parsed;
                } 
                // Ha nem tömb, akkor vesszővel elválasztott string
                else {
                    console.log('A parse-olt érték nem tömb, vesszővel elválasztott stringként kezeljük');
                    rolesArray = data.roles.split(',').map(role => role.trim());
                }
            } catch (e) {
                console.log('JSON parse hiba, vesszővel elválasztott stringként kezeljük:', e);
                rolesArray = data.roles.split(',').map(role => role.trim());
            }
        }
        // 3. Ha a roles nem szerepel, de van user 
        else if (data.user && data.user.roles) {
            rolesArray = Array.isArray(data.user.roles) ? data.user.roles : data.user.roles.split(',');
        }
        
        console.log('Feldolgozott rangok:', rolesArray);
        
        if (rolesArray.length === 0) {
            console.log('Nincs rang definiálva a felhasználónak');
            return false;
        }
        
        // Ellenőrizzük, hogy van-e valamelyik szükséges jogosultság
        const requiredRoles = ['writer', 'director', 'lector', '*'];
        const hasPermission = rolesArray.some(role => requiredRoles.includes(role));
        
        console.log('Szükséges rangok:', requiredRoles);
        console.log('Felhasználó rangjai:', rolesArray);
        console.log('Van jogosultság poszt létrehozásához?', hasPermission);
        
        return hasPermission;
        
    } catch (error) {
        console.error('Hiba a jogosultságok ellenőrzése során:', error);
        return false;
    }
}


  async function testNumberAPI() {
    const token = localStorage.getItem('secret');
    
    console.log('Token:', token ? token.substring(0, 10) + '...' : 'Nincs');
    
    const response = await fetch('/api/settings/get', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            setting: 'number'
        })
    });
    
    console.log('Status:', response.status);
    console.log('Headers:');
    for (const [key, value] of response.headers.entries()) {
        console.log(`  ${key}: ${value}`);
    }
    
    const text = await response.text();
    console.log('Raw response:', text);
    console.log('Response length:', text.length);
    console.log('First 200 chars:', text.substring(0, 200));
    
    // Próbáljuk meg minden lehetséges módon
    try {
        const json = JSON.parse(text);
        console.log('Parsed as JSON:', json);
    } catch(e) {
        console.log('Not JSON');
    }
    
    // Lehet HTML vagy más?
    if (text.includes('<html') || text.includes('<!DOCTYPE')) {
        console.log('Looks like HTML');
    }
    
    // Lehet csak egy szám?
    const trimmed = text.trim();
    if (!isNaN(parseInt(trimmed))) {
        console.log('Looks like just a number:', parseInt(trimmed));
    }
}

async function verifyToken(token) {
    try {
        const response = await fetch('/api/user/get', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                get: 'email'
            })
        });
        
        console.log('Token ellenőrzés státusz:', response.status);
        return response.ok;
    } catch (error) {
        console.error('Token ellenőrzés hiba:', error);
        return false;
    }
}

async function getValidAuthToken() {
    console.log('=== ÉRVÉNYES TOKEN KERESÉS ===');
    
    // 1. Próbáljuk meg az URL paramétert
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    
    if (urlToken) {
        console.log('Token található URL-ben');
        localStorage.setItem('secret', urlToken);
        
        // Távolítsuk el az URL-ből
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        return urlToken;
    }
    
    // 2. Ellenőrizzük a localStorage-t
    const localStorageToken = localStorage.getItem('secret');
    if (localStorageToken) {
        console.log('Token található localStorage-ban, ellenőrzöm...');
        const isValid = await verifyToken(localStorageToken);
        
        if (isValid) {
            console.log('Token érvényes');
            return localStorageToken;
        } else {
            console.log('Token érvénytelen, eltávolítom');
            localStorage.removeItem('secret');
        }
    }
    
    // 3. Ellenőrizzük a sessionStorage-t
    const sessionStorageToken = sessionStorage.getItem('secret');
    if (sessionStorageToken) {
        console.log('Token található sessionStorage-ban, ellenőrzöm...');
        const isValid = await verifyToken(sessionStorageToken);
        
        if (isValid) {
            console.log('Token érvényes');
            return sessionStorageToken;
        } else {
            console.log('Token érvénytelen, eltávolítom');
            sessionStorage.removeItem('secret');
        }
    }
    
    console.log('Nincs érvényes token');
    return null;
}

async function getAuthToken() {
    return await getValidAuthToken();
}


// Menu toggle functionality
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

document.addEventListener('click', function(event) {
    const isClickInsideSidebar = sidebar.contains(event.target);
    const isClickOnMenuBtn = mobileMenuBtn.contains(event.target);
    
    if (!isClickInsideSidebar && !isClickOnMenuBtn && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
    }
});

// Navigation functionality (EZ MÉG RÁÉR)
document.querySelectorAll(".navList").forEach(function(element) {
    element.addEventListener('click', function() {
        // Close sidebar on mobile after selection
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
        }
      
        document.querySelectorAll(".navList").forEach(function(e) {
            e.classList.remove('active');
        });

        this.classList.add('active');

        var index = Array.from(this.parentNode.children).indexOf(this);

        document.querySelectorAll(".data-table").forEach(function(table) {
            table.style.display = 'none';
        });

        var tables = document.querySelectorAll(".data-table");
        if (tables.length > index) {
            tables[index].style.display = 'block';
        }
    });
});

window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        sidebar.classList.remove('active');
    }
});



document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();
    setupEventListeners();
    initializeCharts();  
      initializeBlockEditor();
      setupPreviewButton();
    setupTitleBlockButton();
    setupBlockChangeListeners();
    
    // Alapértelmezett előnézet
    updateTitlePreview(null);


    updatePageDescription();
    initializeAuthorSelector();
    initializeAuthorSelector();
    updatePageDescription();

setTimeout(() => {
        if (typeof initializeAuthorSelector === 'function') {
            initializeAuthorSelector();
        }
    }, 1000);

    
    
        updateAutoPreview('(Még nincs tartalom)', '(Még nincs tartalom)');
    // Ellenőrizzük az URL-t token miatt
    if (!checkUrlForToken()) {
        loadUserProfile();
    } else {
        // Ha volt token az URL-ben, betöltjük a profilt
        setTimeout(() => {
            loadUserProfile();
        }, 500);
    }
setInterval(() => {
        validateFirstBlock();
    }, 2000);
});

function checkUrlForToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    
    if (urlToken) {
        console.log('Tokent megtaláltam, mentem localStorage-ba');
        localStorage.setItem('secret', urlToken);
        
        // Távolítsuk el az URL-ből
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        return true;
    }
    
    return false;
}

function loadDashboardData() {
    fetch('get_stats.php')
      .then(res => res.json())
      .then(data => {
        document.querySelector('.box1 .number').textContent = data.views;
        document.querySelector('.box2 .number').textContent = data.active_users;
        document.querySelector('.box3 .number').textContent = data.activities;
        document.querySelector('.box4 .number').textContent = data.articles;
      })
      .catch(error => {
        console.error('Hiba a statisztikák betöltésekor:', error);
        document.querySelector('.box1 .number').textContent = '2,847';
        document.querySelector('.box2 .number').textContent = '1,234';
        document.querySelector('.box3 .number').textContent = '568';
        document.querySelector('.box4 .number').textContent = '42';
      });
    
    // Profil adatok betöltése
    console.log('Dashboard betöltve - profil adatok betöltése...');
    
    // Profil adatok betöltése
    console.log('Dashboard betöltve - profil adatok betöltése...');
    if (typeof loadUserProfile === 'function') {
        setTimeout(() => {
            console.log('Profil betöltés indítása...');
            loadUserProfile();
            
            // Lektorálás menüpont betöltése (csak jogosultság esetén)
            setTimeout(() => {
                loadReviewsNavItem();
            }, 500);
        }, 1000);
    } else {
        console.error('loadUserProfile függvény nem található!');
    }
}

async function loadUserProfile() {
    console.log('===== FELHASZNÁLÓI PROFIL BETÖLTÉSE =====');
    
    // Token lekérése
    const token = await getAuthToken();
    console.log('Token állapot:', token ? 'Megvan' : 'Nincs');
    
    if (!token) {
        console.log('Nincs token - felhasználó nincs bejelentkezve vagy token hiányzik');
        showGuestProfile();
        // Nincs bejelentkezve, ne jelenjen meg a lektorálás menü
        hideReviewsMenuItem();
        return;
    }
    
    console.log('Token első 10 karaktere:', token.substring(0, 10) + '...');
    
    try {
        console.log('API hívás indítása...');
        const userData = await fetchUserProfile(token);
        
        if (userData && Object.keys(userData).length > 0) {
            console.log('Sikeresen megérkeztek a felhasználói adatok:', userData);
            updateProfileDisplay(userData);
            updateDropdownContent(userData);
            
            // Ellenőrizzük a lektorálási jogosultságot
            setTimeout(() => {
                loadReviewsNavItem();
            }, 500);
        } else {
            console.log('API válasz üres vagy hibás');
            showGuestProfile();
            hideReviewsMenuItem();
        }
    } catch (error) {
        console.error('Hiba történt a profil betöltése során:', error);
        showGuestProfile();
        hideReviewsMenuItem();
    }
}

function hideReviewsMenuItem() {
    console.log('Lektorálás menüpont elrejtése...');
    const navPlaceholder = document.getElementById('reviews-nav-placeholder');
    if (navPlaceholder) {
        navPlaceholder.innerHTML = '';
    }
    
    // Elrejtjük a lektorálás oldalt is!!! (többiek is teszteljekS!!)
    const reviewsSection = document.getElementById('reviews');
    if (reviewsSection) {
        reviewsSection.style.display = 'none';
    }
}

function setupNavigation() {
    document.querySelectorAll(".navList").forEach(function(element) {
        element.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Aktív állapot
            document.querySelectorAll(".navList").forEach(function(e) {
                e.classList.remove('active');
            });
            this.classList.add('active');
            
            // Oldalsáv bezárása mobilon (ez fail a css miatt)
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.classList.remove('active');
                }
            }
            
            const targetId = this.getAttribute('data-target');
            
            // Összes oldal elrejtése
            document.querySelectorAll(".data-table, .overview").forEach(function(section) {
                section.style.display = 'none';
            });
            
            // Céloldal megjelenítése
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.style.display = 'block';
                updatePageDescription(targetId);
                
                // Speciális oldalak betöltése
                if (targetId === 'articles') {
                    setTimeout(() => {
                        loadUserArticles();
                    }, 300);
                } else if (targetId === 'reviews') {
                    setTimeout(() => {
                        loadPendingReviews();
                    }, 300);
                }
            }
        });
    });
}

function setupEventListeners() {
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

    document.addEventListener('click', function(event) {
        const isClickInsideSidebar = sidebar.contains(event.target);
        const isClickOnMenuBtn = mobileMenuBtn.contains(event.target);
        
        if (!isClickInsideSidebar && !isClickOnMenuBtn && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });
  document.querySelector('[data-target="articles"]')?.addEventListener('click', function() {
        setTimeout(() => {
            loadUserArticles();
        }, 300);
    });

     document.querySelector('[data-target="reviews"]')?.addEventListener('click', function() {
        
    setTimeout(() => {
        setupNavigation();
    }, 500);
    });
    document.addEventListener('click', function(e) {
        if (e.target && (e.target.id === 'refresh-reviews-btn' || 
                         e.target.closest('#refresh-reviews-btn'))) {
            e.preventDefault();
            loadPendingReviews();
        }
    });
      document.getElementById('refresh-reviews-btn')?.addEventListener('click', function() {
        loadPendingReviews();
    });

     document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    document.querySelectorAll(".navList").forEach(function(element) {
        element.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
            }
          
            document.querySelectorAll(".navList").forEach(function(e) {
                e.classList.remove('active');
            });

            this.classList.add('active');

            const targetId = this.getAttribute('data-target');
            
            document.querySelectorAll(".data-table, .overview").forEach(function(section) {
                section.style.display = 'none';
            });

            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.style.display = 'block';
                updatePageDescription(targetId);
            }
        });
    });

    document.querySelectorAll('.btn-chart').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.btn-chart').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // New Article gomb (EZT MÉG ÁTGONDOLOM)
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
    });

document.getElementById('post-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('===== FORM SUBMIT MEGHÍVVA =====');
    await prepareBlockPostData();
    
    // Poszt létrehozás indítása
    await createPost();
});

    document.querySelectorAll('.toolbar-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const command = this.getAttribute('data-command');
            document.getElementById('post-content').focus();
            
            if (command === 'createLink') {
                const url = prompt('Add meg a URL-t:');
                if (url) {
                    document.execCommand(command, false, url);
                }
            } else {
                document.execCommand(command, false, null);
            }
        });
    });
}

/**
 * PosztCreation - BLOKKOS (nem tudom h most mi a baja)
 */
async function createPost() {
    console.log('=== POSZT LÉTREHOZÁS ELINDUL ===');
    
    // ========== DEBUGoláshoz... ==========
    console.log('1. Validálás kezdete...');
    const validation = validateFirstBlock();
    console.log('Validálás eredménye:', validation);
    
    if (!validation.isValid) {
//        alert(`Nem lehet elküldeni: ${validation.message}\n\nKérlek, először adj hozzá egy címsor blokkot!`);
        return;
    }
    
    console.log('2. Jogosultságod ellenőrzése...');
    const hasPermission = await checkUserPermissions();
    console.log('Jogosultság:', hasPermission);
    
    if (!hasPermission) {
        alert('Nincs jogosultságod posztot létrehozni!\n\nSzükséges jogosultságok: writer, director, lector');
        return;
    }
    
    console.log('3. Token lekérése...');
    const token = await getAuthToken();
    console.log('Token megtalálva:', !!token);
    
    if (!token) {
        alert('Nem vagy bejelentkezve! Kérjük, jelentkezz be a poszt létrehozásához.');
        const currentPath = encodeURIComponent(window.location.pathname);
        window.location.href = `/api/login/google?redirect=${currentPath}`;
        return;
    }
    
    console.log('4. Blokkok feldolgozása...');
    const processedData = await prepareBlockPostData();
    console.log('Feldolgozott adatok:', processedData);
    
    if (!processedData || !processedData.blocks || processedData.blocks.length === 0) {
        alert('Hiba történt a blokkok feldolgozása során!');
        return;
    }
    
    console.log('5. Következő lapszám lekérése...');
    const nextNumber = await getNextPostNumber();
    console.log('Következő szám:', nextNumber);
    
    if (!nextNumber || nextNumber < 1) {
        alert('Hiba történt a következő szám meghatározása során!');
        return;
    }
    
    console.log('6. Kategória ellenőrzése (tökmindegy h kategória vagy rovat...)...');
    const categoriesInput = document.getElementById('post-categories');
    console.log('Kategória input elem:', categoriesInput);
    console.log('Kategória input értéke:', categoriesInput?.value);
    
    const category = categoriesInput ? categoriesInput.value.trim() : '';
    console.log('Kategória érték:', category);
    
    if (!category) {
        
        document.getElementById('select-category-btn')?.click();
        return;
    }
    
    
    // 7.
    const postData = {
        title: processedData.title,
        category: category,
        number: nextNumber,
        minimal_desc: processedData.excerpt,
        desc: processedData.html,
        image: '/default-post-image.png',
        authors: processedData.authors || '',
        blocks_json: JSON.stringify(processedData.blocks),
        content_type: 'blocks'
    };
    
    console.log('8. API küldendő adatok:', postData);
    
    try {
        console.log('9. API hívás indítása /api/post/create...');
        const response = await fetch('/api/post/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(postData)
        });
        
        console.log('10. API válasz státusz:', response.status);
        console.log('API válasz headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
    const errorText = await response.text();
    console.error('API hiba részletei:', errorText);
    
    let errorTitle = 'Hiba történt';
    let errorMessage = 'Ismeretlen hiba';
    let errorDetails = [];
    let errorIcon = 'alert-circle-outline';
    
    if (response.status === 401) {
        errorTitle = 'Bejelentkezési hiba';
        errorMessage = 'Nem vagy bejelentkezve, vagy lejárt a munkamenet!';
        errorIcon = 'log-out-outline';
        errorDetails = [
            { label: 'Státusz kód', value: '401 - Unauthorized' },
            { label: 'Ajánlás', value: 'Jelentkezz be újra' }
        ];
    } else if (response.status === 403) {
        errorTitle = 'Jogosultsági hiba';
        errorMessage = 'Nincs jogosultságod posztot létrehozni!';
        errorIcon = 'lock-closed-outline';
        errorDetails = [
            { label: 'Státusz kód', value: '403 - Forbidden' },
            { label: 'Szükséges jogosultságok', value: 'writer, director, lector' }
        ];
    } else if (response.status === 400) {
        errorTitle = 'Hiányzó adatok';
        errorMessage = 'Hiányoznak vagy hibásak a megadott adatok!';
        errorIcon = 'document-text-outline';
        
        try {
            const errorJson = JSON.parse(errorText);
            console.error('400 hiba részletei:', errorJson);
            
            // Feldolgozzuk a hibaüzeneteket
            if (errorJson.errors) {
                Object.entries(errorJson.errors).forEach(([field, message]) => {
                    errorDetails.push({ label: field, value: message });
                });
            } else if (errorJson.message) {
                errorDetails.push({ label: 'Hibaüzenet', value: errorJson.message });
            }
        } catch (e) {
            console.error('Nem sikerült parse-olni a hibaüzenetet:', e);
            errorDetails.push({ label: 'Hibaüzenet', value: errorText.substring(0, 100) + (errorText.length > 100 ? '...' : '') });
        }
        
        if (errorDetails.length === 0) {
            errorDetails.push({ label: 'Hiba', value: 'Hiányzó vagy érvénytelen mezők' });
        }
    } else if (response.status === 404) {
        errorTitle = 'Nem található';
        errorMessage = 'A kért erőforrás nem található!';
        errorIcon = 'search-outline';
        errorDetails = [
            { label: 'Státusz kód', value: '404 - Not Found' },
            { label: 'Végpont', value: response.url.split('/').pop() || 'Ismeretlen' }
        ];
    } else if (response.status >= 500) {
        errorTitle = 'Szerverhiba';
        errorMessage = 'Hiba történt a szerver oldalon!';
        errorIcon = 'server-outline';
        errorDetails = [
            { label: 'Státusz kód', value: `${response.status} - Server Error` },
            { label: 'Kérjük', value: 'Próbáld újra később' }
        ];
    } else {
        errorMessage = `${response.status} - ${response.statusText || 'Ismeretlen hiba'}`;
    }
    
    // Hibakezelő modal megjelenítése
    await showConfirmModal({
        title: errorTitle,
        message: errorMessage,
        subMessage: response.status === 401 ? 'Kattints a gombra az újra bejelentkezéshez.' : '',
        icon: errorIcon,
        confirmText: response.status === 401 ? 'Bejelentkezés' : 'Rendben',
        cancelText: response.status !== 401 ? 'Mégse' : undefined,
        details: errorDetails,
        onConfirm: function() {
            if (response.status === 401) {
                // Bejelentkezési redirect
                const currentPath = encodeURIComponent(window.location.pathname);
                window.location.href = `/api/login/google?redirect=${currentPath}`;
            }
            // Egyéb esetekben csak bezárjuk a modalt
        },
        onCancel: function() {
            // Modal bezárása (mégse gomb)
        }
    });
    
    return;
}
        
        // 11. Sikeres válasz feldolgozása
        const result = await response.json();
        console.log('12. Sikeres poszt létrehozás:', result);
        
        if (result.pid) {
            // Következő szám frissítése
            try {
                await updateNextNumber(nextNumber, token);
            } catch (updateError) {
                console.warn('A szám frissítése nem sikerült:', updateError);
            }
            
            // Sikeres üzenet
            showSuccessMessage(result.pid);
            clearPostForm();
            
            // Vissza a listához
            setTimeout(() => {
                document.querySelector('[data-target="articles"]').click();
                loadUserArticles();
            }, 2000);
        }
        
    } catch (error) {
        console.error('13. Hiba a poszt létrehozása során:', error);
        alert('Hálózati hiba történt! Kérjük, próbáld újra.');
    }
}


/**
 * Az első blokk validálása (címként)
 */
function validateFirstBlock() {
    const blocks = document.querySelectorAll('.content-block');
    
    // Nincsenek blokkok
    if (blocks.length === 0) {
        updateTitlePreview(null);
        return {
            isValid: false,
            message: 'Legalább egy blokkot adj hozzá!'
        };
    }
    
    const firstBlock = blocks[0];
    const firstBlockType = firstBlock.getAttribute('data-block-type');
    
    // Az első blokk nem címsor
    if (firstBlockType !== 'heading') {
        updateTitlePreview(null, 'Hibás első blokk');
        return {
            isValid: false,
            message: 'Az első blokknak "Címsor" típusúnak kell lennie!'
        };
    }
    
    // Cím tartalom ellenőrzése
    const titleInput = firstBlock.querySelector('.block-heading-input');
    const title = titleInput ? titleInput.value.trim() : '';
    
    if (!title) {
        updateTitlePreview('', 'Hiányzó cím');
        return {
            isValid: false,
            message: 'Kérjük, adj meg egy címet az első blokkban!'
        };
    }
    
    if (title.length < 3) {
        updateTitlePreview(title, 'Túl rövid cím');
        return {
            isValid: false,
            message: 'A cím túl rövid! Minimum 3 karakter.'
        };
    }
    
    // Sikeres validálás
    updateTitlePreview(title, 'Első blokkból');
    return {
        isValid: true,
        title: title,
        message: 'Cím rendben'
    };
}

/**
 * Cím előnézet frissítése
 */
function updateTitlePreview(title, source = 'első blokkból') {
    const titlePreview = document.getElementById('title-preview');
    const titlePlaceholder = document.getElementById('title-placeholder');
    const actualTitle = document.getElementById('actual-title');
    const sourceBadge = document.getElementById('title-source-badge');
    
    if (!title) {
        // Nincs cím
        titlePlaceholder.style.display = 'block';
        actualTitle.style.display = 'none';
        titlePreview.style.borderColor = '#f44336';
        titlePreview.style.backgroundColor = '#ffebee';
        if (sourceBadge) sourceBadge.textContent = '(nincs cím)';
        
    } else {
        // Van cím
        titlePlaceholder.style.display = 'none';
        actualTitle.style.display = 'block';
        actualTitle.textContent = title;
        titlePreview.style.borderColor = '#4caf50';
        titlePreview.style.backgroundColor = '#e8f5e9';
        if (sourceBadge) sourceBadge.textContent = `(${source})`;
    }
}


/**
 * Címsor blokk hozzáadása gomb
 */
function setupTitleBlockButton() {
    const titleBtn = document.getElementById('add-title-block-btn');
    const blockContainer = document.getElementById('block-editor-container');
    
    if (!titleBtn || !blockContainer) return;
    
    titleBtn.addEventListener('click', async function() {
        // Ellenőrizzük, van-e már első blokk
        const existingBlocks = blockContainer.querySelectorAll('.content-block');
        
        if (existingBlocks.length === 0) {
            // Nincs blokk - címsort adunk hozzá elsőnek
            addNewBlock('heading', true);
        } else {
            const firstBlock = existingBlocks[0];
            const firstBlockType = firstBlock.getAttribute('data-block-type');
            
            if (firstBlockType !== 'heading') {
                // Az első blokk nem címsor - megerősítés kérése
                const result = await showConfirmModal({
                    title: 'Címsor cseréje',
                    message: 'Az első blokk már nem "Címsor" típusú.',
                    subMessage: 'Lecseréljem címsorra?',
                    icon: 'swap-horizontal-outline',
                    confirmText: 'Igen, cseréld',
                    cancelText: 'Mégse',
                    details: [
                        { label: 'Jelenlegi blokk', value: getBlockTypeName(firstBlockType) }
                    ]
                });
                
                if (result) {
                    firstBlock.remove();
                    addNewBlock('heading', true);
                }
            } else {
                // Már van címsor - új címsor a helyére?
                showSuccessNotification('Már van címsor blokk az első helyen!', 'info');
            }
        }
    });
}

/**
 * Blokk változás figyelése - MÓDOSÍTOTT
 */
function setupBlockChangeListeners() {
    const blockContainer = document.getElementById('block-editor-container');
    
    if (!blockContainer) return;
    
    // Event delegation
    blockContainer.addEventListener('input', async function(e) {
        // Ha címsor blokk változik (első helyen)
        if (e.target.classList.contains('block-heading-input')) {
            const block = e.target.closest('.content-block');
            if (block && isFirstBlock(block)) {
                // Azonnal frissítjük az előnézetet
                const title = e.target.value.trim();
                updateTitlePreview(title);
                
                // Validálás
                const validation = validateFirstBlock();
                console.log('Cím változás:', validation);
            }
        }
        
        // Bármely blokk változása után feldolgozás
        setTimeout(async () => {
            await prepareBlockPostData();
        }, 300);
    });
    
    // Blokk törlés figyelése
    blockContainer.addEventListener('click', function(e) {
        if (e.target.closest('[data-action="delete"]')) {
            setTimeout(async () => {
                // Ellenőrizzük az első blokkot törlés után
                validateFirstBlock();
                await prepareBlockPostData();
            }, 100);
        }
    });
    
    // Drag and drop után
    blockContainer.addEventListener('drop', function() {
        setTimeout(async () => {
            // Újraellenőrizzük az első blokkot
            validateFirstBlock();
            await prepareBlockPostData();
        }, 100);
    });
}

/**
 * Ellenőrzi, hogy a blokk az első-e
 */
function isFirstBlock(block) {
    const blocks = document.querySelectorAll('.content-block');
    return blocks.length > 0 && blocks[0] === block;
}

/**
 * Add new block - MÓDOSÍTOTT: speciális kezelés első blokkhoz
 */
function addNewBlock(blockType, makeFirst = false) {
    const container = document.getElementById('block-editor-container');
    const noBlocksMsg = document.getElementById('no-blocks-message');
    
    // Elrejtjük a "nincs blokk" üzenetet
    if (noBlocksMsg) noBlocksMsg.style.display = 'none';
    
    // Blokk HTML
    let blockHTML = '';
    let blockContent = '';
    
    // ⭐⭐⭐ KÜLÖN KEEZELÉS CÍMSOR BLOKKHOZ ⭐⭐⭐
    if (blockType === 'heading') {
        blockContent = `
            <input type="text" class="block-heading-input" 
                   placeholder="${makeFirst ? 'Írd ide a poszt címét...' : 'Írd be a címet...'}" 
                   value="${makeFirst ? 'Új poszt címe' : ''}"
                   style="font-size: ${makeFirst ? '24px' : '20px'}; font-weight: ${makeFirst ? 'bold' : '600'};">
            <div class="heading-options" style="margin-top: 10px; display: flex; gap: 10px; align-items: center;">
                <select class="heading-level" style="padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="h1" ${makeFirst ? 'selected' : ''}>H1 - Főcím</option>
                    <option value="h2" ${!makeFirst ? 'selected' : ''}>H2 - Alcím</option>
                    <option value="h3">H3 - Harmadik szint</option>
                </select>
                <span style="font-size: 12px; color: #666;">
                    ${makeFirst ? '(Ez lesz a poszt címe)' : '(Alcím)'}
                </span>
            </div>
        `;
    } else {
        // Egyéb blokkok normál kezelése
        // ... (a korábbi addNewBlock logika) ...
    }
    
    // Blokk HTML összeállítása
    blockHTML = `
        <div class="content-block ${makeFirst ? 'first-block title-block' : ''}" 
             data-block-type="${blockType}" 
             data-block-id="${generateBlockId()}" 
             draggable="true">
            <div class="block-header ${makeFirst ? 'first-block-header' : ''}">
                <div class="block-handle">
                    <ion-icon name="menu-outline"></ion-icon>
                </div>
                <div class="block-type">
                    ${makeFirst ? '🌟 ' : ''}${getBlockTypeName(blockType)}
                    ${makeFirst ? ' (CÍM)' : ''}
                </div>
                <div class="block-actions">
                    ${makeFirst ? `<span class="first-block-badge" style="
                        background: #ff9800;
                        color: white;
                        padding: 2px 8px;
                        border-radius: 12px;
                        font-size: 11px;
                        margin-right: 8px;
                    ">CÍM</span>` : ''}
                    <button class="block-action-btn" data-action="settings">
                        <ion-icon name="settings-outline"></ion-icon>
                    </button>
                    <button class="block-action-btn" data-action="duplicate">
                        <ion-icon name="copy-outline"></ion-icon>
                    </button>
                    ${!makeFirst ? `
                    <button class="block-action-btn" data-action="delete">
                        <ion-icon name="trash-outline"></ion-icon>
                    </button>
                    ` : `
                    <button class="block-action-btn" data-action="delete" title="Cím törlése nem javasolt" style="opacity: 0.5;">
                        <ion-icon name="trash-outline"></ion-icon>
                    </button>
                    `}
                </div>
            </div>
            <div class="block-content">
                ${blockContent}
            </div>
        </div>
    `;
    
    // ⭐⭐⭐ HOZZÁADÁS ⭐⭐⭐
    if (makeFirst || container.children.length === 0) {
        // Első helyre
        container.insertAdjacentHTML('afterbegin', blockHTML);
    } else {
        // Utolsó helyre
        container.insertAdjacentHTML('beforeend', blockHTML);
    }
    
    // Eseménykezelők
    const newBlock = container.querySelector(`[data-block-id]:last-child`);
    if (newBlock) {
        setupBlockEventListeners(newBlock);
        
        // Fókusz
        setTimeout(() => {
            const input = newBlock.querySelector('input, textarea');
            if (input) input.focus();
        }, 100);
    }
    
    // Validálás
    validateFirstBlock();
}
/**
 * Blokkok feldolgozása és adatok előkészítése
 */
/**
 * Blokkok feldolgozása és adatok előkészítése - FRISSÍTVE
 */
/**
 * Blokkok feldolgozása és adatok előkészítése - JAVÍTOTT VERZIÓ
 */
async function prepareBlockPostData() {
    console.log('Blokkok feldolgozása...');
    
    const blocks = document.querySelectorAll('.content-block');
    if (blocks.length === 0) {
        console.warn('Nincsenek blokkok!');
        return null;
    }
    
    const processedBlocks = [];
    let fullHTML = '';
    let firstHeadingContent = '';
    let firstParagraphContent = '';
    
    // 1. Minden blokk feldolgozása
    for (const block of blocks) {
        const blockData = await processSingleBlock(block);
        
        if (blockData) {
            processedBlocks.push(blockData.blockJSON);
            fullHTML += blockData.html;
            
            // Cím keresése (első címsor)
            if (!firstHeadingContent && blockData.blockJSON.type === 'heading') {
                firstHeadingContent = blockData.blockJSON.content;
            }
            
            // Rövid leírás keresése (első bekezdés)
            if (!firstParagraphContent && blockData.blockJSON.type === 'paragraph') {
                const plainText = stripHTML(blockData.blockJSON.content);
                firstParagraphContent = plainText.substring(0, 150) + 
                                       (plainText.length > 150 ? '...' : '');
            }
        }
    }
    
    // 2. Cím generálása
    let title = '';
    const manualTitleInput = document.getElementById('post-title-manual');
    if (manualTitleInput && manualTitleInput.value.trim()) {
        title = manualTitleInput.value.trim();
    } else if (firstHeadingContent) {
        title = firstHeadingContent;
    } else if (firstParagraphContent) {
        title = firstParagraphContent.substring(0, 50) + 
                (firstParagraphContent.length > 50 ? '...' : '');
    } else {
        title = 'Cím nélküli poszt';
    }
    
    // 3. Rövid leírás generálása
    let excerpt = '';
    const manualExcerptInput = document.getElementById('post-excerpt-manual');
    if (manualExcerptInput && manualExcerptInput.value.trim()) {
        excerpt = manualExcerptInput.value.trim();
    } else if (firstParagraphContent) {
        excerpt = firstParagraphContent;
    } else if (processedBlocks.length > 0) {
        const firstBlockContent = processedBlocks[0].content || '';
        excerpt = stripHTML(firstBlockContent).substring(0, 100) + '...';
    } else {
        excerpt = title;
    }
    
    // 4. Szerzők automatikus hozzáadása (ha üres)
    const authorsInput = document.getElementById('post-authors');
    if (authorsInput && (!authorsInput.value || authorsInput.value.trim() === '')) {
        try {
            // Lekérjük a jelenlegi felhasználó UID-ját
            const token = await getAuthToken();
            if (token) {
                const userResponse = await fetch('/api/user/get', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ get: 'uid' })
                });
                
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    if (userData.uid) {
                        authorsInput.value = userData.uid.toString();
                        console.log('Jelenlegi felhasználó hozzáadva szerzőként:', userData.uid);
                        
                        // Frissítjük a szerzők listáját
                        if (typeof initializeAuthorSelector === 'function') {
                            initializeAuthorSelector();
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Hiba a szerző automatikus hozzáadása során:', error);
        }
    }
    
    // 5. Kategória és szerzők lekérése
    const categoriesInput = document.getElementById('post-categories');
    const authorsValue = authorsInput ? authorsInput.value : '';
    
    // Formázott adatok
    const result = {
        title: title,
        excerpt: excerpt,
        html: fullHTML,
        blocks: processedBlocks,
        category: categoriesInput ? categoriesInput.value.trim() : '',
        authors: formatAuthorsString(authorsValue) // FormatAuthorsString használata
    };
    
    console.log('Feldolgozott adatok:', result);
    
    // 6. Rejtett mezők frissítése
    document.getElementById('post-title').value = title;
    document.getElementById('post-excerpt').value = excerpt;
    document.getElementById('post-html-content').value = fullHTML;
    document.getElementById('post-blocks-json').value = JSON.stringify(processedBlocks);
    
    // 7. Automatikus előnézet frissítése
    updateAutoPreview(title, excerpt);
    
    return result;
}

/**
 * Egyetlen blokk feldolgozása
 */
/**
 * Egyetlen blokk feldolgozása - JAVÍTOTT VERZIÓ
 */
async function processSingleBlock(block) {
    const blockType = block.getAttribute('data-block-type');
    const blockId = block.getAttribute('data-block-id') || generateBlockId();
    block.setAttribute('data-block-id', blockId);
    
    // Blokk tartalmának kinyerése
    let content = '';
    let styles = {};
    let attributes = {};
    
    switch(blockType) {
        case 'paragraph':
            const textarea = block.querySelector('.block-textarea');
            content = textarea ? textarea.value : '';
            // A getComputedStyles helyett getBlockStyles használata
            styles = getBlockStyles(block);
            break;
            
        case 'heading':
            const headingInput = block.querySelector('.block-heading-input');
            content = headingInput ? headingInput.value : '';
            const levelSelect = block.querySelector('.heading-level') || 
                              { value: 'h2' }; // Alapértelmezett
            attributes.level = levelSelect.value;
            styles = getBlockStyles(block);
            break;
            
        case 'image':
            const img = block.querySelector('img');
            const caption = block.querySelector('.image-caption');
            if (img && img.src) {
                content = img.src;
                attributes.alt = img.alt || caption?.value || '';
                attributes.caption = caption?.value || '';
                styles = getBlockStyles(block);
                
                // Base64 kép konvertálása (ha lokális)
                if (content.startsWith('data:image')) {
                    attributes.is_base64 = true;
                }
            }
            break;
            
        case 'quote':
            const quoteTextarea = block.querySelector('.block-textarea');
            content = quoteTextarea ? quoteTextarea.value : '';
            const authorInput = block.querySelector('.quote-author');
            if (authorInput) attributes.author = authorInput.value;
            styles = getBlockStyles(block);
            break;
            
        case 'list':
            const listTextarea = block.querySelector('.block-textarea');
            const items = listTextarea ? 
                listTextarea.value.split('\n').filter(item => item.trim()) : [];
            content = items;
            const listTypeSelect = block.querySelector('.list-type') || { value: 'ul' };
            attributes.type = listTypeSelect.value;
            styles = getBlockStyles(block);
            break;
            
        case 'code':
            const codeTextarea = block.querySelector('.block-textarea');
            content = codeTextarea ? codeTextarea.value : '';
            const languageSelect = block.querySelector('.code-language') || { value: '' };
            attributes.language = languageSelect.value;
            styles = getBlockStyles(block);
            break;
            
        case 'divider':
            content = 'divider';
            styles = getBlockStyles(block);
            break;
            
        case 'embed':
            const embedInput = block.querySelector('.embed-url-input');
            content = embedInput ? embedInput.value : '';
            const embedType = detectEmbedType(content);
            attributes.type = embedType;
            styles = getBlockStyles(block);
            break;
            
        default:
            content = '';
            styles = getBlockStyles(block);
    }
    
    // Stílusok gyűjtése - már megtörtént a getBlockStyles-ban
    
    // HTML generálása
    const html = generateBlockHTML(blockType, content, attributes);
    
    // JSON struktúra
    const blockJSON = {
        id: blockId,
        type: blockType,
        content: content,
        attributes: attributes,
        styles: styles,
        position: Array.from(block.parentNode.children).indexOf(block)
    };
    
    return {
        html: html,
        blockJSON: blockJSON
    };
}

/**
 * HTML generálása blokkból
 */
function generateBlockHTML(type, content, attributes = {}) {
    switch(type) {
        case 'paragraph':
            return `<p class="block-paragraph">${content.replace(/\n/g, '<br>')}</p>`;
            
        case 'heading':
            const level = attributes.level || 'h2';
            return `<${level} class="block-heading">${content}</${level}>`;
            
        case 'image':
            const alt = attributes.alt || '';
            const caption = attributes.caption || '';
            let html = `<figure class="block-image">`;
            html += `<img src="${content}" alt="${alt}" style="max-width: 100%;">`;
            if (caption) {
                html += `<figcaption>${caption}</figcaption>`;
            }
            html += `</figure>`;
            return html;
            
        case 'quote':
            const author = attributes.author ? 
                `<cite>— ${attributes.author}</cite>` : '';
            return `<blockquote class="block-quote">
                <p>${content.replace(/\n/g, '<br>')}</p>
                ${author}
            </blockquote>`;
            
        case 'list':
            const listType = attributes.type || 'ul';
            let listHTML = `<${listType} class="block-list">`;
            const items = Array.isArray(content) ? content : [content];
            items.forEach(item => {
                listHTML += `<li>${item}</li>`;
            });
            listHTML += `</${listType}>`;
            return listHTML;
            
        case 'code':
            const language = attributes.language ? 
                ` class="language-${attributes.language}"` : '';
            return `<pre class="block-code"><code${language}>${content}</code></pre>`;
            
        case 'divider':
            return `<hr class="block-divider">`;
            
        case 'embed':
            return `<div class="block-embed" data-url="${content}">
                [Beágyazott tartalom: ${content}]
            </div>`;
            
        default:
            return `<div class="block-${type}">${content}</div>`;
    }
}

/**
 * Blokk stílusainak lekérdezése
 */
function getBlockStyles(block) {
    const styles = {};
    const computed = window.getComputedStyle(block);
    
    // Fontos stílusok gyűjtése
    const importantStyles = [
        'textAlign', 'fontSize', 'fontWeight', 'color',
        'backgroundColor', 'padding', 'margin', 'border',
        'textDecoration', 'fontStyle', 'lineHeight'
    ];
    
    importantStyles.forEach(style => {
        const value = computed[style];
        if (value && value !== 'normal' && value !== '0px' && value !== 'none') {
            styles[style] = value;
        }
    });
    
    return styles;
}

/**
 HTML eltávolítása szövegből
 */
function stripHTML(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
}

/**
 * Automatikus előnézet frissítése
 */
function updateAutoPreview(title, excerpt) {
    const titlePreview = document.getElementById('auto-title-preview');
    const excerptPreview = document.getElementById('auto-excerpt-preview');
    
    if (titlePreview) {
        titlePreview.textContent = title;
        titlePreview.style.fontStyle = 'normal';
        titlePreview.style.color = '#1891d1';
    }
    
    if (excerptPreview) {
        excerptPreview.textContent = excerpt;
        excerptPreview.style.fontStyle = 'normal';
        excerptPreview.style.color = '#666';
    }
}

/**
 * Blokk ID generálás
 */
function generateBlockId() {
    return 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Embed típus detektálás
 */
function detectEmbedType(url) {
    if (!url) return 'unknown';
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return 'youtube';
    } else if (url.includes('vimeo.com')) {
        return 'vimeo';
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
        return 'twitter';
    } else if (url.includes('instagram.com')) {
        return 'instagram';
    } else if (url.includes('spotify.com')) {
        return 'spotify';
    } else {
        return 'generic';
    }
}

/**
 * Blokk tartalmának változását figyelő eseménykezelő
 */
function setupBlockChangeListeners() {
    const blockContainer = document.getElementById('block-editor-container');
    
    if (!blockContainer) return;
    
    // Event delegation a változásokhoz
    blockContainer.addEventListener('input', function(e) {
        if (e.target.classList.contains('block-textarea') || 
            e.target.classList.contains('block-heading-input') ||
            e.target.classList.contains('image-caption') ||
            e.target.classList.contains('embed-url-input')) {
            
            // Automatikus mentés és előnézet frissítés
            setTimeout(async () => {
                await prepareBlockPostData();
            }, 500);
        }
    });
    
    // Képváltozás figyelése
    blockContainer.addEventListener('change', function(e) {
        if (e.target.classList.contains('image-file-input')) {
            setTimeout(async () => {
                await prepareBlockPostData();
            }, 500);
        }
    });
}

/**
 * Form ürítése - frissített verzió
 */
function clearPostForm() {
    // Alap űrlap mezők törlése
    document.getElementById('post-form').reset();
    
    // Szerzők listájának törlése
    const authorsInput = document.getElementById('post-authors');
    if (authorsInput) {
        authorsInput.value = '';
    }
    
    // Kiválasztott szerzők megjelenítésének törlése
    const selectedAuthorsContainer = document.getElementById('selected-authors-container');
    if (selectedAuthorsContainer) {
        const noAuthorsMessage = document.getElementById('no-authors-message');
        if (noAuthorsMessage) {
            noAuthorsMessage.style.display = 'flex';
        }
        selectedAuthorsContainer.querySelectorAll('.author-tag').forEach(tag => tag.remove());
    }
    
    // File input törlése
    const fileInput = document.getElementById('post-featured');
    if (fileInput) {
        fileInput.value = '';
    }
    
    // Szerkesztés PID törlése (ha van)
    const editPid = document.getElementById('edit-pid');
    if (editPid) {
        editPid.remove();
    }
    
    // Sikeres üzenet törlése (ha van)
    const successMessage = document.querySelector('.success-message');
    if (successMessage) {
        successMessage.remove();
    }
    
    // Űrlap újra megjelenítése
    document.getElementById('post-form').style.display = 'block';
    
    console.log('Űrlap tartalma sikeresen törölve');
}

/**
 * Elküldi a posztot ellenőrzésre
 */
async function sendForReview(pid, token) {
    console.log(`Poszt elküldése ellenőrzésre: ${pid}`);
    
    try {
        // Itt lehet implementálni egy értesítési rendszert
        // Jelenleg csak egy alert-et jelenítünk meg
        
        // Ha a státusz "published", akkor approve-oljuk
        const status = document.getElementById('post-status').value;
        if (status === 'published') {
            console.log('Poszt automatikus elfogadása...');
            const response = await fetch('/api/post/approve', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ post: pid })
            });
            
            if (response.ok) {
                console.log('Poszt automatikusan elfogadva');
            }
        }
        
        return true;
    } catch (error) {
        console.error('Hiba az ellenőrzés küldése során:', error);
        return false;
    }
}

/**
 * Sikeres üzenet megjelenítése
 */
function showSuccessMessage(pid) {
    const formContainer = document.querySelector('.create-post-form');
    if (!formContainer) return;
    
    const successHTML = `
        <div class="success-message" style="
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
        ">
            <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
            <h3 style="margin-top: 0; color: #155724;">Sikeresen elküldve ellenőrzésre!</h3>
            <p>A cikket elküldtük a lektoroknak ellenőrzésre.</p>
            <p><strong>Poszt ID:</strong> ${pid}</p>
            <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                <button class="btn-secondary" onclick="clearPostForm()">
                    Új poszt létrehozása
                </button>
                <button class="btn-primary" onclick="viewArticle(${pid})">
                    <ion-icon name="eye-outline"></ion-icon>
                    Poszt megtekintése
                </button>
            </div>
        </div>
    `;
    
    // Először elrejtjük a formot
    document.getElementById('post-form').style.display = 'none';
    
    // Hozzáadjuk a sikeres üzenetet
    formContainer.insertAdjacentHTML('afterbegin', successHTML);
}

/**
 * Form ürítése
 */
function clearPostForm() {
    document.getElementById('post-form').reset();
    document.getElementById('post-form').style.display = 'block';
    document.querySelector('.success-message')?.remove();
    document.getElementById('edit-pid')?.remove();
}



/**
 * Meglévő poszt frissítése
 */
async function updateExistingPost(pid, data) {
    const { title, category, minimal_desc, desc, authorsInput, status, token, imageFile } = data;
    
    try {
        let imageUrl = '';
        
        // Ha van új kép, feltöltjük
        if (imageFile) {
            console.log('Kép feltöltése szerkesztéshez...');
            imageUrl = await uploadImage(imageFile, token);
            if (!imageUrl) {
                alert('Hiba történt a kép feltöltése során!');
                return;
            }
        }
        
        // Összeállítjuk a frissítendő adatokat
        const updateData = {
            post: parseInt(pid),
            title: title,
            category: category,
            minimal_desc: minimal_desc || title,
            desc: desc
        };
        
        // Csak ha van új kép, adjuk hozzá
        if (imageUrl) {
            updateData.image = imageUrl;
        }
        
        console.log('Poszt frissítési adatok:', updateData);
        
        // API hívás: /api/post/edit
        const response = await fetch('/api/post/edit', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });
        
        console.log('Szerkesztés API válasz:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            
            // Sikeres üzenet
            const formContainer = document.querySelector('.create-post-form');
            if (formContainer) {
                document.getElementById('post-form').style.display = 'none';
                document.getElementById('edit-pid')?.remove();
                
                formContainer.insertAdjacentHTML('afterbegin', `
                    <div class="success-message" style="
                        background: #d4edda;
                        border: 1px solid #c3e6cb;
                        color: #155724;
                        padding: 20px;
                        border-radius: 8px;
                        margin-bottom: 20px;
                        text-align: center;
                    ">
                        <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
                        <h3 style="margin-top: 0; color: #155724;">Szerkesztés elküldve ellenőrzésre!</h3>
                        <p>A módosításokat elküldtük a lektoroknak ellenőrzésre.</p>
                        <p><strong>Poszt ID:</strong> ${pid}</p>
                        <div style="margin-top: 20px;">
                            <button class="btn-primary" onclick="location.reload()">
                                Vissza a cikkek listájához
                            </button>
                        </div>
                    </div>
                `);
            }
            
            // Lista frissítése
            setTimeout(() => {
                loadUserArticles();
            }, 1000);
            
        } else {
            const error = await response.text();
            alert(`Hiba a szerkesztés során: ${error}`);
        }
        
    } catch (error) {
        console.error('Hiba a poszt frissítése során:', error);
        alert('Hiba történt a szerkesztés során!');
    }
}

async function updateNextNumber(newNumber, token) {
    try {
        const response = await fetch('/api/settings/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                setting: 'number',
                value: newNumber.toString()
            })
        });
        
        if (response.ok) {
            console.log('Number frissítve:', newNumber);
        }
    } catch (error) {
        console.error('Hiba a number frissítése során:', error);
    }
}

async function uploadImage(file, token) {
    console.log('Kép feltöltése...');
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        alert('Csak JPEG, PNG, GIF vagy WebP képek tölthetők fel!');
        return null;
    }
    
    // Ellenőrizzük a fájlméretet (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('A kép mérete nem haladhatja meg az 5MB-ot!');
        return null;
    }
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        console.log('Képfeltöltés indítása...');
        const response = await fetch('/api/upload/image', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        console.log('Képfeltöltés válasza:', response.status, response.statusText);
        
        if (!response.ok) {
            console.error('Képfeltöltés sikertelen:', response.status);
            
            let errorText = `Képfeltöltés sikertelen: ${response.status}`;
            try {
                const errorData = await response.text();
                console.error('Hiba részletei:', errorData);
                errorText += ` - ${errorData}`;
            } catch (e) {
            }
            
            alert(errorText);
            return null;
        }
        
        try {
            const result = await response.json();
            console.log('Kép feltöltve, válasz:', result);
            
            if (result.url) {
                return result.url;
            } else if (result.image) {
                return result.image;
            } else if (result.path) {
                return result.path;
            } else {
                console.warn('Nincs URL mező a válaszban, teljes válasz:', result);
                if (typeof result === 'string' && result.startsWith('http')) {
                    return result;
                }
                alert('A képfeltöltés sikerült, de nem kaptunk vissza érvényes URL-t!');
                return null;
            }
            
        } catch (jsonError) {
            console.error('JSON parse hiba:', jsonError);
            const textResult = await response.text();
            console.log('Szöveges válasz:', textResult);
            
            if (textResult.startsWith('http')) {
                return textResult;
            }
            
            alert('Nem sikerült értelmezni a képfeltöltés válaszát!');
            return null;
        }
        
    } catch (error) {
        console.error('Hálózati hiba a képfeltöltés során:', error);
        alert('Hálózati hiba a képfeltöltés során!');
        return null;
    }
}

function initializeCharts() {
    const chartBars = document.querySelectorAll('.chart-bar');
    chartBars.forEach(bar => {
        const originalHeight = bar.style.height;
        bar.style.height = '0%';
        
        setTimeout(() => {
            bar.style.transition = 'height 0.8s ease';
            bar.style.height = originalHeight;
        }, 300);
    });
}

function updatePageDescription(pageId = 'dashboard') {
    const descriptions = {
        'dashboard': 'Íme a mai összefoglaló',
        'create-post': 'Hozz létre egy új cikket',
        'articles': 'Kezeld meglévő cikkeidet. Szerkeszd, töröld vagy tekintsd meg őket. A státusz a lektor döntése alapján változhat.',
        'analytics': 'Részletes elemzések és statisztikák',
        'comments': 'Hozzászólások kezelése'
    };
    
    document.querySelector('.page-description').textContent = descriptions[pageId] || 'Adminisztrációs felület. Engedélyezd, szerkeszd vagy töröld a beérkezett cikkeket. A te döntésed.';
}

window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        document.getElementById('sidebar').classList.remove('active');
    }
});



function getSelectedAuthors() {
    const authorsInput = document.getElementById('post-authors');
    if (!authorsInput) return '';
    
    const authorIds = authorsInput.value.trim();
    
    if (!authorIds) return '';
    
    const cleanIds = authorIds.split(',')
        .map(id => id.trim())
        .filter(id => id !== '')
        .join(', ');
    
    console.log('Szerző ID-k:', cleanIds);
    return cleanIds;
}

function initializeAuthorSelector() {
    console.log('Authors selector inicializálása...');
    
    const formContainer = document.querySelector('.create-post-form');
    if (!formContainer) return;
    
    if (document.querySelector('.author-selector')) {
        console.log('Author selector már létezik');
        return;
    }
    
    const formRow = document.querySelector('.form-row:first-child');
    if (formRow) {
        const authorDiv = document.createElement('div');
        authorDiv.className = 'form-group author-selector';
        authorDiv.innerHTML = `
            <label for="post-authors">Szerzők (vesszővel elválasztott UID-ek)</label>
            <div class="author-list" id="author-list">
                <!-- Ide jönnek a kiválasztott szerzők címkéi -->
            </div>
            <button type="button" class="btn-add-author" id="add-author-btn">
                <ion-icon name="person-add-outline"></ion-icon>
                Szerző hozzáadása
            </button>
            <input type="hidden" id="post-authors" name="authors">
        `;
        
        formRow.appendChild(authorDiv);
        
        setTimeout(() => {
            document.getElementById('add-author-btn')?.addEventListener('click', function() {
                openAuthorModal();
            });
        }, 100);
    }
}

function openAuthorModal() {
    console.log('Author modal megnyitása...');
    
    const modal = document.createElement('div');
    modal.className = 'author-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: var(--icon-color);">Szerző kiválasztása</h3>
                <button id="close-author-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
            </div>
            
            <div class="search-box" style="margin-bottom: 20px;">
                <ion-icon name="search-outline"></ion-icon>
                <input type="text" id="search-author" placeholder="Keresés szerzők között...">
            </div>
            
            <div class="modal-author-list" id="modal-author-list">
                <div style="text-align: center; padding: 40px 20px; color: var(--text-color-light);">
                    <ion-icon name="sync-outline" style="font-size: 48px; margin-bottom: 10px;"></ion-icon>
                    <p>Szerzők betöltése...</p>
                </div>
            </div>
            
            <div class="modal-actions">
                <button type="button" class="btn-secondary" id="cancel-author-modal">Mégse</button>
                <button type="button" class="btn-primary" id="save-author-modal">Hozzáadás</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    loadAuthorsForModal();
    
    document.getElementById('close-author-modal').addEventListener('click', () => {
        modal.remove();
    });
    
    document.getElementById('cancel-author-modal').addEventListener('click', () => {
        modal.remove();
    });
    
    document.getElementById('save-author-modal').addEventListener('click', () => {
        saveSelectedAuthors();
        modal.remove();
    });
    
    document.getElementById('search-author').addEventListener('input', function(e) {
        filterAuthors(e.target.value);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

async function loadAuthorsForModal() {
    console.log('Szerzők betöltése...');
    
    const token = getAuthToken();
    if (!token) {
        document.getElementById('modal-author-list').innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--negative-color);">
                <ion-icon name="warning-outline" style="font-size: 48px; margin-bottom: 10px;"></ion-icon>
                <p>Nincs bejelentkezve! Kérjük, jelentkezz be.</p>
            </div>
        `;
        return;
    }
    
    try {


        displayAuthorsInModal(mockAuthors);
        
    } catch (error) {
        console.error('Hiba a szerzők betöltése során:', error);
        document.getElementById('modal-author-list').innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--negative-color);">
                <ion-icon name="alert-circle-outline" style="font-size: 48px; margin-bottom: 10px;"></ion-icon>
                <p>Hiba történt a szerzők betöltése során!</p>
            </div>
        `;
    }
}

function displayAuthorsInModal(authors) {
    const container = document.getElementById('modal-author-list');
    if (!container) return;
    
    if (!authors || authors.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-color-light);">
                <ion-icon name="people-outline" style="font-size: 48px; margin-bottom: 10px;"></ion-icon>
                <p>Nincsenek elérhető szerzők.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    authors.forEach(author => {
        html += `
            <div class="author-item" data-uid="${author.uid}" style="display: flex; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-color); cursor: pointer;">
                <div style="margin-right: 12px;">
                    <input type="checkbox" id="author-${author.uid}" class="author-checkbox" style="width: 18px; height: 18px;">
                </div>
                <div>
                    <div style="font-weight: 500; margin-bottom: 4px;">${author.name}</div>
                    <div style="font-size: 12px; color: var(--text-color-light);">${author.email}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    document.querySelectorAll('.author-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateAuthorSelection(this);
        });
    });
}

function filterAuthors(searchTerm) {
    const authorItems = document.querySelectorAll('.author-item');
    const term = searchTerm.toLowerCase().trim();
    
    authorItems.forEach(item => {
        const name = item.querySelector('div:nth-child(2) > div:first-child').textContent.toLowerCase();
        const email = item.querySelector('div:nth-child(2) > div:last-child').textContent.toLowerCase();
        
        if (name.includes(term) || email.includes(term)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

let selectedAuthors = [];

function updateAuthorSelection(checkbox) {
    const uid = parseInt(checkbox.closest('.author-item').dataset.uid);
    const authorItem = checkbox.closest('.author-item');
    const authorName = authorItem.querySelector('div:nth-child(2) > div:first-child').textContent;
    
    if (checkbox.checked) {
        if (!selectedAuthors.some(a => a.uid === uid)) {
            selectedAuthors.push({ uid: uid, name: authorName });
            authorItem.style.backgroundColor = 'rgba(74, 108, 247, 0.1)';
        }
    } else {
        selectedAuthors = selectedAuthors.filter(a => a.uid !== uid);
        authorItem.style.backgroundColor = '';
    }
    
    console.log('Kiválasztott szerzők:', selectedAuthors);
}

function saveSelectedAuthors() {
    const authorList = document.getElementById('author-list');
    const authorsInput = document.getElementById('post-authors');
    
    if (!authorList || !authorsInput) return;
    
    // Frissítjük a listát
    authorList.innerHTML = '';
    
    selectedAuthors.forEach(author => {
        const authorTag = document.createElement('div');
        authorTag.className = 'author-tag';
        authorTag.innerHTML = `
            ${author.name}
            <button type="button" class="remove-author" data-uid="${author.uid}" style="background: none; border: none; color: white; margin-left: 8px; cursor: pointer; font-size: 14px;">×</button>
        `;
        authorList.appendChild(authorTag);
    });
    
    const authorIds = selectedAuthors.map(a => a.uid).join(', ');
    authorsInput.value = authorIds;
    
    document.querySelectorAll('.remove-author').forEach(btn => {
        btn.addEventListener('click', function() {
            const uid = parseInt(this.dataset.uid);
            selectedAuthors = selectedAuthors.filter(a => a.uid !== uid);
            saveSelectedAuthors(); // Rekurzív hívás a lista frissítéséhez
        });
    });
}

function getSelectedAuthors() {
    const authorsInput = document.getElementById('post-authors');
    return authorsInput ? authorsInput.value : '';
}



async function getNextPostNumber() {
    try {
        const token = await getAuthToken();
        if (!token) {
            console.error('Nincs érvényes token a number lekéréséhez');
            return 1;
        }
        
        console.log('Number API hívás a /api/number/get-re...');
        
        // 1. A DOKUMENTÁCIÓ SZERINTI HELYES VÉGPONT HASZNÁLATA: /api/number/get
        const response = await fetch('/api/number/get', {
            method: 'GET', // GET kérés, ahogy a doksiban is szerepel
            headers: {
                'Authorization': `Bearer ${token}` // Csak a token kell, body nem
            }
        });
        
        console.log('Number API válasz státusz:', response.status);
        console.log('Content-Type:', response.headers.get('Content-Type'));
        
        if (response.status === 401) {
            console.error('Token érvénytelen a number API hívásnál');
            // Token törlése és újra bejelentkeztetés
            localStorage.removeItem('secret');
            sessionStorage.removeItem('secret');
            throw new Error('Token érvénytelen');
        }
        
        if (!response.ok) {
            console.error('Hiba a szám lekérése során:', response.status);
            return 1;
        }
        
        // 2. VÁRT VÁLASZ FELDOLGOZÁSA (JSON)
        const responseData = await response.json();
        console.log('Number API JSON válasz:', responseData);
        
        // A dokumentáció szerint a válasz így néz ki: {"number": 6}
        if (responseData && typeof responseData.number !== 'undefined') {
            const currentNumber = parseInt(responseData.number);
            console.log('Jelenlegi lapszám:', currentNumber);
            // A következő poszt számának kell lennie: currentNumber + 1
            return currentNumber + 1;
        }
        
        console.warn('A válasz nem tartalmazza a "number" mezőt, alapértelmezett: 1');
        return 1;
        
    } catch (error) {
        console.error('Hiba a következő szám lekérése során:', error);
        
        if (error.message.includes('Token') || error.message.includes('401')) {
            alert('A bejelentkezési munkameneted lejárt. Kérjük, jelentkezz be újra.');
            const currentPath = encodeURIComponent(window.location.pathname);
            window.location.href = `/api/login/google?redirect=${currentPath}`;
        }
        
        return 1;
    }
}


function formatAuthorsString(authorsInput) {
    console.log('Szerzők formázása, bemenet:', authorsInput);
    
    if (!authorsInput || authorsInput.trim() === '') {
        console.log('Üres szerző lista - üres stringet visszaadunk');
        return ''; // Fontos: üres stringet kell visszaadni, nem null-t
    }
    
    try {
        // Szétválasztás vesszők mentén
        const authorsArray = authorsInput.split(',')
            .map(id => id.trim())
            .filter(id => {
                // Ellenőrizzük, hogy szám-e
                const num = parseInt(id);
                return id !== '' && !isNaN(num) && num > 0;
            })
            .map(id => parseInt(id)); // Konvertáljunk számokká
        
        console.log('Formázott szerzők tömb:', authorsArray);
        
        if (authorsArray.length === 0) {
            return ''; // Üres string, ha nincs érvényes szerző
        }
        
        // A PHP kód ", " elválasztót vár
        return authorsArray.join(', ');
        
    } catch (error) {
        console.error('Hiba a szerzők formázása során:', error);
        return ''; // Hiba esetén is üres string
    }
}



function checkUserRoles(requiredRoles) {
    // Ideiglenes megoldás, a tényleges jogkör ellenőrzés szerveroldali
    console.log('Jogkör ellenőrzés - kliens oldali alap ellenőrzés');
    const token = getAuthToken();
    return !!token; // Csak azt ellenőrizzük, hogy be van-e jelentkezve
}

/**
 * API hívás logolása
 */
function logApiCall(endpoint, method, data = null) {
    console.group('API Hívás');
    console.log('Végpont:', endpoint);
    console.log('Metódus:', method);
    console.log('Adatok:', data);
    console.groupEnd();
}

/**
 * Hiba logolása
 */
function logError(context, error) {
    console.group('HIBA');
    console.log('Kontextus:', context);
    console.error('Hiba:', error);
    console.trace(); // Call stack nyomkövetés
    console.groupEnd();
}



async function loadAuthorsForModal() {
    console.log('Szerzők betöltése...');
    
    const token = await getAuthToken();
    if (!token) {
        document.getElementById('modal-author-list').innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--negative-color);">
                <ion-icon name="warning-outline" style="font-size: 48px; margin-bottom: 10px;"></ion-icon>
                <p>Nincs bejelentkezve! Kérjük, jelentkezz be.</p>
            </div>
        `;
        return;
    }
    
    try {
        // A dokumentáció szerint: /api/user/getall GET
        const response = await fetch('/api/user/getall', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Hiba: ${response.status}`);
        }
        
        const authorsData = await response.json();
        console.log('Szerzők betöltve:', authorsData);
        
        // Átalakítás a modal számára megfelelő formátumba
        const authorsArray = Object.entries(authorsData).map(([uid, user]) => ({
            uid: parseInt(uid),
            name: user.alias || user.full_name || 'Ismeretlen',
            email: user.email || 'Nincs email'
        }));
        
        displayAuthorsInModal(authorsArray);
        
    } catch (error) {
        console.error('Hiba a szerzők betöltése során:', error);
        document.getElementById('modal-author-list').innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--negative-color);">
                <ion-icon name="alert-circle-outline" style="font-size: 48px; margin-bottom: 10px;"></ion-icon>
                <p>Hiba történt a szerzők betöltése során!</p>
                <p style="font-size: 12px; margin-top: 10px;">${error.message}</p>
            </div>
        `;
    }
}


async function loadUserArticles() {
    const token = await getAuthToken();
    if (!token) {
        console.log('Nincs token a cikkek betöltéséhez');
        return;
    }
    
    try {
        // A dokumentáció szerint: /api/post/get/written?edited=false
        const response = await fetch('/api/post/get/written?edited=false', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const articles = await response.json();
            console.log('Felhasználó cikkei:', articles);
            displayUserArticles(articles);
        }
    } catch (error) {
        console.error('Hiba a cikkek betöltése során:', error);
    }
}


async function editPost(postId, postData) {
    const token = await getAuthToken();
    if (!token) {
        alert('Nem vagy bejelentkezve!');
        return false;
    }
    
    try {
        // A dokumentáció szerint: /api/post/edit PUT
        const response = await fetch('/api/post/edit', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                post: postId,
                ...postData
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(result.message || 'Sikeres szerkesztés!');
            return true;
        } else {
            const error = await response.text();
            alert(`Hiba: ${error}`);
            return false;
        }
    } catch (error) {
        console.error('Hiba a szerkesztés során:', error);
        alert('Hálózati hiba történt!');
        return false;
    }
}

async function deletePost(postId) {
    if (!confirm('Biztosan törölni szeretnéd ezt a posztot? Ez a művelet nem visszavonható!')) {
        return;
    }
    
    const token = await getAuthToken();
    if (!token) {
        alert('Nem vagy bejelentkezve!');
        return;
    }
    
    try {
        // A dokumentáció szerint: /api/post/delete DELETE
        const response = await fetch('/api/post/delete', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ post: postId })
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(result.message || 'Poszt törölve!');
            // Frissítsd az UI-t
            loadUserArticles();
        } else {
            const error = await response.text();
            alert(`Hiba: ${error}`);
        }
    } catch (error) {
        console.error('Hiba a törlés során:', error);
        alert('Hálózati hiba történt!');
    }
}

async function approvePost(postId) {
    const token = await getAuthToken();
    if (!token) {
        alert('Nem vagy bejelentkezve!');
        return;
    }
    
    try {
        // A dokumentáció szerint: /api/post/approve PUT
        const response = await fetch('/api/post/approve', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ post: postId })
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(result.message || 'Poszt elfogadva!');
            // Frissítsd az UI-t
            loadUserArticles();
        } else {
            const error = await response.text();
            alert(`Hiba: ${error}`);
        }
    } catch (error) {
        console.error('Hiba az elfogadás során:', error);
        alert('Hálózati hiba történt!');
    }
}


// dashboard.js - Új függvények hozzáadása

/**
 * Betölti a felhasználó által írt cikkeket
 */
async function loadUserArticles() {
    console.log('Felhasználó cikkeinek betöltése...');
    
    const container = document.getElementById('articles-container');
    const loadingElement = document.getElementById('articles-loading');
    
    if (!container) {
        console.error('articles-container nem található');
        return;
    }
    
    // Token ellenőrzése
    const token = await getAuthToken();
    if (!token) {
        if (loadingElement) loadingElement.style.display = 'none';
        container.innerHTML = `
            <div class="empty-state">
                <ion-icon name="log-in-outline" style="font-size: 48px; color: #666; margin-bottom: 16px;"></ion-icon>
                <h3>Nincs bejelentkezve</h3>
                <p>Jelentkezz be a cikkeid megtekintéséhez!</p>
                <button class="btn-primary" onclick="window.location.href='/api/login/google?redirect=${encodeURIComponent(window.location.pathname)}'">
                    Bejelentkezés
                </button>
            </div>
        `;
        return;
    }
    
    try {
        // Megjelenítjük a betöltési állapotot
        if (loadingElement) {
            loadingElement.innerHTML = `
                <ion-icon name="sync-outline" class="loading-icon"></ion-icon>
                <p>Cikkek betöltése...</p>
            `;
            loadingElement.style.display = 'flex';
        }
        
        // API hívás: /api/post/get/written?edited=false
        const response = await fetch('/api/post/get/written?edited=false', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Cikkek API válasz státusz:', response.status);
        
        if (!response.ok) {
            throw new Error(`API hiba: ${response.status}`);
        }
        
        const articlesData = await response.json();
        console.log('Cikkek betöltve:', articlesData);
        
        // Betöltés befejezése
        if (loadingElement) loadingElement.style.display = 'none';
        
        // Cikkek megjelenítése
        displayUserArticles(articlesData, container);
        
    } catch (error) {
        console.error('Hiba a cikkek betöltése során:', error);
        
        if (loadingElement) loadingElement.style.display = 'none';
        
        container.innerHTML = `
            <div class="empty-state error">
                <ion-icon name="alert-circle-outline" style="font-size: 48px; color: #e74c3c; margin-bottom: 16px;"></ion-icon>
                <h3>Hiba történt</h3>
                <p>${error.message}</p>
                <button class="btn-secondary" onclick="loadUserArticles()">
                    <ion-icon name="refresh-outline"></ion-icon>
                    <span style="font-family: 'Abril Fatface';">Újrapróbálkozás
                </button>
            </div>
        `;
    }
}

/**
 * Megjeleníti a felhasználó cikkeit
 */
async function displayUserArticles(articlesData, container) {
    if (!articlesData || Object.keys(articlesData).length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <ion-icon name="document-text-outline" style="font-size: 48px; color: #666; margin-bottom: 16px;"></ion-icon>
                <h3>Még nincsenek cikkeid</h3>
                <p>Hozz létre egy új cikket a "Poszt létrehozása" menüpontban!</p>
                <button class="btn-primary" id="create-first-article">
                    <ion-icon name="add-outline"></ion-icon>
                    Új cikk létrehozása
                </button>
            </div>
        `;
        
        setTimeout(() => {
            document.getElementById('create-first-article')?.addEventListener('click', () => {
                document.querySelector('[data-target="create-post"]').click();
            });
        }, 100);
        
        return;
    }
    
    // HTML generálása
    let html = `
        <div class="articles-table">
            <div class="table-header-row">
                <div class="table-col">Cím</div>
                <div class="table-col">Státusz</div>
                <div class="table-col">Létrehozva</div>
                <div class="table-col">Lapszám</div>
                <div class="table-col">Műveletek</div>
            </div>
    `;
    
    // Cikkek listázása - aszinkron státusz lekérdezéssel
    const articleEntries = Object.entries(articlesData);
    
    // Elsőként betöltjük a státuszokat
    const statusMap = await getStatusesForArticles(articleEntries);
    
    articleEntries.forEach(([pid, article]) => {
        const statusInfo = statusMap[pid] || { status: article.status || 'draft', hidden: false };
        const status = statusInfo.status;
        const createdDate = formatDate(article.created || new Date().toISOString());
        
        // Státusz badge generálása
        let statusBadgeHTML = '';
        if (status) {
            const statusConfig = {
                'published': { text: 'Publikálva', class: 'published' },
                'pending': { text: 'Ellenőrzés alatt', class: 'pending' },
                'draft': { text: 'Vázlat', class: 'draft' },
                'approved': { text: 'Elfogadva', class: 'published' },
                'rejected': { text: 'Elutasítva', class: 'rejected' }
            };
            
            const config = statusConfig[status] || { text: 'Ismeretlen', class: 'draft' };
            
            // Hidden státusz kezelése
            let statusText = config.text;
            let statusClass = config.class;
            if (statusInfo.hidden) {
                statusText += ' (Rejtett)';
                statusClass = 'draft';
            }
            
            statusBadgeHTML = `<span class="status-badge ${statusClass}">${statusText}</span>`;
        }
        
        html += `
            <div class="table-row" data-pid="${pid}" data-status="${status}">
                <div class="table-col">
                    <div class="article-title" style="font-family: 'Abril Fatface'">${article.title || 'Cím nélkül'}</div>
                </div>
                <div class="table-col" id="status-col-${pid}">
                    ${statusBadgeHTML}
                </div>
                <div class="table-col">${createdDate}</div>
                <div class="table-col">${article.number || '-'}</div>
                <div class="table-col">
                    <div class="action-buttons">
                        <button class="btn-action" title="Szerkesztés" onclick="editArticle(${pid})">
                            <ion-icon name="create-outline"></ion-icon>
                        </button>
                        <button class="btn-action" title="Megtekintés" onclick="viewArticle(${pid})">
                            <ion-icon name="eye-outline"></ion-icon>
                        </button>
                        <button class="btn-action" title="Törlés" onclick="deleteArticle(${pid})">
                            <ion-icon name="trash-outline"></ion-icon>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
    
    // Filter gombok eseménykezelői
    setupArticleFilters();
}

async function getStatusesForArticles(articleList) {
    const token = await getAuthToken();
    if (!token) return {};
    
    const statusPromises = articleList.map(async ([pid, article]) => {
        try {
            const response = await fetch(`/api/post/get/status?post=${pid}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return { pid, status: data.status, hidden: data.hidden };
            }
        } catch (error) {
            console.error(`Hiba státusz lekérésnél PID ${pid}:`, error);
        }
        return { pid, status: null, hidden: false };
    });
    
    const results = await Promise.all(statusPromises);
    const statusMap = {};
    
    results.forEach(result => {
        statusMap[result.pid] = {
            status: result.status,
            hidden: result.hidden
        };
    });
    
    return statusMap;
}

/**
 * Megállapítja a cikk státuszát
 */
async function getArticleStatus(article, pid) {
    if (!pid) {
        return article.status || 'draft';
    }
    
    try {
        const token = await getAuthToken();
        if (!token) {
            return article.status || 'draft';
        }
        
        const response = await fetch(`/api/post/get/status?post=${pid}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const statusData = await response.json();
            return statusData.status || 'draft';
        }
    } catch (error) {
        console.error(`Hiba a státusz lekérése során PID ${pid}:`, error);
    }
    
    return article.status || 'draft';
}


/**
 * Státusz badge HTML generálása
 */
async function getStatusBadgeHTML(status, pid) {
    // Ha már van status, használjuk azt (kompatibilitás)
    if (status) {
        const statusConfig = {
            'published': { text: 'Publikálva', class: 'published' },
            'pending': { text: 'Ellenőrzés alatt', class: 'pending' },
            'draft': { text: 'Vázlat', class: 'draft' },
            'approved': { text: 'Elfogadva', class: 'published' },
            'rejected': { text: 'Elutasítva', class: 'rejected' }
        };
        
        const config = statusConfig[status] || { text: 'Ismeretlen', class: 'draft' };
        return `<span class="status-badge ${config.class}">${config.text}</span>`;
    }
    
    // Ha nincs status, de van PID, lekérjük a szerverről
    if (!pid) {
        return `<span class="status-badge draft">Betöltés...</span>`;
    }
    
    try {
        const token = await getAuthToken();
        if (!token) {
            return `<span class="status-badge draft" style="font-family: 'Abril Fatface';">Nincs bejelentkezve</span>`;
        }
        
        // API hívás: /api/post/get/status?post={pid}
        const response = await fetch(`/api/post/get/status?post=${pid}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log(`Státusz lekérés PID: ${pid}, státusz: ${response.status}`);
        
        if (response.ok) {
            const statusData = await response.json();
            console.log(`Státusz adatok PID ${pid}:`, statusData);
            
            // Átalakítás magyarra
            let statusText = 'Ismeretlen';
            let statusClass = 'draft';
            
            switch(statusData.status) {
                case 'pending':
                    statusText = 'Ellenőrzés alatt';
                    statusClass = 'pending';
                    break;
                case 'approved':
                    statusText = 'Elfogadva';
                    statusClass = 'published';
                    break;
                case 'published':
                    statusText = 'Publikálva';
                    statusClass = 'published';
                    break;
                case 'rejected':
                    statusText = 'Elutasítva';
                    statusClass = 'rejected';
                    break;
                case 'draft':
                    statusText = 'Vázlat';
                    statusClass = 'draft';
                    break;
                default:
                    statusText = statusData.status || 'Ismeretlen';
                    statusClass = 'draft';
            }
            
            // Hidden státusz kezelése
            if (statusData.hidden) {
                statusText += ' (Rejtett)';
                statusClass = 'draft';
            }
            
            return `<span class="status-badge ${statusClass}">${statusText}</span>`;
        } else {
            console.warn(`Hiba státusz lekérésnél PID ${pid}:`, response.status);
            return `<span class="status-badge draft">Hiba</span>`;
        }
        
    } catch (error) {
        console.error(`Hiba a státusz lekérése során PID ${pid}:`, error);
        return `<span class="status-badge draft">Hiba</span>`;
    }
}


/**
 * Dátum formázása
 */
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('hu-HU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

/**
 * Cikk szűrők beállítása
 */
function setupArticleFilters() {
    const filterButtons = document.querySelectorAll('.articles-filter .filter-btn');
    const articleRows = document.querySelectorAll('.table-row[data-pid]');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Aktív gomb frissítése
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.dataset.filter;
            
            // Cikkek szűrése
            articleRows.forEach(row => {
                if (filter === 'all' || row.dataset.status === filter) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    });
}

/**
 * Cikk szerkesztése
 */
async function editArticle(pid) {
    console.log(`Cikk szerkesztése: ${pid}`);
    
    try {
        const token = await getAuthToken();
        if (!token) {
            alert('Nem vagy bejelentkezve!');
            return;
        }
        
        // Lekérjük a cikk teljes tartalmát szerkesztett verzióval együtt
        const response = await fetch('/api/post/get/contents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                post: pid,
                edited: true
            })
        });
        
        if (response.ok) {
            const article = await response.json();
            
            // Betöltjük a szerkesztő oldalt
            document.querySelector('[data-target="create-post"]').click();
            
            // Kitöltjük a formot
            setTimeout(() => {
                document.getElementById('post-title').value = article.title || '';
                document.getElementById('post-category').value = article.category || '';
                document.getElementById('post-excerpt').value = article.minimal_desc || '';
                document.getElementById('post-content').value = article.desc || '';
                
                // Státusz beállítása
                document.getElementById('post-status').value = 'draft';
                
                // Mentjük a PID-et egy rejtett mezőbe
                let hiddenPid = document.getElementById('edit-pid');
                if (!hiddenPid) {
                    hiddenPid = document.createElement('input');
                    hiddenPid.type = 'hidden';
                    hiddenPid.id = 'edit-pid';
                    document.getElementById('post-form').appendChild(hiddenPid);
                }
                hiddenPid.value = pid;
                
                alert('Cikk betöltve a szerkesztőbe!');
            }, 300);
        } else {
            alert('Hiba történt a cikk betöltése során!');
        }
    } catch (error) {
        console.error('Hiba a cikk szerkesztése során:', error);
        alert('Hiba történt!');
    }
}

/**
 * Cikk megtekintése
 */
function viewArticle(pid) {
    console.log(`Cikk megtekintése: ${pid}`);
    window.open(`/post/${pid}`, '_blank');
}

/**
 * Cikk törlése
 */
async function deleteArticle(pid) {
    if (!confirm('Biztosan törölni szeretnéd ezt a cikket? Ez a művelet nem visszavonható!')) {
        return;
    }
    
    try {
        const token = await getAuthToken();
        if (!token) {
            alert('Nem vagy bejelentkezve!');
            return;
        }
        
        const response = await fetch('/api/post/delete', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ post: pid })
        });
        
        if (response.ok) {
            alert('Cikk sikeresen törölve!');
            loadUserArticles(); // Lista frissítése
        } else {
            const error = await response.text();
            alert(`Hiba: ${error}`);
        }
    } catch (error) {
        console.error('Hiba a cikk törlése során:', error);
        alert('Hiba történt a törlés során!');
    }
}


/**
 * Szerzőválasztó inicializálása
 */
/**
 * Szerzőválasztó inicializálása - JAVÍTOTT VERZIÓ
 */
function initializeAuthorSelector() {
    console.log('Szerzőválasztó inicializálása...');
    
    const selectButton = document.getElementById('select-authors-btn');
    const authorsContainer = document.getElementById('selected-authors-container');
    const noAuthorsMessage = document.getElementById('no-authors-message');
    const authorsInput = document.getElementById('post-authors');
    
    if (!selectButton || !authorsContainer) {
        console.log('Szerzőválasztó elemek nem találhatók');
        return;
    }
    
    // Eseménykezelő a szerzőválasztó gombhoz
    selectButton.addEventListener('click', openAuthorsModal);
    
    // Betöltjük a már kiválasztott szerzőket (ha vannak)
    loadSelectedAuthors();
    
    /**
     * Betölti a már kiválasztott szerzőket
     */
    function loadSelectedAuthors() {
        const currentAuthors = authorsInput ? authorsInput.value : '';
        if (currentAuthors && currentAuthors.trim() !== '') {
            const authorIds = currentAuthors.split(',').map(id => id.trim()).filter(id => id !== '');
            if (authorIds.length > 0) {
                // Töltsük be a szerzők adatait
                loadAuthorsData(authorIds);
            }
        }
        
        // Ha nincsenek szerzők, jelenítsük meg az üzenetet
        if (noAuthorsMessage && authorsInput && (!authorsInput.value || authorsInput.value.trim() === '')) {
            noAuthorsMessage.style.display = 'flex';
        }
    }
    
    /**
     * Betölti a szerzők adatait a megadott UID-ek alapján
     */
    async function loadAuthorsData(authorIds) {
        try {
            const token = await getAuthToken();
            if (!token) return;
            
            // Lekérjük az összes felhasználót
            const response = await fetch('/api/user/getall', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) return;
            
            const allUsers = await response.json();
            const selectedAuthors = [];
            
            // Kigyűjtjük a kiválasztott szerzők adatait
            authorIds.forEach(id => {
                const uid = parseInt(id);
                if (allUsers[uid]) {
                    selectedAuthors.push({
                        uid: uid,
                        name: allUsers[uid].alias || allUsers[uid].full_name || `Felhasználó ${uid}`,
                        email: allUsers[uid].email || ''
                    });
                }
            });
            
            // Megjelenítjük a szerzőket
            displaySelectedAuthors(selectedAuthors);
            
        } catch (error) {
            console.error('Hiba a szerzők betöltése során:', error);
        }
    }
    
    /**
     * Megjeleníti a kiválasztott szerzőket
     */
    function displaySelectedAuthors(authors) {
        if (!authors || authors.length === 0) {
            // ELŐSZÖR ELLENŐRIZZÜK, HOGY LÉTEZIK-E A noAuthorsMessage
            if (noAuthorsMessage) {
                noAuthorsMessage.style.display = 'flex';
            }
            return;
        }
        
        // Ha vannak szerzők, elrejtjük az üzenetet
        if (noAuthorsMessage) {
            noAuthorsMessage.style.display = 'none';
        }
        
        // Kiürítjük a konténert
        authorsContainer.innerHTML = '';
        
        authors.forEach(author => {
            const authorTag = document.createElement('div');
            authorTag.className = 'author-tag';
            authorTag.innerHTML = `
                ${author.name}
                <button type="button" class="remove-author" data-uid="${author.uid}">
                    <ion-icon name="close-outline"></ion-icon>
                </button>
            `;
            authorsContainer.appendChild(authorTag);
            
            // Eseménykezelő a szerző eltávolításához
            authorTag.querySelector('.remove-author').addEventListener('click', function(e) {
                e.stopPropagation();
                removeAuthor(author.uid);
            });
        });
    }
    
    /**
     * Eltávolít egy szerzőt a listából
     */
    function removeAuthor(uid) {
        if (!authorsInput) return;
        
        const currentValue = authorsInput.value;
        const authorIds = currentValue.split(',')
            .map(id => id.trim())
            .filter(id => id !== '' && id !== uid.toString());
        
        authorsInput.value = authorIds.join(', ');
        loadSelectedAuthors(); // Újratöltjük a listát
    }
}

/**
 * Megnyitja a szerzőválasztó modalt
 */
async function openAuthorsModal() {
    console.log('Szerzőválasztó modal megnyitása...');
    
    // Modal HTML létrehozása
    const modalHTML = `
        <div class="authors-modal active" id="authors-modal">
            <div class="authors-modal-content">
                <div class="authors-modal-header">
                    <h3>Szerzők kiválasztása</h3>
                    <button class="close-authors-modal" id="close-authors-modal">
                        <ion-icon name="close-outline"></ion-icon>
                    </button>
                </div>
                
                <div class="authors-modal-search">
                    <div class="search-input-wrapper">
                        <ion-icon name="search-outline"></ion-icon>
                        <input type="text" style="font-family: 'Abril Fatface';" id="search-authors-input" placeholder="Keresés szerzők között...">
                    </div>
                </div>
                
                <div class="authors-modal-list" id="authors-modal-list">
                    <div class="authors-loading">
                        <ion-icon name="sync-outline" class="loading-icon"></ion-icon>
                        <p style="font-family: 'Abril Fatface';">Szerzők betöltése...</p>
                    </div>
                </div>
                
                <div class="authors-modal-footer">
                    <button type="button" class="btn-secondary" id="cancel-authors-modal" style="font-family: 'Abril Fatface'; font-size: 16px">Mégse</button>
                    <button type="button" class="btn-primary" id="save-authors-modal" style="font-family: 'Abril Fatface'; font-size: 16px">Kiválasztás</button>
                </div>
            </div>
        </div>
    `;
    
    // Modal hozzáadása a body-hoz
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    
    // Modal elemek
    const modal = document.getElementById('authors-modal');
    const closeButton = document.getElementById('close-authors-modal');
    const cancelButton = document.getElementById('cancel-authors-modal');
    const saveButton = document.getElementById('save-authors-modal');
    const searchInput = document.getElementById('search-authors-input');
    const authorsList = document.getElementById('authors-modal-list');
    
    // Jelenleg kiválasztott szerzők
    let selectedAuthors = [];
    let allAuthors = [];
    
    // Betöltjük a szerzőket
    await loadAuthors();
    
    /**
     * Betölti az összes szerzőt
     */
    async function loadAuthors() {
        try {
            const token = await getAuthToken();
            if (!token) {
                showError('Nincs bejelentkezve');
                return;
            }
            
            const response = await fetch('/api/user/getall', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`API hiba: ${response.status}`);
            }
            
            const usersData = await response.json();
            allAuthors = Object.entries(usersData).map(([uid, user]) => ({
                uid: parseInt(uid),
                name: user.alias || user.full_name || `Felhasználó ${uid}`,
                email: user.email || '',
                roles: user.roles ? JSON.parse(user.roles).join(', ') : 'Nincs rang'
            }));
            
            // Betöltjük a már kiválasztott szerzőket
            const currentAuthors = document.getElementById('post-authors').value;
            if (currentAuthors && currentAuthors.trim() !== '') {
                const selectedIds = currentAuthors.split(',').map(id => id.trim()).filter(id => id !== '');
                selectedAuthors = allAuthors.filter(author => 
                    selectedIds.includes(author.uid.toString())
                );
            }
            
            displayAuthors(allAuthors);
            
        } catch (error) {
            console.error('Hiba a szerzők betöltése során:', error);
            showError('Hiba történt a szerzők betöltése során');
        }
    }
    
    /**
     * Megjeleníti a szerzőket a listában
     */
    function displayAuthors(authors) {
        if (!authors || authors.length === 0) {
            authorsList.innerHTML = `
                <div class="authors-empty">
                    <ion-icon name="people-outline"></ion-icon>
                    <p>Nincsenek elérhető szerzők</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        authors.forEach(author => {
            const isSelected = selectedAuthors.some(selected => selected.uid === author.uid);
            
            html += `
                <div class="author-item ${isSelected ? 'selected' : ''}" data-uid="${author.uid}">
                    <input type="checkbox" class="author-checkbox" id="author-${author.uid}" 
                           ${isSelected ? 'checked' : ''}>
                    <div class="author-info">
                        <div class="author-name">${author.name}</div>
                        <div class="author-email">${author.email}</div>
                        <div class="author-roles">${author.roles}</div>
                    </div>
                </div>
            `;
        });
        
        authorsList.innerHTML = html;
        
        // Eseménykezelők a checkbox-okhoz
        authorsList.querySelectorAll('.author-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const uid = parseInt(this.closest('.author-item').dataset.uid);
                const author = allAuthors.find(a => a.uid === uid);
                
                if (this.checked) {
                    selectedAuthors.push(author);
                    this.closest('.author-item').classList.add('selected');
                } else {
                    selectedAuthors = selectedAuthors.filter(a => a.uid !== uid);
                    this.closest('.author-item').classList.remove('selected');
                }
            });
        });
        
        // Kattintás a teljes sorra is
        authorsList.querySelectorAll('.author-item').forEach(item => {
            item.addEventListener('click', function(e) {
                if (e.target.type !== 'checkbox') {
                    const checkbox = this.querySelector('.author-checkbox');
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });
        });
    }
    
    /**
     * Hiba megjelenítése
     */
    function showError(message) {
        authorsList.innerHTML = `
            <div class="authors-error">
                <ion-icon name="alert-circle-outline"></ion-icon>
                <p>${message}</p>
                <button type="button" class="btn-secondary" onclick="location.reload()" 
                        style="margin-top: 20px; font-family: 'Abril Fatface'; background-color: green">
                    Újrapróbálkozás
                </button>
            </div>
        `;
    }
    
    /**
     * Keresés a szerzők között
     */
    function searchAuthors(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        if (term === '') {
            displayAuthors(allAuthors);
            return;
        }
        
        const filteredAuthors = allAuthors.filter(author => 
            author.name.toLowerCase().includes(term) || 
            author.email.toLowerCase().includes(term) ||
            author.roles.toLowerCase().includes(term)
        );
        
        displayAuthors(filteredAuthors);
    }
    
    /**
     * Mentés és modal bezárása
     */
    function saveAndClose() {
        // Frissítjük a rejtett mezőt
        const authorIds = selectedAuthors.map(a => a.uid).join(', ');
        document.getElementById('post-authors').value = authorIds;
        
        // Frissítjük a kiválasztott szerzők megjelenítését
        if (typeof initializeAuthorSelector === 'function') {
            initializeAuthorSelector();
        }
        
        // Modal bezárása
        closeModal();
    }
    
    /**
     * Modal bezárása
     */
    function closeModal() {
        modal.classList.remove('active');
        setTimeout(() => {
            modalContainer.remove();
        }, 300);
    }
    
    // Eseménykezelők
    closeButton.addEventListener('click', closeModal);
    cancelButton.addEventListener('click', closeModal);
    saveButton.addEventListener('click', saveAndClose);
    
    // Keresés eseménykezelő
    searchInput.addEventListener('input', function() {
        searchAuthors(this.value);
    });
    
    // Enter lenyomásával is kereshetünk
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchAuthors(this.value);
        }
    });
    
    // Modal bezárása kattintással kívülre
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
    
    // ESC billentyűvel is bezárható
    document.addEventListener('keydown', function onEsc(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', onEsc);
        }
    });
    
    // Fókusz a keresőmezőre
    setTimeout(() => {
        searchInput.focus();
    }, 100);
}

/**
 * A formátumozó függvény módosítása
 * (Már nem kell, mert most nem stringet kell formázni)
 */
function formatAuthorsString(authorsInput) {
    console.log('Szerzők formázása, bemenet:', authorsInput);
    
    if (!authorsInput || authorsInput.trim() === '') {
        console.log('Üres szerző lista - üres stringet visszaadunk');
        return ''; // Fontos: üres stringet kell visszaadni, nem null-t
    }
    
    // A szerzők már formázottan jönnek a modal-ból
    // Csak ellenőrizzük, hogy érvényes-e
    const authorsArray = authorsInput.split(',')
        .map(id => id.trim())
        .filter(id => {
            const num = parseInt(id);
            return id !== '' && !isNaN(num) && num > 0;
        })
        .map(id => parseInt(id));
    
    console.log('Formázott szerzők tömb:', authorsArray);
    
    if (authorsArray.length === 0) {
        return '';
    }
    
    return authorsArray.join(', ');
}

async function loadReviewsNavItem() {
    console.log('Lektorálás menüpont betöltése ellenőrzéssel...');
    
    // Ellenőrizzük a jogosultságot
    const hasPermission = await checkReviewPermissions();
    const navPlaceholder = document.getElementById('reviews-nav-placeholder');
    
    if (!navPlaceholder) {
        console.error('reviews-nav-placeholder nem található');
        return;
    }
    
    if (hasPermission) {
        console.log('Felhasználónak van lektorálási joga, menüpont megjelenítése');
        
        // HTML beszúrása
        const reviewsHTML = `
            <li class="navList" data-target="reviews">
                <a href="#">
                    <ion-icon name="checkmark-circle-outline"></ion-icon>
                    <span class="links">Lektorálás</span>
                    <span class="notification-badge" id="review-notifications">0</span>
                </a>
            </li>
        `;
        
        // Beszúrás a menübe (a Poszt létrehozása után)
        const navLinks = document.querySelector('.navLinks');
        const createPostItem = document.querySelector('[data-target="create-post"]');
        
        if (navLinks && createPostItem) {
            // Ha már létezik, eltávolítjuk (duplikáció elkerülése)
            const existingReviews = navLinks.querySelector('[data-target="reviews"]');
            if (existingReviews) {
                existingReviews.remove();
            }
            
            // Új beszúrás
            createPostItem.insertAdjacentHTML('afterend', reviewsHTML);
            
            // Eseménykezelő hozzáadása az új menüponthoz
            const reviewsNavItem = navLinks.querySelector('[data-target="reviews"]');
            if (reviewsNavItem) {
                reviewsNavItem.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    // Aktív állapot beállítása
                    document.querySelectorAll(".navList").forEach(function(e) {
                        e.classList.remove('active');
                    });
                    this.classList.add('active');
                    
                    // Oldalsáv bezárása mobilon
                    if (window.innerWidth <= 768) {
                        const sidebar = document.getElementById('sidebar');
                        if (sidebar) {
                            sidebar.classList.remove('active');
                        }
                    }
                    
                    // Oldal megjelenítése
                    document.querySelectorAll(".data-table, .overview").forEach(function(section) {
                        section.style.display = 'none';
                    });
                    
                    const reviewsSection = document.getElementById('reviews');
                    if (reviewsSection) {
                        reviewsSection.style.display = 'block';
                        updatePageDescription('reviews');
                        
                        // Lektorálási lista betöltése
                        setTimeout(() => {
                            loadPendingReviews();
                        }, 300);
                    }
                });
            }
        }
        
        // Betöltjük a lektorálás oldalt is
        ensureReviewsSection();
        
    } else {
        console.log('Felhasználónak nincs lektorálási joga, menüpont elrejtése');
        hideReviewsMenuItem();
    }
}

// Ellenőrzi, hogy létezik-e a lektorálás szekció, ha nem, létrehozza
function ensureReviewsSection() {
    let reviewsSection = document.getElementById('reviews');
    if (!reviewsSection) {
        const container = document.querySelector('.container');
        if (container) {
            // HTML beszúrása az "articles" után
            const articlesSection = document.getElementById('articles');
            if (articlesSection) {
                const reviewsHTML = `
                    <!-- Lektorálás -->
                    <div class="data-table" id="reviews" style="display:none">
                        <div class="table-header">
                            <div class="title">
                                <ion-icon name="checkmark-circle-outline"></ion-icon>
                                <span class="text">Lektorálás</span>
                            </div>
                            <div class="review-actions">
                                <button class="btn-secondary" id="refresh-reviews-btn">
                                    <ion-icon name="refresh-outline"></ion-icon>
                                    Frissítés
                                </button>
                            </div>
                        </div>
                        
                        <!-- Szűrők -->
                        <div class="reviews-filter">
                            <button class="filter-btn active" data-filter="pending">Függőben lévők</button>
                            <button class="filter-btn" data-filter="edited">Szerkesztések</button>
                            <button class="filter-btn" data-filter="all">Összes</button>
                        </div>
                        
                        <!-- Tartalom konténer -->
                        <div class="reviews-container" id="reviews-container">
                            <div class="loading-state" id="reviews-loading">
                                <ion-icon name="sync-outline" class="loading-icon"></ion-icon>
                                <p>Lektorálási lista betöltése...</p>
                            </div>
                        </div>
                    </div>
                `;
                
                articlesSection.insertAdjacentHTML('afterend', reviewsHTML);
                
                // Eseménykezelő a frissítés gombhoz
                setTimeout(() => {
                    document.getElementById('refresh-reviews-btn')?.addEventListener('click', function() {
                        loadPendingReviews();
                    });
                }, 100);
            }
        }
    }
}



// Cseréld le a checkReviewPermissions() függvényt ezzel a javított verzióval:
async function checkReviewPermissions() {
    console.log('===== Lektorálási jogosultság ellenőrzése =====');
    
    const token = await getAuthToken();
    if (!token) {
        console.error('Nincs token a jogosultságok ellenőrzéséhez');
        return false;
    }
    
    try {
        console.log('Jogosultság API hívás indítása...');
        const response = await fetch('/api/user/get', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                get: 'roles'
            })
        });
        
        console.log('Jogosultság API válasz státusz:', response.status);
        
        if (!response.ok) {
            console.error('Hiba a jogosultságok lekérése során:', response.status);
            return false;
        }
        
        const data = await response.json();
        console.log('API válasz teljes:', data);
        
        // Ellenőrizzük a válasz struktúrát
        if (!data) {
            console.error('Üres válasz érkezett');
            return false;
        }
        
        let rolesArray = [];
        
        // 1. Ha a roles már tömb formátumban van
        if (Array.isArray(data.roles)) {
            rolesArray = data.roles;
        } 
        // 2. Ha a roles stringként van (JSON string)
        else if (typeof data.roles === 'string') {
            try {
                // Először próbáljuk meg parse-olni JSON-ként
                rolesArray = JSON.parse(data.roles);
                
                // Ha nem tömb, akkor vesszővel elválasztott string
                if (!Array.isArray(rolesArray)) {
                    console.log('A parse-olt érték nem tömb, vesszővel elválasztott stringként kezeljük');
                    rolesArray = data.roles.split(',').map(role => role.trim());
                }
            } catch (e) {
                console.log('JSON parse hiba, vesszővel elválasztott stringként kezeljük:', e);
                rolesArray = data.roles.split(',').map(role => role.trim());
            }
        }
        // 3. Ha a roles nem szerepel, de van user objektum
        else if (data.user && data.user.roles) {
            rolesArray = Array.isArray(data.user.roles) ? data.user.roles : data.user.roles.split(',');
        }
        // 4. Ha a teljes válasz egy objektum ami tartalmazza a rangokat
        else if (data.roles && typeof data.roles === 'object' && !Array.isArray(data.roles)) {
            // Konvertáljuk a kulcsokat tömbbé
            rolesArray = Object.keys(data.roles);
        }
        
        console.log('Feldolgozott rangok:', rolesArray);
        
        if (rolesArray.length === 0) {
            console.log('Nincs rang definiálva a felhasználónak');
            return false;
        }
        
        // Ellenőrizzük, hogy van-e valamelyik szükséges jogosultság
        const requiredRoles = ['lector', 'director', '*'];
        const hasPermission = rolesArray.some(role => 
            requiredRoles.some(requiredRole => 
                role.toLowerCase().includes(requiredRole.toLowerCase())
            )
        );
        
        console.log('Szükséges rangok:', requiredRoles);
        console.log('Felhasználó rangjai:', rolesArray);
        console.log('Van jogosultság lektoráláshoz?', hasPermission);
        
        return hasPermission;
        
    } catch (error) {
        console.error('Hiba a jogosultságok ellenőrzése során:', error);
        return false;
    }
}








/**
 * Betölti a lektorálásra váró posztokat
 */
async function loadPendingReviews() {
    console.log('Lektorálásra váró posztok betöltése...');
    
    const container = document.getElementById('reviews-container');
    const loadingElement = document.getElementById('reviews-loading');
    
    if (!container) {
        console.error('reviews-container nem található');
        return;
    }
    
    // Jogosultság ellenőrzése
    const hasPermission = await checkReviewPermissions();
    if (!hasPermission) {
        console.warn('Felhasználónak nincs jogosultsága a lektoráláshoz!');
        
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <ion-icon name="lock-closed-outline" style="font-size: 48px; color: #666; margin-bottom: 16px;"></ion-icon>
                    <h3>Nincs jogosultságod</h3>
                    <p>Csak lektorok és direktorok érhetik el ezt a funkciót.</p>
                </div>
            `;
        }
        return;
    }
    
    try {
        // Megjelenítjük a betöltési állapotot
        if (loadingElement) {
            loadingElement.innerHTML = `
                <ion-icon name="sync-outline" class="loading-icon"></ion-icon>
                <p>Lektorálási lista betöltése...</p>
            `;
            loadingElement.style.display = 'flex';
        }
        
        const token = await getAuthToken();
        if (!token) {
            throw new Error('Nincs érvényes token');
        }
        
        // 1. Függőben lévő posztok betöltése
        console.log('Függőben lévő posztok lekérése...');
        const pendingResponse = await fetch('/api/post/get/pending', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Pending response status:', pendingResponse.status);
        
        // 2. Szerkesztésre váró posztok betöltése
        console.log('Szerkesztésre váró posztok lekérése...');
        const editedResponse = await fetch('/api/post/get/edited', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Edited response status:', editedResponse.status);
        
        // Hibakezelés mindkét válaszhoz
        if (!pendingResponse.ok) {
            console.error('Pending API hiba:', pendingResponse.status, pendingResponse.statusText);
            if (pendingResponse.status === 500) {
                throw new Error('Szerverhiba a függőben lévő posztok lekérése során');
            }
        }
        
        if (!editedResponse.ok) {
            console.error('Edited API hiba:', editedResponse.status, editedResponse.statusText);
            if (editedResponse.status === 500) {
                throw new Error('Szerverhiba a szerkesztésre váró posztok lekérése során');
            }
        }
        
        // Próbáljuk meg parse-olni a válaszokat
        let pendingData = {};
        let editedData = {};
        
        try {
            if (pendingResponse.ok) {
                pendingData = await pendingResponse.json();
                console.log('Függőben lévő posztok:', pendingData);
            }
        } catch (jsonError) {
            console.error('Hiba a pending JSON parse során:', jsonError);
            pendingData = {};
        }
        
        try {
            if (editedResponse.ok) {
                editedData = await editedResponse.json();
                console.log('Szerkesztésre váró posztok:', editedData);
            }
        } catch (jsonError) {
            console.error('Hiba az edited JSON parse során:', jsonError);
            editedData = {};
        }
        
        // Betöltés befejezése
        if (loadingElement) loadingElement.style.display = 'none';
        
        // Adatok megjelenítése
await displayReviews(pendingData, editedData, container);        
        // Értesítések számának frissítése
        updateReviewNotifications(pendingData, editedData);
        
    } catch (error) {
        console.error('Hiba a lektorálási lista betöltése során:', error);
        
        if (loadingElement) loadingElement.style.display = 'none';
        
        const errorMessage = error.message || 'Ismeretlen hiba történt';
        
        container.innerHTML = `
            <div class="empty-state error">
                <ion-icon name="alert-circle-outline" style="font-size: 48px; color: #e74c3c; margin-bottom: 16px;"></ion-icon>
                <h3>Hiba történt</h3>
                <p>${errorMessage}</p>
                <p style="font-size: 12px; margin-top: 10px; color: #666;">
                    Kérjük, próbálkozz újra később, vagy lépj kapcsolatba a rendszergazdával.
                </p>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="btn-secondary" onclick="loadPendingReviews()">
                        <ion-icon name="refresh-outline"></ion-icon>
                        Újrapróbálkozás
                    </button>
                    <button class="btn-primary" onclick="window.location.reload()">
                        <ion-icon name="reload-outline"></ion-icon>
                        Oldal újratöltése
                    </button>
                </div>
            </div>
        `;
    }
}

async function debugPendingReviews() {
    const token = await getAuthToken();
    if (!token) {
        console.error('Nincs token');
        return;
    }
    
    console.log('=== API DEBUG ===');
    
    try {
        // Teszteljük külön a két végpontot
        console.log('1. Teszt: /api/post/get/pending');
        const pendingTest = await fetch('/api/post/get/pending', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Status:', pendingTest.status);
        console.log('Status Text:', pendingTest.statusText);
        console.log('Headers:', Object.fromEntries(pendingTest.headers.entries()));
        
        const pendingText = await pendingTest.text();
        console.log('Response (first 500 chars):', pendingText.substring(0, 500));
        
        console.log('\n2. Teszt: /api/post/get/edited');
        const editedTest = await fetch('/api/post/get/edited', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Status:', editedTest.status);
        console.log('Status Text:', editedTest.statusText);
        console.log('Headers:', Object.fromEntries(editedTest.headers.entries()));
        
        const editedText = await editedTest.text();
        console.log('Response (first 500 chars):', editedText.substring(0, 500));
        
    } catch (error) {
        console.error('Debug hiba:', error);
    }
}

// Hívás hozzáadása
setTimeout(() => {
    debugPendingReviews();
}, 2000);
/**
 * Megjeleníti a lektorálásra váró posztokat
 */
// A régi, hibás kód helyett használd ezt:
async function displayReviews(pendingData, editedData, container) {
    if ((!pendingData || Object.keys(pendingData).length === 0) && 
        (!editedData || Object.keys(editedData).length === 0)) {
        container.innerHTML = `
            <div class="empty-state">
                <ion-icon name="checkmark-done-outline" style="font-size: 48px; color: #666; margin-bottom: 16px;"></ion-icon>
                <h3>Nincs lektorálásra váró anyag</h3>
                <p>Minden posztot lektoráltak, vagy nincsenek új beküldések.</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="reviews-grid">
            <div class="review-section" id="pending-section">
                <h3 class="section-title">
                    <ion-icon name="time-outline"></ion-icon>
                    Függőben lévő posztok (${Object.keys(pendingData || {}).length})
                </h3>
                <div class="review-cards" id="pending-cards">
    `;
    
    // Függőben lévő posztok
    if (pendingData && Object.keys(pendingData).length > 0) {
        // ASZINKRON KEZELÉS: Minden poszthoz külön kérjük le a szerzőket
        const pendingEntries = Object.entries(pendingData);
        
        for (const [pid, post] of pendingEntries) {
            const createdDate = formatDate(post.created || new Date().toISOString());
            
            // Szerzők neveinek aszinkron lekérése
            let authorsText = 'Nincs szerző';
            if (post.authors && post.authors.length > 0) {
                try {
                    authorsText = await getAuthorsNames(post.authors);
                } catch (error) {
                    console.error(`Hiba a szerzők neveinek lekérésekor (PID: ${pid}):`, error);
                    authorsText = `${post.authors.length} szerző`;
                }
            }
            
            html += `
                <div class="review-card pending" data-pid="${pid}" data-type="pending">
                    <div class="review-card-header">
                        <div class="review-card-title">${post.title || 'Cím nélkül'}</div>
                        <div class="review-card-meta">
                            <span class="review-card-category">${post.category || 'Nincs kategória'}</span>
                            <span class="review-card-date">${createdDate}</span>
                        </div>
                    </div>
                    
                    <div class="review-card-content">
                        <p class="review-card-excerpt">${post.minimal_desc || 'Nincs leírás...'}</p>
                        <div class="review-card-authors">
                            <ion-icon name="people-outline"></ion-icon>
                            <span>Szerzők: ${authorsText}</span>
                        </div>
                    </div>
                    
                    <div class="review-card-actions">
                        <button class="btn-action review-view" onclick="viewReviewPost(${pid})">
                            <ion-icon name="eye-outline"></ion-icon>
                        </button>
                        <button class="btn-success review-approve" onclick="approveReviewPost2(${pid})">
                            <ion-icon name="checkmark-outline"></ion-icon>
                            <span style="font-family: 'Abril Fatface'">Elfogadás</span>
                        </button>
                        <button class="btn-danger review-delete" onclick="deleteReviewPost(${pid})">
                            <ion-icon name="trash-outline"></ion-icon>
                            <span style="font-family: 'Abril Fatface'">Törlés</span>
                        </button>
                    </div>
                </div>
            `;
        }
    } else {
        html += `
            <div class="empty-subsection">
                <ion-icon name="checkmark-circle-outline"></ion-icon>
                <p>Nincsenek függőben lévő posztok. Yippí!</p>
            </div>
        `;
    }
    
    html += `
                </div>
            </div>
            
            <!-- Szerkesztésre váró posztok -->
            <div class="review-section" id="edited-section">
                <h3 class="section-title">
                    <ion-icon name="create-outline"></ion-icon>
                    Szerkesztésre váró posztok (${Object.keys(editedData || {}).length})
                </h3>
                <div class="review-cards" id="edited-cards">
    `;
    
    // Szerkesztésre váró posztok
    if (editedData && Object.keys(editedData).length > 0) {
        const editedEntries = Object.entries(editedData);
        
        for (const [pid, post] of editedEntries) {
            const createdDate = formatDate(post.created || new Date().toISOString());
            
            // Szerzők neveinek aszinkron lekérése
            let authorsText = 'Nincs szerző';
            if (post.authors && post.authors.length > 0) {
                try {
                    authorsText = await getAuthorsNames(post.authors);
                } catch (error) {
                    console.error(`Hiba a szerzők neveinek lekérésekor (PID: ${pid}):`, error);
                    authorsText = `${post.authors.length} szerző`;
                }
            }
            
            html += `
                <div class="review-card edited" data-pid="${pid}" data-type="edited">
                    <div class="review-card-header">
                        <div class="review-card-title">${post.title || 'Cím nélkül'}</div>
                        <div class="review-card-meta">
                            <span class="review-card-category">${post.category || 'Nincs kategória'}</span>
                            <span class="review-card-date">${createdDate}</span>
                        </div>
                    </div>
                    
                    <div class="review-card-content">
                        <p class="review-card-excerpt">${post.minimal_desc || 'Nincs leírás...'}</p>
                        <div class="review-card-authors">
                            <ion-icon name="people-outline"></ion-icon>
                            <span>Szerzők: ${authorsText}</span>
                        </div>
                        <div class="review-card-notice">
                            <ion-icon name="alert-circle-outline"></ion-icon>
                            <span>Ezt a posztot szerkesztették, ellenőrizd a változtatásokat!</span>
                        </div>
                    </div>
                    
                    <div class="review-card-actions">
                        <button class="btn-action review-view" onclick="viewEditedPost(${pid})">
                            <ion-icon name="eye-outline"></ion-icon>
                            Szerkesztés megtekintése
                        </button>
                        <button class="btn-primary review-edit" onclick="editReviewPost(${pid})">
                            <ion-icon name="create-outline"></ion-icon>
                            Szerkesztés elfogadása
                        </button>
                        <button class="btn-danger review-delete" onclick="deleteReviewPost(${pid})">
                            <ion-icon name="trash-outline"></ion-icon>
                            Törlés
                        </button>
                    </div>
                </div>
            `;
        }
    } else {
        html += `
            <div class="empty-subsection">
                <ion-icon name="checkmark-circle-outline"></ion-icon>
                <p>Nincsenek szerkesztésre váró posztok. Yippí!</p>
            </div>
        `;
    }
    
    html += `
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Szűrők beállítása
    setupReviewFilters();
}

/**
 * Frissíti az értesítések számát
 */
function updateReviewNotifications(pendingData, editedData) {
    const pendingCount = Object.keys(pendingData || {}).length;
    const editedCount = Object.keys(editedData || {}).length;
    const totalCount = pendingCount + editedCount;
    
    const notificationBadge = document.getElementById('review-notifications');
    if (notificationBadge) {
        notificationBadge.textContent = totalCount;
        if (totalCount > 0) {
            notificationBadge.style.display = 'inline-block';
        } else {
            notificationBadge.style.display = 'none';
        }
    }
}

/**
 * Szerzők listájának szöveggé alakítása
 */
function getAuthorsText(authorsArray) {
    if (!authorsArray || authorsArray.length === 0) {
        return 'Nincs szerző';
    }
    
    if (authorsArray.length === 1) {
        return `1 szerző`;
    }
    
    return `${authorsArray.length} szerző`;
}

/**
 * Szűrők beállítása
 */
function setupReviewFilters() {
    const filterButtons = document.querySelectorAll('.reviews-filter .filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Aktív gomb frissítése
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.dataset.filter;
            const pendingSection = document.getElementById('pending-section');
            const editedSection = document.getElementById('edited-section');
            
            if (filter === 'all') {
                if (pendingSection) pendingSection.style.display = 'block';
                if (editedSection) editedSection.style.display = 'block';
            } else if (filter === 'pending') {
                if (pendingSection) pendingSection.style.display = 'block';
                if (editedSection) editedSection.style.display = 'none';
            } else if (filter === 'edited') {
                if (pendingSection) pendingSection.style.display = 'none';
                if (editedSection) editedSection.style.display = 'block';
            }
        });
    });
}

/**
 * Poszt megtekintése lektoráláshoz
 */
async function viewReviewPost(pid) {
    console.log(`Poszt megtekintése lektoráláshoz: ${pid}`);
    // Átirányítás a szerkesztő felületre
    window.location.href = `review-editor.html?pid=${pid}&type=pending`;
}

/**
 * Szerkesztett poszt megtekintése
 */
async function viewEditedPost(pid) {
    console.log(`Szerkesztett poszt megtekintése: ${pid}`);
    
    //majd ez jó lesz     window.location.href = `review-editor.html?pid=${pid}&type=edited`;
    try {
        const token = await getAuthToken();
        
        // A szerkesztett verziót kérjük le
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
        
       if (response.ok) {
    const post = await response.json();
    showEditReviewModal(post, pid);
        } else {
            alert('Hiba történt a szerkesztett tartalom betöltése során!');
        }
    } catch (error) {
        console.error('Hiba a szerkesztett poszt megtekintése során:', error);
        alert('Hiba történt!');
    }
}

/**
 * Szerkesztés elfogadása (lektor/director által)
 */
async function editReviewPost(pid) {
    if (!confirm('Biztosan szeretnéd elfogadni a szerkesztést? Ez azonnal érvénybe lép, és a változtatások láthatóvá válnak.')) {
        return;
    }
    
    try {
        const token = await getAuthToken();
        
        // Először lekérjük a szerkesztett verziót
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
        
        if (!response.ok) {
            throw new Error('Nem sikerült lekérni a szerkesztett verziót');
        }
        
        const editedPost = await response.json();
        
        // Összeállítjuk a frissítendő adatokat
        const updateData = {
            post: parseInt(pid)
        };
        
        if (editedPost.title) updateData.title = editedPost.title;
        if (editedPost.category) updateData.category = editedPost.category;
        if (editedPost.number) updateData.number = editedPost.number;
        if (editedPost.minimal_desc) updateData.minimal_desc = editedPost.minimal_desc;
        if (editedPost.desc) updateData.desc = editedPost.desc;
        if (editedPost.image) updateData.image = editedPost.image;
        
        // API hívás a szerkesztés elfogadásához
        const editResponse = await fetch('/api/post/edit', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });
        
        if (editResponse.ok) {
            const result = await editResponse.json();
            alert('Szerkesztés sikeresen elfogadva!');
            
            // Lista frissítése
            loadPendingReviews();
        } else {
            const error = await editResponse.text();
            alert(`Hiba: ${error}`);
        }
        
    } catch (error) {
        console.error('Hiba a szerkesztés elfogadása során:', error);
        alert('Hiba történt a szerkesztés elfogadása során!');
    }
}

/**
 * Poszt elfogadása
 */
async function approveReviewPost(pid) {
    if (!confirm('Biztosan elfogadod ezt a posztot? Ezzel láthatóvá válik a felhasználók számára.')) {
        return;
    }
    
    try {
        const token = await getAuthToken();
        
        const response = await fetch('/api/post/approve', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ post: parseInt(pid) })
        });
        
        if (response.ok) {
            const result = await response.json();
            alert('Poszt sikeresen elfogadva!');
            
            // Lista frissítése
            loadPendingReviews();
        } else {
            const error = await response.text();
            alert(`Hiba: ${error}`);
        }
        
    } catch (error) {
        console.error('Hiba a poszt elfogadása során:', error);
        alert('Hiba történt a poszt elfogadása során!');
    }
}

/**
 * Poszt törlése
 */
async function deleteReviewPost(pid) {

    
    
    try {

        const result = await showConfirmModal({
            title: 'Poszt törlése',
            message: 'Biztosan törölni szeretnéd engedni ezt a posztot?',
            subMessage: 'Törölve lesz az adatbázosból véglegesen.',
            icon: 'trash-outline',
            confirmText: 'Igen, törlöm',
            cancelText: 'Mégse'
        });
        const token = await getAuthToken();
        
        const response = await fetch('/api/post/delete', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ post: parseInt(pid) })
        });
        
        if (response.ok) {
            const result = await response.json();
            alert('Poszt sikeresen törölve!');
            
            // Lista frissítése
            loadPendingReviews();
        } else {
            const error = await response.text();
            alert(`Hiba: ${error}`);
        }
        
    } catch (error) {
        console.error('Hiba a poszt törlése során:', error);
        alert('Hiba történt a poszt törlése során!');
    }
}

/**
 * Modal megjelenítése a szerkesztett tartalomhoz
 */
/**
 * Modal megjelenítése a szerkesztett tartalomhoz - TELJES SZERKESZTŐ
 */
async function showEditReviewModal(post, pid) {
    const modalHTML = `
        <div class="edit-review-modal active" id="edit-review-modal-${pid}">
            <div class="edit-review-modal-content">
                <div class="edit-review-modal-header">
                    <h3>Szerkesztés ellenőrzése - ${post.title || 'Cím nélkül'}</h3>
                    <button class="close-edit-review-modal">
                        <ion-icon name="close-outline"></ion-icon>
                    </button>
                </div>
                
                <div class="edit-review-modal-body">
                    <div class="edit-review-info">
                        <div class="info-row">
                            <span class="info-label">Poszt ID:</span>
                            <span class="info-value">${pid}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Lapszám:</span>
                            <span class="info-value">${post.number || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Kategória:</span>
                            <span class="info-value">${post.category || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Létrehozva:</span>
                            <span class="info-value">${formatDate(post.created)}</span>
                        </div>
                        ${post.last_edited ? `
                        <div class="info-row">
                            <span class="info-label">Utolsó szerkesztés:</span>
                            <span class="info-value">${formatDate(post.last_edited)}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="edit-review-content">
                        <!-- Szerkesztő űrlap -->
                        <form id="edit-post-form-${pid}" class="edit-post-form">
                            <div class="form-group">
                                <label for="edit-title-${pid}">Cím</label>
                                <input type="text" id="edit-title-${pid}" value="${post.title || ''}" class="form-control">
                            </div>
                            
                            <div class="form-group">
                                <label for="edit-excerpt-${pid}">Rövid leírás</label>
                                <textarea id="edit-excerpt-${pid}" rows="3" class="form-control">${post.minimal_desc || ''}</textarea>
                            </div>
                            
                            <div class="form-group">
                                <label for="edit-content-${pid}">Tartalom</label>
                                <div class="editor-toolbar">
                                    <button type="button" class="toolbar-btn" onclick="formatText('bold', 'edit-content-${pid}')"><strong>B</strong></button>
                                    <button type="button" class="toolbar-btn" onclick="formatText('italic', 'edit-content-${pid}')"><em>I</em></button>
                                    <button type="button" class="toolbar-btn" onclick="insertList('edit-content-${pid}')">• Lista</button>
                                    <button type="button" class="toolbar-btn" onclick="insertLink('edit-content-${pid}')">🔗 Link</button>
                                </div>
                                <textarea id="edit-content-${pid}" rows="12" class="form-control">${post.desc || ''}</textarea>
                            </div>
                            
                            <div class="form-group">
                                <label for="edit-category-${pid}">Kategória</label>
                                <input type="text" id="edit-category-${pid}" value="${post.category || ''}" class="form-control">
                            </div>
                            
                            <!-- Diff megjelenítés opció -->
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="show-diff-${pid}" onchange="toggleDiffView(${pid})">
                                    Változtatások megjelenítése (összehasonlítás)
                                </label>
                            </div>
                            
                            <!-- Diff view container -->
                            <div id="diff-container-${pid}" style="display: none; margin-top: 20px;">
                                <h4>Változtatások összehasonlítása</h4>
                                <div class="diff-view" id="diff-view-${pid}" style="
                                    background: #f8f9fa;
                                    border: 1px solid #ddd;
                                    border-radius: 8px;
                                    padding: 15px;
                                    max-height: 300px;
                                    overflow-y: auto;
                                "></div>
                            </div>
                            
                            <div class="edit-review-notes">
                                <label for="edit-notes-${pid}">Megjegyzések a szerkesztéshez</label>
                                <textarea id="edit-notes-${pid}" rows="3" placeholder="Ide írd a megjegyzéseidet a szerkesztésről..." class="form-control"></textarea>
                            </div>
                        </form>
                    </div>
                </div>
                
                <div class="edit-review-modal-footer">
                    <button type="button" class="btn-secondary close-modal-btn">Bezárás</button>
                    <button type="button" class="btn-danger" onclick="rejectEdit(${pid})" style="margin-right: auto;">
                        <ion-icon name="close-outline"></ion-icon>
                        Szerkesztés elutasítása
                    </button>
                    <button type="button" class="btn-success" onclick="saveAndApproveEdit(${pid})">
                        <ion-icon name="checkmark-outline"></ion-icon>
                        Mentés és publikálás
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    
    // Az eredeti tartalom elmentése a diff-hez
    window.originalPostContent = {
        title: post.title || '',
        content: post.desc || '',
        excerpt: post.minimal_desc || '',
        category: post.category || ''
    };
    
    // Eseménykezelők
    const closeButtons = modalContainer.querySelectorAll('.close-edit-review-modal, .close-modal-btn');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modalContainer.remove();
        });
    });
    
    // Kattintás a modalon kívül
    modalContainer.querySelector('.edit-review-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            modalContainer.remove();
        }
    });
    
    // ESC billentyű
    document.addEventListener('keydown', function onEsc(e) {
        if (e.key === 'Escape') {
            modalContainer.remove();
            document.removeEventListener('keydown', onEsc);
        }
    });
}

/**
 * Text formázó segédfüggvények
 */
function formatText(command, textareaId) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;
    
    textarea.focus();
    
    if (command === 'bold') {
        insertText(textarea, '**', '**');
    } else if (command === 'italic') {
        insertText(textarea, '_', '_');
    }
}

function insertText(textarea, startTag, endTag) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    const newText = textarea.value.substring(0, start) + 
                    startTag + selectedText + endTag + 
                    textarea.value.substring(end);
    
    textarea.value = newText;
    textarea.selectionStart = start + startTag.length;
    textarea.selectionEnd = end + startTag.length;
    textarea.focus();
}

function insertList(textareaId) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;
    
    textarea.focus();
    const start = textarea.selectionStart;
    const newText = textarea.value.substring(0, start) + 
                    '\n• ' + 
                    textarea.value.substring(start);
    
    textarea.value = newText;
    textarea.selectionStart = start + 3;
    textarea.selectionEnd = start + 3;
}

function insertLink(textareaId) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;
    
    const url = prompt('Adja meg a URL-t:', 'https://');
    if (!url) return;
    
    const text = prompt('Adja meg a link szövegét:', 'link');
    if (text === null) return;
    
    textarea.focus();
    const start = textarea.selectionStart;
    const linkText = `[${text}](${url})`;
    
    const newText = textarea.value.substring(0, start) + 
                    linkText + 
                    textarea.value.substring(textarea.selectionEnd);
    
    textarea.value = newText;
    textarea.selectionStart = start + linkText.length;
    textarea.selectionEnd = start + linkText.length;
}

/**
 * Diff nézet váltása
 */
function toggleDiffView(pid) {
    const checkbox = document.getElementById(`show-diff-${pid}`);
    const diffContainer = document.getElementById(`diff-container-${pid}`);
    const diffView = document.getElementById(`diff-view-${pid}`);
    
    if (checkbox.checked) {
        diffContainer.style.display = 'block';
        
        // Jelenlegi tartalom lekérése
        const currentTitle = document.getElementById(`edit-title-${pid}`).value;
        const currentContent = document.getElementById(`edit-content-${pid}`).value;
        const currentExcerpt = document.getElementById(`edit-excerpt-${pid}`).value;
        
        // Diff generálása
        let diffHTML = `
            <div style="margin-bottom: 15px;">
                <h5 style="margin: 0 0 5px 0; color: #666;">Cím változások:</h5>
                <div style="padding: 8px; background: white; border-radius: 4px;">
                    <span style="color: #dc3545; text-decoration: line-through;">${window.originalPostContent.title}</span><br>
                    <span style="color: #28a745;">${currentTitle}</span>
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <h5 style="margin: 0 0 5px 0; color: #666;">Leírás változások:</h5>
                <div style="padding: 8px; background: white; border-radius: 4px; max-height: 100px; overflow-y: auto;">
                    <span style="color: #dc3545; text-decoration: line-through;">${window.originalPostContent.excerpt}</span><br>
                    <span style="color: #28a745;">${currentExcerpt}</span>
                </div>
            </div>
            
            <div>
                <h5 style="margin: 0 0 5px 0; color: #666;">Tartalom változások:</h5>
                <div style="padding: 8px; background: white; border-radius: 4px; max-height: 150px; overflow-y: auto; font-size: 12px;">
                    <div style="color: #dc3545; text-decoration: line-through;">
                        ${window.originalPostContent.content.substring(0, 500)}${window.originalPostContent.content.length > 500 ? '...' : ''}
                    </div>
                    <hr style="margin: 5px 0; border-color: #ddd;">
                    <div style="color: #28a745;">
                        ${currentContent.substring(0, 500)}${currentContent.length > 500 ? '...' : ''}
                    </div>
                </div>
            </div>
        `;
        
        diffView.innerHTML = diffHTML;
    } else {
        diffContainer.style.display = 'none';
    }
}

/**
 * Szerkesztés elutasítása
 */
async function rejectEdit(pid) {
    if (!confirm('Biztosan elutasítod ezt a szerkesztést? A változtatások elvesznek.')) {
        return;
    }
    
    try {
        const token = await getAuthToken();
        
        // Szerkesztés elutasítása API hívás
        // Ez törli a szerkesztett verziót és megtartja az eredetit
        const response = await fetch('/api/post/reject-edit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ post: parseInt(pid) })
        });
        
        if (response.ok) {
            alert('Szerkesztés elutasítva!');
            
            // Modal bezárása
            document.getElementById(`edit-review-modal-${pid}`)?.remove();
            
            // Lista frissítése
            setTimeout(() => {
                loadPendingReviews();
            }, 500);
        } else {
            const error = await response.text();
            alert(`Hiba: ${error}`);
        }
        
    } catch (error) {
        console.error('Hiba a szerkesztés elutasítása során:', error);
        alert('Hiba történt a szerkesztés elutasítása során!');
    }
}

/**
 * Szerkesztés mentése és publikálása
 */
async function saveAndApproveEdit(pid) {
    if (!confirm('Szerkesztés mentése és publikálása? Ezzel a változtatások azonnal láthatóvá válnak.')) {
        return;
    }
    
    try {
        const token = await getAuthToken();
        
        // Új adatok összegyűjtése a formból
        const title = document.getElementById(`edit-title-${pid}`).value;
        const minimal_desc = document.getElementById(`edit-excerpt-${pid}`).value;
        const desc = document.getElementById(`edit-content-${pid}`).value;
        const category = document.getElementById(`edit-category-${pid}`).value;
        const notes = document.getElementById(`edit-notes-${pid}`).value;
        
        // Frissítendő adatok
        const updateData = {
            post: parseInt(pid),
            title: title,
            minimal_desc: minimal_desc,
            desc: desc,
            category: category
        };
        
        // Megjegyzések hozzáadása (ha vannak)
        if (notes.trim() !== '') {
            updateData.notes = notes;
        }
        
        console.log('Frissítendő adatok:', updateData);
        
        // API hívás a szerkesztés elfogadásához
        const response = await fetch('/api/post/edit', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Publikálás
            const publishResponse = await fetch('/api/post/approve', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ post: parseInt(pid) })
            });
            
            if (publishResponse.ok) {
                // Modal bezárása
                const modal = document.getElementById(`edit-review-modal-${pid}`);
                if (modal) modal.remove();
                
                // Sikeres üzenet
                alert('Szerkesztés sikeresen mentve és publikálva!');
                
                // Lista frissítése
                setTimeout(() => {
                    loadPendingReviews();
                }, 500);
            } else {
                const error = await publishResponse.text();
                alert(`Szerkesztés mentve, de publikálási hiba: ${error}`);
            }
            
        } else {
            const error = await response.text();
            alert(`Hiba: ${error}`);
        }
        
    } catch (error) {
        console.error('Hiba a szerkesztés mentése során:', error);
        alert('Hiba történt a szerkesztés mentése során!');
    }
}

async function getAuthorsNames(authorIds) {
    if (!authorIds || authorIds.length === 0) {
        return 'Nincs szerző';
    }
    
    try {
        const token = await getAuthToken();
        if (!token) {
            return `${authorIds.length} szerző`;
        }
        
        // 1. Lekérjük az összes felhasználót
        const response = await fetch('/api/user/getall', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            return `${authorIds.length} szerző`;
        }
        
        const allUsers = await response.json();
        const authorNames = [];
        
        // 2. Minden authorId-hez megkeressük a nevet
        authorIds.forEach(id => {
            const uid = parseInt(id);
            if (allUsers[uid]) {
                const name = allUsers[uid].alias || 
                            allUsers[uid].full_name || 
                            allUsers[uid].first_name || 
                            `Felhasználó ${uid}`;
                authorNames.push(name);
            } else {
                authorNames.push(`Felhasználó ${uid}`);
            }
        });
        
        return authorNames.join(', ');
        
    } catch (error) {
        console.error('Hiba a szerzők neveinek betöltése során:', error);
        return `${authorIds.length} szerző`;
    }
}















//AlertSheet

async function showConfirmModal(options = {}) {
    return new Promise((resolve) => {
        const modalId = 'confirm-modal-' + Date.now();
        
        // Alapértelmezett értékek
        const config = {
            title: 'Megerősítés szükséges',
            message: 'Biztosan szeretnéd végrehajtani ezt a műveletet?',
            details: [],
            confirmText: 'Megerősítés',
            cancelText: 'Mégse',
            icon: 'alert-circle-outline',
            onConfirm: () => {},
            onCancel: () => {},
            ...options
        };
        
        // Details HTML generálása
        let detailsHTML = '';
        if (config.details && config.details.length > 0) {
            detailsHTML = `
                <div class="confirm-modal-details">
                    <strong>Részletek:</strong>
                    ${config.details.map(item => `
                        <div class="details-item">
                            <span class="label">${item.label}:</span>
                            <span class="value">${item.value}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        // Modal HTML létrehozása
        const modalHTML = `
            <div class="confirm-modal active" id="${modalId}">
                <div class="confirm-modal-content">
                    <div class="confirm-modal-header">
                        <ion-icon name="${config.icon}"></ion-icon>
                        <h3>${config.title}</h3>
                    </div>
                    
                    <div class="confirm-modal-body">
                        <div class="confirm-modal-icon">
                            <ion-icon name="${config.icon}"></ion-icon>
                        </div>
                        
                        <div class="confirm-modal-message">
                            <h4>${config.message}</h4>
                            ${config.subMessage ? `<p>${config.subMessage}</p>` : ''}
                        </div>
                        
                        ${detailsHTML}
                    </div>
                    
                    <div class="confirm-modal-footer">
                        <button type="button" class="btn-secondary" id="${modalId}-cancel">
                            <ion-icon name="close-outline"></ion-icon>
                             <span style="font-family: 'Abril Fatface'; font-size: 16px">${config.cancelText}</span>
                        </button>
                        <button type="button" class="btn-danger" id="${modalId}-confirm">
                            <ion-icon name="checkmark-outline"></ion-icon>
                            <span style="font-family: 'Abril Fatface'; font-size: 16px">${config.confirmText}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Modal hozzáadása a body-hoz
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
        
        const modal = document.getElementById(modalId);
        const confirmBtn = document.getElementById(`${modalId}-confirm`);
        const cancelBtn = document.getElementById(`${modalId}-cancel`);
        
        // Eseménykezelők
        const handleConfirm = () => {
            config.onConfirm();
            closeModal();
            resolve(true);
        };
        
        const handleCancel = () => {
            config.onCancel();
            closeModal();
            resolve(false);
        };
        
        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => {
                modalContainer.remove();
            }, 300);
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        
        // Kattintás a modalon kívül
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        });
        
        // ESC billentyű
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                handleCancel();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        
        document.addEventListener('keydown', handleEsc);
        
        // Fókusz a confirm gombon
        setTimeout(() => {
            confirmBtn.focus();
        }, 100);
    });
}

async function deleteArticle(pid) {
    try {
        const result = await showConfirmModal({
            title: 'Cikk törlése',
            message: 'Biztosan törölni szeretnéd ezt a cikket?',
            subMessage: 'Nagyon vigyázz azza, hogy mit törölsz, és mit nem. Ezért figyelmeztetünk😀',
            icon: 'trash-outline',
            confirmText: 'Igen, törlöm',
            cancelText: 'Mégse'
        });
        
        if (result) {
            // Tényleges törlés
            const token = await getAuthToken();
            if (!token) {
                alert('Nem vagy bejelentkezve!');
                return;
            }
            
            const response = await fetch('/api/post/delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ post: pid })
            });
            
            if (response.ok) {
                showSuccessNotification('Cikk sikeresen törölve!', 'success');
                loadUserArticles();
            } else {
                const error = await response.text();
                showSuccessNotification(`Hiba: ${error}`, 'error');
            }
        }
    } catch (error) {
        console.error('Hiba a cikk törlése során:', error);
        showSuccessNotification('Hiba történt a törlés során!', 'error');
    }
}


async function approveReviewPost2(pid) {
    try {
        const result = await showConfirmModal({
            title: 'Poszt elfogadása',
            message: 'Biztosan ki szeretnéd engedni ezt a posztot?',
            subMessage: 'A poszt meg fog jelenni a címlapon és nyilvános lesz.',
            icon: 'checkmark-outline',
            confirmText: 'Igen, elfogadom',
            cancelText: 'Mégse'
        });
        
        if (result) {
            const token = await getAuthToken();
            
            const response = await fetch('/api/post/approve', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ post: parseInt(pid) })
        });
            
            if (response.ok) {
            const result = await response.json();
            alert('Poszt sikeresen elfogadva!');
            
            // Lista frissítése
            loadPendingReviews();
        } else {
            const error = await response.text();
            alert(`Hiba: ${error}`);
        }
        }
    } catch (error) {
        console.error('Hiba a poszt elfogadása során:', error);
        alert('Hiba történt a poszt elfogadása során!');
    }
}

/**
 * Szerző eltávolításának megerősítése
 */
async function confirmRemoveAuthor(uid, authorName) {
    const result = await showConfirmModal({
        title: 'Szerző eltávolítása',
        message: `Biztosan eltávolítod ${authorName} szerzőt?`,
        icon: 'person-remove-outline',
        confirmText: 'Eltávolítás',
        cancelText: 'Mégse',
        details: [
            { label: 'Szerző', value: authorName },
            { label: 'UID', value: uid }
        ]
    });
    
    return result;
}

/**
 * Segédfüggvények az adatok lekéréséhez
 */
async function getArticleData(pid) {
    // Itt implementáld a cikk adatainak lekérését
    // Példa:
    try {
        const token = await getAuthToken();
        const response = await fetch(`/api/post/get?id=${pid}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Hiba a cikk adatainak lekérése során:', error);
    }
    
    return { title: 'Cikk adatai', number: '-', status: 'Ismeretlen' };
}

async function getReviewPostData(pid) {
    // Itt implementáld a lektorálásban lévő poszt adatainak lekérését
    // Példa:
    return { title: 'Poszt adatai', type: 'pending', created: new Date().toISOString() };
}

/**
 * Tényleges törlési műveletek (a meglévő kódodat használd)
 */
async function performDeleteArticle(pid) {
    // Itt hívd meg a meglévő deleteArticle logikádat
    const token = await getAuthToken();
    
    try {
        const response = await fetch('/api/post/delete', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ post: pid })
        });
        
        if (response.ok) {
            // Sikeres törlés üzenet
            showSuccessNotification('Cikk sikeresen törölve!', 'success');
            loadUserArticles(); // Lista frissítése
        } else {
            const error = await response.text();
            showSuccessNotification(`Hiba: ${error}`, 'error');
        }
    } catch (error) {
        console.error('Hiba a cikk törlése során:', error);
        showSuccessNotification('Hálózati hiba történt!', 'error');
    }
}

async function performDeleteReviewPost(pid) {
    // Itt hívd meg a meglévő deleteReviewPost logikádat
    const token = await getAuthToken();
    
    try {
        const response = await fetch('/api/post/delete', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ post: pid })
        });
        
        if (response.ok) {
            showSuccessNotification('Poszt sikeresen törölve!', 'success');
            loadPendingReviews();
        } else {
            const error = await response.text();
            showSuccessNotification(`Hiba: ${error}`, 'error');
        }
    } catch (error) {
        console.error('Hiba a poszt törlése során:', error);
        showSuccessNotification('Hálózati hiba történt!', 'error');
    }
}

/**
 * Sikeres/error értesítés
 */
function showSuccessNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <ion-icon name="${type === 'success' ? 'checkmark-circle' : 'alert-circle'}-outline"></ion-icon>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}


function initializeBlockEditor() {
    console.log('Blokk szerkesztő inicializálása...');
    
    const blockEditorContainer = document.getElementById('block-editor-container');
    const blockToolbarButtons = document.querySelectorAll('.block-toolbar-btn');
    const previewBtn = document.getElementById('preview-content');
    const importBtn = document.getElementById('import-blocks');
    
    if (!blockEditorContainer) {
        console.log('Blokk szerkesztő konténer nem található');
        return;
    }
    
    // Eseménykezelők a blokk gombokhoz
    blockToolbarButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const blockType = this.getAttribute('data-block-type');
            addNewBlock(blockType);
        });
    });
    
    // Előnézet gomb
    if (previewBtn) {
        previewBtn.addEventListener('click', function() {
            const html = generateHTMLFromBlocks();
            document.getElementById('preview-output').textContent = html;
            document.getElementById('html-preview').style.display = 'block';
        });
    }
    
    // Import gomb
    if (importBtn) {
        importBtn.addEventListener('click', function() {
            importBlocksFromHTML();
        });
    }
    
    // Drag and drop funkciók beállítása
    setupDragAndDrop();
    
    // Alapértelmezett blokk hozzáadása, ha nincs
    if (blockEditorContainer.children.length === 0) {
        addNewBlock('paragraph');
    }
}

/**
 * Új blokk hozzáadása
 */
function addNewBlock(blockType) {
    const container = document.getElementById('block-editor-container');
    
    let blockHTML = '';
    let blockContent = '';
    
    // Blokk típus alapján tartalom
    switch(blockType) {
        case 'paragraph':
            blockContent = '<textarea class="block-textarea" placeholder="Írj ide valamit..." rows="3"></textarea>';
            break;
        case 'heading':
            blockContent = '<input type="text" class="block-heading-input" placeholder="Írd be a címet..." value="">';
            break;
        case 'image':
            blockContent = `
                <div class="image-upload">
                    <ion-icon name="image-outline" style="font-size: 48px; color: #cbd5e0;"></ion-icon>
                    <p style="margin: 10px 0; color: #718096;">Kattints a kép feltöltéséhez</p>
                    <input type="file" class="image-file-input" accept="image/*" style="display: none;">
                </div>
                <input type="text" class="image-caption" placeholder="Képaláírás..." style="width: 100%; margin-top: 10px; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px;">
            `;
            break;
        case 'quote':
            blockContent = '<textarea class="block-textarea" placeholder="Idézet szövege..." rows="3"></textarea>';
            break;
        case 'list':
            blockContent = '<textarea class="block-textarea" placeholder="Listaelemek (soronként egy)..." rows="3"></textarea>';
            break;
        case 'code':
            blockContent = '<textarea class="block-textarea" placeholder="Kód ide..." rows="5"></textarea>';
            break;
        case 'divider':
            blockContent = '<div class="divider-line"></div>';
            break;
        case 'embed':
            blockContent = '<input type="url" class="embed-url-input" placeholder="Beágyazott tartalom URL-je (YouTube, Twitter, stb.)..." style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px;">';
            break;
        default:
            blockContent = '<textarea class="block-textarea" placeholder="Írj ide valamit..." rows="3"></textarea>';
    }
    
    // Blokk típus megjelenítendő neve
    const blockTypeNames = {
        'paragraph': 'Bekezdés',
        'heading': 'Címsor',
        'image': 'Kép',
        'quote': 'Idézet',
        'list': 'Lista',
        'code': 'Kód',
        'divider': 'Elválasztó',
        'embed': 'Beágyazás'
    };
    
    // Blokk HTML generálása
    blockHTML = `
        <div class="content-block" data-block-type="${blockType}" draggable="true">
            <div class="block-header">
                <div class="block-handle">
                    <ion-icon name="menu-outline"></ion-icon>
                </div>
                <div class="block-type">${blockTypeNames[blockType] || 'Blokk'}</div>
                <div class="block-actions">
                    <button class="block-action-btn" data-action="settings">
                        <ion-icon name="settings-outline"></ion-icon>
                    </button>
                    <button class="block-action-btn" data-action="duplicate">
                        <ion-icon name="copy-outline"></ion-icon>
                    </button>
                    <button class="block-action-btn" data-action="delete">
                        <ion-icon name="trash-outline"></ion-icon>
                    </button>
                </div>
            </div>
            <div class="block-content">
                ${blockContent}
            </div>
        </div>
    `;
    
    // Blokk hozzáadása
    container.insertAdjacentHTML('beforeend', blockHTML);
    
    // Eseménykezelők hozzáadása az új blokkhoz
    const newBlock = container.lastElementChild;
    setupBlockEventListeners(newBlock);
    
    // Automatikus fókusz
    setTimeout(() => {
        const textarea = newBlock.querySelector('.block-textarea');
        const input = newBlock.querySelector('input');
        if (textarea) {
            textarea.focus();
        } else if (input) {
            input.focus();
        }
    }, 100);
    
    console.log(`Új blokk hozzáadva: ${blockType}`);
}

/**
 * Blokk eseménykezelők beállítása
 */
function setupBlockEventListeners(block) {
    // Törlés gomb
// Törlés gomb
// Törlés gomb
const deleteBtn = block.querySelector('[data-action="delete"]');
if (deleteBtn) {
    deleteBtn.addEventListener('click', async function() {
        // Blokk típus lekérése
        const blockType = block.getAttribute('data-block-type');
        const blockTypeName = getBlockTypeName(blockType);
        
        // Ellenőrizzük, hogy ez az első blokk-e
        const isFirst = isFirstBlock(block);
        
        // Megerősítés modallal
        const result = await showConfirmModal({
            title: 'Blokk törlése',
            message: `Biztosan törölni szeretnéd ezt a blokkot?`,
            subMessage: isFirst && blockType === 'heading' ? 
                'Figyelem: Ez a címsor blokk, a cím el fog veszni!' : 
                'A művelet nem visszavonható.',
            icon: 'trash-outline',
            confirmText: 'Igen, törlöm',
            cancelText: 'Mégse',
            details: [
                { label: 'Blokk típus', value: blockTypeName },
                { label: 'Pozíció', value: isFirst ? 'Első hely' : `#${Array.from(block.parentNode.children).indexOf(block) + 1}` }
            ]
        });
        
        if (result) {
            // Törlés előtt mentjük az állapotot
            const wasFirstHeading = isFirst && blockType === 'heading';
            
            // Töröljük a blokkot
            block.remove();
            
            // Utánkövetés: ellenőrizzük az állapotot
            const remainingBlocks = document.querySelectorAll('.content-block');
            
            if (remainingBlocks.length === 0) {
                // Nincs több blokk - üres tartalom
                updateTitlePreview(null, 'Nincs tartalom');
            } else if (wasFirstHeading) {
                // Első címsor törölve - frissítjük a címet
                const newFirstBlock = remainingBlocks[0];
                const newBlockType = newFirstBlock.getAttribute('data-block-type');
                
                if (newBlockType === 'heading') {
                    // Az új első blokk is címsor
                    const headingInput = newFirstBlock.querySelector('.block-heading-input');
                    const newTitle = headingInput ? headingInput.value.trim() : '';
                    updateTitlePreview(newTitle, 'Új címsor');
                } else {
                    // Az új első blokk nem címsor
                    updateTitlePreview('', 'Hiányzó cím');
                }
            }
            
            // Frissítjük a blokk pozíciókat és előnézetet
            setTimeout(async () => {
                await prepareBlockPostData();
            }, 100);
        }
    });
}
    
    // Duplikálás gomb
    const duplicateBtn = block.querySelector('[data-action="duplicate"]');
    if (duplicateBtn) {
        duplicateBtn.addEventListener('click', function() {
            const blockType = block.getAttribute('data-block-type');
            const clonedBlock = block.cloneNode(true);
            block.parentNode.insertBefore(clonedBlock, block.nextSibling);
            setupBlockEventListeners(clonedBlock);
        });
    }
    
    // Beállítások gomb
    const settingsBtn = block.querySelector('[data-action="settings"]');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            showBlockSettings(block);
        });
    }
    
    // Kép feltöltés eseménykezelő
    const imageUpload = block.querySelector('.image-upload');
    if (imageUpload) {
        const fileInput = block.querySelector('.image-file-input');
        imageUpload.addEventListener('click', function() {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Itt lehetne implementálni a képfeltöltést
                // Jelenleg csak placeholder
                const reader = new FileReader();
                reader.onload = function(e) {
                    imageUpload.innerHTML = `
                        <img src="${e.target.result}" style="max-width: 100%; max-height: 200px; border-radius: 4px;">
                        <p style="margin-top: 10px; color: #718096; font-size: 12px;">Kattints a kép cseréjéhez</p>
                    `;
                    // Újra eseménykezelő hozzáadása
                    imageUpload.addEventListener('click', function() {
                        fileInput.click();
                    });
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

/**
 * Drag and drop funkciók beállítása
 */
function setupDragAndDrop() {
    const container = document.getElementById('block-editor-container');
    let draggedBlock = null;
    
    // Drag start
    document.addEventListener('dragstart', function(e) {
        if (e.target.closest('.content-block')) {
            draggedBlock = e.target.closest('.content-block');
            draggedBlock.classList.add('dragging');
        }
    });
    
    // Drag end
    document.addEventListener('dragend', function(e) {
        if (draggedBlock) {
            draggedBlock.classList.remove('dragging');
            document.querySelectorAll('.content-block').forEach(block => {
                block.classList.remove('over');
            });
            draggedBlock = null;
        }
    });
    
    // Drag over
    container.addEventListener('dragover', function(e) {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
        const currentBlock = e.target.closest('.content-block');
        
        if (currentBlock && currentBlock !== draggedBlock) {
            currentBlock.classList.add('over');
        }
    });
    
    // Drag leave
    container.addEventListener('dragleave', function(e) {
        const relatedTarget = e.relatedTarget;
        if (!container.contains(relatedTarget)) {
            document.querySelectorAll('.content-block').forEach(block => {
                block.classList.remove('over');
            });
        }
    });
    
    // Drop
    container.addEventListener('drop', function(e) {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
        
        if (draggedBlock && afterElement) {
            container.insertBefore(draggedBlock, afterElement);
        } else if (draggedBlock) {
            container.appendChild(draggedBlock);
        }
        
        document.querySelectorAll('.content-block').forEach(block => {
            block.classList.remove('over');
        });
    });
}

/**
 * Segédfüggvény a drag and drop-hoz
 */
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.content-block:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/**
 * HTML generálása a blokkokból
 */
function generateHTMLFromBlocks() {
    const blocks = document.querySelectorAll('.content-block');
    let html = '';
    
    blocks.forEach(block => {
        const blockType = block.getAttribute('data-block-type');
        const contentElement = block.querySelector('.block-textarea') || 
                              block.querySelector('input') || 
                              block.querySelector('.block-content');
        
        let content = '';
        if (contentElement) {
            if (contentElement.tagName === 'TEXTAREA' || contentElement.tagName === 'INPUT') {
                content = contentElement.value;
            } else {
                content = contentElement.innerHTML;
            }
        }
        
        // Blokkok HTML formázása
        switch(blockType) {
            case 'paragraph':
                if (content.trim()) {
                    html += `<p>${content.replace(/\n/g, '<br>')}</p>\n`;
                }
                break;
            case 'heading':
                if (content.trim()) {
                    html += `<h2>${content}</h2>\n`;
                }
                break;
            case 'image':
                const img = block.querySelector('img');
                const caption = block.querySelector('.image-caption');
                if (img) {
                    html += `<figure>\n  <img src="${img.src}" alt="${caption?.value || ''}" style="max-width: 100%;">\n`;
                    if (caption?.value) {
                        html += `  <figcaption>${caption.value}</figcaption>\n`;
                    }
                    html += `</figure>\n`;
                }
                break;
            case 'quote':
                if (content.trim()) {
                    html += `<blockquote>${content.replace(/\n/g, '<br>')}</blockquote>\n`;
                }
                break;
            case 'list':
                if (content.trim()) {
                    const items = content.split('\n').filter(item => item.trim());
                    html += `<ul>\n`;
                    items.forEach(item => {
                        html += `  <li>${item.trim()}</li>\n`;
                    });
                    html += `</ul>\n`;
                }
                break;
            case 'code':
                if (content.trim()) {
                    html += `<pre><code>${content}</code></pre>\n`;
                }
                break;
            case 'divider':
                html += `<hr>\n`;
                break;
            case 'embed':
                if (content.trim()) {
                    html += `<!-- Beágyazott tartalom: ${content} -->\n`;
                    html += `<div class="embed-container">[Beágyazott tartalom helye]</div>\n`;
                }
                break;
        }
    });
    
    // Rejtett mező frissítése
    document.getElementById('post-content').value = html;
    
    return html;
}

/**
 * Blokk beállítások megjelenítése
 */
function showBlockSettings(block) {
    const blockType = block.getAttribute('data-block-type');
    const modalHTML = `
        <div class="block-modal active" id="block-settings-modal">
            <div class="block-modal-content">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: var(--icon-color);">Blokk beállítások</h3>
                    <button id="close-block-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
                </div>
                
                <div class="form-group">
                    <label>Blokk típus: <strong>${getBlockTypeName(blockType)}</strong></label>
                </div>
                
                ${blockType === 'heading' ? `
                <div class="form-group">
                    <label for="heading-level">Címsor szint</label>
                    <select id="heading-level" class="form-control">
                        <option value="h1">H1 - Főcím</option>
                        <option value="h2" selected>H2 - Alcím</option>
                        <option value="h3">H3 - Harmadik szint</option>
                        <option value="h4">H4 - Negyedik szint</option>
                    </select>
                </div>
                ` : ''}
                
                ${blockType === 'image' ? `
                <div class="form-group">
                    <label for="image-alt">Alternatív szöveg (alt)</label>
                    <input type="text" id="image-alt" class="form-control" placeholder="Kép leírása...">
                </div>
                <div class="form-group">
                    <label for="image-class">CSS osztály</label>
                    <input type="text" id="image-class" class="form-control" placeholder="pl.: featured-image">
                </div>
                ` : ''}
                
                <div class="form-group">
                    <label for="block-class">Egyedi CSS osztály</label>
                    <input type="text" id="block-class" class="form-control" placeholder="pl.: highlight-box">
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="block-align-center">
                        Középre igazítás
                    </label>
                </div>
                
                <div style="margin-top: 25px; text-align: right;">
                    <button type="button" class="btn-secondary" id="cancel-block-modal">Mégse</button>
                    <button type="button" class="btn-primary" id="save-block-modal">Mentés</button>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    
    // Eseménykezelők
    document.getElementById('close-block-modal').addEventListener('click', () => {
        modalContainer.remove();
    });
    
    document.getElementById('cancel-block-modal').addEventListener('click', () => {
        modalContainer.remove();
    });
    
    document.getElementById('save-block-modal').addEventListener('click', () => {
        // Beállítások mentése
        const customClass = document.getElementById('block-class').value;
        if (customClass) {
            block.classList.add(customClass);
        }
        
        modalContainer.remove();
    });
    
    // Modal bezárása kattintással kívülre
    modalContainer.querySelector('.block-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            modalContainer.remove();
        }
    });
}

/**
 * Blokk típusnév lekérdezése
 */
function getBlockTypeName(type) {
    const names = {
        'paragraph': 'Bekezdés',
        'heading': 'Címsor',
        'image': 'Kép',
        'quote': 'Idézet',
        'list': 'Lista',
        'code': 'Kód',
        'divider': 'Elválasztó',
        'embed': 'Beágyazás'
    };
    
    return names[type] || 'Ismeretlen';
}

/**
 * HTML importálása blokkokba
 */
function importBlocksFromHTML() {
    const html = prompt('Illessz be HTML kódot a blokkok létrehozásához:', '<p>Példa bekezdés</p>');
    
    if (!html) return;
    
    // HTML elemek blokkokká alakítása
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Blokkok létrehozása
    tempDiv.childNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            let blockType = 'paragraph';
            
            switch(node.tagName.toLowerCase()) {
                case 'h1':
                case 'h2':
                case 'h3':
                case 'h4':
                case 'h5':
                case 'h6':
                    blockType = 'heading';
                    break;
                case 'img':
                case 'figure':
                    blockType = 'image';
                    break;
                case 'blockquote':
                    blockType = 'quote';
                    break;
                case 'ul':
                case 'ol':
                    blockType = 'list';
                    break;
                case 'pre':
                case 'code':
                    blockType = 'code';
                    break;
                case 'hr':
                    blockType = 'divider';
                    break;
            }
            
            addNewBlock(blockType);
            
            // Tartalom beállítása
            const lastBlock = document.querySelector('.content-block:last-child');
            const contentElement = lastBlock.querySelector('.block-textarea') || 
                                  lastBlock.querySelector('input');
            
            if (contentElement) {
                if (blockType === 'image') {
                    const img = node.querySelector('img') || node;
                    if (img.src) {
                        const imageUpload = lastBlock.querySelector('.image-upload');
                        if (imageUpload) {
                            imageUpload.innerHTML = `<img src="${img.src}" style="max-width: 100%; max-height: 200px; border-radius: 4px;">`;
                        }
                    }
                } else {
                    contentElement.value = node.textContent || '';
                }
            }
        }
    });
}


/**
 * Cikk előnézete külön oldalon
 */
function setupPreviewButton() {
    const previewBtn = document.getElementById('preview-article-btn');
    
    if (!previewBtn) return;
    
    previewBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        console.log('Cikk előnézete külön oldalon...');
        
        // 1. Blokkok validálása
       const validation = validateFirstBlock();
if (!validation.isValid) {
    await showConfirmModal({
        title: 'Előnézet nem elérhető',
        message: validation.message,
        subMessage: 'Kérlek, először adj hozzá egy címsor blokkot!',
        icon: 'eye-off-outline',
        confirmText: 'Címsor hozzáadása',
        cancelText: 'Mégse',
        details: [
            { label: 'Hiba típusa', value: validation.isValid ? 'Érvényes' : 'Érvénytelen' },
            { label: 'Blokkok száma', value: document.querySelectorAll('.content-block').length || 0 }
        ],
        onConfirm: function() {
            // Címsor blokk hozzáadása gomb aktiválása
            const titleBtn = document.getElementById('add-title-block-btn');
            if (titleBtn) {
                titleBtn.click();
            } else {
                // Ha nincs gomb, manuálisan adjunk hozzá címsort
                addNewBlock('heading', true);
            }
        },
        onCancel: function() {
            // Vissza a szerkesztéshez
            console.log('Előnézet megjelenítése megszakítva');
        }
    });
    return;
}
        
        // 2. Adatok előkészítése
        const postData = await prepareBlockPostData();
        if (!postData || !postData.title) {
            alert('Hiba történt a cikk előkészítése során!');
            return;
        }
        
        // 3. Előnézeti oldal megnyitása
        openPreviewWindow(postData);
    });
}

/**
 * Előnézeti ablak megnyitása
 */
function openPreviewWindow(postData) {
    console.log('Előnézeti oldal megnyitása...');
    
    // Szerzők lekérése
    const authorsInput = document.getElementById('post-authors');
    const categoriesInput = document.getElementById('post-categories');
    
    // Ideiglenes azonosító
    const previewId = 'preview_' + Date.now();
    
    // Adatok mentése sessionStorage-ba
    sessionStorage.setItem(previewId, JSON.stringify({
        title: postData.title,
        content: postData.html,
        excerpt: postData.excerpt,
        blocks: postData.blocks,
        authors: getAuthorsDisplayData(), // Új: szerzők adatai
        category: categoriesInput ? categoriesInput.value : '', // Új: kategória
        timestamp: new Date().toISOString()
    }));
    
    // Előnézeti oldal megnyitása új ablakban/táblában
    const previewWindow = window.open(`preview.html?id=${previewId}`, '_blank', 
        'width=1200,height=800,scrollbars=yes,resizable=yes');
    
    if (!previewWindow) {
        // Ha felugró ablak blokkolva van, új lapon nyissuk meg
        window.location.href = `preview.html?id=${previewId}`;
    }
}


async function getAuthorsDisplayData() {
    const authorsInput = document.getElementById('post-authors');
    let authorIds = [];
    
    console.log('Szerzők adatainak lekérése...');
    console.log('Authors input value:', authorsInput ? authorsInput.value : 'N/A');
    
    // 1. JELENLEGI FELHASZNÁLÓ HOZZÁADÁSA
    try {
        const token = await getAuthToken();
        if (token) {
            const userResponse = await fetch('/api/user/get', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ get: 'uid,alias,full_name,first_name,email' })
            });
            
            if (userResponse.ok) {
                const currentUser = await userResponse.json();
                console.log('Jelenlegi felhasználó:', currentUser);
                
                if (currentUser && currentUser.uid) {
                    // Jelenlegi felhasználó hozzáadása (ha még nincs benne)
                    authorIds.push(currentUser.uid.toString());
                    console.log('Jelenlegi felhasználó hozzáadva:', currentUser.uid);
                }
            } else {
                console.error('Nem sikerült lekérni a jelenlegi felhasználót');
            }
        }
    } catch (error) {
        console.error('Hiba a jelenlegi felhasználó lekérése során:', error);
    }
    
    // 2. LISTÁBÓL KIVÁLASZTOTT SZERZŐK HOZZÁADÁSA
    if (authorsInput && authorsInput.value.trim()) {
        const selectedIds = authorsInput.value.split(',')
            .map(id => id.trim())
            .filter(id => id !== '');
        
        console.log('Kiválasztott szerző ID-k:', selectedIds);
        
        // Csak az érvényes, számként értelmezhető ID-kat vegyük fel
        const validIds = selectedIds.filter(id => {
            const num = parseInt(id);
            return !isNaN(num) && num > 0;
        });
        
        // Duplikációk elkerülése
        validIds.forEach(id => {
            if (!authorIds.includes(id)) {
                authorIds.push(id);
            }
        });
        console.log('Érvényes szerzők hozzáadva:', validIds);
    }
    
    // 3. SZERZŐK ADATAINAK LEKÉRÉSE ÉS ÉRVÉNYESÍTÉSE
    const authors = [];
    
    if (authorIds.length === 0) {
        console.log('Nincsenek szerzők hozzáadva');
        return authors;
    }
    
    console.log('Összes author ID ellenőrzésre:', authorIds);
    
    try {
        const token = await getAuthToken();
        if (token) {
            // Lekérjük az összes felhasználót
            const response = await fetch('/api/user/getall', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const allUsers = await response.json();
                console.log('Összes felhasználó:', Object.keys(allUsers));
                
                // Minden authorId-hez megkeressük a nevet
                for (const id of authorIds) {
                    const uid = parseInt(id);
                    console.log(`Ellenőrzöm a felhasználót ID: ${uid} (${id})`);
                    
                    if (allUsers[uid]) {
                        console.log(`Felhasználó ${uid} található:`, allUsers[uid]);
                        const authorName = allUsers[uid].alias || 
                                         allUsers[uid].full_name || 
                                         allUsers[uid].first_name || 
                                         `Felhasználó ${uid}`;
                        authors.push({
                            id: uid,
                            name: authorName,
                            email: allUsers[uid].email || '',
                            isCurrentUser: await isCurrentUser(uid)
                        });
                    } else {
                        console.warn(`Figyelmeztetés: A(z) ${uid} ID-val rendelkező felhasználó nem található!`);
                        // Nem adjuk hozzá, ha nem létezik
                    }
                }
            } else {
                console.error('Nem sikerült lekérni az összes felhasználót');
            }
        }
    } catch (error) {
        console.error('Hiba a szerzők betöltése során:', error);
    }
    
    console.log('Végleges szerzők listája:', authors);
    return authors;
}

async function isCurrentUser(uid) {
    try {
        const token = await getAuthToken();
        if (!token) return false;
        
        const response = await fetch('/api/user/get', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ get: 'uid' })
        });
        
        if (response.ok) {
            const currentUser = await response.json();
            return currentUser && currentUser.uid === uid;
        }
    } catch (error) {
        console.error('Hiba a jelenlegi felhasználó ellenőrzése során:', error);
    }
    return false;
}

/**
 * Profilkép URL ellenőrzése
 */
function getValidProfileImage(userData) {
    if (!userData || !userData.pfp) {
        return null;
    }
    
    const pfp = userData.pfp.toString().trim();
    
    // Ellenőrizzük, hogy érvényes URL-e
    if (!pfp || pfp === 'null' || pfp === 'undefined' || pfp === '') {
        return null;
    }
    
    // Ellenőrizzük, hogy HTTP/HTTPS URL-e
    if (!pfp.startsWith('http://') && !pfp.startsWith('https://')) {
        return null;
    }
    
    return pfp;
}

function getAuthorsDisplayText(authors) {
    if (!authors || authors.length === 0) {
        return 'Szerző';
    }
    
    // Rendezzük: először a jelenlegi felhasználó, majd a többi
    const sortedAuthors = [...authors].sort((a, b) => {
        if (a.isCurrentUser && !b.isCurrentUser) return -1;
        if (!a.isCurrentUser && b.isCurrentUser) return 1;
        return 0;
    });
    
    return sortedAuthors.map(author => {
        return author.isCurrentUser ? 
            `<strong>${escapeHtml(author.name)} (én)</strong>` : 
            escapeHtml(author.name);
    }).join(', ');
}