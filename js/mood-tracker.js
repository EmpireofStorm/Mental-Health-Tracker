class MoodTracker {
    constructor() {
        this.auth = window.auth;
        this.db = window.db;
        
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
        if (form) {
            form.addEventListener('submit', (e) => this.handleMoodSubmit(e));
        }
    }

    async handleMoodSubmit(e) {
        e.preventDefault();

        if (!this.auth.currentUser) {
            this.showToast('Please log in to track your mood', 'error');
            return;
        }

        const mood = document.getElementById('mood').value;
        const activities = Array.from(document.querySelectorAll('input[name="activities"]:checked'))
            .map(checkbox => checkbox.value);
        const notes = document.getElementById('moodNotes').value;

        try {
            const entry = {
                mood,
                activities,
                notes,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                userId: this.auth.currentUser.uid
            };

            await this.db.collection('mood_entries').add(entry);
            this.showToast('Mood entry saved successfully!', 'success');
            e.target.reset();
            await this.loadMoodHistory();
        } catch (error) {
            console.error('Error saving mood:', error);
            this.showToast('Failed to save mood entry. Please try again.', 'error');
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
            this.showToast('Entry updated successfully', 'success');
            await this.loadMoodHistory();
        } catch (error) {
            console.error('Error updating entry:', error);
            this.showToast('Failed to update entry', 'error');
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
        return new Date(date.toDate()).toLocaleDateString('en-US', {
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

        historyContainer.innerHTML = entries.map(entry => `
            <article class="mood-entry-card">
                <div class="entry-header">
                    <h3>${this.formatDate(entry.timestamp)}</h3>
                    <div class="entry-actions">
                        <button class="btn btn-edit" data-id="${entry.id}">Edit</button>
                        <button class="btn btn-delete" data-id="${entry.id}">Delete</button>
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

        // Add event listeners for edit and delete buttons
        historyContainer.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => this.handleEdit(btn.dataset.id));
        });

        historyContainer.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => this.handleDelete(btn.dataset.id));
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
                document.getElementById('mood').value = entry.mood;
                document.getElementById('moodNotes').value = entry.notes || '';
                
                // Reset all checkboxes
                document.querySelectorAll('input[name="activities"]').forEach(checkbox => {
                    checkbox.checked = entry.activities.includes(checkbox.value);
                });
                
                // Scroll to form
                document.getElementById('moodForm').scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            console.error('Error handling edit:', error);
            this.showToast('Failed to load entry for editing', 'error');
        }
    }

    async handleDelete(entryId) {
        if (confirm('Are you sure you want to delete this entry?')) {
            await this.deleteMoodEntry(entryId);
        }
    }
} 