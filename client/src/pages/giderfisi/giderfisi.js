import React, { useState, useRef, useEffect } from "react";
import Cropper from "react-cropper";
import { useNavigate } from "react-router-dom";
import "cropperjs/dist/cropper.css";
import "./giderfisi.css";
import axios from "axios";

const GiderFİsi = () => {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [result, setResult] = useState({});
  const [rawText, setRawText] = useState(""); // Store the full OCR text
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const cropperRef = useRef(null);

  const [cameraStream, setCameraStream] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);

  const [jsonResult, setJsonResult] = useState(""); // Store the JSON result

  const handleFileChange = (e) => {
    setFile(URL.createObjectURL(e.target.files[0]));
  };

  const handleBackHome = () => {
    navigate("/");
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch (error) {
      console.error("Kamera açılamadı:", error);
    }
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

    try {
      const formData = new FormData();
      formData.append("image", dataURLtoFile(croppedImage, "cropped-image.jpg"));

      const response = await axios.post("http://localhost:5000/ocr", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const rawText = response.data.text; // Full OCR text
      setRawText(rawText); // Store the raw text

      setResult(parseResult(rawText)); // Parse and store the result
    } catch (error) {
      console.error("Hata:", error);
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

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const parseResult = (text) => {
    const lines = text.split("\n");
    const data = {
      Unvan: "",
      Adres: "",
      VKN: "",
      TCKN: "",
      VergiDairesi: "",
      Tarih: "",
      FisNo: "",
      Topkdv: "",
      Toplam: "",
      KdvOrani: "",
    };

    let tempValue = ""; // Temporary variable to hold value if it's on the next line

    lines.forEach((line, index) => {
      // Skip lines with "*" in "TOPLAM" or "TOPKDV" titles
      if (line.match(/TOPLAM/i) && line.includes("*")) {
        return; // Skip this line if it contains an asterisk
      }
      if (line.match(/TOPLAMKDV/i) && line.includes("*")) {
        return; // Skip this line if it contains an asterisk
      }

      // Match for "TOPLAM" and capture value from the next line
      if (line.match(/TOPLAM|TOP|ARATOPLAM/i)) {
        const nextLine = lines[index + 1] || ""; // Get the next line (if it exists)
        const nextLineValue = nextLine.trim();
        // If the next line contains a value, use it as the "TOPLAM" value
        if (nextLineValue) {
          data.Toplam = nextLineValue;
        }
      }

      // Match for "TOPLAMKDV" and capture value from the next line only
      if (line.match(/TOPLAMKDV|KDV|kdv|TOPKDV|topkdv|topK/i)) {
        const nextLine = lines[index + 1] || ""; // Get the next line (if it exists)
        const nextLineValue = nextLine.trim();
        // If the next line contains a value, use it as the "TOPKDV" value
        if (nextLineValue) {
          data.Topkdv = nextLineValue;
        }
      }

      // Handle other fields parsing
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
        data.Tarih = line.match(/\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4}/)[0];
      } else if (line.match(/Fiş No|Fis No|Fis|Fi\$ No/i)) {
        data.FisNo = line.split(":")[1]?.trim() || "";
      }

      if (line.match(/NO\s*\d+/)) {
        const noValue = line.match(/NO\s*(\d+)/)?.[0];
        if (noValue) {
          data.Adres += " " + noValue;
        }
      }
    });

    // Return the parsed data
    return data;
  };

  const handleInputChange = (key, value) => {
    setResult((prevResult) => ({
      ...prevResult,
      [key]: value,
    }));
  };

  const convertToJson = () => {
    const jsonResult = JSON.stringify(result, null, 2);
    setJsonResult(jsonResult); // Store the JSON result to display it on the page
  };

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  return (
    <div className="containergiderfisi">
      <div className="left-boxgiderfisi">
        <h2>Gider Fişi</h2>
        <input type="file" onChange={handleFileChange} className="file-input" />

        <button onClick={openCamera} className="camera-button">
          Kamera Aç
        </button>

        {isCameraOpen && (
          <div className="camera-previewgiderfisi">
            <div className="video-containergiderfisi">
              <video ref={videoRef} autoPlay playsInline muted className="video-previewgiderfisi"></video>
            </div>
            <div className="camera-buttonsgiderfisi">
              <button onClick={capturePhoto} className="capture-buttongiderfisi">
                Fotoğraf Çek
              </button>
              <button onClick={closeCamera} className="close-camera-buttongiderfisi">
                Kapat
              </button>
            </div>
          </div>
        )}

        {file && (
          <>
            <div className="cropped-previewgiderfisi">
              <h3>Kırpılmış Görüntü</h3>
              <Cropper
                src={file}
                style={{ height: 200, width: "100%" }}
                ref={cropperRef}
                guides={true}
              />
            </div>

            <div className="original-previewgiderfisi" onClick={openModal}>
              <h3>Orijinal Görüntü</h3>
              <img src={file} alt="original" />
            </div>
          </>
        )}

        <button onClick={handleCropAndSubmit} className={`scan-buttongiderfisi ${isLoading ? "loading" : ""}`} disabled={isLoading}>
          {isLoading ? (
            <span className="loading-text">
              <span className="spinner"></span> Taranıyor...
            </span>
          ) : (
            "Taramayı Başlat"
          )}
        </button>
      </div>

      <div className="right-boxgiderfisi">
        <h2>Tarama Sonuçları</h2>
        <div className="result-boxgiderfisi">
          <table>
            <tbody>
              {Object.keys(result).map((key) => (
                <tr key={key}>
                  <td><strong>{key}</strong></td>
                  <td>
                    <input
                      type="text"
                      value={result[key]}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                      className="result-inputgiderfisi"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Convert to JSON button */}
        <button onClick={convertToJson} className="convert-json-button">
          JSON Formatına Çevir
        </button>

        {/* Display the JSON result */}
        {jsonResult && (
          <div className="json-result">
            <h3>JSON Çıktısı</h3>
            <pre>{jsonResult}</pre>
          </div>
        )}

        {/* Displaying the entire raw OCR text */}
        <div className="full-resultgiderfisi">
          <h3>Full OCR Text</h3>
          <pre>{rawText}</pre>
        </div>

        <button id="GiderFisiAnasayfa" onClick={handleBackHome} className="back-button">
          Ana Sayfa
        </button>
      </div>
    </div>
  );
};

export default GiderFİsi;
