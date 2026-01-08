// API/dashboard-data.js - Javított változat
import { userApi, postApi, numberApi } from './api.js';

async function loadDashboardStats() {
    try {
        const [userData, userPosts, frontPosts] = await Promise.all([
            userApi.getCurrentUser(),
            postApi.getUserPosts(false), // Nem szerkesztett verzió
            postApi.getFrontPosts()
        ]);

        // Statisztikák számítása
        const stats = {
            views: calculateTotalViews(frontPosts),
            active_users: Object.keys(frontPosts || {}).length * 10,
            activities: Object.keys(userPosts || {}).length,
            articles: Object.keys(userPosts || {}).length
        };

        updateStatsBoxes(stats);
        return stats;
    } catch (error) {
        console.error('Hiba a statisztikák betöltésekor:', error);
        const defaultStats = {
            views: '0',
            active_users: '0',
            activities: '0',
            articles: '0'
        };
        updateStatsBoxes(defaultStats);
        return defaultStats;
    }
}

function calculateTotalViews(posts) {
    if (!posts) return '0';
    let total = 0;
    Object.values(posts).forEach((post, index) => {
        // Egyszerű becslés, később lehet valós adatokat használni
        total += 100 + (index % 5) * 100;
    });
    return total.toLocaleString();
}

function updateStatsBoxes(stats) {
    const boxElements = {
        1: document.querySelector('.box1 .number'),
        2: document.querySelector('.box2 .number'),
        3: document.querySelector('.box3 .number'),
        4: document.querySelector('.box4 .number')
    };

    if (boxElements[1]) boxElements[1].textContent = stats.views;
    if (boxElements[2]) boxElements[2].textContent = stats.active_users;
    if (boxElements[3]) boxElements[3].textContent = stats.activities;
    if (boxElements[4]) boxElements[4].textContent = stats.articles;
}

async function loadUserProfile() {
    try {
        const userData = await userApi.getCurrentUser();
        
        if (userData) {
            // Felhasználónév frissítése
            const userNameElement = document.getElementById('user-display-name');
            if (userNameElement) {
                userNameElement.textContent = userData.full_name || userData.alias || 'Felhasználó';
            }

            // Profilkép frissítése
            const profileImgElement = document.getElementById('user-profile-image');
            if (profileImgElement && userData.pfp) {
                profileImgElement.src = userData.pfp;
            } else if (profileImgElement) {
                // Avatar generálása a név alapján
                const name = userData.full_name || userData.alias || 'User';
                const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1891d1&color=fff`;
                profileImgElement.src = avatarUrl;
            }

            return userData;
        }
    } catch (error) {
        console.error('Hiba a felhasználói profil betöltésekor:', error);
    }
    return null;
}

async function loadUserArticles() {
    try {
        const articles = await postApi.getUserPosts(false);
        
        if (articles && Object.keys(articles).length > 0) {
            updateArticlesList(articles);
            updateArticlesTable(articles);
            return articles;
        } else {
            // Üzenet ha nincsenek cikkek
            const articlesContainer = document.querySelector('.articles-container');
            if (articlesContainer) {
                articlesContainer.innerHTML = `
                    <div class="no-articles">
                        <p>Még nincsenek cikkeid. Hozz létre egy újat!</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Hiba a cikkek betöltésekor:', error);
    }
    return null;
}

function updateArticlesList(articles) {
    const articlesList = document.querySelector('.articles-list');
    if (!articlesList) return;

    // Csak az első 3 cikket jelenítsük meg
    const recentArticles = Object.entries(articles).slice(0, 3);
    
    articlesList.innerHTML = '';
    
    recentArticles.forEach(([pid, article]) => {
        const articleItem = document.createElement('div');
        articleItem.className = 'article-item';
        
        const articleDate = new Date(article.created).toLocaleDateString('hu-HU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        articleItem.innerHTML = `
            <div class="article-info">
                <h4>${article.title || 'Cím nélküli'}</h4>
                <span class="article-date">${articleDate}</span>
            </div>
            <div class="article-stats">
                <span class="stat">
                    <ion-icon name="eye-outline"></ion-icon>
                    ${Math.floor(Math.random() * 2000) + 500}
                </span>
            </div>
        `;
        
        articlesList.appendChild(articleItem);
    });
}

function updateArticlesTable(articles) {
    const articlesContainer = document.querySelector('.articles-container');
    if (!articlesContainer) return;

    let articlesTable = articlesContainer.querySelector('.articles-table');
    if (!articlesTable) {
        articlesTable = createArticlesTable();
    }

    const tableBody = articlesTable.querySelector('tbody') || articlesTable;
    
    // Meglévő sorok törlése (fejléc után)
    const existingRows = articlesTable.querySelectorAll('.table-row:not(.table-header-row)');
    existingRows.forEach(row => row.remove());
    
    // Új sorok hozzáadása
    Object.entries(articles).forEach(([pid, article]) => {
        const row = document.createElement('div');
        row.className = 'table-row';
        
        const articleDate = new Date(article.created).toLocaleDateString('hu-HU', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        });
        
        // Státusz meghatározása (egyszerűsítve)
        const status = article.number <= 7 ? 'published' : 'draft';
        
        row.innerHTML = `
            <div class="table-col">
                <div class="article-title">${article.title || 'Cím nélküli'}</div>
            </div>
            <div class="table-col">
                <span class="status-badge ${status}">
                    ${status === 'published' ? 'Publikálva' : 'Vázlat'}
                </span>
            </div>
            <div class="table-col">${articleDate}</div>
            <div class="table-col">${Math.floor(Math.random() * 2000) + 500}</div>
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
        
        tableBody.appendChild(row);
    });
    
    attachArticleActionListeners();
}

function createArticlesTable() {
    const container = document.querySelector('.articles-container');
    const table = document.createElement('div');
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
    
    container.appendChild(table);
    return table;
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
        // Szerkesztésre navigálás
        document.querySelectorAll(".navList").forEach(e => e.classList.remove('active'));
        document.querySelector('[data-target="create-post"]').classList.add('active');
        document.querySelectorAll(".data-table, .overview").forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById('create-post').style.display = 'block';
        
        // Poszt adatok betöltése
        const postData = await postApi.getPostContents(parseInt(pid), true);
        
        if (postData) {
            // Űrlap kitöltése
            document.getElementById('post-title').value = postData.title || '';
            document.getElementById('post-excerpt').value = postData.minimal_desc || '';
            document.getElementById('post-content').value = postData.desc || '';
            document.getElementById('post-category').value = postData.category || '';
            
            // Szerkesztés mód beállítása
            const form = document.getElementById('post-form');
            form.dataset.editing = pid;
            
            alert(`A(z) "${postData.title}" cikk szerkesztési módba került.`);
        }
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
        await postApi.deletePost(parseInt(pid));
        alert('A cikk sikeresen törölve!');
        loadUserArticles(); // Frissítés
    } catch (error) {
        console.error('Hiba a cikk törlésekor:', error);
        alert('Hiba történt a cikk törlése közben: ' + error.message);
    }
}

async function handleCreatePost(formData) {
    try {
        const userData = await userApi.getCurrentUser();
        const currentNumber = await numberApi.getCurrentNumber();
        
        const postData = {
            title: formData.title,
            category: formData.category,
            number: (currentNumber.number || 0) + 1,
            minimal_desc: formData.excerpt,
            desc: formData.content,
            image: '', // Később lehet implementálni képfeltöltést
            authors: userData.uid.toString()
        };
        
        // Szerkesztés vagy új poszt
        const pid = formData.editing;
        let result;
        
        if (pid) {
            result = await postApi.editPost(parseInt(pid), {
                title: formData.title,
                category: formData.category,
                minimal_desc: formData.excerpt,
                desc: formData.content
            });
        } else {
            result = await postApi.createPost(postData);
        }
        
        if (result) {
            const message = pid ? 
                'Poszt sikeresen szerkesztve!' : 
                `Poszt sikeresen létrehozva! Azonosító: ${result.pid}`;
            
            alert(message);
            
            // Űrlap reset
            document.getElementById('post-form').reset();
            delete document.getElementById('post-form').dataset.editing;
            
            // Cikkek frissítése
            loadUserArticles();
            
            return result.pid;
        }
    } catch (error) {
        console.error('Hiba a poszt létrehozásakor:', error);
        throw error;
    }
    return null;
}

async function initializeDashboard() {
    // Token ellenőrzése
    const token = localStorage.getItem('secret') || sessionStorage.getItem('secret');
    if (!token) {
        window.location.href = '/login';
        return;
    }
    
    try {
        await Promise.all([
            loadUserProfile(),
            loadDashboardStats(),
            loadUserArticles()
        ]);
        
        console.log('Dashboard adatok sikeresen betöltve.');
    } catch (error) {
        console.error('Hiba a dashboard inicializálásakor:', error);
    }
}

// Exportálás
export {
    loadDashboardStats,
    loadUserProfile,
    loadUserArticles,
    handleCreatePost,
    editArticle,
    viewArticle,
    deleteArticle,
    initializeDashboard
};