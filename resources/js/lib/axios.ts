import axios from 'axios';

// Get CSRF token with multiple fallback methods
const getCsrfToken = () => {
    // Method 1: Get from window object (updated by our hook)
    if ((window as any).csrfToken) {
        return (window as any).csrfToken;
    }

    // Method 2: Get from meta tag
    let token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

    if (token) {
        return token;
    }

    // Method 3: Get from cookie
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'XSRF-TOKEN') {
            token = decodeURIComponent(value);
            break;
        }
    }

    if (token) {
        return token;
    }

    return null;
};

// Function to wait for CSRF token to be available
const waitForCsrfToken = (maxWait = 5000): Promise<string | null> => {
    return new Promise((resolve) => {
        const checkToken = () => {
            const token = getCsrfToken();
            if (token) {
                resolve(token);
                return;
            }

            // If we've waited too long, resolve with null
            if (maxWait <= 0) {
                resolve(null);
                return;
            }

            // Wait 100ms and try again
            setTimeout(checkToken, 100);
            maxWait -= 100;
        };

        checkToken();
    });
};

// Configure axios defaults
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
axios.defaults.withCredentials = true;

// Add request interceptor to automatically add CSRF token
axios.interceptors.request.use(
    async (config) => {
        let token = getCsrfToken();

        // If no token found immediately, wait for it (for first login scenarios)
        if (!token) {
            token = await waitForCsrfToken(2000); // Wait up to 2 seconds
        }

        if (token) {
            config.headers['X-CSRF-TOKEN'] = token;
        } else {
            console.warn('CSRF token not found after waiting, request may fail');
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle CSRF token errors
axios.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        if (error.response?.status === 419) {
            console.warn('CSRF token mismatch detected');

            // Don't retry if this is a logout request to avoid infinite loops
            if (error.config.url && error.config.url.includes('/logout')) {
                window.location.href = '/login';
                return Promise.reject(error);
            }

            // Try to get a fresh token
            let freshToken = getCsrfToken();

            // If still no token, wait a bit for it to be available
            if (!freshToken) {
                freshToken = await waitForCsrfToken(1000);
            }

            if (freshToken && freshToken !== error.config.headers['X-CSRF-TOKEN']) {
                error.config.headers['X-CSRF-TOKEN'] = freshToken;
                return axios.request(error.config);
            }

            // If this is a login page, just reject the error to show form validation
            if (window.location.pathname === '/login') {
                return Promise.reject(error);
            }

            // If no fresh token or same token, redirect to login
            console.warn('No fresh CSRF token available, redirecting to login...');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default axios;
