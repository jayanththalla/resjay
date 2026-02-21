import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input, Card, CardContent, Textarea } from './ui/index';
import { applicationTrackingService, type JobApplication } from '@/services/application-tracking-service';
import { coldOutreachService } from '@/services/cold-outreach-service';
import { contactService } from '@/services/contact-service';
import { labelAnalysisService } from '@/services/label-analysis-service';
import { ApplicationTracker } from './ApplicationTracker';
import { ColdOutreachBuilder } from './ColdOutreachBuilder';
import { X, ChevronRight, Plus, Mail, MessageSquare, Users, BarChart3, Calendar } from 'lucide-react';

type TabView = 'dashboard' | 'add' | 'details' | 'outreach' | 'contacts' | 'analytics';

interface ApplicationsTabProps {
  onApplicationTracked?: () => void;
}

export function ApplicationsTab({ onApplicationTracked }: ApplicationsTabProps) {
  const [view, setView] = useState<TabView>('dashboard');
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [formData, setFormData] = useState<Partial<JobApplication>>({
    status: 'applied',
  });

  const handleShowDetails = async (appId: string) => {
    const app = await applicationTrackingService.getApplication(appId);
    setSelectedApp(app);
    setSelectedAppId(appId);
    setView('details');
  };

  const handleAddApplication = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName?.trim() || !formData.position?.trim()) {
      alert('Please fill in company and position');
      return;
    }

    try {
      const newApp = await applicationTrackingService.createApplication({
        companyName: formData.companyName,
        position: formData.position,
        applicationDate: Date.now(),
        status: formData.status || 'applied',
        jobUrl: formData.jobUrl,
        location: formData.location,
        salary: formData.salary,
        recruiterName: formData.recruiterName,
        recruiterEmail: formData.recruiterEmail,
        notes: formData.notes,
      });

      // Optionally add recruiter to contacts
      if (formData.recruiterName && formData.recruiterEmail) {
        await contactService.createContact({
          name: formData.recruiterName,
          title: 'Recruiter',
          company: formData.companyName,
          email: formData.recruiterEmail,
          tags: ['recruiter'],
        });
      }

      setFormData({ status: 'applied' });
      onApplicationTracked?.();
      setView('dashboard');

      alert('Application tracked successfully!');
    } catch (error) {
      console.error('[v0] Error adding application:', error);
      alert('Failed to add application');
    }
  };

  const handleUpdateStatus = async (newStatus: JobApplication['status']) => {
    if (!selectedAppId) return;

    try {
      await applicationTrackingService.updateApplication(selectedAppId, {
        status: newStatus,
        lastFollowUpDate: newStatus !== 'applied' ? Date.now() : undefined,
      });

      const updated = await applicationTrackingService.getApplication(selectedAppId);
      setSelectedApp(updated);

      alert('Status updated!');
    } catch (error) {
      console.error('[v0] Error updating status:', error);
    }
  };

  const handleScheduleFollowUp = async (days: number) => {
    if (!selectedAppId) return;

    try {
      const followUpDate = Date.now() + days * 24 * 60 * 60 * 1000;
      await applicationTrackingService.updateApplication(selectedAppId, {
        nextFollowUpDate: followUpDate,
      });

      const updated = await applicationTrackingService.getApplication(selectedAppId);
      setSelectedApp(updated);

      alert(`Follow-up scheduled for ${days} days!`);
    } catch (error) {
      console.error('[v0] Error scheduling follow-up:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Navigation Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto pb-2">
        <button
          onClick={() => setView('dashboard')}
          className={`px-3 py-1 text-sm rounded-t border-b-2 transition-colors ${
            view === 'dashboard'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-1" />
          Dashboard
        </button>

        <button
          onClick={() => {
            setFormData({ status: 'applied' });
            setView('add');
          }}
          className={`px-3 py-1 text-sm rounded-t border-b-2 transition-colors ${
            view === 'add'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Plus className="w-4 h-4 inline mr-1" />
          New Application
        </button>

        <button
          onClick={() => setView('contacts')}
          className={`px-3 py-1 text-sm rounded-t border-b-2 transition-colors ${
            view === 'contacts'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4 inline mr-1" />
          Contacts
        </button>
      </div>

      {/* Dashboard View */}
      {view === 'dashboard' && <ApplicationTracker onShowDetails={handleShowDetails} />}

      {/* Add Application Form */}
      {view === 'add' && (
        <Card className="glass-card">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Track New Application</h3>
            <form onSubmit={handleAddApplication} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Company Name *</label>
                  <Input
                    placeholder="Google, Meta, etc."
                    value={formData.companyName || ''}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Position *</label>
                  <Input
                    placeholder="Senior Engineer, Product Manager"
                    value={formData.position || ''}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">Location</label>
                  <Input
                    placeholder="San Francisco, Remote"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">Salary Range</label>
                  <Input
                    placeholder="$100k - $150k"
                    value={formData.salary || ''}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">Recruiter Name</label>
                  <Input
                    placeholder="John Doe"
                    value={formData.recruiterName || ''}
                    onChange={(e) => setFormData({ ...formData, recruiterName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">Recruiter Email</label>
                  <Input
                    placeholder="john@company.com"
                    type="email"
                    value={formData.recruiterEmail || ''}
                    onChange={(e) => setFormData({ ...formData, recruiterEmail: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Job URL</label>
                <Input
                  placeholder="https://..."
                  value={formData.jobUrl || ''}
                  onChange={(e) => setFormData({ ...formData, jobUrl: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Status</label>
                <select
                  value={formData.status || 'applied'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                >
                  <option value="applied">Applied</option>
                  <option value="pending">Pending</option>
                  <option value="interview">Interview</option>
                  <option value="offer">Offer</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Notes</label>
                <Textarea
                  placeholder="Any notes about this application..."
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="min-h-20"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Add Application
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setView('dashboard')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Application Details View */}
      {view === 'details' && selectedApp && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{selectedApp.position} @ {selectedApp.companyName}</h2>
            <button onClick={() => setView('dashboard')} className="p-2 hover:bg-muted rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          <Card className="glass-card">
            <CardContent className="p-4 space-y-4">
              {/* Status Update */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Change Status</p>
                <div className="flex gap-2 flex-wrap">
                  {(['applied', 'interview', 'offer', 'accepted', 'rejected', 'pending'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(status)}
                      className={`px-3 py-1 text-xs rounded border transition-colors ${
                        selectedApp.status === status
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="border-t border-border pt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Actions</p>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => setView('outreach')}
                    variant="outline"
                    className="justify-start"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Cold Email
                  </Button>
                  <Button variant="outline" className="justify-start" disabled>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send LinkedIn DM
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Follow-up
                  </Button>
                </div>
              </div>

              {/* Follow-up Suggestions */}
              <div className="border-t border-border pt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Follow-up Reminders</p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => handleScheduleFollowUp(3)}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    In 3 days
                  </Button>
                  <Button
                    onClick={() => handleScheduleFollowUp(7)}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    In 1 week
                  </Button>
                  <Button
                    onClick={() => handleScheduleFollowUp(14)}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    In 2 weeks
                  </Button>
                </div>
              </div>

              {/* Application Info */}
              <div className="border-t border-border pt-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applied:</span>
                  <span>{new Date(selectedApp.applicationDate).toLocaleDateString()}</span>
                </div>
                {selectedApp.recruiterName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recruiter:</span>
                    <span>{selectedApp.recruiterName}</span>
                  </div>
                )}
                {selectedApp.location && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span>{selectedApp.location}</span>
                  </div>
                )}
                {selectedApp.salary && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Salary:</span>
                    <span>{selectedApp.salary}</span>
                  </div>
                )}
                {selectedApp.notes && (
                  <div className="pt-2">
                    <p className="text-muted-foreground mb-1">Notes:</p>
                    <p className="bg-muted/30 p-2 rounded">{selectedApp.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Button onClick={() => setView('dashboard')} variant="outline" className="w-full">
            Back to Dashboard
          </Button>
        </div>
      )}

      {/* Outreach View */}
      {view === 'outreach' && selectedApp && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setView('details')} className="text-primary hover:underline text-sm">
              {selectedApp.position} @ {selectedApp.companyName}
            </button>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Cold Outreach</span>
          </div>

          <ColdOutreachBuilder
            applicationId={selectedAppId}
            recruiterName={selectedApp.recruiterName || 'Hiring Manager'}
            companyName={selectedApp.companyName}
            position={selectedApp.position}
            onMessageSaved={() => {
              setView('details');
              alert('Message saved! You can send it whenever you\'re ready.');
            }}
          />
        </div>
      )}

      {/* Contacts View */}
      {view === 'contacts' && (
        <Card className="glass-card p-6">
          <h3 className="font-semibold mb-3">Recruiter Contacts</h3>
          <p className="text-xs text-muted-foreground">Contact management coming soon. Manage all your recruiter and hiring manager contacts here.</p>
        </Card>
      )}
    </div>
  );
}
