import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import jsQR from "jsqr";
import { BrowserMultiFormatReader } from "@zxing/library";

const App = () => {
  const webcamRef = useRef(null);
  const [opencvReady, setOpenCVReady] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState("");
  const [qrResult, setQRResult] = useState("");

  // Load OpenCV.js đúng cách chỉ 1 lần
  useEffect(() => {
    if (window.cv) {
      console.log("OpenCV đã tồn tại");
      setOpenCVReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.x/opencv.js";
    script.async = true;

    script.onload = () => {
      console.log("Script opencv.js đã tải");
      window.cv['onRuntimeInitialized'] = () => {
        console.log("✅ OpenCV đã sẵn sàng");
        setOpenCVReady(true);
      };
    };

    script.onerror = () => {
      console.error("❌ Lỗi khi tải opencv.js");
    };

    document.body.appendChild(script);
  }, []);

  const captureAndProcess = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    const img = new Image();
    img.src = imageSrc;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // QR Code
      const codeQR = jsQR(imageData.data, canvas.width, canvas.height);
      setQRResult(codeQR ? codeQR.data : "QR không nhận diện được");

      // Barcode
      const reader = new BrowserMultiFormatReader();
      reader
        .decodeFromImageElement(img)
        .then((result) => setBarcodeResult(result.getText()))
        .catch(() => setBarcodeResult("Barcode không nhận diện được"));
    };
  };

  if (!opencvReady) {
    return <div>Đang tải OpenCV...</div>;
  }

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Scanner QR + Barcode</h1>
      <Webcam
        ref={webcamRef}
        screenshotFormat="image/png"
        videoConstraints={{ facingMode: "environment" }}
        width={320}
        height={240}
      />
      <br />
      <button onClick={captureAndProcess}>Chụp và quét mã</button>
      <div style={{ marginTop: "20px" }}>
        <h3>QR Code:</h3>
        <p>{qrResult}</p>
        <h3>Barcode:</h3>
        <p>{barcodeResult}</p>
      </div>
    </div>
  );
};

export default App;
