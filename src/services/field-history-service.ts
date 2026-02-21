// Field History Service - Learn from past form answers
// Tracks successful answers and provides suggestions based on history

export interface FormFieldRecord {
  id: string;
  fieldName: string;
  fieldType: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio';
  question: string;
  company: string;
  jobTitle: string;
  answers: AnswerVariant[];
  createdAt: number;
  updatedAt: number;
}

export interface AnswerVariant {
  text: string;
  qualityScore: number; // 0-100
  resultedInInterview: boolean;
  resultedInOffer: boolean;
  usedCount: number;
  lastUsed: number;
  relatedJobKeywords: string[];
}

export interface HistoricalSuggestion {
  suggestion: string;
  confidence: number; // 0-100
  source: 'pattern' | 'successful_answer' | 'company_pattern';
  relatedAnswers: string[];
}

class FieldHistoryService {
  private storageKey = 'field_history';
  private maxRecordsPerField = 50;

  // ─── Store Answer ─────────────────────────────────────────
  async recordAnswer(
    fieldName: string,
    question: string,
    answer: string,
    context: {
      company: string;
      jobTitle: string;
      fieldType?: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio';
      qualityScore?: number;
      jobKeywords?: string[];
    }
  ): Promise<void> {
    try {
      const records = await this.getRecords();
      const fieldId = this.generateFieldId(fieldName, question);
      
      let record = records.find((r) => r.id === fieldId);

      if (!record) {
        record = {
          id: fieldId,
          fieldName,
          fieldType: context.fieldType || 'text',
          question,
          company: context.company,
          jobTitle: context.jobTitle,
          answers: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      }

      // Check if answer already exists
      const existingAnswer = record.answers.find((a) => a.text === answer);

      if (existingAnswer) {
        existingAnswer.usedCount++;
        existingAnswer.lastUsed = Date.now();
        existingAnswer.qualityScore = Math.max(
          existingAnswer.qualityScore,
          context.qualityScore || existingAnswer.qualityScore
        );
      } else {
        record.answers.push({
          text: answer,
          qualityScore: context.qualityScore || 70,
          resultedInInterview: false,
          resultedInOffer: false,
          usedCount: 1,
          lastUsed: Date.now(),
          relatedJobKeywords: context.jobKeywords || [],
        });
      }

      // Keep top 50 answers per field
      record.answers.sort((a, b) => b.qualityScore - a.qualityScore);
      record.answers = record.answers.slice(0, this.maxRecordsPerField);
      record.updatedAt = Date.now();

      // Update record in list
      const index = records.findIndex((r) => r.id === fieldId);
      if (index >= 0) {
        records[index] = record;
      } else {
        records.push(record);
      }

      await chrome.storage.local.set({
        [this.storageKey]: records,
      });

      console.log('[v0] Recorded answer for field:', fieldName);
    } catch (error) {
      console.error('[v0] Error recording answer:', error);
    }
  }

  // ─── Get Similar Past Answers ─────────────────────────────
  async getSimilarAnswers(
    question: string,
    company?: string,
    jobKeywords?: string[]
  ): Promise<AnswerVariant[]> {
    try {
      const records = await this.getRecords();
      const similarRecords = records.filter((r) => {
        const questionSimilarity = this.calculateSimilarity(r.question, question);
        return questionSimilarity > 0.6; // 60% similarity threshold
      });

      if (similarRecords.length === 0) {
        return [];
      }

      // Aggregate answers with ranking
      const aggregatedAnswers: AnswerVariant[] = [];
      const seen = new Set<string>();

      similarRecords.forEach((record) => {
        record.answers.forEach((answer) => {
          if (!seen.has(answer.text)) {
            seen.add(answer.text);
            aggregatedAnswers.push({
              ...answer,
              // Boost score if from same company
              qualityScore: company && record.company === company 
                ? Math.min(100, answer.qualityScore + 10)
                : answer.qualityScore,
            });
          }
        });
      });

      // Sort by quality and filter top 10
      return aggregatedAnswers
        .sort((a, b) => b.qualityScore - a.qualityScore)
        .slice(0, 10);
    } catch (error) {
      console.error('[v0] Error getting similar answers:', error);
      return [];
    }
  }

  // ─── Get Suggestions for Field ────────────────────────────
  async getSuggestionsForField(
    fieldName: string,
    question: string,
    context: {
      company?: string;
      jobTitle?: string;
      jobKeywords?: string[];
    }
  ): Promise<HistoricalSuggestion[]> {
    try {
      const similarAnswers = await this.getSimilarAnswers(question, context.company, context.jobKeywords);

      if (similarAnswers.length === 0) {
        return [];
      }

      const suggestions: HistoricalSuggestion[] = [];

      // Pattern 1: High-quality successful answers
      const successfulAnswers = similarAnswers.filter(
        (a) => a.resultedInInterview || a.resultedInOffer
      );
      if (successfulAnswers.length > 0) {
        const topAnswer = successfulAnswers[0];
        suggestions.push({
          suggestion: topAnswer.text,
          confidence: Math.min(100, topAnswer.qualityScore + 15),
          source: 'successful_answer',
          relatedAnswers: successfulAnswers.slice(1, 4).map((a) => a.text),
        });
      }

      // Pattern 2: Company-specific patterns
      if (context.company) {
        const companyAnswers = similarAnswers.filter(
          (a) => a.relatedJobKeywords.some((k) => context.jobKeywords?.includes(k))
        );
        if (companyAnswers.length > 0) {
          const commonElements = this.findCommonPatterns(companyAnswers.map((a) => a.text));
          if (commonElements.length > 0) {
            suggestions.push({
              suggestion: commonElements[0],
              confidence: 75,
              source: 'company_pattern',
              relatedAnswers: companyAnswers.map((a) => a.text).slice(0, 3),
            });
          }
        }
      }

      // Pattern 3: Most used successful pattern
      const mostUsedSuccessful = similarAnswers
        .filter((a) => a.usedCount > 2)
        .sort((a, b) => b.usedCount - a.usedCount)[0];
      
      if (mostUsedSuccessful && !suggestions.some((s) => s.suggestion === mostUsedSuccessful.text)) {
        suggestions.push({
          suggestion: mostUsedSuccessful.text,
          confidence: Math.min(90, 60 + mostUsedSuccessful.usedCount * 5),
          source: 'pattern',
          relatedAnswers: [mostUsedSuccessful.text],
        });
      }

      return suggestions.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('[v0] Error getting suggestions:', error);
      return [];
    }
  }

  // ─── Mark Interview/Offer Result ──────────────────────────
  async recordInterviewResult(
    fieldName: string,
    question: string,
    answer: string,
    resultedInInterview: boolean,
    resultedInOffer: boolean = false
  ): Promise<void> {
    try {
      const records = await this.getRecords();
      const fieldId = this.generateFieldId(fieldName, question);

      const record = records.find((r) => r.id === fieldId);
      if (record) {
        const answerVariant = record.answers.find((a) => a.text === answer);
        if (answerVariant) {
          answerVariant.resultedInInterview = resultedInInterview;
          answerVariant.resultedInOffer = resultedInOffer;
          record.updatedAt = Date.now();

          await chrome.storage.local.set({
            [this.storageKey]: records,
          });

          console.log('[v0] Updated interview result for answer');
        }
      }
    } catch (error) {
      console.error('[v0] Error recording interview result:', error);
    }
  }

  // ─── Get Field Statistics ────────────────────────────────
  async getFieldStats(fieldName: string): Promise<{
    totalAnswers: number;
    averageQuality: number;
    successRate: number;
    mostUsedAnswer: string | null;
    recentlyUsed: AnswerVariant[];
  }> {
    try {
      const records = await this.getRecords();
      const relevantRecords = records.filter((r) => r.fieldName === fieldName);

      if (relevantRecords.length === 0) {
        return {
          totalAnswers: 0,
          averageQuality: 0,
          successRate: 0,
          mostUsedAnswer: null,
          recentlyUsed: [],
        };
      }

      const allAnswers = relevantRecords.flatMap((r) => r.answers);
      const successfulAnswers = allAnswers.filter((a) => a.resultedInInterview);
      const averageQuality =
        allAnswers.reduce((sum, a) => sum + a.qualityScore, 0) / allAnswers.length;

      const mostUsedAnswer = allAnswers.sort((a, b) => b.usedCount - a.usedCount)[0];
      const recentlyUsed = allAnswers
        .sort((a, b) => b.lastUsed - a.lastUsed)
        .slice(0, 5);

      return {
        totalAnswers: allAnswers.length,
        averageQuality: Math.round(averageQuality),
        successRate: (successfulAnswers.length / allAnswers.length) * 100,
        mostUsedAnswer: mostUsedAnswer?.text || null,
        recentlyUsed,
      };
    } catch (error) {
      console.error('[v0] Error getting field stats:', error);
      return {
        totalAnswers: 0,
        averageQuality: 0,
        successRate: 0,
        mostUsedAnswer: null,
        recentlyUsed: [],
      };
    }
  }

  // ─── Helper Methods ───────────────────────────────────────
  private async getRecords(): Promise<FormFieldRecord[]> {
    try {
      const data = await chrome.storage.local.get(this.storageKey);
      return data[this.storageKey] || [];
    } catch (error) {
      console.error('[v0] Error getting records:', error);
      return [];
    }
  }

  private generateFieldId(fieldName: string, question: string): string {
    return `${fieldName}_${question.slice(0, 50).replace(/\s+/g, '_')}`;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private getEditDistance(s1: string, s2: string): number {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  private findCommonPatterns(texts: string[]): string[] {
    if (texts.length === 0) return [];

    // Find common sentences or phrases
    const words = new Map<string, number>();
    const minWordLength = 3;

    texts.forEach((text) => {
      const sentences = text.split(/[.!?]+/).filter((s) => s.trim());
      sentences.forEach((sentence) => {
        const cleaned = sentence.trim();
        if (cleaned.length > 20) {
          words.set(cleaned, (words.get(cleaned) || 0) + 1);
        }
      });
    });

    return Array.from(words.entries())
      .filter(([_, count]) => count >= Math.ceil(texts.length / 2))
      .sort((a, b) => b[1] - a[1])
      .map(([text]) => text);
  }

  // ─── Clear History ────────────────────────────────────────
  async clearHistory(): Promise<void> {
    try {
      await chrome.storage.local.remove(this.storageKey);
      console.log('[v0] Field history cleared');
    } catch (error) {
      console.error('[v0] Error clearing history:', error);
    }
  }
}

export const fieldHistoryService = new FieldHistoryService();
