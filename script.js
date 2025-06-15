// Import Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, onSnapshot, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAdqOQ7lnQ4bFNvu3PYcWaI0woCtmDtcBc",
  authDomain: "lords-of-lake-windsor-cc.firebaseapp.com",
  projectId: "lords-of-lake-windsor-cc",
  storageBucket: "lords-of-lake-windsor-cc.firebasestorage.app",
  messagingSenderId: "706904911353",
  appId: "1:706904911353:web:1f0309b8a3228b07e5e128"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Game state
let gameState = {
    players: [],
    holes: {},
    originalOwners: {},
    activity: [],
    playerBirdies: {},
    stats: {}
};

let currentView = 'rules';
let currentStatsView = 'territories';
let isOnline = navigator.onLine;
let gameDocRef = doc(db, 'games', 'lords-of-lake-windsor-main');
let pauseSync = false;

const PLAYER_COLORS = [
    '#FF0000', '#0066FF', '#00CC00', '#FF6600',
    '#9900CC', '#FFD700', '#FF1493', '#00CCCC'
];

const HOLE_ADJACENCIES = {
    1: [2, 18], 2: [1, 3], 3: [2, 4], 4: [3, 5], 5: [4, 6], 6: [5, 7],
    7: [6, 8], 8: [7, 9], 9: [8, 10], 10: [9, 11], 11: [10, 12], 12: [11, 13],
    13: [12, 14], 14: [13, 15], 15: [14, 16], 16: [15, 17], 17: [16, 18], 18: [17, 1]
};

// View Management - FIXED
function showView(viewName) {
    currentView = viewName;
    
    // Hide all views
    const views = ['rulesView', 'mapView', 'warRoomView', 'statsView'];
    views.forEach(view => {
        const element = document.getElementById(view);
        if (element) element.style.display = 'none';
    });
    
    const statsControls = document.getElementById('statsControls');
    if (statsControls) statsControls.style.display = 'none';
    
    // Remove active classes
    document.querySelectorAll('.btn-rules, .btn-nav').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected view
    if (viewName === 'rules') {
        const rulesView = document.getElementById('rulesView');
        const rulesBtn = document.getElementById('rulesBtn');
        if (rulesView) rulesView.style.display = 'block';
        if (rulesBtn) rulesBtn.classList.add('active');
    } else if (viewName === 'map') {
        const mapView = document.getElementById('mapView');
        const mapBtn = document.getElementById('mapBtn');
        if (mapView) mapView.style.display = 'block';
        if (mapBtn) mapBtn.classList.add('active');
        updateMapView();
    } else if (viewName === 'warRoom') {
        const warRoomView = document.getElementById('warRoomView');
        const warRoomBtn = document.getElementById('warRoomBtn');
        if (warRoomView) warRoomView.style.display = 'block';
        if (warRoomBtn) warRoomBtn.classList.add('active');
        updateWarRoomView();
    } else if (viewName === 'stats') {
        const statsView = document.getElementById('statsView');
        const statsBtn = document.getElementById('statsBtn');
        const statsControls = document.getElementById('statsControls');
        if (statsView) statsView.style.display = 'block';
        if (statsBtn) statsBtn.classList.add('active');
        if (statsControls) statsControls.style.display = 'flex';
        showStats(currentStatsView);
    }
}

// Make sure functions are globally available
window.showView = showView;
window.showStats = function(statsType) { /* simplified for now */ };
window.showAddPlayerModal = function() { alert('Add Player - working on fix'); };
window.showLogRoundModal = function() { alert('Log Round - working on fix'); };
window.downloadStats = function() { alert('Download - working on fix'); };
window.showGameSettings = function() { alert('Settings - working on fix'); };
window.adminResetGame = function() { alert('Reset - working on fix'); };
window.closeModal = function() { };

// Placeholder functions for now
function updateMapView() { console.log('Map view updated'); }
function updateWarRoomView() { console.log('War room updated'); }

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('App initialized');
    showView('rules');
});
