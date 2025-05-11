class App {
    constructor() {
        this.auth = window.auth;
        this.db = window.db;
        this.setupAuthListener();
    }

    setupAuthListener() {
        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                await this.onUserSignedIn(user);
            } else {
                this.onUserSignedOut();
            }
        });
    }

    async onUserSignedIn(user) {
        // Update UI
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');

        // Load user data
        await this.loadUserData();
    }

    onUserSignedOut() {
        // Update UI
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');

        // Clear data
        this.clearUserData();
    }

    async loadUserData() {
        try {
            // Load journal entries
            const entries = await journal.getJournalEntries();
            journal.renderJournalEntries(entries);

            // Update charts
            await charts.updateCharts();

            // Get journal stats
            const stats = await charts.getJournalStats();
            this.updateStatsDisplay(stats);
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showToast('Error loading data. Please try again.', 'error');
        }
    }

    clearUserData() {
        // Clear journal entries
        document.getElementById('entriesList').innerHTML = '';

        // Reset charts
        charts.moodChart.data.labels = [];
        charts.moodChart.data.datasets[0].data = [];
        charts.moodChart.update();

        // Clear stats
        this.updateStatsDisplay(null);
    }

    updateStatsDisplay(stats) {
        const statsContainer = document.createElement('div');
        statsContainer.className = 'stats-container';

        if (stats) {
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <h3>Average Sleep</h3>
                    <p>${stats.averageSleep.toFixed(1)} hours</p>
                </div>
                <div class="stat-card">
                    <h3>Average Stress</h3>
                    <p>${stats.averageStress.toFixed(1)}/10</p>
                </div>
                <div class="stat-card">
                    <h3>Entries This Week</h3>
                    <p>${stats.entryCount}</p>
                </div>
            `;
        } else {
            statsContainer.innerHTML = `
                <p class="no-data">No data available. Start tracking your mood and journal entries!</p>
            `;
        }

        const existingStats = document.querySelector('.stats-container');
        if (existingStats) {
            existingStats.replaceWith(statsContainer);
        } else {
            document.querySelector('.mood-history').insertBefore(
                statsContainer,
                document.querySelector('.chart-container')
            );
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
}

// Initialize app
const app = new App(); 