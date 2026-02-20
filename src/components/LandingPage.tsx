import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input, Card, CardContent } from './ui/index';
import { aiService } from '@/services/ai-service';
import { storageService } from '@/services/storage-service';
import {
  Sparkles,
  MessageSquare,
  FileText,
  Download,
  Mail,
  ClipboardEdit,
  ArrowRight,
  Shield,
  Zap,
  Eye,
  ChevronDown,
  CheckCircle2,
  Upload,
  CloudUpload,
} from 'lucide-react';

interface LandingPageProps {
  onComplete: () => void;
}

const features = [
  { icon: Sparkles, title: 'AI Resume Tailoring', desc: 'Modify your LaTeX resume to match any JD with Gemini AI' },
  { icon: MessageSquare, title: 'Chat Interface', desc: 'Iterate on your resume through conversation, like ChatGPT' },
  { icon: Eye, title: 'Live Preview', desc: 'Side-by-side original vs. tailored resume with compiled PDF view' },
  { icon: Download, title: 'Multi-Format Export', desc: 'Download as PDF, DOCX, or .tex with Google Drive upload' },
  { icon: Mail, title: 'Cold Emails & DMs', desc: 'Generate personalized outreach to recruiters and hiring managers' },
  { icon: ClipboardEdit, title: 'Form Autofill', desc: 'Auto-fill job applications on LinkedIn, Indeed, and more' },
];

const steps = [
  { num: '01', title: 'Enter Your API Key', desc: 'Get a free Gemini API key from Google AI Studio – no login to our service needed' },
  { num: '02', title: 'Upload Your Resume', desc: 'Upload a .tex file, paste LaTeX code, or import from Overleaf' },
  { num: '03', title: 'Paste a Job Description', desc: 'Copy-paste the JD from any job listing you want to apply to' },
  { num: '04', title: 'Chat & Tailor', desc: 'Ask AI to tailor your resume, add keywords, swap projects, and refine' },
  { num: '05', title: 'Download & Apply', desc: 'Export as PDF/DOCX, upload to GDrive, generate cold emails, and autofill forms' },
];

export function LandingPage({ onComplete }: LandingPageProps) {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleGetStarted = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your Gemini API key');
      return;
    }
    if (!apiKey.startsWith('AIza')) {
      setError('Invalid API key format. Keys start with "AIza..."');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await aiService.setApiKey(apiKey.trim());
      await storageService.saveAppState({ isOnboarded: true });
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      {/* ─── Hero Section ──────────────────────────────────── */}
      <section className="relative px-6 pt-12 pb-16 text-center overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Powered by Google Gemini AI
          </div>

          <h1 className="text-3xl font-bold leading-tight mb-4">
            <span className="gradient-text">ResumeForge AI</span>
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed mb-3 font-medium">
            AI-Powered Resume Tailor & Job Application Automator
          </p>
          <p className="text-sm text-muted-foreground/80 leading-relaxed mb-8">
            Beat ATS systems, send personalized cold emails, and autofill job applications – all from your browser.
          </p>

          <a href="#get-started">
            <Button size="lg" className="group text-base px-8">
              Get Started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </a>
        </div>
      </section>

      {/* ─── What It Is ────────────────────────────────────── */}
      <section className="px-6 pb-12">
        <Card className="glass-card max-w-lg mx-auto">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">Free & Privacy-First</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No login. No servers storing your data. Your Gemini API key stays in your browser.
                  ResumeForge processes everything locally and sends only text to Google's AI – never your files.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ─── Features Grid ─────────────────────────────────── */}
      <section className="px-6 pb-12">
        <h2 className="text-xl font-bold text-center mb-6">Everything You Need</h2>
        <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
          {features.map((f) => (
            <Card key={f.title} className="glass-card group hover:scale-[1.02] transition-transform">
              <CardContent className="p-4">
                <div className="p-2 rounded-lg bg-primary/10 text-primary w-fit mb-2 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold mb-1">{f.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── How It Works ──────────────────────────────────── */}
      <section className="px-6 pb-12">
        <h2 className="text-xl font-bold text-center mb-6">How It Works</h2>
        <div className="max-w-lg mx-auto space-y-3">
          {steps.map((step, i) => (
            <div key={step.num} className="flex gap-4 items-start animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                {step.num}
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-0.5">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Workflows ─────────────────────────────────────── */}
      <section className="px-6 pb-12">
        <h2 className="text-xl font-bold text-center mb-6">Complete Workflows</h2>
        <div className="max-w-lg mx-auto space-y-3">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Resume Tailoring</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Upload your LaTeX resume → paste job description → chat with AI to tailor → preview side-by-side →
                download as PDF/DOCX → upload to Google Drive with auto-naming.
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Cold Outreach</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter recruiter info → AI generates personalized email, cover letter, or LinkedIn DM →
                open directly in Gmail, Outlook, or LinkedIn messaging.
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardEdit className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Application Autofill</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Navigate to any job application → right-click "Autofill" → extension maps your data to form fields →
                AI answers custom questions → attach your tailored resume.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ─── Get Started ───────────────────────────────────── */}
      <section id="get-started" className="px-6 pb-16">
        <Card className="glass-card max-w-lg mx-auto border-primary/20">
          <CardContent className="p-6">
            <div className="text-center mb-5">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary w-fit mx-auto mb-3">
                <Zap className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold mb-1">Get Started</h2>
              <p className="text-xs text-muted-foreground">
                Enter your free Gemini API key to begin.{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Get one here →
                </a>
              </p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  placeholder="AIza..."
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setError(''); }}
                  className="pr-16"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}

              <Button
                onClick={handleGetStarted}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <span className="typing-indicator">
                      <span /><span /><span />
                    </span>
                    Verifying...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Start Tailoring
                  </>
                )}
              </Button>

              <p className="text-[10px] text-muted-foreground/60 text-center">
                Your API key is stored locally in Chrome storage and never sent to our servers.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
