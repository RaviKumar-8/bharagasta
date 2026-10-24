import AsyncStorage from '@react-native-async-storage/async-storage';

const STATS_KEY = '@bharagasta_stats';
const SETTINGS_KEY = '@bharagasta_settings';

const DEFAULT_STATS = {
  played: 0,
  won: 0,
  lost: 0,
  currentStreak: 0,
  bestStreak: 0,
  captures: 0,
};

const DEFAULT_SETTINGS = {
  soundEnabled: true,
  hapticsEnabled: true,
};

export const getMatchStats = async () => {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_STATS;
  } catch {
    return DEFAULT_STATS;
  }
};

export const recordMatchOutcome = async ({ won, captures = 0 }) => {
  try {
    const current = await getMatchStats();
    const played = current.played + 1;
    const wins = won ? current.won + 1 : current.won;
    const lost = !won ? current.lost + 1 : current.lost;
    const currentStreak = won ? current.currentStreak + 1 : 0;
    const bestStreak = Math.max(currentStreak, current.bestStreak);
    const totalCaptures = current.captures + captures;

    const updated = {
      played,
      won: wins,
      lost,
      currentStreak,
      bestStreak,
      captures: totalCaptures,
    };

    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed saving match stats', e);
  }
};

export const getSettings = async () => {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed saving settings', e);
  }
};