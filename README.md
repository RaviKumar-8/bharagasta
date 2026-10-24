# 🎲 Bharagasta

A real-time multiplayer mobile adaptation of the ancient Indian strategic board game **Bharagasta** (also known as *Chowka Bhara*, *Ashta Chamma*, *Katte Mane*, or *Daayam*). Built with **React Native (Expo)** and **Socket.io**, featuring authentic cowrie-dice mechanics, capture-to-enter inner gates, bonus turns, bot AI, audio, and haptics.

---

## 📖 About the Game

Bharagasta is a turn-based race game traditionally played with 4 or 6 cowrie shells (*kavvalu*) on a $7 \times 7$ grid. Players roll cowries to race their tokens along an outer perimeter and an inner spiral into the central **Home Pod** ($[3,3]$).

### Core Mechanics & Custom Rules
* **Cowrie Roll Outcomes**: 
  * Rolls range across `1, 2, 3, 4, 5, 6, 12`.
  * Roll of `12` or `6` grants an **extra roll / bonus turn**.
* **Base Release (Roll 6)**:
  * Tokens start in the player's perimeter base pyramid.
  * A roll of **6** is strictly required to unlock and deploy a token to the player's entrance gate ($[6,3]$ for Red).
* **The Banked 12 Rule**:
  * If a player rolls a **12** when **no tokens** are currently active on the board, the 12 is **banked**.
  * The player receives an immediate bonus roll. If a subsequent roll is a **6**, releasing a token deploys it to the entry tile and automatically advances it 12 tiles along the track in a single chained stride.
* **Capture Requirement for Inner Track**:
  * Outer ring comprises 24 tiles.
  * Tokens **cannot** enter the inner spiral ring until the player has captured at least one opponent token (`hasCaptured = true`).
* **Safe Zones**:
  * Cells marked with an `❌` are safe zones (rosettes). Multiple pieces can share safe tiles without risk of capture.
  * Outside safe zones, landing on an opponent knocks their piece back to their base pyramid.
* **Exact Roll to Home**:
  * Tokens must enter the center Home Pod ($[3,3]$) with an **exact roll**. Overshooting is invalid.
* **Victory Condition**:
  * First player to move all tokens to the Home Pod wins the match.

---

## 📱 Features

- **Multiple Game Modes**:
  - 🌐 **Online Quick Match**: Auto-matchmaking for 2 or 4 players via WebSockets.
  - 👥 **Play with Friends**: Create or join custom private rooms with 5-digit room codes.
  - 🤖 **Play with AI**: Single-player offline mode against intelligent bot opponents.
  - 📱 **Pass & Play (Local)**: Shared single-screen multiplayer.
- **Visual & Audio Polish**:
  - Native sound effects (`expo-av`) for dice rolls, token hops, captures, bonuses, and wins.
  - Haptic feedback (`expo-haptics`) for tactile responses.
  - Dynamic `🎯` move indicators highlighting legal destination tiles.
  - Multi-token rosette positioning on safe tiles so overlapping pins stay visible.
  - Persistent settings stored on device via `AsyncStorage` (sound, vibration, highlights).

---

## 🛠 Tech Stack

### Client (`boardgame-app`)
- **React Native** & **Expo SDK**
- **Socket.io-client** (Real-time network synchronization)
- **Expo AV** (Sound effects engine)
- **Expo Haptics** (Tactile vibration feedback)
- **React Native Async Storage** (Settings persistence)

### Server (`boardgame-server`)
- **Node.js** & **Express**
- **Socket.io** (Room management, authoritative turn timers, state broadcast)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn
- Expo Go app installed on your Android or iOS device

---

### 1. Server Setup

```bash
# Navigate to the server folder
cd boardgame-server

# Install dependencies
npm install

# Start the server (default port: 3000)
node index.js
```

> **Tip for Remote Testing**: If testing with friends on different Wi-Fi networks without deploying to the cloud, expose your local server using [ngrok](https://ngrok.com/):
> ```bash
> ngrok http 3000
> ```
> Copy the generated `https://*.ngrok-free.app` URL into your client socket configuration.

---

### 2. Client Setup

```bash
# Navigate to the mobile app folder
cd boardgame-app

# Install dependencies
npm install

# Start Metro bundler with cache cleared
npx expo start -c
```

* **To test on public mobile networks with friends**, launch Expo with tunnel mode:
  ```bash
  npx expo start --tunnel
  ```
* Scan the displayed QR code using the **Expo Go** application.

---

## 📁 Project Structure

```text
bharagasta/
├── boardgame-app/              # React Native (Expo) Mobile Frontend
│   ├── assets/                 # Icons, splash screens, and audio clips
│   ├── screens/
│   │   ├── DashboardScreen.js  # Mode selection, private room lobby & settings
│   │   ├── GameScreen.js       # Main board grid, cowrie roll engine & animations
│   │   └── LoginScreen.js      # Player profile & authentication screen
│   ├── utils/
│   │   └── feedback.js         # Sound and haptic wrapper
│   ├── socket.js               # Socket.io connection setup
│   ├── App.js                  # Navigation container and root state
│   └── package.json
│
└── boardgame-server/           # Node.js + Socket.io Backend
    ├── index.js                # Game state coordinator, room logic & timer loop
    └── package.json
```

---

## ⚙️ Configuration (`socket.js`)

In `boardgame-app/socket.js`, adjust the server endpoint to match your environment:

```javascript
import { io } from 'socket.io-client';

// Local development IP or hosted server URL (Render, Railway, ngrok)
export const SERVER_URL = 'http://YOUR_LOCAL_IP:3000';

export const socket = io(SERVER_URL, {
  transports: ['websocket'],
  autoConnect: false,
});
```

---

## 🔒 Proprietary & Copyright Notice

All rights reserved. 

This project and its accompanying source code, assets, game rules, and designs are **proprietary and confidential**. Unauthorized copying, modification, distribution, public display, reverse engineering, or commercial use of this software, via any medium, is strictly prohibited without express written permission from the project owner.