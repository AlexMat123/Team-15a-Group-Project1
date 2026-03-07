const fs = require('fs');
const pdfParse = require('pdf-parse');

const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    
    return {
      text: data.text,
      numPages: data.numpages,
      info: data.info,
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
};

const extractSections = (text) => {
  const sections = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  let currentSection = {
    title: 'Document Start',
    content: [],
    startLine: 0,
  };
  
  const sectionPatterns = [
    /^(\d+\.?\s+[A-Z][A-Za-z\s]+)/,
    /^(Section\s+\d+[.:]\s*.+)/i,
    /^([A-Z][A-Z\s]{2,}:?)$/,
    /^(\d+\.\d+\.?\s+.+)/,
  ];
  
  lines.forEach((line, index) => {
    let isNewSection = false;
    
    for (const pattern of sectionPatterns) {
      if (pattern.test(line.trim())) {
        if (currentSection.content.length > 0) {
          sections.push({
            ...currentSection,
            content: currentSection.content.join('\n'),
          });
        }
        
        currentSection = {
          title: line.trim(),
          content: [],
          startLine: index,
        };
        isNewSection = true;
        break;
      }
    }
    
    if (!isNewSection) {
      currentSection.content.push(line);
    }
  });
  
  if (currentSection.content.length > 0) {
    sections.push({
      ...currentSection,
      content: currentSection.content.join('\n'),
    });
  }
  
  return sections;
};

const estimateReadTime = (text) => {
  const words = text.split(/\s+/).length;
  const wordsPerMinute = 200;
  return Math.ceil(words / wordsPerMinute);
};

const processDocument = async (filePath) => {
  const extraction = await extractTextFromPDF(filePath);
  const sections = extractSections(extraction.text);
  const readTimeMinutes = estimateReadTime(extraction.text);
  
  return {
    text: extraction.text,
    numPages: extraction.numPages,
    info: extraction.info,
    sections,
    readTimeMinutes,
    wordCount: extraction.text.split(/\s+/).length,
  };
};

module.exports = {
  extractTextFromPDF,
  extractSections,
  estimateReadTime,
  processDocument,
};
