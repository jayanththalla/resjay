import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input, Textarea, Card, CardContent } from './ui/index';
import { fileService } from '@/services/file-service';
import { Upload, Link, Code, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface ResumeUploadProps {
  onUpload: (content: string, fileName: string) => void;
  currentFileName?: string;
}

type UploadMode = 'file' | 'overleaf' | 'paste';

export function ResumeUpload({ onUpload, currentFileName }: ResumeUploadProps) {
  const [mode, setMode] = useState<UploadMode>('file');
  const [overleafUrl, setOverleafUrl] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setInfo('');

    try {
      const result = await fileService.handleResumeUpload(file);

      // Show info if the file was converted
      if (result.converted) {
        setInfo(result.conversionNote || 'File converted to text successfully.');
      }

      onUpload(result.content, result.fileName);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setInfo('');

    try {
      const result = await fileService.handleResumeUpload(file);
      if (result.converted) {
        setInfo(result.conversionNote || 'File converted successfully.');
      }
      onUpload(result.content, result.fileName);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOverleafFetch = async () => {
    if (!overleafUrl.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await fileService.fetchFromOverleaf(overleafUrl);
      onUpload(result.content, result.fileName);
      setOverleafUrl('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = () => {
    if (!pasteContent.trim()) return;
    try {
      const result = fileService.parsePastedContent(pasteContent);
      onUpload(result.content, result.fileName);
      setPasteContent('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const modes = [
    { id: 'file' as const, icon: Upload, label: 'Upload' },
    { id: 'overleaf' as const, icon: Link, label: 'Overleaf' },
    { id: 'paste' as const, icon: Code, label: 'Paste' },
  ];

  return (
    <div className="space-y-3">
      {/* Current file indicator */}
      {currentFileName && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="font-medium">{currentFileName}</span>
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setError(''); setInfo(''); }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === m.id
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <m.icon className="w-3.5 h-3.5" />
            {m.label}
          </button>
        ))}
      </div>

      {/* Upload area */}
      {mode === 'file' && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-primary bg-primary/10 scale-105'
              : 'border-border hover:border-primary/40 hover:bg-primary/5'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
          <p className="text-sm font-medium mb-1">
            {loading ? 'Processing...' : isDragging ? 'Drop to upload' : 'Drop your resume here'}
          </p>
          <p className="text-xs text-muted-foreground">
            or <span className="text-primary font-medium">click</span> to browse. Supports <strong>.pdf</strong>, <strong>.docx</strong>, <strong>.tex</strong>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.tex,.txt"
            onChange={handleFileUpload}
            disabled={loading}
            className="hidden"
          />
        </div>
      )}

      {mode === 'overleaf' && (
        <div className="space-y-2">
          <Input
            value={overleafUrl}
            onChange={(e) => setOverleafUrl(e.target.value)}
            placeholder="https://www.overleaf.com/read/XXXXX"
            className="text-xs"
          />
          <Button
            onClick={handleOverleafFetch}
            disabled={!overleafUrl.trim() || loading}
            size="sm"
            className="w-full"
          >
            {loading ? 'Fetching...' : 'Fetch from Overleaf'}
          </Button>
        </div>
      )}

      {mode === 'paste' && (
        <div className="space-y-2">
          <Textarea
            value={pasteContent}
            onChange={(e) => setPasteContent(e.target.value)}
            placeholder="Paste your resume content here (LaTeX, plain text, or any format)..."
            className="text-xs font-mono min-h-[120px]"
          />
          <Button
            onClick={handlePaste}
            disabled={!pasteContent.trim()}
            size="sm"
            className="w-full"
          >
            Use This Content
          </Button>
        </div>
      )}

      {/* Info message */}
      {info && (
        <div className="flex items-start gap-2 text-xs text-blue-500 bg-blue-500/10 px-3 py-2 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{info}</span>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
