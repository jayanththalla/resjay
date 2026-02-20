// ResumeForge AI – Knowledge Base Service
// GitHub API integration, LinkedIn data import, manual entry

import { storageService, type GitHubRepo, type LinkedInProfile } from './storage-service';

class KnowledgeBaseService {
    // ─── GitHub Import ─────────────────────────────────────────
    async importGitHubRepos(username: string): Promise<GitHubRepo[]> {
        if (!username) throw new Error('GitHub username is required');

        try {
            // Fetch public repos
            const response = await fetch(
                `https://api.github.com/users/${username}/repos?sort=updated&per_page=30&type=owner`,
                {
                    headers: { Accept: 'application/vnd.github.v3+json' },
                }
            );

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} – ${response.statusText}`);
            }

            const repos = await response.json();
            const processedRepos: GitHubRepo[] = [];

            for (const repo of repos) {
                if (repo.fork) continue; // skip forks

                let readme = '';
                try {
                    const readmeRes = await fetch(
                        `https://api.github.com/repos/${username}/${repo.name}/readme`,
                        { headers: { Accept: 'application/vnd.github.v3+json' } }
                    );
                    if (readmeRes.ok) {
                        const readmeData = await readmeRes.json();
                        readme = atob(readmeData.content || '').substring(0, 2000); // limit size
                    }
                } catch {
                    // README not available – fine
                }

                // Fetch languages
                let languages: string[] = [];
                try {
                    const langRes = await fetch(
                        `https://api.github.com/repos/${username}/${repo.name}/languages`,
                        { headers: { Accept: 'application/vnd.github.v3+json' } }
                    );
                    if (langRes.ok) {
                        const langData = await langRes.json();
                        languages = Object.keys(langData);
                    }
                } catch {
                    // Language fetch failed – fine
                }

                processedRepos.push({
                    name: repo.name,
                    description: repo.description || '',
                    language: repo.language || '',
                    languages,
                    url: repo.html_url,
                    stars: repo.stargazers_count || 0,
                    readme,
                });
            }

            // Save to storage
            await storageService.saveKnowledgeBase({ githubRepos: processedRepos });
            return processedRepos;
        } catch (error: any) {
            throw new Error(`Failed to import GitHub repos: ${error.message}`);
        }
    }

    // ─── LinkedIn Data Import (from exported JSON/CSV) ─────────
    async importLinkedInData(fileContent: string): Promise<LinkedInProfile> {
        try {
            // Try parsing as JSON first
            let data: any;
            try {
                data = JSON.parse(fileContent);
            } catch {
                // Try CSV-like parsing
                data = this._parseLinkedInCSV(fileContent);
            }

            const profile: LinkedInProfile = {
                name: data.name || data['First Name'] + ' ' + data['Last Name'] || '',
                headline: data.headline || data['Headline'] || '',
                summary: data.summary || data['Summary'] || '',
                experience: (data.experience || data.positions || []).map((exp: any) => ({
                    title: exp.title || exp['Title'] || '',
                    company: exp.company || exp.companyName || exp['Company Name'] || '',
                    location: exp.location || exp['Location'] || '',
                    startDate: exp.startDate || exp['Started On'] || '',
                    endDate: exp.endDate || exp['Finished On'] || 'Present',
                    description: exp.description || exp['Description'] || '',
                })),
                education: (data.education || []).map((edu: any) => ({
                    school: edu.school || edu.schoolName || edu['School Name'] || '',
                    degree: edu.degree || edu.degreeName || edu['Degree Name'] || '',
                    field: edu.field || edu.fieldOfStudy || edu['Field of Study'] || '',
                    startDate: edu.startDate || edu['Start Date'] || '',
                    endDate: edu.endDate || edu['End Date'] || '',
                })),
                skills: data.skills || data['Skills'] || [],
            };

            await storageService.saveKnowledgeBase({ linkedInData: profile });
            return profile;
        } catch (error: any) {
            throw new Error(`Failed to parse LinkedIn data: ${error.message}`);
        }
    }

    // ─── Manual Text Entry ─────────────────────────────────────
    async saveManualText(text: string): Promise<void> {
        await storageService.saveKnowledgeBase({ manualText: text });
    }

    // ─── Build Combined Knowledge Base Text ────────────────────
    async buildKnowledgeBaseText(): Promise<string> {
        const kb = await storageService.getKnowledgeBase();
        const parts: string[] = [];

        // GitHub repos
        if (kb.githubRepos.length > 0) {
            parts.push('## GitHub Projects');
            for (const repo of kb.githubRepos) {
                parts.push(`### ${repo.name}`);
                if (repo.description) parts.push(`Description: ${repo.description}`);
                if (repo.languages.length) parts.push(`Technologies: ${repo.languages.join(', ')}`);
                if (repo.stars > 0) parts.push(`Stars: ${repo.stars}`);
                if (repo.readme) parts.push(`README excerpt:\n${repo.readme.substring(0, 500)}`);
                parts.push('');
            }
        }

        // LinkedIn
        if (kb.linkedInData) {
            parts.push('## LinkedIn Profile');
            const li = kb.linkedInData;
            if (li.headline) parts.push(`Headline: ${li.headline}`);
            if (li.summary) parts.push(`Summary: ${li.summary}`);

            if (li.experience.length) {
                parts.push('\n### Experience');
                for (const exp of li.experience) {
                    parts.push(`- ${exp.title} at ${exp.company} (${exp.startDate} – ${exp.endDate})`);
                    if (exp.description) parts.push(`  ${exp.description}`);
                }
            }

            if (li.skills.length) {
                parts.push(`\nSkills: ${li.skills.join(', ')}`);
            }
            parts.push('');
        }

        // Manual text
        if (kb.manualText) {
            parts.push('## Additional Information');
            parts.push(kb.manualText);
        }

        return parts.join('\n');
    }

    // ─── Private Helpers ───────────────────────────────────────
    private _parseLinkedInCSV(csv: string): any {
        // Very basic CSV parser for LinkedIn exports
        const lines = csv.split('\n');
        if (lines.length < 2) return {};

        const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
        const values = lines[1].split(',').map((v) => v.trim().replace(/"/g, ''));

        const result: any = {};
        headers.forEach((header, i) => {
            result[header] = values[i] || '';
        });

        return result;
    }
}

export const knowledgeBaseService = new KnowledgeBaseService();
