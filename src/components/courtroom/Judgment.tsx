import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Gavel, Download, RotateCcw, Loader2 } from 'lucide-react';

interface JudgmentProps {
  judgment: string | null;
  isLoading: boolean;
  caseTitle: string;
  onReset: () => void;
}

const Judgment = ({ judgment, isLoading, caseTitle, onReset }: JudgmentProps) => {
  const handleDownload = () => {
    if (!judgment) return;
    const header = `AI COURTROOM JUDGMENT\n${'='.repeat(40)}\nCase: ${caseTitle}\nDate: ${new Date().toLocaleDateString('en-IN')}\nNote: This is an AI-generated simulation for educational purposes only.\n${'='.repeat(40)}\n\n`;
    const blob = new Blob([header + judgment], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `judgment-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Gavel className="h-8 w-8 text-primary animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-lg font-semibold text-foreground">Judge is deliberating...</h3>
          <p className="text-sm text-muted-foreground">Reviewing all arguments and evidence</p>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!judgment) return null;

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <Gavel className="h-8 w-8 text-primary mx-auto" />
        <h2 className="text-xl font-bold text-foreground">Final Judgment</h2>
        <Badge variant="outline" className="text-xs">AI-Generated Simulation</Badge>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{caseTitle}</CardTitle>
          <p className="text-xs text-muted-foreground">Delivered on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{judgment}</p>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="p-3 rounded-lg bg-accent/50 border border-accent">
        <p className="text-xs text-accent-foreground">
          <strong>Disclaimer:</strong> This is an AI-generated courtroom simulation for educational and informational purposes only. It does not constitute legal advice. Please consult a qualified lawyer for actual legal matters.
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={handleDownload} className="flex-1">
          <Download className="mr-2 h-4 w-4" /> Download Judgment
        </Button>
        <Button onClick={onReset} className="flex-1">
          <RotateCcw className="mr-2 h-4 w-4" /> New Case
        </Button>
      </div>
    </div>
  );
};

export default Judgment;
