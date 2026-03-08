const mlService = require('../mlService');

const analyzeWithML = async (text, sections = []) => {
  const errors = [];

  if (!mlService.isModelReady()) {
    console.log('ML models not ready, skipping ML-enhanced detection');
    return errors;
  }

  try {
    for (const section of sections.slice(0, 10)) {
      if (section.content && section.content.length > 50) {
        const completeness = await mlService.analyzeSectionCompleteness(
          section.content.substring(0, 500)
        );

        if (completeness && !completeness.isComplete && completeness.completenessScore > 0.6) {
          errors.push({
            type: getErrorTypeFromClassification(completeness.classification),
            severity: completeness.completenessScore > 0.8 ? 'high' : 'medium',
            message: `Section appears ${completeness.classification}`,
            location: {
              section: section.title,
            },
            suggestion: getSuggestionForClassification(completeness.classification),
            originalText: section.content.substring(0, 100),
            mlConfidence: completeness.completenessScore,
          });
        }
      }
    }
  } catch (error) {
    console.error('ML analysis error:', error.message);
  }

  return errors;
};

const getErrorTypeFromClassification = (classification) => {
  const mapping = {
    'contains placeholder text': 'placeholder',
    'template text not filled in': 'placeholder',
    'incomplete or missing information': 'missing_data',
    'partially complete': 'missing_data',
  };
  return mapping[classification] || 'consistency';
};

const getSuggestionForClassification = (classification) => {
  const suggestions = {
    'contains placeholder text': 'Replace placeholder text with actual content',
    'template text not filled in': 'Complete the template with specific information',
    'incomplete or missing information': 'Add missing details to this section',
    'partially complete': 'Review and complete all required fields in this section',
  };
  return suggestions[classification] || 'Review this section for completeness';
};

const findSimilarSections = async (sections) => {
  const errors = [];

  if (!mlService.isModelReady() || sections.length < 2) {
    return errors;
  }

  try {
    const embeddings = [];
    
    for (const section of sections.slice(0, 5)) {
      if (section.content && section.content.length > 100) {
        const embedding = await mlService.getEmbedding(section.content.substring(0, 500));
        if (embedding) {
          embeddings.push({ section, embedding });
        }
      }
    }

    for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
        const similarity = mlService.calculateSimilarity(
          embeddings[i].embedding,
          embeddings[j].embedding
        );

        if (similarity > 0.9 && embeddings[i].section.title !== embeddings[j].section.title) {
          errors.push({
            type: 'consistency',
            severity: 'medium',
            message: `Sections "${embeddings[i].section.title}" and "${embeddings[j].section.title}" have very similar content (${Math.round(similarity * 100)}% similar)`,
            location: {
              section: embeddings[i].section.title,
            },
            suggestion: 'Review for duplicate or redundant content',
            originalText: `Similarity: ${Math.round(similarity * 100)}%`,
            mlConfidence: similarity,
          });
        }
      }
    }
  } catch (error) {
    console.error('Similarity analysis error:', error.message);
  }

  return errors;
};

module.exports = {
  analyzeWithML,
  findSimilarSections,
};
