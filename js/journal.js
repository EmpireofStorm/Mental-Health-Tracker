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
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            userId: this.auth.currentUser.uid
        };

        console.log('Attempting to save journal entry:', entry);

        try {
            if (editId) {
                // Update existing entry
                await this.db.collection('journal_entries').doc(editId).update(entry);
                this.showToast('Entry updated successfully!', 'success', 700);
                delete form.dataset.editId;
            } else {
                // Create new entry
                await this.db.collection('journal_entries').add(entry);
                this.showToast('Journal entry saved successfully!', 'success', 700);
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

    showToast(message, type, delay = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, delay);
    }

    formatDate(date) {
        if (!date) return 'N/A';

        // Handle Firestore Timestamp objects or similar structures
        if (typeof date.toDate === 'function') {
            date = date.toDate();
        }
        // Handle cases where it might be a Firebase server timestamp object with seconds
        else if (date.seconds !== undefined) {
             date = new Date(date.seconds * 1000);
        }
        // Handle ISO string or other date string formats
        else if (typeof date === 'string') {
            date = new Date(date);
        }
        
        // Check if the resulting date is valid
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            return 'Invalid Date'; // Fallback for unhandleable formats
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
            <article class="journal-entry-card" data-id="${entry.id}">
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
                // Close all other dropdowns first
                document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
                    if (dropdown !== btn.nextElementSibling) {
                        dropdown.classList.remove('show');
                    }
                });
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
            const entryCard = document.querySelector(`.journal-entry-card[data-id="${entryId}"]`);
            if (!entryCard) return;

            // Store original content for cancel
            const originalContent = entryCard.innerHTML;

            // Create edit form
            const editForm = document.createElement('form');
            editForm.className = 'edit-form';
            editForm.innerHTML = `
                <div class="form-group">
                    <label for="edit-text-${entryId}">How are you feeling today?</label>
                    <textarea id="edit-text-${entryId}" rows="4" required>${entry.text}</textarea>
                </div>
                <div class="form-group">
                    <label for="edit-sleep-${entryId}">Hours of Sleep</label>
                    <input type="number" id="edit-sleep-${entryId}" min="0" max="24" step="0.5" value="${entry.sleepHours}">
                </div>
                <div class="form-group">
                    <label for="edit-stress-${entryId}">Stress Level (1-10)</label>
                    <input type="range" id="edit-stress-${entryId}" min="1" max="10" value="${entry.stressLevel}">
                    <span id="edit-stress-value-${entryId}">${entry.stressLevel}</span>
                </div>
                <div class="edit-actions">
                    <button type="submit" class="btn btn-primary">Save</button>
                    <button type="button" class="btn cancel-edit">Cancel</button>
                </div>
            `;

            // Replace content with edit form
            entryCard.innerHTML = '';
            entryCard.appendChild(editForm);

            // Update stress level display
            const stressInput = document.getElementById(`edit-stress-${entryId}`);
            const stressValue = document.getElementById(`edit-stress-value-${entryId}`);
            stressInput.addEventListener('input', () => {
                stressValue.textContent = stressInput.value;
            });

            // Handle form submission
            editForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const text = document.getElementById(`edit-text-${entryId}`).value;
                const sleepHours = parseFloat(document.getElementById(`edit-sleep-${entryId}`).value);
                const stressLevel = parseInt(document.getElementById(`edit-stress-${entryId}`).value);

                // Show success message immediately
                this.showToast('Success! Please reload the page to see your changes.', 'success');
                
                // Restore original content immediately
                entryCard.innerHTML = originalContent;
                this.attachEntryEventListeners(entryCard);

                // Then try to update in Firebase
                try {
                    await this.updateJournalEntry(entryId, {
                        text,
                        sleepHours,
                        stressLevel,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } catch (error) {
                    console.error('Error updating entry:', error);
                    this.showToast('Failed to update entry. Please try again.', 'error');
                }
            });

            // Handle cancel button
            editForm.querySelector('.cancel-edit').addEventListener('click', () => {
                // Restore original content
                entryCard.innerHTML = originalContent;
                // Reattach event listeners
                this.attachEntryEventListeners(entryCard);
            });
        } catch (error) {
            console.error('Error handling edit:', error);
            this.showToast('Failed to load entry for editing', 'error');
        }
    }

    attachEntryEventListeners(entryCard) {
        const menuButton = entryCard.querySelector('.menu-button');
        const dropdown = entryCard.querySelector('.menu-dropdown');
        const editButton = entryCard.querySelector('.edit');
        const deleteButton = entryCard.querySelector('.delete');

        if (menuButton && dropdown) {
            menuButton.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close all other dropdowns first
                document.querySelectorAll('.menu-dropdown').forEach(d => {
                    if (d !== dropdown) {
                        d.classList.remove('show');
                    }
                });
                dropdown.classList.toggle('show');
            });
        }

        if (editButton) {
            editButton.addEventListener('click', () => {
                this.handleEdit(entryCard.dataset.id);
            });
        }

        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                this.showDeleteConfirmation(entryCard.dataset.id);
            });
        }
    }
} 