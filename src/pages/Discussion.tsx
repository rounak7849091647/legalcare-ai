import { useState } from 'react';
import PageLayout from '@/components/PageLayout';
import SEOHead from '@/components/SEOHead';
import FileUpload from '@/components/courtroom/FileUpload';
import CaseAnalysis from '@/components/courtroom/CaseAnalysis';
import CourtroomSimulation from '@/components/courtroom/CourtroomSimulation';
import Judgment from '@/components/courtroom/Judgment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

type Step = 'upload' | 'analysis' | 'courtroom' | 'judgment';

const Discussion = () => {
  const [step, setStep] = useState<Step>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [caseAnalysis, setCaseAnalysis] = useState<any>(null);
  const [userRole, setUserRole] = useState<'accused' | 'complainant'>('complainant');
  const [courtroomArgs, setCourtroomArgs] = useState<any[]>([]);
  const [judgment, setJudgment] = useState<string | null>(null);
  const [isJudging, setIsJudging] = useState(false);
  const { currentLanguage } = useLanguage();

  const langCode = currentLanguage.code;

  const handleAnalyze = async (content: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('courtroom-ai', {
        body: { action: 'analyze', documentContent: content, language: langCode }
      });
      if (error) throw error;
      setCaseAnalysis(data.analysis);
      setStep('analysis');
    } catch (err) {
      console.error('Analysis error:', err);
      toast.error('Failed to analyze case documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceed = (role: 'accused' | 'complainant') => {
    setUserRole(role);
    setStep('courtroom');
  };

  const handleCourtroomComplete = async (args: any[]) => {
    setCourtroomArgs(args);
    setStep('judgment');
    setIsJudging(true);
    try {
      const { data, error } = await supabase.functions.invoke('courtroom-ai', {
        body: { action: 'judgment', caseAnalysis, previousArguments: args, language: langCode }
      });
      if (error) throw error;
      setJudgment(data.judgment);
    } catch (err) {
      console.error('Judgment error:', err);
      toast.error('Failed to generate judgment');
    } finally {
      setIsJudging(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setCaseAnalysis(null);
    setCourtroomArgs([]);
    setJudgment(null);
    setIsJudging(false);
  };

  return (
    <PageLayout>
      <SEOHead
        title="AI Courtroom - Simulate Legal Hearings"
        description="Upload legal case files and simulate a court hearing with AI Judge and AI Lawyers."
        keywords="AI courtroom, legal simulation, court hearing, AI judge"
        canonicalUrl="/discussion"
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'AI Courtroom', url: '/discussion' },
        ]}
      />

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-center gap-1 mb-6">
          {(['upload', 'analysis', 'courtroom', 'judgment'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s ? 'bg-primary text-primary-foreground' :
                (['upload', 'analysis', 'courtroom', 'judgment'].indexOf(step) > i) ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                {i + 1}
              </div>
              {i < 3 && <div className={`w-8 h-0.5 ${(['upload', 'analysis', 'courtroom', 'judgment'].indexOf(step) > i) ? 'bg-primary/40' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {step === 'upload' && <FileUpload onSubmit={handleAnalyze} isLoading={isLoading} />}
        {step === 'analysis' && caseAnalysis && <CaseAnalysis analysis={caseAnalysis} onProceed={handleProceed} />}
        {step === 'courtroom' && caseAnalysis && (
          <CourtroomSimulation caseAnalysis={caseAnalysis} userRole={userRole} onComplete={handleCourtroomComplete} language={langCode} />
        )}
        {step === 'judgment' && (
          <Judgment judgment={judgment} isLoading={isJudging} caseTitle={caseAnalysis?.caseTitle || 'Case'} onReset={handleReset} />
        )}
      </div>
    </PageLayout>
  );
};

export default Discussion;
