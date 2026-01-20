// Egyszerű írók lekérése
document.addEventListener('DOMContentLoaded', async function() {
    // Csak ha van iroink link
    if (!document.querySelector('a.iroink')) return;
    
    try {
        const link = document.querySelector('a.iroink');
        link.textContent = 'Íróink (betöltés...)';
        
        const response = await fetch('/api/user/getall');
        if (!response.ok) throw new Error(`Hiba: ${response.status}`);
        
        const users = await response.json();
        
        const writers = [];
        for (const id in users) {
            const user = users[id];
            if (user.roles && user.roles.includes('writer')) {
                writers.push({
                    id: id, // Ez a fontos - mentjük az ID-t
                    name: user.alias || user.full_name || 'Ismeretlen',
                    pfp: user.pfp || ''
                });
            }
        }
        
        writers.sort((a, b) => a.name.localeCompare(b.name, 'hu'));
        
        const dropdown = document.querySelector('.nav-item.dropdown .dropdown-menu');
        if (dropdown) {
            dropdown.innerHTML = '';
            writers.forEach(writer => {
                const a = document.createElement('a');
                // MÓDOSÍTÁS: Használjuk az uid-t a user-profile oldalhoz
                a.href = `/user-profile.html?uid=${writer.id}`;
                a.textContent = writer.name;
                a.style.fontFamily = "'Abril Fatface'"; // Stílus hozzáadása
                a.style.padding = '10px 15px';
                a.style.display = 'block';
                a.style.textDecoration = 'none';
                a.style.color = '#333';
                a.style.transition = 'background 0.2s';
                
                // Hover effekt
                a.addEventListener('mouseenter', () => {
                    a.style.background = '#f0f2f5';
                });
                a.addEventListener('mouseleave', () => {
                    a.style.background = 'transparent';
                });
                
                dropdown.appendChild(a);
            });
        }
        
        link.textContent = 'Íróink';
        
    } catch (error) {
        console.error('Írók betöltési hiba. Kérünk jelezd a problámát nekünk!:', error);
        const link = document.querySelector('a.iroink');
        if (link) link.textContent = 'Íróink (hiba)';
    }
});