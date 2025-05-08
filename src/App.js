import React, { useRef, useState } from "react";
import Webcam from "react-webcam";
import { BrowserMultiFormatReader } from "@zxing/library";
import Quagga from "quagga"; // quagga2

const App = () => {
  const webcamRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [zxingResult, setZxingResult] = useState(null);
  const [quaggaResult, setQuaggaResult] = useState(null);

  const capture = () => {
    const screenshot = webcamRef.current.getScreenshot();
    setImageSrc(screenshot);
    if (screenshot) {
      detectWithZXing(screenshot);
      detectWithQuagga(screenshot);
    }
  };

  const detectWithZXing = async (base64Image) => {
    try {
      const img = await loadImage(base64Image);
      const result = await new BrowserMultiFormatReader().decodeFromImageElement(img);
      setZxingResult(result.text);
    } catch (err) {
      setZxingResult("Không phát hiện");
    }
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

  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
    });
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h2>Ứng dụng nhận diện Barcode & QRCode</h2>
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/png"
        videoConstraints={{ facingMode: "environment" }}
        style={{ width: 320, height: 240 }}
      />
      <br />
      <button onClick={capture}>Chụp ảnh & Nhận diện</button>
      {imageSrc && (
        <>
          <h4>Ảnh đã chụp:</h4>
          <img src={imageSrc} alt="captured" style={{ width: 320 }} />
        </>
      )}
      <div>
        <h4>Kết quả ZXing (QRCode + Barcode):</h4>
        <p>{zxingResult}</p>
      </div>
      <div>
        <h4>Kết quả Quagga (Barcode):</h4>
        <p>{quaggaResult}</p>
      </div>
    </div>
  );
};

export default App;
