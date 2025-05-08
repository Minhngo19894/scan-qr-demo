import React, { useState } from 'react';
import Webcam from 'react-webcam';
import jsQR from 'jsqr';
import Quagga from 'quagga';

const App = () => {
  const [qrData, setQrData] = useState(null);
  const [barcodeData, setBarcodeData] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);

  const webcamRef = React.useRef(null);

  // Chụp ảnh từ webcam
  const capture = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImageSrc(imageSrc); // Cập nhật ảnh chụp
    processImage(imageSrc); // Xử lý ảnh nhận diện mã
  };

  // Nhận diện QR Code từ ảnh
  const detectQRCode = (image) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0, image.width, image.height);

    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    const code = jsQR(imageData.data, image.width, image.height);
    return code ? code.data : null;
  };

  // Nhận diện Barcode từ ảnh
  const detectBarcode = (image) => {
    return new Promise((resolve, reject) => {
      Quagga.decodeSingle(
        {
          src: image,
          numOfWorkers: 0, // Sử dụng 0 worker cho client-side
          inputStream: {
            size: 800, // Kích thước ảnh đầu vào
          },
          decoder: {
            readers: ['ean_reader', 'upc_reader'], // Các loại mã vạch
          },
        },
        (result) => {
          if (result && result.codeResult) {
            resolve(result.codeResult.code);
          } else {
            reject('Không tìm thấy mã vạch');
          }
        }
      );
    });
  };

  // Xử lý ảnh sau khi chụp
  const processImage = async (imageSrc) => {
    const image = new Image();
    image.src = imageSrc;

    // Đợi ảnh tải xong
    image.onload = async () => {
      // Nhận diện QR Code
      const qrCode = detectQRCode(image);
      if (qrCode) {
        setQrData(qrCode);
      } else {
        setQrData('Không tìm thấy QR Code');
      }

      // Nhận diện Barcode
      try {
        const barcode = await detectBarcode(imageSrc);
        setBarcodeData(barcode);
      } catch (error) {
        setBarcodeData('Không tìm thấy Barcode');
      }
    };
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h1>Ứng Dụng Chụp Ảnh QR Code và Barcode</h1>
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width="100%"
      />
      <br />
      <button onClick={capture}>Chụp Ảnh</button>
      <div style={{ marginTop: '20px' }}>
        {imageSrc && (
          <div>
            <h2>Ảnh Chụp</h2>
            <img src={imageSrc} alt="Captured" width="300" />
          </div>
        )}
        {qrData && (
          <div>
            <h3>Thông tin QR Code:</h3>
            <p>{qrData}</p>
          </div>
        )}
        {barcodeData && (
          <div>
            <h3>Thông tin Barcode:</h3>
            <p>{barcodeData}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
