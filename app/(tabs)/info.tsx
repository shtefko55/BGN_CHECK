import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Info, Euro, Shield, Phone, Mail, ExternalLink, TriangleAlert as AlertTriangle, Scan } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function InfoScreen() {
  const openUrl = (url: string) => {
    Linking.openURL(url);
  };

  const InfoCard = ({ 
    icon, 
    title, 
    description, 
    colors 
  }: { 
    icon: React.ReactNode;
    title: string;
    description: string;
    colors: string[];
  }) => (
    <LinearGradient colors={colors} style={styles.infoCard}>
      <View style={styles.cardIcon}>{icon}</View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </LinearGradient>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Info size={32} color="#2563EB" />
          <Text style={styles.headerTitle}>Информация</Text>
          <Text style={styles.headerSubtitle}>
            За валутното превалутиране в България
          </Text>
        </View>

        {/* Exchange Rate Info */}
        <InfoCard
          icon={<Euro size={32} color="#FFFFFF" />}
          title="Официален курс"
          description="Фиксираният курс на българския лев към еврото е 1.95583 лв за 1 евро, определен от БНБ."
          colors={['#2563EB', '#1D4ED8']}
        />

        <InfoCard
          icon={<Shield size={32} color="#FFFFFF" />}
          title="Защита на потребителите"
          description="Магазините са задължени да показват цени в BGN и EUR. Проверявайте превалутирането за защита от злоупотреби."
          colors={['#10B981', '#059669']}
        />

        <InfoCard
          icon={<Scan size={32} color="#FFFFFF" />}
          title="PaddleOCR Технология"
          description="Приложението използва собствен PaddleOCR сървър за разпознаване на текст от ценови етикети с висока точност и бърза обработка."
          colors={['#8B5CF6', '#7C3AED']}
        />

        <InfoCard
          icon={<AlertTriangle size={32} color="#FFFFFF" />}
          title="Как да докладвате"
          description="При открити нарушения се обърнете към КЗП или БНБ за защита на правата си като потребител."
          colors={['#F59E0B', '#D97706']}
        />

        {/* Legal Information */}
        <View style={styles.legalSection}>
          <Text style={styles.sectionTitle}>Правна информация</Text>
          
          <View style={styles.legalItem}>
            <Text style={styles.legalTitle}>Закон за валутното борду</Text>
            <Text style={styles.legalText}>
              Българският лев е фиксиран към еврото с курс 1.95583. Този курс не се променя и е гарантиран от държавата.
            </Text>
          </View>

          <View style={styles.legalItem}>
            <Text style={styles.legalTitle}>Закон за защита на потребителите</Text>
            <Text style={styles.legalText}>
              Търговците са длъжни да показват цените ясно и точно в двете валути, без да заблуждават потребителите.
            </Text>
          </View>

          <View style={styles.legalItem}>
            <Text style={styles.legalTitle}>Наредба на БНБ</Text>
            <Text style={styles.legalText}>
              Всички цени трябва да се превалутират с официалния курс 1.95583, без добавяне на допълнителни такси или комисиони.
            </Text>
          </View>
        </View>

        {/* Technical Information */}
        <View style={styles.techSection}>
          <Text style={styles.sectionTitle}>Техническа информация</Text>
          
          <View style={styles.techItem}>
            <Text style={styles.techTitle}>PaddleOCR Сървър</Text>
            <Text style={styles.techText}>
              Приложението използва собствен PaddleOCR сървър, хостван на VPS за високоточно разпознаване на текст. 
              PaddleOCR е модерна библиотека с отлична поддръжка на български и английски език.
            </Text>
          </View>

          <View style={styles.techItem}>
            <Text style={styles.techTitle}>Възможности на PaddleOCR</Text>
            <Text style={styles.techText}>
              • Локална обработка с висока скорост{'\n'}
              • Автоматично откриване на посоката на текста{'\n'}
              • Поддръжка на множество езици едновременно{'\n'}
              • Висока точност при различни шрифтове и размери{'\n'}
              • Без ограничения за брой заявки{'\n'}
              • Пълен контрол върху данните
            </Text>
          </View>

          <View style={styles.techItem}>
            <Text style={styles.techTitle}>Сървърни детайли</Text>
            <Text style={styles.techText}>
              • API Endpoint: http://69.62.115.146:8868/predict/ocr_system{'\n'}
              • Health Check: http://69.62.115.146:8868/{'\n'}
              • Метод: POST с JSON payload{'\n'}
              • Поддържани формати: JPG, PNG, GIF, BMP{'\n'}
              • Максимален размер: 5MB
            </Text>
          </View>

          <View style={styles.techItem}>
            <Text style={styles.techTitle}>Поддържани формати</Text>
            <Text style={styles.techText}>
              • Цени в лева: "12.50 лв", "лв 12.50", "BGN 12.50"{'\n'}
              • Цени в евро: "6.39 €", "€ 6.39", "EUR 6.39"{'\n'}
              • Поддържа както точка, така и запетая като десетичен разделител
            </Text>
          </View>

          <View style={styles.techItem}>
            <Text style={styles.techTitle}>Точност на разпознаването</Text>
            <Text style={styles.techText}>
              За най-добри резултати използвайте ясни, добре осветени снимки с контрастен фон. 
              Избягвайте размазани или наклонени изображения. PaddleOCR автоматично корригира ъгъла на текста.
            </Text>
          </View>

          <View style={styles.techItem}>
            <Text style={styles.techTitle}>Предимства на собствения сървър</Text>
            <Text style={styles.techText}>
              • Без ограничения за API заявки{'\n'}
              • По-бърза обработка без мрежови забавяния{'\n'}
              • Пълен контрол върху данните и поверителността{'\n'}
              • Възможност за персонализиране и оптимизация{'\n'}
              • Независимост от външни услуги
            </Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Контакти за сигнали</Text>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => openUrl('tel:0700 17 001')}
          >
            <Phone size={20} color="#2563EB" />
            <View style={styles.contactText}>
              <Text style={styles.contactTitle}>КЗП - Комисия за защита на потребителите</Text>
              <Text style={styles.contactDescription}>0700 17 001</Text>
            </View>
            <ExternalLink size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => openUrl('https://bnb.bg')}
          >
            <Mail size={20} color="#2563EB" />
            <View style={styles.contactText}>
              <Text style={styles.contactTitle}>Българска народна банка</Text>
              <Text style={styles.contactDescription}>bnb.bg</Text>
            </View>
            <ExternalLink size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* How to use */}
        <View style={styles.howToSection}>
          <Text style={styles.sectionTitle}>Как да използвате приложението</Text>
          
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Сканирайте етикета</Text>
              <Text style={styles.stepText}>
                Използвайте камерата за сканиране на ценовия етикет в магазина. Поставете етикета в рамката и натиснете бутона за сканиране.
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Проверете резултата</Text>
              <Text style={styles.stepText}>
                Приложението автоматично ще провери дали превалутирането е правилно с нулева толерантност
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Запазете историята</Text>
              <Text style={styles.stepText}>
                Всички сканирания се запазват за бъдеща справка и докладване с детайлна статистика
              </Text>
            </View>
          </View>
        </View>

        {/* App info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoTitle}>За приложението</Text>
          <Text style={styles.appInfoText}>
            Това приложение е създадено за защита на потребителските права в България. 
            То помага за проверка на правилното превалутиране от лева в евро според официалния курс, 
            използвайки собствен PaddleOCR сървър за автоматично разпознаване на цени.
          </Text>
          <Text style={styles.appInfoText}>
            Приложението използва PaddleOCR технология, хостната на собствен VPS сървър за 
            високоточно разпознаване на текст с пълен контрол върху данните и без ограничения.
          </Text>
          <Text style={styles.appInfoVersion}>Версия 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flex: 1,
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
  infoCard: {
    margin: 20,
    marginBottom: 10,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  cardIcon: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 20,
  },
  legalSection: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
  },
  techSection: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  legalItem: {
    marginBottom: 16,
  },
  techItem: {
    marginBottom: 16,
  },
  legalTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 6,
  },
  techTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 6,
  },
  legalText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 20,
  },
  techText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 20,
  },
  contactSection: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  contactText: {
    flex: 1,
    marginLeft: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  contactDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 2,
  },
  howToSection: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 20,
  },
  appInfo: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 20,
    marginBottom: 40,
  },
  appInfoTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  appInfoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  appInfoVersion: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
  },
});