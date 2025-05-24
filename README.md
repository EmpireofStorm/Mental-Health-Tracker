# Mental Health Tracker

A responsive web application designed to help users track their mental well-being, journal their thoughts, and monitor their daily mood patterns.

## ✨ Features

- Daily mood tracking with emoji selection
- Journal entry system for thoughts and reflections
- Sleep and stress level monitoring
- Data visualization of mood patterns
- Responsive design for all devices
- Secure data storage with Firebase
- User-friendly interface with intuitive navigation
- Goal setting and tracking for mental wellness objectives

## 🚀 Getting Started

Follow these steps to get the project up and running on your local machine.

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js (v14 or higher) - [Download Node.js](https://nodejs.org/)
- npm or yarn package manager
- A Firebase project setup with a web app - [Firebase Console](https://console.firebase.google.com/)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mental-health-tracker
```

2. Install dependencies:
```bash
npm install
# or if you use yarn
yarn install
```

### Firebase Configuration

For security reasons, your Firebase API keys and configuration are not included directly in the repository. You need to add your own Firebase web app configuration to the project.

1. Go to your Firebase project console.
2. Add a new web app to your project if you haven't already.
3. Find your web app's configuration object. It will look something like this:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

4. Copy the file `js/config.js.example` to `js/config.js`:
```bash
cp js/config.js.example js/config.js
# or on Windows
copy js\config.js.example js\config.js
```

5. Open `js/config.js` in your code editor and replace the placeholder values (`YOUR_...`) with your actual Firebase configuration values.

### Running the Application

Start a local development server from the project root directory:

```bash
npm start
```

Open your browser and navigate to `http://localhost:8080` (or the address provided by your server).

## 🛠️ Tech Stack

- HTML5 (Semantic markup)
- CSS3 (Flexbox/Grid, Mobile-first)
- JavaScript (ES6+)
- Firebase (Authentication & Firestore Database)
- Chart.js (Data visualization)

## 📱 Usage

1. Open the application in your web browser.
2. Create an account or sign in using the Authentication section.
3. Navigate to the Dashboard to track your daily mood and journal entries.
4. Explore the Goals section to set and monitor your mental wellness objectives.
5. View your mood patterns and other data on the Visualizations page.

## 🔒 Security

- User authentication is required for data access.
- Data is stored securely in Firebase Firestore.
- Sensitive configuration is excluded from the repository via `.gitignore`.

## .gitignore

The `.gitignore` file specifies intentionally untracked files that Git should ignore. In this project, `js/config.js` is included in `.gitignore` to prevent your personal Firebase configuration (including API keys) from being committed to the repository.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! If you'd like to contribute, please fork the repository and create a pull request with your changes. Make sure your code adheres to the project's coding standards and includes appropriate tests.

## 📸 Screenshots

[Coming soon]

## 🔗 Live Demo

[Coming soon] 