// ResumeForge AI – Google Drive Service
// OAuth2 via chrome.identity, upload to "Resumes" folder

class GDriveService {
    private async getToken(): Promise<string> {
        return new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ interactive: true }, (token) => {
                if (chrome.runtime.lastError || !token) {
                    reject(new Error(chrome.runtime.lastError?.message || 'Auth failed'));
                } else {
                    resolve(token);
                }
            });
        });
    }

    // ─── Find or Create "Resumes" Folder ───────────────────────
    private async findOrCreateFolder(token: string): Promise<string> {
        // Search for existing folder
        const searchRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
                "name='Resumes' and mimeType='application/vnd.google-apps.folder' and trashed=false"
            )}&fields=files(id,name)`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const searchData = await searchRes.json();

        if (searchData.files?.length > 0) {
            return searchData.files[0].id;
        }

        // Create folder
        const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: 'Resumes',
                mimeType: 'application/vnd.google-apps.folder',
            }),
        });
        const folder = await createRes.json();
        return folder.id;
    }

    // ─── Upload PDF to GDrive ──────────────────────────────────
    async uploadResume(params: {
        pdfBlob: Blob;
        companyName: string;
        userName: string;
    }): Promise<{ fileId: string; webViewLink: string }> {
        const token = await this.getToken();
        const folderId = await this.findOrCreateFolder(token);

        const date = new Date().toISOString().split('T')[0];
        const fileName = `${params.companyName}_${params.userName}_Resume_${date}.pdf`;

        // Multipart upload
        const metadata = {
            name: fileName,
            parents: [folderId],
            mimeType: 'application/pdf',
        };

        const boundary = 'resumeforge_boundary_' + Date.now();
        const body =
            `--${boundary}\r\n` +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            `\r\n--${boundary}\r\n` +
            'Content-Type: application/pdf\r\n\r\n';

        const bodyEnd = `\r\n--${boundary}--`;

        // Combine into single body
        const bodyBlob = new Blob([body, params.pdfBlob, bodyEnd], {
            type: `multipart/related; boundary=${boundary}`,
        });

        const uploadRes = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: bodyBlob,
            }
        );

        if (!uploadRes.ok) {
            throw new Error(`GDrive upload failed: ${uploadRes.status}`);
        }

        return uploadRes.json();
    }

    // ─── Check Auth Status ─────────────────────────────────────
    async isAuthenticated(): Promise<boolean> {
        try {
            const token = await this.getToken();
            return !!token;
        } catch {
            return false;
        }
    }
}

export const gdriveService = new GDriveService();
