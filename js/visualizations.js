document.addEventListener('DOMContentLoaded', async () => {
    // Ensure Firebase is initialized and user is logged in
    const auth = window.auth;
    const db = window.db;

    if (!auth || !db) {
        console.error('Firebase services not initialized');
        // Display a message to the user
        document.getElementById('visualizations-section').innerHTML = '<p>Firebase not initialized. Please try logging in again.</p>';
        return;
    }

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('User logged in. Loading data for visualizations.');
            await loadAndRenderCharts(user.uid, db);
        } else {
            console.log('No user logged in. Redirecting to login page.');
            // Redirect to login page if not logged in
            window.location.href = 'index.html'; 
        }
    });
});

async function loadAndRenderCharts(userId, db) {
    try {
        // Fetch Mood Entries
        const moodSnapshot = await db.collection('mood_entries')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'asc') // Order by timestamp for chronological charts
            .get();

        const moodEntries = moodSnapshot.docs.map(doc => doc.data());
        console.log('Fetched mood entries:', moodEntries);

        // Fetch Journal Entries (for stress levels)
        const journalSnapshot = await db.collection('journal_entries')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'asc') // Order by timestamp for chronological charts
            .get();

        const journalEntries = journalSnapshot.docs.map(doc => doc.data());
         console.log('Fetched journal entries:', journalEntries);

        // Process data and render charts
        renderMoodChart(moodEntries);
        renderStressChart(journalEntries);

    } catch (error) {
        console.error('Error loading data for visualizations:', error);
         document.getElementById('visualizations-section').innerHTML = '<p>Error loading data. Please try again later.</p>';
    }
}

function renderMoodChart(moodEntries) {
    const canvas = document.getElementById('moodChart');
    if (!canvas) {
        console.error('Mood chart canvas element not found.');
        return;
    }
    const ctx = canvas.getContext('2d');
    
    // Example: Count of each mood over time
    const moodCounts = {};
    const labels = [];
    const moodData = {
        'Very Happy': [],
        'Happy': [],
        'Neutral': [],
        'Sad': [],
        'Very Sad': []
    };

    moodEntries.forEach(entry => {
        const date = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString() : 'N/A';
        if (!labels.includes(date)) {
            labels.push(date);
        }

        // Initialize counts for this date if not present
        if (!moodCounts[date]) {
            moodCounts[date] = {
                'Very Happy': 0,
                'Happy': 0,
                'Neutral': 0,
                'Sad': 0,
                'Very Sad': 0
            };
        }
        moodCounts[date][entry.mood]++;
    });

     // Populate moodData arrays based on collected counts for each date
     labels.forEach(label => {
        Object.keys(moodData).forEach(mood => {
            moodData[mood].push(moodCounts[label][mood] || 0);
        });
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Very Happy',
                    data: moodData['Very Happy'],
                    borderColor: '#2ecc71',
                    backgroundColor: '#2ecc71',
                    fill: false
                },
                {
                    label: 'Happy',
                    data: moodData['Happy'],
                    borderColor: '#3498db',
                    backgroundColor: '#3498db',
                    fill: false
                },
                 {
                    label: 'Neutral',
                    data: moodData['Neutral'],
                    borderColor: '#7f8c8d',
                    backgroundColor: '#7f8c8d',
                    fill: false
                },
                 {
                    label: 'Sad',
                    data: moodData['Sad'],
                    borderColor: '#e67e22',
                    backgroundColor: '#e67e22',
                    fill: false
                },
                 {
                    label: 'Very Sad',
                    data: moodData['Very Sad'],
                    borderColor: '#e74c3c',
                    backgroundColor: '#e74c3c',
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Number of Entries'
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Mood Trends Over Time'
                }
            }
        }
    });
}

function renderStressChart(journalEntries) {
    const canvas = document.getElementById('stressChart');
     if (!canvas) {
        console.error('Stress chart canvas element not found.');
        return;
    }
    const ctx = canvas.getContext('2d');

    const labels = [];
    const stressLevels = [];

    journalEntries.forEach(entry => {
         const date = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString() : 'N/A';
        labels.push(date);
        stressLevels.push(entry.stressLevel);
    });

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Stress Level',
                data: stressLevels,
                borderColor: '#9b59b6', // Purple color
                backgroundColor: '#9b59b6',
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Stress Level (1-10)'
                    },
                    beginAtZero: true,
                    max: 10 // Stress level is 1-10
                }
            },
             plugins: {
                title: {
                    display: true,
                    text: 'Stress Level Over Time'
                }
            }
        }
    });
} 