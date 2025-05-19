// Initialize Firebase
const firebaseConfig = {
  apiKey: "",
  authDomain: "mental-health-tracker-cd9a5.firebaseapp.com",
  projectId: "mental-health-tracker-cd9a5",
  storageBucket: "mental-health-tracker-cd9a5.firebasestorage.app",
  messagingSenderId: "224277082219",
  appId: "1:224277082219:web:1b2071d0bf6b407d7bc12e",
  measurementId: "G-TW1JWRGRZ6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const auth = firebase.auth();
const db = firebase.firestore();

// Configure Firestore settings
db.settings({
  cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
  merge: true
});

// Enable offline persistence
db.enablePersistence()
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.log('The current browser does not support persistence.');
    }
  });

// Make auth and db available globally
window.auth = auth;
window.db = db;

// Wait for auth to be ready before initializing other components
auth.onAuthStateChanged(() => {
  // Initialize components only after auth is ready
  if (document.getElementById('moodForm')) {
    window.moodTracker = new MoodTracker();
  }
  if (document.getElementById('journalForm')) {
    window.journal = new Journal();
  }
});