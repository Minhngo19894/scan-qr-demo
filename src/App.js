// App.jsx
import React, { useRef, useState } from "react";
import Webcam from "react-webcam";
import { BrowserMultiFormatReader } from "@zxing/browser";
import Quagga from "quagga";

const App = () => {
  const webcamRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [result, setResult] = useState({ qr: "", barcode: "" });

  const capture = async () => {
    const screenshot = webcamRef.current.getScreenshot();
    if (!screenshot) return;

    setImageSrc(screenshot);
    setResult({ qr: "Đang quét...", barcode: "Đang quét..." });

    // Phân tích QR Code
    const qrReader = new BrowserMultiFormatReader();
    try {
      const qrResult = await qrReader.decodeFromImageUrl(screenshot);
      setResult(prev => ({ ...prev, qr: qrResult.text }));
    } catch {
      setResult(prev => ({ ...prev, qr: "Không phát hiện QR code" }));
    }

    // Phân tích Barcode
    Quagga.decodeSingle({
      src: screenshot,
      numOfWorkers: 0,
      inputStream: { size: 800 },
      decoder: {
        readers: ["code_128_reader", "ean_reader", "ean_8_reader"]
      }
    }, (data) => {
      if (data?.codeResult?.code) {
        setResult(prev => ({ ...prev, barcode: data.codeResult.code }));
      } else {
        setResult(prev => ({ ...prev, barcode: "Không phát hiện barcode" }));
      }
    });
  };

  return (
    <div className="p-4 text-center">
      <h1 className="text-xl font-bold mb-4">Quét QR & Barcode</h1>
      <Webcam
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={{ facingMode: "environment" }} // camera sau
        style={{ width: "100%", maxWidth: 400 }}
      />
      <button
        onClick={capture}
        className="mt-4 bg-blue-500 text-white py-2 px-4 rounded"
      >
        Chụp & Quét
      </button>

      {imageSrc && (
        <div className="mt-4">
          <img src={imageSrc} alt="Captured" className="max-w-full rounded" />
        </div>
      )}

      <div className="mt-4 text-left">
        <p><strong>QR Code:</strong> {result.qr}</p>
        <p><strong>Barcode:</strong> {result.barcode}</p>
      </div>
    </div>
  );
};

export default App;
