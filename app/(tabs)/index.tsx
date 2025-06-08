import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Zap, CircleCheck as CheckCircle, Circle as XCircle, ScanLine, Focus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  interpolate,
  Extrapolate,
  runOnJS
} from 'react-native-reanimated';
import { historyService } from '@/utils/historyService';
import { ocrService } from '@/utils/ocrService';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');
const EXCHANGE_RATE = 1.95583;
const MIN_SCAN_INTERVAL = 2000; // Minimum 2 seconds between scans

interface ScanResult {
  bgnPrice: number;
  eurPrice: number;
  isCorrect: boolean;
  timestamp: Date;
  confidence?: number;
  rawText?: string;
}

export default function ScannerScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTabFocused, setIsTabFocused] = useState(true);
  const [lastScanTime, setLastScanTime] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  
  // Animations
  const scanLineY = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const focusOpacity = useSharedValue(0);
  const resultOpacity = useSharedValue(0);

  // Function declaration (hoisted) instead of const arrow function
  async function performScan() {
    console.log('=== MANUAL SCAN TRIGGERED ===');
    console.log('Current state:', { 
      isScanning, 
      isCameraReady, 
      isTabFocused, 
      cameraRef: !!cameraRef.current,
      permission: permission?.granted
    });

    // Check minimum interval between scans
    const now = Date.now();
    if (now - lastScanTime < MIN_SCAN_INTERVAL) {
      console.log('❌ Scan too soon, minimum interval not met');
      Alert.alert('Моля, изчакайте', 'Моля, изчакайте поне 2 секунди между сканиранията.');
      return;
    }

    // Early returns with detailed logging
    if (isScanning) {
      console.log('❌ Already scanning, ignoring request');
      return;
    }

    if (!isCameraReady) {
      console.log('❌ Camera not ready');
      Alert.alert('Грешка', 'Камерата все още се зарежда. Моля, изчакайте.');
      return;
    }

    if (!isTabFocused) {
      console.log('❌ Tab not focused');
      return;
    }

    if (!cameraRef.current) {
      console.log('❌ Camera ref not available');
      Alert.alert('Грешка', 'Камерата не е готова. Моля, опитайте отново.');
      return;
    }

    if (!permission?.granted) {
      console.log('❌ Camera permission not granted');
      Alert.alert('Грешка', 'Няма разрешение за достъп до камерата.');
      return;
    }

    // Update last scan time
    setLastScanTime(now);
    
    console.log('✅ All checks passed, starting scan process...');
    setIsScanning(true);
    
    // Focus animation
    focusOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 800 })
    );
    
    try {
      console.log('📸 Starting image capture...');
      
      // Take picture with optimized settings for OCR
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9, // Higher quality for better OCR
        base64: true, // Get base64 directly
        skipProcessing: false,
        exif: false,
      });

      console.log('📸 Photo capture result:', {
        hasUri: !!photo?.uri,
        hasBase64: !!photo?.base64,
        width: photo?.width,
        height: photo?.height,
        base64Length: photo?.base64?.length || 0
      });

      if (!photo?.base64) {
        throw new Error('Failed to capture image - no base64 data returned');
      }

      // Validate base64 data
      if (photo.base64.length < 1000) {
        throw new Error('Captured image data is too small - please try again');
      }

      console.log('🔍 Starting PaddleOCR analysis...');
      console.log('Base64 data length:', photo.base64.length);
      
      // Perform OCR with PaddleOCR using base64 data directly
      const ocrResult = await ocrService.recognizeTextFromBase64(photo.base64);
      
      console.log('🔍 PaddleOCR completed:', {
        textLength: ocrResult.text?.length || 0,
        confidence: ocrResult.confidence,
        prices: ocrResult.prices
      });
      
      // Extract prices from OCR result
      const { bgn: bgnPrice, eur: eurPrice } = ocrResult.prices;
      
      if (!bgnPrice && !eurPrice) {
        throw new Error('No prices detected in the image');
      }

      // If we only have one price, try to calculate the other
      let finalBgnPrice = bgnPrice;
      let finalEurPrice = eurPrice;
      
      if (bgnPrice && !eurPrice) {
        finalEurPrice = bgnPrice / EXCHANGE_RATE;
        console.log('💰 Calculated EUR from BGN:', finalEurPrice);
      } else if (eurPrice && !bgnPrice) {
        finalBgnPrice = eurPrice * EXCHANGE_RATE;
        console.log('💰 Calculated BGN from EUR:', finalBgnPrice);
      }

      if (!finalBgnPrice || !finalEurPrice) {
        throw new Error('Unable to determine both prices');
      }

      // Check if conversion is correct with ZERO tolerance
      const expectedEurPrice = finalBgnPrice / EXCHANGE_RATE;
      const tolerance = 0; // Zero tolerance - must be exactly correct
      const isCorrect = Math.abs(finalEurPrice - expectedEurPrice) <= tolerance;
      
      console.log('✅ Price validation:', {
        bgnPrice: finalBgnPrice,
        eurPrice: finalEurPrice,
        expectedEurPrice,
        isCorrect
      });
      
      const result: ScanResult = {
        bgnPrice: finalBgnPrice,
        eurPrice: finalEurPrice,
        isCorrect,
        timestamp: new Date(),
        confidence: ocrResult.confidence,
        rawText: ocrResult.text
      };
      
      console.log('📊 Final scan result:', result);
      
      setLastScanResult(result);
      
      // Save to history
      await historyService.addToHistory(result);
      console.log('💾 Saved to history');
      
    } catch (error) {
      console.error('❌ Scan error:', error);
      
      let errorMessage = 'Неуспешно сканиране';
      if (error instanceof Error) {
        if (error.message.includes('No prices detected')) {
          errorMessage = 'Не са открити цени в изображението. Моля, опитайте отново с по-ясна снимка.';
        } else if (error.message.includes('PaddleOCR') || error.message.includes('API')) {
          errorMessage = 'OCR услугата не е достъпна. Моля, проверете връзката с интернет.';
        } else if (error.message.includes('No text detected')) {
          errorMessage = 'Не е открит текст в изображението. Моля, уверете се, че етикетът е ясно видим.';
        } else if (error.message.includes('Failed to capture image')) {
          errorMessage = 'Неуспешно заснемане на снимка. Моля, опитайте отново.';
        } else if (error.message.includes('no base64 data')) {
          errorMessage = 'Камерата не успя да направи снимка. Моля, опитайте отново.';
        } else if (error.message.includes('too small')) {
          errorMessage = 'Заснетото изображение е твърде малко. Моля, опитайте отново.';
        } else if (error.message.includes('Service unavailable') || error.message.includes('Network error')) {
          errorMessage = 'OCR услугата не е достъпна. Моля, проверете връзката с интернет.';
        } else if (error.message.includes('Invalid API key')) {
          errorMessage = 'Невалиден API ключ. Моля, проверете конфигурацията.';
        }
      }
      
      Alert.alert(
        'Грешка при сканиране',
        errorMessage,
        [{ text: 'OK', onPress: () => setIsScanning(false) }]
      );
    } finally {
      console.log('🏁 Scan process completed, setting isScanning to false');
      setIsScanning(false);
    }
  }

  // Handle tab focus changes
  useFocusEffect(
    React.useCallback(() => {
      console.log('Scanner tab focused');
      setIsTabFocused(true);
      setIsScanning(false);
      setLastScanResult(null);
      setLastScanTime(0);
      
      // Small delay to ensure camera mounts properly
      const timer = setTimeout(() => {
        console.log('Setting camera ready after delay');
        setIsCameraReady(true);
      }, 1000); // Increased delay

      return () => {
        console.log('Scanner tab unfocused');
        setIsTabFocused(false);
        setIsCameraReady(false);
        setIsScanning(false);
        clearTimeout(timer);
      };
    }, [])
  );
  
  useEffect(() => {
    if (isCameraReady && isTabFocused) {
      console.log('Starting animations - camera ready and tab focused');
      // Continuous scan line animation
      scanLineY.value = withRepeat(
        withTiming(1, { duration: 3000 }),
        -1,
        true
      );
      
      // Subtle pulse animation for scan area
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 2000 }),
          withTiming(1, { duration: 2000 })
        ),
        -1,
        true
      );
    }
  }, [isCameraReady, isTabFocused]);

  // Auto-hide result after 5 seconds
  useEffect(() => {
    if (lastScanResult) {
      resultOpacity.value = withTiming(1, { duration: 300 });
      
      const timer = setTimeout(() => {
        resultOpacity.value = withTiming(0, { duration: 300 }, () => {
          runOnJS(setLastScanResult)(null);
        });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [lastScanResult]);

  const animatedScanLineStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: interpolate(scanLineY.value, [0, 1], [0, 280]) }],
      opacity: interpolate(scanLineY.value, [0, 0.5, 1], [0.3, 1, 0.3]),
    };
  });

  const animatedScanAreaStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
    };
  });

  const animatedFocusStyle = useAnimatedStyle(() => {
    return {
      opacity: focusOpacity.value,
    };
  });

  const animatedResultStyle = useAnimatedStyle(() => {
    return {
      opacity: resultOpacity.value,
      transform: [{ translateY: interpolate(resultOpacity.value, [0, 1], [20, 0]) }],
    };
  });

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.permissionContainer}
        >
          <View style={styles.permissionContent}>
            <View style={styles.permissionIconContainer}>
              <Camera size={64} color="#FFFFFF" strokeWidth={1.5} />
            </View>
            <Text style={styles.permissionTitle}>Достъп до камерата</Text>
            <Text style={styles.permissionText}>
              За да сканирате ценови етикети, необходим е достъп до камерата на устройството
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Разреши достъп</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const onCameraReady = () => {
    console.log('📷 Camera onReady callback triggered');
    // Camera is ready
    if (!isCameraReady) {
      setIsCameraReady(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>PaddleOCR скенер</Text>
          <Text style={styles.headerSubtitle}>
            Официален курс: 1 EUR = {EXCHANGE_RATE} BGN
          </Text>
          <View style={styles.scanStatus}>
            <View style={[styles.statusIndicator, { backgroundColor: isCameraReady ? '#10B981' : '#EF4444' }]} />
            <Text style={styles.statusText}>
              {isCameraReady ? 'Готов за сканиране' : 'Зареждане на камерата...'}
            </Text>
          </View>
        </View>
      </View>

      {/* Camera Container */}
      <View style={styles.cameraContainer}>
        {isTabFocused && (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
            onCameraReady={onCameraReady}
          >
            {/* Scan Area Overlay */}
            {isCameraReady && (
              <View style={styles.scanOverlay}>
                {/* Scan Frame */}
                <Animated.View style={[styles.scanFrame, animatedScanAreaStyle]}>
                  {/* Corner indicators */}
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                  
                  {/* Animated scan line */}
                  <Animated.View style={[styles.scanLineContainer, animatedScanLineStyle]}>
                    <LinearGradient
                      colors={['transparent', '#00D4FF', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.scanLine}
                    />
                  </Animated.View>

                  {/* Focus indicator */}
                  <Animated.View style={[styles.focusIndicator, animatedFocusStyle]}>
                    <Focus size={40} color="#00D4FF" strokeWidth={2} />
                  </Animated.View>

                  {/* Scanning indicator */}
                  {isScanning && (
                    <View style={styles.scanningIndicator}>
                      <Animated.View style={{ transform: [{ rotate: '45deg' }] }}>
                        <Zap size={32} color="#00D4FF" strokeWidth={2} />
                      </Animated.View>
                    </View>
                  )}
                </Animated.View>

                {/* Instruction text */}
                <View style={styles.instructionContainer}>
                  <Text style={styles.instructionText}>
                    Поставете ценовия етикет в рамката и натиснете бутона за сканиране
                  </Text>
                </View>
              </View>
            )}

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
              <View style={styles.controlsRow}>
                {/* Camera flip button */}
                <TouchableOpacity 
                  style={styles.flipButton} 
                  onPress={() => setFacing(current => (current === 'back' ? 'front' : 'back'))}
                  activeOpacity={0.8}
                >
                  <ScanLine size={20} color="#FFFFFF" strokeWidth={2} />
                </TouchableOpacity>

                {/* Manual scan button */}
                <TouchableOpacity 
                  style={[
                    styles.scanButton, 
                    isScanning && styles.scanButtonActive,
                    (!isCameraReady || !isTabFocused) && styles.scanButtonDisabled
                  ]} 
                  onPress={performScan}
                  disabled={isScanning || !isCameraReady || !isTabFocused}
                  activeOpacity={0.8}
                >
                  <View style={styles.scanButtonInner}>
                    {isScanning ? (
                      <Animated.View style={{ transform: [{ rotate: '45deg' }] }}>
                        <Zap size={28} color="#FFFFFF" strokeWidth={2} />
                      </Animated.View>
                    ) : (
                      <Camera size={28} color="#FFFFFF" strokeWidth={2} />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Placeholder for symmetry */}
                <View style={styles.flipButton} />
              </View>
            </View>
          </CameraView>
        )}

        {/* Loading state when camera is not ready */}
        {(!isCameraReady || !isTabFocused) && (
          <View style={styles.loadingContainer}>
            <Camera size={64} color="#FFFFFF" strokeWidth={1.5} />
            <Text style={styles.loadingText}>
              {!isTabFocused ? 'Активиране на камерата...' : 'Зареждане на камерата...'}
            </Text>
          </View>
        )}
      </View>

      {/* Result Display - Auto-hide after 5 seconds */}
      {lastScanResult && (
        <Animated.View style={[styles.resultContainer, animatedResultStyle]}>
          <LinearGradient
            colors={lastScanResult.isCorrect 
              ? ['#00D4FF', '#0099CC'] 
              : ['#FF6B6B', '#E55555']
            }
            style={styles.resultGradient}
          >
            <View style={styles.resultContent}>
              <View style={styles.resultIcon}>
                {lastScanResult.isCorrect ? (
                  <CheckCircle size={24} color="#FFFFFF" strokeWidth={2} />
                ) : (
                  <XCircle size={24} color="#FFFFFF" strokeWidth={2} />
                )}
              </View>
              
              <View style={styles.resultTextContainer}>
                <Text style={styles.resultTitle}>
                  {lastScanResult.isCorrect ? 'Превалутирането е точно' : 'Неточно превалутиране'}
                </Text>
                <View style={styles.resultDetails}>
                  <Text style={styles.resultPrice}>
                    {lastScanResult.bgnPrice.toFixed(2)} лв → {(lastScanResult.bgnPrice / EXCHANGE_RATE).toFixed(2)} €
                  </Text>
                  <Text style={styles.resultLabel}>
                    Етикет: {lastScanResult.eurPrice.toFixed(2)} €
                  </Text>
                  {lastScanResult.confidence && (
                    <Text style={styles.resultConfidence}>
                      Точност: {Math.round(lastScanResult.confidence)}%
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  scanStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  permissionButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#667eea',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    marginTop: 16,
  },
  scanOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  scanFrame: {
    width: 280,
    height: 280,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#00D4FF',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  scanLineContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    height: 2,
  },
  scanLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  focusIndicator: {
    position: 'absolute',
  },
  scanningIndicator: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    borderRadius: 30,
    padding: 15,
  },
  instructionContainer: {
    position: 'absolute',
    bottom: -80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backdropFilter: 'blur(10px)',
  },
  bottomControls: {
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scanButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00D4FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  scanButtonActive: {
    backgroundColor: '#0099CC',
    shadowOpacity: 0.8,
  },
  scanButtonDisabled: {
    backgroundColor: '#666666',
    shadowOpacity: 0.2,
  },
  scanButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  resultContainer: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  resultGradient: {
    padding: 20,
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultIcon: {
    marginRight: 16,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  resultDetails: {
    gap: 4,
  },
  resultPrice: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  resultLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  resultConfidence: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
  },
});