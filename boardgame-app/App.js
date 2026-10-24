import React, { useState } from 'react';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import DashboardScreen from './screens/DashboardScreen';
import GameScreen from './screens/GameScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [loggedInPlayer, setLoggedInPlayer] = useState(null);
  const [gameConfig, setGameConfig] = useState({
    mode: 'local',
    roomId: null,
    playerColor: 'red',
    socket: null
  });

  const navigation = {
    navigate: (screenName) => setCurrentScreen(screenName)
  };

  const handleStartGame = (config) => {
    setGameConfig(config);
    setCurrentScreen('game');
  };

  return (
    <>
      {currentScreen === 'home' && (
        <HomeScreen navigation={navigation} />
      )}

      {currentScreen === 'login' && (
        <LoginScreen
          navigation={navigation}
          onLoginSuccess={(user) => {
            setLoggedInPlayer(user);
          }}
        />
      )}

      {currentScreen === 'register' && (
        <RegisterScreen navigation={navigation} />
      )}

      {currentScreen === 'dashboard' && (
        <DashboardScreen
          navigation={navigation}
          playerName={loggedInPlayer}
          onStartGame={handleStartGame}
          onLogout={() => setLoggedInPlayer(null)}
        />
      )}

      {currentScreen === 'game' && (
        <GameScreen
          navigation={navigation}
          playerName={loggedInPlayer}
          gameConfig={gameConfig}
          onLogout={() => setLoggedInPlayer(null)}
        />
      )}
    </>
  );
}