import React, { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Input, Textarea, Toast } from './ui/index';
import { autofillService, type DetectedField } from '@/services/autofill-service';
import { aiService } from '@/services/ai-service';
import { knowledgeBaseService } from '@/services/knowledge-base-service';
import {
    Scan, Wand2, CheckCircle2, XCircle, Edit3, Zap, Loader2,
    AlertCircle, ChevronDown, ChevronUp, User, Bot, HelpCircle,
    MessageSquare, Copy, Send,
} from 'lucide-react';

interface AutofillTabProps {
    resumeContent: string;
    jobDescription: string;
}

type Phase = 'idle' | 'scanning' | 'classifying' | 'generating' | 'ready' | 'filling';

export function AutofillTab({ resumeContent, jobDescription }: AutofillTabProps) {
    const [phase, setPhase] = useState<Phase>('idle');
    const [fields, setFields] = useState<DetectedField[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [error, setError] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Ask AI state
    const [askQuestion, setAskQuestion] = useState('');
    const [askAnswer, setAskAnswer] = useState('');
    const [askLoading, setAskLoading] = useState(false);
    const [showAskAI, setShowAskAI] = useState(false);

    // ─── Scan Page ──────────────────────────────────────────
    const handleScan = useCallback(async () => {
        setPhase('scanning');
        setError('');
        setFields([]);

        try {
            const scanResult = await chrome.runtime.sendMessage({ type: 'INJECT_AND_SCAN' });

            if (!scanResult?.success || !scanResult.fields?.length) {
                setError(scanResult?.error || 'No form fields found on this page. Navigate to a job application form and try again.');
                setPhase('idle');
                return;
            }

            setPhase('classifying');

            let jd = jobDescription;
            if (!jd) {
                try {
                    const jobInfoResult = await chrome.runtime.sendMessage({ type: 'EXTRACT_JOB_INFO' });
                    if (jobInfoResult?.success && jobInfoResult.data?.description) {
                        jd = jobInfoResult.data.description;
                    }
                } catch { /* ignore */ }
            }

            const processed = await autofillService.processFields(
                scanResult.fields,
                jd,
                resumeContent
            );

            setFields(processed);

            const aiFields = processed.filter((f) => f.category === 'ai_question' && !f.suggestedValue);
            if (aiFields.length > 0 && (jd || resumeContent)) {
                setPhase('generating');
                const withAnswers = await autofillService.generateAIAnswers(processed, jd, resumeContent);
                setFields(withAnswers);
            }

            setPhase('ready');
            setToast({ message: `Found ${processed.length} fields`, type: 'success' });
        } catch (err: any) {
            console.error('[AutofillTab] Scan error:', err);
            setError(err.message || 'Failed to scan page');
            setPhase('idle');
        }
    }, [jobDescription, resumeContent]);

    // ─── Fill All Fields ────────────────────────────────────
    const handleFillAll = useCallback(async () => {
        const fillable = fields.filter((f) => f.suggestedValue && f.category !== 'resume_upload');
        if (!fillable.length) {
            setToast({ message: 'No values to fill', type: 'error' });
            return;
        }

        setPhase('filling');
        try {
            const payload = fillable.map((f) => ({ id: f.id, value: f.suggestedValue }));
            await chrome.runtime.sendMessage({ type: 'FILL_ACTIVE_TAB', fields: payload });
            setToast({ message: `Filled ${fillable.length} fields!`, type: 'success' });
        } catch (err: any) {
            setToast({ message: 'Fill failed: ' + err.message, type: 'error' });
        } finally {
            setPhase('ready');
        }
    }, [fields]);

    // ─── Edit Field Value ───────────────────────────────────
    const startEdit = (field: DetectedField) => {
        setEditingId(field.id);
        setEditValue(field.suggestedValue);
    };

    const saveEdit = (fieldId: string) => {
        setFields((prev) =>
            prev.map((f) =>
                f.id === fieldId
                    ? { ...f, suggestedValue: editValue, userEdited: true, aiGenerated: false }
                    : f
            )
        );
        setEditingId(null);
        setEditValue('');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValue('');
    };

    // ─── Ask AI Freeform ────────────────────────────────────
    const handleAskAI = useCallback(async () => {
        if (!askQuestion.trim()) return;
        setAskLoading(true);
        setAskAnswer('');
        try {
            const kb = await knowledgeBaseService.buildKnowledgeBaseText();
            const answer = await aiService.generateAutofillAnswer(
                askQuestion,
                jobDescription || '',
                resumeContent || '',
                kb
            );
            setAskAnswer(answer.trim());
        } catch (err: any) {
            setToast({ message: 'AI answer failed: ' + err.message, type: 'error' });
        } finally {
            setAskLoading(false);
        }
    }, [askQuestion, jobDescription, resumeContent]);

    // ─── Category helpers ───────────────────────────────────
    const getCategoryColor = (field: DetectedField) => {
        if (field.userEdited) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        if (field.aiGenerated) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        if (field.category !== 'unknown' && field.category !== 'ai_question') {
            return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        }
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    };

    const getCategoryIcon = (field: DetectedField) => {
        if (field.userEdited) return <Edit3 className="w-3 h-3" />;
        if (field.aiGenerated) return <Bot className="w-3 h-3" />;
        if (field.suggestedValue) return <User className="w-3 h-3" />;
        return <HelpCircle className="w-3 h-3" />;
    };

    const getCategoryLabel = (field: DetectedField) => {
        if (field.userEdited) return 'Edited';
        if (field.aiGenerated) return 'AI';
        if (field.category !== 'unknown' && field.category !== 'ai_question' && field.suggestedValue) {
            return 'Profile';
        }
        return field.category.replace(/_/g, ' ');
    };

    // ─── Render ─────────────────────────────────────────────
    const readyFields = fields.filter((f) => f.suggestedValue);
    const emptyFields = fields.filter((f) => !f.suggestedValue && f.category !== 'resume_upload');
    const isLoading = ['scanning', 'classifying', 'generating', 'filling'].includes(phase);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-border space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-primary" />
                            Smart Autofill
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            AI-powered form detection & filling
                        </p>
                    </div>
                </div>

                <Button
                    onClick={handleScan}
                    disabled={isLoading}
                    className="w-full"
                    variant="glow"
                    size="sm"
                >
                    {phase === 'scanning' ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Scanning page...</>
                    ) : phase === 'classifying' ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Classifying fields...</>
                    ) : phase === 'generating' ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Generating AI answers...</>
                    ) : phase === 'filling' ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Filling form...</>
                    ) : (
                        <><Scan className="w-4 h-4" /> Scan This Page</>
                    )}
                </Button>

                {error && (
                    <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
            </div>

            {/* Field List */}
            {fields.length > 0 && (
                <div className="flex-1 overflow-y-auto">
                    {/* Stats bar */}
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/50 text-xs border-b border-border">
                        <span>
                            <strong>{readyFields.length}</strong> ready • <strong>{emptyFields.length}</strong> empty
                        </span>
                        {readyFields.length > 0 && (
                            <Button onClick={handleFillAll} disabled={isLoading} size="sm" variant="default" className="h-6 text-xs px-2">
                                <Wand2 className="w-3 h-3 mr-1" /> Fill All ({readyFields.length})
                            </Button>
                        )}
                    </div>

                    {/* Field cards */}
                    <div className="divide-y divide-border">
                        {fields.map((field) => (
                            <div
                                key={field.id}
                                className="px-4 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer"
                                onClick={() => setExpandedId(expandedId === field.id ? null : field.id)}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${getCategoryColor(field)}`}>
                                                {getCategoryIcon(field)}
                                                {getCategoryLabel(field)}
                                            </span>
                                            {field.required && <span className="text-[10px] text-red-400">required</span>}
                                        </div>
                                        <p className="text-xs font-medium mt-1 truncate">
                                            {field.label || field.placeholder || field.elementName || 'Unknown field'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {field.suggestedValue ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-gray-500" />}
                                        {expandedId === field.id ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                                    </div>
                                </div>

                                {field.suggestedValue && expandedId !== field.id && (
                                    <p className="text-[11px] text-muted-foreground mt-1 truncate">
                                        {field.suggestedValue.substring(0, 60)}{field.suggestedValue.length > 60 ? '...' : ''}
                                    </p>
                                )}

                                {expandedId === field.id && (
                                    <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                                        {editingId === field.id ? (
                                            <div className="space-y-2">
                                                <Textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} className="text-xs min-h-[60px]" autoFocus />
                                                <div className="flex gap-1.5">
                                                    <Button size="sm" className="h-6 text-xs" onClick={() => saveEdit(field.id)}>Save</Button>
                                                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={cancelEdit}>Cancel</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {field.suggestedValue ? (
                                                    <div className="bg-muted/50 rounded-lg p-2 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">{field.suggestedValue}</div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground italic">No value suggested</p>
                                                )}
                                                <div className="flex gap-1.5">
                                                    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => startEdit(field)}>
                                                        <Edit3 className="w-3 h-3 mr-1" /> Edit
                                                    </Button>
                                                    {field.suggestedValue && (
                                                        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={async () => {
                                                            try {
                                                                await chrome.runtime.sendMessage({ type: 'FILL_ACTIVE_TAB', fields: [{ id: field.id, value: field.suggestedValue }] });
                                                                setToast({ message: 'Field filled!', type: 'success' });
                                                            } catch { /* ignore */ }
                                                        }}>
                                                            Fill This
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    Type: {field.tagName}{field.inputType ? ` (${field.inputType})` : ''} • Category: {field.category.replace(/_/g, ' ')}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {phase === 'idle' && fields.length === 0 && !error && (
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center space-y-3">
                        <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                            <Scan className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Ready to Autofill</p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
                                Navigate to a job application form, then click <strong>Scan This Page</strong> to detect and fill fields automatically.
                            </p>
                        </div>
                        <div className="text-[10px] text-muted-foreground space-y-0.5">
                            <p>💡 Set up your <strong>Profile</strong> in Settings first</p>
                            <p>📄 Upload your resume for AI-generated answers</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Ask AI Freeform ─────────────────────────────── */}
            <div className="border-t border-border">
                <button
                    onClick={() => setShowAskAI(!showAskAI)}
                    className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted/50 transition-colors text-left"
                >
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                        <MessageSquare className="w-3.5 h-3.5 text-primary" />
                        Ask AI
                    </span>
                    {showAskAI ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>

                {showAskAI && (
                    <div className="px-4 pb-3 space-y-2">
                        <p className="text-[10px] text-muted-foreground">
                            Type any application question to get an AI-generated answer using your resume & JD context.
                        </p>
                        <div className="flex gap-1.5">
                            <Input
                                value={askQuestion}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAskQuestion(e.target.value)}
                                placeholder="e.g. Why are you interested in this role?"
                                className="text-xs h-7 flex-1"
                                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleAskAI()}
                            />
                            <Button size="sm" className="h-7 px-2" onClick={handleAskAI} disabled={askLoading || !askQuestion.trim()}>
                                {askLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            </Button>
                        </div>

                        {askAnswer && (
                            <div className="relative">
                                <div className="bg-muted/50 rounded-lg p-2.5 text-xs whitespace-pre-wrap max-h-40 overflow-y-auto pr-8">
                                    {askAnswer}
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="absolute top-1 right-1 h-6 w-6"
                                    onClick={() => {
                                        navigator.clipboard.writeText(askAnswer);
                                        setToast({ message: 'Copied to clipboard!', type: 'success' });
                                    }}
                                >
                                    <Copy className="w-3 h-3" />
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            )}
        </div>
    );
}
