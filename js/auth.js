class Auth {
    constructor() {
        this.auth = window.auth;
        this.db = window.db;
        this.setupAuthListeners();
        this.setupAuthUI();
    }

    setupAuthListeners() {
        this.auth.onAuthStateChanged(user => {
            if (user) {
                this.onUserSignedIn(user);
            } else {
                this.onUserSignedOut();
            }
        });
    }

    setupAuthUI() {
        const authSection = document.getElementById('auth-section');
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');

        loginBtn.addEventListener('click', () => this.showLoginForm());
        signupBtn.addEventListener('click', () => this.showSignupForm());

        // Create auth forms
        this.createAuthForms(authSection);
    }

    createAuthForms(container) {
        // Login Form
        const loginForm = document.createElement('form');
        loginForm.id = 'loginForm';
        loginForm.className = 'auth-form hidden';
        loginForm.innerHTML = `
            <h2>Login</h2>
            <div class="form-group">
                <label for="loginEmail">Email</label>
                <input type="email" id="loginEmail" required>
            </div>
            <div class="form-group">
                <label for="loginPassword">Password</label>
                <input type="password" id="loginPassword" required>
            </div>
            <button type="submit" class="btn btn-primary">Login</button>
            <p class="auth-switch">Don't have an account? <a href="#" id="switchToSignup">Sign up</a></p>
        `;

        // Signup Form
        const signupForm = document.createElement('form');
        signupForm.id = 'signupForm';
        signupForm.className = 'auth-form hidden';
        signupForm.innerHTML = `
            <h2>Sign Up</h2>
            <div class="form-group">
                <label for="signupEmail">Email</label>
                <input type="email" id="signupEmail" required>
            </div>
            <div class="form-group">
                <label for="signupPassword">Password</label>
                <input type="password" id="signupPassword" required>
            </div>
            <div class="form-group">
                <label for="confirmPassword">Confirm Password</label>
                <input type="password" id="confirmPassword" required>
            </div>
            <button type="submit" class="btn btn-primary">Sign Up</button>
            <p class="auth-switch">Already have an account? <a href="#" id="switchToLogin">Login</a></p>
        `;

        container.appendChild(loginForm);
        container.appendChild(signupForm);

        // Add event listeners
        loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        document.getElementById('switchToSignup').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSignupForm();
        });
        document.getElementById('switchToLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });
    }

    showLoginForm() {
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('signupForm').classList.add('hidden');
    }

    showSignupForm() {
        document.getElementById('signupForm').classList.remove('hidden');
        document.getElementById('loginForm').classList.add('hidden');
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            await this.auth.signInWithEmailAndPassword(email, password);
            this.showToast('Successfully logged in!', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            this.showToast('Passwords do not match!', 'error');
            return;
        }

        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            await this.createUserProfile(userCredential.user);
            this.showToast('Account created successfully!', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async createUserProfile(user) {
        await this.db.collection('users').doc(user.uid).set({
            email: user.email,
            createdAt: new Date(),
            lastLogin: new Date()
        });
    }

    async signOut() {
        try {
            await this.auth.signOut();
            this.showToast('Successfully logged out!', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    onUserSignedIn(user) {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        document.querySelector('.nav-links').innerHTML = `
            <button id="logoutBtn" class="btn">Logout</button>
        `;
        document.getElementById('logoutBtn').addEventListener('click', () => this.signOut());
    }

    onUserSignedOut() {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
        document.querySelector('.nav-links').innerHTML = `
            <button id="loginBtn" class="btn">Login</button>
            <button id="signupBtn" class="btn">Sign Up</button>
        `;
        this.setupAuthUI();
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
}

// Initialize auth
const auth = new Auth(); 