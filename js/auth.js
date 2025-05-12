class Auth {
    constructor() {
        console.log('Auth class initialized');
        this.auth = window.auth;
        this.setupAuthListeners();
        this.setupAuthForms();
    }

    setupAuthListeners() {
        console.log('Setting up auth listeners');
        this.auth.onAuthStateChanged((user) => {
            console.log('Auth state changed:', user ? 'logged in' : 'logged out');
            if (user) {
                console.log('User details:', user.email);
            }
            this.updateUI(user);
        });
    }

    setupAuthForms() {
        console.log('Setting up auth forms');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (loginForm) {
            console.log('Login form found, adding submit listener');
            loginForm.addEventListener('submit', (e) => {
                console.log('Login form submitted');
                this.handleLogin(e);
            });
        } else {
            console.error('Login form not found');
        }

        if (registerForm) {
            console.log('Register form found, adding submit listener');
            registerForm.addEventListener('submit', (e) => {
                console.log('Register form submitted');
                this.handleRegister(e);
            });
        } else {
            console.error('Register form not found');
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            console.log('Logout button found, adding click listener');
            logoutBtn.addEventListener('click', () => {
                console.log('Logout button clicked');
                this.handleLogout();
            });
        } else {
            console.error('Logout button not found');
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        console.log('Handling login');
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        console.log('Attempting login with email:', email);

        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            console.log('Login successful:', userCredential.user.email);
            this.showToast('Logged in successfully!', 'success');
            window.location.href = '/dashboard.html';
        } catch (error) {
            console.error('Login error:', error.code, error.message);
            this.showToast(this.getErrorMessage(error.code), 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        console.log('Handling registration');
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        console.log('Attempting registration with email:', email);

        if (password !== confirmPassword) {
            console.error('Passwords do not match');
            this.showToast('Passwords do not match', 'error');
            return;
        }

        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            console.log('Registration successful:', userCredential.user.email);
            this.showToast('Account created successfully!', 'success');
            window.location.href = '/dashboard.html';
        } catch (error) {
            console.error('Registration error:', error.code, error.message);
            this.showToast(this.getErrorMessage(error.code), 'error');
        }
    }

    async handleLogout() {
        try {
            await this.auth.signOut();
            this.showToast('Logged out successfully', 'success');
            window.location.href = '/index.html';
        } catch (error) {
            this.showToast(this.getErrorMessage(error.code), 'error');
        }
    }

    updateUI(user) {
        console.log('Updating UI for user:', user ? user.email : 'no user');
        const authSection = document.getElementById('authSection');
        const userSection = document.getElementById('userSection');
        const userEmail = document.getElementById('userEmail');

        if (user) {
            console.log('User is logged in, hiding auth section');
            if (authSection) {
                authSection.classList.add('hidden');
            }
            if (userSection) {
                userSection.classList.remove('hidden');
                if (userEmail) userEmail.textContent = user.email;
            }
        } else {
            console.log('User is logged out, showing auth section');
            if (authSection) {
                authSection.classList.remove('hidden');
            }
            if (userSection) {
                userSection.classList.add('hidden');
            }
        }
    }

    showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    getErrorMessage(errorCode) {
        const errorMessages = {
            'auth/email-already-in-use': 'This email is already registered',
            'auth/invalid-email': 'Invalid email address',
            'auth/operation-not-allowed': 'Operation not allowed',
            'auth/weak-password': 'Password is too weak',
            'auth/user-disabled': 'This account has been disabled',
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later'
        };
        return errorMessages[errorCode] || 'An error occurred';
    }
}

// Initialize auth
console.log('Initializing auth manager');
const authManager = new Auth(); 