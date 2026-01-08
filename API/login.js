// login.js - Bejelentkezés kezelése
import { authApi } from './api.js';

// Token ellenőrzése URL paraméterből (limbo oldal számára)
async function verifyTokenFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const redirect = urlParams.get('redirect') || '/dashboard';
    
    if (token) {
        try {
            const result = await authApi.verifyLogin(token);
            
            if (result && result.secret) {
                // Token mentése
                localStorage.setItem('auth_token', result.secret);
                
                // Átirányítás a megadott oldalra
                window.location.href = redirect;
            }
        } catch (error) {
            console.error('Hiba a token ellenőrzésekor:', error);
            alert('Hiba történt a bejelentkezés során.');
        }
    }
}

// Bejelentkezés indítása
function startLogin(redirectPath = '/dashboard') {
    authApi.startGoogleLogin(redirectPath);
}

// Bejelentkezés állapotának ellenőrzése
function checkLoginStatus() {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    return !!token;
}

// Kijelentkezés
function logout() {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    window.location.href = '/logout.php';
}

// Exportálás
export {
    verifyTokenFromUrl,
    startLogin,
    checkLoginStatus,
    logout
};