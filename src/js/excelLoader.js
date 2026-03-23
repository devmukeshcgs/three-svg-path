import axios from "axios";
import * as XLSX from "xlsx";

export const fetchExcelData = async (url) => {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer", // IMPORTANT
    });

    const workbook = XLSX.read(response.data, {
      type: "array",
    });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json(sheet);

    return jsonData;
  } catch (error) {
    throw new Error("Failed to load Excel file");
  }
};