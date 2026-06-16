import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, X, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { isMobileDevice } from '@/lib/device/isIOSDevice';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const isPdfFile = async (file: File): Promise<boolean> => {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.pdf')) return true;
  if ((file.type || '').toLowerCase().includes('pdf')) return true;
  try {
    const headerBuf = await file.slice(0, 4).arrayBuffer();
    const header = new Uint8Array(headerBuf);
    return header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46;
  } catch {
    return false;
  }
};

const extractPdfText = async (buf: ArrayBuffer): Promise<string> => {
  const load = async (disableWorker: boolean) => {
    // pdfjs-dist v5: getDocument expects a fresh buffer each call (it transfers ownership)
    const task = pdfjsLib.getDocument({ data: buf.slice(0), disableWorker });
    const pdf = await task.promise;

    const shouldTruncate = disableWorker && pdf.numPages > 20;
    const maxPages = shouldTruncate ? 20 : pdf.numPages;
    if (shouldTruncate) {
      toast.message(`Large PDF detected (${pdf.numPages} pages). Extracting first ${maxPages} pages for stability.`);
    }

    let text = '';
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      // pdfjs-dist v5: `normalizeWhitespace` was removed; normalization is on by default
      // (opt out via `disableNormalization: true`). We keep default normalization.
      const content = await page.getTextContent();
      const items = (content.items as any[])
        .filter((it) => typeof it?.str === 'string' && it.str.length > 0)
        .map((it) => ({
          str: it.str as string,
          x: Array.isArray(it.transform) ? it.transform[4] : 0,
          y: Array.isArray(it.transform) ? it.transform[5] : 0,
          hasEOL: !!it.hasEOL,
        }));

      const byLine = new Map<number, { x: number; str: string }[]>();
      for (const it of items) {
        const yKey = Math.round(it.y);
        const arr = byLine.get(yKey) || [];
        arr.push({ x: it.x, str: it.str });
        byLine.set(yKey, arr);
      }

      const yKeys = Array.from(byLine.keys()).sort((a, b) => b - a);
      for (const y of yKeys) {
        const line = (byLine.get(y) || [])
          .sort((a, b) => a.x - b.x)
          .map((w) => w.str)
          .join(' ')
          .replace(/\s+/g, ' ');
        if (line.trim()) text += line + '\n';
      }

      text += '\n';
      // Cleanup page resources to avoid memory bloat on large PDFs
      try { (page as any).cleanup?.(); } catch { /* noop */ }
      await new Promise((r) => setTimeout(r, 0));
    }

    try { await (pdf as any).destroy?.(); } catch { /* noop */ }

    if (maxPages < pdf.numPages) {
      text += `\n[Note: Extracted ${maxPages}/${pdf.numPages} pages for stability]\n`;
    }

    return text.trim();
  };

  // Try worker first on every platform (much faster, better text extraction).
  // Fall back to no-worker on ANY failure — covers Cloudflare Pages worker-fetch
  // 404s, CSP blocks, and mobile WebView quirks.
  const preferNoWorker = isMobileDevice();
  const order = preferNoWorker ? [true, false] : [false, true];
  let lastErr: unknown;
  for (const disableWorker of order) {
    try {
      return await load(disableWorker);
    } catch (err) {
      lastErr = err;
      console.warn(`[pdf] extraction failed (disableWorker=${disableWorker}):`, err);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('PDF extraction failed');
};

class ScannedPdfError extends Error {
  constructor(msg: string) { super(msg); this.name = 'ScannedPdfError'; }
}

const isImageFile = (file: File): boolean => {
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  if (type.startsWith('image/')) return true;
  return /\.(png|jpe?g|webp|gif|heic|heif|bmp)$/i.test(name);
};

const extractImageText = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  const base64 = btoa(binary);
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const mime = file.type
    || (ext === 'png' ? 'image/png'
      : ext === 'webp' ? 'image/webp'
      : ext === 'gif' ? 'image/gif'
      : ext === 'heic' || ext === 'heif' ? 'image/heic'
      : ext === 'bmp' ? 'image/bmp'
      : 'image/jpeg');
  const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || 'https://api.legalcareai.com';
  const resp = await fetch(`${apiBase}/functions/v1/vision-extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64, mimeType: mime, fileName: file.name }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Image read failed (HTTP ${resp.status})`);
  }
  const json = await resp.json();
  return (json.combined || json.text || json.description || '').trim();
};

const extractFileText = async (file: File): Promise<string> => {
  const name = (file.name || '').toLowerCase();
  if (isImageFile(file)) {
    return await extractImageText(file);
  }
  if (await isPdfFile(file)) {
    const buf = await file.arrayBuffer();
    const text = await extractPdfText(buf);
    // Heuristic: a scanned (image-only) PDF has no extractable text layer.
    // <40 non-whitespace chars over the whole document is almost certainly scanned.
    const nonWs = text.replace(/\s+/g, '').length;
    if (nonWs < 40) {
      throw new ScannedPdfError(
        'This PDF appears to be scanned (image-only) with no text layer. ' +
        'Please use the manual text box below, or upload a text-based PDF / .docx / .txt file.'
      );
    }
    return text;
  }
  if (name.endsWith('.docx') || name.endsWith('.doc')) {
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return result.value.trim();
  }
  return (await file.text()).trim();
};

interface UploadedFile {
  name: string;
  content: string;
  size: number;
}

interface FileUploadProps {
  onSubmit: (content: string) => void;
  isLoading: boolean;
}

const FileUpload = ({ onSubmit, isLoading }: FileUploadProps) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [manualText, setManualText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    for (const file of Array.from(selectedFiles)) {
      if (file.size > 100 * 1024 * 1024) {
        toast.error(`"${file.name}" is too large (max 100MB per file)`);
        continue;
      }
      try {
        const text = await extractFileText(file);
        if (!text) {
          toast.error(`"${file.name}" appears empty or unreadable`);
          continue;
        }
        setFiles(prev => [...prev, { name: file.name, content: text, size: file.size }]);
      } catch (err) {
        console.error('File read error:', err);
        const msg = err instanceof Error ? err.message : String(err);
        if (err instanceof ScannedPdfError) {
          toast.error(msg, { duration: 8000 });
        } else if (/worker|fetch|network/i.test(msg)) {
          toast.error(
            `Failed to load PDF reader for "${file.name}". ` +
            `Check your internet, then retry — or paste the text manually below.`,
            { duration: 8000 }
          );
        } else if (/password|encrypted/i.test(msg)) {
          toast.error(`"${file.name}" is password-protected. Remove the password and try again.`);
        } else {
          toast.error(`Failed to read "${file.name}": ${msg.slice(0, 120)}`);
        }
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const allContent = [
      ...files.map(f => `--- Document: ${f.name} ---\n${f.content}`),
      manualText.trim() ? `--- Additional Notes ---\n${manualText}` : '',
    ].filter(Boolean).join('\n\n');

    if (!allContent.trim()) {
      toast.error('Please upload files or enter case details');
      return;
    }
    onSubmit(allContent);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
          <Scale className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">AI Courtroom</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Upload your legal case files to start a simulated court hearing with an AI Judge and AI Lawyers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload Case Documents</CardTitle>
          <CardDescription>Upload PDFs, legal notices, FIR copies, evidence files, or any supporting documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".txt,.md,.pdf,.doc,.docx,.rtf,.png,.jpg,.jpeg,.webp,.gif,.heic,.heif,.bmp,image/*"
            className="hidden"
            multiple
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-24 border-dashed border-2 hover:bg-muted/50"
          >
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Click to upload files (no limit)</span>
              <span className="text-xs text-muted-foreground/70">TXT, MD, PDF, DOC, DOCX, RTF</span>
            </div>
          </Button>

          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">{files.length} file(s) uploaded</p>
              <div className="grid gap-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">({formatSize(file.size)})</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeFile(i)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or add details manually</span></div>
          </div>

          <Textarea
            placeholder="Paste case details, FIR content, legal notices, or describe your case here..."
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            className="min-h-[120px] resize-none"
          />

          <Button onClick={handleSubmit} disabled={isLoading || (!files.length && !manualText.trim())} className="w-full" size="lg">
            {isLoading ? 'Analyzing Case...' : 'Start AI Courtroom'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default FileUpload;
