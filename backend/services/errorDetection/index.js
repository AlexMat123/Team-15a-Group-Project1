const placeholderDetector = require('./placeholderDetector');
const formattingChecker = require('./formattingChecker');
const missingDataChecker = require('./missingDataChecker');

const analyzeDocument = async (text, sections = []) => {
  const errors = [];

  const placeholderErrors = placeholderDetector.detect(text);
  errors.push(...placeholderErrors);

  const formattingErrors = formattingChecker.detect(text);
  errors.push(...formattingErrors);

  const missingDataErrors = missingDataChecker.detect(text, sections);
  errors.push(...missingDataErrors);

  const uniqueErrors = deduplicateErrors(errors);

  const timeSaved = calculateTimeSaved(uniqueErrors.length, text.length);

  return {
    errors: uniqueErrors,
    errorCount: uniqueErrors.length,
    timeSaved,
  };
};

const deduplicateErrors = (errors) => {
  const seen = new Set();
  return errors.filter((error) => {
    const key = `${error.type}-${error.originalText}-${error.location?.section || ''}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
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
