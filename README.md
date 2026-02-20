# 🚀 ResumeForge AI

**AI-Powered Resume Tailor & Job Application Automator** — A privacy-first Chrome extension that uses Google Gemini to tailor your LaTeX resume to any job description, generate cold emails, cover letters, LinkedIn DMs, and autofill job application forms.

---

## ✨ Features

### 🎯 Smart Resume Tailoring
- **One-Click Tailor** — Paste a job description and get an optimized resume instantly
- **Multi-Agent Mode** — 5-step AI pipeline (Job Analysis → Projects → Skills → Experience → Polish) for deeper optimization
- **Chat Interface** — Conversational AI to refine specific sections, ask for suggestions, or iterate on your resume
- **LaTeX Preservation** — Maintains your formatting perfectly, outputs valid LaTeX

### 📧 Outreach Generation
- **Cold Emails** — Generate personalized recruiter emails with one click
- **Cover Letters** — Tailored cover letters matching the job description
- **LinkedIn DMs** — Short, professional messages ready to send
- **Direct Send** — Open Gmail, Outlook, or LinkedIn compose with pre-filled content

### 📝 Job Form Autofill
- **Smart Detection** — Recognizes form fields on LinkedIn, Indeed, Greenhouse, Lever, Workday, iCIMS
- **AI-Powered Answers** — Generates responses for custom application questions
- **One-Click Fill** — Auto-populates name, email, phone, portfolio links

### 🧠 Knowledge Base
- **GitHub Import** — Pull repos, READMEs, and project descriptions to enrich your resume
- **LinkedIn Import** — Parse your LinkedIn data export (JSON/CSV) for work history
- **Manual Entries** — Add skills, achievements, or context the AI should know about

### 📁 Export & Storage
- **Multi-Format Download** — .tex, PDF (via LaTeX server), DOCX
- **Google Drive Upload** — Auto-creates a "Resumes" folder with `Company_Role_Date` naming
- **Resume History** — Track all tailored versions locally

### 🔒 Privacy First
- **100% Local Processing** — Your data never leaves your browser
- **Your API Key** — Uses your own Gemini API key, no intermediary servers
- **No Tracking** — Zero analytics, telemetry, or data collection

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 18 + TypeScript |
| **Build** | Vite 6 (multi-entry) |
| **Styling** | Tailwind CSS 3 + shadcn/ui patterns |
| **AI** | Google Gemini API (`@google/generative-ai`) |
| **Extension** | Chrome Manifest V3 |
| **Export** | `docx` (DOCX), LaTeX server (PDF) |
| **Auth** | Chrome Identity API (OAuth2 for Google Drive) |

---

## 📦 Installation

### From Source (Development)

```bash
# 1. Clone the repository
git clone https://github.com/your-username/resumeforge-ai.git
cd resumeforge-ai/resumeforge-extension

# 2. Install dependencies
npm install

# 3. Build the extension
npm run build

# 4. Load in Chrome
#    → Open chrome://extensions
#    → Enable "Developer mode" (top-right)
#    → Click "Load unpacked"
#    → Select the `dist/` folder
```

### Development Mode

```bash
# Start Vite dev server (for hot-reload during development)
npm run dev
```

> **Note:** Hot-reload works for the popup/sidepanel UI. Background script and content script changes require a full rebuild (`npm run build`) and extension reload.

---

## 🚀 Getting Started

1. **Get a Gemini API Key** — Visit [Google AI Studio](https://aistudio.google.com/apikey) to create a free API key
2. **Install the Extension** — Follow the installation steps above
3. **Enter Your API Key** — Click the extension icon and paste your key on the landing page
4. **Upload Your Resume** — Upload a `.tex` file, paste LaTeX, or fetch from Overleaf
5. **Paste a Job Description** — Copy any job posting and paste it in
6. **Click "Quick Tailor"** — Get your optimized resume in seconds!

---

## 🏗️ Project Structure

```
resumeforge-extension/
├── public/
│   ├── manifest.json              # Chrome MV3 manifest
│   └── icons/                     # Extension icons (16, 48, 128px)
├── src/
│   ├── index.css                  # Design system + Tailwind
│   ├── popup.tsx                  # Popup entry point
│   ├── sidepanel.tsx              # Side panel entry point
│   ├── background.ts             # Service worker
│   ├── content-script.ts         # Job site autofill
│   ├── lib/utils.ts              # Utilities (cn, generateId, etc.)
│   ├── services/
│   │   ├── ai-service.ts         # Gemini AI integration
│   │   ├── storage-service.ts    # chrome.storage wrapper
│   │   ├── file-service.ts       # File I/O (LaTeX, DOCX, PDF)
│   │   ├── prompts.ts            # All AI prompt templates
│   │   ├── knowledge-base-service.ts  # GitHub/LinkedIn import
│   │   ├── email-service.ts      # Email compose helpers
│   │   └── gdrive-service.ts     # Google Drive upload
│   └── components/
│       ├── App.tsx                # Main shell
│       ├── LandingPage.tsx        # Onboarding + API key
│       ├── ChatInterface.tsx      # AI chat interface
│       ├── ResumeUpload.tsx       # Resume input (3 modes)
│       ├── ResumePreview.tsx      # Side-by-side preview
│       ├── EmailTab.tsx           # Outreach generation
│       ├── SettingsPanel.tsx      # Settings & knowledge base
│       └── ui/                    # Reusable UI primitives
├── vite.config.ts                 # Multi-entry Vite build
├── tailwind.config.js             # Custom theme
├── tsconfig.json                  # TypeScript config
└── package.json
```

---

## ⚙️ Configuration

### Manifest Permissions

| Permission | Purpose |
|---|---|
| `activeTab` | Read job descriptions from active tab |
| `sidePanel` | Side panel UI |
| `storage` | Local data persistence |
| `identity` | Google OAuth2 for Drive upload |
| `contextMenus` | Right-click menu integration |
| `scripting` | Inject content scripts |
| `downloads` | Download generated files |

### Environment

- **Node.js** ≥ 18
- **Chrome** ≥ 116 (for Side Panel API)
- **Gemini API Key** — [Get one free](https://aistudio.google.com/apikey)

---

## 🔧 Build Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build → dist/
npm run preview  # Preview production build
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Credits

- Built on top of [Agentex](https://github.com/your-username/agentex) resume tailoring logic
- Powered by [Google Gemini](https://ai.google.dev/)
- UI components inspired by [shadcn/ui](https://ui.shadcn.com/)
