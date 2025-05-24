class Therapist {
    constructor() {
        console.log('Initializing Therapist class');
        this.auth = window.auth;
        this.db = window.db;
        this.apiEndpoint = 'http://localhost:3000/api/chat';
        this.conversationHistory = []; // Store conversation history
        
        if (!this.auth || !this.db) {
            console.error('Firebase services not initialized');
            return;
        }

        // Initialize if we're on the dashboard
        if (document.getElementById('therapistSection')) {
            console.log('Setting up therapist UI');
            this.setupTherapistUI();
            this.setupChatListeners();
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
        console.log('Setting up chat listeners');
        const chatInput = document.getElementById('chatInput');
        const sendMessageBtn = document.getElementById('sendMessageBtn');

        if (chatInput && sendMessageBtn) {
            console.log('Found chat input and send button');
            sendMessageBtn.addEventListener('click', () => {
                console.log('Send button clicked');
                this.handleSendMessage();
            });
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    console.log('Enter key pressed');
                    this.handleSendMessage();
                }
            });
        } else {
            console.error('Could not find chat input or send button');
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

        // Add user message to conversation history
        this.conversationHistory.push({ role: 'user', content: messageText });

        // Show loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-spinner';
        chatHistoryDiv.appendChild(loadingDiv);
        chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;

        try {
            // Get user data only if the message seems to be about mood/mental health
            const isMentalHealthRelated = this.isMentalHealthRelated(messageText);
            let moodEntries = [];
            let journalEntries = [];
            
            if (isMentalHealthRelated) {
                moodEntries = await this.getMoodEntries();
                journalEntries = await this.getJournalEntries();
            }

            // Prepare the prompt for ChatGPT API
            const prompt = this.prepareChatPrompt(messageText, moodEntries, journalEntries);

            // Call ChatGPT API
            const aiResponse = await this.callChatGPT(prompt);

            // Remove loading indicator
            loadingDiv.remove();

            // Display AI response
            this.displayMessage(aiResponse, 'ai');

            // Add AI message to conversation history
            this.conversationHistory.push({ role: 'assistant', content: aiResponse });

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
        messageDiv.innerHTML = this.formatResponse(message);
        chatHistoryDiv.appendChild(messageDiv);
        chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
    }

    isMentalHealthRelated(message) {
        const mentalHealthKeywords = [
            'mood', 'feel', 'feeling', 'happy', 'sad', 'depressed', 'anxious',
            'stress', 'stressed', 'anxiety', 'mental', 'health', 'therapy',
            'therapist', 'counseling', 'counselor', 'psychologist', 'psychiatrist',
            'emotion', 'emotional', 'depression', 'happiness', 'sadness', 'anger',
            'fear', 'worry', 'worried', 'nervous', 'calm', 'peaceful', 'peace'
        ];
        
        const messageLower = message.toLowerCase();
        return mentalHealthKeywords.some(keyword => messageLower.includes(keyword));
    }

    prepareChatPrompt(latestMessage, moodEntries, journalEntries) {
        // Create a comprehensive system prompt for the AI therapist
        const systemPrompt = `You are a friendly and empathetic AI therapist. Your primary goal is to have natural, supportive conversations with users.

Guidelines for your responses:
1. Be warm and conversational, like talking to a friend
2. Focus on the user's current message and respond naturally
3. Keep responses concise and natural
4. Show genuine interest in what the user is saying
5. Ask relevant follow-up questions when appropriate
6. If the user shares their mood or feelings, acknowledge them and respond appropriately
7. If they're just chatting casually, respond in kind
8. Always provide a unique, contextual response based on their specific message
9. Never use generic or repetitive responses
10. If you're unsure about something, ask for clarification`;

        // Get current date
        const currentDate = new Date();
        const currentDateStr = currentDate.toLocaleDateString();

        // Format the user's message with context
        let userContext = `Current date: ${currentDateStr}\n\nUser message: ${latestMessage}`;
        
        // Only add mood and journal context if entries exist and the message is mental health related
        if (moodEntries && moodEntries.length > 0) {
            const latestMood = moodEntries[0];
            const moodDate = latestMood.timestamp ? new Date(latestMood.timestamp.seconds * 1000) : null;
            
            if (moodDate) {
                const daysSinceLastEntry = Math.floor((currentDate - moodDate) / (1000 * 60 * 60 * 24));
                userContext += `\n\nSupplementary context - Last mood entry (${daysSinceLastEntry} days ago):`;
                userContext += `\nMood: ${latestMood.mood || 'Not specified'}`;
                if (latestMood.activities) {
                    userContext += `\nActivities: ${latestMood.activities.join(', ')}`;
                }
                if (latestMood.stressLevel) {
                    userContext += `\nStress Level: ${latestMood.stressLevel}/10`;
                }
            }
        }

        if (journalEntries && journalEntries.length > 0) {
            const latestJournal = journalEntries[0];
            const journalDate = latestJournal.timestamp ? new Date(latestJournal.timestamp.seconds * 1000) : null;
            
            if (journalDate) {
                const daysSinceLastEntry = Math.floor((currentDate - journalDate) / (1000 * 60 * 60 * 24));
                userContext += `\n\nSupplementary context - Last journal entry (${daysSinceLastEntry} days ago): ${latestJournal.content || 'No content'}`;
            }
        }

        // Add conversation history for context
        if (this.conversationHistory.length > 0) {
            userContext += '\n\nConversation history:';
            this.conversationHistory.forEach(msg => {
                userContext += `\n${msg.role}: ${msg.content}`;
            });
        }

        return {
            contents: [{
                parts: [{
                    text: userContext
                }]
            }]
        };
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
            console.log('Calling ChatGPT API through proxy...');
            console.log('Request payload:', JSON.stringify(prompt, null, 2));
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            console.log('Request headers:', headers);
            
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    contents: prompt.contents
                })
            });

            const data = await response.json();
            console.log('API response:', data);

            if (!response.ok) {
                console.error('API Error:', data);
                throw new Error(data.error?.message || 'Unknown error occurred');
            }
            
            // Extract the response text from ChatGPT's response format
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text;
            } else {
                console.error('Unexpected response format:', data);
                throw new Error('Unexpected response format from ChatGPT API');
            }
        } catch (error) {
            console.error('Error calling API:', error);
            throw error;
        }
    }

    formatResponse(response) {
        // Convert line breaks to <br> tags
        return response.replace(/\n/g, '<br>');
    }
}

// Wait for both DOM and Firebase to be ready
window.addEventListener('load', () => {
    console.log('Window loaded, checking for therapist section');
    if (document.getElementById('therapistSection')) {
        console.log('Found therapist section, initializing Therapist');
        // Wait for Firebase auth to be ready
        if (window.auth) {
            window.auth.onAuthStateChanged((user) => {
                if (user) {
                    console.log('User authenticated, creating Therapist instance');
                    window.therapist = new Therapist();
                }
            });
        } else {
            console.error('Firebase auth not available');
        }
    }
}); 