import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SERVER_URL } from '../socket';

export default function LoginScreen({ navigation, onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your username and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok && data.success) {
        onLoginSuccess(data.user.username);
        navigation.navigate('dashboard');
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials.');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Network Error', `Cannot connect to ${SERVER_URL}. Is your server running?`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titleText}>PLAYER LOGIN</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#888"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>SUBMIT LOGIN</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('register')}>
        <Text style={styles.linkText}>Don't have an account? Register here</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('home')} style={{ marginTop: 12 }}>
        <Text style={styles.linkText}>← Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', padding: 20 },
  titleText: { fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  input: { width: '80%', backgroundColor: '#FFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', marginBottom: 15, fontSize: 16 },
  primaryButton: { backgroundColor: '#4CAF50', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 8, marginVertical: 8, width: '80%', alignItems: 'center', elevation: 3 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  linkText: { color: '#1976D2', marginTop: 15, fontSize: 14, fontWeight: '600' }
});