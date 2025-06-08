# BGN-EUR Price Checker

A React Native Expo app for checking currency conversion accuracy between Bulgarian Lev (BGN) and Euro (EUR) using a self-hosted PaddleOCR API.

## Features

- **PaddleOCR Integration**: Uses self-hosted PaddleOCR server for advanced text recognition from price labels
- **Camera Integration**: Capture images directly from camera with automatic scanning
- **Price Validation**: Automatically checks if EUR prices match the official BGN exchange rate (1.95583)
- **History Tracking**: Saves all scans with detailed information and statistics
- **Beautiful UI**: Modern design with animations and smooth transitions

## Setup

### Prerequisites

This app uses a self-hosted PaddleOCR server for text recognition - a powerful, open-source OCR solution.

**PaddleOCR Server**: 
- Hosted at: http://69.62.115.146:8868/
- Unlimited requests (no API key required)
- Supports multiple languages including English and Bulgarian
- Automatic text orientation detection
- High accuracy with printed text
- Full data control and privacy

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## PaddleOCR API Integration

### API Details

The app uses a self-hosted PaddleOCR server:
- **Health Check**: GET http://69.62.115.146:8868/
- **OCR Processing**: POST http://69.62.115.146:8868/predict/ocr_system
- **No API Key Required**: Self-hosted service with unlimited usage
- **No Rate Limits**: Process as many images as needed

### Request Parameters

```javascript
{
  image: "data:image/jpeg;base64,{base64_data}",
  language: "en", // or "bg" for Bulgarian if supported
  confidence_threshold: 0.5
}
```

### Response Format

PaddleOCR returns structured JSON:

```json
{
  "status": "success",
  "results": [
    {
      "text": "12.50 лв",
      "confidence": 0.95,
      "bbox": [10, 15, 50, 35]
    },
    {
      "text": "6.39 €",
      "confidence": 0.92,
      "bbox": [60, 15, 90, 35]
    }
  ],
  "processing_time": 1.2
}
```

### Supported Features

- **Languages**: English, Bulgarian, and many others
- **Image Formats**: JPG, PNG, GIF, BMP
- **Max File Size**: 5MB (configurable)
- **Text Orientation**: Automatic detection and correction
- **High Performance**: Optimized for speed and accuracy

### Price Detection Patterns

The app recognizes these price formats:
- **BGN**: `12.50 лв`, `лв 12.50`, `BGN 12.50`, `12,50 лева`
- **EUR**: `6.39 €`, `€ 6.39`, `EUR 6.39`, `6,39 евро`
- **Decimal separators**: Both `.` and `,` are supported
- **Variations**: `лева`, `евро`, `euro`, `euros`

## Self-Hosted PaddleOCR Server

### Advantages

- **No API Limits**: Process unlimited images without restrictions
- **Data Privacy**: Full control over your data - nothing sent to third parties
- **High Performance**: Local processing with minimal latency
- **Cost Effective**: No per-request charges or subscription fees
- **Customizable**: Can be optimized for specific use cases
- **Reliable**: No dependency on external services or internet connectivity issues

### Server Configuration

The PaddleOCR server is configured with:
- **OCR Engine**: PaddleOCR v2.7+
- **Languages**: English (primary), Bulgarian (secondary)
- **Detection Model**: PP-OCRv4 for high accuracy
- **Recognition Model**: Optimized for price labels and receipts
- **Text Direction**: Auto-detection enabled

## Troubleshooting

### Common Issues

#### Connection Errors
1. **Network**: Ensure you have internet connectivity
2. **Server Status**: Check if the PaddleOCR server is running at http://69.62.115.146:8868/
3. **Firewall**: Ensure the server port 8868 is accessible

#### OCR Quality Issues
1. **Image Quality**: Use clear, well-lit images
2. **Text Size**: Ensure text is large enough to read
3. **Contrast**: High contrast between text and background works best
4. **Orientation**: PaddleOCR automatically corrects text angle

#### Server Response Issues
1. **Image Size**: Ensure images are under 5MB
2. **Format**: Use supported formats (JPG, PNG, GIF, BMP)
3. **Server Load**: The server may be processing other requests

### Testing the API

You can test the PaddleOCR API directly:

```bash
# Health check
curl -X GET "http://69.62.115.146:8868/"

# OCR processing (with base64 image)
curl -X POST "http://69.62.115.146:8868/predict/ocr_system" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "data:image/jpeg;base64,{your_base64_image}",
    "language": "en",
    "confidence_threshold": 0.5
  }'
```

## Usage

### Scanning Price Labels

1. **Automatic Scan**: Point the camera at a price label - scanning happens automatically every 3 seconds
2. **Manual Scan**: Tap the camera button for immediate scanning
3. **Results**: The app will automatically detect prices and validate the conversion

### Features

- **History**: View all previous scans with filtering options
- **Statistics**: Track accuracy rates and scan history
- **Calculator**: Manual currency conversion tool

## Technical Details

### OCR Integration

The app processes images through:
- Self-hosted PaddleOCR server
- Support for multiple languages
- Automatic text orientation detection and correction
- Confidence scoring based on OCR quality and price detection

### Data Storage

- Uses AsyncStorage for local data persistence
- Stores scan history with metadata
- Maintains up to 100 recent scans
- Includes confidence scores and raw OCR text

## Project Structure

```
app/
├── (tabs)/
│   ├── index.tsx          # Camera scanner screen
│   ├── calculator.tsx     # Manual calculator
│   ├── history.tsx        # Scan history
│   └── info.tsx          # App information
├── _layout.tsx           # Root layout
└── +not-found.tsx        # 404 page

utils/
├── ocrService.ts         # PaddleOCR API integration
└── historyService.ts     # Local storage management

types/
└── env.d.ts             # Environment variable types
```

## Platform Support

- **iOS**: Full functionality with camera access
- **Android**: Full functionality with camera access  
- **Web**: Full functionality (camera support depends on browser)

## Dependencies

- **Expo SDK 52**: React Native framework
- **PaddleOCR Server**: Text recognition (self-hosted)
- **AsyncStorage**: Local data persistence
- **Expo Camera**: Camera functionality
- **React Native Reanimated**: Smooth animations
- **Lucide React Native**: Modern icons

## Hosting Your Own PaddleOCR Server

If you want to host your own PaddleOCR server:

### Requirements
- Linux VPS with Python 3.8+
- At least 2GB RAM (4GB recommended)
- GPU support optional but recommended for better performance

### Installation Steps
1. Install PaddleOCR: `pip install paddlepaddle paddleocr`
2. Create a Flask/FastAPI server to handle HTTP requests
3. Configure the server to accept base64 images
4. Update the API endpoints in `utils/ocrService.ts`

### Example Server Code
```python
from paddleocr import PaddleOCR
from flask import Flask, request, jsonify
import base64
import cv2
import numpy as np

app = Flask(__name__)
ocr = PaddleOCR(use_angle_cls=True, lang='en')

@app.route('/predict/ocr_system', methods=['POST'])
def predict():
    data = request.json
    image_data = data['image'].split(',')[1]  # Remove data:image/jpeg;base64,
    
    # Decode base64 image
    image_bytes = base64.b64decode(image_data)
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Perform OCR
    result = ocr.ocr(image, cls=True)
    
    # Format response
    results = []
    for line in result[0]:
        bbox, (text, confidence) = line
        results.append({
            'text': text,
            'confidence': confidence,
            'bbox': bbox
        })
    
    return jsonify({
        'status': 'success',
        'results': results
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8868)
```

## Legal Information

This app helps consumers verify currency conversion accuracy according to Bulgarian National Bank regulations. The official BGN to EUR exchange rate is fixed at 1.95583.

## License

MIT License - see LICENSE file for details.