class Journal {
    constructor() {
        this.db = window.db;
        this.auth = window.auth;
        this.setupJournalForm();
    }

    setupJournalForm() {
        const form = document.getElementById('journalForm');
        const stressLevel = document.getElementById('stressLevel');
        const stressValue = document.getElementById('stressValue');

        // Update stress level display
        stressLevel.addEventListener('input', () => {
            stressValue.textContent = stressLevel.value;
        });

        form.addEventListener('submit', (e) => this.handleJournalSubmit(e));
    }

    async handleJournalSubmit(e) {
        e.preventDefault();

        if (!this.auth.currentUser) {
            this.showToast('Please log in to save journal entries', 'error');
            return;
        }

        const journalText = document.getElementById('journalText').value;
        const sleepHours = document.getElementById('sleepHours').value;
        const stressLevel = document.getElementById('stressLevel').value;

        if (!journalText.trim()) {
            this.showToast('Please write something in your journal', 'error');
            return;
        }

        try {
            await this.saveJournalEntry({
                text: journalText,
                sleepHours: parseFloat(sleepHours) || 0,
                stressLevel: parseInt(stressLevel),
                timestamp: new Date()
            });

            this.showToast('Journal entry saved successfully!', 'success');
            e.target.reset();
            stressValue.textContent = '5';
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async saveJournalEntry(entry) {
        const userId = this.auth.currentUser.uid;
        await this.db.collection('journal_entries').add({
            ...entry,
            userId
        });
    }

    async getJournalEntries() {
        if (!this.auth.currentUser) return [];

        const userId = this.auth.currentUser.uid;
        const snapshot = await this.db
            .collection('journal_entries')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    async deleteJournalEntry(entryId) {
        try {
            await this.db.collection('journal_entries').doc(entryId).delete();
            this.showToast('Entry deleted successfully', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async updateJournalEntry(entryId, updates) {
        try {
            await this.db.collection('journal_entries').doc(entryId).update(updates);
            this.showToast('Entry updated successfully', 'success');
        } catch (error) {
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
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    renderJournalEntries(entries) {
        const entriesList = document.getElementById('entriesList');
        entriesList.innerHTML = entries.map(entry => `
            <article class="journal-entry-card">
                <div class="entry-header">
                    <h3>${this.formatDate(entry.timestamp)}</h3>
                    <div class="entry-actions">
                        <button class="btn btn-edit" data-id="${entry.id}">Edit</button>
                        <button class="btn btn-delete" data-id="${entry.id}">Delete</button>
                    </div>
                </div>
                <p class="entry-text">${entry.text}</p>
                <div class="entry-metrics">
                    <span>Sleep: ${entry.sleepHours} hours</span>
                    <span>Stress Level: ${entry.stressLevel}/10</span>
                </div>
            </article>
        `).join('');

        // Add event listeners for edit and delete buttons
        entriesList.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => this.handleEdit(btn.dataset.id));
        });

        entriesList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => this.handleDelete(btn.dataset.id));
        });
    }

    async handleEdit(entryId) {
        const entries = await this.getJournalEntries();
        const entry = entries.find(e => e.id === entryId);
        
        if (entry) {
            document.getElementById('journalText').value = entry.text;
            document.getElementById('sleepHours').value = entry.sleepHours;
            document.getElementById('stressLevel').value = entry.stressLevel;
            document.getElementById('stressValue').textContent = entry.stressLevel;
            
            // Scroll to form
            document.getElementById('journalForm').scrollIntoView({ behavior: 'smooth' });
        }
    }

    async handleDelete(entryId) {
        if (confirm('Are you sure you want to delete this entry?')) {
            await this.deleteJournalEntry(entryId);
            const entries = await this.getJournalEntries();
            this.renderJournalEntries(entries);
        }
    }
}

// Initialize journal
const journal = new Journal(); 