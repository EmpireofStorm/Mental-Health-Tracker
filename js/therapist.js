class Therapist {
    constructor() {
        this.auth = window.auth;
        this.db = window.db;
        this.apiKey = import.meta.env.VITE_OPENAI_API_KEY; // Read from environment variable
        this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
        
        if (!this.auth || !this.db) {
            console.error('Firebase services not initialized');
            return;
        }

        // Initialize if we're on the dashboard
        if (document.getElementById('therapistSection')) {
            this.setupTherapistUI();
            this.setupChatListeners();
            this.chatHistory = []; // Initialize chat history
        }
    }

    setupTherapistUI() {
        const therapistSection = document.getElementById('therapistSection');
        therapistSection.innerHTML = `
            <div class="therapist-container">
                <div class="therapist-header">
                    <h2>AI Therapist</h2>
                </div>
                <div id="chatBox" class="therapist-chat-box">
                    <div id="chatHistory" class="therapist-chat-history">
                        <!-- Chat messages will go here -->
                        <div class="therapist-message initial-message ai">
                            <p>Hello! I'm your AI therapist. You can ask me anything about your mood and journal entries, or just chat about how you're feeling.</p>
                        </div>
                    </div>
                    <div class="therapist-chat-input">
                        <input type="text" id="chatInput" placeholder="Type your message...">
                        <button id="sendMessageBtn" class="btn btn-primary">Send</button>
                    </div>
                </div>
            </div>
        `;
    }

    setupChatListeners() {
        const chatInput = document.getElementById('chatInput');
        const sendMessageBtn = document.getElementById('sendMessageBtn');

        if (chatInput && sendMessageBtn) {
            sendMessageBtn.addEventListener('click', () => this.handleSendMessage());
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSendMessage();
                }
            });
        }
    }

    async handleSendMessage() {
        const chatInput = document.getElementById('chatInput');
        const chatHistoryDiv = document.getElementById('chatHistory');
        const messageText = chatInput.value.trim();

        if (!messageText) return;

        // Display user message
        this.displayMessage(messageText, 'user');
        chatInput.value = ''; // Clear input

        // Add user message to history
        this.chatHistory.push({ role: 'user', content: messageText });

        // Show loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-spinner';
        chatHistoryDiv.appendChild(loadingDiv);
        chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight; // Scroll to bottom

        try {
            // Get user data
            const moodEntries = await this.getMoodEntries();
            const journalEntries = await this.getJournalEntries();

            // Prepare the prompt for ChatGPT with history and data
            const prompt = this.prepareChatPrompt(messageText, moodEntries, journalEntries);

            // Call ChatGPT API
            const aiResponse = await this.callChatGPT(prompt);

            // Remove loading indicator
            loadingDiv.remove();

            // Display AI response
            this.displayMessage(aiResponse, 'ai');

            // Add AI message to history
            this.chatHistory.push({ role: 'assistant', content: aiResponse });

        } catch (error) {
            console.error('Error sending message to therapist:', error);
            loadingDiv.remove();
            this.displayMessage('Sorry, I had trouble processing that. Please try again.', 'error');
        }
    }

    displayMessage(message, sender) {
        const chatHistoryDiv = document.getElementById('chatHistory');
        const messageDiv = document.createElement('div');
        messageDiv.className = `therapist-message ${sender}`;
        messageDiv.innerHTML = this.formatResponse(message); // Use formatResponse to handle line breaks
        chatHistoryDiv.appendChild(messageDiv);
        chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight; // Scroll to bottom
    }

    prepareChatPrompt(latestMessage, moodEntries, journalEntries) {
        // Format the entries for the prompt (same as before)
        const moodHistory = moodEntries.map(entry => ({
            date: entry.timestamp ? entry.timestamp.toDate().toLocaleDateString() : 'N/A',
            mood: entry.mood,
            activities: entry.activities,
            notes: entry.notes
        }));

        const journalHistory = journalEntries.map(entry => ({
            date: entry.timestamp ? entry.timestamp.toDate().toLocaleDateString() : 'N/A',
            text: entry.text,
            sleepHours: entry.sleepHours,
            stressLevel: entry.stressLevel
        }));

        // Combine initial system prompt, history, user data, and latest message
        const messages = [
             {
                    role: "system",
                    content: `You are an empathetic AI therapist designed to have a supportive conversation with the user about their mental health. You should respond directly to the user's messages. You also have access to their mood logs and journal entries. Refer to this data *when relevant* to provide personalized insights and suggestions, but do not analyze the data in every response. Maintain a warm, non-judgmental, and conversational tone. Avoid giving medical diagnoses.`
                },
            ...this.chatHistory, // Include previous chat history
            {
                role: 'user',
                content: latestMessage // The user's direct message
            },
             {
                role: 'system',
                content: `User's recent data (for context, do not analyze in every response):
Mood History: ${JSON.stringify(moodHistory, null, 2)}
Journal Entries: ${JSON.stringify(journalHistory, null, 2)}`
            }
        ];

        return { messages };
    }

    async getMoodEntries() {
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
            return [];
        }
    }

    async getJournalEntries() {
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
            return [];
        }
    }

    async callChatGPT(prompt) {
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: prompt.messages,
                    temperature: 0.7,
                    max_tokens: 500
                })
            });

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Error calling ChatGPT:', error);
            throw error;
        }
    }

    formatResponse(response) {
        // Convert line breaks to HTML breaks and wrap paragraphs
        return response
            .split('\n\n')
            .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
            .join('');
    }
} 