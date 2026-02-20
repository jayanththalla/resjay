import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input, Textarea, Card, CardContent, Tabs, TabsList, TabsTrigger, TabsContent } from './ui/index';
import { aiService } from '@/services/ai-service';
import { emailService } from '@/services/email-service';
import { cn, generateId } from '@/lib/utils';
import { Mail, Linkedin, FileText, Send, Loader2, Copy, ExternalLink, CheckCircle2 } from 'lucide-react';

interface EmailTabProps {
  resumeLatex: string;
  jobDescription: string;
  knowledgeBase: string;
}

export function EmailTab({ resumeLatex, jobDescription, knowledgeBase }: EmailTabProps) {
  const [activeType, setActiveType] = useState('email');
  const [recruiterInfo, setRecruiterInfo] = useState('');
  const [recruiterEmail, setRecruiterEmail] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const resumeSummary = resumeLatex
    ? resumeLatex.substring(0, 1500) // Use first chunk as summary context
    : 'No resume uploaded yet';

  const handleGenerate = async () => {
    setLoading(true);
    setGeneratedContent('');
    try {
      let result = '';
      if (activeType === 'email') {
        result = await aiService.generateColdEmail(
          recruiterInfo || 'Hiring Manager',
          jobDescription,
          resumeSummary,
          {
            onToken: (t: string) => setGeneratedContent((p) => p + t),
            onComplete: (full: string) => setGeneratedContent(full),
            onError: (err: Error) => setGeneratedContent(`Error: ${err.message}`),
          }
        );
      } else if (activeType === 'cover') {
        result = await aiService.generateCoverLetter(
          jobDescription,
          resumeLatex,
          knowledgeBase,
          {
            onToken: (t: string) => setGeneratedContent((p) => p + t),
            onComplete: (full: string) => setGeneratedContent(full),
            onError: (err: Error) => setGeneratedContent(`Error: ${err.message}`),
          }
        );
      } else if (activeType === 'dm') {
        result = await aiService.generateLinkedInDM(
          recruiterInfo || linkedinUrl,
          jobDescription,
          resumeSummary
        );
        setGeneratedContent(result);
      }
    } catch (err: any) {
      setGeneratedContent(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendGmail = () => {
    const { subject, body } = emailService.parseEmailDraft(generatedContent);
    emailService.openGmailCompose({
      to: recruiterEmail,
      subject,
      body,
    });
  };

  const handleSendOutlook = () => {
    const { subject, body } = emailService.parseEmailDraft(generatedContent);
    emailService.openOutlookCompose({
      to: recruiterEmail,
      subject,
      body,
    });
  };

  const handleOpenLinkedIn = () => {
    if (linkedinUrl) {
      emailService.openLinkedInMessage(linkedinUrl, generatedContent);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto">
      <div>
        <h2 className="text-base font-semibold mb-1">Cold Outreach</h2>
        <p className="text-xs text-muted-foreground">Generate personalized emails, cover letters, and LinkedIn messages</p>
      </div>

      {/* Type selector */}
      <Tabs value={activeType} onValueChange={setActiveType}>
        <TabsList>
          <TabsTrigger value="email">
            <Mail className="w-3.5 h-3.5 mr-1" /> Email
          </TabsTrigger>
          <TabsTrigger value="cover">
            <FileText className="w-3.5 h-3.5 mr-1" /> Cover Letter
          </TabsTrigger>
          <TabsTrigger value="dm">
            <Linkedin className="w-3.5 h-3.5 mr-1" /> DM
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Recruiter Email</label>
              <Input
                value={recruiterEmail}
                onChange={(e) => setRecruiterEmail(e.target.value)}
                placeholder="recruiter@company.com"
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Recruiter/Company Info</label>
              <Textarea
                value={recruiterInfo}
                onChange={(e) => setRecruiterInfo(e.target.value)}
                placeholder="Name, company, role they're hiring for, any personal details..."
                className="text-xs min-h-[60px]"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cover">
          <p className="text-xs text-muted-foreground py-2">
            A cover letter will be generated based on your resume and the job description.
            {!jobDescription && ' Paste a JD in the Resume tab first.'}
          </p>
        </TabsContent>

        <TabsContent value="dm">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">LinkedIn Profile URL</label>
              <Input
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://www.linkedin.com/in/recruiter-name"
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Additional Context</label>
              <Textarea
                value={recruiterInfo}
                onChange={(e) => setRecruiterInfo(e.target.value)}
                placeholder="Any specific details about the recruiter or role..."
                className="text-xs min-h-[60px]"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={loading || (!jobDescription && activeType !== 'dm')}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Mail className="w-4 h-4" />
            Generate {activeType === 'email' ? 'Email' : activeType === 'cover' ? 'Cover Letter' : 'DM'}
          </>
        )}
      </Button>

      {/* Generated content */}
      {generatedContent && (
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold">Generated Draft</h3>
              <button
                onClick={handleCopy}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="text-xs whitespace-pre-wrap leading-relaxed text-foreground/90 bg-muted/50 p-3 rounded-lg">
              {generatedContent}
            </pre>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-3">
              {activeType === 'email' && (
                <>
                  <Button size="sm" onClick={handleSendGmail} className="text-xs flex-1">
                    <ExternalLink className="w-3 h-3" />
                    Open in Gmail
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleSendOutlook} className="text-xs flex-1">
                    <ExternalLink className="w-3 h-3" />
                    Outlook
                  </Button>
                </>
              )}
              {activeType === 'dm' && linkedinUrl && (
                <Button size="sm" onClick={handleOpenLinkedIn} className="text-xs flex-1">
                  <Linkedin className="w-3 h-3" />
                  Open LinkedIn
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
