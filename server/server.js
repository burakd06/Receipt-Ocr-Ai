// .env dosyasındaki ayarları yükle
require('dotenv').config();

const express = require("express");
const multer = require("multer");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();

// .env dosyasından port ve upload dizini gibi ayarları al
const port = process.env.PORT || 5002;
const uploadDir = process.env.UPLOAD_DIR || "uploads";
const ocrApiUrl = process.env.OCR_API_URL || "http://localhost:5001/ocr";

// CORS izinleri
app.use(cors());

// Multer ile dosya yükleme işlemi
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

app.post("/ocr", upload.single("image"), async (req, res) => {
  const filePath = req.file.path;
  
  // Dosyayı form-data olarak gönderiyoruz
  const formData = new FormData();
  formData.append("image", fs.createReadStream(filePath));

  try {
    // Python OCR API'ye dosyayı gönderme
    const response = await axios.post(ocrApiUrl, formData, {
      headers: formData.getHeaders(),
    });

    // OCR sonucunu döndürme
    res.json({ text: response.data.text });

    // Yüklenen dosyayı silme
    fs.unlinkSync(filePath);
  } catch (error) {
    console.error("OCR işlemi sırasında hata:", error);
    res.status(500).send("OCR işlemi sırasında bir hata oluştu.");
  }
});

// Sunucu başlatma
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
