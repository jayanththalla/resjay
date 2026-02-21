import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input, Textarea, Card, CardContent } from './ui/index';
import { labelAnalysisService } from '@/services/label-analysis-service';
import { Sparkles, Loader2, CheckCircle2, AlertCircle, BarChart3, Lightbulb } from 'lucide-react';

interface FormAnswer {
  label: string;
  value: string;
}

export function LabelAnalyzer() {
  const [answers, setAnswers] = useState<FormAnswer[]>([{ label: '', value: '' }]);
  const [jobDescription, setJobDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  const handleAddAnswer = () => {
    setAnswers([...answers, { label: '', value: '' }]);
  };

  const handleRemoveAnswer = (index: number) => {
    setAnswers(answers.filter((_, i) => i !== index));
  };

  const handleAnswerChange = (index: number, field: 'label' | 'value', value: string) => {
    const updated = [...answers];
    updated[index][field] = value;
    setAnswers(updated);
  };

  const handleAnalyzeAnswers = async () => {
    const filledAnswers = answers.filter((a) => a.label.trim() && a.value.trim());

    if (filledAnswers.length === 0) {
      alert('Please add at least one answer to analyze');
      return;
    }

    setAnalyzing(true);
    try {
      const results = await labelAnalysisService.analyzeForm(
        filledAnswers,
        jobDescription || undefined,
        {
          onProgressUpdate: (progress) => {
            console.log('[v0] Analysis progress:', progress);
          },
        }
      );

      setAnalysisResults(results);
    } catch (error) {
      console.error('[v0] Analysis error:', error);
      alert('Failed to analyze answers. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/10';
    if (score >= 60) return 'bg-amber-500/10';
    return 'bg-red-500/10';
  };

  return (
    <div className="space-y-4">
      {!analysisResults ? (
        <>
          {/* Input Section */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-2 block">Job Description (Optional)</label>
              <Textarea
                placeholder="Paste the job description to get more relevant suggestions..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="min-h-20 text-sm"
              />
            </div>

            {/* Form Answers */}
            <div>
              <label className="text-xs font-medium mb-2 block">Form Questions & Answers</label>
              <div className="space-y-3">
                {answers.map((answer, index) => (
                  <div key={index} className="space-y-2 p-3 rounded-lg border border-border">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Question Label</label>
                      <Input
                        placeholder="e.g., Why are you interested in this role?"
                        value={answer.label}
                        onChange={(e) => handleAnswerChange(index, 'label', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Your Answer</label>
                      <Textarea
                        placeholder="Your response..."
                        value={answer.value}
                        onChange={(e) => handleAnswerChange(index, 'value', e.target.value)}
                        className="min-h-16 text-sm"
                      />
                    </div>
                    {answers.length > 1 && (
                      <button
                        onClick={() => handleRemoveAnswer(index)}
                        className="text-xs text-red-500 hover:text-red-600"
                      >
                        Remove question
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <Button onClick={handleAddAnswer} variant="outline" size="sm" className="mt-3">
                <span>+</span> Add Question
              </Button>
            </div>

            {/* Analyze Button */}
            <Button
              onClick={handleAnalyzeAnswers}
              disabled={analyzing || answers.filter((a) => a.label && a.value).length === 0}
              className="w-full"
            >
              {analyzing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {analyzing ? 'Analyzing...' : 'Analyze Answers with AI'}
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Results Section */}
          <div className="space-y-4">
            {/* Overall Score */}
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${getScoreBgColor(analysisResults.overallScore)}`}>
                    {analysisResults.overallScore}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Overall Quality Score</p>
                    <p className="text-sm font-semibold">
                      {analysisResults.overallScore >= 80
                        ? 'Excellent'
                        : analysisResults.overallScore >= 60
                        ? 'Good'
                        : 'Needs Improvement'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Improvements */}
            {analysisResults.improvements.length > 0 && (
              <Card className="glass-card border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-amber-900">Key Improvements</p>
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {analysisResults.improvements.slice(0, 3).map((improvement: string, i: number) => (
                      <li key={i} className="text-xs text-amber-800">
                        • {improvement}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Individual Answer Analysis */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Answer-by-Answer Analysis</h4>
              <div className="space-y-2">
                {analysisResults.answers.map((answer: any, index: number) => (
                  <Card key={index} className="glass-card">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="text-xs font-semibold">{answer.labelName}</h5>
                          {answer.score && (
                            <p className={`text-xs font-bold ${getScoreColor(answer.score)}`}>
                              Score: {answer.score}/100
                            </p>
                          )}
                        </div>
                        {answer.score && answer.score >= 80 ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        )}
                      </div>

                      {answer.feedback && (
                        <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">{answer.feedback}</p>
                      )}

                      {answer.suggestions && answer.suggestions.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Suggestions:</p>
                          <ul className="space-y-1">
                            {answer.suggestions.slice(0, 2).map((suggestion: string, si: number) => (
                              <li key={si} className="text-xs text-foreground">
                                • {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Analyze Again Button */}
            <Button
              onClick={() => {
                setAnalysisResults(null);
                setAnswers([{ label: '', value: '' }]);
                setJobDescription('');
              }}
              variant="outline"
              className="w-full"
            >
              Analyze Different Answers
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
