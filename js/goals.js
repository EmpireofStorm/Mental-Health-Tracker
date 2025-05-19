class Goals {
    constructor() {
        console.log('Goals class initialized');
        this.auth = window.auth;
        this.db = window.db;
        this.currentUser = null;
        this.setupDone = false;

        if (!this.auth || !this.db) {
            console.error('Firebase services not initialized in Goals constructor');
            return;
        }

        // No automatic setup or auth listening in constructor
    }

    // This method will be called from dashboard.html when the goals tab is clicked
    async activateGoalsSection(user) {
        console.log('Activating Goals section with user:', user ? user.email : 'null');
        this.currentUser = user; // Store the user

        const goalsContent = document.getElementById('goalsContent');

        if (!goalsContent) {
            console.error('Goals content element not found. Cannot activate.');
            return;
        }

        if (!this.currentUser) {
            console.log('User not logged in. Displaying login message in Goals section.');
            goalsContent.innerHTML = '<p>Please log in to view and manage your goals.</p>';
            return;
        }

        // User is logged in, proceed with setup and loading
        console.log('User logged in. Performing setup and loading.');
        this.setupGoals(); // Ensure DOM setup and listeners
        await this.loadGoals(); // Load user's goals
    }

    setupGoals() {
        // Add event listeners only once
        if (!this.setupDone) {
            console.log('Performing one-time goals setup.');
            const addGoalBtn = document.getElementById('addGoalBtn');
            const addGoalModal = document.getElementById('addGoalModal');
            const closeGoalModalBtn = document.getElementById('closeGoalModal');
            const addGoalForm = document.getElementById('addGoalForm');

            if (addGoalBtn && addGoalModal && closeGoalModalBtn && addGoalForm) {
                addGoalBtn.addEventListener('click', () => this.showAddGoalForm());
                closeGoalModalBtn.addEventListener('click', () => this.hideAddGoalForm());
                // Close modal if clicking outside the content
                addGoalModal.addEventListener('click', (e) => {
                    if (e.target === addGoalModal) {
                        this.hideAddGoalForm();
                    }
                });

                addGoalForm.addEventListener('submit', (e) => this.handleSaveGoal(e));

                // Add listener for goal type change to show/hide target value field
                const goalTypeSelect = document.getElementById('goalType');
                const targetValueGroup = document.getElementById('targetValueGroup');
                if (goalTypeSelect && targetValueGroup) {
                    goalTypeSelect.addEventListener('change', () => {
                        // Show target value field only for 'stress-level-avg' for now
                        if (goalTypeSelect.value === 'stress-level-avg') {
                            targetValueGroup.style.display = 'block';
                        } else {
                            targetValueGroup.style.display = 'none';
                        }
                    });
                     // Trigger initial check on page load if the form is visible
                     // This might need adjustment based on how the goals tab is handled
                     // A better approach might be to call this check when the modal is shown.
                }

                this.setupDone = true; // Mark setup as complete
            } else {
                console.error('Required goal elements not found during setup');
            }
        }
        // Even if setupDone, ensure the addGoalBtn is enabled/visible if needed
        const addGoalBtn = document.getElementById('addGoalBtn');
        if (addGoalBtn) addGoalBtn.style.display = ''; // Make sure button is visible
    }

    async loadGoals() {
        console.log('Loading goals...');
        if (!this.currentUser) {
            console.log('No user logged in, cannot load goals.');
            // The activateGoalsSection method should handle displaying a message
            return; // Exit if no user
        }
        try {
            const userId = this.currentUser.uid; // Use internal currentUser
            const snapshot = await this.db.collection('goals')
                .where('userId', '==', userId)
                .get();

            const goals = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log('Fetched goals:', goals);
            this.renderGoals(goals);
            this.findAndDisplayFeaturedGoal(goals); // Call after loading goals

        } catch (error) {
            console.error('Error loading goals:', error);
            const goalsListContainer = document.getElementById('goalsList');
            if (goalsListContainer) {
                goalsListContainer.innerHTML = '<p>Error loading goals. Please try again later.</p>';
            }
        }
    }

    renderGoals(goals) {
        const goalsListContainer = document.getElementById('goalsList');
        if (!goalsListContainer) return;

        if (goals.length === 0) {
            goalsListContainer.innerHTML = '<p>No goals set yet. Add a new goal to get started!</p>';
            return;
        }

        // Clear previous goals before rendering new ones
        goalsListContainer.innerHTML = '';

        // Basic rendering for now - we'll add progress later
        goals.forEach(async goal => { // Use forEach with async to handle calculateGoalProgress individually
             const goalCard = document.createElement('div');
             goalCard.className = 'goal-card';

             // Format dates for display
             const startDateDisplay = goal.startDate instanceof firebase.firestore.Timestamp ? this.formatDate(goal.startDate) : (goal.startDate ? new Date(goal.startDate).toLocaleDateString() : 'Not set');
             const endDateDisplay = goal.endDate instanceof firebase.firestore.Timestamp ? this.formatDate(goal.endDate) : (goal.endDate ? new Date(goal.endDate).toLocaleDateString() : 'Not set');

             goalCard.innerHTML = `
                 <h3>${goal.name}</h3>
                 <p>${goal.description || ''}</p>
                 <p>Type: ${goal.type}</p>
                 <p>Time Period: ${startDateDisplay} - ${endDateDisplay}</p>
                 ${goal.targetValue !== null ? `<p>Target Value: ${goal.targetValue}</p>` : ''}
                 <p class="goal-progress" data-goal-id="${goal.id}">Loading progress...</p>
                 <!-- Add menu button for actions -->
                  <div class="entry-actions">
                        <button class="menu-button" data-id="${goal.id}">⋮</button>
                        <div class="menu-dropdown" data-id="${goal.id}">
                            <button class="edit">Edit</button>
                            <button class="delete">Delete</button>
                        </div>
                    </div>
             `;
             goalsListContainer.appendChild(goalCard);

            // Calculate and display progress for this specific goal
            const progressText = await this.calculateGoalProgress(goal);
            const progressElement = goalCard.querySelector(`.goal-progress[data-goal-id="${goal.id}"]`);
            if (progressElement) {
                progressElement.textContent = progressText;
            }
        });

        // Add event listeners for menu buttons and actions
        goalsListContainer.querySelectorAll('.goal-card .menu-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close all other dropdowns first
                goalsListContainer.querySelectorAll('.goal-card .menu-dropdown').forEach(dropdown => {
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
            if (!e.target.closest('.goal-card .entry-actions')) {
                goalsListContainer.querySelectorAll('.goal-card .menu-dropdown').forEach(dropdown => {
                    dropdown.classList.remove('show');
                });
            }
        });

        // Add event listeners for edit and delete buttons within dropdowns
        goalsListContainer.querySelectorAll('.goal-card .menu-dropdown .edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const goalId = btn.closest('.menu-dropdown').dataset.id;
                this.handleEditGoal(goalId); // Call the edit handler
            });
        });

        goalsListContainer.querySelectorAll('.goal-card .menu-dropdown .delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const goalId = btn.closest('.menu-dropdown').dataset.id;
                // For delete, we might want a confirmation step
                if (confirm('Are you sure you want to delete this goal?')) {
                     this.handleDeleteGoal(goalId); // Call the delete handler
                }
            });
        });
    }

    showAddGoalForm() {
        console.log('Attempting to show add goal modal.');
        const addGoalModal = document.getElementById('addGoalModal');
        if (addGoalModal) {
            addGoalModal.classList.add('show');
        }
    }

    hideAddGoalForm() {
        const addGoalModal = document.getElementById('addGoalModal');
        if (addGoalModal) {
            addGoalModal.classList.remove('show');
            // Also reset the form when hidden
            const addGoalForm = document.getElementById('addGoalForm');
            if (addGoalForm) {
                addGoalForm.reset();
            }
        }
    }

    async handleSaveGoal(e) {
        e.preventDefault();
        const form = e.target;

        const goalName = document.getElementById('goalName').value;
        const goalDescription = document.getElementById('goalDescription').value;
        const goalType = document.getElementById('goalType').value;

        // Get new date and target value fields
        const goalStartDate = document.getElementById('goalStartDate').value;
        const goalEndDate = document.getElementById('goalEndDate').value;
        const goalTargetValue = document.getElementById('goalTargetValue').value;

        if (!this.currentUser) {
            console.error('No user logged in, cannot save goal.');
            // Show an error message to the user
            return;
        }

        const userId = this.currentUser.uid; // Use internal currentUser

        const newGoal = {
            name: goalName,
            description: goalDescription,
            type: goalType,
            userId: userId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            // Include date and target value fields
            startDate: goalStartDate ? new Date(goalStartDate) : null, // Convert to Date object or null
            endDate: goalEndDate ? new Date(goalEndDate) : null, // Convert to Date object or null
            targetValue: goalTargetValue ? parseFloat(goalTargetValue) : null // Convert to number or null
        };

        console.log('Attempting to save goal:', newGoal);

        try {
            await this.db.collection('goals').add(newGoal);
            console.log('Goal saved successfully!');
            // Show a success message (optional, but good UX)
            this.hideAddGoalForm();
            this.loadGoals(); // Reload the list of goals
        } catch (error) {
            console.error('Error saving goal:', error);
            // Show an error message to the user
        }
    }

    // Placeholder for calculating goal progress (e.g., average stress level)
    async calculateGoalProgress(goal) {
        console.log('Calculating progress for goal:', goal);

        if (!this.currentUser) {
            console.error('No user logged in, cannot calculate goal progress.');
            return 'Login required';
        }

        if (goal.type === 'stress-level-avg') {
            try {
                const userId = this.currentUser.uid; // Use internal currentUser
                // Fetch the last 7 journal entries ordered by timestamp descending
                const snapshot = await this.db.collection('journal_entries')
                    .where('userId', '==', userId)
                    .orderBy('timestamp', 'desc')
                    .limit(7)
                    .get();

                const latestEntries = snapshot.docs.map(doc => doc.data());
                console.log('Fetched latest journal entries for stress calculation:', latestEntries);

                if (latestEntries.length === 0) {
                    return 'No journal entries yet.';
                }

                // Calculate the average stress level
                const totalStress = latestEntries.reduce((sum, entry) => sum + (entry.stressLevel || 0), 0);
                const averageStress = totalStress / latestEntries.length;

                let progressString = `Average Stress (last ${latestEntries.length} entries): ${averageStress.toFixed(1)}`;

                // Compare to target value if set (assuming target is an upper limit)
                if (goal.targetValue !== null && goal.targetValue !== undefined) {
                     if (averageStress <= goal.targetValue) {
                         progressString += ` (Target < ${goal.targetValue}: On Track!)`;
                     } else {
                         progressString += ` (Target < ${goal.targetValue}: Above Target)`;
                     }
                }

                return progressString;

            } catch (error) {
                console.error('Error calculating stress level progress:', error);
                return 'Error calculating progress.';
            }
        }

        // Default progress for unhandled goal types
        return 'Progress not available for this goal type.';
    }

    // Find and display the goal closest to its start or end date on the main dashboard
    async findAndDisplayFeaturedGoal(goals) {
        console.log('Finding and displaying featured goal.');
        const featuredGoalContainer = document.getElementById('featuredGoal');
        const featuredGoalContent = document.getElementById('featuredGoalContent');

        if (!featuredGoalContainer || !featuredGoalContent) {
            console.log('Featured goal container elements not found.');
            return;
        }

        if (!goals || goals.length === 0) {
            featuredGoalContainer.classList.add('hidden'); // Hide the section if no goals
            return;
        }

        const now = new Date();
        let closestGoal = null;
        let minDiff = Infinity;

        goals.forEach(goal => {
            let diff = Infinity;
            if (goal.startDate) {
                const startDate = goal.startDate instanceof firebase.firestore.Timestamp ? goal.startDate.toDate() : new Date(goal.startDate);
                 diff = Math.abs(startDate.getTime() - now.getTime());
            }
            if (goal.endDate) {
                 const endDate = goal.endDate instanceof firebase.firestore.Timestamp ? goal.endDate.toDate() : new Date(goal.endDate);
                 const endDateDiff = Math.abs(endDate.getTime() - now.getTime());
                 if (endDateDiff < diff) {
                     diff = endDateDiff;
                 }
            }

            if (diff < minDiff) {
                minDiff = diff;
                closestGoal = goal;
            }
        });

        if (closestGoal) {
            console.log('Closest goal found:', closestGoal);
            console.log('Before removing hidden class:', featuredGoalContainer.classList.contains('hidden'));
            featuredGoalContainer.classList.remove('hidden'); // Show the section
            featuredGoalContainer.style.display = 'block'; // Explicitly set display
            console.log('After removing hidden class and setting display:', featuredGoalContainer.classList.contains('hidden'), featuredGoalContainer.style.display);

            // Render the featured goal details and progress
            const startDateDisplay = closestGoal.startDate instanceof firebase.firestore.Timestamp ? this.formatDate(closestGoal.startDate) : (closestGoal.startDate ? new Date(closestGoal.startDate).toLocaleDateString() : 'Not set');
             const endDateDisplay = closestGoal.endDate instanceof firebase.firestore.Timestamp ? this.formatGoalEndDate(closestGoal.endDate) : (closestGoal.endDate ? new Date(closestGoal.endDate).toLocaleDateString() : 'Not set');

            featuredGoalContent.innerHTML = `
                <h3>${closestGoal.name}</h3>
                <p>${closestGoal.description || ''}</p>
                <p>Time Period: ${startDateDisplay} - ${endDateDisplay}</p>
                 ${closestGoal.targetValue !== null ? `<p>Target Value: ${closestGoal.targetValue}</p>` : ''}
                <p class="featured-goal-progress" data-goal-id="${closestGoal.id}">Loading progress...</p>
            `;

             // Calculate and display progress for the featured goal
            const progressText = await this.calculateGoalProgress(closestGoal);
            const progressElement = featuredGoalContent.querySelector(`.featured-goal-progress[data-goal-id="${closestGoal.id}"]`);
            if (progressElement) {
                progressElement.textContent = progressText;
            }

        } else {
            console.log('No closest goal found. Hiding featured goal section.');
            featuredGoalContainer.classList.add('hidden'); // Hide if no goals found
            featuredGoalContainer.style.display = 'none'; // Explicitly hide
        }
    }

    // Helper to format end date for display (optional, can reuse formatDate)
    formatGoalEndDate(date) {
        if (!date) return 'Not set';
        if (date instanceof firebase.firestore.Timestamp) {
             return this.formatDate(date);
        }
        return new Date(date).toLocaleDateString();
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
        
        // Simple date format for display in goals
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }

    // Add methods for handling edit and delete actions (placeholders for now)
    async handleDeleteGoal(goalId) {
        console.log('Attempting to delete goal with ID:', goalId);
        if (!this.auth.currentUser) {
            console.error('No user logged in. Cannot delete goal.');
            this.showToast('Error: No user logged in.', false);
            return;
        }

        // Confirmation dialog (basic browser confirm for now)
        if (!confirm('Are you sure you want to delete this goal?')) {
            console.log('Goal deletion cancelled by user.');
            return;
        }

        try {
            const goalRef = doc(this.db, `users/${this.auth.currentUser.uid}/goals`, goalId);
            await deleteDoc(goalRef);
            console.log('Goal successfully deleted:', goalId);
            this.showToast('Goal deleted successfully!', true);
            // The snapshot listener should automatically update the UI
        } catch (error) {
            console.error('Error removing goal:', error);
            this.showToast('Error deleting goal.', false);
        }
    }

    async handleEditGoal(goalId) {
        console.log('Attempting to edit goal:', goalId);
        // Implement edit logic (show a modal/form pre-filled with goal data)
         this.showToast('Edit goal functionality not yet fully implemented', 'info');
    }

    // Helper for showing toasts (copy from mood-tracker or journal if not already there)
    showToast(message, type, delay = 3000) {
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
        } else if (type === 'error') {
             toast.style.backgroundColor = '#e74c3c';
        } else { // Default or info
             toast.style.backgroundColor = '#3498db'; // Blue color for info
        }

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, delay);
    }

    // Add other necessary methods
} 