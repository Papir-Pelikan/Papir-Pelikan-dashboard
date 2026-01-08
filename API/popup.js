// popup.js - Felugró ablakok kezelése

class PopupManager {
    constructor() {
        this.overlay = document.getElementById('popup-overlay');
        this.title = document.getElementById('popup-title');
        this.content = document.getElementById('popup-text');
        this.closeBtn = document.getElementById('close-popup');
        
        this.init();
    }
    
    init() {
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.hide());
        }
        
        if (this.overlay) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.hide();
                }
            });
        }
    }
    
    show(title, content) {
        if (this.title) this.title.textContent = title;
        if (this.content) this.content.innerHTML = content;
        if (this.overlay) this.overlay.style.display = 'flex';
    }
    
    hide() {
        if (this.overlay) this.overlay.style.display = 'none';
    }
}

// Létrehozás és exportálás
const popupManager = new PopupManager();
export default popupManager;