// ResumeForge AI – AI Service
// Ported from Agentex with streaming support via @google/generative-ai SDK

import { GoogleGenerativeAI, type GenerateContentStreamResult } from '@google/generative-ai';
import Groq from 'groq-sdk';
import {
    LATEX_TAILORING_PROMPT,
    JOB_ANALYSIS_PROMPT,
    PROJECTS_OPTIMIZATION_PROMPT,
    SKILLS_ENHANCEMENT_PROMPT,
    EXPERIENCE_REFINEMENT_PROMPT,
    FINAL_POLISH_PROMPT,
    SECTIONS_DRAFTING_PROMPT,
    CHAT_SYSTEM_PROMPT,
    COLD_EMAIL_PROMPT,
    COVER_LETTER_PROMPT,
    LINKEDIN_DM_PROMPT,
    AUTOFILL_ANSWER_PROMPT,
    RESUME_PROFILE_EXTRACT_PROMPT,
    SELECT_MATCH_PROMPT,
} from './prompts';
import { storageService } from './storage-service';

export interface StreamCallbacks {
    onToken: (token: string) => void;
    onComplete: (fullText: string) => void;
    onError: (error: Error) => void;
}

export interface MultiAgentProgress {
    step: number;
    totalSteps: number;
    message: string;
}

class AIService {
    private model: any = null; // Gemini model instance
    private groq: Groq | null = null; // Groq instance
    private apiKey: string = '';
    private provider: 'gemini' | 'groq' = 'gemini';
    private geminiModelName = 'gemini-2.0-flash';
    private groqModelName = 'llama-3.3-70b-versatile';
    private initializing: Promise<void> | null = null;

    async init(): Promise<void> {
        if (this.initializing) return this.initializing;

        this.initializing = (async () => {
            const settings = await storageService.getSettings();
            this.provider = settings.aiProvider || 'gemini';

            if (this.provider === 'gemini') {
                this.apiKey = settings.geminiApiKey;
                if (this.apiKey) {
                    const genAI = new GoogleGenerativeAI(this.apiKey);
                    this.model = genAI.getGenerativeModel({ model: this.geminiModelName });
                } else {
                    this.model = null;
                }
            } else {
                this.apiKey = settings.groqApiKey;
                if (this.apiKey) {
                    this.groq = new Groq({ apiKey: this.apiKey, dangerouslyAllowBrowser: true });
                } else {
                    this.groq = null;
                }
            }
        })();

        return this.initializing;
    }

    async setApiKey(key: string): Promise<void> {
        this.initializing = null; // Force re-init
        await this.init();
    }

    isConfigured(): boolean {
        if (this.provider === 'gemini') return !!this.apiKey && !!this.model;
        return !!this.apiKey && !!this.groq;
    }

    // ─── Streaming Chat ────────────────────────────────────────
    async streamChat(
        messages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
        systemPrompt: string,
        callbacks: StreamCallbacks
    ): Promise<void> {
        if (!this.isConfigured()) throw new Error('AI not configured. Please check your settings.');

        // Use the queue to respect rate limits, even for streaming
        await this.queue.add(async () => {
            try {
                if (this.provider === 'gemini') {
                    const chat = this.model.startChat({
                        history: messages.slice(0, -1),
                        systemInstruction: systemPrompt,
                    });

                    const lastMessage = messages[messages.length - 1];
                    const result: GenerateContentStreamResult = await chat.sendMessageStream(
                        lastMessage.parts[0].text
                    );

                    let fullText = '';
                    for await (const chunk of result.stream) {
                        const token = chunk.text();
                        fullText += token;
                        callbacks.onToken(token);
                    }
                    callbacks.onComplete(fullText);
                } else {
                    // Groq Streaming
                    if (!this.groq) throw new Error('Groq not configured');

                    // Convert messages to Groq format
                    const groqMessages = [
                        { role: 'system', content: systemPrompt },
                        ...messages.map(m => ({
                            role: m.role === 'model' ? 'assistant' : 'user',
                            content: m.parts[0].text
                        }))
                    ] as any[];

                    const stream = await this.groq.chat.completions.create({
                        messages: groqMessages,
                        model: this.groqModelName,
                        stream: true,
                    });

                    let fullText = '';
                    for await (const chunk of stream) {
                        const token = chunk.choices[0]?.delta?.content || '';
                        if (token) {
                            fullText += token;
                            callbacks.onToken(token);
                        }
                    }
                    callbacks.onComplete(fullText);
                }
            } catch (error: any) {
                if (error.message?.includes('429')) {
                    this.queue.notifyRateLimit();
                    throw new Error('Rate limit exceeded. Please wait a moment.');
                }
                callbacks.onError(new Error(error.message || 'Failed to stream response'));
                throw error;
            }
        });
    }

    // ─── Single-Pass Tailoring ─────────────────────────────────
    async generateTailoredResume(
        originalLatex: string,
        jobDesc: string,
        knowledgeBase: string,
        callbacks?: StreamCallbacks
    ): Promise<string> {
        if (!this.isConfigured()) throw new Error('AI not configured');

        const prompt = LATEX_TAILORING_PROMPT
            .replace('{originalLatex}', originalLatex)
            .replace('{jobDesc}', jobDesc)
            .replace('{knowledgeBase}', knowledgeBase || 'None provided');

        if (callbacks) {
            return this._streamGenerate(prompt, callbacks);
        }
        return this._generate(prompt);
    }

    // ─── Multi-Agent Tailoring ─────────────────────────────────
    async generateTailoredResumeMultiAgent(
        originalLatex: string,
        jobDesc: string,
        knowledgeBase: string,
        onProgress?: (progress: MultiAgentProgress) => void
    ): Promise<string> {
        if (!this.isConfigured()) throw new Error('AI not configured');

        const report = (step: number, message: string) =>
            onProgress?.({ step, totalSteps: 3, message });

        try {
            // Step 1: Job Analysis
            report(1, 'Analyzing job requirements...');
            const analysisPrompt = JOB_ANALYSIS_PROMPT
                .replace('{jobDesc}', jobDesc)
                .replace('{knowledgeBase}', knowledgeBase || 'None');
            const analysisRaw = await this._generate(analysisPrompt);

            // Extract sections
            const originalProjects = this._extractSection(originalLatex, 'Projects');
            const originalSkills = this._extractSection(originalLatex, 'Skills');
            const originalExperience = this._extractSection(originalLatex, 'Experience');

            // Step 2: Consolidated Drafting
            report(2, 'Drafting optimized content...');
            // Need to import SECTIONS_DRAFTING_PROMPT first, assuming it is imported.
            // But since I can't change imports easily in this tool call without replacing top of file,
            // I will use a hardcoded prompt string here for safety if imports are tricky, 
            // OR I will assume I can update imports in a separate call. 
            // Better: I will use the string literal directly here to avoid import issues for now, or use a second tool call to update imports.
            // Actually, I should update imports first. But I'll do it in the "Optimization" step.
            // Wait, I can't use SECTIONS_DRAFTING_PROMPT if it is not imported.
            // I will use the string literal here to be safe and avoid "Prompt not found" errors.

            // Using the prompt I just defined in prompts.ts, but I need to make sure it's imported.
            // I'll assume I update imports in next step. For now, I'll use the variable name and trust myself to update imports.

            const draftingPrompt = SECTIONS_DRAFTING_PROMPT
                .replace('{originalProjects}', originalProjects)
                .replace('{originalSkills}', originalSkills)
                .replace('{originalExperience}', originalExperience)
                .replace('{jobDesc}', jobDesc)
                .replace('{analysisJSON}', analysisRaw);

            const draftsRaw = await this._generate(draftingPrompt);
            let drafts: any;
            try {
                const jsonMatch = draftsRaw.match(/\{[\s\S]*\}/);
                drafts = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
                if (!drafts) throw new Error('Failed to parse drafts');
            } catch (e) {
                console.warn('Draft parsing failed', e);
                // Fallback: Use originals if parsing fails, so we don't crash
                drafts = {
                    projects: originalProjects,
                    skills: originalSkills,
                    experience: originalExperience
                };
            }

            // Step 3: Final Polish
            report(3, 'Assembling final resume...');
            const finalPrompt = FINAL_POLISH_PROMPT
                .replace('{originalLatex}', originalLatex)
                .replace('{optimizedProjects}', drafts.projects || originalProjects)
                .replace('{enhancedSkills}', drafts.skills || originalSkills)
                .replace('{refinedExperience}', drafts.experience || originalExperience)
                .replace('{jobDesc}', jobDesc);

            const finalResult = await this._generate(finalPrompt);

            return this._cleanLatex(finalResult);
        } catch (error: any) {
            // Fallback to single-pass
            return this.generateTailoredResume(originalLatex, jobDesc, knowledgeBase);
        }
    }

    // ─── Cold Email ────────────────────────────────────────────
    async generateColdEmail(
        recruiterInfo: string,
        jobDescription: string,
        resumeSummary: string,
        callbacks?: StreamCallbacks
    ): Promise<string> {
        const prompt = COLD_EMAIL_PROMPT
            .replace('{recruiterInfo}', recruiterInfo)
            .replace('{jobDescription}', jobDescription)
            .replace('{resumeSummary}', resumeSummary);

        if (callbacks) return this._streamGenerate(prompt, callbacks);
        return this._generate(prompt);
    }

    // ─── Cover Letter ──────────────────────────────────────────
    async generateCoverLetter(
        jobDescription: string,
        resumeLatex: string,
        knowledgeBase: string,
        callbacks?: StreamCallbacks
    ): Promise<string> {
        const prompt = COVER_LETTER_PROMPT
            .replace('{jobDescription}', jobDescription)
            .replace('{resumeLatex}', resumeLatex)
            .replace('{knowledgeBase}', knowledgeBase);

        if (callbacks) return this._streamGenerate(prompt, callbacks);
        return this._generate(prompt);
    }

    // ─── LinkedIn DM ───────────────────────────────────────────
    async generateLinkedInDM(
        recruiterInfo: string,
        jobDescription: string,
        resumeSummary: string
    ): Promise<string> {
        const prompt = LINKEDIN_DM_PROMPT
            .replace('{recruiterInfo}', recruiterInfo)
            .replace('{jobDescription}', jobDescription)
            .replace('{resumeSummary}', resumeSummary);
        return this._generate(prompt);
    }

    // ─── Autofill Answer ──────────────────────────────────────
    async generateAutofillAnswer(
        question: string,
        jobDescription: string,
        resumeSummary: string,
        knowledgeBase: string
    ): Promise<string> {
        const prompt = AUTOFILL_ANSWER_PROMPT
            .replace('{question}', question)
            .replace('{jobDescription}', jobDescription)
            .replace('{resumeSummary}', resumeSummary)
            .replace('{knowledgeBase}', knowledgeBase);
        return this._generate(prompt);
    }

    // ─── Extract Profile from Resume ──────────────────────────
    async extractProfileFromResume(
        resumeText: string
    ): Promise<Record<string, string>> {
        if (!this.isConfigured()) throw new Error('AI not configured');
        const prompt = RESUME_PROFILE_EXTRACT_PROMPT.replace('{resumeText}', resumeText);
        const raw = await this._generate(prompt);
        try {
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        } catch {
            return {};
        }
    }

    // ─── Match Select Option ──────────────────────────────────
    async matchSelectOption(
        profileValue: string,
        fieldLabel: string,
        options: string[]
    ): Promise<string> {
        if (!this.isConfigured()) throw new Error('AI not configured');
        const prompt = SELECT_MATCH_PROMPT
            .replace('{profileValue}', profileValue)
            .replace('{fieldLabel}', fieldLabel)
            .replace('{options}', options.join('\n'));
        const result = (await this._generate(prompt)).trim();
        // Verify the AI returned an actual option
        return options.includes(result) ? result : '';
    }

    // ─── Build Chat System Prompt ──────────────────────────────
    buildChatSystemPrompt(resumeLatex: string, jobDescription: string, knowledgeBase: string): string {
        return CHAT_SYSTEM_PROMPT
            .replace('{resumeLatex}', resumeLatex || 'Not uploaded yet')
            .replace('{jobDescription}', jobDescription || 'Not provided yet')
            .replace('{knowledgeBase}', knowledgeBase || 'Not populated yet');
    }

    // ─── Request Proxying & Queueing ───────────────────────────

    // Detect if we are running in the background service worker
    // Simplest check: do we have access to the full chrome.tabs API? 
    // Content scripts have chrome.runtime but NOT chrome.tabs.query (it's undefined or restricted).
    // Service workers have chrome.tabs.
    private isBackground = false;

    constructor() {
        try {
            // Service workers in MV3 do not have a 'window' object.
            // Content scripts and sidepanels/popups do.
            this.isBackground = typeof window === 'undefined';
        } catch {
            this.isBackground = false;
        }
    }

    // Public method for the background script to call to process raw prompts through the queue
    async generateContentInternal(prompt: string): Promise<string> {
        return this.queue.add(() => this._withRetry(async () => {
            if (!this.isConfigured()) await this.init();

            if (this.provider === 'gemini') {
                const result = await this.model.generateContent(prompt);
                const response = await result.response;
                return this._cleanLatex(response.text());
            } else {
                if (!this.groq) throw new Error('Groq not configured');
                const completion = await this.groq.chat.completions.create({
                    messages: [{ role: 'user', content: prompt }],
                    model: this.groqModelName,
                });
                return this._cleanLatex(completion.choices[0]?.message?.content || '');
            }
        }));
    }

    private queue = new RequestQueue();

    // ─── Private Helpers ───────────────────────────────────────
    private async _generate(prompt: string): Promise<string> {
        if (!this.isBackground) {
            // Proxy to background
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { type: 'GEMINI_GENERATE_PROXY', prompt },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            return reject(new Error(chrome.runtime.lastError.message));
                        }
                        if (response?.error) {
                            return reject(new Error(response.error));
                        }
                        resolve(response?.text || '');
                    }
                );
            });
        }

        // We are in background, use queue directly
        return this.generateContentInternal(prompt);
    }

    private async _streamGenerate(prompt: string, callbacks: StreamCallbacks): Promise<string> {
        // Streaming proxying is complex, for now we will fall back to non-streaming proxy 
        // or implement basic full-response return for simplicity in this crisis.
        // If we are strictly in a rate-limit crisis, simple generation is safer than keeping connections open.

        if (!this.isBackground) {
            const text = await this._generate(prompt);
            callbacks.onComplete(text);
            return text;
        }

        return this.queue.add(() => this._withRetry(async () => {
            if (!this.isConfigured()) await this.init();

            if (this.provider === 'gemini') {
                const result = await this.model.generateContentStream(prompt);
                let fullText = '';
                for await (const chunk of result.stream) {
                    const token = chunk.text();
                    fullText += token;
                    callbacks.onToken(token);
                }
                const cleaned = this._cleanLatex(fullText);
                callbacks.onComplete(cleaned);
                return cleaned;
            } else {
                if (!this.groq) throw new Error('Groq not initialized');
                const stream = await this.groq.chat.completions.create({
                    messages: [{ role: 'user', content: prompt }],
                    model: this.groqModelName,
                    stream: true,
                });

                let fullText = '';
                for await (const chunk of stream) {
                    const token = chunk.choices[0]?.delta?.content || '';
                    if (token) {
                        fullText += token;
                        callbacks.onToken(token);
                    }
                }
                const cleaned = this._cleanLatex(fullText);
                callbacks.onComplete(cleaned);
                return cleaned;
            }
        }));
    }
    private async _withRetry<T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
        try {
            return await operation();
        } catch (error: any) {
            if (retries > 0 && (error.message?.includes('429') || error.status === 429)) {

                // Notify queue to back off globally
                this.queue.notifyRateLimit();

                let waitTime = delay;

                // Extract wait time from error message (e.g. "Please retry in 31.64s")
                const match = error.message?.match(/retry in (\d+(\.\d+)?)s/);
                if (match) {
                    waitTime = Math.ceil(parseFloat(match[1]) * 1000) + 2000; // Add 2s buffer
                } else if (error.headers?.get?.('retry-after')) {
                    // Try to parse standard header if available in error object (rare in JS SDK but possible)
                    const retryAfter = parseInt(error.headers.get('retry-after'), 10);
                    if (!isNaN(retryAfter)) waitTime = (retryAfter * 1000) + 2000;
                }

                // If not specific, just exponential backoff
                if (waitTime < 2000) waitTime = 2000;

                console.warn(`[ResumeForge] Rate limited. Waiting ${waitTime}ms before retry. Retries left: ${retries}`);

                // Wait...
                await new Promise((resolve) => setTimeout(resolve, waitTime));

                // Retry with increased delay for next attempt
                return this._withRetry(operation, retries - 1, waitTime * 2);
            }
            throw error;
        }
    }

    private _cleanLatex(text: string): string {
        return text
            .replace(/```latex\n?/g, '')
            .replace(/```\n?/g, '')
            .replace(/\\boxed\{/g, '')
            .replace(/\{\\displaystyle\s+/g, '')
            .trim();
    }

    private _extractSection(latex: string, sectionName: string): string {
        const regex = new RegExp(
            `\\\\section\\{${sectionName}\\}([\\s\\S]*?)(?=\\\\section\\{|\\\\end\\{document\\}|$)`,
            'i'
        );
        const match = latex.match(regex);
        return match?.[1]?.trim() || `\\section{${sectionName}}\n% Section not found`;
    }
}

class RequestQueue {
    private queue: Array<() => Promise<any>> = [];
    private processing = false;
    private lastRequestTime = 0;
    private minDelay = 4000; // Start with 4s (SAFE default for 15 RPM)
    private baseDelay = 4000;

    // Called when a 429 is hit to temporarily increase global delay
    notifyRateLimit() {
        // Aggressively increase delay
        this.minDelay = Math.min(this.minDelay * 2, 30000); // Cap at 30s
        console.warn(`[ResumeForge] Increasing global queue delay to ${this.minDelay}ms due to rate limits.`);

        // Reset back to base delay after 2 minutes of success (simple decay)
        setTimeout(() => {
            this.minDelay = this.baseDelay;
            console.log(`[ResumeForge] Resetting global queue delay to ${this.baseDelay}ms.`);
        }, 120000);
    }

    async add<T>(operation: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await operation();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
            this.process();
        });
    }

    private async process() {
        if (this.processing) return;
        this.processing = true;

        while (this.queue.length > 0) {
            const operation = this.queue.shift();
            if (operation) {
                // Enforce minimum delay since last request
                const now = Date.now();
                const timeSinceLast = now - this.lastRequestTime;

                if (timeSinceLast < this.minDelay) {
                    await new Promise((r) => setTimeout(r, this.minDelay - timeSinceLast));
                }

                try {
                    await operation();
                } catch (e) {
                    console.error('[ResumeForge] Queue operation failed', e);
                }

                this.lastRequestTime = Date.now();
            }
        }

        this.processing = false;
    }
}

export const aiService = new AIService();
