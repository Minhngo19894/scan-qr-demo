import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
  const webcamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [scanResults, setScanResults] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  // Cấu hình các loại mã cần quét
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.EAN_13,
    BarcodeFormat.CODE_128,
    BarcodeFormat.UPC_A
  ]);

  // Chụp ảnh từ camera
  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    setScanResults([]); // Reset kết quả cũ
  };

  // Quét mã từ ảnh đã chụp
  const scanImage = async () => {
    if (!capturedImage) return;
    
    setIsScanning(true);
    const codeReader = new BrowserMultiFormatReader(hints);
    
    try {
      // Thử quét nhiều lần để bắt được cả QR và barcode
      const results = [];
      
      // Lần quét 1
      try {
        const result = await codeReader.decodeFromImageUrl(capturedImage);
        if (result) results.push(result);
      } catch (e) {}
      
      // Lần quét 2
      try {
        const result = await codeReader.decodeFromImageUrl(capturedImage);
        if (result && !results.some(r => r.text === result.text)) {
          results.push(result);
        }
      } catch (e) {}
      
      if (results.length > 0) {
        setScanResults(results);
        toast.success(`Đã tìm thấy ${results.length} mã`);
      } else {
        toast.warning('Không tìm thấy mã nào');
      }
    } catch (error) {
      toast.error('Lỗi khi quét mã: ' + error.message);
    } finally {
      setIsScanning(false);
    }
  };

  // Xác định loại mã
  const getFormatName = (format) => {
    switch (format) {
      case BarcodeFormat.QR_CODE: return 'QR Code';
      case BarcodeFormat.EAN_13: return 'Barcode (EAN-13)';
      case BarcodeFormat.CODE_128: return 'Barcode (Code 128)';
      case BarcodeFormat.UPC_A: return 'Barcode (UPC-A)';
      default: return 'Không xác định';
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Quét QR/Barcode</h1>
      
      {/* Camera */}
      <div style={styles.cameraContainer}>
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
            onUserMedia={() => setCameraReady(true)}
            onUserMediaError={(e) => toast.error('Lỗi camera: ' + e.message)}
          />
        ) : (
          <img src={capturedImage} alt="Captured" style={styles.camera} />
        )}
      </div>

      {/* Nút điều khiển */}
      <div style={styles.controls}>
        {!capturedImage ? (
          <button 
            onClick={capturePhoto} 
            style={styles.button}
            disabled={!cameraReady}
          >
            Chụp Ảnh
          </button>
        ) : (
          <>
            <button 
              onClick={() => setCapturedImage(null)} 
              style={{...styles.button, backgroundColor: '#f44336'}}
            >
              Chụp Lại
            </button>
            <button 
              onClick={scanImage} 
              style={styles.button}
              disabled={isScanning}
            >
              {isScanning ? 'Đang quét...' : 'Quét Mã'}
            </button>
          </>
        )}
      </div>

      {/* Kết quả quét */}
      {scanResults.length > 0 && (
        <div style={styles.results}>
          <h3>Kết quả quét:</h3>
          <ul style={styles.resultList}>
            {scanResults.map((result, index) => (
              <li key={index} style={styles.resultItem}>
                <strong>Mã {index + 1}:</strong> {result.text}<br />
                <strong>Loại:</strong> {getFormatName(result.format)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ToastContainer position="bottom-center" />
    </div>
  );
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
  cameraContainer: {
    width: '100%',
    aspectRatio: '4/3',
    backgroundColor: '#000',
    margin: '0 auto 20px',
    borderRadius: '10px',
    overflow: 'hidden',
    position: 'relative'
  },
  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '20px'
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  results: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '10px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
  },
  resultList: {
    listStyle: 'none',
    padding: 0,
    textAlign: 'left'
  },
  resultItem: {
    margin: '10px 0',
    padding: '10px',
    borderBottom: '1px solid #eee'
  }
};

export default App;