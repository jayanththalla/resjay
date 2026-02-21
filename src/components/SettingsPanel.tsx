import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input, Textarea, Card, CardContent, Switch } from './ui/index';
import { storageService, type UserSettings } from '@/services/storage-service';
import { knowledgeBaseService } from '@/services/knowledge-base-service';
import { aiService } from '@/services/ai-service';
import { UserProfileForm } from './UserProfileForm';
import {
  Key, Github, Linkedin, FileText, Save, Loader2, CheckCircle2,
  RefreshCw, Trash2, Moon, Sun, Database, Settings2, Download, Upload, AlertCircle,
} from 'lucide-react';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<UserSettings>({
    geminiApiKey: '',
    groqApiKey: '',
    aiProvider: 'gemini',
    multiAgentMode: true,
    deepAnalysis: false,
    theme: 'dark',
  });
  const [githubUsername, setGithubUsername] = useState('');
  const [manualKB, setManualKB] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [repoCount, setRepoCount] = useState(0);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const s = await storageService.getSettings();
    setSettings(s);
    const kb = await storageService.getKnowledgeBase();
    setManualKB(kb.manualText || '');
    setRepoCount(kb.githubRepos?.length || 0);
  };

  const handleSave = async () => {
    setLoading('save');
    try {
      await storageService.saveSettings(settings);
      // We'll update the active provider key based on selection.
      // But actually, aiService should probably load both or load the active one on init/change.
      // For now, let's just save. The AI service will read from storage or we can set it explicitly.
      // Better to have a configure method that takes full settings or reads them.
      // Let's rely on aiService reading storage or being re-initialized.
      await aiService.setApiKey(settings.aiProvider === 'gemini' ? settings.geminiApiKey : settings.groqApiKey);
      // Also strictly set the provider preference if we add that method to AI service, 
      // but for now let's just save settings which AI service reads.
      
      await knowledgeBaseService.saveManualText(manualKB);

      // Apply theme
      document.documentElement.classList.toggle('dark', settings.theme === 'dark');

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setLoading(null);
    }
  };

  const handleGitHubImport = async () => {
    if (!githubUsername.trim()) return;
    setLoading('github');
    try {
      const repos = await knowledgeBaseService.importGitHubRepos(githubUsername);
      setRepoCount(repos.length);
    } catch (err: any) {
      console.error('GitHub import failed:', err);
    } finally {
      setLoading(null);
    }
  };

  const handleLinkedInImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading('linkedin');
    try {
      const content = await file.text();
      await knowledgeBaseService.importLinkedInData(content);
    } catch (err: any) {
      console.error('LinkedIn import failed:', err);
    } finally {
      setLoading(null);
    }
  };

  const handleClearData = async () => {
    if (confirm('Clear all stored data? This cannot be undone.')) {
      await storageService.clearAll();
      window.location.reload();
    }
  };

  const handleExportData = async () => {
    setLoading('export');
    try {
      const settings = await storageService.getSettings();
      const kb = await storageService.getKnowledgeBase();
      const history = await storageService.getResumeHistory();

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        settings: {
          aiProvider: settings.aiProvider,
          multiAgentMode: settings.multiAgentMode,
          deepAnalysis: settings.deepAnalysis,
          theme: settings.theme,
        },
        knowledgeBase: {
          manualText: kb.manualText,
          repoCount: kb.githubRepos?.length || 0,
        },
        resumeHistory: {
          count: history.length,
          lastTailored: history[history.length - 1]?.createdAt || null,
        },
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resumeforge-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Settings
        </h2>
        <Button size="sm" variant="ghost" onClick={onClose} className="text-xs">
          Done
        </Button>
      </div>

      <div className="flex-1 p-4 space-y-5">

        {/* API Keys & Provider */}
        <Card className="glass-card">
          <CardContent className="p-4 space-y-4">
            
            {/* Provider Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium">AI Provider</label>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={settings.aiProvider === 'gemini' ? 'default' : 'outline'}
                  onClick={() => setSettings({ ...settings, aiProvider: 'gemini' })}
                  className="flex-1 text-xs"
                >
                  Gemini
                </Button>
                <Button 
                  size="sm" 
                  variant={settings.aiProvider === 'groq' ? 'default' : 'outline'}
                  onClick={() => setSettings({ ...settings, aiProvider: 'groq' })}
                  className="flex-1 text-xs"
                >
                  Groq 🚀
                </Button>
              </div>
            </div>

            {/* Gemini Key */}
            {settings.aiProvider === 'gemini' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Gemini API Key</h3>
                </div>
                <div className="relative">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={settings.geminiApiKey}
                    onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                    placeholder="AIza..."
                    className="text-xs pr-14"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Get a free Gemini API key →
                </a>
              </div>
            )}

            {/* Groq Key */}
            {settings.aiProvider === 'groq' && (
               <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-semibold">Groq API Key</h3>
                </div>
                <div className="relative">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={settings.groqApiKey}
                    onChange={(e) => setSettings({ ...settings, groqApiKey: e.target.value })}
                    placeholder="gsk_..."
                    className="text-xs pr-14"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Get a free Groq API key →
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Settings */}
        <Card className="glass-card">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">AI Settings</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium">Multi-Agent Mode</p>
                <p className="text-[10px] text-muted-foreground">Uses 5 specialized agents for thorough tailoring</p>
              </div>
              <Switch
                checked={settings.multiAgentMode}
                onCheckedChange={(v) => setSettings({ ...settings, multiAgentMode: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium">Deep Analysis</p>
                <p className="text-[10px] text-muted-foreground">More thorough ATS scoring (slower)</p>
              </div>
              <Switch
                checked={settings.deepAnalysis}
                onCheckedChange={(v) => setSettings({ ...settings, deepAnalysis: v })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                <p className="text-xs font-medium">Dark Mode</p>
              </div>
              <Switch
                checked={settings.theme === 'dark'}
                onCheckedChange={(v) => setSettings({ ...settings, theme: v ? 'dark' : 'light' })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Base */}
        <Card className="glass-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Knowledge Base</h3>
            </div>

            {/* GitHub */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Github className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">GitHub Import</span>
                {repoCount > 0 && (
                  <span className="text-[10px] text-primary">{repoCount} repos</span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  placeholder="your-username"
                  className="text-xs flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGitHubImport}
                  disabled={loading === 'github'}
                  className="text-xs"
                >
                  {loading === 'github' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                </Button>
              </div>
            </div>

            {/* LinkedIn */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Linkedin className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">LinkedIn Import</span>
              </div>
              <label className="block">
                <span className="text-[10px] text-muted-foreground">Upload exported JSON/CSV</span>
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleLinkedInImport}
                  className="block w-full text-xs mt-1 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </label>
            </div>

            {/* Manual */}
            <div className="space-y-2">
              <span className="text-xs font-medium">Manual Entries</span>
              <Textarea
                value={manualKB}
                onChange={(e) => setManualKB(e.target.value)}
                placeholder="Add skills, projects, achievements..."
                className="text-xs min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Autofill Profile */}
        <Card className="glassmorphism-card">
          <CardContent className="pt-5">
            <UserProfileForm />
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="glass-card border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-muted-foreground">Export your data to backup settings and usage statistics.</p>
            </div>
            <Button 
              onClick={handleExportData} 
              disabled={loading === 'export'} 
              variant="outline"
              size="sm"
              className="w-full text-xs"
            >
              {loading === 'export' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Download className="w-3 h-3" />
              )}
              {loading === 'export' ? 'Exporting...' : 'Export Backup'}
            </Button>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-2">
          <Button onClick={handleSave} disabled={loading === 'save'} className="w-full">
            {loading === 'save' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? 'Saved!' : 'Save Settings'}
          </Button>
          <Button variant="destructive" size="sm" onClick={handleClearData} className="w-full text-xs">
            <Trash2 className="w-3 h-3" />
            Clear All Data
          </Button>
        </div>
      </div>
    </div>
  );
}
