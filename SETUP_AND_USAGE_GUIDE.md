# ResumeForge AI - Complete Setup & Usage Guide

## Overview

ResumeForge AI now includes a comprehensive **Application Tracking & Cold Outreach System** with AI-powered features for managing job applications, generating personalized cold emails, scheduling follow-ups, and analyzing form answers.

---

## System Architecture

### Services Implemented

| Service | Purpose | Location |
|---------|---------|----------|
| `application-tracking-service.ts` | Track applications with full metadata | `/src/services/` |
| `cold-outreach-service.ts` | Generate AI emails/DMs & schedule sends | `/src/services/` |
| `followup-service.ts` | Auto-schedule follow-ups on Days 3/7/14 | `/src/services/` |
| `contact-service.ts` | Manage recruiter contacts & interactions | `/src/services/` |
| `label-analysis-service.ts` | Analyze form answers with AI suggestions | `/src/services/` |

### UI Components Implemented

| Component | Purpose | Location |
|-----------|---------|----------|
| `ApplicationsTab.tsx` | Main unified tab for all tracking features | `/src/components/` |
| `ApplicationTracker.tsx` | Dashboard showing applications & metrics | `/src/components/` |
| `ColdOutreachBuilder.tsx` | Generate & schedule cold emails/DMs | `/src/components/` |
| `ContactDirectory.tsx` | Browse & manage recruiter contacts | `/src/components/` |
| `LabelAnalyzer.tsx` | Analyze form answers before submission | `/src/components/` |

---

## Getting Started

### 1. Basic Project Setup

```bash
# Install dependencies (auto-installed on file changes)
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

### 2. Access the Features

1. Open the ResumeForge AI extension popup
2. Complete onboarding (upload resume, add experience)
3. Click the **"Applications"** tab (new Briefcase icon)
4. You'll see the integrated tracking dashboard

---

## Feature Usage Guide

### 1. Application Tracking

#### Add a New Application

```
ApplicationsTab → Click "New Application"
```

**Required Fields:**
- Company Name
- Job Position
- Application Status (applied, interviewing, offer, etc.)

**Optional Fields:**
- Recruiter Name & Email
- Salary Range
- Location
- Job URL
- Notes

#### Dashboard Metrics

The ApplicationTracker displays:
- **Total Applications**: All tracked applications
- **Success Rate**: Interview/Offer rate
- **Avg Response Time**: Days to first response
- **Pending Follow-ups**: Count of due follow-ups

#### Search & Filter

```
Search by: Company name, position, recruiter
Filter by: Status, date range, location
Sort by: Recent, alphabetical, by status
```

#### Export/Import

```
ApplicationTracker → "Export Applications" → JSON file
Or import previously exported JSON files
```

---

### 2. Cold Outreach (Email & DM Generation)

#### Generate Cold Email

1. **Select an application** from the dashboard
2. **Click "Send Cold Email"**
3. **Enter your info:**
   - Key accomplishments
   - Relevant skills
   - Company role/context

4. **AI generates:**
   - Personalized subject line
   - Professional cold email body
   - Call-to-action

5. **Options:**
   - Copy & send manually
   - Schedule for specific date/time
   - Save as draft

#### LinkedIn DM Template

Similar flow, optimized for conversational DMs:
- More casual tone
- Shorter format
- Connection-focused approach

#### Message Tracking

Once sent, track:
- Send date/time
- Delivery status (pending, delivered, bounced)
- Manual engagement tracking (opened, clicked, replied)

---

### 3. Follow-up Management

#### Automatic Scheduling

When you add an application, follow-ups are auto-scheduled for:
- **Day 3**: Quick check-in
- **Day 7**: Follow-up on status
- **Day 14**: Final follow-up with renewed interest

#### View Pending Follow-ups

```
ApplicationTracker → "Pending Follow-ups" section
Shows all follow-ups due in next 7 days
```

#### Send Follow-up

1. Click on pending follow-up
2. Review auto-generated message
3. Customize if needed
4. Click "Send Now" or "Schedule"

#### Custom Follow-ups

Create follow-ups on any schedule:
```
Application Detail → "Schedule Follow-up"
Set custom days since application + message
```

#### Templates

Default templates include:
```
Day 3: "Hi {recruiterName}, following up on my application for {position} at {company}..."
Day 7: "I'm very interested in the {position} role and wanted to check on the status..."
Day 14: "I remain enthusiastic about {company} and the opportunity to join your team..."
```

Customize templates in `followup-service.ts` if needed.

---

### 4. Contact Management

#### Add Contact

```
ContactDirectory → "Add Contact"
```

**Fields:**
- Name
- Email
- Company
- Title (Recruiter, Hiring Manager, etc.)
- LinkedIn URL
- Tags (e.g., "responsive", "follow-up")
- Notes

#### Track Interactions

For each contact, log:
- Email sends
- DM sends
- Calls
- Replies
- Meetings
- Custom interactions

#### Search Contacts

```
Search by: Name, email, company, tag
Filter by: Recent contacts, unresponsive, tags
```

#### Export Contacts

```
ContactDirectory → "Export Contacts" → JSON file
Use for backup or import into CRM
```

---

### 5. Form Answer Analysis (Label Analysis)

#### Analyze Before Submitting

1. Go to **"Label Analyzer"** in ApplicationsTab
2. Paste each form question and your answer
3. Click **"Analyze Answers"**

#### Get AI Feedback

For each answer, receive:
- **Score** (0-100): Quality rating
- **Feedback**: Specific suggestions
- **Improvements**: Alternative phrasings

#### Example

```
Question: "Why are you interested in this role?"
Your Answer: "I like coding and want to work at your company."

AI Score: 35/100
Feedback: Too generic, doesn't show research or genuine interest
Suggested: "I'm impressed by your team's work on [specific product/tech]. 
           With my 5 years of experience in [domain], I can contribute to..."
```

#### Learn from Success

The system tracks which answers led to interviews:
```
Get suggestions based on previously successful answers
to similar questions
```

---

## Data Storage

### Storage Locations

All data stored in Chrome's local storage:

```typescript
chrome.storage.local.get([
  'resumeforge_applications',      // Job applications
  'resumeforge_outreach_messages',  // Cold emails/DMs
  'resumeforge_followup_schedules', // Scheduled follow-ups
  'resumeforge_contacts',           // Recruiter contacts
  'resumeforge_form_analysis'       // Form answer history
]);
```

### Storage Limits

- **Total**: 10MB per Chrome extension
- **Recommended max**: ~500 applications + related data
- **Solution for more**: Export old applications regularly

### Backup Strategy

1. **Weekly Export**: Export applications JSON
2. **Monthly Backup**: Export all data to cloud storage
3. **Contact Sync**: Export contacts for CRM backup

---

## Integration with Other Features

### Resume Tailoring + Application Tracking

1. Tailor resume using ChatInterface
2. Save tailored version with application
3. Track which resume version was used
4. Generate cold email mentioning tailored fit

### Form Autofill + Label Analysis

1. Use autofill on job applications
2. Before submitting, analyze your answers
3. Improve answers based on AI feedback
4. Track which answers get interviews

---

## API Reference

### Application Tracking

```typescript
import { applicationTrackingService } from '@/services/application-tracking-service';

// Create application
await applicationTrackingService.createApplication({
  companyName: 'Google',
  position: 'Senior Engineer',
  recruiterName: 'John Doe',
  recruiterEmail: 'john@google.com',
  applicationDate: Date.now(),
  status: 'applied'
});

// Get metrics
const metrics = await applicationTrackingService.getMetrics();
console.log(metrics.totalApplications, metrics.successRate);

// Get applications due for follow-up
const pending = await applicationTrackingService.getApplicationsDueForFollowUp();
```

### Cold Outreach

```typescript
import { coldOutreachService } from '@/services/cold-outreach-service';

// Generate cold email
const email = await coldOutreachService.generateColdEmail(
  'John Doe',          // recruiterName
  'Google',            // companyName
  'Senior Engineer',   // position
  '5 years in distributed systems',
  ['Go', 'Rust', 'Kubernetes'],
  { onToken: (token) => console.log(token) }
);

// Schedule message
await coldOutreachService.scheduleMessage(messageId, new Date(Date.now() + 3600000));
```

### Follow-ups

```typescript
import { followupService } from '@/services/followup-service';

// Schedule follow-up
await followupService.scheduleFollowUp(
  applicationId,
  3,           // days since application
  'template_1', // template ID
  'Day 3 Check-in'
);

// Get pending
const pending = await followupService.getPendingFollowUps();

// Send
await followupService.sendFollowUp(followupId);
```

### Contacts

```typescript
import { contactService } from '@/services/contact-service';

// Create contact
await contactService.createContact({
  name: 'John Doe',
  email: 'john@google.com',
  company: 'Google',
  title: 'Hiring Manager'
});

// Search
const results = await contactService.searchContacts('Google');

// Add interaction
await contactService.addInteraction(contactId, {
  type: 'email',
  date: Date.now(),
  subject: 'Cold email sent',
  notes: 'Sent on morning, personalized'
});
```

### Label Analysis

```typescript
import { labelAnalysisService } from '@/services/label-analysis-service';

// Analyze single answer
const analysis = await labelAnalysisService.analyzeAnswer(
  'Why are you interested?',
  'I love your company culture...',
  jobDescription
);

console.log(analysis.score, analysis.feedback, analysis.suggestions);

// Analyze form
const formScore = await labelAnalysisService.analyzeForm(
  [
    { label: 'Why interested?', value: 'I love...' },
    { label: 'Why you?', value: '5 years experience...' }
  ],
  jobDescription,
  { onProgressUpdate: (progress) => console.log(progress) }
);
```

---

## Troubleshooting

### Issue: Applications not saving

**Check:**
- Chrome storage permissions enabled
- Storage not full (export and delete old apps)
- No console errors (F12 → Console tab)

### Issue: Cold emails not generating

**Check:**
- AI provider configured (Settings → AI Provider)
- API key set correctly
- Internet connection active
- Rate limits not exceeded

### Issue: Follow-ups not triggering

**Check:**
- Extension background script running
- Chrome background permissions granted
- Dates set correctly
- Check "Pending Follow-ups" tab

### Issue: Storage limit reached

**Solution:**
```
1. Go to ApplicationTracker
2. Click "Export All Applications"
3. Delete archived applications
4. Or split data across multiple files
```

---

## Best Practices

1. **Capture Recruiter Info**: Always add recruiter email/name when applying
2. **Regular Exports**: Weekly backup of applications (automated in v2)
3. **Timely Follow-ups**: Don't skip scheduled follow-ups
4. **Answer Analysis**: Use LabelAnalyzer on important applications
5. **Contact Tracking**: Log all interactions for better insights
6. **Custom Notes**: Add company-specific context for each app

---

## Future Enhancements

- [ ] Gmail integration for automatic email sending
- [ ] LinkedIn API for DM automation
- [ ] Calendar integration for follow-up scheduling
- [ ] Analytics dashboard (conversion rates, best templates)
- [ ] CRM integration (Salesforce, HubSpot, Pipedrive)
- [ ] Webhook support for external triggers
- [ ] Batch operations (bulk upload, bulk email)
- [ ] Team collaboration features

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review console logs (F12)
3. Export and review stored data
4. Check extension permissions

---

**Version**: 1.0.0  
**Last Updated**: 2025-02-21  
**Status**: Production Ready
