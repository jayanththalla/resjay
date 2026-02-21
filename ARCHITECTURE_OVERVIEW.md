# ResumeForge AI - System Architecture

## High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RESUMEFORGE AI - EXTENSION                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    USER INTERFACE LAYER                       │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐               │   │
│  │  │   Popup    │ │ SidePanel  │ │  Content   │               │   │
│  │  │            │ │            │ │  Script    │               │   │
│  │  └────────────┘ └────────────┘ └────────────┘               │   │
│  │         │               │               │                    │   │
│  │         └───────────────┼───────────────┘                    │   │
│  │                         ▼                                     │   │
│  │              ┌──────────────────────┐                        │   │
│  │              │      App.tsx         │                        │   │
│  │              │  (Main Router)       │                        │   │
│  │              └──────────────────────┘                        │   │
│  │                         │                                     │   │
│  │    ┌────────────────────┼────────────────────┐               │   │
│  │    ▼                    ▼                    ▼                │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │   │
│  │  │ChatInterface │  │AutofillTab   │  │ApplicationsTab│      │   │
│  │  │ (Resume)     │  │(Form Auto)   │  │(New Feature) │       │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │   │
│  │         │                                     │               │   │
│  │         │          ┌──────────────────────┐   │               │   │
│  │         │          │  ApplicationTracker  │   │               │   │
│  │         │          │  (Dashboard & Metrics)   │               │   │
│  │         │          └──────────────────────┘   │               │   │
│  │         │                  │                  │               │   │
│  │         │     ┌────────────┼──────────────┬───┴──────────┐   │   │
│  │         │     ▼            ▼              ▼              ▼    │   │
│  │         │  ┌─────┐  ┌────────────┐  ┌──────────┐  ┌──────┐ │   │
│  │         │  │Cold │  │FollowUp    │  │ Contact  │  │Label │ │   │
│  │         │  │Email│  │ Manager    │  │Directory │  │Analysis  │   │
│  │         │  └─────┘  └────────────┘  └──────────┘  └──────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                         │                                            │
├─────────────────────────┼────────────────────────────────────────────┤
│                         ▼                                            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   BUSINESS LOGIC LAYER                        │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │                                                               │   │
│  │  APPLICATION TRACKING      COLD OUTREACH                     │   │
│  │  ┌────────────────────┐    ┌─────────────────────┐          │   │
│  │  │ app-tracking       │    │ cold-outreach       │          │   │
│  │  │ -service.ts        │    │ -service.ts         │          │   │
│  │  │                    │    │                     │          │   │
│  │  │ • CRUD apps        │    │ • Generate emails   │          │   │
│  │  │ • Metrics calc     │    │ • Generate DMs      │          │   │
│  │  │ • Search/filter    │    │ • Schedule send     │          │   │
│  │  │ • Export/import    │    │ • Track status      │          │   │
│  │  └────────────────────┘    └─────────────────────┘          │   │
│  │                                                               │   │
│  │  FOLLOW-UPS                 CONTACTS                          │   │
│  │  ┌────────────────────┐    ┌─────────────────────┐          │   │
│  │  │ followup           │    │ contact             │          │   │
│  │  │ -service.ts        │    │ -service.ts         │          │   │
│  │  │                    │    │                     │          │   │
│  │  │ • Schedule Day3/7  │    │ • Store contacts    │          │   │
│  │  │ • Track status     │    │ • Track interactions│          │   │
│  │  │ • Send templates   │    │ • Search/filter     │          │   │
│  │  │ • Customizable     │    │ • Export/import     │          │   │
│  │  └────────────────────┘    └─────────────────────┘          │   │
│  │                                                               │   │
│  │  FORM ANALYSIS                                               │   │
│  │  ┌────────────────────────────────────────────┐             │   │
│  │  │ label-analysis                             │             │   │
│  │  │ -service.ts                                │             │   │
│  │  │                                            │             │   │
│  │  │ • Score answers (0-100)                   │             │   │
│  │  │ • Generate suggestions                    │             │   │
│  │  │ • Learn from past responses               │             │   │
│  │  │ • Generate improved answers               │             │   │
│  │  └────────────────────────────────────────────┘             │   │
│  │                                                               │   │
│  │  AI SERVICE (Shared)                                         │   │
│  │  ┌────────────────────────────────────────────┐             │   │
│  │  │ ai-service.ts (Gemini + Groq support)     │             │   │
│  │  │ • Multi-provider switching                │             │   │
│  │  │ • Streaming support                       │             │   │
│  │  │ • Prompt engineering                      │             │   │
│  │  └────────────────────────────────────────────┘             │   │
│  │                                                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                         │                                            │
├─────────────────────────┼────────────────────────────────────────────┤
│                         ▼                                            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   DATA PERSISTENCE LAYER                      │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │                                                               │   │
│  │  ┌──────────────────────────────────────────────────────┐    │   │
│  │  │      Chrome Local Storage (10MB max)                │    │   │
│  │  │                                                      │    │   │
│  │  │  • resumeforge_applications                         │    │   │
│  │  │  • resumeforge_outreach_messages                    │    │   │
│  │  │  • resumeforge_followup_schedules                   │    │   │
│  │  │  • resumeforge_contacts                             │    │   │
│  │  │  • resumeforge_form_analysis                        │    │   │
│  │  │                                                      │    │   │
│  │  └──────────────────────────────────────────────────────┘    │   │
│  │                                                               │   │
│  │  storage-service.ts                                          │   │
│  │  • Unified storage API                                       │   │
│  │  • Data validation                                           │   │
│  │  • Quota management                                          │   │
│  │                                                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
    External APIs
    ┌───────────────┐
    │ Gemini API    │
    │ Groq API      │
    │ Chrome APIs   │
    └───────────────┘
```

---

## Data Flow Diagrams

### Application Tracking Flow

```
User Submits Application
        │
        ▼
┌─────────────────────────────┐
│ Track Application Button    │
│ (AutofillTab or Manual)     │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ Create Application          │
│ • Validate input            │
│ • Extract metadata          │
│ • Generate ID               │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ Store in Chrome Storage     │
│ Key: resumeforge_           │
│       applications          │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ Auto-Schedule Follow-ups    │
│ • Day 3                     │
│ • Day 7                     │
│ • Day 14                    │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ Update Dashboard            │
│ • Recalc metrics            │
│ • Add to list               │
│ • Show toast notification   │
└─────────────────────────────┘
```

### Cold Email Generation Flow

```
User Selects Application
        │
        ▼
┌─────────────────────────────┐
│ Launch ColdOutreachBuilder  │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ Collect User Input          │
│ • Accomplishments           │
│ • Skills                    │
│ • Experience                │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ Call AI Service             │
│ • Use AI Provider           │
│ • Generate with streaming   │
│ • Subject line + body       │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ Display Generated Email     │
│ • Preview in UI             │
│ • Stream tokens as arrive   │
│ • Allow user to edit        │
└─────────────────────────────┘
        │
        ├─────────────────────────────┐
        │                             │
        ▼                             ▼
    Copy/Send Now          Schedule for Later
        │                             │
        └─────────────────────────────┘
                    │
                    ▼
        ┌─────────────────────────────┐
        │ Store Outreach Message      │
        │ • Save to storage           │
        │ • Set status                │
        │ • Schedule if needed        │
        └─────────────────────────────┘
                    │
                    ▼
        ┌─────────────────────────────┐
        │ Track in Application        │
        │ • Link to app ID            │
        │ • Update last contact       │
        │ • Log in contact interactions
        └─────────────────────────────┘
```

### Form Analysis Flow

```
User Goes to LabelAnalyzer
        │
        ▼
┌─────────────────────────────┐
│ Input Form Questions        │
│ • Question 1                │
│ • Question 2                │
│ • ...                       │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ Input Your Answers          │
│ • Your answer 1             │
│ • Your answer 2             │
│ • ...                       │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ Optional: Paste Job Desc    │
│ (For context in analysis)   │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ Click "Analyze Answers"     │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ For Each Answer:            │
│ • Call AI analysis          │
│ • Get score + feedback      │
│ • Get suggestions           │
│ • Show progress             │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ Display Results             │
│ • Overall score             │
│ • Per-answer feedback       │
│ • Improvement suggestions   │
│ • Option: Generate improved │
└─────────────────────────────┘
        │
        ├──────────────────────────────┐
        │                              │
        ▼                              ▼
   Use Suggestions            Improve Answer
        │                              │
        │              ┌───────────────┘
        │              │
        ▼              ▼
┌─────────────────────────────┐
│ Store Analysis              │
│ • Save to storage           │
│ • Link to app if available  │
│ • Track if interviewed      │
└─────────────────────────────┘
```

---

## Service Dependencies

```
ApplicationsTab
    │
    ├── ApplicationTracker
    │       └── application-tracking-service
    │
    ├── ColdOutreachBuilder
    │       ├── cold-outreach-service
    │       ├── ai-service
    │       └── application-tracking-service
    │
    ├── ContactDirectory
    │       └── contact-service
    │
    └── LabelAnalyzer
            ├── label-analysis-service
            └── ai-service
```

---

## Component Hierarchy

```
App
├── ErrorBoundary
│   └── AppContent
│       ├── LandingPage (view: landing)
│       └── MainView (view: main)
│           ├── Tabs Component
│           │   ├── ChatInterface Tab
│           │   ├── ResumeUpload + Preview
│           │   ├── AutofillTab
│           │   ├── EmailTab
│           │   └── ApplicationsTab (NEW) ⭐
│           │       ├── ApplicationTracker
│           │       │   ├── MetricsCards
│           │       │   ├── SearchBar
│           │       │   ├── ApplicationsList
│           │       │   └── ExportImport
│           │       │
│           │       ├── ApplicationDetail
│           │       │   ├── BasicInfo
│           │       │   ├── Actions
│           │       │   └── FollowUpList
│           │       │
│           │       ├── ColdOutreachBuilder
│           │       │   ├── ExperienceInput
│           │       │   ├── EmailPreview
│           │       │   └── ScheduleOption
│           │       │
│           │       ├── ContactDirectory
│           │       │   ├── SearchBar
│           │       │   ├── ContactsList
│           │       │   └── InteractionLog
│           │       │
│           │       └── LabelAnalyzer
│           │           ├── FormInput
│           │           ├── AnalysisResults
│           │           └── SuggestionsList
│           │
│           └── SettingsPanel
└── Toast (notifications)
```

---

## State Management

```
Local Component State (React.useState)
├── ApplicationTracker
│   ├── applications: JobApplication[]
│   ├── selectedApp: JobApplication | null
│   ├── searchQuery: string
│   ├── filteredApps: JobApplication[]
│   └── metrics: Metrics
│
├── ColdOutreachBuilder
│   ├── experience: string
│   ├── skills: string[]
│   ├── generatedEmail: string
│   ├── isStreaming: boolean
│   └── scheduledDate: Date | null
│
├── LabelAnalyzer
│   ├── formAnswers: FormAnswer[]
│   ├── isAnalyzing: boolean
│   ├── analyses: AnswerAnalysis[]
│   └── overallScore: number
│
└── App (Global)
    ├── view: 'landing' | 'main' | 'settings'
    ├── activeTab: string
    ├── resumeLatex: string
    ├── jobDescription: string
    └── messages: ChatMessage[]
```

---

## Storage Schema

### resumeforge_applications
```typescript
[
  {
    id: string,
    companyName: string,
    position: string,
    recruiterName?: string,
    recruiterEmail?: string,
    applicationDate: number,
    status: 'applied' | 'interview' | 'offer' | 'accepted' | 'rejected' | 'pending',
    notes?: string,
    tailoredResume?: string,
    coverLetter?: string,
    createdAt: number,
    updatedAt: number
  }
]
```

### resumeforge_outreach_messages
```typescript
[
  {
    id: string,
    applicationId: string,
    type: 'email' | 'dm',
    subject?: string,
    body: string,
    scheduledDate?: number,
    sentDate?: number,
    status: 'draft' | 'scheduled' | 'sent' | 'bounced' | 'opened' | 'clicked',
    metadata?: Record<string, any>,
    createdAt: number
  }
]
```

### resumeforge_followup_schedules
```typescript
[
  {
    id: string,
    applicationId: string,
    daysSinceApplication: number,
    scheduledDate: number,
    templateId: string,
    message: string,
    status: 'pending' | 'sent' | 'skipped',
    sentDate?: number,
    createdAt: number
  }
]
```

### resumeforge_contacts
```typescript
[
  {
    id: string,
    name: string,
    email?: string,
    company: string,
    title?: string,
    linkedinUrl?: string,
    tags?: string[],
    notes?: string,
    interactions: [
      {
        id: string,
        type: 'email' | 'dm' | 'call' | 'meeting' | 'other',
        date: number,
        subject?: string,
        notes?: string
      }
    ],
    createdAt: number,
    lastInteractionDate?: number
  }
]
```

### resumeforge_form_analysis
```typescript
[
  {
    id: string,
    applicationId?: string,
    answers: [
      {
        label: string,
        answer: string,
        score: number,
        feedback: string,
        suggestions: string[],
        resultsInInterview?: boolean
      }
    ],
    overallScore: number,
    timestamp: number
  }
]
```

---

## Communication Flows

### Extension to Content Script
```
Extension Popup/SidePanel
    │
    ├── Send: "autofill_fields"
    ├── Send: "extract_job_description"
    └── Send: "get_form_data"
        │
        ▼
    Content Script
        │
        ├── Inject form autofiller
        ├── Extract page data
        └── Send back to extension
```

### Extension to Background Script
```
Extension (UI)
    │
    ├── Send: "schedule_email"
    ├── Send: "schedule_followup"
    └── Send: "send_notification"
        │
        ▼
    Background Script
        │
        ├── Listen for scheduled tasks
        ├── Trigger actions at specified time
        └── Send notifications to user
```

---

## Error Handling Strategy

```
All Service Methods
    │
    ├── Try {
    │       Execute business logic
    │   }
    │
    ├── Catch (Error) {
    │       Log with [v0] prefix
    │       Return user-friendly message
    │       UI shows error toast
    │   }
    │
    └── Finally {
            Clean up resources
            Update loading state
        }
```

---

## Performance Optimization

1. **Caching**
   - Applications loaded once on app start
   - Cached in React state
   - Re-fetch on mutations

2. **Lazy Loading**
   - Follow-up templates loaded on demand
   - Contact search results paginated
   - Analytics calculated on-demand

3. **Debouncing**
   - Search input: 500ms debounce
   - Auto-save: 2s debounce

4. **Streaming**
   - AI responses streamed to UI
   - No wait for full response
   - Progressive enhancement

---

## Security Considerations

1. **Data Storage**
   - All data in Chrome local storage (isolated)
   - No data sent to external servers by extension
   - User controls all API keys

2. **API Key Management**
   - Keys stored in settings only
   - Never logged
   - Cleared on logout

3. **Content Security**
   - No inline scripts
   - External APIs used via official SDKs
   - CORS-friendly requests

---

## Scalability Notes

| Component | Current Limit | Scaling Plan |
|-----------|--------------|--------------|
| Applications | 500 | Archive old apps |
| Contacts | 1000 | IndexedDB in v2 |
| Messages | 2000 | Compress old messages |
| Storage | 10MB | Archive to cloud |

---

This architecture is designed to be:
- ✅ **Modular**: Each service handles one domain
- ✅ **Extensible**: Easy to add new features
- ✅ **Maintainable**: Clear separation of concerns
- ✅ **Performant**: Optimized for extension environment
- ✅ **Scalable**: Ready for growth with data archiving
