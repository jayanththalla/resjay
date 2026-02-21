// Link Handler Service - Manages deep linking from extension to website
// Seamless navigation with state preservation

export interface DeepLinkParams {
  [key: string]: string | number | boolean | undefined;
}

export interface NavigationContext {
  source: 'extension' | 'website';
  timestamp: number;
  data?: Record<string, any>;
}

class LinkHandler {
  private baseWebsiteUrl = 'https://resumeforge.app'; // Update with actual website URL
  private extensionId: string | null = null;
  private navigationListeners: Array<(url: string, params: DeepLinkParams) => void> = [];

  // ─── Deep Link Generation ──────────────────────────────────
  generateLink(
    target: string,
    params?: DeepLinkParams
  ): string {
    const url = new URL(target, this.baseWebsiteUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return url.toString();
  }

  generateDashboardLink(applicationId?: string): string {
    if (applicationId) {
      return this.generateLink('/dashboard/applications', { id: applicationId });
    }
    return this.generateLink('/dashboard');
  }

  generateOutreachLink(applicationId: string): string {
    return this.generateLink('/outreach', { appId: applicationId });
  }

  generateContactsLink(filter?: string): string {
    return this.generateLink('/contacts', filter ? { filter } : undefined);
  }

  generateFollowUpLink(applicationId: string): string {
    return this.generateLink('/followups', { appId: applicationId });
  }

  generateAnalyticsLink(metric?: string): string {
    return this.generateLink('/analytics', metric ? { metric } : undefined);
  }

  generateSettingsLink(section?: string): string {
    return this.generateLink('/settings', section ? { section } : undefined);
  }

  // ─── Navigation Methods ───────────────────────────────────
  openInNewTab(url: string, context?: DeepLinkParams): void {
    try {
      // Add navigation context as URL parameter
      const linkUrl = new URL(url);
      if (context) {
        linkUrl.searchParams.set('_from', 'extension');
        linkUrl.searchParams.set('_time', String(Date.now()));
        Object.entries(context).forEach(([key, value]) => {
          if (value !== undefined) {
            linkUrl.searchParams.set(`_ctx_${key}`, String(value));
          }
        });
      }

      chrome.tabs.create({
        url: linkUrl.toString(),
        active: true,
      });

      console.log('[v0] Opened link in new tab:', linkUrl.toString());
    } catch (error) {
      console.error('[v0] Error opening link:', error);
    }
  }

  openApplicationDetails(applicationId: string): void {
    const link = this.generateDashboardLink(applicationId);
    this.openInNewTab(link, { appId: applicationId });
  }

  openOutreachManager(applicationId: string): void {
    const link = this.generateOutreachLink(applicationId);
    this.openInNewTab(link, { appId: applicationId });
  }

  openContactDirectory(filter?: string): void {
    const link = this.generateContactsLink(filter);
    this.openInNewTab(link, { filter });
  }

  openFollowUpManager(applicationId: string): void {
    const link = this.generateFollowUpLink(applicationId);
    this.openInNewTab(link, { appId: applicationId });
  }

  openAnalytics(metric?: string): void {
    const link = this.generateAnalyticsLink(metric);
    this.openInNewTab(link, { metric });
  }

  openSettings(section?: string): void {
    const link = this.generateSettingsLink(section);
    this.openInNewTab(link, { section });
  }

  // ─── State Transfer ────────────────────────────────────────
  async transferState(key: string, data: any): Promise<void> {
    try {
      const stateKey = `link_state_${key}`;
      await chrome.storage.local.set({
        [stateKey]: {
          data,
          timestamp: Date.now(),
          expiresAt: Date.now() + 5 * 60 * 1000, // 5 minute expiry
        },
      });

      console.log('[v0] State transferred:', key);
    } catch (error) {
      console.error('[v0] Error transferring state:', error);
    }
  }

  async retrieveState(key: string): Promise<any | null> {
    try {
      const stateKey = `link_state_${key}`;
      const result = await chrome.storage.local.get(stateKey);
      const state = result[stateKey];

      if (!state) {
        return null;
      }

      // Check if expired
      if (state.expiresAt < Date.now()) {
        await chrome.storage.local.remove(stateKey);
        return null;
      }

      return state.data;
    } catch (error) {
      console.error('[v0] Error retrieving state:', error);
      return null;
    }
  }

  // ─── Cross-Tab Communication ──────────────────────────────
  onNavigate(callback: (url: string, params: DeepLinkParams) => void): void {
    this.navigationListeners.push(callback);
  }

  offNavigate(callback: (url: string, params: DeepLinkParams) => void): void {
    this.navigationListeners = this.navigationListeners.filter((cb) => cb !== callback);
  }

  private notifyNavigation(url: string, params: DeepLinkParams): void {
    this.navigationListeners.forEach((callback) => {
      try {
        callback(url, params);
      } catch (error) {
        console.error('[v0] Navigation callback error:', error);
      }
    });
  }

  // ─── URL Parsing ───────────────────────────────────────────
  parseDeepLink(url: string): { target: string; params: DeepLinkParams } {
    try {
      const linkUrl = new URL(url);
      const target = linkUrl.pathname;
      const params: DeepLinkParams = {};

      linkUrl.searchParams.forEach((value, key) => {
        if (!key.startsWith('_')) {
          // Skip internal params
          const numValue = Number(value);
          params[key] = isNaN(numValue) ? value : numValue;
        }
      });

      return { target, params };
    } catch (error) {
      console.error('[v0] Error parsing deep link:', error);
      return { target: '/', params: {} };
    }
  }

  // ─── Message Passing (Background Script) ──────────────────
  async sendMessage(
    message: {
      type: 'navigate' | 'sync' | 'action';
      [key: string]: any;
    }
  ): Promise<any> {
    try {
      return await chrome.runtime.sendMessage(message);
    } catch (error) {
      console.error('[v0] Error sending message:', error);
      throw error;
    }
  }

  // ─── Page Detection ────────────────────────────────────────
  isWebsitePage(): boolean {
    if (typeof window === 'undefined') return false;
    return window.location.hostname.includes('resumeforge.app') ||
           window.location.hostname.includes('localhost:3000');
  }

  isExtensionContext(): boolean {
    return typeof chrome !== 'undefined' && !!chrome.runtime;
  }

  // ─── Query Parameter Helpers ──────────────────────────────
  getParamFromUrl(param: string): string | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get(param);
  }

  getAllParams(): DeepLinkParams {
    if (typeof window === 'undefined') return {};
    const params: DeepLinkParams = {};
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.forEach((value, key) => {
      const numValue = Number(value);
      params[key] = isNaN(numValue) ? value : numValue;
    });
    return params;
  }

  // ─── URL Building Utilities ────────────────────────────────
  buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(path, this.baseWebsiteUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }
    return url.toString();
  }

  getPathname(): string {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname;
  }

  setBaseUrl(url: string): void {
    this.baseWebsiteUrl = url;
    console.log('[v0] Base website URL set to:', url);
  }
}

export const linkHandler = new LinkHandler();
