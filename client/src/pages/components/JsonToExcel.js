import React from "react";
import * as XLSX from "xlsx";


const flattenData = (data) => {
  return data.map((item) => {
    const maxLength = Math.max(item.Tarih.length, item.ZNo.length, item.Toplam.length, item.Topkdv.length);

   
    const flattenedRows = [];
    for (let i = 0; i < maxLength; i++) {
      flattenedRows.push({
        Unvan: item.Unvan || "",  
        Adres: item.Adres || "", 
        VKN: item.VKN || "",      
        TCKN: item.TCKN || "",    
        VergiDairesi: item.VergiDairesi || "",  
        Tarih: item.Tarih[i] || "",  
        ZNo: item.ZNo[i] || "",     
        Toplam: item.Toplam[i] || "",  
        Topkdv: item.Topkdv[i] || "",  
      });
    }
    return flattenedRows;
  }).flat();  
};

const JsonToExcel = ({ jsonData, fileName }) => {
  const exportToExcel = () => {
    const flattenedData = flattenData(jsonData); // Veriyi düzleştirmek
    const worksheet = XLSX.utils.json_to_sheet(flattenedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, fileName || "data.xlsx");
  };

  return (
    <button onClick={exportToExcel} className="excel-export-button">
      Excel'e Çevir
    </button>
  );
};

export default JsonToExcel;
