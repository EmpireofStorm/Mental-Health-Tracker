class MoodTracker {
    constructor() {
        this.db = window.db;
        this.auth = window.auth;
        this.currentMood = null;
        this.setupMoodButtons();
    }

    setupMoodButtons() {
        const moodButtons = document.querySelectorAll('.mood-btn');
        moodButtons.forEach(button => {
            button.addEventListener('click', () => this.handleMoodSelection(button));
        });
    }

    async handleMoodSelection(button) {
        const mood = button.dataset.mood;
        this.currentMood = mood;

        // Update UI
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        button.classList.add('selected');

        // Save to database if user is logged in
        if (this.auth.currentUser) {
            try {
                await this.saveMood(mood);
                this.showToast('Mood saved successfully!', 'success');
            } catch (error) {
                this.showToast(error.message, 'error');
            }
        }
    }

    async saveMood(mood) {
        const userId = this.auth.currentUser.uid;
        const moodData = {
            mood,
            timestamp: new Date(),
            userId
        };

        await this.db.collection('moods').add(moodData);
    }

    async getMoodHistory() {
        if (!this.auth.currentUser) return [];

        const userId = this.auth.currentUser.uid;
        const snapshot = await this.db
            .collection('moods')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(7)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
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

// Initialize mood tracker
const moodTracker = new MoodTracker(); 