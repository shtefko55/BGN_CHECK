import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calculator, ArrowRightLeft, Euro, Banknote } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const EXCHANGE_RATE = 1.95583;

export default function CalculatorScreen() {
  const [bgnAmount, setBgnAmount] = useState('');
  const [eurAmount, setEurAmount] = useState('');
  const [activeInput, setActiveInput] = useState<'bgn' | 'eur'>('bgn');

  const calculateFromBGN = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      const eurValue = numValue / EXCHANGE_RATE;
      setEurAmount(eurValue.toFixed(2));
    } else {
      setEurAmount('');
    }
  };

  const calculateFromEUR = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      const bgnValue = numValue * EXCHANGE_RATE;
      setBgnAmount(bgnValue.toFixed(2));
    } else {
      setBgnAmount('');
    }
  };

  const onBgnChange = (value: string) => {
    // Prevent scientific notation and limit input
    if (value.includes('e') || value.includes('E')) return;
    if (value.length > 10) return; // Limit input length
    
    setBgnAmount(value);
    setActiveInput('bgn');
    calculateFromBGN(value);
  };

  const onEurChange = (value: string) => {
    // Prevent scientific notation and limit input
    if (value.includes('e') || value.includes('E')) return;
    if (value.length > 10) return; // Limit input length
    
    setEurAmount(value);
    setActiveInput('eur');
    calculateFromEUR(value);
  };

  const swapValues = () => {
    const tempBgn = bgnAmount;
    const tempEur = eurAmount;
    
    setBgnAmount(tempEur);
    setEurAmount(tempBgn);
    
    if (activeInput === 'bgn') {
      calculateFromBGN(tempEur);
    } else {
      calculateFromEUR(tempBgn);
    }
  };

  const clearAll = () => {
    setBgnAmount('');
    setEurAmount('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Calculator size={32} color="#2563EB" />
        <Text style={styles.headerTitle}>Валутен калкулатор</Text>
        <Text style={styles.headerSubtitle}>
          Официален курс: 1 EUR = {EXCHANGE_RATE} BGN
        </Text>
      </View>

      <View style={styles.content}>
        {/* BGN Input */}
        <View style={styles.currencyContainer}>
          <LinearGradient
            colors={['#059669', '#10B981']}
            style={styles.currencyHeader}
          >
            <Banknote size={24} color="#FFFFFF" />
            <Text style={styles.currencyTitle}>Български лева (BGN)</Text>
          </LinearGradient>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>лв</Text>
            <TextInput
              style={[
                styles.input,
                activeInput === 'bgn' && styles.inputActive
              ]}
              value={bgnAmount}
              onChangeText={onBgnChange}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#94A3B8"
              maxLength={10}
              selectTextOnFocus={true}
            />
          </View>
        </View>

        {/* Swap Button */}
        <TouchableOpacity style={styles.swapButton} onPress={swapValues}>
          <ArrowRightLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* EUR Input */}
        <View style={styles.currencyContainer}>
          <LinearGradient
            colors={['#2563EB', '#1D4ED8']}
            style={styles.currencyHeader}
          >
            <Euro size={24} color="#FFFFFF" />
            <Text style={styles.currencyTitle}>Евро (EUR)</Text>
          </LinearGradient>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>€</Text>
            <TextInput
              style={[
                styles.input,
                activeInput === 'eur' && styles.inputActive
              ]}
              value={eurAmount}
              onChangeText={onEurChange}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#94A3B8"
              maxLength={10}
              selectTextOnFocus={true}
            />
          </View>
        </View>

        {/* Quick amounts */}
        <View style={styles.quickAmounts}>
          <Text style={styles.quickAmountsTitle}>Бързи суми:</Text>
          <View style={styles.quickAmountsGrid}>
            {[1, 5, 10, 20, 50, 100].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={styles.quickAmountButton}
                onPress={() => onEurChange(amount.toString())}
              >
                <Text style={styles.quickAmountText}>{amount}€</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Clear button */}
        <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
          <Text style={styles.clearButtonText}>Изчисти всичко</Text>
        </TouchableOpacity>

        {/* Rate info */}
        <View style={styles.rateInfo}>
          <Text style={styles.rateInfoTitle}>Информация за курса</Text>
          <Text style={styles.rateInfoText}>
            Фиксираният курс на българския лев към еврото е определен от БНБ на 1.95583 лв за 1 евро.
          </Text>
          <Text style={styles.rateInfoText}>
            Този курс е в сила от въвеждането на еврото в България.
          </Text>
        </View>
      </View>
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
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  currencyContainer: {
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  currencyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    minHeight: 80,
  },
  inputLabel: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#64748B',
    marginRight: 12,
    minWidth: 35,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
    paddingHorizontal: 8,
    textAlign: 'left',
    minHeight: 40,
  },
  inputActive: {
    borderBottomColor: '#2563EB',
  },
  swapButton: {
    alignSelf: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  quickAmounts: {
    marginTop: 20,
  },
  quickAmountsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 12,
  },
  quickAmountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickAmountButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
  },
  quickAmountText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#475569',
  },
  clearButton: {
    marginTop: 24,
    paddingVertical: 12,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  rateInfo: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  rateInfoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 8,
  },
  rateInfoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 4,
  },
});