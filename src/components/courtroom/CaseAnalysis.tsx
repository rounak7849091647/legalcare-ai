import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Scale, Users, FileSearch, BookOpen, ArrowRight } from 'lucide-react';

interface CaseAnalysisData {
  caseType: string;
  caseTitle: string;
  parties: { complainant: string; accused: string };
  keyIssues: string[];
  evidenceSummary: string[];
  claims: string[];
  counterClaims: string[];
  applicableLaws: string[];
  caseSummary: string;
}

interface CaseAnalysisProps {
  analysis: CaseAnalysisData;
  onProceed: (role: 'accused' | 'complainant') => void;
}

const CaseAnalysis = ({ analysis, onProceed }: CaseAnalysisProps) => {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-foreground">Case Analysis Complete</h2>
        <p className="text-sm text-muted-foreground">AI has analyzed your documents and prepared the case</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              {analysis.caseTitle}
            </CardTitle>
            <Badge variant="secondary">{analysis.caseType}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{analysis.caseSummary}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" /> Parties
              </h4>
              <div className="text-sm space-y-1 pl-5">
                <p><span className="text-muted-foreground">Complainant:</span> {analysis.parties.complainant}</p>
                <p><span className="text-muted-foreground">Accused:</span> {analysis.parties.accused}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-primary" /> Applicable Laws
              </h4>
              <div className="flex flex-wrap gap-1.5 pl-5">
                {analysis.applicableLaws.slice(0, 6).map((law, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{law}</Badge>
                ))}
              </div>
            </div>
          </div>

          {analysis.keyIssues.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <FileSearch className="h-4 w-4 text-primary" /> Key Legal Issues
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 pl-5">
                {analysis.keyIssues.map((issue, i) => (
                  <li key={i}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.evidenceSummary.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Evidence Summary</h4>
              <ul className="text-sm text-muted-foreground space-y-1 pl-5">
                {analysis.evidenceSummary.slice(0, 5).map((ev, i) => (
                  <li key={i}>• {ev}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Select Your Role</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">You will argue your own case as your own lawyer. The AI will provide a Judge and an opposing lawyer.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-1" onClick={() => onProceed('complainant')}>
              <span className="font-semibold">I am the Complainant</span>
              <span className="text-xs text-muted-foreground">You argue your case • AI Defense Lawyer opposes you</span>
              <ArrowRight className="h-4 w-4 mt-1" />
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-1" onClick={() => onProceed('accused')}>
              <span className="font-semibold">I am the Accused</span>
              <span className="text-xs text-muted-foreground">You defend yourself • AI Prosecution Lawyer opposes you</span>
              <ArrowRight className="h-4 w-4 mt-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CaseAnalysis;
