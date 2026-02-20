// ResumeForge AI – Autofill Service
// Field classification (keyword scoring) + AI answer generation for job application forms

import { storageService, type UserProfile } from './storage-service';
import { aiService } from './ai-service';
import { knowledgeBaseService } from './knowledge-base-service';

// ─── Types ──────────────────────────────────────────────────
export interface DetectedField {
    id: string;            // unique ID for this field instance
    elementId: string;     // DOM element id
    elementName: string;   // DOM element name attribute
    tagName: string;       // input, textarea, select
    inputType: string;     // text, email, tel, url, etc.
    label: string;         // resolved label text
    placeholder: string;
    required: boolean;
    currentValue: string;
    options?: string[];    // for <select> elements
    xpath: string;
    // Classification results
    category: FieldCategory;
    confidence: number;    // 0-1
    suggestedValue: string;
    aiGenerated: boolean;
    userEdited: boolean;
}

export type FieldCategory =
    | 'first_name' | 'last_name' | 'full_name'
    | 'email' | 'phone'
    | 'linkedin' | 'github' | 'portfolio' | 'website'
    | 'location' | 'city' | 'state' | 'zip' | 'country'
    | 'current_title' | 'experience_years'
    | 'degree' | 'university' | 'education'
    | 'salary' | 'visa' | 'work_authorization'
    | 'notice_period' | 'start_date' | 'relocate'
    | 'resume_upload' | 'cover_letter'
    | 'ai_question'   // open-ended / subjective
    | 'unknown';

// ─── Keyword Scoring Rules ──────────────────────────────────
interface ClassificationRule {
    category: FieldCategory;
    keywords: string[];
    antiKeywords?: string[];  // if these are present, don't match
    profileKey: keyof UserProfile | string;
    inputTypes?: string[];    // restrict to specific input types
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
    {
        category: 'first_name',
        keywords: ['first name', 'first_name', 'firstname', 'given name', 'fname'],
        antiKeywords: ['last', 'surname', 'company'],
        profileKey: 'firstName',
    },
    {
        category: 'last_name',
        keywords: ['last name', 'last_name', 'lastname', 'surname', 'family name', 'lname'],
        antiKeywords: ['first', 'given'],
        profileKey: 'lastName',
    },
    {
        category: 'full_name',
        keywords: ['full name', 'your name', 'candidate name', 'applicant name'],
        antiKeywords: ['company', 'employer', 'school'],
        profileKey: 'fullName',
    },
    {
        category: 'email',
        keywords: ['email', 'e-mail', 'email address'],
        antiKeywords: ['company', 'employer', 'recruiter', 'manager'],
        profileKey: 'email',
        inputTypes: ['email', 'text'],
    },
    {
        category: 'phone',
        keywords: ['phone', 'mobile', 'telephone', 'contact number', 'cell', 'tel'],
        profileKey: 'phone',
        inputTypes: ['tel', 'text', 'number'],
    },
    {
        category: 'linkedin',
        keywords: ['linkedin', 'linked in', 'linkedin url', 'linkedin profile'],
        profileKey: 'linkedinUrl',
    },
    {
        category: 'github',
        keywords: ['github', 'git hub', 'github url', 'github profile', 'github username'],
        profileKey: 'githubUrl',
    },
    {
        category: 'portfolio',
        keywords: ['portfolio', 'personal site', 'personal website', 'portfolio url'],
        antiKeywords: ['company'],
        profileKey: 'portfolioUrl',
    },
    {
        category: 'website',
        keywords: ['website', 'web site', 'url', 'homepage'],
        antiKeywords: ['company', 'employer'],
        profileKey: 'portfolioUrl',
        inputTypes: ['url', 'text'],
    },
    {
        category: 'location',
        keywords: ['location', 'address', 'current location', 'city, state'],
        profileKey: 'location',
    },
    {
        category: 'city',
        keywords: ['city', 'town'],
        antiKeywords: ['company', 'employer'],
        profileKey: 'city',
    },
    {
        category: 'state',
        keywords: ['state', 'province', 'region'],
        antiKeywords: ['country', 'company'],
        profileKey: 'state',
    },
    {
        category: 'zip',
        keywords: ['zip', 'postal', 'zip code', 'postal code', 'pincode'],
        profileKey: 'zipCode',
    },
    {
        category: 'country',
        keywords: ['country', 'nation'],
        profileKey: 'country',
    },
    {
        category: 'current_title',
        keywords: ['current title', 'job title', 'current role', 'current position', 'designation'],
        antiKeywords: ['desired', 'applied'],
        profileKey: 'currentTitle',
    },
    {
        category: 'experience_years',
        keywords: ['years of experience', 'total experience', 'experience years', 'work experience', 'how many years'],
        profileKey: 'yearsOfExperience',
    },
    {
        category: 'degree',
        keywords: ['degree', 'highest degree', 'education level', 'qualification'],
        profileKey: 'highestDegree',
    },
    {
        category: 'university',
        keywords: ['university', 'college', 'school', 'institution', 'alma mater'],
        antiKeywords: ['high school'],
        profileKey: 'university',
    },
    {
        category: 'salary',
        keywords: ['salary', 'compensation', 'expected ctc', 'pay expectation', 'desired salary', 'salary expectation'],
        profileKey: 'salaryExpectation',
    },
    {
        category: 'visa',
        keywords: ['visa', 'visa status', 'sponsorship', 'immigration'],
        profileKey: 'visaStatus',
    },
    {
        category: 'work_authorization',
        keywords: ['work authorization', 'authorized to work', 'legally authorized', 'eligible to work', 'right to work'],
        profileKey: 'workAuthorization',
    },
    {
        category: 'notice_period',
        keywords: ['notice period', 'notice', 'joining time', 'availability'],
        antiKeywords: ['privacy'],
        profileKey: 'noticePeriod',
    },
    {
        category: 'start_date',
        keywords: ['start date', 'available date', 'earliest start', 'when can you start', 'available from'],
        profileKey: 'startDate',
    },
    {
        category: 'relocate',
        keywords: ['relocate', 'relocation', 'willing to relocate', 'open to relocate'],
        profileKey: 'willingToRelocate',
    },
    {
        category: 'resume_upload',
        keywords: ['resume', 'cv', 'curriculum vitae'],
        profileKey: '',
        inputTypes: ['file'],
    },
    {
        category: 'cover_letter',
        keywords: ['cover letter', 'cover_letter', 'coverletter'],
        profileKey: '',
    },
];

// ─── Autofill Service ───────────────────────────────────────
class AutofillService {
    // Classify a batch of detected form fields
    classifyFields(
        fields: Array<{
            id: string;
            elementId: string;
            elementName: string;
            tagName: string;
            inputType: string;
            label: string;
            placeholder: string;
            required: boolean;
            currentValue: string;
            options?: string[];
            xpath: string;
        }>,
        userProfile: UserProfile
    ): DetectedField[] {
        return fields.map((field) => {
            const result = this._classifySingleField(field, userProfile);
            return {
                ...field,
                category: result.category,
                confidence: result.confidence,
                suggestedValue: result.value,
                aiGenerated: result.category === 'ai_question',
                userEdited: false,
            };
        });
    }

    // Map direct fields to profile values
    mapDirectValues(
        fields: DetectedField[],
        profile: UserProfile
    ): DetectedField[] {
        return fields.map((field) => {
            if (field.category === 'ai_question' || field.category === 'unknown') {
                return field;
            }

            const rule = CLASSIFICATION_RULES.find((r) => r.category === field.category);
            if (rule && rule.profileKey) {
                const key = rule.profileKey as keyof UserProfile;
                const value = profile[key];
                if (typeof value === 'string' && value.trim()) {
                    return { ...field, suggestedValue: value };
                }
            }

            // Also try name-based matching as fallback
            if (field.category === 'full_name' && !field.suggestedValue) {
                const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
                if (name.trim()) return { ...field, suggestedValue: name };
            }

            return field;
        });
    }

    // Generate AI answers for open-ended questions
    async generateAIAnswers(
        fields: DetectedField[],
        jobDescription: string,
        resumeContent: string
    ): Promise<DetectedField[]> {
        const questionFields = fields.filter(
            (f) => f.category === 'ai_question' && !f.userEdited
        );

        if (questionFields.length === 0) return fields;

        // Build knowledge base
        const knowledgeBase = await knowledgeBaseService.buildKnowledgeBaseText();

        // Generate answers for each question sequentially to avoid rate limits
        const answers: Array<{ id: string; answer: string }> = [];

        for (const field of questionFields) {
            const question = field.label || field.placeholder || 'Unknown question';
            try {
                const answer = await aiService.generateAutofillAnswer(
                    question,
                    jobDescription,
                    resumeContent,
                    knowledgeBase
                );
                answers.push({ id: field.id, answer: answer.trim() });

                // Add delay to avoid rate limits (RPM)
                await new Promise((r) => setTimeout(r, 2000));
            } catch (error) {
                console.error(`[ResumeForge] AI answer failed for "${question}":`, error);
                answers.push({ id: field.id, answer: '' });
            }
        }

        // Merge answers back into fields
        const answerMap = new Map<string, string>();
        for (const result of answers) {
            if (result.answer) {
                answerMap.set(result.id, result.answer);
            }
        }

        return fields.map((field) => {
            const answer = answerMap.get(field.id);
            if (answer) {
                return { ...field, suggestedValue: answer, aiGenerated: true };
            }
            return field;
        });
    }

    // Match <select> dropdown options using AI when exact match fails
    async matchSelectOptions(
        fields: DetectedField[]
    ): Promise<DetectedField[]> {
        const selectFields = fields.filter(
            (f) =>
                f.tagName === 'select' &&
                f.options &&
                f.options.length > 0 &&
                f.suggestedValue &&
                !f.options.includes(f.suggestedValue)
        );

        if (selectFields.length === 0) return fields;

        const matches: Array<{ id: string; matched: string }> = [];

        for (const field of selectFields) {
            try {
                const matched = await aiService.matchSelectOption(
                    field.suggestedValue,
                    field.label,
                    field.options!
                );
                matches.push({ id: field.id, matched });

                // Add delay to avoid rate limits
                await new Promise((r) => setTimeout(r, 2000));
            } catch {
                matches.push({ id: field.id, matched: '' });
            }
        }

        const matchMap = new Map<string, string>();
        for (const result of matches) {
            if (result.matched) {
                matchMap.set(result.id, result.matched);
            }
        }

        return fields.map((field) => {
            const matched = matchMap.get(field.id);
            if (matched) {
                return { ...field, suggestedValue: matched };
            }
            return field;
        });
    }

    // Full pipeline: classify → map direct → match selects → generate AI answers
    async processFields(
        rawFields: Array<{
            id: string;
            elementId: string;
            elementName: string;
            tagName: string;
            inputType: string;
            label: string;
            placeholder: string;
            required: boolean;
            currentValue: string;
            options?: string[];
            xpath: string;
        }>,
        jobDescription: string,
        resumeContent: string
    ): Promise<DetectedField[]> {
        const profile = await storageService.getUserProfile();

        // 1. Classify
        let fields = this.classifyFields(rawFields, profile);

        // 2. Map direct values from profile
        fields = this.mapDirectValues(fields, profile);

        // 3. AI-match <select> dropdowns where exact match fails
        fields = await this.matchSelectOptions(fields);

        // 4. Generate AI answers for open-ended questions
        if (jobDescription || resumeContent) {
            fields = await this.generateAIAnswers(fields, jobDescription, resumeContent);
        }

        return fields;
    }

    // ─── Private: Single Field Classification ────────────────
    private _classifySingleField(
        field: {
            elementId: string;
            elementName: string;
            tagName: string;
            inputType: string;
            label: string;
            placeholder: string;
            options?: string[];
        },
        profile: UserProfile
    ): { category: FieldCategory; confidence: number; value: string } {
        // Combine all text signals into one searchable string
        const signals = [
            field.label,
            field.placeholder,
            field.elementId,
            field.elementName,
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        if (!signals.trim()) {
            return { category: 'unknown', confidence: 0, value: '' };
        }

        // Input type shortcuts
        if (field.inputType === 'email') {
            return { category: 'email', confidence: 0.95, value: profile.email };
        }
        if (field.inputType === 'tel') {
            return { category: 'phone', confidence: 0.95, value: profile.phone };
        }
        if (field.inputType === 'url') {
            // Determine which URL type
            if (signals.includes('linkedin')) {
                return { category: 'linkedin', confidence: 0.9, value: profile.linkedinUrl };
            }
            if (signals.includes('github')) {
                return { category: 'github', confidence: 0.9, value: profile.githubUrl };
            }
            return { category: 'website', confidence: 0.7, value: profile.portfolioUrl };
        }
        if (field.inputType === 'file') {
            if (signals.includes('cover')) {
                return { category: 'cover_letter', confidence: 0.8, value: '' };
            }
            return { category: 'resume_upload', confidence: 0.8, value: '' };
        }

        // Score each rule
        let bestMatch: { category: FieldCategory; confidence: number; value: string } = {
            category: 'unknown',
            confidence: 0,
            value: '',
        };

        for (const rule of CLASSIFICATION_RULES) {
            // Check anti-keywords first
            if (rule.antiKeywords?.some((ak) => signals.includes(ak))) {
                continue;
            }

            // Check input type restrictions
            if (rule.inputTypes && !rule.inputTypes.includes(field.inputType) && field.inputType !== '') {
                continue;
            }

            // Score keywords
            let score = 0;
            let matchCount = 0;
            for (const keyword of rule.keywords) {
                if (signals.includes(keyword)) {
                    // Longer keyword matches score higher (more specific)
                    score += keyword.split(' ').length;
                    matchCount++;
                }
            }

            if (matchCount > 0) {
                // Normalize confidence: more matches + longer keywords = higher confidence
                const confidence = Math.min(0.95, 0.5 + (score / (rule.keywords.length * 2)) * 0.45);

                if (confidence > bestMatch.confidence) {
                    const profileValue = rule.profileKey
                        ? (profile[rule.profileKey as keyof UserProfile] as string) || ''
                        : '';
                    bestMatch = { category: rule.category, confidence, value: profileValue };
                }
            }
        }

        // If no match found and it's a textarea → likely an open-ended question
        if (bestMatch.category === 'unknown') {
            if (field.tagName === 'textarea' || signals.length > 40) {
                // Long labels often indicate questions
                const questionIndicators = [
                    'why', 'how', 'what', 'describe', 'tell us', 'explain',
                    'interest', 'motivation', 'fit', 'strength', 'weakness',
                    'experience with', 'familiar with', 'comfortable with',
                    'additional information', 'anything else', 'comments', 'notes',
                    'reason for', 'about yourself', 'cover letter',
                ];
                const isQuestion = questionIndicators.some((q) => signals.includes(q));

                if (isQuestion || field.tagName === 'textarea') {
                    return { category: 'ai_question', confidence: 0.7, value: '' };
                }
            }
        }

        return bestMatch;
    }
}

export const autofillService = new AutofillService();
