const patterns = [
  {
    name: 'Square bracket placeholder',
    regex: /\[([A-Z][A-Z\s_\/]+)\]/g,
    severity: 'high',
    suggestion: 'Replace placeholder with actual content',
  },
  {
    name: 'Time placeholder',
    regex: /\[00:00\]/g,
    severity: 'high',
    suggestion: 'Replace with actual time',
  },
  {
    name: 'XXX placeholder',
    regex: /\bXXX+\b/gi,
    severity: 'high',
    suggestion: 'Replace XXX with actual value',
  },
  {
    name: 'Date placeholder',
    regex: /\bXX\/XX\/XXXX\b/g,
    severity: 'high',
    suggestion: 'Replace with actual date',
  },
  {
    name: 'Choice placeholder',
    regex: /\[([\w\s]+)\s*\/\s*([\w\s]+)(?:\s*\/\s*([\w\s]+))*\]/g,
    severity: 'high',
    suggestion: 'Select one option and remove the others',
  },
  {
    name: 'Delete instruction',
    regex: /\*{3,}\s*DELETE[^*]*\*{3,}/gi,
    severity: 'high',
    suggestion: 'Remove this instruction text',
  },
  {
    name: 'OR instruction',
    regex: /\*{3,}\s*OR\s*\*{3,}/gi,
    severity: 'high',
    suggestion: 'Remove OR instruction and keep only relevant section',
  },
  {
    name: 'Template instruction',
    regex: /The template text (?:for this section )?is:/gi,
    severity: 'medium',
    suggestion: 'This appears to be template guidance - remove or replace',
  },
  {
    name: 'Section guidance',
    regex: /This section (?:is to |should |covers |details )[^.]+\./gi,
    severity: 'medium',
    suggestion: 'Replace guidance text with actual content',
  },
  {
    name: 'TBD placeholder',
    regex: /\b(TBD|TBA|TBC|N\/A|TODO)\b/gi,
    severity: 'medium',
    suggestion: 'Replace with actual information',
  },
  {
    name: 'Angle bracket placeholder',
    regex: /<[A-Z][A-Z\s_]+>/gi,
    severity: 'high',
    suggestion: 'Replace placeholder with actual content',
  },
  {
    name: 'Question mark placeholder',
    regex: /\?{3,}/g,
    severity: 'medium',
    suggestion: 'Replace with actual information',
  },
  {
    name: 'Curly bracket placeholder',
    regex: /\{[A-Z][A-Z\s_]*\}/gi,
    severity: 'high',
    suggestion: 'Replace placeholder with actual content',
  },
  {
    name: 'Insert instruction',
    regex: /\[INSERT[^\]]+\]/gi,
    severity: 'high',
    suggestion: 'Replace with actual content as instructed',
  },
  {
    name: 'Description placeholder',
    regex: /\[DESCRIPTION[^\]]+\]/gi,
    severity: 'high',
    suggestion: 'Add the required description',
  },
  {
    name: 'Demo/test placeholder',
    regex: /\(demo\)\s*\w+/gi,
    severity: 'medium',
    suggestion: 'Replace demo text with actual client name',
  },
];

const detect = (text) => {
  const errors = [];
  const lines = text.split('\n');

  patterns.forEach((pattern) => {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

    while ((match = regex.exec(text)) !== null) {
      const beforeMatch = text.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;
      
      const section = findSection(lines, lineNumber);

      errors.push({
        type: 'placeholder',
        severity: pattern.severity,
        message: `${pattern.name} detected`,
        location: {
          section: section,
          lineStart: lineNumber,
        },
        suggestion: pattern.suggestion,
        originalText: match[0].substring(0, 100),
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
    if (/^(Section\s+)?\d+[.:]\s*/i.test(line)) {
      return line.trim().substring(0, 50);
    }
  }
  return 'Document';
};

module.exports = {
  detect,
  patterns,
};
