class Journal {
    constructor() {
        this.auth = window.auth;
        this.db = window.db;
        
        if (!this.auth || !this.db) {
            console.error('Firebase services not initialized');
            return;
        }

        // Only initialize if we're on a page with journal
        if (document.getElementById('journalForm')) {
            this.setupJournalForm();
            this.loadJournalEntries();
        }
    }

    setupJournalForm() {
        const form = document.getElementById('journalForm');
        const stressLevel = document.getElementById('stressLevel');
        const stressValue = document.getElementById('stressValue');

        if (form && stressLevel && stressValue) {
            // Update stress level display
            stressLevel.addEventListener('input', () => {
                stressValue.textContent = stressLevel.value;
            });

            form.addEventListener('submit', (e) => this.handleJournalSubmit(e));
        } else {
            console.error('Required journal form elements not found');
        }
    }

    async handleJournalSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const editId = form.dataset.editId;

        const entry = {
            text: document.getElementById('journalText').value,
            sleepHours: parseFloat(document.getElementById('sleepHours').value),
            stressLevel: parseInt(document.getElementById('stressLevel').value),
            timestamp: new Date().toISOString(),
            userId: this.auth.currentUser.uid
        };

        try {
            if (editId) {
                // Update existing entry
                await this.db.collection('journal_entries').doc(editId).update(entry);
                this.showToast('Entry updated successfully', 'success');
                delete form.dataset.editId;
            } else {
                // Create new entry
                await this.db.collection('journal_entries').add(entry);
                this.showToast('Entry saved successfully', 'success');
            }

            form.reset();
            document.getElementById('stressValue').textContent = '5';
            await this.loadJournalEntries();
        } catch (error) {
            console.error('Error saving journal entry:', error);
            this.showToast('Failed to save entry', 'error');
        }
    }

    async getJournalEntries() {
        if (!this.auth.currentUser) {
            console.log('No user logged in');
            return [];
        }

        try {
            const userId = this.auth.currentUser.uid;
            const snapshot = await this.db.collection('journal_entries')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting journal entries:', error);
            this.showToast('Failed to load journal entries', 'error');
            return [];
        }
    }

    async deleteJournalEntry(entryId) {
        try {
            await this.db.collection('journal_entries').doc(entryId).delete();
            this.showToast('Entry deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting entry:', error);
            this.showToast(error.message, 'error');
        }
    }

    async updateJournalEntry(entryId, updates) {
        try {
            await this.db.collection('journal_entries').doc(entryId).update(updates);
            this.showToast('Entry updated successfully', 'success');
        } catch (error) {
            console.error('Error updating entry:', error);
            this.showToast(error.message, 'error');
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

    formatDate(date) {
        if (!date) return 'N/A';
        
        // Handle Firestore Timestamp
        if (date.toDate) {
            date = date.toDate();
        }
        // Handle ISO string
        else if (typeof date === 'string') {
            date = new Date(date);
        }
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async loadJournalEntries() {
        try {
            const entries = await this.getJournalEntries();
            this.renderJournalEntries(entries);
        } catch (error) {
            console.error('Error loading journal entries:', error);
            this.showToast('Error loading journal entries', 'error');
        }
    }

    renderJournalEntries(entries) {
        const entriesList = document.getElementById('entriesList');
        if (!entriesList) return;

        entriesList.innerHTML = entries.map(entry => `
            <article class="journal-entry-card">
                <div class="entry-header">
                    <h3>${this.formatDate(entry.timestamp)}</h3>
                    <div class="entry-actions">
                        <button class="menu-button" data-id="${entry.id}">⋮</button>
                        <div class="menu-dropdown" data-id="${entry.id}">
                            <button class="edit">Edit</button>
                            <button class="delete">Delete</button>
                        </div>
                    </div>
                </div>
                <p class="entry-text">${entry.text}</p>
                <div class="entry-metrics">
                    <span>Sleep: ${entry.sleepHours} hours</span>
                    <span>Stress Level: ${entry.stressLevel}/10</span>
                </div>
            </article>
        `).join('');

        // Add event listeners for menu buttons
        entriesList.querySelectorAll('.menu-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = btn.nextElementSibling;
                dropdown.classList.toggle('show');
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.entry-actions')) {
                document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
                    dropdown.classList.remove('show');
                });
            }
        });

        // Add event listeners for edit and delete buttons
        entriesList.querySelectorAll('.menu-dropdown .edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const entryId = btn.closest('.menu-dropdown').dataset.id;
                this.handleEdit(entryId);
            });
        });

        entriesList.querySelectorAll('.menu-dropdown .delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const entryId = btn.closest('.menu-dropdown').dataset.id;
                this.showDeleteConfirmation(entryId);
            });
        });
    }

    showDeleteConfirmation(entryId) {
        const dialog = document.getElementById('confirmationDialog');
        dialog.classList.add('show');

        const confirmBtn = dialog.querySelector('.confirm');
        const cancelBtn = dialog.querySelector('.cancel');

        const handleConfirm = async () => {
            await this.deleteJournalEntry(entryId);
            await this.loadJournalEntries();
            dialog.classList.remove('show');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        const handleCancel = () => {
            dialog.classList.remove('show');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    }

    async handleEdit(entryId) {
        try {
            const doc = await this.db.collection('journal_entries').doc(entryId).get();
            if (!doc.exists) {
                this.showToast('Entry not found', 'error');
                return;
            }

            const entry = doc.data();
            document.getElementById('journalText').value = entry.text;
            document.getElementById('sleepHours').value = entry.sleepHours;
            document.getElementById('stressLevel').value = entry.stressLevel;
            document.getElementById('stressValue').textContent = entry.stressLevel;

            // Store the entry ID for the update
            document.getElementById('journalForm').dataset.editId = entryId;

            // Scroll to the form
            document.querySelector('.journal-entry').scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Error loading entry for edit:', error);
            this.showToast('Failed to load entry for editing', 'error');
        }
    }
} 