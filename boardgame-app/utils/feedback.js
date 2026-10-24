import * as Haptics from 'expo-haptics';

let Audio = null;
try {
  Audio = require('expo-av').Audio;
} catch (e) {
  console.log('Audio native module not available in this client.');
}

const SOUND_EFFECTS = {
  roll: 'https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3',
  step: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  capture: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  win: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  bonus: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3'
};

class FeedbackService {
  constructor() {
    this.soundEnabled = true;
    this.vibrationEnabled = true;
    this.initAudioMode();
  }

  updateSettings({ soundEnabled = true, vibrationEnabled = true }) {
    this.soundEnabled = soundEnabled;
    this.vibrationEnabled = vibrationEnabled;
  }

  async initAudioMode() {
    if (!Audio) return;
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch (e) {}
  }

  async playSound(key) {
    if (!this.soundEnabled || !Audio) return;
    try {
      const uri = SOUND_EFFECTS[key];
      if (!uri) return;
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume: 0.85 }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {}
  }

  triggerHaptic(type = 'light') {
    if (!this.vibrationEnabled || !Haptics) return;
    try {
      if (type === 'selection') {
        Haptics.selectionAsync();
      } else if (type === 'light') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (type === 'medium') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (type === 'heavy') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else if (type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (type === 'warning') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (e) {}
  }
}

export const feedback = new FeedbackService();