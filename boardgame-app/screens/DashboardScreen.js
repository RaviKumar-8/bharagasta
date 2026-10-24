import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, TextInput, Alert, ActivityIndicator, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketModule, { socket as namedSocket } from '../socket';
import { feedback } from '../utils/feedback';

const socket = (socketModule && socketModule.on) ? socketModule : (namedSocket || socketModule || {});
const SETTINGS_STORAGE_KEY = '@bharagasta_user_settings';

export default function DashboardScreen({ navigation, playerName, onStartGame, onLogout }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [matchChoiceVisible, setMatchChoiceVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [pendingMode, setPendingMode] = useState('online');
  const [joinCode, setJoinCode] = useState('');
  const [waitingModal, setWaitingModal] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null);
  const [searchingMatch, setSearchingMatch] = useState(false);
  const [searchTarget, setSearchTarget] = useState(2);
  const [isConnected, setIsConnected] = useState(Boolean(socket && socket.connected));

  // Settings State
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [showHighlights, setShowHighlights] = useState(true);

  // Load saved settings from disk on launch
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setSoundEnabled(parsed.soundEnabled ?? true);
          setVibrationEnabled(parsed.vibrationEnabled ?? true);
          setShowHighlights(parsed.showHighlights ?? true);
          feedback.updateSettings({
            soundEnabled: parsed.soundEnabled ?? true,
            vibrationEnabled: parsed.vibrationEnabled ?? true
          });
        }
      } catch (err) {
        console.warn('Failed to load settings', err);
      }
    })();
  }, []);

  // Save settings helper
  const handleSaveSettings = async (newSound, newVibe, newHighlights) => {
    try {
      const payload = {
        soundEnabled: newSound,
        vibrationEnabled: newVibe,
        showHighlights: newHighlights
      };
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
      feedback.updateSettings({
        soundEnabled: newSound,
        vibrationEnabled: newVibe
      });
    } catch (e) {
      console.warn('Failed to save settings', e);
    }
  };

  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') {
      setIsConnected(false);
      return;
    }

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleConnectError = () => setIsConnected(false);

    const onRoomCreated = (data) => {
      setRoomInfo(data);
      setSearchingMatch(false);
      setModalVisible(false);
      setWaitingModal(true);
    };

    const onRoomJoined = (data) => {
      setSearchingMatch(false);
      setWaitingModal(false);
      setModalVisible(false);

      if (typeof onStartGame === 'function') {
        onStartGame({
          mode: 'online',
          roomId: data.roomId,
          playerColor: data.playerColor,
          roomData: data.roomData,
          socket,
          settings: { soundEnabled, vibrationEnabled, showHighlights }
        });
      }
    };

    const onQuickMatchWaiting = (data) => {
      setRoomInfo(data);
      setSearchingMatch(true);
    };

    const onMatchFound = (data) => {
      setSearchingMatch(false);
      const myPlayer = data.roomData?.players?.find(p => p.socketId === socket.id);
      const myColor = myPlayer ? myPlayer.color : 'red';

      if (typeof onStartGame === 'function') {
        onStartGame({
          mode: 'online',
          roomId: data.roomId,
          playerColor: myColor,
          roomData: data.roomData,
          socket,
          settings: { soundEnabled, vibrationEnabled, showHighlights }
        });
      }
    };

    const onRoomUpdated = (updatedRoom) => {
      setRoomInfo((prev) => (prev ? { ...prev, roomData: updatedRoom } : { roomId: updatedRoom.id, roomData: updatedRoom }));
    };

    const onRoomError = (err) => {
      setSearchingMatch(false);
      Alert.alert('Room Error', err.message || 'Could not connect to room.');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('ROOM_CREATED', onRoomCreated);
    socket.on('ROOM_JOINED', onRoomJoined);
    socket.on('QUICK_MATCH_WAITING', onQuickMatchWaiting);
    socket.on('MATCH_FOUND', onMatchFound);
    socket.on('ROOM_UPDATED', onRoomUpdated);
    socket.on('ROOM_ERROR', onRoomError);

    if (socket && !socket.connected && typeof socket.connect === 'function') {
      socket.connect();
    }

    return () => {
      if (socket && typeof socket.off === 'function') {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('connect_error', handleConnectError);
        socket.off('ROOM_CREATED', onRoomCreated);
        socket.off('ROOM_JOINED', onRoomJoined);
        socket.off('QUICK_MATCH_WAITING', onQuickMatchWaiting);
        socket.off('MATCH_FOUND', onMatchFound);
        socket.off('ROOM_UPDATED', onRoomUpdated);
        socket.off('ROOM_ERROR', onRoomError);
      }
    };
  }, [soundEnabled, vibrationEnabled, showHighlights]);

  const handleSelectMode = (modeId) => {
    if (modeId === 'local') {
      if (typeof onStartGame === 'function') {
        onStartGame({
          mode: 'local',
          roomId: null,
          playerColor: 'red',
          roomData: {
            targetPlayers: 2,
            activeColors: ['red', 'green'],
            players: [
              { color: 'red', username: playerName || 'Player 1' },
              { color: 'green', username: 'Player 2' }
            ]
          },
          settings: { soundEnabled, vibrationEnabled, showHighlights }
        });
      }
    } else if (modeId === 'ai') {
      setPendingMode('ai');
      setMatchChoiceVisible(true);
    } else if (modeId === 'friends') {
      if (!isConnected) return Alert.alert('Server Offline', 'Cannot reach backend server.');
      setModalVisible(true);
    } else if (modeId === 'online') {
      if (!isConnected) return Alert.alert('Server Offline', 'Cannot reach backend server.');
      setPendingMode('online');
      setMatchChoiceVisible(true);
    }
  };

  const handlePlayerCountChoice = (count) => {
    setMatchChoiceVisible(false);

    if (pendingMode === 'ai') {
      const activeColors = count === 2 ? ['red', 'green'] : ['red', 'yellow', 'green', 'blue'];
      const players = count === 2
        ? [
            { color: 'red', username: playerName || 'Player' },
            { color: 'green', username: 'Bot 1' }
          ]
        : [
            { color: 'red', username: playerName || 'Player' },
            { color: 'yellow', username: 'Bot 1' },
            { color: 'green', username: 'Bot 2' },
            { color: 'blue', username: 'Bot 3' }
          ];

      if (typeof onStartGame === 'function') {
        onStartGame({
          mode: 'ai',
          roomId: null,
          playerColor: 'red',
          roomData: {
            targetPlayers: count,
            activeColors,
            players,
            hasCaptured: { red: false, yellow: false, green: false, blue: false }
          },
          settings: { soundEnabled, vibrationEnabled, showHighlights }
        });
      }
    } else {
      setSearchTarget(count);
      setSearchingMatch(true);
      if (socket && typeof socket.emit === 'function') {
        socket.emit('QUICK_MATCH', { username: playerName, targetPlayers: count });
      }
    }
  };

  const cancelQuickMatch = () => {
    setSearchingMatch(false);
    if (socket && typeof socket.emit === 'function') {
      socket.emit('CANCEL_QUICK_MATCH');
    }
  };

  const handleCreatePrivateRoom = () => {
    if (!isConnected) return Alert.alert('Server Offline', 'Cannot reach backend server.');
    if (socket && typeof socket.emit === 'function') {
      socket.emit('CREATE_ROOM', { username: playerName });
    }
  };

  const handleJoinPrivateRoom = () => {
    if (!joinCode.trim()) return Alert.alert('Invalid Code', 'Please enter a 5-digit room code.');
    if (socket && typeof socket.emit === 'function') {
      socket.emit('JOIN_ROOM', { roomId: joinCode.trim(), username: playerName });
    }
  };

  const handleStartHostGame = () => {
    if (!roomInfo) return;
    setWaitingModal(false);
    if (socket && typeof socket.emit === 'function') {
      socket.emit('HOST_START_GAME', { roomId: roomInfo.roomId });
    }
    if (typeof onStartGame === 'function') {
      onStartGame({
        mode: 'online',
        roomId: roomInfo.roomId,
        playerColor: roomInfo.playerColor,
        roomData: roomInfo.roomData,
        socket,
        settings: { soundEnabled, vibrationEnabled, showHighlights }
      });
    }
  };

  const modes = [
    { id: 'online', title: '🌐 Online Quick Match', desc: 'Auto-match 2 or 4 players online.', color: '#1976D2' },
    { id: 'friends', title: '👥 Play with Friends', desc: 'Create or join via room code.', color: '#7B1FA2' },
    { id: 'ai', title: '🤖 Play with AI', desc: 'Practice vs intelligent numbered bots.', color: '#E65100' },
    { id: 'local', title: '📱 Pass & Play (Local)', desc: 'Play locally on one screen.', color: '#388E3C' }
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.statusBadge, { backgroundColor: isConnected ? '#E8F5E9' : '#FFEBEE' }]}>
        <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#E53935' }]} />
        <Text style={[styles.statusText, { color: isConnected ? '#2E7D32' : '#C62828' }]}>
          {isConnected ? 'Server: Connected' : 'Server: Disconnected'}
        </Text>
      </View>

      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeSub}>Welcome back,</Text>
          <Text style={styles.playerName}>👤 {playerName || 'Player'}</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.settingsBtn} 
            onPress={() => setSettingsVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              if (typeof onLogout === 'function') onLogout();
              if (navigation && typeof navigation.navigate === 'function') {
                navigation.navigate('home');
              }
            }}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.heading}>SELECT GAME MODE</Text>

      <ScrollView contentContainerStyle={styles.cardsContainer} showsVerticalScrollIndicator={false}>
        {modes.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={[styles.card, { borderLeftColor: m.color }]}
            onPress={() => handleSelectMode(m.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.cardTitle, { color: m.color }]}>{m.title}</Text>
            <Text style={styles.cardDesc}>{m.desc}</Text>
            <View style={[styles.playBadge, { backgroundColor: m.color }]}>
              <Text style={styles.playBadgeText}>PLAY NOW ➔</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Settings Modal with Persistent Toggles */}
      <Modal visible={settingsVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>⚙️ Settings</Text>
            <Text style={styles.waitingText}>Preferences are automatically saved</Text>

            <View style={styles.settingsRow}>
              <View>
                <Text style={styles.settingLabel}>Sound Effects</Text>
                <Text style={styles.settingSubLabel}>Dice rolls, steps & capture sounds</Text>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={(val) => {
                  setSoundEnabled(val);
                  handleSaveSettings(val, vibrationEnabled, showHighlights);
                }}
                trackColor={{ false: '#767577', true: '#81C784' }}
                thumbColor={soundEnabled ? '#2E7D32' : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingsRow}>
              <View>
                <Text style={styles.settingLabel}>Haptic Feedback</Text>
                <Text style={styles.settingSubLabel}>Device vibrations on interaction</Text>
              </View>
              <Switch
                value={vibrationEnabled}
                onValueChange={(val) => {
                  setVibrationEnabled(val);
                  handleSaveSettings(soundEnabled, val, showHighlights);
                }}
                trackColor={{ false: '#767577', true: '#81C784' }}
                thumbColor={vibrationEnabled ? '#2E7D32' : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingsRow}>
              <View>
                <Text style={styles.settingLabel}>Move Highlights (🎯)</Text>
                <Text style={styles.settingSubLabel}>Show destination tiles on roll</Text>
              </View>
              <Switch
                value={showHighlights}
                onValueChange={(val) => {
                  setShowHighlights(val);
                  handleSaveSettings(soundEnabled, vibrationEnabled, val);
                }}
                trackColor={{ false: '#767577', true: '#81C784' }}
                thumbColor={showHighlights ? '#2E7D32' : '#f4f3f4'}
              />
            </View>

            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#4CAF50', marginTop: 15 }]} 
              onPress={() => setSettingsVisible(false)}
            >
              <Text style={styles.actionBtnText}>DONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Match Size Selection Modal */}
      <Modal visible={matchChoiceVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {pendingMode === 'ai' ? '🤖 Play vs AI' : '🌐 Online Quick Match'}
            </Text>
            <Text style={styles.waitingText}>Select how many players in this match:</Text>
            
            <TouchableOpacity style={styles.actionBtn} onPress={() => handlePlayerCountChoice(2)}>
              <Text style={styles.actionBtnText}>⚡ 2 PLAYERS (1 vs 1)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#7B1FA2', marginTop: 10 }]} onPress={() => handlePlayerCountChoice(4)}>
              <Text style={styles.actionBtnText}>👥 4 PLAYERS (Battle Royale)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setMatchChoiceVisible(false)}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Waiting Modal for Quick Match */}
      <Modal visible={searchingMatch} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Searching Opponent...</Text>
            <Text style={styles.waitingText}>
              Waiting for players to join {searchTarget}-player match ({roomInfo?.roomData?.players?.length || 1}/{searchTarget})
            </Text>
            <ActivityIndicator size="large" color="#1976D2" style={{ marginVertical: 20 }} />
            <TouchableOpacity style={styles.closeBtn} onPress={cancelQuickMatch}>
              <Text style={styles.closeBtnText}>Cancel Search</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Private Room Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Play with Friends</Text>
            
            <TouchableOpacity style={styles.actionBtn} onPress={handleCreatePrivateRoom}>
              <Text style={styles.actionBtnText}>CREATE PRIVATE ROOM</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.line} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.line} />
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="ENTER ROOM CODE"
              placeholderTextColor="#888"
              autoCapitalize="characters"
              value={joinCode}
              onChangeText={setJoinCode}
            />
            
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#7B1FA2' }]} onPress={handleJoinPrivateRoom}>
              <Text style={styles.actionBtnText}>JOIN ROOM</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Host Lobby Modal */}
      <Modal visible={waitingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Room Code: {roomInfo?.roomId}</Text>
            <Text style={styles.waitingText}>Share this code with your friends!</Text>

            <View style={{ width: '100%', backgroundColor: '#F8F9FA', borderRadius: 8, padding: 10, marginVertical: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 6 }}>
                Players in Room ({roomInfo?.roomData?.players?.length || 1}/4):
              </Text>
              {(roomInfo?.roomData?.players || []).map((p, idx) => (
                <View 
                  key={`${p.socketId || 'player'}-${p.color || ''}-${idx}`} 
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5 }}
                >
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: p.color || '#4CAF50', marginRight: 8 }} />
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#333' }}>
                    {p.username || `Player ${idx + 1}`}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: p.color || '#4CAF50' }}>
                    {(p.color || '').toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]} onPress={handleStartHostGame}>
              <Text style={styles.actionBtnText}>START MATCH</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setWaitingModal(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5', paddingHorizontal: 20, paddingTop: 40 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20, marginBottom: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, backgroundColor: '#FFF', padding: 15, borderRadius: 12, elevation: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  settingsBtn: { backgroundColor: '#EDE7F6', width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginRight: 8, elevation: 1 },
  settingsIcon: { fontSize: 18 },
  welcomeSub: { fontSize: 13, color: '#777' },
  playerName: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  logoutBtn: { backgroundColor: '#FFEBEE', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  logoutText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 13 },
  heading: { fontSize: 20, fontWeight: '900', color: '#333', letterSpacing: 1, marginBottom: 15, textAlign: 'center' },
  cardsContainer: { paddingBottom: 30 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 18, marginBottom: 15, borderLeftWidth: 6, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  cardDesc: { fontSize: 13, color: '#666', marginBottom: 12 },
  playBadge: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  playBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { width: '100%', backgroundColor: '#FFF', borderRadius: 14, padding: 20, alignItems: 'center', elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  waitingText: { fontSize: 13, color: '#666', marginBottom: 12, textAlign: 'center' },
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  settingLabel: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  settingSubLabel: { fontSize: 12, color: '#888' },
  modalInput: { width: '100%', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, textAlign: 'center', fontSize: 18, fontWeight: 'bold', letterSpacing: 3, marginBottom: 10 },
  actionBtn: { width: '100%', backgroundColor: '#1976D2', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginVertical: 4 },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 12 },
  line: { flex: 1, height: 1, backgroundColor: '#ddd' },
  orText: { marginHorizontal: 10, color: '#888', fontWeight: 'bold' },
  closeBtn: { marginTop: 12 },
  closeBtnText: { color: '#E53935', fontWeight: 'bold' }
});