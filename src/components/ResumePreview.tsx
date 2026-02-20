import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { fileService } from '@/services/file-service';
import { gdriveService } from '@/services/gdrive-service';
import { cn } from '@/lib/utils';
import {
  Code,
  FileText,
  Download,
  CloudUpload,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';

interface ResumePreviewProps {
  originalLatex: string;
  tailoredLatex: string;
  companyName?: string;
  userName?: string;
}

type ViewMode = 'raw' | 'compiled';
type ContentMode = 'original' | 'tailored' | 'diff';

export function ResumePreview({
  originalLatex,
  tailoredLatex,
  companyName = 'Company',
  userName = 'Resume',
}: ResumePreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('raw');
  const [contentMode, setContentMode] = useState<ContentMode>(tailoredLatex ? 'tailored' : 'original');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeLatex = contentMode === 'original' ? originalLatex : tailoredLatex;

  // Compile PDF when switching to compiled view
  useEffect(() => {
    if (viewMode === 'compiled' && activeLatex) {
      compilePdf();
    }
  }, [viewMode, contentMode]);

  const compilePdf = async () => {
    if (!activeLatex) return;
    setPdfLoading(true);
    setPdfError('');
    try {
      const blob = await fileService.compileToPdf(activeLatex);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err: any) {
      setPdfError(err.message);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownload = async (format: 'tex' | 'pdf' | 'docx') => {
    setDownloading(format);
    try {
      const date = new Date().toISOString().split('T')[0];
      const baseName = `${companyName}_${userName}_Resume_${date}`;
      
      switch (format) {
        case 'tex':
          fileService.downloadLatex(activeLatex, `${baseName}.tex`);
          break;
        case 'pdf':
          await fileService.downloadAsPdf(activeLatex, `${baseName}.pdf`);
          break;
        case 'docx':
          await fileService.downloadAsDocx(activeLatex, `${baseName}.docx`);
          break;
      }
    } catch (err: any) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(null);
    }
  };

  const handleGDriveUpload = async () => {
    setDownloading('gdrive');
    try {
      const pdfBlob = await fileService.compileToPdf(activeLatex);
      const result = await gdriveService.uploadResume({
        pdfBlob,
        companyName,
        userName,
      });
      // Could show a toast here
      window.open(result.webViewLink, '_blank');
    } catch (err: any) {
      console.error('GDrive upload failed:', err);
    } finally {
      setDownloading(null);
    }
  };

  if (!originalLatex && !tailoredLatex) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
        <Eye className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">Upload a resume to see the preview</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col h-full',
        isFullscreen && 'fixed inset-0 z-50 bg-background'
      )}
    >
      {/* Header Controls */}
      <div className="flex items-center justify-between gap-2 p-3 border-b border-border">
        <div className="flex gap-1">
          {/* Content toggle */}
          {tailoredLatex && (
            <div className="flex gap-1 p-0.5 rounded-md bg-muted">
              <button
                onClick={() => setContentMode('original')}
                className={cn(
                  'px-2 py-1 rounded text-xs font-medium transition-all',
                  contentMode === 'original' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                )}
              >
                Original
              </button>
              <button
                onClick={() => setContentMode('tailored')}
                className={cn(
                  'px-2 py-1 rounded text-xs font-medium transition-all',
                  contentMode === 'tailored' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                )}
              >
                Tailored
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* View mode */}
          <div className="flex gap-1 p-0.5 rounded-md bg-muted">
            <button
              onClick={() => setViewMode('raw')}
              className={cn(
                'p-1.5 rounded text-xs transition-all',
                viewMode === 'raw' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              )}
              title="Raw LaTeX"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('compiled')}
              className={cn(
                'p-1.5 rounded text-xs transition-all',
                viewMode === 'compiled' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              )}
              title="Compiled PDF"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'raw' ? (
          <pre className="p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
            {activeLatex}
          </pre>
        ) : (
          <div className="h-full">
            {pdfLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Compiling LaTeX...</p>
                </div>
              </div>
            ) : pdfError ? (
              <div className="flex items-center justify-center h-full p-4">
                <div className="text-center">
                  <p className="text-xs text-destructive mb-2">{pdfError}</p>
                  <Button size="sm" variant="outline" onClick={compilePdf}>
                    Retry
                  </Button>
                </div>
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            ) : null}
          </div>
        )}
      </div>

      {/* Download Bar */}
      <div className="flex items-center gap-2 p-3 border-t border-border">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleDownload('tex')}
          disabled={!!downloading}
          className="flex-1 text-xs"
        >
          {downloading === 'tex' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Code className="w-3 h-3" />}
          .tex
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleDownload('pdf')}
          disabled={!!downloading}
          className="flex-1 text-xs"
        >
          {downloading === 'pdf' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
          PDF
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleDownload('docx')}
          disabled={!!downloading}
          className="flex-1 text-xs"
        >
          {downloading === 'docx' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />}
          DOCX
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleGDriveUpload}
          disabled={!!downloading}
          className="text-xs"
          title="Upload to Google Drive"
        >
          {downloading === 'gdrive' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudUpload className="w-3 h-3" />}
        </Button>
      </div>
    </div>
  );
}
