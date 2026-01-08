// Kategóriák betöltése és kezelése
document.addEventListener('DOMContentLoaded', function() {
    const selectCategoryBtn = document.getElementById('select-category-btn');
    
    if (selectCategoryBtn) {
        // Gomb eseménykezelő
        selectCategoryBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showCategorySelector();
        });
        
        // Betöltjük a kategóriákat
        loadCategories();
    }
});

// Kategóriák betöltése
async function loadCategories() {
    try {
        const response = await fetch('/api/post/get/categories', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP hiba: ${response.status}`);
        }
        
        const result = await response.json();
        const categories = result.categories || result;
        
        return categories;
        
    } catch (error) {
        console.error('Hiba a kategóriák betöltése során:', error);
        return [];
    }
}

// Kategória választó modal megjelenítése
async function showCategorySelector() {
    try {
        // Kategóriák betöltése
        const categories = await loadCategories();
        
        if (categories.length === 0) {
            showMessage('Nincs elérhető kategória', 'info');
            return;
        }
        
        // Aktuálisan kiválasztott kategóriák
        const selectedCategories = getSelectedCategories();
        
        // Modal létrehozása
        const modal = document.createElement('div');
        modal.className = 'category-selector-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div class="category-modal-content" style="
                background: white;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                overflow: hidden;
                display: flex;
                flex-direction: column;
            ">
                <div class="modal-header" style="
                    padding: 20px;
                    background: #1891d1;
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <h3 style="margin: 0; font-size: 1.2rem;">
                        <ion-icon name="folder-outline" style="vertical-align: middle; margin-right: 8px;"></ion-icon>
                        Kategóriák kiválasztása
                    </h3>
                    <button class="close-modal" style="
                        background: none;
                        border: none;
                        color: white;
                        font-size: 24px;
                        cursor: pointer;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">×</button>
                </div>
                
                <div class="modal-body" style="
                    padding: 20px;
                    flex: 1;
                    overflow-y: auto;
                ">
                    <!-- Keresés -->
                    <div class="search-container" style="margin-bottom: 15px;">
                        <div class="search-box" style="
                            position: relative;
                            display: flex;
                            align-items: center;
                        ">
                            <ion-icon name="search-outline" style="
                                position: absolute;
                                left: 12px;
                                font-size: 18px;
                                color: #666;
                            "></ion-icon>
                            <input type="text" id="category-search" placeholder="Keresés kategóriák között..." style="
                                width: 100%;
                                padding: 12px 12px 12px 40px;
                                border: 1px solid #ddd;
                                border-radius: 8px;
                                font-size: 14px;
                                outline: none;
                            ">
                        </div>
                    </div>
                    
                    <!-- Kategória lista -->
                    <div class="categories-list" id="categories-list" style="
                        display: grid;
                        gap: 8px;
                    ">
                        ${generateCategoriesListHTML(categories, selectedCategories)}
                    </div>
                </div>
                
                <div class="modal-footer" style="
                    padding: 15px 20px;
                    border-top: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                    background: #f8f9fa;
                ">
                    <div style="display: flex; align-items: center; gap: 10px; font-size: 14px; color: #666;">
                        <span id="selected-count">${selectedCategories.length} kiválasztva</span>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn-cancel" style="
                            padding: 10px 20px;
                            background: #f8f9fa;
                            color: #666;
                            border: 1px solid #ddd;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                        ">Mégse</button>
                        <button class="btn-confirm" style="
                            padding: 10px 20px;
                            background: #1891d1;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                        ">Kiválasztás</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Stílusok
        const style = document.createElement('style');
        style.textContent = `
            .category-item {
                padding: 12px 15px;
                border: 1px solid #eee;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .category-item:hover {
                background: #f8f9fa;
                border-color: #ddd;
            }
            
            .category-item.selected {
                background: #e3f2fd;
                border-color: #1891d1;
                color: #1891d1;
            }
            
            .category-checkbox {
                width: 18px;
                height: 18px;
                accent-color: #1891d1;
                margin-right: 12px;
            }
        `;
        document.head.appendChild(style);
        
        // Eseménykezelők
        setupModalEvents(modal, categories, selectedCategories);
        
    } catch (error) {
        console.error('Hiba a kategóriák betöltése során:', error);
        showMessage('Nem sikerült betölteni a kategóriákat', 'error');
    }
}

// Aktuálisan kiválasztott kategóriák lekérése
function getSelectedCategories() {
    const chipsContainer = document.getElementById('selected-categories-container');
    if (!chipsContainer) return [];
    
    const chips = chipsContainer.querySelectorAll('.category-chip');
    const selected = [];
    
    chips.forEach(chip => {
        const category = chip.getAttribute('data-category');
        if (category) {
            selected.push(category);
        }
    });
    
    return selected;
}

// Kategória lista HTML generálása
function generateCategoriesListHTML(categories, selectedCategories) {
    if (!categories || categories.length === 0) {
        return `
            <div style="text-align: center; padding: 40px; color: #666;">
                <ion-icon name="folder-open-outline" style="font-size: 32px; margin-bottom: 10px;"></ion-icon>
                <p>Nincs elérhető kategória</p>
            </div>
        `;
    }
    
    return categories.map(category => {
        const isSelected = selectedCategories.includes(category);
        return `
            <div class="category-item ${isSelected ? 'selected' : ''}" data-category="${category}">
                <div style="display: flex; align-items: center;">
                    <input type="checkbox" class="category-checkbox" ${isSelected ? 'checked' : ''} data-category="${category}">
                    <span>${category}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Modal eseménykezelők
function setupModalEvents(modal, categories, selectedCategories) {
    // Bezárás gomb
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });
    
    // Mégse gomb
    modal.querySelector('.btn-cancel').addEventListener('click', () => {
        modal.remove();
    });
    
    // Keresés
    const searchInput = modal.querySelector('#category-search');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = this.value.toLowerCase();
            const categoryItems = modal.querySelectorAll('.category-item');
            
            categoryItems.forEach(item => {
                const categoryName = item.textContent.toLowerCase();
                item.style.display = categoryName.includes(searchTerm) ? 'flex' : 'none';
            });
        });
    }
    
    // Kategória kiválasztás
    modal.querySelectorAll('.category-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const category = this.dataset.category;
            const categoryItem = this.closest('.category-item');
            
            if (this.checked) {
                categoryItem.classList.add('selected');
                selectedCategories.push(category);
            } else {
                categoryItem.classList.remove('selected');
                const index = selectedCategories.indexOf(category);
                if (index > -1) {
                    selectedCategories.splice(index, 1);
                }
            }
            
            // Frissítjük a számot
            updateSelectedCount(modal, selectedCategories.length);
        });
    });
    
    // Kategória kiválasztás (teljes sor)
    modal.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', function(e) {
            if (e.target.type === 'checkbox') return;
            
            const checkbox = this.querySelector('.category-checkbox');
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
        });
    });
    
    // Megerősítés
    const confirmBtn = modal.querySelector('.btn-confirm');
    if (confirmBtn) {
confirmBtn.addEventListener('click', () => {
    console.log('Kategóriák mentése:', selectedCategories);
    
    // 1. Frissítsd a rejtett input mező értékét
    const categoriesInput = document.getElementById('post-categories');
    if (categoriesInput) {
        // Ha több kategória van, válaszd ki az elsőt (vagy egyesítsd őket)
        if (selectedCategories.length > 0) {
            // Ha csak egy kategóriát kér az API, vedd az elsőt
            // Ha vesszővel elválasztott listát kér, használd: selectedCategories.join(', ')
            const categoryValue = selectedCategories[0]; // Vagy selectedCategories.join(', ')
            categoriesInput.value = categoryValue;
            console.log('Kategória input beállítva:', categoryValue);
        } else {
            categoriesInput.value = '';
            console.log('Nincs kategória kiválasztva');
        }
    }
    
    // 2. Frissítsd a felületet (chips container)
    updateSelectedCategoriesDisplay(selectedCategories);
    
    // 3. Zárjuk be a modalt
    modal.remove();
    
    // 4. Üzenet
    showMessage(`${selectedCategories.length} kategória kiválasztva`, 'success');
});

    }
    
    // ESC billentyű
    document.addEventListener('keydown', function closeOnEsc(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', closeOnEsc);
        }
    });
    
    // Kattintás a modalon kívül
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Kiválasztott szám frissítése
function updateSelectedCount(modal, count) {
    const selectedCount = modal.querySelector('#selected-count');
    if (selectedCount) {
        selectedCount.textContent = `${count} kiválasztva`;
    }
}

// Kiválasztott kategóriák megjelenítése a formban
function updateSelectedCategoriesDisplay(selectedCategories) {
    let chipsContainer = document.getElementById('selected-categories-container');
    
    if (!chipsContainer) {
        console.error('Chips container nem található!');
        return;
    }
    
    // Töröljük a meglévő chip-eket
    chipsContainer.innerHTML = '';
    
    // Hozzáadjuk az új chip-eket
    if (selectedCategories && selectedCategories.length > 0) {
        selectedCategories.forEach(category => {
            const chip = document.createElement('div');
            chip.className = 'category-chip';
            chip.setAttribute('data-category', category);
            chip.style.cssText = `
                background: #e3f2fd;
                color: #1891d1;
                padding: 6px 12px;
                border-radius: 16px;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 6px;
                border: 1px solid #b3e0ff;
                margin: 4px;
            `;
            
            chip.innerHTML = `
                <span>${category}</span>
                <button type="button" class="remove-category-chip" style="
                    background: none;
                    border: none;
                    color: #1891d1;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 18px;
                    height: 18px;
                ">×</button>
            `;
            
            chipsContainer.appendChild(chip);
        });
        
        // Adjunk hozzá chip eltávolítás eseménykezelőt
        setTimeout(() => {
            document.querySelectorAll('.remove-category-chip').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const chip = this.closest('.category-chip');
                    if (chip) {
                        const categoryToRemove = chip.getAttribute('data-category');
                        console.log('Kategória eltávolítva:', categoryToRemove);
                        
                        // Frissítsük a selectedCategories tömböt
                        const index = selectedCategories.indexOf(categoryToRemove);
                        if (index > -1) {
                            selectedCategories.splice(index, 1);
                            
                            // Frissítsük az input mezőt is
                            const categoriesInput = document.getElementById('post-categories');
                            if (categoriesInput) {
                                categoriesInput.value = selectedCategories.length > 0 ? selectedCategories[0] : '';
                            }
                            
                            // Frissítsük a chip display-t
                            updateSelectedCategoriesDisplay(selectedCategories);
                        }
                    }
                });
            });
        }, 100);
        
    } else {
        chipsContainer.innerHTML = '<div style="color: #666; font-style: italic; padding: 10px;">Nincs kiválasztott kategória</div>';
    }
}

// Üzenet megjelenítése
function showMessage(message, type = 'info') {
    const colors = {
        success: '#20c997',
        error: '#dc3545',
        info: '#1891d1'
    };
    
    const icons = {
        success: 'checkmark-circle',
        error: 'alert-circle',
        info: 'information-circle'
    };
    
    const alert = document.createElement('div');
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 10001;
        animation: slideIn 0.3s ease;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    alert.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <ion-icon name="${icons[type] || icons.info}" style="font-size: 18px;"></ion-icon>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => alert.remove(), 300);
    }, 3000);
}