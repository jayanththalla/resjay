// ResumeForge AI – Storage Service
// Typed wrapper around chrome.storage for all persistent data

export interface UserSettings {
    geminiApiKey: string;
    groqApiKey: string;
    aiProvider: 'gemini' | 'groq';
    multiAgentMode: boolean;
    deepAnalysis: boolean;
    theme: 'light' | 'dark' | 'system';
    customPrompt?: string;
    jobAnalysisPrompt?: string;
    projectsOptimizationPrompt?: string;
    skillsEnhancementPrompt?: string;
    experienceRefinementPrompt?: string;
    finalPolishPrompt?: string;
}

export interface KnowledgeBase {
    githubRepos: GitHubRepo[];
    linkedInData: LinkedInProfile | null;
    manualText: string;
    lastUpdated: string;
}

export interface GitHubRepo {
    name: string;
    description: string;
    language: string;
    languages: string[];
    url: string;
    stars: number;
    readme: string;
}

export interface LinkedInProfile {
    name: string;
    headline: string;
    summary: string;
    experience: LinkedInExperience[];
    education: LinkedInEducation[];
    skills: string[];
}

export interface LinkedInExperience {
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string;
}

export interface LinkedInEducation {
    school: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    resumeLatex?: string;
    tailoredLatex?: string;
    jobDescription?: string;
    createdAt: number;
    updatedAt: number;
}

export interface ResumeHistory {
    id: string;
    company: string;
    position: string;
    originalLatex: string;
    tailoredLatex: string;
    jobDescription: string;
    createdAt: number;
}

export interface UserProfile {
    fullName: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    linkedinUrl: string;
    githubUrl: string;
    portfolioUrl: string;
    location: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    currentTitle: string;
    yearsOfExperience: string;
    highestDegree: string;
    university: string;
    visaStatus: string;
    workAuthorization: string;
    salaryExpectation: string;
    noticePeriod: string;
    startDate: string;
    willingToRelocate: string;
    customFields: Record<string, string>;
}

export interface AppState {
    isOnboarded: boolean;
    activeTab: 'resume' | 'email' | 'autofill' | 'settings';
    currentSessionId?: string;
}

const DEFAULT_PROFILE: UserProfile = {
    fullName: '', firstName: '', lastName: '',
    email: '', phone: '',
    linkedinUrl: '', githubUrl: '', portfolioUrl: '',
    location: '', city: '', state: '', zipCode: '', country: '',
    currentTitle: '', yearsOfExperience: '',
    highestDegree: '', university: '',
    visaStatus: '', workAuthorization: '',
    salaryExpectation: '', noticePeriod: '', startDate: '',
    willingToRelocate: '', customFields: {},
};

const DEFAULTS: {
    settings: UserSettings;
    knowledgeBase: KnowledgeBase;
    appState: AppState;
    userProfile: UserProfile;
} = {
    settings: {
        geminiApiKey: '',
        groqApiKey: '',
        aiProvider: 'gemini', // Default to Gemini but user can switch
        multiAgentMode: true,
        deepAnalysis: false,
        theme: 'dark',
    },
    knowledgeBase: {
        githubRepos: [],
        linkedInData: null,
        manualText: '',
        lastUpdated: '',
    },
    appState: {
        isOnboarded: false,
        activeTab: 'resume',
    },
    userProfile: DEFAULT_PROFILE,
};

class StorageService {
    // ─── Settings ──────────────────────────────────────────────
    async getSettings(): Promise<UserSettings> {
        const result = await chrome.storage.local.get('settings');
        return { ...DEFAULTS.settings, ...result.settings };
    }

    async saveSettings(settings: Partial<UserSettings>): Promise<void> {
        const current = await this.getSettings();
        await chrome.storage.local.set({ settings: { ...current, ...settings } });
    }

    async getApiKey(): Promise<string> {
        const settings = await this.getSettings();
        return settings.geminiApiKey;
    }

    // ─── Knowledge Base ────────────────────────────────────────
    async getKnowledgeBase(): Promise<KnowledgeBase> {
        const result = await chrome.storage.local.get('knowledgeBase');
        return { ...DEFAULTS.knowledgeBase, ...result.knowledgeBase };
    }

    async saveKnowledgeBase(kb: Partial<KnowledgeBase>): Promise<void> {
        const current = await this.getKnowledgeBase();
        await chrome.storage.local.set({
            knowledgeBase: { ...current, ...kb, lastUpdated: new Date().toISOString() },
        });
    }

    // ─── Chat Sessions ────────────────────────────────────────
    async getChatSessions(): Promise<ChatSession[]> {
        const result = await chrome.storage.local.get('chatSessions');
        return result.chatSessions || [];
    }

    async saveChatSession(session: ChatSession): Promise<void> {
        const sessions = await this.getChatSessions();
        const idx = sessions.findIndex((s) => s.id === session.id);
        if (idx >= 0) {
            sessions[idx] = { ...session, updatedAt: Date.now() };
        } else {
            sessions.unshift(session);
        }
        // Keep max 50 sessions
        await chrome.storage.local.set({ chatSessions: sessions.slice(0, 50) });
    }

    async deleteChatSession(sessionId: string): Promise<void> {
        const sessions = await this.getChatSessions();
        await chrome.storage.local.set({
            chatSessions: sessions.filter((s) => s.id !== sessionId),
        });
    }

    // ─── Resume History ────────────────────────────────────────
    async getResumeHistory(): Promise<ResumeHistory[]> {
        const result = await chrome.storage.local.get('resumeHistory');
        return result.resumeHistory || [];
    }

    async addResumeHistory(entry: ResumeHistory): Promise<void> {
        const history = await this.getResumeHistory();
        history.unshift(entry);
        await chrome.storage.local.set({ resumeHistory: history.slice(0, 100) });
    }

    // ─── App State ─────────────────────────────────────────────
    async getAppState(): Promise<AppState> {
        const result = await chrome.storage.local.get('appState');
        return { ...DEFAULTS.appState, ...result.appState };
    }

    async saveAppState(state: Partial<AppState>): Promise<void> {
        const current = await this.getAppState();
        await chrome.storage.local.set({ appState: { ...current, ...state } });
    }

    // ─── User Profile ──────────────────────────────────────────
    async getUserProfile(): Promise<UserProfile> {
        const result = await chrome.storage.local.get('userProfile');
        return { ...DEFAULTS.userProfile, ...result.userProfile };
    }

    async saveUserProfile(profile: Partial<UserProfile>): Promise<void> {
        const current = await this.getUserProfile();
        await chrome.storage.local.set({ userProfile: { ...current, ...profile } });
    }

    // Build a flat key→value map for autofill
    async getAutofillData(): Promise<Record<string, string>> {
        const profile = await this.getUserProfile();
        const data: Record<string, string> = {};
        for (const [key, value] of Object.entries(profile)) {
            if (typeof value === 'string' && value.trim()) {
                data[key] = value;
            } else if (typeof value === 'object' && key === 'customFields') {
                for (const [ck, cv] of Object.entries(value as Record<string, string>)) {
                    if (cv.trim()) data[ck] = cv;
                }
            }
        }
        return data;
    }

    // ─── Utilities ─────────────────────────────────────────────
    async clearAll(): Promise<void> {
        await chrome.storage.local.clear();
    }

    async getStorageUsage(): Promise<{ used: number; quota: number }> {
        return new Promise((resolve) => {
            chrome.storage.local.getBytesInUse(null, (used) => {
                resolve({ used, quota: chrome.storage.local.QUOTA_BYTES || 10485760 });
            });
        });
    }
}

export const storageService = new StorageService();
