console.log("Script starting to load...");
// Import Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, onSnapshot, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';console.log("Script starting to load...");

// Wait for Firebase to be available, then initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, checking Firebase...");
    
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
        console.error("Firebase not loaded!");
        return;
    }
    
    console.log("Firebase available, initializing app...");
    initializeFirebaseApp();
});

function initializeFirebaseApp() {

// Firebase configuration
 const firebaseConfig = {
        apiKey: "AIzaSyAdqOQ7lnQ4bFNvu3PYcWaI0woCtmDtcBc",
        authDomain: "lords-of-lake-windsor-cc.firebaseapp.com",
        projectId: "lords-of-lake-windsor-cc",
        storageBucket: "lords-of-lake-windsor-cc.firebasestorage.app",
        messagingSenderId: "706904911353",
        appId: "1:706904911353:web:1f0309b8a3228b07e5e128"
    };

    // Initialize Firebase using the global firebase object
    const app = firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    
    console.log("Firebase initialized successfully!");
    
    // Now start the game initialization
    initializeGame();
}

function initializeGame() {
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
let syncInterval;
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

// Initialize game
async function initializeGame() {
    updateSyncStatus('🔄 Connecting...');
    
    try {
        onSnapshot(gameDocRef, (doc) => {
            if (pauseSync) return;
            
            if (doc.exists()) {
                const data = doc.data();
                gameState = { ...gameState, ...data };
                updateUI();
                updateSyncStatus('✅ Synced', 'online');
            } else {
                createInitialGameState();
            }
        }, (error) => {
            console.log('Offline mode:', error);
            updateSyncStatus('📱 Offline', 'offline');
            loadLocalGameState();
        });

        syncInterval = setInterval(() => {
            if (!pauseSync) syncToFirebase();
        }, 30000);
        
    } catch (error) {
        console.log('Starting in offline mode');
        updateSyncStatus('📱 Offline', 'offline');
        loadLocalGameState();
    }

    window.addEventListener('online', () => {
        isOnline = true;
        if (!pauseSync) {
            updateSyncStatus('🔄 Reconnecting...');
            syncToFirebase();
        }
    });

    window.addEventListener('offline', () => {
        isOnline = false;
        updateSyncStatus('📱 Offline', 'offline');
    });
}

function createInitialGameState() {
    gameState = {
        players: [],
        holes: {},
        originalOwners: {},
        activity: [],
        playerBirdies: {},
        stats: {},
        lastUpdated: Date.now()
    };

    const initialPlayers = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
    initialPlayers.forEach((name, index) => {
        addPlayerToGame(name, PLAYER_COLORS[index]);
    });
    
    randomlyAssignHoles();
    syncToFirebase();
    updateUI();
}

function loadLocalGameState() {
    const saved = localStorage.getItem('lordsGolfGame');
    if (saved) {
        gameState = JSON.parse(saved);
        updateUI();
    } else {
        createInitialGameState();
    }
}

async function syncToFirebase() {
    if (!isOnline || pauseSync) {
        saveLocalGameState();
        return;
    }

    try {
        gameState.lastUpdated = Date.now();
        await setDoc(gameDocRef, gameState);
        updateSyncStatus('✅ Synced', 'online');
        saveLocalGameState();
    } catch (error) {
        console.log('Sync failed, saving locally');
        updateSyncStatus('📱 Offline', 'offline');
        saveLocalGameState();
    }
}

function saveLocalGameState() {
    localStorage.setItem('lordsGolfGame', JSON.stringify(gameState));
}

function updateSyncStatus(text, status = '') {
    const syncStatus = document.getElementById('syncStatus');
    if (syncStatus) {
        syncStatus.textContent = text;
        syncStatus.className = 'sync-status ' + status;
    }
}

function addPlayerToGame(name, color) {
    const player = {
        id: Date.now() + Math.random(),
        name: name,
        color: color,
        holes: [],
        conquests: 0,
        losses: 0,
        rounds: 0
    };
    gameState.players.push(player);
    gameState.playerBirdies[player.id] = [];
    return player;
}

function randomlyAssignHoles() {
    gameState.holes = {};
    gameState.originalOwners = {};
    for (let i = 1; i <= 18; i++) {
        gameState.holes[i] = null;
        gameState.originalOwners[i] = null;
    }

    if (gameState.players.length <= 4) {
        const availableHoles = Array.from({length: 18}, (_, i) => i + 1);
        
        gameState.players.forEach(player => {
            player.holes = [];
            const holesToAssign = Math.min(4, Math.floor(16 / gameState.players.length));
            
            for (let i = 0; i < holesToAssign; i++) {
                if (availableHoles.length === 0) break;
                const randomIndex = Math.floor(Math.random() * availableHoles.length);
                const hole = availableHoles.splice(randomIndex, 1)[0];
                player.holes.push(hole);
                gameState.holes[hole] = player.id;
                gameState.originalOwners[hole] = player.id;
            }
        });

        let attempts = 0;
        while (attempts < 100) {
            const unoccupiedHoles = [];
            for (let i = 1; i <= 18; i++) {
                if (gameState.holes[i] === null) {
                    unoccupiedHoles.push(i);
                }
            }
            
            let valid = true;
            for (let i = 0; i < unoccupiedHoles.length; i++) {
                for (let j = i + 1; j < unoccupiedHoles.length; j++) {
                    const hole1 = unoccupiedHoles[i];
                    const hole2 = unoccupiedHoles[j];
                    if (HOLE_ADJACENCIES[hole1] && HOLE_ADJACENCIES[hole1].includes(hole2)) {
                        valid = false;
                        break;
                    }
                }
                if (!valid) break;
            }

            if (valid || attempts > 50) break;

            attempts++;
            for (let i = 1; i <= 18; i++) {
                gameState.holes[i] = null;
                gameState.originalOwners[i] = null;
            }
            
            const newAvailableHoles = Array.from({length: 18}, (_, i) => i + 1);
            gameState.players.forEach(player => {
                player.holes = [];
                const holesToAssign = Math.min(4, Math.floor(16 / gameState.players.length));
                
                for (let i = 0; i < holesToAssign; i++) {
                    if (newAvailableHoles.length === 0) break;
                    const randomIndex = Math.floor(Math.random() * newAvailableHoles.length);
                    const hole = newAvailableHoles.splice(randomIndex, 1)[0];
                    player.holes.push(hole);
                    gameState.holes[hole] = player.id;
                    gameState.originalOwners[hole] = player.id;
                }
            });
        }
    }

    logActivity("Game initialized with random hole assignments");
}

function showView(viewName) {
    currentView = viewName;
    
    const views = ['rulesView', 'mapView', 'warRoomView', 'statsView'];
    views.forEach(view => {
        const element = document.getElementById(view);
        if (element) element.style.display = 'none';
    });
    
    const statsControls = document.getElementById('statsControls');
    if (statsControls) statsControls.style.display = 'none';
    
    document.querySelectorAll('.btn-rules, .btn-nav').forEach(btn => {
        btn.classList.remove('active');
    });
    
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

function showStats(statsType) {
    currentStatsView = statsType;
    document.querySelectorAll('.btn-sub').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById(statsType + 'Btn');
    if (btn) btn.classList.add('active');
    
    if (statsType === 'territories') {
        updateTerritoriesStats();
    } else if (statsType === 'birdies') {
        updateBirdiesStats();
    } else if (statsType === 'captures') {
        updateCapturesStats();
    }
}

function updateMapView() {
    const courseList = document.getElementById('courseList');
    if (!courseList) return;
    
    courseList.innerHTML = '';
    
    const headerHole = document.createElement('div');
    headerHole.className = 'course-list-header';
    headerHole.textContent = 'Hole';
    courseList.appendChild(headerHole);
    
    const headerOwner = document.createElement('div');
    headerOwner.className = 'course-list-header';
    headerOwner.textContent = 'Owner';
    courseList.appendChild(headerOwner);
    
    for (let i = 1; i <= 18; i++) {
        const holeNumber = document.createElement('div');
        holeNumber.className = 'hole-number';
        holeNumber.textContent = i;
        courseList.appendChild(holeNumber);
        
        const ownerBox = document.createElement('div');
        ownerBox.className = 'owner-box';
        
        const owner = getHoleOwner(i);
        if (owner) {
            ownerBox.textContent = owner.name;
            ownerBox.style.backgroundColor = owner.color;
        } else {
            ownerBox.textContent = 'Unoccupied';
            ownerBox.classList.add('unoccupied');
        }
        
        courseList.appendChild(ownerBox);
    }
}

function updateWarRoomView() {
    const warRoomTable = document.getElementById('warRoomTable');
    if (!warRoomTable) return;
    
    let tableHTML = `
        <table class="war-table">
            <thead>
                <tr>
                    <th>Hole</th>
                    <th>Orig. Owner</th>
                    <th>Curr. Owner</th>
                    <th>Rival #1</th>
                    <th>Rival #2</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    for (let i = 1; i <= 18; i++) {
        const originalOwner = getPlayerById(gameState.originalOwners[i]);
        const currentOwner = getHoleOwner(i);
        const adjacentHoles = HOLE_ADJACENCIES[i];
        const rival1Hole = adjacentHoles[0];
        const rival2Hole = adjacentHoles[1];
        const rival1Owner = getHoleOwner(rival1Hole);
        const rival2Owner = getHoleOwner(rival2Hole);
        
        tableHTML += `
            <tr>
                <td><strong>${i}</strong></td>
                <td>${originalOwner ? originalOwner.name : 'Unoccupied'}</td>
                <td>${currentOwner ? currentOwner.name : 'Unoccupied'}</td>
                <td>${rival1Owner ? rival1Owner.name : 'Unoccupied'} (${rival1Hole})</td>
                <td>${rival2Owner ? rival2Owner.name : 'Unoccupied'} (${rival2Hole})</td>
            </tr>
        `;
    }
    
    tableHTML += '</tbody></table>';
    warRoomTable.innerHTML = tableHTML;
}

function updateTerritoriesStats() {
    const statsContent = document.getElementById('statsContent');
    const statsTitle = document.getElementById('statsTitle');
    if (!statsContent || !statsTitle) return;
    
    statsTitle.textContent = 'Player Rankings - Territories';
    
    const sortedPlayers = [...gameState.players].sort((a, b) => b.holes.length - a.holes.length);
    
    let content = '<ul class="ranking-list">';
    sortedPlayers.forEach((player, index) => {
        content += `
            <li class="ranking-item" style="border-left-color: ${player.color}; background-color: ${player.color}20;">
                <span><strong>#${index + 1} ${player.name}</strong></span>
                <span>${player.holes.length} territories</span>
            </li>
        `;
    });
    content += '</ul>';
    
    statsContent.innerHTML = content;
}

function updateBirdiesStats() {
    const statsContent = document.getElementById('statsContent');
    const statsTitle = document.getElementById('statsTitle');
    if (!statsContent || !statsTitle) return;
    
    statsTitle.textContent = 'Player Birdies - All Holes';
    
    let content = '';
    gameState.players.forEach(player => {
        const birdies = gameState.playerBirdies[player.id] || [];
        const birdieText = birdies.length > 0 ? birdies.sort((a, b) => a - b).join(', ') : 'None';
        
        content += `
            <div class="player-birdies" style="border-left-color: ${player.color}; background-color: ${player.color}10;">
                <strong>${player.name}</strong> (${birdies.length} total)
                <div class="birdie-holes">Holes: ${birdieText}</div>
            </div>
        `;
    });
    
    statsContent.innerHTML = content;
}

function updateCapturesStats() {
    const statsContent = document.getElementById('statsContent');
    const statsTitle = document.getElementById('statsTitle');
    if (!statsContent || !statsTitle) return;
    
    statsTitle.textContent = 'Player Rankings - Captures';
    
    const sortedPlayers = [...gameState.players].sort((a, b) => b.conquests - a.conquests);
    
    let content = '<ul class="ranking-list">';
    sortedPlayers.forEach((player, index) => {
        content += `
            <li class="ranking-item" style="border-left-color: ${player.color}; background-color: ${player.color}20;">
                <span><strong>#${index + 1} ${player.name}</strong></span>
                <span>${player.conquests} captures</span>
            </li>
        `;
    });
    content += '</ul>';
    
    statsContent.innerHTML = content;
}

function updateUI() {
    updatePlayerList();
    updateLeaderboard();
    updateGameStats();
    updateActivityLog();
    updateModalPlayers();
    
    if (currentView === 'map') {
        updateMapView();
    } else if (currentView === 'warRoom') {
        updateWarRoomView();
    } else if (currentView === 'stats') {
        showStats(currentStatsView);
    }
}

function getHoleOwner(holeNum) {
    const ownerId = gameState.holes[holeNum];
    return gameState.players.find(p => p.id === ownerId);
}

function getPlayerById(playerId) {
    return gameState.players.find(p => p.id === playerId);
}

function updatePlayerList() {
    const list = document.getElementById('playerList');
    if (!list) return;
    
    list.innerHTML = '';

    gameState.players.forEach(player => {
        const item = document.createElement('li');
        item.className = 'player-item';
        item.style.borderLeftColor = player.color;
        item.style.backgroundColor = player.color + '20';
        
        item.innerHTML = `
            <span><strong>${player.name}</strong></span>
            <span>${player.holes.length} holes</span>
        `;
        
        list.appendChild(item);
    });
}

function updateLeaderboard() {
    const leaderboard = document.getElementById('leaderboard');
    if (!leaderboard) return;
    
    const sortedPlayers = [...gameState.players].sort((a, b) => b.holes.length - a.holes.length);
    
    leaderboard.innerHTML = sortedPlayers.map((player, index) => `
        <div class="player-item" style="border-left-color: ${player.color}; background-color: ${player.color}20;">
            <span>${index + 1}. ${player.name}</span>
            <span>${player.holes.length} holes</span>
        </div>
    `).join('');
}

function updateGameStats() {
    const stats = document.getElementById('gameStats');
    if (!stats) return;
    
    const totalRounds = gameState.players.reduce((sum, p) => sum + p.rounds, 0);
    const totalConquests = gameState.players.reduce((sum, p) => sum + p.conquests, 0);
    const totalBirdies = Object.values(gameState.playerBirdies).reduce((sum, birdies) => sum + birdies.length, 0);
    const occupiedHoles = Object.values(gameState.holes).filter(owner => owner !== null).length;
    
    stats.innerHTML = `
        <div class="stat-item">
            <div class="stat-value">${gameState.players.length}</div>
            <div class="stat-label">Players</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${occupiedHoles}</div>
            <div class="stat-label">Occupied Holes</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${totalRounds}</div>
            <div class="stat-label">Total Rounds</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${totalBirdies}</div>
            <div class="stat-label">Total Birdies</div>
        </div>
    `;
}

function updateActivityLog() {
    const log = document.getElementById('activityLog');
    if (!log) return;
    
    const recentActivity = gameState.activity.slice(-20).reverse();
    
    log.innerHTML = recentActivity.map((activity, index) => {
        const actualIndex = gameState.activity.length - 1 - index;
        return `
            <div class="activity-item">
                <span>${activity}</span>
                <button class="btn btn-revert" onclick="revertAction(${actualIndex})">Revert</button>
            </div>
        `;
    }).join('') || '<div class="activity-item">No activity yet</div>';
}

function revertAction(actionIndex) {
    if (!confirm('Are you sure you want to revert this action? This cannot be undone.')) {
        return;
    }
    
    const action = gameState.activity[actionIndex];
    gameState.activity.splice(actionIndex, 1);
    logActivity(`REVERTED: ${action}`);
    
    syncToFirebase();
    updateUI();
}

function updateModalPlayers() {
    const select = document.getElementById('roundPlayer');
    if (select) {
        select.innerHTML = '<option value="" disabled selected>Select Player</option>' + 
         gameState.players.map(player => 
             `<option value="${player.id}">${player.name}</option>`
         ).join('');
    }

    const birdieHoles = document.getElementById('birdieHoles');
    if (birdieHoles) {
        birdieHoles.innerHTML = '';
        
        for (let i = 1; i <= 18; i++) {
            const div = document.createElement('div');
            div.className = 'hole-checkbox';
            div.innerHTML = `
                <input type="checkbox" id="hole${i}" value="${i}">
                <label for="hole${i}">${i}</label>
            `;
            birdieHoles.appendChild(div);
        }
    }

    const editor = document.getElementById('playerNameEditor');
    if (editor) {
        editor.innerHTML = gameState.players.map(player => `
            <div class="form-group">
                <input type="text" id="editName${player.id}" value="${player.name}" 
                       style="border-left: 4px solid ${player.color};">
            </div>
        `).join('');
    }
}

function showAddPlayerModal() {
    const unoccupiedCount = Object.values(gameState.holes).filter(owner => owner === null).length;
    if (unoccupiedCount === 0) {
        alert('No unoccupied holes available. Cannot add new players.');
        return;
    }
    const modal = document.getElementById('addPlayerModal');
    if (modal) modal.style.display = 'block';
}

function addPlayer() {
    const nameInput = document.getElementById('playerName');
    if (!nameInput) return;
    
    const name = nameInput.value.trim();
    if (!name) {
        alert('Please enter a player name');
        return;
    }

    const unoccupiedHoles = [];
    for (let i = 1; i <= 18; i++) {
        if (gameState.holes[i] === null) {
            unoccupiedHoles.push(i);
        }
    }

    if (unoccupiedHoles.length === 0) {
        alert('No unoccupied holes available');
        return;
    }

    const color = PLAYER_COLORS[gameState.players.length % PLAYER_COLORS.length];
    const player = addPlayerToGame(name, color);
    
    unoccupiedHoles.forEach(hole => {
        player.holes.push(hole);
        gameState.holes[hole] = player.id;
        gameState.originalOwners[hole] = player.id;
    });

    logActivity(`${name} joined the game and claimed ${unoccupiedHoles.length} holes`);
    
    nameInput.value = '';
    closeModal('addPlayerModal');
    syncToFirebase();
    updateUI();
}

function showLogRoundModal() {
    if (gameState.players.length === 0) {
        alert('Add players first');
        return;
    }
    const modal = document.getElementById('logRoundModal');
    if (modal) modal.style.display = 'block';
}

function logRound() {
    const playerSelect = document.getElementById('roundPlayer');
    if (!playerSelect) return;
    
    const playerId = playerSelect.value;
    const player = gameState.players.find(p => p.id == playerId);
    
    if (!player) {
        alert('Please select a player');
        return;
    }

    const birdieHoles = [];
    for (let i = 1; i <= 18; i++) {
        const checkbox = document.getElementById(`hole${i}`);
        if (checkbox && checkbox.checked) {
            birdieHoles.push(i);
        }
    }

    if (birdieHoles.length === 0) {
        alert('Please select at least one hole where you made birdie');
        return;
    }

    player.rounds++;
    
    birdieHoles.forEach(hole => {
        if (!gameState.playerBirdies[player.id].includes(hole)) {
            gameState.playerBirdies[player.id].push(hole);
        }
    });
    
    birdieHoles.forEach(hole => {
        const currentOwner = getHoleOwner(hole);
        const adjacentHoles = HOLE_ADJACENCIES[hole];
        const playerOwnsAdjacent = adjacentHoles.some(adjHole => 
            player.holes.includes(adjHole)
        );
        const holeIsUnoccupied = !currentOwner;
        const playerOwnsHole = currentOwner && currentOwner.id === player.id;

        if (playerOwnsAdjacent || holeIsUnoccupied || playerOwnsHole) {
            if (currentOwner && currentOwner.id !== player.id) {
                currentOwner.holes = currentOwner.holes.filter(h => h !== hole);
                currentOwner.losses++;
                player.holes.push(hole);
                player.conquests++;
                gameState.holes[hole] = player.id;
                
                logActivity(`${player.name} conquered hole ${hole} from ${currentOwner.name} with a birdie!`);
            } else if (holeIsUnoccupied) {
                player.holes.push(hole);
                player.conquests++;
                gameState.holes[hole] = player.id;
                
                logActivity(`${player.name} claimed unoccupied hole ${hole} with a birdie!`);
            } else {
                logActivity(`${player.name} defended hole ${hole} with a birdie`);
            }
        }
    });

    logActivity(`${player.name} completed a round with birdies on holes: ${birdieHoles.join(', ')}`);
    
    birdieHoles.forEach(hole => {
        const checkbox = document.getElementById(`hole${hole}`);
        if (checkbox) checkbox.checked = false;
    });
    
    closeModal('logRoundModal');
    syncToFirebase();
    updateUI();
    
    if (player.holes.length === 18) {
        alert(`🎉 ${player.name} has conquered all 18 holes and won the game! 🎉`);
    }
}

function showGameSettings() {
    const modal = document.getElementById('gameSettingsModal');
    if (modal) modal.style.display = 'block';
}

function savePlayerNames() {
    gameState.players.forEach(player => {
        const input = document.getElementById(`editName${player.id}`);
        if (input) {
            const newName = input.value.trim();
            if (newName && newName !== player.name) {
                logActivity(`${player.name} changed their name to ${newName}`);
                player.name = newName;
            }
        }
    });
    
    closeModal('gameSettingsModal');
    syncToFirebase();
    updateUI();
}

async function adminResetGame() {
    const password = prompt('Enter admin password to reset game:');
    if (password !== 'ADMIN123') {
        alert('Incorrect password. Reset cancelled.');
        return;
    }
    
    if (!confirm('Are you sure you want to reset the game? This will clear all data and start over.')) {
        return;
    }
    
    if (confirm('Would you like to download current stats before resetting?')) {
        downloadStats();
    }
    
    pauseSync = true;
    updateSyncStatus('⏸️ Setup Mode', 'offline');
    
    gameState = {
        players: [],
        holes: {},
        originalOwners: {},
        activity: [],
        playerBirdies: {},
        stats: {}
    };
    
    currentView = 'rules';
    currentStatsView = 'territories';
    
    const playerCount = prompt('How many players for the new game? (4 recommended)', '4');
    const numPlayers = Math.max(1, Math.min(8, parseInt(playerCount) || 4));
    
    const playerNames = [];
    for (let i = 1; i <= numPlayers; i++) {
        const name = prompt(`Enter name for Player ${i}:`, `Player ${i}`);
        if (name && name.trim()) {
            playerNames.push(name.trim());
        } else {
            playerNames.push(`Player ${i}`);
        }
    }
    
    playerNames.forEach((name, index) => {
        addPlayerToGame(name, PLAYER_COLORS[index]);
    });
    
    if (gameState.players.length > 0) {
        randomlyAssignHoles();
    }
    
    showView('rules');
    
    pauseSync = false;
    await syncToFirebase();
    updateUI();
    
    alert('Game has been reset! New territories have been assigned. Check the Rules for game information.');
}

function downloadStats() {
    const csvContent = generateStatsCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lords_of_lake_windsor_stats_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function generateStatsCSV() {
    let csv = 'Player Name,Current Holes,Total Conquests,Total Losses,Rounds Played,Total Birdies\n';
    
    gameState.players.forEach(player => {
        const totalBirdies = gameState.playerBirdies[player.id].length;
        csv += `"${player.name}",${player.holes.length},${player.conquests},${player.losses},${player.rounds},${totalBirdies}\n`;
    });
    
    csv += '\nHole Ownership\n';
    csv += 'Hole Number,Original Owner,Current Owner\n';
    
    for (let i = 1; i <= 18; i++) {
        const originalOwner = getPlayerById(gameState.originalOwners[i]);
        const currentOwner = getHoleOwner(i);
        csv += `${i},"${originalOwner ? originalOwner.name : 'Unoccupied'}","${currentOwner ? currentOwner.name : 'Unoccupied'}"\n`;
    }
    
    csv += '\nPlayer Birdies\n';
    csv += 'Player Name,Birdie Holes\n';
    gameState.players.forEach(player => {
        const birdies = gameState.playerBirdies[player.id].join('; ');
        csv += `"${player.name}","${birdies}"\n`;
    });
    
    csv += '\nActivity Log\n';
    gameState.activity.forEach(activity => {
        csv += `"${activity}"\n`;
    });
    
    return csv;
}

function logActivity(message) {
    const timestamp = new Date().toLocaleString();
    gameState.activity.push(`[${timestamp}] ${message}`);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Make functions global
window.showView = showView;
window.showStats = showStats;
window.showAddPlayerModal = showAddPlayerModal;
window.addPlayer = addPlayer;
window.showLogRoundModal = showLogRoundModal;
window.logRound = logRound;
window.showGameSettings = showGameSettings;
window.savePlayerNames = savePlayerNames;
window.adminResetGame = adminResetGame;
window.downloadStats = downloadStats;
window.revertAction = revertAction;
window.closeModal = closeModal;

// Initialize
document.addEventListener('DOMContentLoaded', initializeGame);

// Temporary fix function for Linc/Boe birdie mix-up
window.fixBirdieError = function() {
    // Find player IDs
    const linc = gameState.players.find(p => p.name.toLowerCase().includes('linc'));
    const boe = gameState.players.find(p => p.name.toLowerCase().includes('boe'));
    
    if (!linc || !boe) {
        alert('Could not find Linc or Boe in player list');
        return;
    }
    
    // Remove hole 18 birdie from Boe
    gameState.playerBirdies[boe.id] = gameState.playerBirdies[boe.id].filter(hole => hole !== 18);
    
    // Add hole 18 birdie to Linc (if not already there)
    if (!gameState.playerBirdies[linc.id].includes(18)) {
        gameState.playerBirdies[linc.id].push(18);
    }
    
    // Remove hole 18 from Boe's territories
    boe.holes = boe.holes.filter(hole => hole !== 18);
    
    // Add hole 18 to Linc's territories (if not already there)
    if (!linc.holes.includes(18)) {
        linc.holes.push(18);
    }
    
    // Fix hole ownership
    gameState.holes[18] = linc.id;
    
    // Update conquest stats
    if (boe.conquests > 0) boe.conquests--;
    linc.conquests++;
    
    // Log the fix
    logActivity(`ADMIN FIX: Corrected hole 18 - transferred from ${boe.name} back to ${linc.name}`);
    
    // Save and update
    syncToFirebase();
    updateUI();
    
    alert('Fixed! Hole 18 transferred back to Linc.');
};





// Fix for hole 18 ownership issue
async function fixHole18Ownership() {
    try {
        console.log('Fixing hole 18 ownership...');
        
        const gameDocRef = doc(db, 'games', 'current');
        const gameDoc = await getDoc(gameDocRef);
        
        if (!gameDoc.exists()) {
            console.error('Game document not found');
            return;
        }
        
        const gameData = gameDoc.data();
        
        // Update hole 18 to be owned by Linc
        if (gameData.holeOwnership) {
            const updatedOwnership = { ...gameData.holeOwnership };
            updatedOwnership[18] = 'Linc';
            
            await updateDoc(gameDocRef, {
                holeOwnership: updatedOwnership
            });
            
            console.log('Successfully fixed hole 18 - now owned by Linc');
            alert('Hole 18 ownership fixed! Linc now owns hole 18.');
        }
        
    } catch (error) {
        console.error('Error fixing hole 18:', error);
        alert('Error fixing hole 18. Check console for details.');
    }
}
// Make function available globally
window.fixHole18Ownership = fixHole18Ownership;

