// ResumeForge AI – Application Tracking Service
// Manages job applications, recruiter contacts, and tracking status

export interface JobApplication {
  id: string;
  companyName: string;
  position: string;
  applicationDate: number;
  status: 'applied' | 'rejected' | 'interview' | 'offer' | 'accepted' | 'pending';
  jobUrl?: string;
  salary?: string;
  location?: string;
  
  // Recruiter info
  recruiterName?: string;
  recruiterEmail?: string;
  recruiterLinkedIn?: string;
  
  // Resume and materials
  tailoredResume?: string;
  coverLetterSent?: boolean;
  
  // Outreach tracking
  coldEmailSent?: boolean;
  dmSent?: boolean;
  emailDate?: number;
  dmDate?: number;
  
  // Follow-ups
  lastFollowUpDate?: number;
  followUpCount: number;
  nextFollowUpDate?: number;
  
  // Notes and feedback
  notes?: string;
  feedback?: string;
  
  // AI analysis
  formAnswers?: Record<string, string>;
  labelSuggestions?: Record<string, string[]>;
  updatedAt: number;
}

export interface ApplicationMetrics {
  totalApplications: number;
  appliedCount: number;
  interviewCount: number;
  rejectedCount: number;
  offerCount: number;
  successRate: number;
  averageTimeToResponse: number;
}

export interface FollowUpTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  daysSinceApplication: number;
  isActive: boolean;
}

class ApplicationTrackingService {
  private storageKey = 'resumeforge_applications';
  private followUpKey = 'resumeforge_followup_templates';

  // Create new application
  async createApplication(data: Omit<JobApplication, 'id' | 'followUpCount' | 'updatedAt'>): Promise<JobApplication> {
    const application: JobApplication = {
      ...data,
      id: `app_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      followUpCount: 0,
      updatedAt: Date.now(),
    };

    const applications = await this.getAllApplications();
    applications.push(application);
    await this.saveApplications(applications);

    return application;
  }

  // Update application
  async updateApplication(id: string, updates: Partial<JobApplication>): Promise<JobApplication> {
    const applications = await this.getAllApplications();
    const index = applications.findIndex((app) => app.id === id);

    if (index === -1) throw new Error(`Application ${id} not found`);

    applications[index] = {
      ...applications[index],
      ...updates,
      updatedAt: Date.now(),
    };

    await this.saveApplications(applications);
    return applications[index];
  }

  // Get all applications
  async getAllApplications(): Promise<JobApplication[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get(this.storageKey, (result) => {
        resolve(result[this.storageKey] || []);
      });
    });
  }

  // Get application by ID
  async getApplication(id: string): Promise<JobApplication | null> {
    const applications = await this.getAllApplications();
    return applications.find((app) => app.id === id) || null;
  }

  // Filter applications by status
  async getApplicationsByStatus(status: JobApplication['status']): Promise<JobApplication[]> {
    const applications = await this.getAllApplications();
    return applications.filter((app) => app.status === status);
  }

  // Delete application
  async deleteApplication(id: string): Promise<void> {
    const applications = await this.getAllApplications();
    const filtered = applications.filter((app) => app.id !== id);
    await this.saveApplications(filtered);
  }

  // Get applications due for follow-up
  async getApplicationsDueForFollowUp(): Promise<JobApplication[]> {
    const applications = await this.getAllApplications();
    const now = Date.now();

    return applications.filter((app) => {
      if (!app.nextFollowUpDate) return false;
      return app.nextFollowUpDate <= now && app.status === 'applied';
    });
  }

  // Calculate metrics
  async getMetrics(): Promise<ApplicationMetrics> {
    const applications = await this.getAllApplications();

    const applied = applications.filter((app) => app.status === 'applied').length;
    const interviews = applications.filter((app) => app.status === 'interview').length;
    const rejected = applications.filter((app) => app.status === 'rejected').length;
    const offers = applications.filter((app) => app.status === 'offer').length;

    const successRate = applications.length > 0 ? ((interviews + offers) / applications.length) * 100 : 0;

    return {
      totalApplications: applications.length,
      appliedCount: applied,
      interviewCount: interviews,
      rejectedCount: rejected,
      offerCount: offers,
      successRate: Math.round(successRate),
      averageTimeToResponse: this.calculateAvgTimeToResponse(applications),
    };
  }

  // Save follow-up templates
  async saveFollowUpTemplate(template: FollowUpTemplate): Promise<void> {
    const templates = await this.getFollowUpTemplates();
    const index = templates.findIndex((t) => t.id === template.id);

    if (index === -1) {
      templates.push(template);
    } else {
      templates[index] = template;
    }

    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.followUpKey]: templates }, () => {
        resolve();
      });
    });
  }

  // Get follow-up templates
  async getFollowUpTemplates(): Promise<FollowUpTemplate[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get(this.followUpKey, (result) => {
        resolve(result[this.followUpKey] || this.getDefaultTemplates());
      });
    });
  }

  // Delete follow-up template
  async deleteFollowUpTemplate(id: string): Promise<void> {
    const templates = await this.getFollowUpTemplates();
    const filtered = templates.filter((t) => t.id !== id);

    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.followUpKey]: filtered }, () => {
        resolve();
      });
    });
  }

  // Private helpers
  private async saveApplications(applications: JobApplication[]): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.storageKey]: applications }, () => {
        resolve();
      });
    });
  }

  private getDefaultTemplates(): FollowUpTemplate[] {
    return [
      {
        id: 'template_1',
        name: 'Day 3 Check-in',
        subject: 'Following up on {position} application',
        body: `Hi {recruiterName},\n\nI applied for the {position} role at {company} a few days ago and wanted to check if you've had a chance to review my resume.\n\nLooking forward to hearing from you.\n\nBest regards`,
        daysSinceApplication: 3,
        isActive: true,
      },
      {
        id: 'template_2',
        name: 'Week 1 Follow-up',
        subject: 'Re: {position} at {company}',
        body: `Hi {recruiterName},\n\nI hope you're doing well. I'm very interested in the {position} position and wanted to follow up on my application.\n\nI'm confident my skills align well with the role.\n\nLooking forward to your feedback.\n\nBest`,
        daysSinceApplication: 7,
        isActive: true,
      },
      {
        id: 'template_3',
        name: 'Two-Week Follow-up',
        subject: 'Status update: {position} application',
        body: `Hi {recruiterName},\n\nJust following up on my application for the {position} role at {company}.\n\nI remain very interested in this opportunity and would love to discuss how I can contribute to your team.\n\nPlease let me know next steps.\n\nThanks!`,
        daysSinceApplication: 14,
        isActive: true,
      },
    ];
  }

  private calculateAvgTimeToResponse(applications: JobApplication[]): number {
    const responseTimes = applications
      .filter((app) => app.lastFollowUpDate && app.status !== 'applied')
      .map((app) => (app.lastFollowUpDate! - app.applicationDate) / (1000 * 60 * 60 * 24));

    if (responseTimes.length === 0) return 0;
    const sum = responseTimes.reduce((a, b) => a + b, 0);
    return Math.round(sum / responseTimes.length);
  }
}

export const applicationTrackingService = new ApplicationTrackingService();
