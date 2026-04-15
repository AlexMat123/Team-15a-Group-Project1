const pdfLib = require('pdf-lib');
const fs = require('fs');
const pdfParse = require('pdf-parse');

const ERROR_COLORS = {
  placeholder: { r: 1, g: 0.8, b: 0.2 },
  consistency: { r: 0.4, g: 0.6, b: 1 },
  compliance: { r: 1, g: 0.4, b: 0.4 },
  formatting: { r: 0.8, g: 0.5, b: 1 },
  missing_data: { r: 0.4, g: 0.9, b: 0.5 },
};

const ERROR_LABELS = {
  placeholder: 'Placeholder',
  consistency: 'Consistency',
  compliance: 'Compliance',
  formatting: 'Formatting',
  missing_data: 'Missing Data',
};

const PLACEHOLDER_REGEXES = [
  /X{2,}/g,
  /x{3,}/g,
  /\*{2,}/g,
  /_{3,}/g,
  /#{3,}/g,
  /\?{3,}/g,
  /\.{4,}/g,
  /\[[A-Z][A-Za-z\s_\/]{1,30}\]/g,
  /\[[a-z][a-z\s_]{2,}\]/g,
  /\[INSERT[^\]]*\]/gi,
  /\[ADD[^\]]*\]/gi,
  /\[ENTER[^\]]*\]/gi,
  /\[DATE[^\]]*\]/gi,
  /\[NAME[^\]]*\]/gi,
  /\[ADDRESS[^\]]*\]/gi,
  /\b(TBD|TBA|TODO|TBC)\b/g,
  /\bN\/A\b/g,
];

const ALLOWED_SECTIONS = [1, 5, 6, 8, 9];
const FIRST_CONTENT_PAGE = 4;

const getSectionNumber = (sectionText) => {
  if (!sectionText) return null;
  const match = sectionText.match(/^(\d+)/) || sectionText.match(/(\d+)\./);
  if (match) return parseInt(match[1], 10);
  const keywords = {
    'summary': 1, 'header': 1, 'document': 1, 'competent': 2,
    'introduction': 3, 'terms': 4, 'definitions': 4, 'premises': 5,
    'fire hazards': 6, 'hazard': 6, 'management': 7,
    'fire risk': 8, 'risk assessment': 8, 'action plan': 9,
    'recommendations': 9, 'actions': 9,
  };
  const lower = (sectionText || '').toLowerCase();
  for (const [kw, num] of Object.entries(keywords)) {
    if (lower.includes(kw)) return num;
  }
  return null;
};

const isInAllowedSection = (error) => {
  const section = error.location?.section || '';
  const num = getSectionNumber(section);
  return num !== null && ALLOWED_SECTIONS.includes(num);
};

const getCorrectErrorType = (error) => {
  const orig = error.originalText || '';
  for (const pat of PLACEHOLDER_REGEXES) {
    const r = new RegExp(pat.source, pat.flags);
    if (r.test(orig)) return 'placeholder';
  }
  return error.type || 'placeholder';
};

const truncateText = (text, max) => {
  const s = String(text || '').replace(/[^\x20-\x7E]/g, '').trim();
  return s.length <= max ? s : s.substring(0, max - 3) + '...';
};

const textMatchesPlaceholder = (text) => {
  if (!text || text.length < 2) return false;
  for (const pat of PLACEHOLDER_REGEXES) {
    const r = new RegExp(pat.source, pat.flags);
    if (r.test(text)) return true;
  }
  return false;
};

const extractAllTextItems = async (pdfBuffer) => {
  const pageItems = {};
  let currentPage = 0;

  await pdfParse(pdfBuffer, {
    max: 200,
    pagerender: async (pageData) => {
      currentPage++;
      try {
        const textContent = await pageData.getTextContent();
        const viewport = pageData.getViewport({ scale: 1.0 });
        const items = [];

        for (const item of textContent.items) {
          if (!item.str || !item.str.trim()) continue;
          items.push({
            text: item.str,
            transform: item.transform,
            width: item.width || item.str.length * 5,
            vpHeight: viewport.height,
          });
        }

        pageItems[currentPage] = items;
      } catch (e) {
        console.log(`    Page ${currentPage}: extraction error - ${e.message}`);
      }
      return '';
    },
  }).catch(() => {});

  return { pageItems, totalPages: currentPage };
};

const generateAnnotatedPdf = async (report) => {
  const pdfBytes = fs.readFileSync(report.filePath);
  const pdfDoc = await pdfLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pdfLibPages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(pdfLib.StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(pdfLib.StandardFonts.HelveticaBold);
  const totalPages = pdfLibPages.length;

  const allErrors = report.errors.map(e => e.toObject ? e.toObject() : e);
  const filtered = allErrors.filter(isInAllowedSection);

  console.log(`\n=== PDF Annotation ===`);
  console.log(`Pages: ${totalPages}, Errors total: ${allErrors.length}, Filtered for sections ${ALLOWED_SECTIONS.join(',')}: ${filtered.length}`);

  const { pageItems } = await extractAllTextItems(pdfBytes);
  const extractedPageNums = Object.keys(pageItems).map(Number).sort((a, b) => a - b);
  console.log(`  Text extracted from ${extractedPageNums.length} pages (max: ${Math.max(...extractedPageNums, 0)})`);

  let highlightIndex = 0;

  for (let pageNum = FIRST_CONTENT_PAGE; pageNum <= totalPages; pageNum++) {
    const items = pageItems[pageNum];
    if (!items || items.length === 0) {
      if (pageNum >= 13) console.log(`    Page ${pageNum}: no text items extracted`);
      continue;
    }

    const pageIdx = pageNum - 1;
    if (pageIdx >= pdfLibPages.length) continue;

    const page = pdfLibPages[pageIdx];
    const { width: pageW, height: pageH } = page.getSize();
    let pageHighlights = 0;

    for (const item of items) {
      if (!textMatchesPlaceholder(item.text)) continue;

      const tx = item.transform[4];
      const ty = item.transform[5];
      const fontSize = Math.abs(item.transform[3]) || Math.abs(item.transform[0]) || 10;
      const w = Math.max(item.width || 20, 20);
      const h = fontSize + 4;

      const drawX = Math.max(tx, 2);
      const drawY = ty;
      const drawW = Math.min(Math.max(w, 15), pageW - drawX - 5);
      const drawH = Math.max(h, 10);

      if (isNaN(drawX) || isNaN(drawY) || isNaN(drawW) || isNaN(drawH)) continue;
      if (drawX < 0 || drawY < 0 || drawX > pageW || drawY > pageH) continue;

      highlightIndex++;
      pageHighlights++;

      page.drawRectangle({
        x: drawX,
        y: drawY - 2,
        width: drawW,
        height: drawH,
        color: pdfLib.rgb(1, 0.8, 0.2),
        opacity: 0.35,
      });

      const cx = Math.max(drawX - 12, 3);
      const cy = drawY + drawH / 2 - 2;
      page.drawCircle({
        x: cx, y: cy, size: 7,
        color: pdfLib.rgb(0.8, 0.64, 0.16),
        opacity: 0.9,
      });
      page.drawText(`${highlightIndex}`, {
        x: highlightIndex > 9 ? cx - 4 : cx - 2.5,
        y: cy - 3,
        size: 6, font: boldFont, color: pdfLib.rgb(0, 0, 0),
      });

      if (highlightIndex <= 15) {
        console.log(`    pg${pageNum} #${highlightIndex}: "${item.text.substring(0, 25)}" at (${drawX.toFixed(1)}, ${drawY.toFixed(1)}) w=${drawW.toFixed(1)} vpH=${(item.vpHeight||0).toFixed(0)} pgH=${pageH.toFixed(0)}`);
      }
    }

    if (pageHighlights > 0) {
      console.log(`    Page ${pageNum}: ${pageHighlights} placeholders highlighted`);
    }
  }

  console.log(`  Total highlights drawn: ${highlightIndex}`);

  // --- Summary pages ---
  let sumPage = pdfDoc.addPage([612, 792]);
  const { width: pw, height: ph } = sumPage.getSize();
  let y = ph - 50;

  sumPage.drawRectangle({ x: 0, y: ph - 80, width: pw, height: 80, color: pdfLib.rgb(0.15, 0.15, 0.25) });
  sumPage.drawText('QC Error Summary', { x: 40, y: ph - 50, size: 24, font: boldFont, color: pdfLib.rgb(1, 1, 1) });
  sumPage.drawText(truncateText(report.filename, 70), { x: 40, y: ph - 70, size: 10, font, color: pdfLib.rgb(0.7, 0.7, 0.7) });

  y = ph - 110;
  sumPage.drawText(`Placeholders highlighted: ${highlightIndex} | Errors in report: ${allErrors.length}`, {
    x: 40, y, size: 14, font: boldFont, color: pdfLib.rgb(0.6, 0.1, 0.1),
  });

  y -= 40;
  const summary = {};
  filtered.forEach(e => {
    const ct = getCorrectErrorType(e);
    summary[ct] = (summary[ct] || 0) + 1;
  });

  let xOff = 40;
  for (const [type, count] of Object.entries(summary)) {
    const c = ERROR_COLORS[type] || ERROR_COLORS.placeholder;
    const cr = Number(c.r) || 0.5;
    const cg = Number(c.g) || 0.5;
    const cb = Number(c.b) || 0.5;
    sumPage.drawRectangle({
      x: xOff, y: y - 20, width: 80, height: 25,
      color: pdfLib.rgb(cr, cg, cb), opacity: 0.3,
      borderColor: pdfLib.rgb(cr, cg, cb), borderWidth: 1,
    });
    sumPage.drawText(`${count} ${ERROR_LABELS[type] || type}`, {
      x: xOff + 5, y: y - 12, size: 8, font: boldFont,
      color: pdfLib.rgb(cr * 0.7, cg * 0.7, cb * 0.7),
    });
    xOff += 90;
    if (xOff > pw - 100) { xOff = 40; y -= 35; }
  }

  y -= 50;
  sumPage.drawText('Error Details:', { x: 40, y, size: 12, font: boldFont, color: pdfLib.rgb(0.2, 0.2, 0.2) });
  y -= 20;

  const addPage = () => { sumPage = pdfDoc.addPage([612, 792]); y = ph - 50; return sumPage; };

  filtered.forEach((error, idx) => {
    if (y < 80) sumPage = addPage();
    const ct = getCorrectErrorType(error);
    const c = ERROR_COLORS[ct] || ERROR_COLORS.placeholder;
    const cr = Number(c.r) || 0.5;
    const cg = Number(c.g) || 0.5;
    const cb = Number(c.b) || 0.5;

    sumPage.drawRectangle({
      x: 40, y: y - 40, width: pw - 80, height: 45,
      color: pdfLib.rgb(0.97, 0.97, 0.97),
      borderColor: pdfLib.rgb(cr, cg, cb), borderWidth: 1,
    });
    sumPage.drawText(`#${idx + 1} [${ERROR_LABELS[ct] || 'Error'}]`, {
      x: 50, y: y - 12, size: 9, font: boldFont, color: pdfLib.rgb(cr, cg, cb),
    });
    sumPage.drawText(truncateText(error.message || '', 65), {
      x: 130, y: y - 12, size: 9, font, color: pdfLib.rgb(0.2, 0.2, 0.2),
    });

    let detail = '';
    if (error.location?.section) detail += `Section: ${truncateText(error.location.section, 20)}  `;
    if (error.location?.lineStart) detail += `Line: ${error.location.lineStart}`;
    if (detail) sumPage.drawText(detail, { x: 50, y: y - 26, size: 7, font, color: pdfLib.rgb(0.5, 0.5, 0.5) });

    if (error.originalText) {
      sumPage.drawText(truncateText(`"${error.originalText}"`, 75), {
        x: 50, y: y - 36, size: 7, font, color: pdfLib.rgb(0.5, 0.3, 0.3),
      });
    }
    y -= 52;
  });

  console.log('=== Done ===\n');
  return Buffer.from(await pdfDoc.save());
};

module.exports = { generateAnnotatedPdf };
