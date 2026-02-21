import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input, Textarea, Card, CardContent } from './ui/index';
import { coldOutreachService } from '@/services/cold-outreach-service';
import { Send, Sparkles, Copy, Check, Mail, MessageCircle, Loader2, Calendar, Clock } from 'lucide-react';

interface ColdOutreachBuilderProps {
  applicationId: string;
  recruiterName: string;
  companyName: string;
  position: string;
  onMessageSaved?: () => void;
}

export function ColdOutreachBuilder({
  applicationId,
  recruiterName,
  companyName,
  position,
  onMessageSaved,
}: ColdOutreachBuilderProps) {
  const [messageType, setMessageType] = useState<'email' | 'dm'>('email');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [userExperience, setUserExperience] = useState('');
  const [skills, setSkills] = useState('');

  const handleGenerateMessage = async () => {
    if (!userExperience.trim()) {
      alert('Please provide your experience details');
      return;
    }

    setIsGenerating(true);

    try {
      const skillsArray = skills
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s);

      let message = '';

      if (messageType === 'email') {
        message = await coldOutreachService.generateColdEmail(
          recruiterName || 'Hiring Manager',
          companyName,
          position,
          userExperience,
          skillsArray,
          {
            onToken: (token) => {
              setGeneratedMessage((prev) => prev + token);
            },
          }
        );
      } else {
        message = await coldOutreachService.generateLinkedInDM(
          recruiterName || 'Hiring Manager',
          companyName,
          position,
          userExperience,
          {
            onToken: (token) => {
              setGeneratedMessage((prev) => prev + token);
            },
          }
        );
      }

      // Parse subject from email if present
      if (messageType === 'email' && message.includes('Subject:')) {
        const parts = message.split('Body:');
        const subjectLine = parts[0].match(/Subject:\s*(.+)/)?.[1] || '';
        setSubject(subjectLine);
        setGeneratedMessage(parts[1]?.trim() || message);
      }
    } catch (error) {
      console.error('[v0] Error generating message:', error);
      alert('Failed to generate message. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyMessage = () => {
    const fullMessage = messageType === 'email' && subject ? `Subject: ${subject}\n\n${generatedMessage}` : generatedMessage;
    navigator.clipboard.writeText(fullMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveMessage = async () => {
    try {
      const skillsArray = skills
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s);

      await coldOutreachService.createOutreachMessage(
        applicationId,
        messageType,
        generatedMessage,
        {
          recruiterName: recruiterName || 'Unknown',
          companyName,
          position,
          keyHighlights: skillsArray,
        },
        messageType === 'email' ? subject : undefined
      );

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      onMessageSaved?.();
    } catch (error) {
      console.error('[v0] Error saving message:', error);
      alert('Failed to save message');
    }
  };

  const handleScheduleMessage = async () => {
    if (!scheduledDate) {
      alert('Please select a date');
      return;
    }

    try {
      const message = await coldOutreachService.createOutreachMessage(
        applicationId,
        messageType,
        generatedMessage,
        {
          recruiterName: recruiterName || 'Unknown',
          companyName,
          position,
          keyHighlights: skills.split(',').map((s) => s.trim()).filter((s) => s),
        },
        messageType === 'email' ? subject : undefined
      );

      await coldOutreachService.scheduleMessage(message.id, new Date(scheduledDate).getTime());

      alert('Message scheduled successfully!');
      setScheduledDate('');
      onMessageSaved?.();
    } catch (error) {
      console.error('[v0] Error scheduling message:', error);
      alert('Failed to schedule message');
    }
  };

  return (
    <div className="space-y-4">
      {/* Message Type Selection */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setMessageType('email');
            setGeneratedMessage('');
            setSubject('');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            messageType === 'email'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border hover:border-primary/30'
          }`}
        >
          <Mail className="w-4 h-4" />
          Cold Email
        </button>
        <button
          onClick={() => {
            setMessageType('dm');
            setGeneratedMessage('');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            messageType === 'dm'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border hover:border-primary/30'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          LinkedIn DM
        </button>
      </div>

      {/* Input Fields */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium mb-1 block">Your Key Experience/Background</label>
          <Textarea
            placeholder="E.g., 5 years of full-stack development, led team of 3 engineers, built scalable systems"
            value={userExperience}
            onChange={(e) => setUserExperience(e.target.value)}
            className="min-h-20 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block">Key Skills (comma-separated)</label>
          <Input
            placeholder="React, TypeScript, Node.js, AWS"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
          />
        </div>

        {messageType === 'email' && generatedMessage && (
          <div>
            <label className="text-xs font-medium mb-1 block">Subject Line</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Generated subject line"
            />
          </div>
        )}
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerateMessage}
        disabled={isGenerating || !userExperience.trim()}
        className="w-full"
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {isGenerating ? 'Generating...' : 'Generate with AI'}
      </Button>

      {/* Generated Message */}
      {generatedMessage && (
        <Card className="glass-card border-primary/20 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Generated Message:</p>
              <div className="bg-background/50 p-3 rounded-lg border border-border text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                {messageType === 'email' && subject && (
                  <>
                    <p className="font-semibold mb-2">Subject: {subject}</p>
                    <hr className="my-2" />
                  </>
                )}
                {generatedMessage}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleCopyMessage} variant="outline" size="sm" className="flex-1">
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>

              <Button onClick={handleSaveMessage} variant="outline" size="sm" className="flex-1">
                {isSaved ? <Check className="w-3 h-3 text-green-500" /> : <Send className="w-3 h-3" />}
                {isSaved ? 'Saved' : 'Save as Draft'}
              </Button>

              <Button variant="outline" size="sm" className="flex-1" onClick={() => setGeneratedMessage('')}>
                Regenerate
              </Button>
            </div>

            {/* Schedule Section */}
            <div className="border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Schedule for Later</p>
              <div className="flex gap-2">
                <Input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="text-sm"
                />
                <Button onClick={handleScheduleMessage} disabled={!scheduledDate} size="sm" className="px-3">
                  <Clock className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
