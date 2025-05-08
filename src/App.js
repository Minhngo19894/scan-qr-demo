import React, { useRef, useState } from "react";
import Webcam from "react-webcam";
import jsQR from "jsqr";
import { BrowserMultiFormatReader } from "@zxing/library";

function QRBarcodeScanner() {
  const webcamRef = useRef(null);
  const [qrText, setQrText] = useState("");
  const [barText, setBarText] = useState("");

  const captureAndScan = async () => {
    const screenshot = webcamRef.current.getScreenshot();
    if (!screenshot) return;
    const img = new Image();
    img.src = screenshot;
    img.onload = async () => {
      // 1. Dùng OpenCV.js để phát hiện mã
      const mat = cv.imread(img);
      // Phát hiện QR code
      const qrDetector = new cv.QRCodeDetector();
      const qrPoints = new cv.Mat();
      if (qrDetector.detect(mat, qrPoints)) {
        const data = qrDetector.decode(mat, qrPoints);
        setQrText(data || "");
      }
      qrPoints.delete();
      // Phát hiện Barcode
      const barDetector = new cv.barcode_BarcodeDetector();
      const barPoints = new cv.Mat();
      if (barDetector.detect(mat, barPoints)) {
        const data = barDetector.decode(mat, barPoints);
        setBarText(data || "");
      }
      barPoints.delete();
      mat.delete();

      // 2. Giải mã QR nếu cần dùng jsQR (thay thế hoặc bổ sung)
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const qrResult = jsQR(imageData.data, imageData.width, imageData.height);
        if (qrResult) {
          setQrText(qrResult.data);
        }
      } catch (e) {
        console.error("JSQR decode error:", e);
      }

      // 3. Giải mã Barcode (ví dụ sử dụng ZXing)
      try {
        const codeReader = new BrowserMultiFormatReader();
        const result = await codeReader.decodeFromImage(img);
        if (result) {
          setBarText(result.text || "");
        }
      } catch (e) {
        console.error("ZXing decode error:", e);
      }
    };
  };

  return (
    <div>
      <h2>Quét mã QR & Barcode</h2>
      <Webcam audio={false} ref={webcamRef} screenshotFormat="image/png" />
      <button onClick={captureAndScan}>Chụp và quét</button>
      <div>
        <p><strong>QR Code:</strong> {qrText}</p>
        <p><strong>Barcode:</strong> {barText}</p>
      </div>
    </div>
  );
}

export default QRBarcodeScanner;
