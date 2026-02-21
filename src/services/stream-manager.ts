// Stream Manager - Handles AI response streaming with recovery
// Prevents token loss during streaming and provides progress tracking

import { storageService } from './storage-service';

export interface StreamState {
  isActive: boolean;
  buffer: string[];
  fullText: string;
  tokenCount: number;
  lastToken: string;
  startTime: number;
  isRecovering: boolean;
}

export type StreamProgressCallback = (progress: {
  percentage: number;
  tokensReceived: number;
  estimatedTokensRemaining: number;
  currentText: string;
}) => void;

class StreamManager {
  private streamState: StreamState = {
    isActive: false,
    buffer: [],
    fullText: '',
    tokenCount: 0,
    lastToken: '',
    startTime: 0,
    isRecovering: false,
  };

  private recoveryKey = 'stream_recovery_buffer';
  private progressCallbacks: StreamProgressCallback[] = [];

  // ─── Stream Lifecycle ─────────────────────────────────────
  async startStream(operationId: string): Promise<void> {
    this.streamState = {
      isActive: true,
      buffer: [],
      fullText: '',
      tokenCount: 0,
      lastToken: '',
      startTime: Date.now(),
      isRecovering: false,
    };

    // Check if we're recovering from a previous stream
    const recovered = await this.attemptRecovery(operationId);
    if (recovered) {
      console.log('[v0] Stream recovery initiated');
      this.streamState.isRecovering = true;
    }

    // Clear any old recovery data
    await this.clearRecoveryBuffer(operationId);
  }

  async addToken(token: string, operationId: string): Promise<void> {
    if (!this.streamState.isActive) {
      throw new Error('Stream is not active');
    }

    try {
      this.streamState.buffer.push(token);
      this.streamState.fullText += token;
      this.streamState.tokenCount++;
      this.streamState.lastToken = token;

      // Persist buffer periodically (every 10 tokens)
      if (this.streamState.tokenCount % 10 === 0) {
        await this.persistBuffer(operationId);
      }

      // Notify progress listeners
      this.notifyProgress();
    } catch (error) {
      console.error('[v0] Error adding token:', error);
      // Save state for recovery
      await this.saveRecoveryBuffer(operationId);
      throw error;
    }
  }

  async completeStream(operationId: string): Promise<string> {
    if (!this.streamState.isActive) {
      throw new Error('Stream is not active');
    }

    try {
      const finalText = this.streamState.fullText;

      // Mark stream as complete
      this.streamState.isActive = false;

      // Clear recovery buffer on success
      await this.clearRecoveryBuffer(operationId);

      // Log metrics
      const duration = Date.now() - this.streamState.startTime;
      console.log('[v0] Stream completed:', {
        tokens: this.streamState.tokenCount,
        duration: `${duration}ms`,
        tokensPerSecond: (this.streamState.tokenCount / (duration / 1000)).toFixed(2),
      });

      return finalText;
    } catch (error) {
      console.error('[v0] Error completing stream:', error);
      await this.saveRecoveryBuffer(operationId);
      throw error;
    }
  }

  async interruptStream(operationId: string): Promise<string> {
    if (!this.streamState.isActive) {
      return this.streamState.fullText;
    }

    this.streamState.isActive = false;

    // Save current progress for potential recovery
    await this.saveRecoveryBuffer(operationId);

    console.log('[v0] Stream interrupted with', this.streamState.tokenCount, 'tokens');
    return this.streamState.fullText;
  }

  // ─── Recovery Mechanism ───────────────────────────────────
  private async attemptRecovery(operationId: string): Promise<boolean> {
    try {
      const recovery = await chrome.storage.local.get(this.getRecoveryKey(operationId));
      const data = recovery[this.getRecoveryKey(operationId)];

      if (data && data.buffer && data.buffer.length > 0) {
        this.streamState.buffer = data.buffer;
        this.streamState.fullText = data.buffer.join('');
        this.streamState.tokenCount = data.buffer.length;
        this.streamState.lastToken = data.buffer[data.buffer.length - 1] || '';

        console.log('[v0] Recovered', this.streamState.tokenCount, 'tokens from buffer');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[v0] Recovery attempt failed:', error);
      return false;
    }
  }

  private async saveRecoveryBuffer(operationId: string): Promise<void> {
    try {
      const data = {
        buffer: this.streamState.buffer,
        timestamp: Date.now(),
        tokens: this.streamState.tokenCount,
      };

      await chrome.storage.local.set({
        [this.getRecoveryKey(operationId)]: data,
      });

      console.log('[v0] Recovery buffer saved');
    } catch (error) {
      console.error('[v0] Failed to save recovery buffer:', error);
    }
  }

  private async persistBuffer(operationId: string): Promise<void> {
    try {
      // Create a checkpoint every 10 tokens for efficient recovery
      if (this.streamState.tokenCount % 50 === 0) {
        await this.saveRecoveryBuffer(operationId);
      }
    } catch (error) {
      console.error('[v0] Failed to persist buffer:', error);
    }
  }

  private async clearRecoveryBuffer(operationId: string): Promise<void> {
    try {
      await chrome.storage.local.remove(this.getRecoveryKey(operationId));
    } catch (error) {
      console.error('[v0] Failed to clear recovery buffer:', error);
    }
  }

  private getRecoveryKey(operationId: string): string {
    return `${this.recoveryKey}_${operationId}`;
  }

  // ─── Progress Tracking ────────────────────────────────────
  onProgress(callback: StreamProgressCallback): void {
    this.progressCallbacks.push(callback);
  }

  offProgress(callback: StreamProgressCallback): void {
    this.progressCallbacks = this.progressCallbacks.filter((cb) => cb !== callback);
  }

  private notifyProgress(): void {
    // Estimate remaining tokens (heuristic)
    const avgTokenLength = 4; // Average token is 4 chars
    const estimatedTotal = Math.max(
      this.streamState.tokenCount,
      Math.ceil(this.streamState.fullText.length / avgTokenLength) * 1.2 // Assume 20% more to come
    );
    const estimatedRemaining = Math.max(0, estimatedTotal - this.streamState.tokenCount);
    const percentage = Math.min(95, Math.round((this.streamState.tokenCount / estimatedTotal) * 100));

    this.progressCallbacks.forEach((callback) => {
      callback({
        percentage,
        tokensReceived: this.streamState.tokenCount,
        estimatedTokensRemaining: Math.round(estimatedRemaining),
        currentText: this.streamState.fullText,
      });
    });
  }

  // ─── State Access ─────────────────────────────────────────
  getState(): StreamState {
    return { ...this.streamState };
  }

  getFullText(): string {
    return this.streamState.fullText;
  }

  getTokenCount(): number {
    return this.streamState.tokenCount;
  }

  isStreaming(): boolean {
    return this.streamState.isActive;
  }

  getLastToken(): string {
    return this.streamState.lastToken;
  }

  // ─── Buffer Management ────────────────────────────────────
  clearBuffer(): void {
    this.streamState.buffer = [];
    this.streamState.fullText = '';
    this.streamState.tokenCount = 0;
  }

  getBuffer(): string[] {
    return [...this.streamState.buffer];
  }

  getBufferSize(): number {
    return this.streamState.buffer.length;
  }

  // ─── Error Recovery ───────────────────────────────────────
  async recoverFromError(operationId: string, error: Error): Promise<{
    recovered: boolean;
    text: string;
    errorMessage: string;
  }> {
    try {
      console.error('[v0] Stream error occurred:', error);

      // Try to recover
      const recovered = await this.attemptRecovery(operationId);

      if (recovered) {
        console.log('[v0] Successfully recovered partial text');
        return {
          recovered: true,
          text: this.streamState.fullText,
          errorMessage: `Recovered ${this.streamState.tokenCount} tokens before error: ${error.message}`,
        };
      } else {
        return {
          recovered: false,
          text: this.streamState.fullText,
          errorMessage: error.message,
        };
      }
    } catch (recoveryError) {
      console.error('[v0] Recovery failed:', recoveryError);
      return {
        recovered: false,
        text: this.streamState.fullText,
        errorMessage: `${error.message} (Recovery also failed: ${recoveryError})`,
      };
    }
  }

  // ─── Diagnostics ──────────────────────────────────────────
  getDiagnostics(): {
    uptime: number;
    tokensPerSecond: number;
    averageTokenSize: number;
    bufferHealth: string;
  } {
    const uptime = Date.now() - this.streamState.startTime;
    const tokensPerSecond = (this.streamState.tokenCount / (uptime / 1000)) || 0;
    const averageTokenSize =
      this.streamState.tokenCount > 0 ? this.streamState.fullText.length / this.streamState.tokenCount : 0;

    let bufferHealth = 'healthy';
    if (this.streamState.buffer.length === 0 && this.streamState.isActive) {
      bufferHealth = 'warning: empty buffer while streaming';
    }
    if (this.streamState.fullText.length > 1000000) {
      bufferHealth = 'warning: large buffer size';
    }

    return {
      uptime: Math.round(uptime),
      tokensPerSecond: Math.round(tokensPerSecond * 100) / 100,
      averageTokenSize: Math.round(averageTokenSize * 100) / 100,
      bufferHealth,
    };
  }
}

export const streamManager = new StreamManager();
