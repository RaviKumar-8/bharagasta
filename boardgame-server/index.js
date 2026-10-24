const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bharagasta';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('🍃 MongoDB connected successfully to bharagasta'))
  .catch((err) => console.log('⚠️ MongoDB connection error:', err.message));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  stats: {
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 }
  }
});

const User = mongoose.model('User', userSchema);

// REST API Authentication
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password required.' });

  const cleanUsername = username.trim().toLowerCase();
  try {
    const existing = await User.findOne({ username: cleanUsername });
    if (existing) return res.status(409).json({ success: false, message: 'Username already taken.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ username: cleanUsername, password: hashedPassword });
    res.status(201).json({ success: true, message: 'Account created!', user: { id: newUser._id, username: newUser.username } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ success: false, message: 'Credentials missing.' });

  const cleanUsername = username.trim().toLowerCase();
  try {
    const user = await User.findOne({ username: cleanUsername });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      user: { id: user._id, username: user.username, stats: user.stats }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 });
    res.json({ count: users.length, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bharagasta Board & Path Definitions
const COLOR_SEATS = ['red', 'yellow', 'green', 'blue'];

const PATHS = {
  red: [
    // Starts at bottom gate [6,3], travels clockwise around outer ring to [6,2]
    [6,3], [6,4], [6,5], [6,6], [5,6], [4,6], [3,6], [2,6], [1,6], [0,6], 
    [0,5], [0,4], [0,3], [0,2], [0,1], [0,0], [1,0], [2,0], [3,0], [4,0], 
    [5,0], [6,0], [6,1], [6,2],
    // Inner track (after capture)
    [5,1], [4,1], [3,1], [2,1], [1,1], [1,2], [1,3], [1,4], [1,5], [2,5], 
    [3,5], [4,5], [5,5], [5,4], [5,3], [5,2], [4,2], [3,2], [2,2], [2,3], 
    [2,4], [3,4], [4,4], [4,3], [3,3]
  ],
  yellow: [
    // Starts at right gate [3,6], travels clockwise
    [3,6], [2,6], [1,6], [0,6], [0,5], [0,4], [0,3], [0,2], [0,1], [0,0], 
    [1,0], [2,0], [3,0], [4,0], [5,0], [6,0], [6,1], [6,2], [6,3], [6,4], 
    [6,5], [6,6], [5,6], [4,6],
    // Inner track
    [5,5], [5,4], [5,3], [5,2], [5,1], [4,1], [3,1], [2,1], [1,1], [1,2], 
    [1,3], [1,4], [1,5], [2,5], [3,5], [4,5], [4,4], [4,3], [4,2], [3,2], 
    [2,2], [2,3], [2,4], [3,4], [3,3]
  ],
  green: [
    // Starts at top gate [0,3], travels clockwise
    [0,3], [0,2], [0,1], [0,0], [1,0], [2,0], [3,0], [4,0], [5,0], [6,0], 
    [6,1], [6,2], [6,3], [6,4], [6,5], [6,6], [5,6], [4,6], [3,6], [2,6], 
    [1,6], [0,6], [0,5], [0,4],
    // Inner track
    [1,5], [2,5], [3,5], [4,5], [5,5], [5,4], [5,3], [5,2], [5,1], [4,1], 
    [3,1], [2,1], [1,1], [1,2], [1,3], [1,4], [2,4], [3,4], [4,4], [4,3], 
    [4,2], [3,2], [2,2], [2,3], [3,3]
  ],
  blue: [
    // Starts at left gate [3,0], travels clockwise
    [3,0], [4,0], [5,0], [6,0], [6,1], [6,2], [6,3], [6,4], [6,5], [6,6], 
    [5,6], [4,6], [3,6], [2,6], [1,6], [0,6], [0,5], [0,4], [0,3], [0,2], 
    [0,1], [0,0], [1,0], [2,0],
    // Inner track
    [1,1], [1,2], [1,3], [1,4], [1,5], [2,5], [3,5], [4,5], [5,5], [5,4], 
    [5,3], [5,2], [5,1], [4,1], [3,1], [2,1], [2,2], [2,3], [2,4], [3,4], 
    [4,4], [4,3], [4,2], [3,2], [3,3]
  ]
};

const isSafeZone = (row, col) => {
  return (row === 3 && col === 3) || (row === 0 && col === 3) || 
         (row === 1 && col === 1) || (row === 1 && col === 5) || 
         (row === 2 && col === 3) || (row === 4 && col === 3) || 
         (row === 6 && col === 3) || (row === 3 && col === 0) || 
         (row === 3 && col === 2) || (row === 3 && col === 4) || 
         (row === 5 && col === 1) || (row === 5 && col === 5) || 
         (row === 3 && col === 6);
};

// Generates tokens only for active teams
const initializeTokens = (activeColors = COLOR_SEATS) => {
  const tokens = [];
  activeColors.forEach(color => {
    for (let i = 1; i <= 6; i++) {
      tokens.push({ id: `${color}-${i}`, color, status: 'base', pathIndex: -1 });
    }
  });
  return tokens;
};

// Game Rooms and Non-serializable Timers stored separately
const rooms = {};
const roomTimers = {};

const generateRoomCode = () => Math.random().toString(36).substring(2, 7).toUpperCase();

// Helper to determine if a move is legal under Bharagasta rules
const isLegalMove = (token, roll, room) => {
  const path = PATHS[token.color] || [];
  
  // Ensure hasCaptured object exists
  if (!room.hasCaptured) {
    room.hasCaptured = { red: false, green: false, yellow: false, blue: false };
  }
  const playerCaptured = Boolean(room.hasCaptured[token.color]);

  if (token.status === 'base') {
    if (roll !== 6) return false;
    // Cannot release if entry safe square is occupied by a friendly token
    const friendlyOnEntry = room.tokens.some(
      t => t.id !== token.id && t.color === token.color && t.status === 'active' && t.pathIndex === 0
    );
    return !friendlyOnEntry;
  }

  if (token.status === 'active') {
    const destIndex = token.pathIndex + roll;

    // HARD LOCK: Outer track is indices 0 through 23.
    // Index 24 and above is the inner track.
    // Without a capture, NO MOVE can land on or past index 24.
    if (!playerCaptured && destIndex > 23) {
      return false; // Token must stay outside! Move is illegal.
    }

    // Cannot overshoot home goal
    if (destIndex > path.length - 1) return false;

    // Rule: No tile sharing with own pieces
    const targetCoord = path[destIndex];
    if (!targetCoord) return false;

    const friendlyOnDest = room.tokens.some(t => {
      if (t.id === token.id || t.color !== token.color || t.status !== 'active') return false;
      const coord = PATHS[t.color]?.[t.pathIndex];
      return coord && coord[0] === targetCoord[0] && coord[1] === targetCoord[1];
    });

    return !friendlyOnDest;
  }

  return false;
};

const startTurnTimer = (roomId) => {
  const room = rooms[roomId];
  if (!room) return;

  if (roomTimers[roomId]) {
    clearInterval(roomTimers[roomId]);
    delete roomTimers[roomId];
  }

  room.timeLeft = 20;
  io.to(roomId).emit('TIMER_TICK', { timeLeft: room.timeLeft });

  roomTimers[roomId] = setInterval(() => {
    if (!rooms[roomId]) {
      clearInterval(roomTimers[roomId]);
      delete roomTimers[roomId];
      return;
    }

    room.timeLeft--;
    io.to(roomId).emit('TIMER_TICK', { timeLeft: room.timeLeft });

    if (room.timeLeft <= 0) {
      clearInterval(roomTimers[roomId]);
      delete roomTimers[roomId];
      handleTurnTimeout(roomId);
    }
  }, 1000);
};

const handleTurnTimeout = (roomId) => {
  const room = rooms[roomId];
  if (!room || room.status !== 'playing') return;

  rotateRoomTurn(room);
  io.to(roomId).emit('TURN_TIMEOUT', {
    currentPlayer: room.currentPlayer,
    message: 'Turn passed due to timeout.'
  });
  startTurnTimer(roomId);
};

const rotateRoomTurn = (room) => {
  const activeColors = room.activeColors || room.players.map(p => p.color);
  const currentIdx = activeColors.indexOf(room.currentPlayer);
  const nextIdx = (currentIdx + 1) % activeColors.length;
  room.currentPlayer = activeColors[nextIdx];
  room.diceValue = null;
  room.hasRolled = false;
};

// Socket Connections
io.on('connection', (socket) => {
  // CREATE PRIVATE ROOM
  socket.on('CREATE_ROOM', ({ username }, callback) => {
    let roomId = generateRoomCode();
    while (rooms[roomId]) roomId = generateRoomCode();

    const activeColors = ['red', 'yellow', 'green', 'blue'];
    const newRoom = {
      id: roomId,
      hostId: socket.id,
      isQuickMatch: false,
      targetPlayers: 4,
      activeColors,
      hasCaptured: { red: false, green: false, yellow: false, blue: false },
      players: [{ socketId: socket.id, username: username || 'Host', color: 'red' }],
      tokens: initializeTokens(activeColors),
      status: 'lobby',
      currentPlayer: 'red',
      diceValue: null,
      hasRolled: false,
      timeLeft: 20
    };

    rooms[roomId] = newRoom;
    socket.join(roomId);
    socket.roomId = roomId;

    const payload = { roomId, playerColor: 'red', roomData: newRoom };
    if (typeof callback === 'function') callback({ success: true, data: payload });
    socket.emit('ROOM_CREATED', payload);
  });

  // JOIN PRIVATE ROOM
  socket.on('JOIN_ROOM', ({ roomId, username }, callback) => {
    const cleanId = roomId?.trim().toUpperCase();
    const room = rooms[cleanId];

    if (!room) {
      if (typeof callback === 'function') callback({ success: false, message: 'Room not found.' });
      return socket.emit('ROOM_ERROR', { message: 'Room not found.' });
    }

    const existingPlayer = room.players.find(p => p.socketId === socket.id);
    if (existingPlayer) {
      const payload = { roomId: cleanId, playerColor: existingPlayer.color, roomData: room };
      if (typeof callback === 'function') callback({ success: true, data: payload });
      return socket.emit('ROOM_JOINED', payload);
    }

    if (room.players.length >= 4) {
      if (typeof callback === 'function') callback({ success: false, message: 'Room is full.' });
      return socket.emit('ROOM_ERROR', { message: 'Room is full.' });
    }

    const color = COLOR_SEATS[room.players.length];
    room.players.push({ socketId: socket.id, username: username || `Player ${room.players.length + 1}`, color });

    socket.join(cleanId);
    socket.roomId = cleanId;

    const payload = { roomId: cleanId, playerColor: color, roomData: room };
    if (typeof callback === 'function') callback({ success: true, data: payload });
    socket.emit('ROOM_JOINED', payload);
    io.to(cleanId).emit('ROOM_UPDATED', room);
  });

  // HOST STARTS GAME (PRIVATE ROOM)
  socket.on('HOST_START_GAME', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.status = 'playing';
    io.to(roomId).emit('GAME_STARTED', { roomId, roomData: room });
    startTurnTimer(roomId);
  });

  // ONLINE QUICK MATCH (2 or 4 Players)
  socket.on('QUICK_MATCH', ({ username, targetPlayers = 2 }) => {
    const targetSize = parseInt(targetPlayers, 10) === 4 ? 4 : 2;

    let openRoom = Object.values(rooms).find(
      (r) => r.isQuickMatch && r.targetPlayers === targetSize && r.status === 'lobby' && r.players.length < targetSize
    );

    if (openRoom) {
      const seatColor = targetSize === 2 ? 'green' : COLOR_SEATS[openRoom.players.length];

      const newPlayer = {
        socketId: socket.id,
        username: username || `Player ${openRoom.players.length + 1}`,
        color: seatColor
      };

      openRoom.players.push(newPlayer);
      socket.join(openRoom.id);
      socket.roomId = openRoom.id;

      if (openRoom.players.length === targetSize) {
        openRoom.status = 'playing';

        io.to(openRoom.id).emit('MATCH_FOUND', {
          roomId: openRoom.id,
          roomData: openRoom
        });

        startTurnTimer(openRoom.id);
      } else {
        socket.emit('QUICK_MATCH_WAITING', {
          roomId: openRoom.id,
          playerColor: seatColor,
          roomData: openRoom
        });
        io.to(openRoom.id).emit('ROOM_UPDATED', openRoom);
      }
    } else {
      const roomId = generateRoomCode();
      const activeColors = targetSize === 2 ? ['red', 'green'] : COLOR_SEATS;

      const newRoom = {
        id: roomId,
        hostId: socket.id,
        isQuickMatch: true,
        targetPlayers: targetSize,
        activeColors,
        hasCaptured: { red: false, green: false, yellow: false, blue: false },
        players: [{ socketId: socket.id, username: username || 'Player 1', color: 'red' }],
        tokens: initializeTokens(activeColors),
        status: 'lobby',
        currentPlayer: 'red',
        diceValue: null,
        hasRolled: false,
        timeLeft: 20
      };

      rooms[roomId] = newRoom;
      socket.join(roomId);
      socket.roomId = roomId;

      socket.emit('QUICK_MATCH_WAITING', {
        roomId,
        playerColor: 'red',
        roomData: newRoom
      });
    }
  });

  // CANCEL QUICK MATCH
  socket.on('CANCEL_QUICK_MATCH', () => {
    const roomId = socket.roomId;
    if (roomId && rooms[roomId] && rooms[roomId].isQuickMatch && rooms[roomId].status === 'lobby') {
      rooms[roomId].players = rooms[roomId].players.filter(p => p.socketId !== socket.id);
      if (rooms[roomId].players.length === 0) {
        if (roomTimers[roomId]) {
          clearInterval(roomTimers[roomId]);
          delete roomTimers[roomId];
        }
        delete rooms[roomId];
      } else {
        io.to(roomId).emit('ROOM_UPDATED', rooms[roomId]);
      }
      socket.leave(roomId);
      socket.roomId = null;
    }
  });

  // ROLL DICE
  socket.on('ROLL_DICE', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'playing' || room.hasRolled) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player || player.color !== room.currentPlayer) return;

    const rollPool1 = [1, 2, 3, 0];
    const rollPool2 = [1, 2, 3, 0];
    const roll1 = rollPool1[Math.floor(Math.random() * rollPool1.length)];
    const roll2 = rollPool2[Math.floor(Math.random() * rollPool2.length)];

    const roll = 0;
    if (roll1 + roll2 === 0){
      roll = 12;     
    }
    else {
      roll = roll1 + roll2;
    }

    room.diceValue = roll;
    room.hasRolled = true;

    startTurnTimer(roomId);

    io.to(roomId).emit('DICE_RESULT', { result: roll, playerColor: room.currentPlayer });

    const currentTokens = room.tokens.filter(t => t.color === room.currentPlayer);
    const canMove = currentTokens.some(t => isLegalMove(t, roll, room));

    if (!canMove) {
      if (roll === 12 || roll === 6) {
        setTimeout(() => {
          room.hasRolled = false;
          room.diceValue = null;
          io.to(roomId).emit('BONUS_ROLL_GRANTED', {
            message: `Rolled ${roll}! No legal moves available, roll again!`,
            currentPlayer: room.currentPlayer
          });
          startTurnTimer(roomId);
        }, 1200);
      } else {
        setTimeout(() => {
          rotateRoomTurn(room);
          io.to(roomId).emit('TURN_ROTATED', { currentPlayer: room.currentPlayer });
          startTurnTimer(roomId);
        }, 1200);
      }
    }
  });

  // MAKE MOVE
  socket.on('MAKE_MOVE', async ({ roomId, tokenId }) => {
    const room = rooms[roomId];
    if (!room || !room.hasRolled || !room.diceValue) return;

    const token = room.tokens.find(t => t.id === tokenId);
    if (!token || token.color !== room.currentPlayer) return;

    const roll = room.diceValue;

    // Validate legality (no entry >= 24 without capture, no tile sharing)
    if (!isLegalMove(token, roll, room)) {
      // Move was invalid - notify player to pick another token or pass
      socket.emit('INVALID_MOVE', { message: 'Cannot enter inner grid without capturing an opponent first!' });
      return;
    }

    const path = PATHS[token.color] || [];
    let startIdx = token.pathIndex;
    let targetIdx = startIdx;
    let finalStatus = token.status;
    let enemyCaptured = null;

    if (token.status === 'base') {
      token.status = 'active';
      token.pathIndex = 0;
      targetIdx = 0;
      finalStatus = 'active';
    } else if (token.status === 'active') {
      targetIdx = token.pathIndex + roll;
      token.pathIndex = targetIdx;

      if (targetIdx === path.length - 1) {
        token.status = 'home';
        finalStatus = 'home';
      }
    }

    // Capture Check
    if (finalStatus === 'active') {
      const targetCoord = path[targetIdx];
      if (targetCoord && !isSafeZone(targetCoord[0], targetCoord[1])) {
        enemyCaptured = room.tokens.find(t => {
          if (t.color === token.color || t.status !== 'active') return false;
          const enemyCoord = PATHS[t.color]?.[t.pathIndex];
          return enemyCoord && enemyCoord[0] === targetCoord[0] && enemyCoord[1] === targetCoord[1];
        });

        if (enemyCaptured) {
          enemyCaptured.status = 'base';
          enemyCaptured.pathIndex = -1;

          if (!room.hasCaptured) room.hasCaptured = {};
          room.hasCaptured[token.color] = true;

          io.to(roomId).emit('CAPTURE_UNLOCKED', {
            playerColor: token.color,
            message: `${token.color.toUpperCase()} captured an opponent! Inner gate is now unlocked! 🔓`
          });
        }
      }
    }

    // Victory Check (all 6 tokens in home)
    const homeTokens = room.tokens.filter(t => t.color === token.color && t.status === 'home');
    const hasWon = homeTokens.length === 6;

    if (hasWon) {
      if (roomTimers[roomId]) {
        clearInterval(roomTimers[roomId]);
        delete roomTimers[roomId];
      }
      room.status = 'finished';

      const winnerPlayer = room.players.find(p => p.color === token.color);
      if (winnerPlayer) {
        try {
          await User.findOneAndUpdate({ username: winnerPlayer.username.toLowerCase() }, { $inc: { 'stats.gamesPlayed': 1, 'stats.gamesWon': 1 } });
          const losers = room.players.filter(p => p.color !== token.color);
          for (const loser of losers) {
            await User.findOneAndUpdate({ username: loser.username.toLowerCase() }, { $inc: { 'stats.gamesPlayed': 1 } });
          }
        } catch (e) {
          console.error('Stats update error:', e);
        }
      }

      io.to(roomId).emit('GAME_OVER', { winnerColor: token.color, winnerName: winnerPlayer?.username });
      return;
    }

    const isBonus = roll === 6 || roll === 12 || enemyCaptured;
    if (!isBonus) {
      rotateRoomTurn(room);
    } else {
      room.hasRolled = false;
      room.diceValue = null;
    }

    io.to(roomId).emit('MOVE_CONFIRMED', {
      tokenId,
      startIdx,
      targetIdx,
      finalStatus,
      enemyCapturedId: enemyCaptured ? enemyCaptured.id : null,
      nextPlayer: room.currentPlayer,
      isBonusTurn: isBonus
    });

    startTurnTimer(roomId);
  });

  // DISCONNECT
  socket.on('disconnect', () => {
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      const room = rooms[roomId];
      room.players = room.players.filter(p => p.socketId !== socket.id);

      if (room.players.length === 0) {
        if (roomTimers[roomId]) {
          clearInterval(roomTimers[roomId]);
          delete roomTimers[roomId];
        }
        delete rooms[roomId];
      } else {
        io.to(roomId).emit('ROOM_UPDATED', room);
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Bharagasta Server online on port ${PORT}`));