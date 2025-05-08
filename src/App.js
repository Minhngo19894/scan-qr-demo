import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

const MultiCodeScanner = () => {
  const webcamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [scanResults, setScanResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Cấu hình ZXing để quét nhiều loại mã
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.EAN_13,
    BarcodeFormat.CODE_128
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);

  // Chụp ảnh
  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
  };

  // Quét nhiều mã từ ảnh
  const scanMultipleCodes = async () => {
    if (!capturedImage) return;
    
    setIsProcessing(true);
    setScanResults([]);
    const codeReader = new BrowserMultiFormatReader(hints);
    
    try {
      // Tạo ảnh từ URL
      const img = new Image();
      img.src = capturedImage;
      await img.decode();
      
      // Tạo canvas để xử lý ảnh
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Chiến lược 1: Quét toàn bộ ảnh nhiều lần
      const results = await tryMultipleScans(codeReader, canvas);
      
      // Chiến lược 2: Nếu không đủ mã, thử cắt ảnh
      if (results.length < 2) {
        const croppedResults = await tryCroppedScans(codeReader, canvas);
        croppedResults.forEach(result => {
          if (!results.some(r => r.text === result.text)) {
            results.push(result);
          }
        });
      }
      
      setScanResults(results);
    } catch (error) {
      console.error('Lỗi quét mã:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Quét nhiều lần trên cùng ảnh
  const tryMultipleScans = async (codeReader, canvas) => {
    const results = [];
    for (let i = 0; i < 3; i++) { // Thử 3 lần
      try {
        const result = await codeReader.decodeFromCanvas(canvas);
        if (result && !results.some(r => r.text === result.text)) {
          results.push(result);
        }
      } catch (e) {
        // Bỏ qua lỗi nếu không tìm thấy mã
      }
    }
    return results;
  };

  // Cắt ảnh và quét từng phần
  const tryCroppedScans = async (codeReader, canvas) => {
    const results = [];
    const { width, height } = canvas;
    
    // Chia ảnh thành 4 phần và quét từng phần
    const regions = [
      { x: 0, y: 0, w: width/2, h: height/2 }, // Top-left
      { x: width/2, y: 0, w: width/2, h: height/2 }, // Top-right
      { x: 0, y: height/2, w: width/2, h: height/2 }, // Bottom-left
      { x: width/2, y: height/2, w: width/2, h: height/2 } // Bottom-right
    ];
    
    for (const region of regions) {
      const croppedCanvas = cropCanvas(canvas, region);
      try {
        const result = await codeReader.decodeFromCanvas(croppedCanvas);
        if (result && !results.some(r => r.text === result.text)) {
          results.push(result);
        }
      } catch (e) {
        // Bỏ qua nếu không tìm thấy
      }
    }
    
    return results;
  };

  // Hàm cắt ảnh từ canvas
  const cropCanvas = (sourceCanvas, { x, y, w, h }) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      sourceCanvas,
      x, y, w, h, // Source region
      0, 0, w, h  // Destination region
    );
    return canvas;
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Quét Nhiều Mã</h1>
      
      {!capturedImage ? (
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: 'environment' }}
          style={{ width: '100%', borderRadius: '10px' }}
        />
      ) : (
        <img 
          src={capturedImage} 
          alt="Captured" 
          style={{ width: '100%', borderRadius: '10px' }} 
        />
      )}

      <div style={{ margin: '20px 0' }}>
        {!capturedImage ? (
          <button onClick={capturePhoto}>Chụp Ảnh</button>
        ) : (
          <>
            <button onClick={() => setCapturedImage(null)}>Chụp Lại</button>
            <button 
              onClick={scanMultipleCodes} 
              disabled={isProcessing}
            >
              {isProcessing ? 'Đang xử lý...' : 'Quét Nhiều Mã'}
            </button>
          </>
        )}
      </div>

      {scanResults.length > 0 && (
        <div>
          <h3>Kết quả ({scanResults.length} mã):</h3>
          <ul style={{ textAlign: 'left' }}>
            {scanResults.map((result, i) => (
              <li key={i}>
                <strong>Mã {i+1}:</strong> {result.text} 
                <br /><small>({formatName(result.format)})</small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Helper: Định dạng tên mã
const formatName = (format) => {
  switch (format) {
    case BarcodeFormat.QR_CODE: return 'QR Code';
    case BarcodeFormat.EAN_13: return 'Barcode (EAN-13)';
    case BarcodeFormat.CODE_128: return 'Barcode (Code 128)';
    default: return format;
  }
};

export default MultiCodeScanner;