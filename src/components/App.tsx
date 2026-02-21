import React, { useState, useEffect, useCallback } from 'react';
import { LandingPage } from './LandingPage';
import { ChatInterface } from './ChatInterface';
import { ResumeUpload } from './ResumeUpload';
import { ResumePreview } from './ResumePreview';
import { EmailTab } from './EmailTab';
import { AutofillTab } from './AutofillTab';
import { ApplicationsTab } from './ApplicationsTab';
import { SettingsPanel } from './SettingsPanel';
import { ErrorBoundary } from './ErrorBoundary';
import { Button } from './ui/button';
import { Textarea, Tabs, TabsList, TabsTrigger, TabsContent, Toast } from './ui/index';
import { storageService, type AppState, type ChatMessage, type ChatSession } from '@/services/storage-service';
import { aiService, type MultiAgentProgress } from '@/services/ai-service';
import { knowledgeBaseService } from '@/services/knowledge-base-service';
import { cn, generateId } from '@/lib/utils';
import {
  MessageSquare, FileText, Mail, Settings, Eye, EyeOff,
  PanelRightOpen, PanelRightClose, ChevronLeft, Sparkles,
  Loader2, Zap, Menu, X, Briefcase,
} from 'lucide-react';

type View = 'landing' | 'main' | 'settings';

function AppContent() {
  const [view, setView] = useState<View>('landing');
  const [activeTab, setActiveTab] = useState('resume');
  const [resumeLatex, setResumeLatex] = useState('');
  const [tailoredLatex, setTailoredLatex] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  const [knowledgeBase, setKnowledgeBase] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState(generateId());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [multiAgentProgress, setMultiAgentProgress] = useState<MultiAgentProgress | null>(null);

  // ─── Init ── check onboarding state & apply theme ─────────
  useEffect(() => {
    (async () => {
      // Apply saved theme immediately
      const settings = await storageService.getSettings();
      const theme = settings.theme || 'dark';
      document.documentElement.classList.toggle('dark', theme === 'dark');

      const appState = await storageService.getAppState();
      if (appState.isOnboarded) {
        await aiService.init();
        setView('main');
        const kbText = await knowledgeBaseService.buildKnowledgeBaseText();
        setKnowledgeBase(kbText);
      }
    })();
  }, []);

  const handleOnboardingComplete = async () => {
    await aiService.init(); // Initialize AI as soon as onboarded
    setView('main');
    const kbText = await knowledgeBaseService.buildKnowledgeBaseText();
    setKnowledgeBase(kbText);
  };

  const handleResumeUpload = (content: string, fileName: string) => {
    setResumeLatex(content);
    setResumeFileName(fileName);
    setToast({ message: `Loaded ${fileName}`, type: 'success' });
  };

  const handleLatexUpdate = useCallback((latex: string) => {
    setTailoredLatex(latex);
    setShowPreview(true);
  }, []);

  const handleQuickTailor = async () => {
    if (!resumeLatex || !jobDescription) {
      setToast({ message: 'Upload resume and paste JD first', type: 'error' });
      return;
    }

    const settings = await storageService.getSettings();

    if (settings.multiAgentMode) {
      setMultiAgentProgress({ step: 0, totalSteps: 5, message: 'Starting...' });
      try {
        const result = await aiService.generateTailoredResumeMultiAgent(
          resumeLatex,
          jobDescription,
          knowledgeBase,
          (progress) => setMultiAgentProgress(progress)
        );
        setTailoredLatex(result);
        setShowPreview(true);
        setToast({ message: 'Resume tailored successfully!', type: 'success' });

        // Auto-add a system message to chat
        const sysMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: '✅ Resume tailored using multi-agent mode! Switch to the Preview tab to see the result, or ask me to refine specific sections.',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, sysMsg]);
      } catch (err: any) {
        setToast({ message: err.message, type: 'error' });
      } finally {
        setMultiAgentProgress(null);
      }
    } else {
      setMultiAgentProgress({ step: 1, totalSteps: 1, message: 'Tailoring resume...' });
      try {
        const result = await aiService.generateTailoredResume(
          resumeLatex,
          jobDescription,
          knowledgeBase
        );
        setTailoredLatex(result);
        setShowPreview(true);
        setToast({ message: 'Resume tailored!', type: 'success' });
      } catch (err: any) {
        setToast({ message: err.message, type: 'error' });
      } finally {
        setMultiAgentProgress(null);
      }
    }

    // Save to history
    await storageService.addResumeHistory({
      id: generateId(),
      company: 'Application',
      position: '',
      originalLatex: resumeLatex,
      tailoredLatex: tailoredLatex,
      jobDescription,
      createdAt: Date.now(),
    });
  };

  // ─── Landing ───────────────────────────────────────────────
  if (view === 'landing') {
    return <LandingPage onComplete={handleOnboardingComplete} />;
  }

  // ─── Settings ──────────────────────────────────────────────
  if (view === 'settings') {
    return <SettingsPanel onClose={() => setView('main')} />;
  }

  // ─── Main App ──────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <h1 className="text-sm font-bold gradient-text">ResumeForge AI</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowPreview(!showPreview)}
            className="h-8 w-8"
            title={showPreview ? 'Hide Preview' : 'Show Preview'}
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setView('settings')}
            className="h-8 w-8"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Multi-agent progress bar */}
      {multiAgentProgress && (
        <div className="px-4 py-2 bg-primary/5 border-b border-primary/10">
          <div className="flex items-center gap-2 mb-1">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span className="text-xs font-medium">{multiAgentProgress.message}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(multiAgentProgress.step / multiAgentProgress.totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Nav tabs */}
      <div className="border-b border-border">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="rounded-none border-0 bg-transparent">
            <TabsTrigger value="resume">
              <FileText className="w-3.5 h-3.5 mr-1" /> Resume
            </TabsTrigger>
            <TabsTrigger value="chat">
              <MessageSquare className="w-3.5 h-3.5 mr-1" /> Chat
            </TabsTrigger>
            <TabsTrigger value="autofill">
              <Zap className="w-3.5 h-3.5 mr-1" /> Autofill
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="w-3.5 h-3.5 mr-1" /> Email
            </TabsTrigger>
            <TabsTrigger value="applications">
              <Briefcase className="w-3.5 h-3.5 mr-1" /> Applications
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className={cn('flex flex-col overflow-hidden transition-all duration-300', showPreview ? 'w-1/2' : 'w-full')}>
          {activeTab === 'resume' && (
            <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
              {/* Upload */}
              <ResumeUpload
                onUpload={handleResumeUpload}
                currentFileName={resumeFileName}
              />

              {/* Job Description */}
              <div className="space-y-2">
                <label className="text-xs font-semibold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  Job Description
                </label>
                <Textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description here..."
                  className="text-xs min-h-[150px]"
                />
              </div>

              {/* Quick Tailor Button */}
              <Button
                onClick={handleQuickTailor}
                disabled={!resumeLatex || !jobDescription || !!multiAgentProgress}
                className="w-full"
                variant="glow"
                size="lg"
              >
                {multiAgentProgress ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {multiAgentProgress.message}
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Quick Tailor (One-Click)
                  </>
                )}
              </Button>
            </div>
          )}

          {activeTab === 'chat' && (
            <ChatInterface
              resumeLatex={resumeLatex}
              jobDescription={jobDescription}
              knowledgeBase={knowledgeBase}
              onLatexUpdate={handleLatexUpdate}
              messages={messages}
              onMessagesChange={setMessages}
            />
          )}

          {activeTab === 'email' && (
            <EmailTab
              resumeLatex={resumeLatex}
              jobDescription={jobDescription}
              knowledgeBase={knowledgeBase}
            />
          )}

          {activeTab === 'autofill' && (
            <AutofillTab
              resumeContent={resumeLatex}
              jobDescription={jobDescription}
            />
          )}

          {activeTab === 'applications' && (
            <ApplicationsTab
              onApplicationTracked={() => {
                setToast({ message: 'Application tracked successfully!', type: 'success' });
              }}
            />
          )}
        </div>

        {/* Right Panel – Preview */}
        {showPreview && (
          <div className="w-1/2 border-l border-border">
            <ResumePreview
              originalLatex={resumeLatex}
              tailoredLatex={tailoredLatex}
            />
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
