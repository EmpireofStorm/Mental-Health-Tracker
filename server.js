const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

// OpenAI    Key
const OPENAI_API_KEY = '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'; // Replace with your actual API key

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_REQUESTS_PER_WINDOW = 60; // Maximum requests per hour
const requestCounts = new Map(); // Track requests per IP

// Rate limiting middleware
function rateLimiter(req, res, next) {
    const ip = req.ip;
    const now = Date.now();
    
    // Initialize or get request history for this IP
    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, []);
    }
    
    const requests = requestCounts.get(ip);
    
    // Remove requests outside the current window
    while (requests.length && requests[0] < now - RATE_LIMIT_WINDOW) {
        requests.shift();
    }
    
    // Check if rate limit exceeded
    if (requests.length >= MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).json({
            error: {
                message: 'Rate limit exceeded. Please try again later.',
                retryAfter: Math.ceil((requests[0] + RATE_LIMIT_WINDOW - now) / 1000)
            }
        });
    }
    
    // Add current request timestamp
    requests.push(now);
    next();
}

// Enable CORS for your frontend with more specific configuration
app.use(cors({
    origin: ['http://127.0.0.1:8080', 'http://localhost:8080'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Handle preflight requests
app.options('*', cors());

// Parse JSON bodies
app.use(express.json());

// Apply rate limiting to all routes
app.use(rateLimiter);

// Proxy endpoint for ChatGPT API
app.post('/api/chat', async (req, res) => {
    try {
        console.log('Received request:', req.body);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: `You are a friendly and empathetic AI therapist. Your primary goal is to have natural, supportive conversations with users.

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
10. If you're unsure about something, ask for clarification

When responding to questions about happiness or mental health:
1. Share general, evidence-based suggestions
2. Ask about their specific situation and interests
3. Encourage them to explore what works for them
4. Be supportive and non-judgmental
5. Don't make assumptions about their current state based on past entries`
                    },
                    {
                        role: "user",
                        content: req.body.contents[0].parts[0].text
                    }
                ],
                temperature: 0.9,
                max_tokens: 1024
            })
        });

        const data = await response.json();
        console.log('Raw ChatGPT API response:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            console.error('ChatGPT API error:', data);
            return res.status(response.status).json(data);
        }

        // Extract the response text from the ChatGPT API response
        let responseText = '';
        
        if (data.choices?.[0]?.message?.content) {
            responseText = data.choices[0].message.content;
        } else {
            console.error('Unexpected response structure:', data);
            responseText = "I apologize, but I'm having trouble processing your message right now. Could you please try rephrasing it?";
        }

        // Format the response to match what the frontend expects
        const formattedResponse = {
            candidates: [{
                content: {
                    parts: [{
                        text: responseText
                    }]
                }
            }]
        };

        console.log('Formatted response:', JSON.stringify(formattedResponse, null, 2));
        res.json(formattedResponse);
    } catch (error) {
        console.error('Server error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 