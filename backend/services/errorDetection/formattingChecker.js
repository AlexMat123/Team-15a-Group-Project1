const patterns = [
  {
    name: 'Inconsistent date format',
    regex: /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/g,
    severity: 'low',
    suggestion: 'Use consistent date format (e.g., 8th July 2022)',
  },
  {
    name: 'Double spaces',
    regex: /  +/g,
    severity: 'low',
    suggestion: 'Remove extra spaces',
  },
  {
    name: 'Missing space after period',
    regex: /\.[A-Z]/g,
    severity: 'low',
    suggestion: 'Add space after period',
  },
  {
    name: 'Inconsistent bullet points',
    regex: /^[\s]*[-•*]\s/gm,
    severity: 'low',
    suggestion: 'Use consistent bullet point style',
    skipCount: true,
  },
  {
    name: 'Empty parentheses',
    regex: /\(\s*\)/g,
    severity: 'medium',
    suggestion: 'Remove empty parentheses or add content',
  },
  {
    name: 'Incomplete sentence',
    regex: /[a-z]\s*$/gm,
    severity: 'low',
    suggestion: 'Sentence may be incomplete - check punctuation',
    skipCount: true,
  },
  {
    name: 'Multiple consecutive punctuation',
    regex: /[.!?]{2,}/g,
    severity: 'low',
    suggestion: 'Remove duplicate punctuation',
  },
];

const detect = (text) => {
  const errors = [];
  const lines = text.split('\n');
  const reportedPatterns = new Set();

  patterns.forEach((pattern) => {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let matchCount = 0;

    while ((match = regex.exec(text)) !== null) {
      matchCount++;
      
      if (pattern.skipCount && matchCount > 3) {
        continue;
      }

      if (matchCount > 5) {
        if (!reportedPatterns.has(pattern.name)) {
          reportedPatterns.add(pattern.name);
          errors.push({
            type: 'formatting',
            severity: pattern.severity,
            message: `Multiple instances of ${pattern.name.toLowerCase()} found (${matchCount}+ occurrences)`,
            location: {
              section: 'Multiple locations',
            },
            suggestion: pattern.suggestion,
            originalText: `${matchCount}+ instances`,
          });
        }
        continue;
      }

      const beforeMatch = text.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;
      const section = findSection(lines, lineNumber);

      errors.push({
        type: 'formatting',
        severity: pattern.severity,
        message: pattern.name,
        location: {
          section: section,
          lineStart: lineNumber,
        },
        suggestion: pattern.suggestion,
        originalText: match[0].substring(0, 50),
      });
    }
  });

  return errors;
};

const findSection = (lines, lineNumber) => {
  for (let i = lineNumber - 1; i >= 0; i--) {
    const line = lines[i];
    if (/^\d+\.(\d+\.?)?\s+[A-Z]/.test(line)) {
      return line.trim().substring(0, 50);
    }
  }
  return 'Document';
};

module.exports = {
  detect,
  patterns,
};
