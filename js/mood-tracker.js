class MoodTracker {
    constructor() {
        this.auth = window.auth;
        this.db = window.db;
        
        // Flag to prevent double saving
        this.isSaving = false;

        // Store bound handlers
        this.boundProcessMoodSave = this.processMoodSave.bind(this);
        this.boundHandleSaveButtonClick = this.handleSaveButtonClick.bind(this); // Bind button click handler

        if (!this.auth || !this.db) {
            console.error('Firebase services not initialized');
            return;
        }

        // Only initialize if we're on a page with mood tracking
        if (document.getElementById('moodForm')) {
            this.setupMoodForm();
            this.loadMoodHistory();
        }
    }

    setupMoodForm() {
        const form = document.getElementById('moodForm');
        const saveButton = form ? form.querySelector('button[type="submit"]') : null;

        if (form && saveButton) {
            // Remove any existing listeners before adding new ones
            form.removeEventListener('submit', this.boundProcessMoodSave); // Keep this in case form submit is still somehow triggered
            saveButton.removeEventListener('click', this.boundHandleSaveButtonClick); // Remove existing button click listener

            // Add click listener to the save button
            saveButton.addEventListener('click', this.boundHandleSaveButtonClick);
        }
    }

    // New handler for button click
    async handleSaveButtonClick(e) {
        console.log('Save button clicked.'); // Log button click
        e.preventDefault(); // Prevent default button click behavior

        const form = document.getElementById('moodForm');
        const saveButton = form ? form.querySelector('button[type="submit"]') : null;

        if (saveButton) {
            saveButton.disabled = true; // Disable button on click
            // Re-enable button after 1 second
            setTimeout(() => {
                saveButton.disabled = false;
            }, 1000);
        }

        await this.processMoodSave(); // Call processSave immediately
    }

    // Renamed and modified function to handle the save logic
    async processMoodSave() {
        console.log('Entering processMoodSave.'); // Log entering function
        // Prevent double clicking/saving
        console.log('Checking isSaving flag:', this.isSaving); // Log isSaving state
        if (this.isSaving) {
            console.log('Save already in progress. Ignoring.'); // Log if save is skipped
            return;
        }
        this.isSaving = true;
        console.log('isSaving set to true.'); // Log when isSaving is set

        if (!this.auth.currentUser) {
            this.showToast('Please log in to track your mood', 'error');
            this.isSaving = false; // Reset flag
            return;
        }

        const mood = document.getElementById('mood').value;
        const activities = Array.from(document.querySelectorAll('input[name="activities"]:checked'))
            .map(checkbox => checkbox.value);
        const notes = document.getElementById('moodNotes').value;
        const title = document.getElementById('moodTitle').value.trim(); // Get title and remove leading/trailing whitespace

        try {
            const entry = {
                mood,
                activities,
                notes,
                title: title || 'Mood Entry', // Use provided title or default to 'Mood Entry'
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                userId: this.auth.currentUser.uid
            };

            console.log('Attempting to save mood entry:', entry);

            await this.db.collection('mood_entries').add(entry);
            this.showToast('Mood entry saved successfully!', 'success', 700); // Updated message (removed reload instruction)
            
            // Find the form and reset it
            const form = document.getElementById('moodForm');
            if (form) {
                form.reset();
            }

            await this.loadMoodHistory();
        } catch (error) {
            console.error('Error saving mood:', error);
            this.showToast('Failed to save mood entry. Please try again.', 'error');
        } finally {
            this.isSaving = false; // Reset flag
        }
    }

    async getMoodEntries() {
        if (!this.auth.currentUser) {
            console.log('No user logged in');
            return [];
        }

        try {
            const userId = this.auth.currentUser.uid;
            const snapshot = await this.db.collection('mood_entries')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting mood entries:', error);
            this.showToast('Failed to load mood history', 'error');
            return [];
        }
    }

    async deleteMoodEntry(entryId) {
        try {
            await this.db.collection('mood_entries').doc(entryId).delete();
            this.showToast('Entry deleted successfully', 'success');
            await this.loadMoodHistory();
        } catch (error) {
            console.error('Error deleting entry:', error);
            this.showToast('Failed to delete entry', 'error');
        }
    }

    async updateMoodEntry(entryId, updates) {
        try {
            await this.db.collection('mood_entries').doc(entryId).update(updates);
            return true;
        } catch (error) {
            console.error('Error updating entry:', error);
            throw new Error('Failed to update entry. Please try again.');
        }
    }

    showToast(message, type, delay = 4000) {
        // Remove any existing toasts
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.padding = '15px 25px';
        toast.style.borderRadius = '4px';
        toast.style.color = 'white';
        toast.style.zIndex = '9999';
        toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        toast.style.animation = 'slideIn 0.3s ease-out';
        
        if (type === 'success') {
            toast.style.backgroundColor = '#2ecc71';
        } else {
            toast.style.backgroundColor = '#e74c3c';
        }

        document.body.appendChild(toast);

        // Increase display time
        if (delay === 'infinite') {
            toast.style.animation = 'infiniteSlide 0.3s ease-out';
        }
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                toast.remove();
            }, 300);
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

    async loadMoodHistory() {
        try {
            const entries = await this.getMoodEntries();
            this.renderMoodHistory(entries);
        } catch (error) {
            console.error('Error loading mood history:', error);
            this.showToast('Error loading mood history', 'error');
        }
    }

    renderMoodHistory(entries) {
        const historyContainer = document.getElementById('moodHistory');
        if (!historyContainer) return;

        if (entries.length === 0) {
            historyContainer.innerHTML = '<p class="no-entries">No mood entries yet. Start tracking your mood!</p>';
            return;
        }

        historyContainer.innerHTML = entries.map((entry, index) => `
            <article class="mood-entry-card" data-id="${entry.id}">
                <div class="entry-header">
                    <h3>${(entry.title || 'Mood Entry')} #${entries.length - index}</h3>
                    <div class="entry-actions">
                        <button class="menu-button" data-id="${entry.id}">⋮</button>
                        <div class="menu-dropdown" data-id="${entry.id}">
                            <button class="edit">Edit</button>
                            <button class="delete">Delete</button>
                        </div>
                    </div>
                </div>
                <div class="mood-display">
                    <span class="mood-emoji">${this.getMoodEmoji(entry.mood)}</span>
                    <span class="mood-text">${entry.mood}</span>
                </div>
                <div class="activities-list">
                    ${entry.activities.map(activity => `
                        <span class="activity-tag">${activity}</span>
                    `).join('')}
                </div>
                ${entry.notes ? `<p class="mood-notes">${entry.notes}</p>` : ''}
            </article>
        `).join('');

        // Add event listeners for menu buttons
        historyContainer.querySelectorAll('.menu-button').forEach(btn => {
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

        // Add event listeners for edit and delete buttons
        historyContainer.querySelectorAll('.menu-dropdown .edit').forEach(btn => {
            btn.addEventListener('click', () => this.handleEdit(btn.closest('.menu-dropdown').dataset.id));
        });

        historyContainer.querySelectorAll('.menu-dropdown .delete').forEach(btn => {
            btn.addEventListener('click', () => this.handleDelete(btn.closest('.menu-dropdown').dataset.id));
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.entry-actions')) {
                document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
                    dropdown.classList.remove('show');
                });
            }
        });
    }

    getMoodEmoji(mood) {
        const emojis = {
            'Very Happy': '😄',
            'Happy': '🙂',
            'Neutral': '😐',
            'Sad': '🙁',
            'Very Sad': '😢'
        };
        return emojis[mood] || '❓';
    }

    async handleEdit(entryId) {
        try {
            const entries = await this.getMoodEntries();
            const entry = entries.find(e => e.id === entryId);
            
            if (entry) {
                const entryCard = document.querySelector(`.mood-entry-card[data-id="${entryId}"]`);
                if (!entryCard) return;

                // Store original content for cancel
                const originalContent = entryCard.innerHTML;

                // Create edit form
                const editForm = document.createElement('form');
                editForm.className = 'edit-form';
                editForm.innerHTML = `
                    <div class="form-group">
                        <label for="edit-title-${entryId}">Title:</label>
                        <input type="text" id="edit-title-${entryId}" value="${entry.title || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-mood-${entryId}">Mood:</label>
                        <select id="edit-mood-${entryId}" required>
                            <option value="Very Happy" ${entry.mood === 'Very Happy' ? 'selected' : ''}>Very Happy 😄</option>
                            <option value="Happy" ${entry.mood === 'Happy' ? 'selected' : ''}>Happy 🙂</option>
                            <option value="Neutral" ${entry.mood === 'Neutral' ? 'selected' : ''}>Neutral 😐</option>
                            <option value="Sad" ${entry.mood === 'Sad' ? 'selected' : ''}>Sad 🙁</option>
                            <option value="Very Sad" ${entry.mood === 'Very Sad' ? 'selected' : ''}>Very Sad 😢</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Activities:</label>
                        <div class="checkbox-group">
                            <label>
                                <input type="checkbox" name="edit-activities-${entryId}" value="Exercise" ${entry.activities.includes('Exercise') ? 'checked' : ''}> Exercise
                            </label>
                            <label>
                                <input type="checkbox" name="edit-activities-${entryId}" value="Meditation" ${entry.activities.includes('Meditation') ? 'checked' : ''}> Meditation
                            </label>
                            <label>
                                <input type="checkbox" name="edit-activities-${entryId}" value="Reading" ${entry.activities.includes('Reading') ? 'checked' : ''}> Reading
                            </label>
                            <label>
                                <input type="checkbox" name="edit-activities-${entryId}" value="Social" ${entry.activities.includes('Social') ? 'checked' : ''}> Social
                            </label>
                            <label>
                                <input type="checkbox" name="edit-activities-${entryId}" value="Work" ${entry.activities.includes('Work') ? 'checked' : ''}> Work
                            </label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="edit-notes-${entryId}">Notes:</label>
                        <textarea id="edit-notes-${entryId}" rows="3">${entry.notes || ''}</textarea>
                    </div>
                    <div class="edit-actions">
                        <button type="submit" class="btn btn-primary">Save</button>
                        <button type="button" class="btn cancel-edit">Cancel</button>
                    </div>
                `;

                // Replace content with edit form
                entryCard.innerHTML = '';
                entryCard.appendChild(editForm);

                // Handle form submission
                editForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const title = document.getElementById(`edit-title-${entryId}`).value.trim();
                    const mood = document.getElementById(`edit-mood-${entryId}`).value;
                    const activities = Array.from(document.querySelectorAll(`input[name="edit-activities-${entryId}"]:checked`))
                        .map(checkbox => checkbox.value);
                    const notes = document.getElementById(`edit-notes-${entryId}`).value;

                    // Show success message immediately
                    this.showToast('Success! Please reload the page to see your changes.', 'success');
                    
                    // Restore original content immediately
                    entryCard.innerHTML = originalContent;
                    this.attachEntryEventListeners(entryCard);

                    // Then try to update in Firebase
                    try {
                        await this.updateMoodEntry(entryId, {
                            title,
                            mood,
                            activities,
                            notes
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
            }
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
                this.handleDelete(entryCard.dataset.id);
            });
        }
    }

    async handleDelete(entryId) {
        if (confirm('Are you sure you want to delete this entry?')) {
            await this.deleteMoodEntry(entryId);
        }
    }
} 