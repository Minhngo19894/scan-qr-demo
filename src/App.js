import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { loadOpenCV } from '@techstark/opencv-js';

const MultiCodeScanner = () => {
  const webcamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [results, setResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cv, setCv] = useState(null);
  const [zxingReady, setZxingReady] = useState(false);

  // Khởi tạo OpenCV và ZXing
  useEffect(() => {
    // Tải OpenCV.js
    loadOpenCV().then(() => {
      setCv(window.cv);
    });

    // Khởi tạo ZXing
    setZxingReady(true);
  }, []);

  // Chụp ảnh từ webcam
  const captureImage = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    setResults([]);
  };

  // Quét mã từ ảnh đã chụp
  const scanImage = async () => {
    if (!capturedImage || !cv || !zxingReady) return;

    setIsProcessing(true);
    try {
      // 1. Tạo ảnh từ URL
      const img = new Image();
      img.src = capturedImage;
      await img.decode();

      // 2. Tạo canvas để xử lý
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // 3. Phát hiện vùng chứa mã bằng OpenCV
      const regions = await detectCodeRegions(canvas, cv);

      // 4. Quét từng vùng bằng ZXing
      const codeReader = new BrowserMultiFormatReader(getHints());
      const foundCodes = [];

      for (const region of regions) {
        try {
          const croppedCanvas = cropCanvas(canvas, region);
          const result = await codeReader.decodeFromCanvas(croppedCanvas);
          if (result && !foundCodes.some(c => c.text === result.text)) {
            foundCodes.push({
              text: result.text,
              format: getFormatName(result.format),
              region: region
            });
          }
        } catch (error) {
          // Bỏ qua nếu không quét được
        }
      }

      setResults(foundCodes);
    } catch (error) {
      console.error('Lỗi quét mã:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Phát hiện các vùng có thể chứa mã
  const detectCodeRegions = async (canvas, cv) => {
    const src = cv.imread(canvas);
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // Phát hiện QR code
    const qrDetector = new cv.QRCodeDetector();
    const qrRegions = [];
    try {
      const qrPoints = new cv.Mat();
      if (qrDetector.detect(gray, qrPoints)) {
        for (let i = 0; i < qrPoints.rows; i++) {
          const points = [];
          for (let j = 0; j < qrPoints.cols; j++) {
            points.push({
              x: qrPoints.data32S[i * qrPoints.cols * 2 + j * 2],
              y: qrPoints.data32S[i * qrPoints.cols * 2 + j * 2 + 1]
            });
          }
          qrRegions.push(getBoundingBox(points));
        }
      }
    } catch (e) {
      console.error('Lỗi phát hiện QR:', e);
    }

    // Phát hiện barcode (đơn giản bằng contour detection)
    const barcodeRegions = [];
    try {
      const binary = new cv.Mat();
      cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);

      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);
        if (area > 1000) { // Lọc các contour quá nhỏ
          const rect = cv.boundingRect(contour);
          barcodeRegions.push({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          });
        }
      }
    } catch (e) {
      console.error('Lỗi phát hiện barcode:', e);
    }

    // Kết hợp các vùng và loại bỏ trùng lặp
    return mergeRegions([...qrRegions, ...barcodeRegions]);
  };

  // Cắt ảnh theo vùng
  const cropCanvas = (sourceCanvas, region) => {
    const canvas = document.createElement('canvas');
    canvas.width = region.width;
    canvas.height = region.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      sourceCanvas,
      region.x, region.y, region.width, region.height,
      0, 0, region.width, region.height
    );
    return canvas;
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Quét Đa Mã</h1>
      
      {!capturedImage ? (
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }}
          style={styles.camera}
        />
      ) : (
        <img 
          src={capturedImage} 
          alt="Captured" 
          style={styles.camera} 
        />
      )}

      <div style={styles.controls}>
        {!capturedImage ? (
          <button 
            onClick={captureImage} 
            style={styles.button}
            disabled={!cv || !zxingReady}
          >
            Chụp Ảnh
          </button>
        ) : (
          <>
            <button 
              onClick={() => setCapturedImage(null)} 
              style={{...styles.button, ...styles.secondaryButton}}
            >
              Chụp Lại
            </button>
            <button 
              onClick={scanImage} 
              style={styles.button}
              disabled={isProcessing}
            >
              {isProcessing ? 'Đang quét...' : 'Quét Mã'}
            </button>
          </>
        )}
      </div>

      {(!cv || !zxingReady) && (
        <p style={styles.loading}>Đang tải thư viện...</p>
      )}

      {results.length > 0 && (
        <div style={styles.results}>
          <h3>Kết quả quét ({results.length} mã):</h3>
          <ul style={styles.resultList}>
            {results.map((result, index) => (
              <li key={index} style={styles.resultItem}>
                <div style={styles.resultHeader}>
                  <span style={styles.resultIndex}>Mã {index + 1}</span>
                  <span style={styles.resultType}>{result.format}</span>
                </div>
                <div style={styles.resultContent}>{result.text}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Các hàm hỗ trợ
const getHints = () => {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.EAN_13,
    BarcodeFormat.CODE_128,
    BarcodeFormat.UPC_A
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return hints;
};

const getFormatName = (format) => {
  switch (format) {
    case BarcodeFormat.QR_CODE: return 'QR Code';
    case BarcodeFormat.EAN_13: return 'Barcode (EAN-13)';
    case BarcodeFormat.CODE_128: return 'Barcode (Code 128)';
    case BarcodeFormat.UPC_A: return 'Barcode (UPC-A)';
    default: return 'Không xác định';
  }
};

const getBoundingBox = (points) => {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  points.forEach(p => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
};

const mergeRegions = (regions, threshold = 30) => {
  const merged = [];
  
  regions.forEach(region => {
    let isMerged = false;
    
    for (let i = 0; i < merged.length; i++) {
      const mergedRegion = merged[i];
      const distance = Math.sqrt(
        Math.pow(region.x - mergedRegion.x, 2) + 
        Math.pow(region.y - mergedRegion.y, 2)
      );
      
      if (distance < threshold) {
        // Merge regions
        mergedRegion.x = Math.min(mergedRegion.x, region.x);
        mergedRegion.y = Math.min(mergedRegion.y, region.y);
        mergedRegion.width = Math.max(
          mergedRegion.x + mergedRegion.width, 
          region.x + region.width
        ) - mergedRegion.x;
        mergedRegion.height = Math.max(
          mergedRegion.y + mergedRegion.height, 
          region.y + region.height
        ) - mergedRegion.y;
        isMerged = true;
        break;
      }
    }
    
    if (!isMerged) {
      merged.push({...region});
    }
  });
  
  return merged;
};

// Styles
const styles = {
  container: {
    maxWidth: '100%',
    padding: '20px',
    textAlign: 'center',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh'
  },
  header: {
    color: '#333',
    marginBottom: '20px'
  },
  camera: {
    width: '100%',
    maxHeight: '60vh',
    objectFit: 'contain',
    borderRadius: '10px',
    border: '2px solid #ddd'
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    margin: '20px 0'
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold'
  },
  secondaryButton: {
    backgroundColor: '#f44336'
  },
  loading: {
    color: '#666',
    fontStyle: 'italic'
  },
  results: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '10px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    marginTop: '20px'
  },
  resultList: {
    listStyle: 'none',
    padding: 0,
    textAlign: 'left'
  },
  resultItem: {
    margin: '10px 0',
    padding: '15px',
    border: '1px solid #eee',
    borderRadius: '5px',
    backgroundColor: '#f9f9f9'
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  resultIndex: {
    fontWeight: 'bold',
    color: '#333'
  },
  resultType: {
    backgroundColor: '#e1f5fe',
    color: '#0288d1',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '0.8em'
  },
  resultContent: {
    wordBreak: 'break-all',
    fontFamily: 'monospace'
  }
};

export default MultiCodeScanner;