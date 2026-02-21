// AI Validators Service - Ensure LaTeX integrity and content quality
// Validates AI outputs before showing to users

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  qualityScore: number; // 0-100
}

export interface ContentComparison {
  contentPreserved: boolean;
  lossPercentage: number;
  changedSections: string[];
  keywordsPreserved: number; // out of total important keywords
}

class AIValidators {
  // ─── LaTeX Validation ─────────────────────────────────────
  validateLatexSyntax(latex: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let qualityScore = 100;

    // Check for unclosed braces
    const openBraces = (latex.match(/\{/g) || []).length;
    const closeBraces = (latex.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push(
        `LaTeX brace mismatch: ${openBraces} open, ${closeBraces} closed`
      );
      qualityScore -= 30;
    }

    // Check for unclosed brackets
    const openBrackets = (latex.match(/\[/g) || []).length;
    const closeBrackets = (latex.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      errors.push(
        `LaTeX bracket mismatch: ${openBrackets} open, ${closeBrackets} closed`
      );
      qualityScore -= 20;
    }

    // Check for required document structure
    if (!latex.includes('\\documentclass')) {
      warnings.push('Missing \\documentclass declaration');
      qualityScore -= 10;
    }

    if (!latex.includes('\\begin{document}') || !latex.includes('\\end{document}')) {
      errors.push('Missing document environment');
      qualityScore -= 25;
    }

    // Check for incomplete commands
    const incompleteCommands = latex.match(/\\[a-zA-Z]+\s*$/gm);
    if (incompleteCommands) {
      errors.push(`Found ${incompleteCommands.length} incomplete LaTeX commands`);
      qualityScore -= 15 * incompleteCommands.length;
    }

    // Check for missing required packages
    const requiredPackages = ['inputenc', 'geometry', 'hyperref'];
    requiredPackages.forEach((pkg) => {
      if (!latex.includes(`\\usepackage{${pkg}}`) && !latex.includes(`\\usepackage[`) && pkg !== 'hyperref') {
        warnings.push(`Consider adding \\usepackage{${pkg}}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      qualityScore: Math.max(0, qualityScore),
    };
  }

  // ─── Content Integrity Check ──────────────────────────────
  validateContentIntegrity(
    original: string,
    tailored: string
  ): ContentComparison {
    // Extract text content (remove LaTeX commands)
    const extractText = (latex: string): string => {
      return latex
        .replace(/\\[a-zA-Z]+\{/g, '') // Remove commands with braces
        .replace(/[{}]/g, '') // Remove braces
        .replace(/\\[^a-zA-Z]/g, '') // Remove special commands
        .trim();
    };

    const originalText = extractText(original);
    const tailoredText = extractText(tailored);

    // Check percentage of original content preserved
    const originalLength = originalText.length;
    const tailoredLength = tailoredText.length;
    const lossPercentage = Math.max(0, 1 - tailoredLength / originalLength) * 100;

    // Check if key sections are preserved
    const sections = [
      'experience',
      'education',
      'skills',
      'projects',
      'summary',
      'profile',
    ];
    const changedSections: string[] = [];

    sections.forEach((section) => {
      const originalHas = originalText.toLowerCase().includes(section);
      const tailoredHas = tailoredText.toLowerCase().includes(section);
      if (originalHas && !tailoredHas) {
        changedSections.push(section);
      }
    });

    // Extract and compare important keywords
    const importantKeywords = this.extractKeywords(originalText);
    let keywordsPreserved = 0;

    importantKeywords.forEach((keyword) => {
      if (tailoredText.toLowerCase().includes(keyword.toLowerCase())) {
        keywordsPreserved++;
      }
    });

    return {
      contentPreserved: lossPercentage < 20,
      lossPercentage,
      changedSections,
      keywordsPreserved,
    };
  }

  // ─── Resume Quality Scoring ───────────────────────────────
  scoreResumeQuality(latex: string): { score: number; factors: Record<string, number> } {
    let score = 100;
    const factors: Record<string, number> = {};

    // LaTeX syntax (25%)
    const syntaxValidation = this.validateLatexSyntax(latex);
    factors.syntax = syntaxValidation.qualityScore;
    score = (score * 0.75) + (syntaxValidation.qualityScore * 0.25);

    // Content length (15%)
    const textLength = latex.replace(/\\[a-zA-Z]+/g, '').length;
    const lengthScore = Math.min(100, (textLength / 5000) * 100); // 5000 chars is ideal
    factors.length = lengthScore;
    score = (score * 0.85) + (lengthScore * 0.15);

    // Formatting consistency (20%)
    const formatScore = this.scoreFormatting(latex);
    factors.formatting = formatScore;
    score = (score * 0.8) + (formatScore * 0.2);

    // Section completeness (15%)
    const sectionScore = this.scoreSectionCompleteness(latex);
    factors.sections = sectionScore;
    score = (score * 0.85) + (sectionScore * 0.15);

    // Keyword presence (25%)
    const keywordScore = this.scoreKeywords(latex);
    factors.keywords = keywordScore;
    score = (score * 0.75) + (keywordScore * 0.25);

    return {
      score: Math.round(score),
      factors,
    };
  }

  // ─── Helper Methods ───────────────────────────────────────
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
      'with', 'by', 'from', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
    ]);

    return text
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 4 && !stopWords.has(word))
      .slice(0, 50); // Top 50 keywords
  }

  private scoreFormatting(latex: string): number {
    let score = 100;

    // Check for consistent spacing
    const doubleSpaces = (latex.match(/  +/g) || []).length;
    if (doubleSpaces > 5) score -= 10;

    // Check for proper section formatting
    const sectionCount = (latex.match(/\\section\{/g) || []).length;
    if (sectionCount < 3) score -= 15;

    // Check for proper itemization
    const itemCount = (latex.match(/\\item/g) || []).length;
    if (itemCount < 5) score -= 10;

    return Math.max(0, score);
  }

  private scoreSectionCompleteness(latex: string): number {
    let score = 0;
    const expectedSections = [
      { name: 'section', weight: 10 },
      { name: 'subsection', weight: 5 },
      { name: 'item', weight: 20 },
      { name: 'itemize', weight: 15 },
      { name: 'enumerate', weight: 10 },
    ];

    expectedSections.forEach(({ name, weight }) => {
      if (latex.includes(`\\${name}`)) {
        score += weight;
      }
    });

    return Math.min(100, score);
  }

  private scoreKeywords(latex: string): number {
    const technicalKeywords = [
      'python', 'javascript', 'typescript', 'react', 'nodejs',
      'aws', 'docker', 'kubernetes', 'sql', 'mongodb',
      'agile', 'scrum', 'git', 'api', 'restful',
      'developed', 'implemented', 'designed', 'deployed', 'optimized',
    ];

    let matched = 0;
    technicalKeywords.forEach((keyword) => {
      if (latex.toLowerCase().includes(keyword)) {
        matched++;
      }
    });

    return (matched / technicalKeywords.length) * 100;
  }

  // ─── Answer Quality Scoring ───────────────────────────────
  scoreAnswerQuality(
    answer: string,
    question: string,
    context?: { jobTitle?: string; company?: string }
  ): {
    score: number;
    length: number;
    specificity: number;
    relevance: number;
    suggestions: string[];
  } {
    const suggestions: string[] = [];

    // Length scoring (0-30)
    const length = answer.length;
    let lengthScore = 0;
    if (length < 50) {
      lengthScore = 5;
      suggestions.push('Answer is too short. Add more details.');
    } else if (length < 150) {
      lengthScore = 15;
      suggestions.push('Consider expanding your answer with specific examples.');
    } else if (length < 500) {
      lengthScore = 25;
    } else {
      lengthScore = 30;
    }

    // Specificity scoring (0-30)
    const hasNumbers = /\d+/.test(answer);
    const hasMetrics = /\d+\s*(%|x|percent|times|growth|improvement)/i.test(answer);
    const hasMetrics2 = /increased|improved|reduced|optimized|accelerated/i.test(answer);
    let specificity = 0;

    if (hasMetrics) {
      specificity += 15;
    } else if (hasNumbers) {
      specificity += 8;
    }

    if (hasMetrics2) {
      specificity += 15;
    }

    if (specificity < 10) {
      suggestions.push('Add specific numbers and metrics to strengthen your answer.');
    }

    // Relevance scoring (0-40)
    let relevance = 20; // baseline
    const questionWords = question.toLowerCase().split(/\s+/);
    const answerWords = answer.toLowerCase().split(/\s+/);

    const matchedWords = questionWords.filter((word) =>
      answerWords.includes(word) && word.length > 3
    );

    relevance += Math.min(20, matchedWords.length * 2);

    if (context?.jobTitle) {
      const jobWords = context.jobTitle.toLowerCase().split(/\s+/);
      const jobMatches = jobWords.filter((word) =>
        answerWords.includes(word) && word.length > 3
      );
      if (jobMatches.length > 0) {
        relevance += 5;
      }
    }

    // Overall score
    const score = lengthScore + specificity + relevance;

    return {
      score: Math.min(100, score),
      length: lengthScore,
      specificity,
      relevance,
      suggestions,
    };
  }
}

export const aiValidators = new AIValidators();
