class Account {
    constructor() {
        this.auth = window.auth;
        
        if (!this.auth) {
            console.error('Firebase Authentication not initialized');
            return;
        }

        // Initialize if we're on the account page
        if (document.getElementById('changeEmailForm')) {
            this.setupEmailForm();
        }

        if (document.getElementById('changePasswordForm')) {
            this.setupPasswordForm();
        }
         this.displayCurrentUserEmail();
    }

    setupEmailForm() {
        const form = document.getElementById('changeEmailForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleChangeEmail(e));
        }
    }

    setupPasswordForm() {
        const form = document.getElementById('changePasswordForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleChangePassword(e));
        }
    }

    async handleChangeEmail(e) {
        e.preventDefault();
        const newEmail = document.getElementById('newEmail').value;
        const currentPassword = document.getElementById('currentPasswordForEmail').value;

        if (!this.auth.currentUser) {
            this.showToast('Please log in to change your email.', 'error');
            return;
        }

        const credential = firebase.auth.EmailAuthProvider.credential(this.auth.currentUser.email, currentPassword);

        try {
            // Reauthenticate the user
            await this.auth.currentUser.reauthenticateWithCredential(credential);
            
            // Update email
            await this.auth.currentUser.updateEmail(newEmail);
            this.showToast('Email updated successfully!', 'success');
            this.displayCurrentUserEmail(); // Update displayed email
            e.target.reset();
        } catch (error) {
            console.error('Error changing email:', error);
            this.showToast('Failed to update email. Please check your password.', 'error');
        }
    }

    async handleChangePassword(e) {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPasswordForPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;

        if (newPassword !== confirmNewPassword) {
            this.showToast('New passwords do not match.', 'error');
            return;
        }

        if (!this.auth.currentUser) {
            this.showToast('Please log in to change your password.', 'error');
            return;
        }

        const credential = firebase.auth.EmailAuthProvider.credential(this.auth.currentUser.email, currentPassword);

        try {
            // Reauthenticate the user
            await this.auth.currentUser.reauthenticateWithCredential(credential);
            
            // Update password
            await this.auth.currentUser.updatePassword(newPassword);
            this.showToast('Password updated successfully!', 'success');
            e.target.reset();
        } catch (error) {
            console.error('Error changing password:', error);
            this.showToast('Failed to update password. Please check your current password.', 'error');
        }
    }

     displayCurrentUserEmail() {
        const userEmailSpan = document.getElementById('userEmail');
        if (userEmailSpan && this.auth.currentUser) {
            userEmailSpan.textContent = this.auth.currentUser.email;
        }
    }

    // Helper to show toast notifications (Assuming showToast is available globally or from auth.js)
    showToast(message, type) {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.warn('showToast function not available.', message, type);
        }
    }
}

// Initialize the Account class
// window.account = new Account(); // Moved initialization to dashboard.html or relevant page 