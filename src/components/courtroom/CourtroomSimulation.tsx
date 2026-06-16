import { useState, useRef, useEffect } from 'react'
import {
  Gavel, Lightbulb, ChevronRight,
  Loader2, Volume2, VolumeX, Scale,
  Mic, MicOff, Send, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { invokeFunction } from '@/lib/api'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAudio } from '@/hooks/useAudio'
import CourtroomVideoPanel from './CourtroomVideoPanel'
import CourtroomTranscript, { type TranscriptEntry } from './CourtroomTranscript'
import CourtroomEvidenceBoard from './CourtroomEvidenceBoard'
import CourtroomFeedbackReport from './CourtroomFeedbackReport'

type Phase = 'opening' | 'examination' | 'closing' | 'verdict'

const PHASES: Phase[] = ['opening', 'examination', 'closing', 'verdict']
const PHASE_LABELS: Record<Phase, string> = {
  opening:     'Opening',
  examination: 'Examination',
  closing:     'Closing',
  verdict:     'Verdict',
}

interface CourtroomSimulationProps {
  caseAnalysis: any
  userRole: 'accused' | 'complainant'
  onComplete: (args: any[]) => void
  language?: string
}

export default function CourtroomSimulation({
  caseAnalysis, userRole, onComplete, language,
}: CourtroomSimulationProps) {
  const { currentLanguage } = useLanguage()
  const lang = language || currentLanguage?.code || 'en-IN'

  const {
    isListening, liveTranscript, isTTSSpeaking, ttsRole,
    audioEnabled, micAvailable, setAudioEnabled,
    speak, stopSpeaking, startListening, stopListening,
  } = useAudio()

  const [sessionStarted, setSessionStarted] = useState(false)
  const [phase, setPhase]                   = useState<Phase>('opening')
  const [transcript, setTranscript]         = useState<TranscriptEntry[]>([])
  const [isLoading, setIsLoading]           = useState(false)
  const [lastJudge, setLastJudge]           = useState('')
  const [lastOpponent, setLastOpponent]     = useState('')
  const [hint, setHint]                     = useState<string | null>(null)
  const [showHint, setShowHint]             = useState(false)
  const [verdictData, setVerdictData]       = useState<any | null>(null)
  const [isConcluded, setIsConcluded]       = useState(false)
  const [isSpeaking, setIsSpeaking]         = useState({ judge: false, opponent: false })
  const [activeTab, setActiveTab]           = useState<'transcript' | 'evidence'>('transcript')
  const [showTextInput, setShowTextInput]   = useState(false)
  const [textStatement, setTextStatement]   = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream })
      .catch(() => {})
  }, [])

  const addEntry = (role: string, content: string) => {
    setTranscript(prev => [...prev, { role, content, timestamp: Date.now() }])
  }

  const setSpeaking = (role: 'judge' | 'opponent', val: boolean) => {
    setIsSpeaking(prev => ({ ...prev, [role]: val }))
  }

  const speakAsync = (text: string, role: 'judge' | 'opponent'): Promise<void> =>
    new Promise(resolve => speak(text, role, resolve))

  const callAI = async (action: string, extra: object = {}) => {
    const { data, error } = await invokeFunction('courtroom-ai', {
      body: {
        action,
        caseAnalysis,
        previousArguments: transcript.map(e => ({ speaker: e.role, content: e.content })),
        language: lang,
        ...extra,
      },
    })
    if (error) throw error
    return data
  }

  const handleStartSession = async () => {
    setIsLoading(true)
    try {
      const judgeResult = await callAI('simulate_phase', { phase: 'case_introduction' })
      const judgeText   = judgeResult?.dialogue || judgeResult?.content || 'Court is now in session.'
      setLastJudge(judgeText)
      addEntry('JUDGE', judgeText)
      setSpeaking('judge', true)
      await speakAsync(judgeText, 'judge')
      setSpeaking('judge', false)

      const oppResult = await callAI('simulate_phase', {
        phase: userRole === 'complainant' ? 'opening_defense' : 'opening_prosecution',
        userRole,
      })
      const oppText = oppResult?.dialogue || oppResult?.content || 'Opposing counsel is ready to proceed.'
      setLastOpponent(oppText)
      addEntry('OPPONENT', oppText)
      setSpeaking('opponent', true)
      await speakAsync(oppText, 'opponent')
      setSpeaking('opponent', false)

      setSessionStarted(true)
    } catch {
      toast.error('Failed to start session')
    } finally {
      setIsLoading(false)
    }
  }

  const submitStatement = async (text: string) => {
    if (!text.trim() || isLoading) return
    setIsLoading(true)
    setTextStatement('')
    addEntry('USER (COUNSEL)', text)

    try {
      // Single call returns both the judge's reaction AND the opponent's rebuttal
      const result    = await callAI('user_argument', { userArgument: text, userRole })

      // Judge speaks first (acknowledges + directs opponent)
      const judgeText = result?.judgeContent || result?.responses?.[0]?.content || ''
      if (judgeText) {
        setLastJudge(judgeText)
        addEntry('JUDGE', judgeText)
        setSpeaking('judge', true)
        await speakAsync(judgeText, 'judge')
        setSpeaking('judge', false)
      }

      // Opponent rebuts
      const oppText = result?.content || result?.dialogue || result?.responses?.[1]?.content || ''
      if (oppText) {
        setLastOpponent(oppText)
        addEntry('OPPONENT', oppText)
        setSpeaking('opponent', true)
        await speakAsync(oppText, 'opponent')
        setSpeaking('opponent', false)
      }
    } catch {
      toast.error('Failed to submit statement')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMicClick = () => {
    if (isLoading || isTTSSpeaking) return
    if (isListening) stopListening()
    else startListening(text => submitStatement(text))
  }

  const handleGetHint = async () => {
    try {
      const result   = await callAI('simulate_phase', { phase: 'private_advisor_hint', userRole })
      const hintText = result?.dialogue || result?.content || result?.hint || ''
      if (hintText) { setHint(hintText); setShowHint(true) }
    } catch { toast.error('Could not get hint') }
  }

  const handleAdvancePhase = async () => {
    const idx      = PHASES.indexOf(phase)
    if (idx >= PHASES.length - 1) return
    const newPhase = PHASES[idx + 1]
    setPhase(newPhase)
    try {
      const result = await callAI('simulate_phase', { phase: `${newPhase}_transition`, userRole })
      const text   = result?.dialogue || result?.content || `Entering ${PHASE_LABELS[newPhase]}.`
      setLastJudge(text)
      addEntry('JUDGE', text)
      setSpeaking('judge', true)
      speak(text, 'judge', () => setSpeaking('judge', false))
      toast.success(`Entering ${PHASE_LABELS[newPhase]}`)
    } catch { toast.error('Failed to advance phase') }
  }

  const handleRequestVerdict = async () => {
    setIsLoading(true)
    stopSpeaking()
    try {
      const result = await callAI('judgment', { userRole })
      setVerdictData(result)
      setIsConcluded(true)
      // Server returns { judgment: "..." } — also accept legacy keys
      const verdictText = result?.judgment || result?.verdict || result?.content || result?.summary || result?.raw || 'The court has reached its verdict.'
      addEntry('JUDGE (VERDICT)', verdictText)
      setSpeaking('judge', true)
      speak(verdictText, 'judge', () => setSpeaking('judge', false))
      toast.success('The Judge has delivered a verdict')
    } catch { toast.error('Failed to get verdict') } finally { setIsLoading(false) }
  }

  const isInputDisabled  = isLoading || isTTSSpeaking || !sessionStarted
  const currentPhaseIdx  = PHASES.indexOf(phase)
  const caseTitle        = caseAnalysis?.caseTitle || caseAnalysis?.title || 'Legal Case'
  const opponentLabel    = userRole === 'complainant' ? 'Defense Counsel' : 'Prosecution Counsel'
  const opponentTitle    = userRole === 'complainant' ? 'Defense' : 'Prosecution'
  const userTitle        = userRole === 'complainant' ? 'Complainant' : 'Defense'

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">

      {/* ── Session sub-header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/60 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Scale size={16} className="text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">AI Courtroom</span>
          <span className="text-border mx-1">|</span>
          <span className="text-xs text-muted-foreground font-mono truncate max-w-[120px] sm:max-w-[220px]">{caseTitle}</span>
          <Badge variant="outline" className="text-[10px]">{userTitle}</Badge>
        </div>

        {/* Phase progress */}
        <div className="hidden md:flex items-center gap-1">
          {PHASES.map((p, i) => (
            <div key={p} className="flex items-center gap-1">
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition-all ${
                phase === p
                  ? 'bg-foreground text-background'
                  : i < currentPhaseIdx
                  ? 'text-muted-foreground/50 line-through'
                  : 'text-muted-foreground'
              }`}>{PHASE_LABELS[p]}</span>
              {i < PHASES.length - 1 && <ChevronRight size={10} className="text-muted-foreground/30" />}
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setAudioEnabled(!audioEnabled); stopSpeaking() }}
            title={audioEnabled ? 'Mute audio' : 'Enable audio'}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            {audioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          <button
            onClick={() => setShowTextInput(v => !v)}
            className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
              showTextInput
                ? 'border-foreground/40 text-foreground bg-muted/30'
                : 'border-border text-muted-foreground hover:border-foreground/30'
            }`}
          >
            TEXT
          </button>
        </div>
      </div>

      {/* ── Main area ──────────────────────────────────────────────── */}
      {isConcluded && verdictData ? (
        <CourtroomFeedbackReport
          verdictData={verdictData}
          caseTitle={caseTitle}
          transcript={transcript}
          onReset={() => onComplete([])}
        />
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

          {/* Sidebar — hidden on mobile, shown on md+ */}
          <div className="hidden md:flex w-60 flex-shrink-0 border-r border-border flex-col bg-card/30">
            <div className="flex border-b border-border">
              {(['transcript', 'evidence'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'text-foreground border-b-2 border-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden">
              {activeTab === 'transcript'
                ? <CourtroomTranscript entries={transcript} />
                : <CourtroomEvidenceBoard caseAnalysis={caseAnalysis} userRole={userRole} />}
            </div>
          </div>

          {/* Center: panels + controls */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* 3 participant panels — single col on mobile, 3-col on desktop */}
            <div className="flex-1 p-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-center overflow-y-auto md:overflow-hidden md:max-h-[56vh]">
              <CourtroomVideoPanel
                role="opponent"
                name={opponentLabel}
                title={opponentTitle}
                isSpeaking={isSpeaking.opponent}
                isTTSSpeaking={isTTSSpeaking && ttsRole === 'opponent'}
                lastStatement={lastOpponent}
              />
              <CourtroomVideoPanel
                role="judge"
                name="The Honourable AI"
                title="Judge"
                isSpeaking={isSpeaking.judge}
                isTTSSpeaking={isTTSSpeaking && ttsRole === 'judge'}
                lastStatement={lastJudge}
              />
              <CourtroomVideoPanel
                role="user"
                name="You — Counsel"
                title={userTitle}
                isSpeaking={isListening}
                isTTSSpeaking={false}
                isUser={true}
                videoRef={videoRef}
              />
            </div>

            {/* Mobile-only transcript (shows below video panels on small screens) */}
            {transcript.length > 0 && (
              <div className="md:hidden mx-3 mb-2 max-h-32 overflow-y-auto bg-muted/20 border border-border rounded-lg px-3 py-2">
                {transcript.slice(-3).map((e, i) => (
                  <div key={i} className="mb-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{e.role}: </span>
                    <span className="text-xs text-foreground">{e.content.slice(0, 120)}{e.content.length > 120 ? '…' : ''}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Hint bar */}
            {showHint && hint && (
              <div className="mx-4 mb-2 bg-muted/40 border border-border rounded-lg px-4 py-3 animate-slide-up">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold mb-1">
                  <Lightbulb size={12} />
                  <span>Advisor — Private</span>
                  <button onClick={() => setShowHint(false)} className="ml-auto text-muted-foreground/60 hover:text-foreground">
                    <X size={12} />
                  </button>
                </div>
                <p className="text-sm text-foreground">{hint}</p>
              </div>
            )}

            {/* ── Bottom input area ────────────────────────────────── */}
            <div className="border-t border-border bg-card/40 px-4 py-4 flex-shrink-0">

              {!sessionStarted ? (
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">All parties are ready. Call the court to order.</p>
                  <Button
                    onClick={handleStartSession}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Gavel size={16} />}
                    Call Court to Order
                  </Button>
                </div>
              ) : (
                <>
                  {/* Live mic transcript */}
                  {(isListening || liveTranscript) && (
                    <div className="mb-3 px-4 py-2.5 bg-muted/30 border border-border rounded-lg animate-slide-up">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                        <span className="text-xs text-muted-foreground font-medium">Listening…</span>
                      </div>
                      <p className="text-sm text-foreground italic min-h-[20px]">{liveTranscript || '…'}</p>
                    </div>
                  )}

                  {/* TTS indicator */}
                  {isTTSSpeaking && (
                    <div className="mb-3 px-4 py-2.5 bg-muted/20 border border-border rounded-lg flex items-center gap-3 animate-slide-up">
                      <Volume2 size={14} className="text-muted-foreground animate-pulse" />
                      <span className="text-xs text-muted-foreground">
                        {ttsRole === 'judge' ? '⚖️ Judge is speaking…' : '👨‍💼 Opponent is speaking…'}
                      </span>
                      <button onClick={stopSpeaking} className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
                        Skip
                      </button>
                    </div>
                  )}

                  {/* Main controls */}
                  <div className="flex items-center justify-center gap-6 mb-3">

                    {/* Hint */}
                    <button
                      onClick={handleGetHint}
                      disabled={isInputDisabled}
                      title="Get private hint from advisor"
                      className="p-2.5 rounded-full border border-border text-muted-foreground
                        hover:text-foreground hover:border-foreground/40 transition-all disabled:opacity-30"
                    >
                      <Lightbulb size={18} />
                    </button>

                    {/* Mic */}
                    <div className="flex flex-col items-center">
                      <button
                        onClick={handleMicClick}
                        disabled={isInputDisabled && !isListening}
                        className={`relative w-16 h-16 rounded-full flex items-center justify-center
                          font-bold transition-all duration-200 shadow-md
                          ${isListening
                            ? 'bg-destructive text-white ring-4 ring-destructive/30'
                            : isInputDisabled
                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                            : 'bg-foreground text-background hover:bg-foreground/90'
                          }`}
                      >
                        {isListening
                          ? <MicOff size={26} />
                          : isLoading
                          ? <Loader2 size={26} className="animate-spin" />
                          : <Mic size={26} />}
                        {isListening && (
                          <span className="absolute inset-0 rounded-full border-2 border-destructive/60 animate-ping" />
                        )}
                      </button>
                      <span className="mt-1.5 text-xs text-muted-foreground">
                        {isListening ? 'Tap to stop' : isTTSSpeaking ? 'Wait…' : isLoading ? 'Processing…' : 'Tap to speak'}
                      </span>
                    </div>

                    {/* Phase advance + verdict */}
                    <div className="flex flex-col gap-2 items-center">
                      {phase !== 'verdict' && (
                        <button
                          onClick={handleAdvancePhase}
                          disabled={isInputDisabled}
                          title="Advance to next phase"
                          className="p-2.5 rounded-full border border-border text-muted-foreground
                            hover:text-foreground hover:border-foreground/40 transition-all disabled:opacity-30"
                        >
                          <ChevronRight size={18} />
                        </button>
                      )}
                      <button
                        onClick={handleRequestVerdict}
                        disabled={isInputDisabled}
                        title="Request verdict"
                        className="p-2.5 rounded-full border border-destructive/40 text-destructive
                          hover:bg-destructive/10 transition-all disabled:opacity-30"
                      >
                        <Gavel size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Text input (collapsible) */}
                  {showTextInput && (
                    <div className="flex gap-2 items-end mt-1 animate-slide-up">
                      <textarea
                        value={textStatement}
                        onChange={e => setTextStatement(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitStatement(textStatement) } }}
                        placeholder="Type your argument… (Enter to submit)"
                        rows={2}
                        disabled={isInputDisabled}
                        className="flex-1 bg-muted/30 border border-border rounded-lg
                          px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none
                          focus:outline-none focus:ring-1 focus:ring-foreground/30 transition-all disabled:opacity-40"
                      />
                      <Button
                        onClick={() => submitStatement(textStatement)}
                        disabled={!textStatement.trim() || isInputDisabled}
                        size="sm"
                        className="h-full px-3"
                      >
                        <Send size={16} />
                      </Button>
                    </div>
                  )}

                  {!micAvailable && (
                    <p className="text-center text-xs text-muted-foreground mt-2">
                      Microphone not available — enable TEXT input above to type your arguments.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
