/**
 * Szerzőválasztó inicializálása
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
        const currentAuthors = authorsInput.value;
        if (currentAuthors && currentAuthors.trim() !== '') {
            const authorIds = currentAuthors.split(',').map(id => id.trim()).filter(id => id !== '');
            if (authorIds.length > 0) {
                // Töltsük be a szerzők adatait
                loadAuthorsData(authorIds);
            }
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
            noAuthorsMessage.style.display = 'flex';
            return;
        }
        
        noAuthorsMessage.style.display = 'none';
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
                        <input type="text" id="search-authors-input" placeholder="Keresés szerzők között...">
                    </div>
                </div>
                
                <div class="authors-modal-list" id="authors-modal-list">
                    <div class="authors-loading">
                        <ion-icon name="sync-outline" class="loading-icon"></ion-icon>
                        <p>Szerzők betöltése...</p>
                    </div>
                </div>
                
                <div class="authors-modal-footer">
                    <button type="button" class="btn-secondary" id="cancel-authors-modal">Mégse</button>
                    <button type="button" class="btn-primary" id="save-authors-modal">Kiválasztás</button>
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
                        style="margin-top: 16px;">
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