const detectAndCropCodes = async (imageUrl) => {
  const img = new Image();
  img.src = imageUrl;
  await new Promise((resolve) => (img.onload = resolve));

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  let qrImage = null;
  let barcodeImage = null;

  // === 1. Phát hiện QR code bằng ZXing ===
  try {
    const qrReader = new BrowserMultiFormatReader();
    const result = await qrReader.decodeFromImageElement(img);
    const points = result.resultPoints;
    const [p1, p2] = points;

    const x = Math.min(p1.x, p2.x) - 20;
    const y = Math.min(p1.y, p2.y) - 20;
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

  // === 2. Phát hiện barcode bằng Quagga ===
  let barcodeBox = null;
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
        const x = Math.min(p1[0], p3[0]) - 10;
        const y = Math.min(p1[1], p3[1]) - 10;
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
