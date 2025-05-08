import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import jsQR from "jsqr";
import { BrowserMultiFormatReader } from "@zxing/library";
import Quagga from "quagga"; // quagga2

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
  const detectWithQuagga = (base64Image) => {
    loadImage(base64Image).then((img) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      Quagga.decodeSingle({
        src: base64Image,
        numOfWorkers: 0,
        inputStream: {
          size: 800,
        },
        decoder: {
          readers: ["code_128_reader", "ean_reader", "ean_8_reader", "code_39_reader"],
        },
        locate: true,
      }, (result) => {
        if (result && result.codeResult) {
          setQuaggaResult(result.codeResult.code);
        } else {
          setQuaggaResult("Không phát hiện");
        }
      });
    });
  };


  const captureAndProcess = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    detectWithQuagga(imageSrc)
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

   

    };
  };

  if (!opencvReady) {
    return <div style={styles.loading}>Đang tải OpenCV...</div>;
  }
  const videoConstraints = {
    facingMode: "environment", // Đảm bảo camera sau được sử dụng
    width: 640, // Giảm kích thước của camera để dễ dàng nhận diện
    height: 480
  };


  return (
    <div style={styles.container}>
      <h1 style={styles.title}>📷 QR & Barcode Scanner</h1>
      <Webcam
        ref={webcamRef}
        screenshotFormat="image/png"
        width="80%" // Điều chỉnh kích thước camera nhỏ hơn
        videoConstraints={videoConstraints} // Sử dụng camera sau
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
