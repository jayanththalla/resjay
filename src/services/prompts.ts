// ResumeForge AI – Prompt Templates
// Ported from Agentex and extended with chat, email, and autofill prompts

// ─── Resume Tailoring (Single-Pass) ──────────────────────────
export const LATEX_TAILORING_PROMPT = `You are an expert ATS resume tailor for software engineering roles. Optimize the resume to pass automated screening and secure interviews.

## Primary Objectives
1. **Precision Alignment**: Match JD requirements using keywords/metrics from both resume and knowledge base
2. **Strategic Project Replacement**: Replace existing projects with more relevant ones from the knowledge base when they use the same tech stack, demonstrate stronger metrics, or better align with responsibilities
3. **Content Preservation**: Maintain original resume structure/length while maximizing JD keyword density

## Project Replacement Protocol
1. Analyze JD for required technologies, key responsibilities, and industry-specific requirements
2. Evaluate each knowledge base project for relevance score (technology alignment, metrics, skill demonstration)
3. Replace when knowledge base project has ≥70% technology overlap with JD, stronger metrics, or better alignment

## Execution Rules
- Allowed tech adaptations: React ↔ Next.js, Python ↔ FastAPI, AWS ↔ GCP
- Forbidden: Cross-domain swaps (Frontend → Backend)
- XYZ format: \\resumeItem{\\textbf{<Keyword>} used to \\textbf{<Action>} \\emph{<Tech>} achieving \\textbf{<Metric>} via <Method>}
- Preserve section order, date ranges, bullet count, margins
- Modify ONLY text within \\resumeItem{} blocks
- Strict 1-page enforcement

## CRITICAL: Output ONLY the complete updated LaTeX code, nothing else.

Original Resume:
{originalLatex}

Job Description:
{jobDesc}

Knowledge Base:
{knowledgeBase}`;

// ─── Multi-Agent Prompts ─────────────────────────────────────
export const JOB_ANALYSIS_PROMPT = `Analyze the job description and knowledge base. Return ONLY a JSON object:
{
  "requiredTechnologies": ["tech1", ...],
  "relevantProjects": [{"projectName": "...", "technologies": [...], "relevanceScore": 0-100, "keyMetrics": [...]}],
  "keyMetrics": ["metric1", ...],
  "experienceRequirements": ["req1", ...],
  "optimizationTasks": [{"section": "projects|skills|experience", "task": "...", "priority": 1-5}]
}

Job Description:
{jobDesc}

Knowledge Base:
{knowledgeBase}`;

export const PROJECTS_OPTIMIZATION_PROMPT = `Optimize the projects section by replacing existing projects with more relevant ones from the knowledge base. ALWAYS REPLACE if the knowledge base has a project using the same tech stack as the JD.

Original Projects Section:
{originalProjects}

Job Description:
{jobDesc}

Relevant Projects: {analysisProjects}
Required Technologies: {requiredTechnologies}
Key Metrics: {keyMetrics}

Return ONLY the optimized projects section in LaTeX format.`;

export const SKILLS_ENHANCEMENT_PROMPT = `Enhance the skills section by adding relevant skills from the JD. Organize by category. Maintain LaTeX formatting.

Original Skills Section:
{originalSkills}

Job Description:
{jobDesc}

Required Technologies: {requiredTechnologies}

Return ONLY the enhanced skills section in LaTeX format.`;

export const EXPERIENCE_REFINEMENT_PROMPT = `Refine experience descriptions to align with job requirements. Use action verbs and metrics. Maintain LaTeX formatting.

Original Experience Section:
{originalExperience}

Job Description:
{jobDesc}

Experience Requirements: {experienceRequirements}
Required Technologies: {requiredTechnologies}
Key Metrics: {keyMetrics}

Return ONLY the refined experience section in LaTeX format.`;

export const SECTIONS_DRAFTING_PROMPT = `You are an expert resume writer. Rerank and rewrite the Projects, Skills, and Experience sections to align with the job description.
Return ONLY a JSON object with the following structure:
{
  "projects": "\\section{Projects}...",
  "skills": "\\section{Skills}...",
  "experience": "\\section{Experience}..."
}

Original Sections:
Projects: {originalProjects}
Skills: {originalSkills}
Experience: {originalExperience}

Job Description:
{jobDesc}

Analysis:
{analysisJSON}

Requirements:
- Use the analysis to guide your rewriting.
- Maintain LaTeX syntax exactly.
- Return ONLY valid JSON.
`;

export const FINAL_POLISH_PROMPT = `Combine all optimized sections into a cohesive resume. Ensure consistent formatting and ATS compatibility.

Original Resume:
{originalLatex}

Optimized Projects: {optimizedProjects}
Enhanced Skills: {enhancedSkills}
Refined Experience: {refinedExperience}

Job Description:
{jobDesc}

Return ONLY the complete LaTeX resume code.`;

// ─── Chat Conversation ──────────────────────────────────────
export const CHAT_SYSTEM_PROMPT = `You are ResumeForge AI, an expert resume tailoring assistant. You help users optimize their resumes for specific job descriptions.

You have access to the user's:
- Original LaTeX resume
- Job description they're targeting
- Knowledge base (GitHub projects, LinkedIn profile, manual entries)

When the user asks you to tailor their resume, modify their LaTeX code to better match the JD. When they ask to add keywords, incorporate them naturally. When they reference their GitHub projects, pull relevant details from the knowledge base.

Always respond in a helpful, concise manner. When providing modified LaTeX, wrap it in a \`\`\`latex code block. Explain what you changed and why.

Current Resume:
{resumeLatex}

Job Description:
{jobDescription}

Knowledge Base:
{knowledgeBase}`;

// ─── Cold Email Generation ───────────────────────────────────
export const COLD_EMAIL_PROMPT = `Generate a personalized cold email to a recruiter/hiring manager. The email should:
1. Be concise (3-4 paragraphs max)
2. Reference the specific role and company
3. Highlight 2-3 key qualifications from the resume that match the JD
4. Include a clear call to action
5. Be professional but personable

Recruiter/Company Info:
{recruiterInfo}

Job Description:
{jobDescription}

Candidate Resume Summary:
{resumeSummary}

Generate the email with Subject line and Body. Format:
Subject: [subject]

[email body]`;

export const COVER_LETTER_PROMPT = `Generate a tailored cover letter. It should:
1. Be 3-4 paragraphs
2. Open with enthusiasm for the specific role
3. Highlight relevant experience and projects
4. Show knowledge of the company
5. Close with a strong call to action

Job Description:
{jobDescription}

Resume:
{resumeLatex}

Knowledge Base:
{knowledgeBase}

Output the cover letter text only.`;

export const LINKEDIN_DM_PROMPT = `Generate a brief, professional LinkedIn connection/message to a recruiter. Keep it under 300 characters for InMail limits. Be personable and reference the specific role.

Recruiter Info:
{recruiterInfo}

Role:
{jobDescription}

Key Qualifications:
{resumeSummary}

Output the message text only.`;

// ─── Autofill Q&A (Question-Type Aware) ──────────────────────
export const AUTOFILL_ANSWER_PROMPT = `You are helping a job candidate fill out an application form. Answer the question below in first person, concisely and professionally.

## Question Type Guidance
Detect the question type and follow the appropriate style:

- **Motivation / Interest** ("Why this company?", "Why this role?"): Show genuine enthusiasm. Reference 1-2 specific things about the company/role from the JD. Connect to the candidate's background.
- **Fit / Qualifications** ("Why are you a good fit?", "What makes you qualified?"): Lead with the strongest matching skill. Cite 1-2 concrete metrics or achievements from the resume. Link directly to JD requirements.
- **Strengths** ("What are your strengths?", "Core competencies"): Pick 2-3 strengths that align with the role. Support each with a brief example.
- **Challenges / Weaknesses** ("Describe a challenge", "Area of improvement"): Use the STAR method briefly. Show growth and learning. Keep it positive.
- **Availability / Logistics** ("When can you start?", "Willing to relocate?"): Be direct and specific. Use data from the knowledge base if available.
- **Open-ended / Other** ("Anything else?", "Additional info"): Highlight 1-2 unique differentiators not covered elsewhere. Keep under 3 sentences.
- **Technical** ("Experience with X?", "Familiar with Y?"): Reference specific projects from the resume/knowledge base. Include metrics where possible.

## Rules
- Write in first person ("I have...", "My experience...")
- Keep answers between 50-200 words unless the question clearly needs less
- Sound natural and human — avoid "As an AI" or generic corporate language
- If the question is a simple yes/no, answer directly then add a brief supporting sentence
- Never fabricate experience — only reference what's in the resume/knowledge base

Question: {question}

Job Description:
{jobDescription}

Resume:
{resumeSummary}

Knowledge Base:
{knowledgeBase}

Provide ONLY the answer text.`;

// ─── Resume → Profile Extraction ─────────────────────────────
export const RESUME_PROFILE_EXTRACT_PROMPT = `Extract personal details from the following resume text. Return ONLY a valid JSON object with these fields (use empty string "" if not found):

{
  "fullName": "",
  "firstName": "",
  "lastName": "",
  "email": "",
  "phone": "",
  "linkedinUrl": "",
  "githubUrl": "",
  "portfolioUrl": "",
  "location": "",
  "city": "",
  "state": "",
  "country": "",
  "currentTitle": "",
  "university": "",
  "highestDegree": ""
}

Resume Text:
{resumeText}

Return ONLY the JSON object, nothing else.`;

// ─── Select Option Matching ──────────────────────────────────
export const SELECT_MATCH_PROMPT = `Given a user's profile value and a list of dropdown options, pick the BEST matching option. Return ONLY the exact option text that best matches.

Profile Value: {profileValue}
Field Label: {fieldLabel}
Available Options:
{options}

Rules:
- Return ONLY the exact text of the best matching option
- If no option matches well, return an empty string
- For ranges (e.g. "4-6 years"), pick the range that contains the profile value
- For yes/no fields, match accordingly

Best matching option:`;

