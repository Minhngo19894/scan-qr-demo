import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader } from '@zxing/library';

const BarcodeScanner = () => {
  const webcamRef = useRef(null);
  const [result, setResult] = useState('');

  const captureAndScan = async () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    const img = new Image();
    img.src = imageSrc;

    img.onload = async () => {
      const reader = new BrowserMultiFormatReader();
      try {
        const result = await reader.decodeFromImageElement(img);
        setResult(result.text);
      } catch (error) {
        setResult('Không nhận diện được mã vạch.');
      }
    };
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/png"
        width={300}
        height={200}
      />
      <button onClick={captureAndScan} className="bg-blue-500 px-4 py-2 rounded text-white">
        Chụp và quét mã vạch
      </button>
      <p>Kết quả: {result}</p>
    </div>
  );
};

export default BarcodeScanner;
