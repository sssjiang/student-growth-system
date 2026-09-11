const A4_MARGIN = 28;
const EXPORT_WIDTH = 1120;

const safeFilename = (filename) =>
  filename
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

export async function exportElementToPdf(element, filename, title) {
  if (!element) throw new Error('Missing PDF content');

  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  if (document.fonts?.ready) await document.fonts.ready;

  const canvas = await html2canvas(element, {
    backgroundColor: '#fafaf7',
    logging: false,
    scale: 2,
    useCORS: true,
    windowWidth: Math.max(EXPORT_WIDTH, element.scrollWidth),
  });
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - A4_MARGIN * 2;
  const contentHeight = pageHeight - A4_MARGIN * 2;
  const pdfScale = contentWidth / canvas.width;
  const sourcePageHeight = Math.floor(contentHeight / pdfScale);

  for (let sourceY = 0, page = 0; sourceY < canvas.height; page += 1) {
    const sliceHeight = Math.min(sourcePageHeight, canvas.height - sourceY);
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = sliceHeight;
    slice
      .getContext('2d')
      .drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight
      );

    if (page > 0) pdf.addPage();
    pdf.addImage(
      slice.toDataURL('image/png'),
      'PNG',
      A4_MARGIN,
      A4_MARGIN,
      contentWidth,
      sliceHeight * pdfScale,
      undefined,
      'FAST'
    );
    sourceY += sliceHeight;
  }

  pdf.setProperties({ title });
  pdf.save(`${safeFilename(filename)}.pdf`);
}
