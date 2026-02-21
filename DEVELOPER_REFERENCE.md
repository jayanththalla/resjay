# ResumeForge AI - Developer Reference

## Quick Start

```bash
# Install & run
npm install
npm run dev

# Build extension
npm run build
```

---

## Project Structure

```
/src
├── components/
│   ├── ApplicationTracker.tsx        # Dashboard & metrics
│   ├── ApplicationsTab.tsx           # Main integrated tab
│   ├── ColdOutreachBuilder.tsx       # Email/DM generator
│   ├── ContactDirectory.tsx          # Contact manager
│   ├── LabelAnalyzer.tsx            # Form answer analyzer
│   ├── App.tsx                       # Main app (has Applications tab)
│   └── [other components...]
├── services/
│   ├── application-tracking-service.ts  # CRUD applications
│   ├── cold-outreach-service.ts        # Email/DM generation
│   ├── followup-service.ts             # Follow-up scheduling
│   ├── contact-service.ts              # Contact management
│   ├── label-analysis-service.ts       # Answer analysis
│   ├── ai-service.ts                   # AI integration
│   └── [other services...]
├── lib/
│   └── utils.ts                     # Utilities
└── types/
    └── [TypeScript types]
```

---

## Core Services API

### ApplicationTrackingService

```typescript
// Create
await applicationTrackingService.createApplication({
  companyName: string;
  position: string;
  recruiterName?: string;
  recruiterEmail?: string;
  applicationDate: number;
  status: 'applied' | 'interview' | 'offer' | 'accepted' | 'rejected' | 'pending';
  notes?: string;
});

// Get all
const apps = await applicationTrackingService.getAllApplications();

// Get by ID
const app = await applicationTrackingService.getApplication(id);

// Update
await applicationTrackingService.updateApplication(id, updates);

// Delete
await applicationTrackingService.deleteApplication(id);

// Get metrics
const metrics = await applicationTrackingService.getMetrics();
// Returns: totalApplications, successRate, avgTimeToResponse, etc.

// Get due for follow-up
const pending = await applicationTrackingService.getApplicationsDueForFollowUp();

// Search/filter
const results = await applicationTrackingService.searchApplications({
  company?: string;
  position?: string;
  status?: string;
  dateFrom?: number;
  dateTo?: number;
});

// Archive
await applicationTrackingService.archiveApplication(id);
```

### ColdOutreachService

```typescript
// Generate email
const email = await coldOutreachService.generateColdEmail(
  recruiterName: string,
  companyName: string,
  position: string,
  experience: string,
  skills: string[],
  callbacks: { onToken: (token) => void }
);

// Generate DM
const dm = await coldOutreachService.generateLinkedInDM(
  recruiterName: string,
  companyName: string,
  position: string,
  experience: string,
  skills: string[],
  callbacks: { onToken: (token) => void }
);

// Create & save message
await coldOutreachService.createOutreachMessage(
  applicationId: string,
  type: 'email' | 'dm',
  body: string,
  context: { recruiterName, companyName, position, keyHighlights },
  subjectLine?: string
);

// Schedule message
await coldOutreachService.scheduleMessage(messageId: string, scheduledDate: Date);

// Get messages
const messages = await coldOutreachService.getOutreachMessages(applicationId);

// Get scheduled
const scheduled = await coldOutreachService.getScheduledMessages();

// Update status
await coldOutreachService.updateMessageStatus(
  messageId: string,
  status: 'pending' | 'sent' | 'bounced' | 'opened' | 'clicked'
);
```

### FollowupService

```typescript
// Schedule
await followupService.scheduleFollowUp(
  applicationId: string,
  daysSinceApplication: number,
  templateId: string,
  title: string
);

// Auto-schedule all
const schedules = await followupService.autoScheduleFollowUps();

// Get pending
const pending = await followupService.getPendingFollowUps();

// Get for app
const appFollowups = await followupService.getFollowUpsForApplication(appId);

// Send
await followupService.sendFollowUp(followupId: string);

// Update status
await followupService.updateFollowUpStatus(
  followupId: string,
  status: 'pending' | 'sent' | 'skipped'
);

// Get templates
const templates = await followupService.getFollowUpTemplates();

// Create custom template
await followupService.createTemplate({
  name: string;
  daysSinceApplication: number;
  content: string; // Can use {recruiterName}, {company}, {position}
});
```

### ContactService

```typescript
// Create
await contactService.createContact({
  name: string;
  email?: string;
  company: string;
  title?: string;
  linkedinUrl?: string;
  tags?: string[];
  notes?: string;
});

// Get all
const contacts = await contactService.getAllContacts();

// Get by ID
const contact = await contactService.getContact(id);

// Update
await contactService.updateContact(id, updates);

// Delete
await contactService.deleteContact(id);

// Search
const results = await contactService.searchContacts(query: string);

// Add interaction
await contactService.addInteraction(contactId: string, {
  type: 'email' | 'dm' | 'call' | 'meeting' | 'other';
  date: number;
  subject?: string;
  notes?: string;
});

// Get interactions
const interactions = await contactService.getInteractions(contactId);

// Export
const json = await contactService.exportContacts();

// Import
await contactService.importContacts(jsonData);

// Get stats
const stats = await contactService.getContactStatistics();
// Returns: totalContacts, engagementRate, recentContacts, etc.
```

### LabelAnalysisService

```typescript
// Analyze single answer
const analysis = await labelAnalysisService.analyzeAnswer(
  label: string,
  answer: string,
  jobDescription: string,
  callbacks?: { onToken: (token) => void }
);
// Returns: { score: 0-100, feedback: string, suggestions: string[] }

// Analyze entire form
const formAnalysis = await labelAnalysisService.analyzeForm(
  answers: Array<{ label: string; value: string }>,
  jobDescription: string,
  callbacks?: { onProgressUpdate: (progress) => void }
);
// Returns: { overallScore: 0-100, answers: [{ ...analysis }] }

// Get suggestions for label
const examples = await labelAnalysisService.getSuccessfulAnswersForLabel(label: string);

// Generate improved answer
const improved = await labelAnalysisService.generateImprovedAnswer(
  label: string,
  currentAnswer: string,
  jobDescription: string,
  callbacks?: { onToken: (token) => void }
);

// Store analysis
await labelAnalysisService.storeAnalysis({
  applicationId: string;
  label: string;
  originalAnswer: string;
  score: number;
  feedback: string;
  suggestions: string[];
  resultsInInterview: boolean;
});

// Get stored analyses
const stored = await labelAnalysisService.getStoredAnalyses(label?: string);

// Learn from success
const insights = await labelAnalysisService.generateInsights();
// Returns: { bestPerformingLabels, commonPatterns, recommendations }
```

---

## Storage Keys

```typescript
// Chrome storage keys
const STORAGE_KEYS = {
  applications: 'resumeforge_applications',      // Job applications array
  outreachMessages: 'resumeforge_outreach_messages', // Email/DM array
  followupSchedules: 'resumeforge_followup_schedules', // Follow-ups array
  contacts: 'resumeforge_contacts',              // Contacts array
  formAnalysis: 'resumeforge_form_analysis'      // Form answers array
};

// Access
const apps = await chrome.storage.local.get('resumeforge_applications');
const contacts = await chrome.storage.local.get('resumeforge_contacts');
```

---

## Component Props

### ApplicationsTab

```typescript
interface ApplicationsTabProps {
  onApplicationTracked?: () => void;
}
```

### ApplicationTracker

```typescript
interface ApplicationTrackerProps {
  applications: JobApplication[];
  onApplicationSelect: (app: JobApplication) => void;
  onApplicationDelete: (id: string) => void;
}
```

### ColdOutreachBuilder

```typescript
interface ColdOutreachBuilderProps {
  application: JobApplication;
  onMessageSend: (message: OutreachMessage) => void;
  onMessageSchedule: (message: OutreachMessage, date: Date) => void;
}
```

### ContactDirectory

```typescript
interface ContactDirectoryProps {
  onContactSelect?: (contact: Contact) => void;
  onContactAdd?: (contact: Contact) => void;
}
```

### LabelAnalyzer

```typescript
interface LabelAnalyzerProps {
  jobDescription?: string;
  onAnalysisComplete?: (analysis: FormAnalysis) => void;
}
```

---

## Interfaces

```typescript
interface JobApplication {
  id: string;
  companyName: string;
  position: string;
  recruiterName?: string;
  recruiterEmail?: string;
  applicationDate: number;
  status: 'applied' | 'interview' | 'offer' | 'accepted' | 'rejected' | 'pending';
  notes?: string;
  tailoredResume?: string;
  coverLetter?: string;
  createdAt: number;
  updatedAt: number;
}

interface OutreachMessage {
  id: string;
  applicationId: string;
  type: 'email' | 'dm';
  subject?: string;
  body: string;
  scheduledDate?: number;
  sentDate?: number;
  status: 'draft' | 'scheduled' | 'sent' | 'bounced' | 'opened' | 'clicked';
  metadata?: Record<string, any>;
}

interface FollowUpSchedule {
  id: string;
  applicationId: string;
  daysSinceApplication: number;
  scheduledDate: number;
  templateId: string;
  message: string;
  status: 'pending' | 'sent' | 'skipped';
  sentDate?: number;
}

interface Contact {
  id: string;
  name: string;
  email?: string;
  company: string;
  title?: string;
  linkedinUrl?: string;
  tags?: string[];
  notes?: string;
  interactions: Interaction[];
  createdAt: number;
  lastInteractionDate?: number;
}

interface Interaction {
  id: string;
  type: 'email' | 'dm' | 'call' | 'meeting' | 'other';
  date: number;
  subject?: string;
  notes?: string;
}

interface FormAnalysis {
  id: string;
  applicationId?: string;
  answers: AnswerAnalysis[];
  overallScore: number;
  timestamp: number;
}

interface AnswerAnalysis {
  label: string;
  answer: string;
  score: 0-100;
  feedback: string;
  suggestions: string[];
  resultsInInterview?: boolean;
}
```

---

## Common Patterns

### Loading Applications

```typescript
const loadApplications = async () => {
  try {
    const apps = await applicationTrackingService.getAllApplications();
    setApplications(apps);
  } catch (error) {
    console.error('[v0] Failed to load applications:', error);
    setError(error.message);
  }
};

useEffect(() => {
  loadApplications();
}, []);
```

### Streaming AI Generation

```typescript
const generateEmail = async (app: JobApplication) => {
  let fullText = '';
  try {
    const email = await coldOutreachService.generateColdEmail(
      app.recruiterName || 'Hiring Manager',
      app.companyName,
      app.position,
      experience,
      skills,
      {
        onToken: (token) => {
          fullText += token;
          setStreamingEmail(fullText);
        },
        onComplete: (complete) => {
          setEmail(complete);
        }
      }
    );
  } catch (error) {
    console.error('[v0] Generation failed:', error);
    setError(error.message);
  }
};
```

### Error Handling

```typescript
try {
  await applicationTrackingService.createApplication(data);
  setToast({ message: 'Application added!', type: 'success' });
} catch (error: any) {
  setToast({ 
    message: error.message || 'Failed to add application', 
    type: 'error' 
  });
}
```

---

## Testing

### Add Sample Application

```typescript
await applicationTrackingService.createApplication({
  companyName: 'Google',
  position: 'Senior Engineer',
  recruiterName: 'Alice Johnson',
  recruiterEmail: 'alice@google.com',
  applicationDate: Date.now() - 86400000, // 1 day ago
  status: 'applied'
});
```

### Generate Sample Cold Email

```typescript
const email = await coldOutreachService.generateColdEmail(
  'John Doe',
  'Tech Startup',
  'Product Manager',
  '8 years PM experience at startups',
  ['Product Strategy', 'User Research', 'Metrics']
);
```

### Create Sample Follow-up

```typescript
await followupService.scheduleFollowUp(
  applicationId,
  3, // 3 days
  'template_1',
  'First Follow-up'
);
```

---

## Debugging

### Enable Debug Logging

```typescript
console.log('[v0] Action description:', data);
```

Check the browser console (F12) for detailed logs with `[v0]` prefix.

### Check Storage

```typescript
chrome.storage.local.get(null, (items) => {
  console.log('[v0] Stored data:', items);
});
```

### Monitor Service Health

```typescript
// Check if services are initialized
console.log('[v0] AI Service initialized:', aiService.isReady);
console.log('[v0] Applications:', await applicationTrackingService.getAllApplications());
```

---

## Performance Tips

1. **Batch Operations**: Load all data once, cache locally
2. **Pagination**: For large lists, implement pagination
3. **Lazy Loading**: Load follow-up templates on demand
4. **Debouncing**: Debounce search queries (500ms)
5. **Memoization**: Use React.memo() for heavy components

---

## Common Issues

| Issue | Solution |
|-------|----------|
| Storage quota exceeded | Export & archive old applications |
| AI generation timeout | Check API key, increase timeout |
| Follow-ups not triggering | Verify background permissions |
| Duplicate contacts | Implement deduplication on import |
| Slow search | Add indexes to storage keys |

---

**Last Updated**: 2025-02-21  
**Status**: Production Ready
