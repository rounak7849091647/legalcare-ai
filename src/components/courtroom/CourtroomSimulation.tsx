import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Gavel, UserX, UserCheck, Send, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Argument {
  speaker: string;
  phase: string;
  content: string;
  isUser?: boolean;
}

interface CourtroomSimulationProps {
  caseAnalysis: any;
  userRole: 'accused' | 'complainant';
  onComplete: (args: Argument[]) => void;
  language?: string;
}

// The structured hearing flow. 'user' type means the user must type their argument.
// 'ai' type means the AI generates it automatically.
type PhaseType = 'ai' | 'user';

interface Phase {
  key: string;
  label: string;
  type: PhaseType;
  speaker: string; // display speaker (for AI phases)
  description: string; // prompt shown to user on their turn
}

const getPhases = (userRole: 'accused' | 'complainant'): Phase[] => {
  const opponentLabel = userRole === 'complainant' ? 'Defense Lawyer' : 'Prosecution Lawyer';
  const userLabel = userRole === 'complainant' ? 'Prosecution' : 'Defense';

  return [
    { key: 'case_introduction', label: 'Case Introduction', type: 'ai', speaker: 'Judge', description: '' },
    { key: userRole === 'complainant' ? 'opening_prosecution' : 'opening_defense', label: `Opening Statement - You (${userLabel})`, type: 'user', speaker: 'You', description: 'Present your opening statement. Outline your case, key claims, and what you aim to prove.' },
    { key: userRole === 'complainant' ? 'opening_defense' : 'opening_prosecution', label: `Opening Statement - ${opponentLabel}`, type: 'ai', speaker: opponentLabel, description: '' },
    { key: 'evidence_presentation', label: 'Evidence Review', type: 'ai', speaker: 'Judge', description: '' },
    { key: userRole === 'complainant' ? 'prosecution_argument' : 'defense_argument', label: `Your Arguments (${userLabel})`, type: 'user', speaker: 'You', description: 'Present your main legal arguments. Cite relevant laws and connect evidence to your claims.' },
    { key: userRole === 'complainant' ? 'defense_argument' : 'prosecution_argument', label: `${opponentLabel} Arguments`, type: 'ai', speaker: opponentLabel, description: '' },
    { key: 'judge_questions', label: 'Judge Questions', type: 'ai', speaker: 'Judge', description: '' },
    { key: 'user_answer_judge', label: 'Your Response to Judge', type: 'user', speaker: 'You', description: "Answer the Judge's questions. Address the specific points raised clearly and with evidence." },
    { key: 'opponent_answer_judge', label: `${opponentLabel} Response to Judge`, type: 'ai', speaker: opponentLabel, description: '' },
    { key: userRole === 'complainant' ? 'closing_prosecution' : 'closing_defense', label: `Closing Statement - You (${userLabel})`, type: 'user', speaker: 'You', description: 'Deliver your closing statement. Summarize your strongest points and why you should prevail.' },
    { key: userRole === 'complainant' ? 'closing_defense' : 'closing_prosecution', label: `Closing Statement - ${opponentLabel}`, type: 'ai', speaker: opponentLabel, description: '' },
  ];
};

const speakerConfig: Record<string, { icon: typeof Gavel; color: string; bg: string }> = {
  Judge: { icon: Gavel, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  'Prosecution Lawyer': { icon: UserX, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
  'Defense Lawyer': { icon: UserCheck, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' },
  'You': { icon: MessageSquare, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
};

const CourtroomSimulation = ({ caseAnalysis, userRole, onComplete, language }: CourtroomSimulationProps) => {
  const phases = getPhases(userRole);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [arguments_, setArguments] = useState<Argument[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userMessage, setUserMessage] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [extraRounds, setExtraRounds] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalPhases = phases.length;
  const progress = Math.min((currentPhaseIndex / totalPhases) * 100, 100);
  const currentPhase = currentPhaseIndex < totalPhases ? phases[currentPhaseIndex] : null;
  const isUserTurn = currentPhase?.type === 'user';

  const opponentLabel = userRole === 'complainant' ? 'Defense Lawyer' : 'Prosecution Lawyer';

  const runAIPhase = async (phaseIndex: number) => {
    if (phaseIndex >= phases.length) {
      setIsComplete(true);
      return;
    }
    const phase = phases[phaseIndex];
    if (phase.type === 'user') return; // Don't auto-run user phases

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('courtroom-ai', {
        body: {
          action: 'simulate_phase',
          caseAnalysis,
          phase: phase.key,
          previousArguments: arguments_,
          userRole,
          language,
        }
      });
      if (error) throw error;

      const newArg: Argument = {
        speaker: data.speaker,
        phase: phase.label,
        content: data.content,
      };
      setArguments(prev => [...prev, newArg]);
      setCurrentPhaseIndex(phaseIndex + 1);
    } catch (err) {
      console.error('Phase error:', err);
      toast.error('Failed to process courtroom phase');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUserSubmit = async () => {
    if (!userMessage.trim() || !currentPhase) return;

    const userArg: Argument = {
      speaker: 'You',
      phase: currentPhase.label,
      content: userMessage.trim(),
      isUser: true,
    };
    setArguments(prev => [...prev, userArg]);
    setUserMessage('');
    setCurrentPhaseIndex(prev => prev + 1);
  };

  // Add an extra round: user argues again, then opponent rebuts, then judge comments
  const handleAddRound = () => {
    const roundNum = extraRounds + 1;
    setExtraRounds(roundNum);

    // We don't modify the phases array. Instead we handle extra rounds as a special flow.
    setIsProcessing(false);
    setIsComplete(false);
    // We'll use a special state to handle this
    setExtraRoundState('user_input');
  };

  const [extraRoundState, setExtraRoundState] = useState<'none' | 'user_input' | 'processing'>('none');

  const handleExtraRoundSubmit = async () => {
    if (!userMessage.trim()) return;
    const roundNum = extraRounds;

    const userArg: Argument = {
      speaker: 'You',
      phase: `Additional Argument #${roundNum}`,
      content: userMessage.trim(),
      isUser: true,
    };
    setArguments(prev => [...prev, userArg]);
    setUserMessage('');
    setExtraRoundState('processing');

    try {
      // Get opponent rebuttal
      const { data, error } = await supabase.functions.invoke('courtroom-ai', {
        body: {
          action: 'user_argument',
          caseAnalysis,
          previousArguments: [...arguments_, userArg],
          userRole,
          userMessage: userArg.content,
          language,
        }
      });
      if (error) throw error;

      const newArgs: Argument[] = data.responses.map((r: any) => ({
        speaker: r.speaker,
        phase: r.phase,
        content: r.content,
      }));
      setArguments(prev => [...prev, ...newArgs]);
    } catch (err) {
      console.error('Extra round error:', err);
      toast.error('Failed to process extra argument round');
    } finally {
      setExtraRoundState('none');
      setIsComplete(true);
    }
  };

  // Auto-run AI phases
  useEffect(() => {
    if (!isProcessing && currentPhaseIndex < phases.length && !isComplete && extraRoundState === 'none') {
      const phase = phases[currentPhaseIndex];
      if (phase.type === 'ai') {
        const timer = setTimeout(() => runAIPhase(currentPhaseIndex), 800);
        return () => clearTimeout(timer);
      }
    }
    if (currentPhaseIndex >= phases.length && !isComplete && extraRoundState === 'none') {
      setIsComplete(true);
    }
  }, [currentPhaseIndex, isProcessing, isComplete, extraRoundState]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [arguments_]);

  const showUserInput = (isUserTurn && !isProcessing && !isComplete) || extraRoundState === 'user_input';
  const isExtraRound = extraRoundState === 'user_input';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-foreground">⚖️ Courtroom in Session</h2>
        <p className="text-sm text-muted-foreground">
          {isComplete
            ? 'All phases complete — ready for judgment'
            : isUserTurn || isExtraRound
            ? '🎤 Your turn to speak'
            : `Phase ${Math.min(currentPhaseIndex + 1, totalPhases)} of ${totalPhases}`}
        </p>
      </div>

      <Progress value={progress} className="h-2" />

      {/* Courtroom participants — only 3: Judge, Opponent, You */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { role: 'Judge', sublabel: 'Neutral' },
          { role: opponentLabel, sublabel: 'AI Opponent' },
          { role: 'You', sublabel: userRole === 'complainant' ? 'Complainant (Your Lawyer)' : 'Accused (Your Lawyer)' },
        ].map(({ role, sublabel }) => {
          const config = speakerConfig[role] || speakerConfig.Judge;
          const Icon = config.icon;
          const isActive = (isUserTurn && role === 'You') ||
            (isExtraRound && role === 'You') ||
            (!isUserTurn && !isComplete && currentPhase && currentPhase.speaker === role);
          return (
            <div key={role} className={`p-3 rounded-lg border transition-all ${isActive ? config.bg + ' ring-2 ring-primary/30 scale-[1.02]' : 'bg-muted/30 border-border/50'}`}>
              <Icon className={`h-5 w-5 mx-auto mb-1 ${config.color}`} />
              <p className={`text-xs font-semibold ${config.color}`}>{role}</p>
              <p className="text-[10px] text-muted-foreground">{sublabel}</p>
            </div>
          );
        })}
      </div>

      {/* Proceedings */}
      <Card>
        <ScrollArea className="h-[420px] p-4" ref={scrollRef}>
          <div className="space-y-3">
            {arguments_.length === 0 && !isProcessing && (
              <div className="text-center text-muted-foreground text-sm py-8">
                The hearing is about to begin...
              </div>
            )}
            {arguments_.map((arg, i) => {
              const config = speakerConfig[arg.speaker] || speakerConfig.Judge;
              const Icon = config.icon;
              return (
                <div key={i} className={`rounded-lg border p-3.5 ${config.bg} ${arg.isUser ? 'ring-1 ring-blue-300 dark:ring-blue-700' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    <span className={`text-sm font-semibold ${config.color}`}>{arg.speaker}</span>
                    <Badge variant="outline" className="text-[10px] ml-auto">{arg.phase}</Badge>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{arg.content}</p>
                </div>
              );
            })}
            {(isProcessing || extraRoundState === 'processing') && (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50 border">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  {extraRoundState === 'processing' ? 'Judge and opponent are responding...' :
                    currentPhase ? `${currentPhase.speaker} is speaking...` : 'Processing...'}
                </span>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* User input area */}
      {showUserInput && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {isExtraRound ? `Additional Argument #${extraRounds}` : currentPhase?.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {isExtraRound
                  ? 'Present an additional argument. The Judge will acknowledge it and the opponent will rebut.'
                  : currentPhase?.description}
              </p>
            </div>
            <Textarea
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              placeholder="Type your argument here..."
              className="min-h-[120px]"
              autoFocus
            />
            <Button
              onClick={isExtraRound ? handleExtraRoundSubmit : handleUserSubmit}
              disabled={!userMessage.trim() || isProcessing}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Submit to Court
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bottom actions */}
      {isComplete && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAddRound} className="flex-1">
            <MessageSquare className="mr-2 h-4 w-4" /> Add Another Round
          </Button>
          <Button onClick={() => onComplete(arguments_)} className="flex-1" size="lg">
            <Gavel className="mr-2 h-4 w-4" /> Proceed to Judgment
          </Button>
        </div>
      )}
    </div>
  );
};

export default CourtroomSimulation;
