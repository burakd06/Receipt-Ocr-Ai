import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import "./zraporu.css";
import axios from "axios";
import JsonToExcel from "../components/JsonToExcel";

const Zrapor = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [currentCamera, setCurrentCamera] = useState(null);
  const [cameras, setCameras] = useState([]);
  const videoRef = useRef(null);
  const cropperRef = useRef(null);
  const [result, setResult] = useState({
    Unvan: "",
    Adres: "",
    Tarih: [],
    ZNo: [],
    Toplam: [],
    Topkdv: [],
  });
  const [rawText, setRawText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // kamera
  const [errorMessage, setErrorMessage] = useState(""); // scan error
  const [jsonOutput, setJsonOutput] = useState(""); // JSON çıktısı için state

  const handleFileChange = (e) => {
    setFile(URL.createObjectURL(e.target.files[0]));
  };

  const handleBackHome = () => {
    navigate("/");
  };

  const getCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === "videoinput");
      setCameras(videoDevices);
      if (videoDevices.length > 0) {
        setCurrentCamera(videoDevices[0].deviceId); // İlk kamerayı varsayılan olarak seç
      }
    } catch (error) {
      console.error("Kameralar alınamadı:", error);
    }
  };

  const openCamera = async (deviceId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch (error) {
      console.error("Kamera açılamadı:", error);
    }
  };

  const switchCamera = () => {
    if (cameras.length < 2) return; // Eğer sadece bir kamera varsa, geçiş yapma
    const nextCamera = cameras.find(cam => cam.deviceId !== currentCamera);
    setCurrentCamera(nextCamera.deviceId);
    openCamera(nextCamera.deviceId);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL("image/jpeg");
      setFile(imageData);
      closeCamera();
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const handleCropAndSubmit = async () => {
    if (!cropperRef.current) return;

    const croppedCanvas = cropperRef.current.cropper.getCroppedCanvas();
    const croppedImage = croppedCanvas.toDataURL("image/jpeg");

    setIsLoading(true);
    setErrorMessage(""); // Önceki hatayı temizle

    try {
      const formData = new FormData();
      formData.append("image", dataURLtoFile(croppedImage, "cropped-image.jpg"));

      const ocrApiUrl = process.env.REACT_APP_OCR_API_URL;

      const response = await axios.post(ocrApiUrl, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const rawText = response.data.text;
      setRawText(rawText);  // OCR sonucunu rawText'e kaydet

      setResult(parseResult(rawText));
    } catch (error) {
      console.error("Hata:", error);
      setErrorMessage("Tarama başarısız oldu. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  const dataURLtoFile = (dataurl, filename) => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const parseResult = (text) => {
    const lines = text.split("\n");
    const data = {
      Unvan: "",
      Adres: "",
      VKN: "",
      TCKN: "",
      VergiDairesi: "",
      Tarih: [],
      ZNo: [],
      Toplam: [],
      Topkdv: [],
    };

    lines.forEach((line, index) => {
      if (line.match(/TOPLAM/i) && line.includes("*")) {
        return;
      }
      if (line.match(/TOPLAMKDV/i) && line.includes("*")) {
        return;
      }

      if (line.match(/^(Z|Z NO|Z no|Z numarası|Z RAPOR)/i)) {
        const zNoValue = line.split(":")[1]?.trim() || line.trim();
        data.ZNo.push(zNoValue);
      }

      if (line.match(/TOPLAM|TOP|ARATOPLAM/i)) {
        const nextLine = lines[index + 1] || "";
        const nextLineValue = nextLine.trim();
        if (nextLineValue) {
          data.Toplam.push(nextLineValue);
        }
      }

      if (line.match(/TOPLAMKDV|KDV|kdv|TOPKDV|topkdv|topK/i)) {
        const nextLine = lines[index + 1] || "";
        const nextLineValue = nextLine.trim();
        if (nextLineValue) {
          data.Topkdv.push(nextLineValue);
        }
      }

      if (line.match(/SAN./i)) {
        data.Unvan = line.trim();
      } else if (line.match(/Adres|MH\.|CD/i)) {
        data.Adres += line.trim() + " ";
      } else if (line.match(/\b\d{10}\b/)) {
        data.VKN = line.match(/\b\d{10}\b/)[0];
      } else if (line.match(/\b\d{11}\b/)) {
        data.TCKN = line.match(/\b\d{11}\b/)[0];
      } else if (line.match(/Vergi Dairesi|VD|vd/i)) {
        const matchVergiDairesi = line.match(/(\S+)\s*(VD|vd)\.?/i);
        if (matchVergiDairesi) {
          data.VergiDairesi = matchVergiDairesi[1];
        }
      } else if (line.match(/\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4}/)) {
        const foundDate = line.match(/\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4}/)[0];
        if (foundDate) {
          data.Tarih.push(foundDate);
        }
      }
    });

    return data;
  };

  const handleInputChange = (key, value, index) => {
    const updatedData = { ...result };
    updatedData[key][index] = value;
    setResult(updatedData);
  };

  const convertToJson = () => {
    const jsonResult = JSON.stringify(result, null, 2); // JSON formatında düzenleme
    setJsonOutput(jsonResult); // JSON çıktısını state'e kaydet
  };

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
    getCameras();
  }, [cameraStream]);

  return (
    <div className="containerzrapor">
      <div className="left-boxzrapor">
        <h2>Z Raporu </h2>
        <input type="file" onChange={handleFileChange} className="file-input" />
        <button onClick={() => openCamera(currentCamera)} className="camera-buttonzrapor">
          Kamera Aç
        </button>

        {isCameraOpen && (
          <div className="camera-previewzrapor">
            <div className="video-containezraporr">
              <video ref={videoRef} autoPlay playsInline muted className="video-previewzrapor"></video>
            </div>
            <div className="camera-buttonszrapor">
              <button onClick={capturePhoto} className="capture-buttonzrapor">
                Fotoğraf Çek
              </button>
              <button onClick={closeCamera} className="close-camera-buttonzrapor">
                Kapat
              </button>
            </div>
            {cameras.length > 1 && (
              <button onClick={switchCamera} className="switch-camera-button">
                Kamerayı Değiştir
              </button>
            )}
          </div>
        )}

        {file && (
          <>
            <div className="cropped-previewzrapor">
              <h3>Kırpılmış Görüntü</h3>
              <Cropper
                src={file}
                style={{ height: 200, width: "100%" }}
                ref={cropperRef}
                guides={true}
              />
            </div>

            <div className="original-previewzrapor" onClick={() => setIsModalOpen(true)}>
              <h3>Orijinal Görüntü</h3>
              <img src={file} alt="original" />
            </div>
          </>
        )}

        <button
          onClick={handleCropAndSubmit}
          className={`scan-buttonzrapor ${isLoading ? "loading" : ""}`}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="loading-textzrapor">
              <span className="spinner"></span> Taranıyor...
            </span>
          ) : (
            "Taramayı Başlat"
          )}
        </button>
        {errorMessage && (
          <div className="z-raporu-error-message">
            <p>{errorMessage}</p>
          </div>
        )}
      </div>

      <div className="right-boxzrapor">
        <h2>Tarama Sonuçları</h2>
        <div className="result-info">
          <p><strong>Unvan:</strong> {result.Unvan}</p>
          <p><strong>Adres:</strong> {result.Adres}</p>
          <p><strong>Z no:</strong> {result.ZNo}</p>
          <p><strong>Toplam:</strong> {result.Toplam}</p>
          <p><strong>KDV:</strong> {result.Topkdv}</p>
          <div>
            <strong>Tarih:</strong>
            <ul>
              {result.Tarih.map((tarih, index) => (
                <li key={index}>{tarih}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="result-boxzrapor">
          <table>
            <thead>
              <tr>
                <th>Z No Sıralama</th>
                <th>Z No</th>
                <th>Toplam</th>
                <th>KDV</th>
                <th>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {result.ZNo.map((zNo, index) => (
                <tr key={index}>
                  <td><strong>Z No {index + 1}</strong></td>
                  <td>
                    <input
                      type="text"
                      value={zNo}
                      onChange={(e) => handleInputChange("ZNo", e.target.value, index)}
                      className="result-inputzrapor"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={result.Toplam[index] || ""}
                      onChange={(e) => handleInputChange("Toplam", e.target.value, index)}
                      className="result-inputzrapor"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={result.Topkdv[index] || ""}
                      onChange={(e) => handleInputChange("Topkdv", e.target.value, index)}
                      className="result-inputzrapor"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={result.Tarih[index] || ""}
                      onChange={(e) => handleInputChange("Tarih", e.target.value, index)}
                      className="result-inputzrapor"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={convertToJson} className="json-buttonzrapor">JSON Çıktısı</button>
        <div className="json-output">
          <pre>{jsonOutput}</pre>
          <JsonToExcel jsonData={[result]} fileName="Zraporu.xlsx" />
        </div>

        <div className="ocr-output">
          <h3>OCR Sonucu:</h3>
          <p>{rawText}</p>
        </div>
        <button id="zraporAnasayfa" onClick={handleBackHome} className="back-button">
          Ana Sayfa
        </button>
      </div>
    </div>
  );
};

export default Zrapor;
