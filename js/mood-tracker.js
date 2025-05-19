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
        }

        await this.processMoodSave(saveButton); // Pass button to processSave
    }

    // Renamed and modified function to handle the save logic
    async processMoodSave(saveButton) {
        console.log('Entering processMoodSave.'); // Log entering function
        // Prevent double clicking/saving
        console.log('Checking isSaving flag:', this.isSaving); // Log isSaving state
        if (this.isSaving) {
            console.log('Save already in progress. Ignoring.'); // Log if save is skipped
            // Re-enable button here if somehow a second process started and was caught by isSaving
             if (saveButton) {
                 saveButton.disabled = false;
             }
            return;
        }
        this.isSaving = true;
        console.log('isSaving set to true.'); // Log when isSaving is set

        if (!this.auth.currentUser) {
            this.showToast('Please log in to track your mood', 'error');
            this.isSaving = false; // Reset flag
            if (saveButton) {
                saveButton.disabled = false; // Re-enable button
            }
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

            const docRef = await this.db.collection('mood_entries').add(entry);
            this.showToast('Mood entry saved successfully!', 'success', 700); // Updated message (removed reload instruction)
            
            // After saving, check for and delete duplicate entries
            await this.deleteDuplicateMoodEntries(entry);

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
            if (saveButton) {
                saveButton.disabled = false; // Re-enable button
            }
        }
    }

    // Helper function to delete duplicate entries saved close in time, keeping only the newest
    async deleteDuplicateMoodEntries(savedEntryData) {
        try {
            const userId = this.auth.currentUser.uid;
            // Fetch a few recent entries ordered by timestamp descending
            const snapshot = await this.db.collection('mood_entries')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .limit(10) // Fetch enough entries to catch potential duplicates
                .get();

            const recentEntries = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Include a simplified timestamp for comparison if needed, though comparing content is primary
                // timestamp: entryData.timestamp ? entryData.timestamp.toDate().getTime() : 0
            }));

            // Filter for entries that match the content of the saved entry
            const duplicateCandidates = recentEntries.filter(entry => {
                // Compare content fields. We don't compare timestamp directly.
                return entry.mood === savedEntryData.mood &&
                       JSON.stringify(entry.activities) === JSON.stringify(savedEntryData.activities) &&
                       entry.notes === savedEntryData.notes &&
                       entry.title === savedEntryData.title;
            });

            // If duplicates are found, keep the newest one (the first in the descending list)
            if (duplicateCandidates.length > 1) {
                // Start from the second element (index 1) to delete older duplicates
                for (let i = 1; i < duplicateCandidates.length; i++) {
                    const duplicateEntry = duplicateCandidates[i];
                    console.log('Deleting older duplicate mood entry with ID:', duplicateEntry.id);
                    await this.db.collection('mood_entries').doc(duplicateEntry.id).delete();
                }
                 // After deleting, reload history to update the display
                 this.loadMoodHistory();
            } else if (duplicateCandidates.length === 1) {
              // If only one entry with matching content is found, ensure history is loaded
              // This handles cases where the saved entry was the first of its kind
              this.loadMoodHistory();
            }
             // If no duplicates with matching content are found, load history anyway
             else {
                this.loadMoodHistory();
             }

        } catch (error) {
            console.error('Error deleting duplicate mood entries:', error);
            // Optionally show a toast about potential duplicates not being removed
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
                .limit(30)
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
                    <h3>${this.formatDate(entry.timestamp)}</h3>
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