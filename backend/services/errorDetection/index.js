const placeholderDetector = require('./placeholderDetector');
const formattingChecker = require('./formattingChecker');
const missingDataChecker = require('./missingDataChecker');
const checklistChecker = require('./checklistChecker');
const mlEnhancedDetector = require('./mlEnhancedDetector');
const { applyContextAwareErrorRescoring } = require('../trainingService');

const analyzeDocument = async (text, sections = [], options = {}) => {
  const errors = [];

  const placeholderErrors = placeholderDetector.detect(text);
  errors.push(...placeholderErrors);

  const formattingErrors = formattingChecker.detect(text);
  errors.push(...formattingErrors);

  const missingDataErrors = missingDataChecker.detect(text, sections, options.headerFields || {});
  errors.push(...missingDataErrors);

  const checklistErrors = checklistChecker.detect(text, sections);
  errors.push(...checklistErrors);

  try {
    const mlErrors = await mlEnhancedDetector.analyzeWithML(text, sections);
    errors.push(...mlErrors);

    const similarityErrors = await mlEnhancedDetector.findSimilarSections(sections);
    errors.push(...similarityErrors);
  } catch (error) {
    console.log('ML analysis skipped:', error.message);
  }

  const uniqueErrors = deduplicateErrors(errors);
  const groupedErrors = sortErrorsByType(uniqueErrors);
  const rescoredResult = await applyContextAwareErrorRescoring(groupedErrors);
  const finalErrors = sortErrorsByType(rescoredResult.errors);
  const errorSummary = buildErrorSummary(finalErrors);
  const timeSaved = calculateTimeSaved(finalErrors.length, text.length);

  return {
    errors: finalErrors,
    errorCount: finalErrors.length,
    errorSummary,
    timeSaved,
    contextAdjustments: rescoredResult.adjustments,
  };
};

const buildErrorSummary = (errors) => {
  const summary = {
    placeholder: 0,
    consistency: 0,
    compliance: 0,
    formatting: 0,
    missing_data: 0,
  };

  for (const err of errors) {
    if (summary[err.type] !== undefined) summary[err.type] += 1;
  }

  return summary;
};

const deduplicateErrors = (errors) => {
  const seen = new Set();
  return errors.filter((error) => {
    const originalText = (error.originalText || '').substring(0, 40).toLowerCase();
    const lineStart = error.location?.lineStart || 0;
    const key = `${error.type}-${originalText}-${lineStart}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const sortErrorsByType = (errors) => {
  const typeOrder = {
    placeholder: 0,
    consistency: 1,
    compliance: 2,
    formatting: 3,
    missing_data: 4,
  };

  return [...errors].sort((a, b) => {
    const orderA = typeOrder[a.type] ?? 99;
    const orderB = typeOrder[b.type] ?? 99;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    const sevOrder = { high: 0, medium: 1, low: 2 };
    const sevA = sevOrder[a.severity] ?? 99;
    const sevB = sevOrder[b.severity] ?? 99;
    
    if (sevA !== sevB) {
      return sevA - sevB;
    }

    return (a.message || '').localeCompare(b.message || '');
  });
};

const calculateTimeSaved = (errorCount, textLength) => {
  const baseMinutes = Math.ceil(textLength / 1000) * 2;
  const errorMinutes = errorCount * 0.5;
  return Math.round(baseMinutes + errorMinutes);
};

module.exports = { analyzeDocument };
