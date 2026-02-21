// ResumeForge AI – Label Analysis Service
// Analyzes form answers and provides AI suggestions for improvement

import { aiService } from './ai-service';

export interface FormLabel {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox';
  placeholder?: string;
  required: boolean;
}

export interface FormAnswer {
  labelId: string;
  labelName: string;
  value: string;
  suggestions?: string[];
  score?: number; // 0-100 quality score
  feedback?: string;
}

export interface FormAnalysis {
  id: string;
  applicationId: string;
  labels: FormLabel[];
  answers: FormAnswer[];
  overallScore: number;
  improvements: string[];
  analyzedAt: number;
}

class LabelAnalysisService {
  private storageKey = 'resumeforge_form_analysis';
  private formLabelsKey = 'resumeforge_form_labels';

  // Analyze a single form answer using AI
  async analyzeAnswer(
    label: string,
    value: string,
    context?: string,
    callbacks?: {
      onToken?: (token: string) => void;
      onComplete?: (text: string) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<FormAnswer> {
    const prompt = `Analyze this form answer and provide constructive feedback:

Form Field: ${label}
Answer: "${value}"
${context ? `Context: ${context}` : ''}

Provide:
1. Quality score (0-100)
2. One-line feedback
3. 2-3 specific improvement suggestions

Format as JSON:
{
  "score": number,
  "feedback": "string",
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}`;

    let fullResponse = '';

    return new Promise((resolve, reject) => {
      aiService.streamChat(
        [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        'You are an expert at analyzing job application form answers and providing constructive feedback.',
        {
          onToken: (token) => {
            fullResponse += token;
            callbacks?.onToken?.(token);
          },
          onComplete: (text) => {
            try {
              const parsed = JSON.parse(text);
              const answer: FormAnswer = {
                labelName: label,
                labelId: `label_${label}`,
                value,
                score: parsed.score,
                feedback: parsed.feedback,
                suggestions: parsed.suggestions,
              };
              resolve(answer);
              callbacks?.onComplete?.(text);
            } catch (error) {
              reject(new Error('Failed to parse AI response'));
              callbacks?.onError?.(error as Error);
            }
          },
          onError: (error) => {
            reject(error);
            callbacks?.onError?.(error);
          },
        }
      );
    });
  }

  // Analyze entire form
  async analyzeForm(
    answers: Array<{ label: string; value: string }>,
    jobDescription?: string,
    callbacks?: {
      onProgressUpdate?: (progress: number, message: string) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<FormAnalysis> {
    const id = `analysis_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const labels: FormLabel[] = answers.map((a) => ({
      id: `label_${a.label}`,
      name: a.label,
      type: 'text',
      required: true,
    }));

    const analyzedAnswers: FormAnswer[] = [];
    let totalScore = 0;

    for (let i = 0; i < answers.length; i++) {
      callbacks?.onProgressUpdate?.((i / answers.length) * 100, `Analyzing: ${answers[i].label}`);

      try {
        const answer = await this.analyzeAnswer(
          answers[i].label,
          answers[i].value,
          jobDescription
        );
        analyzedAnswers.push(answer);
        totalScore += answer.score || 0;
      } catch (error) {
        console.error('[v0] Error analyzing answer:', error);
        analyzedAnswers.push({
          labelName: answers[i].label,
          labelId: `label_${answers[i].label}`,
          value: answers[i].value,
          score: 0,
          feedback: 'Analysis failed',
          suggestions: [],
        });
      }
    }

    const overallScore = Math.round(totalScore / Math.max(analyzedAnswers.length, 1));
    const improvements = this.extractKeyImprovements(analyzedAnswers);

    const analysis: FormAnalysis = {
      id,
      applicationId: '',
      labels,
      answers: analyzedAnswers,
      overallScore,
      improvements,
      analyzedAt: Date.now(),
    };

    return analysis;
  }

  // Generate improvement suggestions based on successful answers
  async generateImprovedAnswer(
    currentAnswer: string,
    label: string,
    successfulExamples?: string[],
    callbacks?: {
      onToken?: (token: string) => void;
      onComplete?: (text: string) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<string> {
    const examplesText = successfulExamples
      ? `\n\nSuccessful examples from your previous applications:\n${successfulExamples.map((e) => `- ${e}`).join('\n')}`
      : '';

    const prompt = `Improve this form answer while maintaining authenticity:

Form Field: ${label}
Current Answer: "${currentAnswer}"${examplesText}

Provide an improved version that:
1. Is more compelling and specific
2. Shows relevant skills/experience
3. Maintains the candidate's authentic voice
4. Is concise but impactful

Just provide the improved answer without explanation.`;

    return new Promise((resolve, reject) => {
      aiService.streamChat(
        [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        'You are an expert at improving job application form answers.',
        {
          onToken: (token) => callbacks?.onToken?.(token),
          onComplete: (text) => {
            resolve(text.trim());
            callbacks?.onComplete?.(text);
          },
          onError: (error) => {
            reject(error);
            callbacks?.onError?.(error);
          },
        }
      );
    });
  }

  // Save form analysis
  async saveFormAnalysis(analysis: FormAnalysis): Promise<void> {
    const analyses = await this.getAllAnalyses();
    analyses.push(analysis);

    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.storageKey]: analyses }, () => {
        resolve();
      });
    });
  }

  // Get form analysis for application
  async getApplicationAnalysis(applicationId: string): Promise<FormAnalysis | null> {
    const analyses = await this.getAllAnalyses();
    return analyses.find((a) => a.applicationId === applicationId) || null;
  }

  // Get all analyses
  async getAllAnalyses(): Promise<FormAnalysis[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get(this.storageKey, (result) => {
        resolve(result[this.storageKey] || []);
      });
    });
  }

  // Get form labels for a domain
  async getFormLabels(domain?: string): Promise<FormLabel[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get(this.formLabelsKey, (result) => {
        const labels = result[this.formLabelsKey] || [];
        if (domain) {
          resolve(labels.filter((l: FormLabel) => l.id.includes(domain)));
        } else {
          resolve(labels);
        }
      });
    });
  }

  // Save detected form labels
  async saveFormLabels(domain: string, labels: FormLabel[]): Promise<void> {
    const existing = await this.getFormLabels();
    const domainLabels = labels.map((l) => ({
      ...l,
      id: `${domain}_${l.name}`,
    }));

    const filtered = existing.filter((l: FormLabel) => !l.id.includes(domain));
    const updated = [...filtered, ...domainLabels];

    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.formLabelsKey]: updated }, () => {
        resolve();
      });
    });
  }

  // Get label suggestions from previous answers
  async getSuccessfulAnswersForLabel(label: string): Promise<string[]> {
    const analyses = await this.getAllAnalyses();
    const answers: string[] = [];

    analyses.forEach((analysis) => {
      const answer = analysis.answers.find((a) => a.labelName === label && a.score && a.score >= 80);
      if (answer && answer.value) {
        answers.push(answer.value);
      }
    });

    return answers.slice(0, 3); // Return top 3 examples
  }

  // Calculate label statistics
  async getLabelStats(): Promise<Record<string, { avgScore: number; usageCount: number }>> {
    const analyses = await this.getAllAnalyses();
    const stats: Record<string, { scores: number[]; count: number }> = {};

    analyses.forEach((analysis) => {
      analysis.answers.forEach((answer) => {
        if (!stats[answer.labelName]) {
          stats[answer.labelName] = { scores: [], count: 0 };
        }
        stats[answer.labelName].scores.push(answer.score || 0);
        stats[answer.labelName].count++;
      });
    });

    const result: Record<string, { avgScore: number; usageCount: number }> = {};
    Object.entries(stats).forEach(([label, data]) => {
      const avgScore = Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length);
      result[label] = { avgScore, usageCount: data.count };
    });

    return result;
  }

  private extractKeyImprovements(answers: FormAnswer[]): string[] {
    return answers
      .filter((a) => a.suggestions && a.suggestions.length > 0)
      .slice(0, 5)
      .map((a) => `${a.labelName}: ${a.suggestions?.[0] || ''}`)
      .filter((s) => s);
  }
}

export const labelAnalysisService = new LabelAnalysisService();
