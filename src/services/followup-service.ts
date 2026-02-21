// ResumeForge AI – Follow-up Management Service
// Manages automatic follow-ups on scheduled dates

import { applicationTrackingService } from './application-tracking-service';
import { coldOutreachService } from './cold-outreach-service';

export interface FollowUpSchedule {
  id: string;
  applicationId: string;
  daysSinceApplication: number;
  templateId: string;
  templateName: string;
  scheduledDate: number;
  status: 'pending' | 'sent' | 'skipped';
  messageGenerated?: string;
  sentDate?: number;
}

export interface FollowUpStats {
  totalScheduled: number;
  sent: number;
  pending: number;
  skipped: number;
}

class FollowUpService {
  private storageKey = 'resumeforge_followup_schedules';

  // Schedule follow-up for an application
  async scheduleFollowUp(
    applicationId: string,
    daysSinceApplication: number,
    templateId: string,
    templateName: string
  ): Promise<FollowUpSchedule> {
    const application = await applicationTrackingService.getApplication(applicationId);
    if (!application) throw new Error('Application not found');

    const scheduledDate = application.applicationDate + daysSinceApplication * 24 * 60 * 60 * 1000;

    const schedule: FollowUpSchedule = {
      id: `followup_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      applicationId,
      daysSinceApplication,
      templateId,
      templateName,
      scheduledDate,
      status: 'pending',
    };

    const schedules = await this.getAllSchedules();
    schedules.push(schedule);
    await this.saveSchedules(schedules);

    // Update application's next follow-up date
    await applicationTrackingService.updateApplication(applicationId, {
      nextFollowUpDate: scheduledDate,
    });

    return schedule;
  }

  // Get all pending follow-ups
  async getPendingFollowUps(): Promise<FollowUpSchedule[]> {
    const schedules = await this.getAllSchedules();
    const now = Date.now();

    return schedules.filter((s) => s.status === 'pending' && s.scheduledDate <= now);
  }

  // Mark follow-up as sent
  async markAsSent(scheduleId: string, messageGenerated?: string): Promise<FollowUpSchedule> {
    const schedules = await this.getAllSchedules();
    const index = schedules.findIndex((s) => s.id === scheduleId);

    if (index === -1) throw new Error(`Schedule ${scheduleId} not found`);

    schedules[index].status = 'sent';
    schedules[index].sentDate = Date.now();
    schedules[index].messageGenerated = messageGenerated;

    await this.saveSchedules(schedules);

    // Update application follow-up count
    const schedule = schedules[index];
    const application = await applicationTrackingService.getApplication(schedule.applicationId);
    if (application) {
      await applicationTrackingService.updateApplication(schedule.applicationId, {
        followUpCount: (application.followUpCount || 0) + 1,
        lastFollowUpDate: Date.now(),
      });
    }

    return schedules[index];
  }

  // Skip follow-up
  async skipFollowUp(scheduleId: string): Promise<FollowUpSchedule> {
    const schedules = await this.getAllSchedules();
    const index = schedules.findIndex((s) => s.id === scheduleId);

    if (index === -1) throw new Error(`Schedule ${scheduleId} not found`);

    schedules[index].status = 'skipped';
    await this.saveSchedules(schedules);

    return schedules[index];
  }

  // Get follow-ups for application
  async getApplicationFollowUps(applicationId: string): Promise<FollowUpSchedule[]> {
    const schedules = await this.getAllSchedules();
    return schedules.filter((s) => s.applicationId === applicationId);
  }

  // Get all schedules
  async getAllSchedules(): Promise<FollowUpSchedule[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get(this.storageKey, (result) => {
        resolve(result[this.storageKey] || []);
      });
    });
  }

  // Delete follow-up schedule
  async deleteSchedule(scheduleId: string): Promise<void> {
    const schedules = await this.getAllSchedules();
    const filtered = schedules.filter((s) => s.id !== scheduleId);
    await this.saveSchedules(filtered);
  }

  // Generate follow-up message from template
  async generateFollowUpMessage(
    applicationId: string,
    templateBody: string,
    recruiterName?: string,
    companyName?: string,
    position?: string
  ): Promise<string> {
    const app = await applicationTrackingService.getApplication(applicationId);
    if (!app) throw new Error('Application not found');

    // Replace template variables
    let message = templateBody;
    message = message.replace(/{recruiterName}/g, recruiterName || app.recruiterName || 'Hiring Manager');
    message = message.replace(/{company}/g, companyName || app.companyName);
    message = message.replace(/{position}/g, position || app.position);
    message = message.replace(/{daysElapsed}/g, String(Math.floor((Date.now() - app.applicationDate) / (1000 * 60 * 60 * 24))));

    return message;
  }

  // Get follow-up stats
  async getStats(): Promise<FollowUpStats> {
    const schedules = await this.getAllSchedules();

    return {
      totalScheduled: schedules.length,
      sent: schedules.filter((s) => s.status === 'sent').length,
      pending: schedules.filter((s) => s.status === 'pending').length,
      skipped: schedules.filter((s) => s.status === 'skipped').length,
    };
  }

  // Auto-schedule follow-ups for all applications
  async autoScheduleFollowUps(templates: Array<{ daysSinceApplication: number; templateId: string; templateName: string }> = []): Promise<FollowUpSchedule[]> {
    const applications = await applicationTrackingService.getAllApplications();
    const createdSchedules: FollowUpSchedule[] = [];

    const defaultTemplates = [
      { daysSinceApplication: 3, templateId: 'template_1', templateName: 'Day 3 Check-in' },
      { daysSinceApplication: 7, templateId: 'template_2', templateName: 'Week 1 Follow-up' },
      { daysSinceApplication: 14, templateId: 'template_3', templateName: 'Two-Week Follow-up' },
    ];

    const templatesConfig = templates.length > 0 ? templates : defaultTemplates;

    for (const app of applications) {
      if (app.status !== 'applied' && app.status !== 'pending') continue;

      for (const template of templatesConfig) {
        const existingSchedule = await this.getApplicationFollowUps(app.id);
        const alreadyScheduled = existingSchedule.some(
          (s) => s.daysSinceApplication === template.daysSinceApplication && s.status !== 'skipped'
        );

        if (!alreadyScheduled) {
          const schedule = await this.scheduleFollowUp(
            app.id,
            template.daysSinceApplication,
            template.templateId,
            template.templateName
          );
          createdSchedules.push(schedule);
        }
      }
    }

    return createdSchedules;
  }

  private async saveSchedules(schedules: FollowUpSchedule[]): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.storageKey]: schedules }, () => {
        resolve();
      });
    });
  }
}

export const followupService = new FollowUpService();
