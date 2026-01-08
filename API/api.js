// api.js - Alap API függvények

const API_BASE_URL = window.location.origin + '/api'; // A gyökér URL

// Token kezelés
function getAuthToken() {
    return localStorage.getItem('secret') || sessionStorage.getItem('secret');
}

function setAuthToken(token, remember = false) {
    if (remember) {
        localStorage.setItem('secret', token);
    } else {
        sessionStorage.setItem('secret', token);
    }
}

function clearAuthToken() {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
}

// Alap API hívás függvény
async function apiCall(endpoint, method = 'GET', data = null, requiresAuth = false) {
    let url = `${API_BASE_URL}${endpoint}`;
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (requiresAuth) {
        const token = getAuthToken();
        if (!token) {
            console.error('Nincs érvényes hitelesítési token!');
            window.location.href = '/login';
            return null;
        }
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    // GET kérések esetén query string hozzáadása
    if (method === 'GET' && data) {
        const params = new URLSearchParams(data).toString();
        url = `${url}?${params}`;
    } 
    // Egyéb metódusok esetén body
    else if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
        options.body = JSON.stringify(data);
    }

    console.log('API hívás:', url, options);

    try {
        const response = await fetch(url, options);
        
        // Unauthorized kezelése
        if (response.status === 401) {
            clearAuthToken();
            window.location.href = '/login';
            return null;
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API hiba részletek:', {
                status: response.status,
                url: url,
                error: errorText
            });
            throw new Error(`API hiba (${response.status}): ${errorText}`);
        }

        // Üres válasz esetén (pl. DELETE sikeres)
        if (response.status === 204 || response.headers.get('content-length') === '0') {
            return { message: 'Sikeres művelet' };
        }

        return await response.json();
    } catch (error) {
        console.error('API hiba:', error);
        throw error;
    }
}

// Felhasználó API függvények
export const userApi = {
    getCurrentUser: async (fields = 'uid,email,first_name,full_name,alias,roles,pfp') => {
        return await apiCall('/user/get', 'POST', { get: fields }, true);
    },

    updateCurrentUser: async (data) => {
        return await apiCall('/user/set', 'PUT', data, true);
    },

    getAllUsers: async () => {
        return await apiCall('/user/getall', 'GET', null, true);
    },

    getUserById: async (uid) => {
        return await apiCall(`/user/getone`, 'GET', { uid: uid }, true);
    },

    addUserRole: async (uid, role) => {
        return await apiCall('/user/role/add', 'PUT', { uid, role }, true);
    },

    removeUserRole: async (uid, role) => {
        return await apiCall('/user/role/remove', 'PUT', { uid, role }, true);
    }
};

// Poszt API függvények
export const postApi = {
    createPost: async (postData) => {
        return await apiCall('/post/create', 'POST', postData, true);
    },

    editPost: async (postId, editData) => {
        const data = { post: postId, ...editData };
        return await apiCall('/post/edit', 'PUT', data, true);
    },

    approvePost: async (postId) => {
        return await apiCall('/post/approve', 'PUT', { post: postId }, true);
    },

    hidePost: async (postId) => {
        return await apiCall('/post/hide', 'PUT', { post: postId }, true);
    },

    showPost: async (postId) => {
        return await apiCall('/post/show', 'PUT', { post: postId }, true);
    },

    deletePost: async (postId) => {
        return await apiCall('/post/delete', 'DELETE', { post: postId }, true);
    },

    getPostContents: async (postId, edited = false) => {
        return await apiCall('/post/get/contents', 'POST', { 
            post: postId, 
            edited: edited 
        }, true);
    },

    getUserPosts: async (edited = false) => {
        return await apiCall('/post/get/written', 'GET', { edited: edited }, true);
    },

    getPostStatus: async (postId) => {
        return await apiCall('/post/get/status', 'GET', { post: postId }, true);
    },

    getFrontPosts: async () => {
        return await apiCall('/post/get/front', 'GET', null, false);
    },

    getCategories: async () => {
        return await apiCall('/post/get/categories', 'GET', null, false);
    },

    getPostsByCategory: async (category) => {
        return await apiCall('/post/get/category', 'GET', { category: category }, false);
    },

    getPostsByAuthor: async (authorId) => {
        return await apiCall('/post/get/fromauthor', 'GET', { author: authorId }, false);
    },

    getRecommendedPosts: async (amount = 10) => {
        return await apiCall('/post/get/recommended', 'GET', { amount: amount }, true);
    },

    getEditedPosts: async () => {
        return await apiCall('/post/get/edited', 'GET', null, true);
    },

    getPendingPosts: async () => {
        return await apiCall('/post/get/pending', 'GET', null, true);
    }
};


// Lapszám API függvények
export const numberApi = {
    getCurrentNumber: async () => {
        return await apiCall('/number/get', 'GET', null, false);
    },

    getFrontNumberInfo: async () => {
        return await apiCall('/number/front', 'GET', null, false);
    },

    updateNumber: async (updateData) => {
        return await apiCall('/number/update', 'PUT', updateData, true);
    }
};

// Bejelentkezés API
export const authApi = {
    verifyLogin: async (token) => {
        return await apiCall('/login/verify', 'POST', { token }, false);
    },

    startGoogleLogin: (redirectPath = '/dashboard') => {
        window.location.href = `/api/login/google?redirect=${encodeURIComponent(redirectPath)}`;
    }
};

export const logout = () => {
    clearAuthToken();
    window.location.href = '/logout.php';
};

// Alapértelmezett export
export default {
    userApi,
    postApi,
    numberApi,
    authApi,
    logout,
    getAuthToken,
    setAuthToken,
    clearAuthToken
};