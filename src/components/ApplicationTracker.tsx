import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input, Card, CardContent } from './ui/index';
import { applicationTrackingService, type JobApplication, type ApplicationMetrics } from '@/services/application-tracking-service';
import { Briefcase, TrendingUp, CheckCircle2, XCircle, MessageSquare, Plus, Search, Filter, Download, Upload, Trash2, Edit2, Eye, CheckCircle } from 'lucide-react';

interface ApplicationTrackerProps {
  onShowDetails?: (appId: string) => void;
}

export function ApplicationTracker({ onShowDetails }: ApplicationTrackerProps) {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [metrics, setMetrics] = useState<ApplicationMetrics | null>(null);
  const [filteredApps, setFilteredApps] = useState<JobApplication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<JobApplication['status'] | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'status' | 'company'>('recent');

  const statusColors: Record<JobApplication['status'], string> = {
    applied: 'bg-blue-500/10 text-blue-700 border-blue-200',
    rejected: 'bg-red-500/10 text-red-700 border-red-200',
    interview: 'bg-purple-500/10 text-purple-700 border-purple-200',
    offer: 'bg-green-500/10 text-green-700 border-green-200',
    accepted: 'bg-green-600/10 text-green-800 border-green-300',
    pending: 'bg-amber-500/10 text-amber-700 border-amber-200',
  };

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    filterAndSortApplications();
  }, [applications, searchTerm, filterStatus, sortBy]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const apps = await applicationTrackingService.getAllApplications();
      const metricsData = await applicationTrackingService.getMetrics();
      
      setApplications(apps);
      setMetrics(metricsData);
    } catch (error) {
      console.error('[v0] Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortApplications = () => {
    let filtered = applications;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.companyName.toLowerCase().includes(term) ||
          app.position.toLowerCase().includes(term) ||
          app.recruiterName?.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((app) => app.status === filterStatus);
    }

    // Apply sorting
    if (sortBy === 'recent') {
      filtered.sort((a, b) => b.applicationDate - a.applicationDate);
    } else if (sortBy === 'status') {
      const statusOrder = { applied: 0, interview: 1, offer: 2, accepted: 3, rejected: 4, pending: 5 };
      filtered.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    } else if (sortBy === 'company') {
      filtered.sort((a, b) => a.companyName.localeCompare(b.companyName));
    }

    setFilteredApps(filtered);
  };

  const handleDeleteApplication = async (id: string) => {
    if (confirm('Are you sure you want to delete this application?')) {
      await applicationTrackingService.deleteApplication(id);
      loadApplications();
    }
  };

  const handleExportApplications = async () => {
    const data = JSON.stringify(applications, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applications-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{metrics.totalApplications}</p>
                </div>
                <Briefcase className="w-5 h-5 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Applied</p>
                  <p className="text-2xl font-bold">{metrics.appliedCount}</p>
                </div>
                <MessageSquare className="w-5 h-5 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Interviews</p>
                  <p className="text-2xl font-bold">{metrics.interviewCount}</p>
                </div>
                <CheckCircle className="w-5 h-5 text-purple-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Success</p>
                  <p className="text-2xl font-bold">{metrics.successRate}%</p>
                </div>
                <TrendingUp className="w-5 h-5 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by company, position, recruiter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
        >
          <option value="all">All Status</option>
          <option value="applied">Applied</option>
          <option value="interview">Interview</option>
          <option value="offer">Offer</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="pending">Pending</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
        >
          <option value="recent">Recent</option>
          <option value="status">Status</option>
          <option value="company">Company</option>
        </select>

        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus className="w-4 h-4" />
          New
        </Button>

        <Button onClick={handleExportApplications} variant="outline" size="sm">
          <Download className="w-4 h-4" />
        </Button>
      </div>

      {/* Applications List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filteredApps.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <Briefcase className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">No applications found</p>
              <Button onClick={() => setShowForm(true)} variant="outline" size="sm" className="mt-3">
                Add first application
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredApps.map((app) => (
            <Card key={app.id} className="glass-card hover:border-primary/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{app.position}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[app.status]}`}>
                        {app.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{app.companyName}</p>
                    
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {app.recruiterName && <span>{app.recruiterName}</span>}
                      {app.location && <span>•</span>}
                      {app.location && <span>{app.location}</span>}
                      <span>•</span>
                      <span>{new Date(app.applicationDate).toLocaleDateString()}</span>
                    </div>

                    {(app.coldEmailSent || app.dmSent || app.followUpCount > 0) && (
                      <div className="flex gap-3 mt-2 text-[10px]">
                        {app.coldEmailSent && <span className="bg-blue-500/10 text-blue-700 px-2 py-1 rounded">Email Sent</span>}
                        {app.dmSent && <span className="bg-purple-500/10 text-purple-700 px-2 py-1 rounded">DM Sent</span>}
                        {app.followUpCount > 0 && <span className="bg-amber-500/10 text-amber-700 px-2 py-1 rounded">{app.followUpCount} Follow-ups</span>}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => onShowDetails?.(app.id)}
                      className="p-2 hover:bg-muted rounded transition-colors"
                      title="View details"
                    >
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDeleteApplication(app.id)}
                      className="p-2 hover:bg-red-500/10 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
