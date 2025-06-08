import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ScanHistoryItem {
  id: string;
  bgnPrice: number;
  eurPrice: number;
  isCorrect: boolean;
  timestamp: Date;
  location?: string;
  confidence?: number;
  rawText?: string;
}

const HISTORY_KEY = 'scan_history';

class HistoryService {
  async getHistory(): Promise<ScanHistoryItem[]> {
    try {
      const historyJson = await AsyncStorage.getItem(HISTORY_KEY);
      if (!historyJson) return [];
      
      const history = JSON.parse(historyJson);
      // Convert timestamp strings back to Date objects
      return history.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
    } catch (error) {
      console.error('Failed to load history:', error);
      return [];
    }
  }

  async addToHistory(item: Omit<ScanHistoryItem, 'id'>): Promise<void> {
    try {
      const history = await this.getHistory();
      const newItem: ScanHistoryItem = {
        ...item,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
      };
      
      history.unshift(newItem); // Add to beginning
      
      // Keep only last 100 items
      const trimmedHistory = history.slice(0, 100);
      
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('Failed to save to history:', error);
    }
  }

  async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }

  async removeItem(id: string): Promise<void> {
    try {
      const history = await this.getHistory();
      const filteredHistory = history.filter(item => item.id !== id);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(filteredHistory));
    } catch (error) {
      console.error('Failed to remove item from history:', error);
    }
  }
}

export const historyService = new HistoryService();