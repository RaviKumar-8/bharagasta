import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.titleText}>🎲 Bharagasta 🎲</Text>
      <Text style={styles.subtitleText}>Welcome to the 7x7 Strategy Game</Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('login')}
      >
        <Text style={styles.buttonText}>LOGIN</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('register')}
      >
        <Text style={styles.secondaryButtonText}>REGISTER</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', padding: 20 },
  titleText: { fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
  subtitleText: { fontSize: 16, color: '#666', marginBottom: 30, textAlign: 'center' },
  primaryButton: { backgroundColor: '#4CAF50', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 8, marginVertical: 8, width: '80%', alignItems: 'center', elevation: 3 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#FFF', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 8, borderWidth: 1, borderColor: '#4CAF50', marginVertical: 8, width: '80%', alignItems: 'center' },
  secondaryButtonText: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' }
});