// Client-side PDF export: each element becomes one or more A4 pages.
// The libraries are loaded on demand so they do not weigh on first paint.

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 10;

export async function exportElementsToPdf(elements: HTMLElement[], fileName: string) {
  const [{ default: JsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas")]);
  const pdf = new JsPDF("p", "mm", "a4");
  const contentWidth = A4_WIDTH_MM - MARGIN_MM * 2;
  const contentHeight = A4_HEIGHT_MM - MARGIN_MM * 2;
  let firstPage = true;

  for (const element of elements) {
    const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" });
    // How many canvas pixels fit on one page, then slice tall days across pages
    // instead of cutting them off at the bottom of the first page.
    const pxPerMm = canvas.width / contentWidth;
    const pageHeightPx = Math.floor(contentHeight * pxPerMm);
    for (let offset = 0; offset < canvas.height; offset += pageHeightPx) {
      const sliceHeight = Math.min(pageHeightPx, canvas.height - offset);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = sliceHeight;
      const ctx = slice.getContext("2d");
      if (!ctx) continue;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, offset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      if (!firstPage) pdf.addPage();
      firstPage = false;
      pdf.addImage(slice.toDataURL("image/jpeg", 0.9), "JPEG", MARGIN_MM, MARGIN_MM, contentWidth, sliceHeight / pxPerMm);
    }
  }

  pdf.save(fileName);
}

/** Wait until React has painted newly mounted export markup. */
export const nextPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

export function safeFileName(value: string) {
  return value.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") || "Plan";
}
