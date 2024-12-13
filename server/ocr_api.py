from flask import Flask, request, jsonify
from paddleocr import PaddleOCR
from PIL import Image
import cv2
import numpy as np

app = Flask(__name__)


ocr = PaddleOCR(use_angle_cls=True, lang='tr') 


def process_image(image_path):
    
    img = cv2.imread(image_path)# Görüntüyü yükle
    
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
    
   
    processed_img = cv2.fastNlMeansDenoising(thresh, None, 30, 7, 21)
    
 
    cv2.imwrite('processed_image.png', processed_img)
    
    return processed_img

#aynı satırı aynı satırda yazdırma fonksiyonu
def group_text_by_lines(ocr_result, y_margin=10):
    """
    OCR sonuçlarını satırlara gruplar ve birleştirir.
    """
    lines = []
    for box, content in ocr_result:
        x1, y1 = box[0]  # Sol üst köşe
        x2, y2 = box[2]  # Sağ alt köşe
        text = content[0]  # Metin

        # Mevcut satırlarda bu koordinata yakın bir satır var mı kontrol et
        added = False
        for line in lines:
            if abs(line['y'] - y1) <= y_margin:  # Tolerans içinde mi?
                line['texts'].append((x1, text))  # Metni x1'e göre ekle
                added = True
                break

        
        if not added:
            lines.append({'y': y1, 'texts': [(x1, text)]})

    # Her satırdaki metinleri x1'e göre sıralayıp birleştir
    sorted_lines = []
    for line in lines:
        sorted_texts = sorted(line['texts'], key=lambda t: t[0])  # x1'e göre sırala
        combined_text = " ".join([t[1] for t in sorted_texts])
        sorted_lines.append(combined_text)

    return sorted_lines

@app.route('/ocr', methods=['POST'])
def ocr_process():
    try:
       
        image_path = request.json['image_path'] # Resim yolu al
        
      
        processed_image = process_image(image_path)
        
        # OCR işlemi
        result = ocr.ocr(processed_image, cls=True)

        # Sonuçlar
        detected_text = "\n".join([line[1][0] for line in result[0]])
        return jsonify({"text": detected_text})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001)
