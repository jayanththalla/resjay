// ResumeForge AI – Cold Outreach Service
// Generates personalized cold emails and DMs using AI

import { aiService } from './ai-service';

export interface OutreachMessage {
  id: string;
  applicationId: string;
  type: 'email' | 'dm';
  subject?: string;
  body: string;
  personalization: {
    recruiterName: string;
    companyName: string;
    position: string;
    keyHighlights: string[];
  };
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  scheduledDate?: number;
  sentDate?: number;
  deliveryStatus?: 'pending' | 'delivered' | 'bounced' | 'opened' | 'clicked';
  createdAt: number;
}

export interface OutreachTemplate {
  id: string;
  name: string;
  type: 'email' | 'dm';
  subject?: string;
  body: string;
  variables: string[];
  isActive: boolean;
}

class ColdOutreachService {
  private storageKey = 'resumeforge_outreach_messages';
  private templateKey = 'resumeforge_outreach_templates';

  // Generate personalized cold email using AI
  async generateColdEmail(
    recruiterName: string,
    companyName: string,
    position: string,
    userExperience: string,
    skills: string[],
    callbacks?: {
      onToken?: (token: string) => void;
      onComplete?: (fullText: string) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<string> {
    const prompt = `Generate a personalized cold email for a recruiter. Here are the details:

Recruiter Name: ${recruiterName}
Company: ${companyName}
Position: ${position}
Candidate Experience: ${userExperience}
Key Skills: ${skills.join(', ')}

Requirements:
- Keep it concise (max 150 words for email body)
- Make it personal and relevant to their company
- Include a clear call-to-action
- Be professional but friendly
- Mention a specific reason for interest

Format:
Subject: [subject line]
Body: [email body]`;

    return new Promise((resolve, reject) => {
      aiService.streamChat(
        [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        'You are an expert at writing personalized cold emails for job applications.',
        {
          onToken: (token) => callbacks?.onToken?.(token),
          onComplete: (text) => {
            resolve(text);
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

  // Generate LinkedIn DM
  async generateLinkedInDM(
    recruiterName: string,
    companyName: string,
    position: string,
    userBackground: string,
    callbacks?: {
      onToken?: (token: string) => void;
      onComplete?: (fullText: string) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<string> {
    const prompt = `Generate a personalized LinkedIn DM for a recruiter. Details:

Recruiter: ${recruiterName}
Company: ${companyName}
Position: ${position}
Background: ${userBackground}

Requirements:
- Keep it short (2-3 sentences max)
- Natural and conversational tone
- Mention the specific role
- Include relevant detail about your interest
- End with an open-ended question or CTA

Format just the message body:`;

    return new Promise((resolve, reject) => {
      aiService.streamChat(
        [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        'You are an expert at writing short, engaging LinkedIn DMs that get responses.',
        {
          onToken: (token) => callbacks?.onToken?.(token),
          onComplete: (text) => {
            resolve(text);
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

  // Create and save outreach message
  async createOutreachMessage(
    applicationId: string,
    type: 'email' | 'dm',
    body: string,
    personalization: OutreachMessage['personalization'],
    subject?: string
  ): Promise<OutreachMessage> {
    const message: OutreachMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      applicationId,
      type,
      subject,
      body,
      personalization,
      status: 'draft',
      createdAt: Date.now(),
    };

    const messages = await this.getAllMessages();
    messages.push(message);
    await this.saveMessages(messages);

    return message;
  }

  // Schedule outreach message
  async scheduleMessage(messageId: string, scheduledDate: number): Promise<OutreachMessage> {
    const messages = await this.getAllMessages();
    const index = messages.findIndex((m) => m.id === messageId);

    if (index === -1) throw new Error(`Message ${messageId} not found`);

    messages[index].status = 'scheduled';
    messages[index].scheduledDate = scheduledDate;

    await this.saveMessages(messages);
    return messages[index];
  }

  // Mark message as sent
  async markAsSent(messageId: string, deliveryStatus?: string): Promise<OutreachMessage> {
    const messages = await this.getAllMessages();
    const index = messages.findIndex((m) => m.id === messageId);

    if (index === -1) throw new Error(`Message ${messageId} not found`);

    messages[index].status = 'sent';
    messages[index].sentDate = Date.now();
    if (deliveryStatus) {
      messages[index].deliveryStatus = deliveryStatus as OutreachMessage['deliveryStatus'];
    }

    await this.saveMessages(messages);
    return messages[index];
  }

  // Get all messages for an application
  async getApplicationMessages(applicationId: string): Promise<OutreachMessage[]> {
    const messages = await this.getAllMessages();
    return messages.filter((m) => m.applicationId === applicationId);
  }

  // Get all messages
  async getAllMessages(): Promise<OutreachMessage[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get(this.storageKey, (result) => {
        resolve(result[this.storageKey] || []);
      });
    });
  }

  // Get scheduled messages
  async getScheduledMessages(): Promise<OutreachMessage[]> {
    const messages = await this.getAllMessages();
    const now = Date.now();

    return messages.filter(
      (m) => m.status === 'scheduled' && m.scheduledDate && m.scheduledDate <= now
    );
  }

  // Save template
  async saveTemplate(template: OutreachTemplate): Promise<void> {
    const templates = await this.getTemplates();
    const index = templates.findIndex((t) => t.id === template.id);

    if (index === -1) {
      templates.push(template);
    } else {
      templates[index] = template;
    }

    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.templateKey]: templates }, () => {
        resolve();
      });
    });
  }

  // Get templates
  async getTemplates(): Promise<OutreachTemplate[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get(this.templateKey, (result) => {
        resolve(result[this.templateKey] || []);
      });
    });
  }

  // Delete message
  async deleteMessage(messageId: string): Promise<void> {
    const messages = await this.getAllMessages();
    const filtered = messages.filter((m) => m.id !== messageId);
    await this.saveMessages(filtered);
  }

  private async saveMessages(messages: OutreachMessage[]): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.storageKey]: messages }, () => {
        resolve();
      });
    });
  }
}

export const coldOutreachService = new ColdOutreachService();
