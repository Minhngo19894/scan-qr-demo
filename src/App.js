import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import jsQR from "jsqr";
import { BrowserMultiFormatReader } from "@zxing/library";

const App = () => {
  const webcamRef = useRef(null);
  const [opencvReady, setOpenCVReady] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState("");
  const [qrResult, setQRResult] = useState("");
  const [qrImage, setQRImage] = useState(null);
  const [barcodeImage, setBarcodeImage] = useState(null);

  useEffect(() => {
    if (window.cv) {
      setOpenCVReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.x/opencv.js";
    script.async = true;
    script.onload = () => {
      window.cv.onRuntimeInitialized = () => {
        setOpenCVReady(true);
      };
    };
    document.body.appendChild(script);
  }, []);

  const cropRegion = (ctx, x, y, w, h) => {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(ctx.canvas, x, y, w, h, 0, 0, w, h);
    return tempCanvas.toDataURL("image/png");
  };

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

      // === QR Code Detection ===
      const codeQR = jsQR(imageData.data, canvas.width, canvas.height);
      if (codeQR) {
        setQRResult(codeQR.data);
        const { topLeftCorner, bottomRightCorner } = codeQR.location;
        const cropX = topLeftCorner.x;
        const cropY = topLeftCorner.y;
        const cropWidth = bottomRightCorner.x - cropX;
        const cropHeight = bottomRightCorner.y - cropY;
        setQRImage(cropRegion(ctx, cropX, cropY, cropWidth, cropHeight));
      } else {
        setQRResult("QR không nhận diện được");
        setQRImage(null);
      }

      // === Barcode Detection ===
      const barX = canvas.width * 0.1;
      const barY = canvas.height * 0.7;
      const barW = canvas.width * 0.8;
      const barH = canvas.height * 0.2;

      // Crop ảnh barcode
      const barCanvas = document.createElement("canvas");
      barCanvas.width = barW;
      barCanvas.height = barH;
      const barCtx = barCanvas.getContext("2d");
      barCtx.drawImage(canvas, barX, barY, barW, barH, 0, 0, barW, barH);
      const barDataURL = barCanvas.toDataURL("image/png");
      setBarcodeImage(barDataURL);

      // Tạo thẻ ảnh mới từ vùng crop
      const croppedImg = new Image();
      croppedImg.src = barDataURL;

      croppedImg.onload = () => {
        reader
          .decodeFromImage(croppedImg)
          .then((result) => {
            setBarcodeResult(result.getText());
          })
          .catch(() => {
            setBarcodeResult("Barcode không nhận diện được");
          });
      };

    };
  };

  if (!opencvReady) {
    return <div style={styles.loading}>Đang tải OpenCV...</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>📷 QR & Barcode Scanner</h1>
      <Webcam
        ref={webcamRef}
        screenshotFormat="image/png"
        videoConstraints={{
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 300 },
        }}
        style={styles.webcam}
      />
      <button onClick={captureAndProcess} style={styles.button}>
        Chụp & Quét mã
      </button>

      <div style={styles.resultSection}>
        <h2>QR Code:</h2>
        <p>{qrResult}</p>
        {qrImage && <img src={qrImage} alt="QR Crop" style={styles.croppedImage} />}

        <h2>Barcode:</h2>
        <p>{barcodeResult}</p>
        {barcodeImage && <img src={barcodeImage} alt="Barcode Crop" style={styles.croppedImage} />}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: 16,

    with: '100%', margin: "auto",
    fontFamily: "Arial, sans-serif",
  },
  title: {
    textAlign: "center",
  },
  webcam: {
    borderRadius: 8,
    width: "100%",
    maxWidth: "100%",
  },
  button: {
    marginTop: 12,
    padding: 10,
    fontSize: 16,
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: 6,
    width: "100%",
    cursor: "pointer",
  },
  resultSection: {
    marginTop: 24,
    textAlign: "center",
  },
  croppedImage: {
    marginTop: 8,
    maxWidth: "90%",
    borderRadius: 6,
    border: "1px solid #ccc",
  },
  loading: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 20,
  },
};

export default App;
