import React, { useState } from 'react';
import Webcam from 'react-webcam';
import jsQR from 'jsqr';
import Quagga from 'quagga';

const App = () => {
  const [qrData, setQrData] = useState(null);
  const [barcodeData, setBarcodeData] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [croppedQRCode, setCroppedQRCode] = useState(null);
  const [croppedBarcode, setCroppedBarcode] = useState(null);

  const webcamRef = React.useRef(null);

  // Video Constraints để sử dụng camera sau trên điện thoại
  const videoConstraints = {
    facingMode: "environment", // Đảm bảo camera sau được sử dụng
    width: 640, // Giảm kích thước của camera để dễ dàng nhận diện
    height: 480
  };

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
    return code ? code : null;
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
            resolve(result.codeResult);
          } else {
            reject('Không tìm thấy mã vạch');
          }
        }
      );
    });
  };

  // Cắt ảnh theo vùng của QR Code và Barcode
  const cropImage = (image, cropArea) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = cropArea.width;
    canvas.height = cropArea.height;
    ctx.drawImage(image, cropArea.x, cropArea.y, cropArea.width, cropArea.height, 0, 0, cropArea.width, cropArea.height);
    return canvas.toDataURL('image/jpeg');
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
        setQrData(qrCode.data); // Lưu dữ liệu QR Code

        // Cắt vùng QR Code
        const qrCropArea = {
          x: qrCode.location.topLeft.x,
          y: qrCode.location.topLeft.y,
          width: qrCode.location.bottomRight.x - qrCode.location.topLeft.x,
          height: qrCode.location.bottomRight.y - qrCode.location.topLeft.y
        };
        const croppedQR = cropImage(image, qrCropArea);
        setCroppedQRCode(croppedQR);
      } else {
        setQrData('Không tìm thấy QR Code');
      }

      // Nhận diện Barcode
      try {
        const barcode = await detectBarcode(imageSrc);
        setBarcodeData(barcode.code);

        // Cắt vùng Barcode
        const barcodeCropArea = {
          x: barcode.bounds[0].x,
          y: barcode.bounds[0].y,
          width: barcode.bounds[1].x - barcode.bounds[0].x,
          height: barcode.bounds[2].y - barcode.bounds[0].y
        };
        const croppedBarcode = cropImage(image, barcodeCropArea);
        setCroppedBarcode(croppedBarcode);
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
        width="80%" // Điều chỉnh kích thước camera nhỏ hơn
        videoConstraints={videoConstraints} // Sử dụng camera sau
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
            {croppedQRCode && (
              <div>
                <h4>QR Code đã cắt:</h4>
                <img src={croppedQRCode} alt="Cropped QR Code" width="200" />
              </div>
            )}
          </div>
        )}
        {barcodeData && (
          <div>
            <h3>Thông tin Barcode:</h3>
            <p>{barcodeData}</p>
            {croppedBarcode && (
              <div>
                <h4>Barcode đã cắt:</h4>
                <img src={croppedBarcode} alt="Cropped Barcode" width="200" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
