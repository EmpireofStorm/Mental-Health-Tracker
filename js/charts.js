import { auth, db } from './config.js';

class Charts {
    constructor() {
        this.db = db;
        this.auth = auth;
        this.moodChart = null;
        if (document.getElementById('moodChart')) {
            this.setupCharts();
        }
    }

    setupCharts() {
        if (document.getElementById('moodChart')) {
            this.createMoodChart();
        }
        this.updateCharts();
    }

    createMoodChart() {
        const ctx = document.getElementById('moodChart');
        if (!ctx) return;

        this.moodChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Mood Level',
                    data: [],
                    borderColor: '#4a90e2',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 5,
                        ticks: {
                            stepSize: 1,
                            callback: function(value) {
                                const moods = ['😢', '🙁', '😐', '🙂', '😊'];
                                return moods[value - 1] || '';
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const moods = ['Very Sad', 'Sad', 'Neutral', 'Happy', 'Very Happy'];
                                return moods[context.raw - 1] || '';
                            }
                        }
                    }
                }
            }
        });
    }

    async updateCharts() {
        if (!this.auth.currentUser) return;

        const moodData = await this.getMoodData();
        this.updateMoodChart(moodData);
    }

    async getMoodData() {
        const userId = this.auth.currentUser.uid;
        const snapshot = await this.db
            .collection('moods')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(7)
            .get();

        return snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        })).reverse();
    }

    updateMoodChart(moodData) {
        const moodValues = {
            'very-sad': 1,
            'sad': 2,
            'neutral': 3,
            'happy': 4,
            'very-happy': 5
        };

        const labels = moodData.map(entry => {
            const date = new Date(entry.timestamp);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        const data = moodData.map(entry => moodValues[entry.mood]);

        this.moodChart.data.labels = labels;
        this.moodChart.data.datasets[0].data = data;
        this.moodChart.update();
    }

    async getJournalStats() {
        if (!this.auth.currentUser) return null;

        const userId = this.auth.currentUser.uid;
        const snapshot = await this.db
            .collection('journal_entries')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(7)
            .get();

        const entries = snapshot.docs.map(doc => doc.data());

        return {
            averageSleep: this.calculateAverage(entries.map(e => e.sleepHours)),
            averageStress: this.calculateAverage(entries.map(e => e.stressLevel)),
            entryCount: entries.length
        };
    }

    calculateAverage(numbers) {
        if (numbers.length === 0) return 0;
        return numbers.reduce((a, b) => a + b, 0) / numbers.length;
    }
}

// Initialize charts only if we're on a page with charts
if (document.getElementById('moodChart')) {
    const charts = new Charts();
} 