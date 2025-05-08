import React, { useRef, useState } from "react";
import Webcam from "react-webcam";
import { BrowserMultiFormatReader } from "@zxing/browser";
import Quagga from "quagga";

const App = () => {
  const webcamRef = useRef(null);
  const [qrData, setQrData] = useState("");
  const [barcodeData, setBarcodeData] = useState("");
  const [qrImage, setQrImage] = useState(null);
  const [barcodeImage, setBarcodeImage] = useState(null);

  const capture = async () => {
    const screenshot = webcamRef.current.getScreenshot();
    if (!screenshot) return;

    // Reset kết quả
    setQrData("Đang quét...");
    setBarcodeData("Đang quét...");
    setQrImage(null);
    setBarcodeImage(null);

    const { qrImage, barcodeImage } = await detectAndCropCodes(screenshot);

    // Hiển thị ảnh crop
    setQrImage(qrImage);
    setBarcodeImage(barcodeImage);

    // Quét QR
    if (qrImage) {
      try {
        const qrReader = new BrowserMultiFormatReader();
        const result = await qrReader.decodeFromImageUrl(qrImage);
        setQrData(result.text);
      } catch {
        setQrData("Không phát hiện QR");
      }
    } else {
      setQrData("Không tìm thấy vùng QR");
    }

    // Quét barcode
    if (barcodeImage) {
      Quagga.decodeSingle({
        src: barcodeImage,
        inputStream: { size: 800 },
        decoder: {
          readers: ["code_128_reader", "ean_reader", "ean_8_reader"]
        }
      }, (data) => {
        if (data?.codeResult?.code) {
          setBarcodeData(data.codeResult.code);
        } else {
          setBarcodeData("Không phát hiện barcode");
        }
      });
    } else {
      setBarcodeData("Không tìm thấy vùng barcode");
    }
  };

  const detectAndCropCodes = async (imageUrl) => {
    const img = new Image();
    img.src = imageUrl;
    await new Promise((res) => (img.onload = res));

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    let qrImage = null;
    let barcodeImage = null;

    // --- QR code ---
    try {
      const qrReader = new BrowserMultiFormatReader();
      const result = await qrReader.decodeFromImageElement(img);
      const [p1, p2] = result.resultPoints;
      const x = Math.max(Math.min(p1.x, p2.x) - 20, 0);
      const y = Math.max(Math.min(p1.y, p2.y) - 20, 0);
      const w = Math.abs(p1.x - p2.x) + 40;
      const h = w;

      const qrCanvas = document.createElement("canvas");
      qrCanvas.width = w;
      qrCanvas.height = h;
      qrCanvas.getContext("2d").drawImage(canvas, x, y, w, h, 0, 0, w, h);
      qrImage = qrCanvas.toDataURL("image/jpeg");
    } catch {
      console.log("Không phát hiện QR");
    }

    // --- Barcode ---
    await new Promise((resolve) => {
      Quagga.decodeSingle({
        src: imageUrl,
        inputStream: { size: 1280 },
        decoder: {
          readers: ["code_128_reader", "ean_reader", "ean_8_reader"]
        },
        locate: true
      }, (data) => {
        if (data?.box) {
          const [p1, , p3] = data.box;
          const x = Math.max(Math.min(p1[0], p3[0]) - 10, 0);
          const y = Math.max(Math.min(p1[1], p3[1]) - 10, 0);
          const w = Math.abs(p1[0] - p3[0]) + 20;
          const h = Math.abs(p1[1] - p3[1]) + 20;

          const barCanvas = document.createElement("canvas");
          barCanvas.width = w;
          barCanvas.height = h;
          barCanvas.getContext("2d").drawImage(canvas, x, y, w, h, 0, 0, w, h);
          barcodeImage = barCanvas.toDataURL("image/jpeg");
        }
        resolve();
      });
    });

    return { qrImage, barcodeImage };
  };

  return (
    <div style={{ padding: 16, textAlign: "center", fontFamily: "Arial" }}>
      <h2>📷 Quét QR & Barcode</h2>
      <Webcam
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={{ facingMode: "environment" }}
        style={{ width: "100%", maxWidth: 400 }}
      />
      <button
        onClick={capture}
        style={{
          marginTop: 12,
          padding: "8px 16px",
          backgroundColor: "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontSize: 16
        }}
      >
        Chụp & Quét
      </button>

      <div style={{ marginTop: 24 }}>
        <h4>🔍 QR Code</h4>
        {qrImage && <img src={qrImage} alt="QR" style={{ maxWidth: 200 }} />}
        <p>{qrData}</p>

        <h4>📦 Barcode</h4>
        {barcodeImage && (
          <img src={barcodeImage} alt="Barcode" style={{ maxWidth: 200 }} />
        )}
        <p>{barcodeData}</p>
      </div>
    </div>
  );
};

export default App;
