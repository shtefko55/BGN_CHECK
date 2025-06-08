import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { History, CircleCheck as CheckCircle, Circle as XCircle, Trash2, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { historyService, ScanHistoryItem } from '@/utils/historyService';

export default function HistoryScreen() {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const historyData = await historyService.getHistory();
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const filteredHistory = history.filter(item => {
    if (filter === 'correct') return item.isCorrect;
    if (filter === 'incorrect') return !item.isCorrect;
    return true;
  });

  const deleteItem = async (id: string) => {
    try {
      await historyService.removeItem(id);
      await loadHistory(); // Reload history after deletion
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const clearAll = async () => {
    try {
      await historyService.clearHistory();
      setHistory([]);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('bg-BG', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateExpectedPrice = (bgnPrice: number) => {
    return (bgnPrice / 1.95583).toFixed(2);
  };

  const renderHistoryItem = ({ item }: { item: ScanHistoryItem }) => (
    <View style={styles.historyItem}>
      <View style={styles.itemHeader}>
        <View style={styles.itemStatus}>
          {item.isCorrect ? (
            <CheckCircle size={20} color="#10B981" />
          ) : (
            <XCircle size={20} color="#EF4444" />
          )}
          <Text style={[
            styles.itemStatusText,
            { color: item.isCorrect ? '#10B981' : '#EF4444' }
          ]}>
            {item.isCorrect ? 'Вярно' : 'Грешно'}
          </Text>
        </View>
        
        <TouchableOpacity onPress={() => deleteItem(item.id)}>
          <Trash2 size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <View style={styles.itemContent}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Цена в лева:</Text>
          <Text style={styles.priceValue}>{item.bgnPrice.toFixed(2)} лв</Text>
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Цена на етикет:</Text>
          <Text style={styles.priceValue}>{item.eurPrice.toFixed(2)} €</Text>
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Очаквана цена:</Text>
          <Text style={styles.priceValue}>{calculateExpectedPrice(item.bgnPrice)} €</Text>
        </View>

        {item.confidence && (
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Точност на разпознаването:</Text>
            <Text style={styles.priceValue}>{Math.round(item.confidence)}%</Text>
          </View>
        )}
      </View>

      <View style={styles.itemFooter}>
        <View style={styles.itemMeta}>
          <Calendar size={14} color="#64748B" />
          <Text style={styles.itemMetaText}>{formatDate(item.timestamp)}</Text>
        </View>
        {item.rawText && (
          <TouchableOpacity 
            onPress={() => console.log('Raw OCR text:', item.rawText)}
            style={styles.debugButton}
          >
            <Text style={styles.debugButtonText}>OCR текст</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const FilterButton = ({ type, label }: { type: typeof filter, label: string }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === type && styles.filterButtonActive
      ]}
      onPress={() => setFilter(type)}
    >
      <Text style={[
        styles.filterButtonText,
        filter === type && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <History size={32} color="#2563EB" />
        <Text style={styles.headerTitle}>История на сканиранията</Text>
        <Text style={styles.headerSubtitle}>
          Общо {history.length} сканирания
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        <FilterButton type="all" label="Всички" />
        <FilterButton type="correct" label="Верни" />
        <FilterButton type="incorrect" label="Грешни" />
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.statItem}
        >
          <Text style={styles.statNumber}>
            {history.filter(item => item.isCorrect).length}
          </Text>
          <Text style={styles.statLabel}>Верни</Text>
        </LinearGradient>
        
        <LinearGradient
          colors={['#EF4444', '#DC2626']}
          style={styles.statItem}
        >
          <Text style={styles.statNumber}>
            {history.filter(item => !item.isCorrect).length}
          </Text>
          <Text style={styles.statLabel}>Грешни</Text>
        </LinearGradient>

        <LinearGradient
          colors={['#2563EB', '#1D4ED8']}
          style={styles.statItem}
        >
          <Text style={styles.statNumber}>
            {history.length > 0 ? Math.round((history.filter(item => item.isCorrect).length / history.length) * 100) : 0}%
          </Text>
          <Text style={styles.statLabel}>Точност</Text>
        </LinearGradient>
      </View>

      {/* History List */}
      <View style={styles.listContainer}>
        {filteredHistory.length > 0 ? (
          <FlatList
            data={filteredHistory}
            renderItem={renderHistoryItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        ) : (
          <View style={styles.emptyState}>
            <History size={64} color="#CBD5E1" />
            <Text style={styles.emptyStateTitle}>Няма данни</Text>
            <Text style={styles.emptyStateText}>
              {filter === 'all' 
                ? 'Все още не сте сканирали цени'
                : `Няма ${filter === 'correct' ? 'верни' : 'грешни'} сканирания`
              }
            </Text>
          </View>
        )}
      </View>

      {/* Clear All Button */}
      {history.length > 0 && (
        <TouchableOpacity style={styles.clearAllButton} onPress={clearAll}>
          <Trash2 size={18} color="#FFFFFF" />
          <Text style={styles.clearAllButtonText}>Изчисти историята</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 4,
  },
  filters: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 10,
    gap: 10,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  statItem: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  historyItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemStatusText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 6,
  },
  itemContent: {
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  priceValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemMetaText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginLeft: 4,
  },
  debugButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
  },
  debugButtonText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#94A3B8',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    paddingVertical: 12,
    backgroundColor: '#EF4444',
    borderRadius: 8,
  },
  clearAllButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});