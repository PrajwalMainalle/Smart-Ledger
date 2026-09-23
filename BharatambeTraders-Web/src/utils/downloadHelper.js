/**
 * Triggers direct browser file download for a PDF URL without opening a new tab.
 * @param {string} pdfUrl - The API URL for the PDF stream.
 * @param {string} filename - The suggested filename for saved PDF.
 */
export const downloadPdfFile = async (pdfUrl, filename = "document.pdf") => {
  if (!pdfUrl) return;

  // Split off any hash fragment (#toolbar=0&navpanes=0...)
  const [baseAndQuery] = pdfUrl.split("#");
  const hasParams = baseAndQuery.includes("?");
  
  let downloadUrl = baseAndQuery;
  if (!baseAndQuery.includes("download=true")) {
    downloadUrl += (hasParams ? "&" : "?") + "download=true";
  }

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`HTTP error status ${response.status}`);
    }
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.style.display = "none";
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(link);
    }, 1000);
  } catch (err) {
    console.error("Direct blob download failed, falling back to window location/download link:", err);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
