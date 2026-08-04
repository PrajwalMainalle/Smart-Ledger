import * as XLSX from "xlsx";

/**
 * Utility to export structured datasets to genuine Excel (.xlsx) files.
 * @param {Object} options
 * @param {string} options.fileName - The output filename without extension
 * @param {Array<{sheetName: string, data: Array<Array<any>>}>} options.sheets - List of sheets with AOA data
 */
export const exportToExcel = ({ fileName, sheets }) => {
  try {
    const workbook = XLSX.utils.book_new();

    sheets.forEach(({ sheetName, data }) => {
      const worksheet = XLSX.utils.aoa_to_sheet(data);

      // Compute auto column widths
      const colWidths = [];
      data.forEach((row) => {
        if (Array.isArray(row)) {
          row.forEach((cell, colIdx) => {
            const strVal = cell !== null && cell !== undefined ? String(cell) : "";
            colWidths[colIdx] = Math.max(colWidths[colIdx] || 12, strVal.length + 3);
          });
        }
      });

      worksheet["!cols"] = colWidths.map((w) => ({ wch: Math.min(w, 50) }));

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || "Report");
    });

    // Write file directly as .xlsx
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } catch (error) {
    console.error("Failed to export Excel file:", error);
    alert("Failed to generate Excel file. Please try again.");
  }
};
