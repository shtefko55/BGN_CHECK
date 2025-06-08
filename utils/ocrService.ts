interface PaddleOCRResponse {
  status: string;
  results?: Array<{
    text: string;
    confidence: number;
    bbox?: number[];
  }>;
  error?: string;
  processing_time?: number;
}

interface OCRResult {
  text: string;
  confidence: number;
  prices: {
    bgn?: number;
    eur?: number;
  };
}

class OCRService {
  private apiUrl: string = 'http://69.62.115.146:8868/predict/ocr_system';
  private healthUrl: string = 'http://69.62.115.146:8868/';
  private isServiceAvailable: boolean = true;
  private lastServiceCheck: number = 0;
  private serviceCheckInterval: number = 2 * 60 * 1000; // 2 minutes
  private readonly EXCHANGE_RATE = 1.95583;

  constructor() {
    console.log('✅ OCR Service initialized with PaddleOCR API');
    console.log('API Endpoint:', this.apiUrl);
  }

  async recognizeText(imageUri: string): Promise<OCRResult> {
    try {
      console.log('Converting image URI to base64...');
      const base64Image = await this.convertImageToBase64(imageUri);
      return await this.recognizeTextFromBase64(base64Image);
    } catch (error) {
      console.error('Error converting image URI:', error);
      return this.fallbackTextRecognition('Image conversion error');
    }
  }

  async recognizeTextFromBase64(base64Image: string): Promise<OCRResult> {
    try {
      console.log('Starting PaddleOCR text recognition...');
      console.log('Using endpoint:', this.apiUrl);
      console.log('Base64 image length:', base64Image.length);
      
      // Validate base64 input
      if (!base64Image || base64Image.length < 1000) {
        console.error('❌ Invalid or too small base64 image data');
        return this.fallbackTextRecognition('Invalid image data');
      }
      
      // Check service health if needed
      if (Date.now() - this.lastServiceCheck > this.serviceCheckInterval) {
        await this.checkServiceHealth();
      }
      
      if (!this.isServiceAvailable) {
        console.log('PaddleOCR service is not available, using fallback method');
        return this.fallbackTextRecognition('Service unavailable');
      }
      
      console.log('Using PaddleOCR API for text recognition...');
      
      // Prepare the request payload for PaddleOCR with proper image format
      const requestBody = {
        image: base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`,
        language: 'en', // Use English for better number recognition
        confidence_threshold: 0.3 // Lower threshold for better detection
      };

      console.log('Making POST request to PaddleOCR API...');
      console.log('Request body keys:', Object.keys(requestBody));
      console.log('Image data format:', requestBody.image.substring(0, 30) + '...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'BGN-EUR-Checker/1.0',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('PaddleOCR API response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PaddleOCR API error:', response.status, errorText);
        
        // Parse error response if it's JSON
        let errorData;
        try {
          errorData = JSON.parse(errorText);
          console.log('Parsed error data:', errorData);
        } catch (e) {
          console.log('Error response is not JSON:', errorText);
        }
        
        // Check for specific error types
        if (response.status >= 500) {
          console.error('❌ PaddleOCR server error. Service may be temporarily unavailable');
          this.isServiceAvailable = false;
          return this.fallbackTextRecognition('Server error');
        } else if (response.status === 413) {
          console.error('❌ Image too large for PaddleOCR API');
          return this.fallbackTextRecognition('Image too large');
        } else if (response.status === 400) {
          console.error('❌ Bad request - check image format or request structure');
          const errorMsg = errorData?.msg || errorData?.message || 'Bad request format';
          return this.fallbackTextRecognition(`Bad request: ${errorMsg}`);
        } else if (response.status === 404) {
          console.error('❌ API endpoint not found - check URL');
          return this.fallbackTextRecognition('API endpoint not found');
        }
        
        return this.fallbackTextRecognition(`HTTP ${response.status}: ${errorText}`);
      }

      const responseText = await response.text();
      console.log('PaddleOCR API raw response length:', responseText.length);
      console.log('Response preview:', responseText.substring(0, 500));

      let data: PaddleOCRResponse;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse PaddleOCR API response:', parseError);
        console.log('Full response:', responseText);
        return this.fallbackTextRecognition('Invalid response format');
      }

      console.log('PaddleOCR API response:', {
        status: data.status,
        resultsCount: data.results?.length || 0,
        processingTime: data.processing_time,
        hasError: !!data.error
      });

      // Check for API errors
      if (data.status !== 'success' || !data.results) {
        const errorMsg = data.error || 'Unknown PaddleOCR error';
        console.error('PaddleOCR processing error:', errorMsg);
        return this.fallbackTextRecognition(errorMsg);
      }

      // Extract text from response
      let fullText = '';
      let totalConfidence = 0;
      let textCount = 0;
      
      if (data.results && data.results.length > 0) {
        console.log('Processing OCR results:', data.results.length, 'items');
        
        // Combine all detected text
        const textParts = data.results.map((result, index) => {
          console.log(`Result ${index}:`, {
            text: result.text,
            confidence: result.confidence,
            bbox: result.bbox
          });
          
          if (result.text && result.text.trim()) {
            totalConfidence += result.confidence || 0;
            textCount++;
            return result.text.trim();
          }
          return '';
        }).filter(text => text.length > 0);
        
        fullText = textParts.join('\n');
        console.log('Combined text:', fullText);
      }

      if (!fullText || fullText.trim().length === 0) {
        console.log('No text detected by PaddleOCR');
        return this.fallbackTextRecognition('No text detected');
      }

      console.log('Detected text:', fullText.substring(0, 100) + (fullText.length > 100 ? '...' : ''));
      console.log('Text segments:', textCount);
      
      // Extract prices using mathematical relationship analysis
      const prices = this.extractPricesUsingMath(fullText);
      console.log('Extracted prices using mathematical analysis:', prices);
      
      // Calculate confidence based on OCR confidence and price detection
      const avgOcrConfidence = textCount > 0 ? (totalConfidence / textCount) * 100 : 0;
      const confidence = this.calculateConfidence(prices, fullText, avgOcrConfidence);

      console.log('Final OCR result:', {
        textLength: fullText.length,
        confidence,
        prices,
        avgOcrConfidence
      });

      return {
        text: fullText,
        confidence,
        prices
      };

    } catch (error) {
      console.error('PaddleOCR Service Error:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('❌ OCR request timed out');
          return this.fallbackTextRecognition('Request timeout');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
          console.error('❌ Network error - check internet connection');
          this.isServiceAvailable = false;
          return this.fallbackTextRecognition('Network error');
        } else if (error.message.includes('TypeError')) {
          console.error('❌ Request format error');
          return this.fallbackTextRecognition('Request format error');
        }
      }
      
      return this.fallbackTextRecognition('Service error');
    }
  }

  private async checkServiceHealth(): Promise<void> {
    try {
      console.log('Checking PaddleOCR service health...');
      console.log('Health URL:', this.healthUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(this.healthUrl, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      console.log('Health check response status:', response.status);
      
      if (response.ok) {
        console.log('✅ PaddleOCR service is healthy');
        this.isServiceAvailable = true;
      } else {
        console.log('❌ PaddleOCR service health check failed:', response.status);
        this.isServiceAvailable = false;
      }
      
      this.lastServiceCheck = Date.now();
      
    } catch (error) {
      console.error('PaddleOCR service health check error:', error);
      this.isServiceAvailable = false;
      this.lastServiceCheck = Date.now();
    }
  }

  private async fallbackTextRecognition(reason: string): Promise<OCRResult> {
    console.log('Using fallback text recognition method. Reason:', reason);
    
    let fallbackText = '';
    let suggestion = '';
    
    switch (reason) {
      case 'Invalid image data':
        fallbackText = 'Invalid image data.';
        suggestion = 'The captured image data is invalid or too small. Please try taking a new photo with better lighting.';
        break;
      case 'Service unavailable':
        fallbackText = 'PaddleOCR service is temporarily unavailable.';
        suggestion = 'The OCR service on the VPS may be down. Please check if the service is running at http://69.62.115.146:8868/';
        break;
      case 'Network error':
        fallbackText = 'Network connection error.';
        suggestion = 'Please check your internet connection and ensure the VPS is accessible.';
        break;
      case 'Request timeout':
        fallbackText = 'Request timed out.';
        suggestion = 'The PaddleOCR service is slow. Please try again with a smaller or clearer image.';
        break;
      case 'Image too large':
        fallbackText = 'Image file is too large.';
        suggestion = 'Please try with a smaller image. The current image may exceed the server limits.';
        break;
      case 'API endpoint not found':
        fallbackText = 'API endpoint not found.';
        suggestion = 'The PaddleOCR API endpoint may be incorrect. Please verify the server is running at http://69.62.115.146:8868/predict/ocr_system';
        break;
      case 'Request format error':
        fallbackText = 'Request format error.';
        suggestion = 'There was an error formatting the request. Please try again with a different image.';
        break;
      case 'Image conversion error':
        fallbackText = 'Failed to process image.';
        suggestion = 'There was an error converting the image. Please try taking a new photo.';
        break;
      case 'No text detected':
        fallbackText = 'No text found in image.';
        suggestion = 'Please ensure the price label is clearly visible and well-lit in the image.';
        break;
      case 'Server error':
        fallbackText = 'PaddleOCR server error.';
        suggestion = 'The OCR service encountered an error. Please check the server logs or try again later.';
        break;
      default:
        if (reason.includes('Bad request')) {
          fallbackText = 'Bad request to PaddleOCR API.';
          suggestion = 'The image format or request structure may be incorrect. Please try with a different image.';
        } else {
          fallbackText = 'PaddleOCR service temporarily unavailable.';
          suggestion = 'Please try again later or enter prices manually using the calculator tab.';
        }
    }
    
    const fullMessage = `${fallbackText}

${suggestion}

For now, you can enter prices manually using the calculator tab.
Look for numbers followed by 'лв', 'BGN', '€', or 'EUR'
Common formats: '12.50 лв', '€6.99', 'BGN 15.00'`;
      
    return {
      text: fullMessage,
      confidence: 0,
      prices: {}
    };
  }

  private async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      console.log('Converting image to base64...');
      console.log('Image URI:', imageUri.substring(0, 50) + '...');
      
      const response = await fetch(imageUri);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('Image blob size:', Math.round(blob.size / 1024), 'KB');
      console.log('Image blob type:', blob.type);
      
      // Check if the blob is actually an image
      if (!blob.type.startsWith('image/')) {
        throw new Error(`Invalid image type: ${blob.type}. Please select a valid image file.`);
      }
      
      // Check image size (reasonable limit for network transfer)
      const maxSize = 5 * 1024 * 1024; // 5MB limit
      if (blob.size > maxSize) {
        console.log(`Image size: ${Math.round(blob.size / 1024)}KB, compressing...`);
        
        // Try to compress the image by reducing quality
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        return new Promise((resolve, reject) => {
          img.onload = () => {
            // Calculate new dimensions to reduce file size
            const maxDimension = 1600;
            let { width, height } = img;
            
            console.log('Original dimensions:', width, 'x', height);
            
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = (height * maxDimension) / width;
                width = maxDimension;
              } else {
                width = (width * maxDimension) / height;
                height = maxDimension;
              }
            }
            
            console.log('Compressed dimensions:', width, 'x', height);
            
            canvas.width = width;
            canvas.height = height;
            
            ctx?.drawImage(img, 0, 0, width, height);
            
            // Convert to base64 with reduced quality
            canvas.toBlob((compressedBlob) => {
              if (!compressedBlob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              
              const reader = new FileReader();
              reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                console.log(`Image compressed from ${Math.round(blob.size / 1024)}KB to ${Math.round(compressedBlob.size / 1024)}KB`);
                resolve(base64);
              };
              reader.onerror = () => reject(new Error('Failed to read compressed image'));
              reader.readAsDataURL(compressedBlob);
            }, 'image/jpeg', 0.8); // 80% quality
          };
          
          img.onerror = () => reject(new Error('Failed to load image for compression'));
          img.src = URL.createObjectURL(blob);
        });
      }
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          if (!base64) {
            reject(new Error('Failed to convert image to base64'));
            return;
          }
          console.log(`Image converted to base64 successfully (${Math.round(blob.size / 1024)}KB)`);
          console.log('Base64 length:', base64.length);
          resolve(base64);
        };
        reader.onerror = () => {
          reject(new Error('Failed to read image file'));
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Image conversion error:', error);
      throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract prices using mathematical relationship analysis
   * This method abstracts from currency symbols and focuses on the mathematical relationship
   * between numbers: BGN_price * 1.95583 ≈ EUR_price
   */
  private extractPricesUsingMath(text: string): { bgn?: number; eur?: number } {
    console.log('🔢 Starting mathematical price analysis...');
    console.log('Input text:', text);
    
    // Extract all decimal numbers from the text (regardless of currency symbols)
    const numberPattern = /\d+[.,]\d{1,2}/g;
    const allNumbers = text.match(numberPattern) || [];
    
    console.log('Found decimal numbers:', allNumbers);
    
    // Convert to actual numbers, handling both comma and dot as decimal separators
    const numbers = allNumbers
      .map(numStr => parseFloat(numStr.replace(',', '.')))
      .filter(num => !isNaN(num) && num > 0 && num < 10000) // Reasonable price range
      .sort((a, b) => b - a); // Sort descending to try larger numbers as BGN first
    
    console.log('Parsed and filtered numbers:', numbers);
    
    if (numbers.length < 2) {
      console.log('❌ Need at least 2 numbers to find price relationship');
      
      // If we only have one number, try to determine if it's BGN or EUR based on context
      if (numbers.length === 1) {
        const singleNumber = numbers[0];
        console.log('🔍 Analyzing single number:', singleNumber);
        
        // Check for currency context clues
        const textLower = text.toLowerCase();
        const hasBgnContext = /лв|bgn|лева|bulgarian/i.test(textLower);
        const hasEurContext = /€|eur|евро|euro/i.test(textLower);
        
        console.log('Currency context:', { hasBgnContext, hasEurContext });
        
        if (hasBgnContext && !hasEurContext) {
          // Likely BGN price, calculate EUR
          const calculatedEur = singleNumber / this.EXCHANGE_RATE;
          console.log(`✅ Single BGN price detected: ${singleNumber} лв → ${calculatedEur.toFixed(2)} €`);
          return { bgn: singleNumber, eur: parseFloat(calculatedEur.toFixed(2)) };
        } else if (hasEurContext && !hasBgnContext) {
          // Likely EUR price, calculate BGN
          const calculatedBgn = singleNumber * this.EXCHANGE_RATE;
          console.log(`✅ Single EUR price detected: ${singleNumber} € → ${calculatedBgn.toFixed(2)} лв`);
          return { bgn: parseFloat(calculatedBgn.toFixed(2)), eur: singleNumber };
        } else {
          // Ambiguous context, try both possibilities
          console.log('🤔 Ambiguous single number context, trying both possibilities');
          
          // If number is > 5, more likely to be BGN (since EUR prices are usually smaller)
          if (singleNumber > 5) {
            const calculatedEur = singleNumber / this.EXCHANGE_RATE;
            console.log(`💡 Large number (${singleNumber}) assumed to be BGN → ${calculatedEur.toFixed(2)} €`);
            return { bgn: singleNumber, eur: parseFloat(calculatedEur.toFixed(2)) };
          } else {
            const calculatedBgn = singleNumber * this.EXCHANGE_RATE;
            console.log(`💡 Small number (${singleNumber}) assumed to be EUR → ${calculatedBgn.toFixed(2)} лв`);
            return { bgn: parseFloat(calculatedBgn.toFixed(2)), eur: singleNumber };
          }
        }
      }
      
      return {};
    }
    
    console.log('🔍 Analyzing number pairs for exchange rate relationship...');
    
    // Try all combinations of numbers to find the correct BGN/EUR pair
    for (let i = 0; i < numbers.length; i++) {
      for (let j = i + 1; j < numbers.length; j++) {
        const num1 = numbers[i];
        const num2 = numbers[j];
        
        // Test if num1 is BGN and num2 is EUR
        const ratio1 = num1 / num2;
        const expectedRatio = this.EXCHANGE_RATE;
        const tolerance = 0.05; // 5% tolerance for OCR errors
        
        console.log(`Testing pair: ${num1} / ${num2} = ${ratio1.toFixed(4)} (expected: ${expectedRatio.toFixed(4)})`);
        
        if (Math.abs(ratio1 - expectedRatio) <= tolerance) {
          console.log(`✅ Found valid BGN/EUR pair: ${num1} лв = ${num2} €`);
          console.log(`   Ratio: ${ratio1.toFixed(4)}, Expected: ${expectedRatio.toFixed(4)}, Difference: ${Math.abs(ratio1 - expectedRatio).toFixed(4)}`);
          return { bgn: num1, eur: num2 };
        }
        
        // Test if num2 is BGN and num1 is EUR (reverse)
        const ratio2 = num2 / num1;
        console.log(`Testing reverse: ${num2} / ${num1} = ${ratio2.toFixed(4)} (expected: ${expectedRatio.toFixed(4)})`);
        
        if (Math.abs(ratio2 - expectedRatio) <= tolerance) {
          console.log(`✅ Found valid BGN/EUR pair (reversed): ${num2} лв = ${num1} €`);
          console.log(`   Ratio: ${ratio2.toFixed(4)}, Expected: ${expectedRatio.toFixed(4)}, Difference: ${Math.abs(ratio2 - expectedRatio).toFixed(4)}`);
          return { bgn: num2, eur: num1 };
        }
      }
    }
    
    console.log('❌ No valid BGN/EUR relationship found in number pairs');
    
    // If no mathematical relationship found, try to use context clues
    console.log('🔍 Falling back to context-based analysis...');
    
    const textLower = text.toLowerCase();
    let bgnPrice: number | undefined;
    let eurPrice: number | undefined;
    
    // Look for numbers near BGN indicators
    const bgnMatches = text.match(/(\d+[.,]\d{1,2})\s*(?:лв|bgn|лева)/gi);
    if (bgnMatches && bgnMatches.length > 0) {
      const bgnMatch = bgnMatches[0].match(/(\d+[.,]\d{1,2})/);
      if (bgnMatch) {
        bgnPrice = parseFloat(bgnMatch[1].replace(',', '.'));
        console.log(`Found BGN with context: ${bgnPrice}`);
      }
    }
    
    // Look for numbers near EUR indicators
    const eurMatches = text.match(/(\d+[.,]\d{1,2})\s*(?:€|eur|евро|euro)/gi);
    if (eurMatches && eurMatches.length > 0) {
      const eurMatch = eurMatches[0].match(/(\d+[.,]\d{1,2})/);
      if (eurMatch) {
        eurPrice = parseFloat(eurMatch[1].replace(',', '.'));
        console.log(`Found EUR with context: ${eurPrice}`);
      }
    }
    
    // Also try reverse patterns (symbol before number)
    if (!bgnPrice) {
      const bgnReverseMatches = text.match(/(?:лв|bgn)\s*(\d+[.,]\d{1,2})/gi);
      if (bgnReverseMatches && bgnReverseMatches.length > 0) {
        const bgnMatch = bgnReverseMatches[0].match(/(\d+[.,]\d{1,2})/);
        if (bgnMatch) {
          bgnPrice = parseFloat(bgnMatch[1].replace(',', '.'));
          console.log(`Found BGN with reverse context: ${bgnPrice}`);
        }
      }
    }
    
    if (!eurPrice) {
      const eurReverseMatches = text.match(/(?:€|eur)\s*(\d+[.,]\d{1,2})/gi);
      if (eurReverseMatches && eurReverseMatches.length > 0) {
        const eurMatch = eurReverseMatches[0].match(/(\d+[.,]\d{1,2})/);
        if (eurMatch) {
          eurPrice = parseFloat(eurMatch[1].replace(',', '.'));
          console.log(`Found EUR with reverse context: ${eurPrice}`);
        }
      }
    }
    
    const result = { bgn: bgnPrice, eur: eurPrice };
    console.log('🎯 Final context-based result:', result);
    
    return result;
  }

  private calculateConfidence(
    prices: { bgn?: number; eur?: number }, 
    text: string, 
    ocrConfidence: number
  ): number {
    // Start with OCR confidence from PaddleOCR
    let confidence = Math.max(50, Math.min(90, ocrConfidence)); // Clamp between 50-90
    console.log('Base OCR confidence:', ocrConfidence, '-> clamped:', confidence);

    // Adjust based on price detection success
    if (prices.bgn && prices.eur) {
      // Check if the mathematical relationship is correct
      const ratio = prices.bgn / prices.eur;
      const expectedRatio = this.EXCHANGE_RATE;
      const difference = Math.abs(ratio - expectedRatio);
      
      console.log('Price relationship check:', {
        bgn: prices.bgn,
        eur: prices.eur,
        ratio: ratio.toFixed(4),
        expected: expectedRatio.toFixed(4),
        difference: difference.toFixed(4)
      });
      
      if (difference <= 0.01) {
        confidence += 20; // Perfect mathematical relationship
        console.log('Perfect price relationship, +20 confidence');
      } else if (difference <= 0.05) {
        confidence += 15; // Good relationship within tolerance
        console.log('Good price relationship, +15 confidence');
      } else if (difference <= 0.1) {
        confidence += 10; // Acceptable relationship
        console.log('Acceptable price relationship, +10 confidence');
      } else {
        confidence += 5; // Found both prices but poor relationship
        console.log('Poor price relationship, +5 confidence');
      }
    } else if (prices.bgn || prices.eur) {
      confidence += 8; // Found one price
      console.log('Found one price, +8 confidence');
    } else {
      confidence -= 20; // No prices found
      console.log('No prices found, -20 confidence');
    }

    // Increase confidence if text contains currency keywords
    const currencyKeywords = ['лв', 'bgn', '€', 'eur', 'евро', 'лева', 'euro'];
    const foundKeywords = currencyKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    
    confidence += foundKeywords * 3;
    console.log('Found', foundKeywords, 'currency keywords, +', foundKeywords * 3, 'confidence');

    // Adjust confidence based on text quality indicators
    if (text.length < 3) {
      confidence -= 15; // Very short text
      console.log('Very short text, -15 confidence');
    } else if (text.length > 200) {
      confidence -= 5; // Very long text might be noisy
      console.log('Very long text, -5 confidence');
    }

    // Check for common OCR errors that might indicate poor quality
    const errorIndicators = ['|||', '...', '???', '***', '###', '□', '■'];
    const hasErrors = errorIndicators.some(indicator => text.includes(indicator));
    if (hasErrors) {
      confidence -= 10;
      console.log('Found error indicators, -10 confidence');
    }

    const finalConfidence = Math.min(95, Math.max(15, confidence));
    console.log('Final confidence:', finalConfidence);
    return finalConfidence;
  }

  // Method to validate service setup
  async validateService(): Promise<{ valid: boolean; error?: string; suggestion?: string }> {
    try {
      console.log('Validating PaddleOCR service...');
      console.log('Testing endpoint:', this.healthUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      // Test health endpoint first
      const healthResponse = await fetch(this.healthUrl, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('Health check response status:', healthResponse.status);

      if (healthResponse.ok) {
        console.log('✅ PaddleOCR service validation successful');
        this.isServiceAvailable = true;
        return { valid: true };
      } else {
        const errorText = await healthResponse.text();
        console.log('PaddleOCR service validation failed:', errorText);
        
        let suggestion = 'Check if the PaddleOCR service is running on your VPS.';
        if (healthResponse.status === 404) {
          suggestion = 'The health endpoint may not be available. Check if the service is properly configured at http://69.62.115.146:8868/';
        } else if (healthResponse.status >= 500) {
          suggestion = 'The PaddleOCR service is experiencing server errors. Check the server logs.';
        }
        
        return { 
          valid: false, 
          error: `HTTP ${healthResponse.status}: ${errorText}`,
          suggestion
        };
      }
      
    } catch (error) {
      console.error('PaddleOCR service validation error:', error);
      
      let suggestion = 'Check your network connection and ensure the VPS is accessible at http://69.62.115.146:8868/';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          suggestion = 'The service request timed out. The VPS may be slow or unresponsive.';
        } else if (error.message.includes('fetch')) {
          suggestion = 'Network error occurred. Check if the VPS IP address and port are correct: http://69.62.115.146:8868/predict/ocr_system';
        }
      }
      
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        suggestion
      };
    }
  }

  // Method to get service status for UI display
  getServiceStatus(): { available: boolean; lastChecked: number } {
    return {
      available: this.isServiceAvailable,
      lastChecked: this.lastServiceCheck
    };
  }

  // Method to manually reset service availability (for retry functionality)
  resetServiceStatus(): void {
    this.isServiceAvailable = true;
    this.lastServiceCheck = 0;
    console.log('Service status reset - will recheck on next request');
  }
}

export const ocrService = new OCRService();