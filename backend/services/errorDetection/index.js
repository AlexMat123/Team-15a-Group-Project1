const placeholderDetector = require('./placeholderDetector');
const formattingChecker = require('./formattingChecker');
const missingDataChecker = require('./missingDataChecker');
const mlEnhancedDetector = require('./mlEnhancedDetector');

const analyzeDocument = async (text, sections = []) => {
  const errors = [];

  const placeholderErrors = placeholderDetector.detect(text);
  errors.push(...placeholderErrors);

  const formattingErrors = formattingChecker.detect(text);
  errors.push(...formattingErrors);

  const missingDataErrors = missingDataChecker.detect(text, sections);
  errors.push(...missingDataErrors);

  try {
    const mlErrors = await mlEnhancedDetector.analyzeWithML(text, sections);
    errors.push(...mlErrors);

    const similarityErrors = await mlEnhancedDetector.findSimilarSections(sections);
    errors.push(...similarityErrors);
  } catch (error) {
    console.log('ML analysis skipped:', error.message);
  }

  const uniqueErrors = deduplicateErrors(errors);

  const sortedErrors = sortErrorsBySeverity(uniqueErrors);

  const timeSaved = calculateTimeSaved(sortedErrors.length, text.length);

  return {
    errors: sortedErrors,
    errorCount: sortedErrors.length,
    timeSaved,
  };
};

const deduplicateErrors = (errors) => {
  const seen = new Set();
  return errors.filter((error) => {
    const key = `${error.type}-${error.message.substring(0, 50)}-${error.location?.section || ''}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const sortErrorsBySeverity = (errors) => {
  const severityOrder = { high: 0, medium: 1, low: 2 };
  return errors.sort((a, b) => {
    return (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
  });
};

const calculateTimeSaved = (errorCount, textLength) => {
  const baseMinutes = Math.ceil(textLength / 1000) * 2;
  const errorMinutes = errorCount * 0.5;
  return Math.round(baseMinutes + errorMinutes);
};

module.exports = {
  analyzeDocument,
};
