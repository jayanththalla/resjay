// ResumeForge AI – Background Service Worker (Manifest V3)
import { aiService } from './services/ai-service';

// Initialize AI service on startup
aiService.init();

chrome.runtime.onInstalled.addListener(() => {
    // Enable side panel on action click
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

    // Context menu to open side panel
    chrome.contextMenus.create({
        id: 'openResumeForge',
        title: 'Open ResumeForge AI',
        contexts: ['all'],
    });

    // Context menu to autofill current page
    chrome.contextMenus.create({
        id: 'autofillPage',
        title: 'ResumeForge: Autofill This Form',
        contexts: ['page'],
    });

    console.log('[ResumeForge] Extension installed and configured');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab?.id || !tab?.windowId) return;

    if (info.menuItemId === 'openResumeForge') {
        try {
            await chrome.sidePanel.open({ windowId: tab.windowId });
        } catch (error) {
            console.error('[ResumeForge] Failed to open side panel:', error);
        }
    }

    if (info.menuItemId === 'autofillPage') {
        try {
            await chrome.tabs.sendMessage(tab.id, { type: 'AUTOFILL_TRIGGER' });
        } catch (error) {
            console.error('[ResumeForge] Failed to trigger autofill:', error);
        }
    }
});

// Startup initialization
chrome.runtime.onStartup.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Handle extension icon click – explicitly open side panel
chrome.action.onClicked.addListener(async (tab) => {
    try {
        if (tab?.windowId) {
            await chrome.sidePanel.open({ windowId: tab.windowId });
        }
    } catch (error) {
        console.error('[ResumeForge] Failed to open side panel on click:', error);
    }
});

// Message relay between content scripts and popup/sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GEMINI_REQUEST') {
        handleGeminiRequest(message.payload)
            .then(sendResponse)
            .catch((error) => sendResponse({ error: error.message }));
        return true;
    }

    if (message.type === 'GET_KNOWLEDGE_BASE') {
        chrome.storage.local.get(['knowledgeBase'], (result) => {
            sendResponse(result.knowledgeBase || {});
        });
        return true;
    }

    if (message.type === 'OPEN_SIDEPANEL') {
        if (sender.tab?.windowId) {
            chrome.sidePanel.open({ windowId: sender.tab.windowId }).catch(console.error);
        }
        return false;
    }

    // ─── Autofill Routing ────────────────────────────────────
    if (message.type === 'INJECT_AND_SCAN') {
        // Inject content script and scan fields on the active tab
        (async () => {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab?.id) throw new Error('No active tab');

                // Inject the content script dynamically
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['autofill.js'],
                });

                // Give script time to initialize
                await new Promise((r) => setTimeout(r, 300));

                // Now scan
                const result = await chrome.tabs.sendMessage(tab.id, { action: 'SCAN_FIELDS' });
                sendResponse(result);
            } catch (error: any) {
                console.error('[ResumeForge] Inject and scan failed:', error);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true;
    }

    if (message.type === 'SCAN_ACTIVE_TAB') {
        (async () => {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab?.id) throw new Error('No active tab');
                const result = await chrome.tabs.sendMessage(tab.id, { action: 'SCAN_FIELDS' });
                sendResponse(result);
            } catch (error: any) {
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true;
    }

    if (message.type === 'FILL_ACTIVE_TAB') {
        (async () => {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab?.id) throw new Error('No active tab');
                const result = await chrome.tabs.sendMessage(tab.id, {
                    action: 'FILL_FIELDS',
                    data: message.fields,
                });
                sendResponse(result);
            } catch (error: any) {
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true;
    }

    if (message.type === 'EXTRACT_JOB_INFO') {
        (async () => {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab?.id) throw new Error('No active tab');
                const result = await chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_JOB_INFO' });
                sendResponse(result);
            } catch (error: any) {
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true;
    }
    if (message.type === 'GEMINI_GENERATE_PROXY') {
        aiService.generateContentInternal(message.prompt)
            .then((text: string) => sendResponse({ text }))
            .catch((error: any) => sendResponse({ error: error.message }));
        return true;
    }
});

// Sync settings changes to re-initialize AI service
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) {
        console.log('[ResumeForge] Settings changed, re-initializing AI service');
        aiService.init();
    }
});



async function handleGeminiRequest(payload: {
    prompt: string;
    apiKey: string;
}): Promise<{ text: string }> {
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    const response = await fetch(`${endpoint}?key=${payload.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: payload.prompt }] }],
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Gemini API request failed');
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');

    return { text };
}
