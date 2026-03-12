import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, X, Scale } from 'lucide-react';
import { toast } from 'sonner';

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
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`"${file.name}" is too large (max 5MB per file)`);
        continue;
      }
      try {
        const text = await file.text();
        setFiles(prev => [...prev, { name: file.name, content: text, size: file.size }]);
      } catch {
        toast.error(`Failed to read "${file.name}"`);
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
            accept=".txt,.md,.pdf,.doc,.docx,.rtf"
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
