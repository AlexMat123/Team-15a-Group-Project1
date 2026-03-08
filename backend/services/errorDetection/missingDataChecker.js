const requiredSections = [
  { name: 'Summary', pattern: /\b(1\.\s*)?Summary\b/i },
  { name: 'Competent Persons', pattern: /\b(2\.\s*)?Competent Persons\b/i },
  { name: 'Introduction', pattern: /\b(3\.\s*)?Introduction\b/i },
  { name: 'Premises Details', pattern: /\b(5\.\s*)?Premises Details\b/i },
  { name: 'Fire Risk Assessment', pattern: /\b(8\.\s*)?Fire Risk Assessment\b/i },
  { name: 'Risk Assessment and Action Plan', pattern: /\b(9\.\s*)?Risk Assessment and Action Plan\b/i },
];

const requiredFields = [
  {
    name: 'Reference Number',
    pattern: /Reference Number[\s\S]{0,50}?\d{4,}/i,
    section: 'Header',
  },
  {
    name: 'Visit Date',
    pattern: /Visit Date[\s\S]{0,50}?\d{1,2}(st|nd|rd|th)?\s+\w+\s+\d{4}/i,
    section: 'Header',
  },
  {
    name: 'Site Address',
    pattern: /Site Address[\s\S]{0,100}?[A-Z][a-z]+/i,
    section: 'Header',
  },
  {
    name: 'Consultant Name',
    pattern: /Consultant[\s\S]{0,50}?[A-Z][a-z]+\s+[A-Z][a-z]+/i,
    section: 'Header',
  },
  {
    name: 'Building Height',
    pattern: /Building Height[\s\S]{0,100}?\d+(\.\d+)?\s*(m|meters|metres)/i,
    section: '5.7. Construction Details',
  },
  {
    name: 'Number of Storeys',
    pattern: /Number of Storeys[\s\S]{0,50}?\d+/i,
    section: '5.7. Construction Details',
  },
  {
    name: 'Evacuation Policy',
    pattern: /Evacuation Policy[\s\S]{0,50}?(Stay Put|Simultaneous|Progressive|Phased)/i,
    section: '5.9. Fire Evacuation Policy',
  },
  {
    name: 'Risk Level',
    pattern: /(risk to life|risk level)[\s\S]{0,100}?(trivial|tolerable|moderate|substantial|intolerable)/i,
    section: '8. Fire Risk Assessment',
  },
];

const emptyFieldPatterns = [
  {
    name: 'Empty field with colon',
    pattern: /^([A-Z][a-zA-Z\s]+):\s*$/gm,
    severity: 'medium',
  },
  {
    name: 'Blank line after label',
    pattern: /^([A-Z][a-zA-Z\s]+)\n\s*\n/gm,
    severity: 'low',
  },
];

const detect = (text, sections = []) => {
  const errors = [];

  requiredSections.forEach((section) => {
    if (!section.pattern.test(text)) {
      errors.push({
        type: 'missing_data',
        severity: 'high',
        message: `Required section "${section.name}" not found`,
        location: {
          section: 'Document Structure',
        },
        suggestion: `Add the "${section.name}" section to the document`,
        originalText: section.name,
      });
    }
  });

  requiredFields.forEach((field) => {
    if (!field.pattern.test(text)) {
      const fieldNameInDoc = text.includes(field.name.split(' ')[0]);
      
      if (fieldNameInDoc) {
        errors.push({
          type: 'missing_data',
          severity: 'medium',
          message: `Field "${field.name}" appears to be empty or incomplete`,
          location: {
            section: field.section,
          },
          suggestion: `Provide value for "${field.name}"`,
          originalText: field.name,
        });
      }
    }
  });

  emptyFieldPatterns.forEach((pattern) => {
    let match;
    const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
    
    while ((match = regex.exec(text)) !== null) {
      const fieldName = match[1]?.trim();
      
      if (fieldName && fieldName.length > 3 && fieldName.length < 50) {
        errors.push({
          type: 'missing_data',
          severity: pattern.severity,
          message: `Empty or missing value for "${fieldName}"`,
          location: {
            section: findNearestSection(text, match.index),
          },
          suggestion: `Provide value for "${fieldName}"`,
          originalText: match[0].substring(0, 50),
        });
      }
    }
  });

  return errors;
};

const findNearestSection = (text, position) => {
  const beforeText = text.substring(0, position);
  const lines = beforeText.split('\n');
  
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^\d+\.(\d+\.?)?\s+[A-Z]/.test(lines[i])) {
      return lines[i].trim().substring(0, 50);
    }
  }
  return 'Document';
};

module.exports = {
  detect,
  requiredSections,
  requiredFields,
};
