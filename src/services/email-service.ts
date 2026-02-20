// ResumeForge AI – Email Service
// Gmail compose, Outlook mailto, LinkedIn DM URL builders

class EmailService {
    // ─── Gmail Compose ─────────────────────────────────────────
    openGmailCompose(params: {
        to: string;
        subject: string;
        body: string;
    }): void {
        const url = new URL('https://mail.google.com/mail/?view=cm&fs=1');
        url.searchParams.set('to', params.to);
        url.searchParams.set('su', params.subject);
        url.searchParams.set('body', params.body);
        window.open(url.toString(), '_blank');
    }

    // ─── Outlook Compose ──────────────────────────────────────
    openOutlookCompose(params: {
        to: string;
        subject: string;
        body: string;
    }): void {
        // Outlook Web compose URL
        const url = new URL('https://outlook.live.com/mail/0/deeplink/compose');
        url.searchParams.set('to', params.to);
        url.searchParams.set('subject', params.subject);
        url.searchParams.set('body', params.body);
        window.open(url.toString(), '_blank');
    }

    // ─── Mailto Fallback ──────────────────────────────────────
    openMailto(params: {
        to: string;
        subject: string;
        body: string;
    }): void {
        const mailto = `mailto:${encodeURIComponent(params.to)}?subject=${encodeURIComponent(params.subject)}&body=${encodeURIComponent(params.body)}`;
        window.open(mailto);
    }

    // ─── LinkedIn Message ─────────────────────────────────────
    openLinkedInMessage(profileUrl: string, messageText?: string): void {
        // Extract profile ID from URL
        const match = profileUrl.match(/linkedin\.com\/in\/([^/]+)/);
        if (match) {
            // LinkedIn messaging URL
            const msgUrl = `https://www.linkedin.com/messaging/compose/?to=${match[1]}`;
            window.open(msgUrl, '_blank');
        } else {
            // Just open the profile
            window.open(profileUrl, '_blank');
        }
    }

    // ─── Parse Email Content ───────────────────────────────────
    parseEmailDraft(draft: string): { subject: string; body: string } {
        const subjectMatch = draft.match(/Subject:\s*(.+?)(?:\n|$)/i);
        const subject = subjectMatch ? subjectMatch[1].trim() : 'Application Follow-Up';
        const body = draft
            .replace(/Subject:\s*.+?\n/i, '')
            .trim();

        return { subject, body };
    }
}

export const emailService = new EmailService();
