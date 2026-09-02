import { FileText, Shield, AlertTriangle, CheckCircle, BookOpen } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

interface CourtroomEvidenceBoardProps {
  caseAnalysis: any
  userRole: 'accused' | 'complainant'
}

export default function CourtroomEvidenceBoard({ caseAnalysis, userRole }: CourtroomEvidenceBoardProps) {
  if (!caseAnalysis) return null

  const title    = caseAnalysis.caseTitle   || caseAnalysis.title   || 'Case'
  const caseType = caseAnalysis.caseType    || caseAnalysis.type    || ''
  const summary  = caseAnalysis.caseSummary || caseAnalysis.summary || ''

  const parties   = caseAnalysis.parties || {}
  const plaintiff = parties.complainant || parties.plaintiff || 'Complainant'
  const defendant = parties.accused     || parties.defendant || 'Accused'

  const userPoints = userRole === 'complainant'
    ? (caseAnalysis.claims || caseAnalysis.petitionerPoints || [])
    : (caseAnalysis.counterClaims || caseAnalysis.respondentPoints || [])

  const opponentPoints = userRole === 'complainant'
    ? (caseAnalysis.counterClaims || caseAnalysis.respondentPoints || [])
    : (caseAnalysis.claims || caseAnalysis.petitionerPoints || [])

  const evidence  = caseAnalysis.evidenceSummary || []
  const laws      = caseAnalysis.applicableLaws  || caseAnalysis.relevantLaws || []
  const keyIssues = caseAnalysis.keyIssues       || caseAnalysis.possibleOutcomes || []

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {/* Case header */}
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-xs font-semibold text-foreground leading-snug">{title}</p>
            {caseType && <Badge variant="outline" className="text-[10px] shrink-0">{caseType}</Badge>}
          </div>
          <p className="text-[10px] text-muted-foreground">{plaintiff} vs {defendant}</p>
        </div>

        {summary && (
          <Section title="Summary" icon={<BookOpen size={11} />}>
            <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>
          </Section>
        )}

        {userPoints.length > 0 && (
          <Section title="Your Strong Points" icon={<CheckCircle size={11} />} color="text-foreground">
            <ul className="space-y-1">
              {userPoints.map((a: string, i: number) => <Dot key={i} text={a} />)}
            </ul>
          </Section>
        )}

        {opponentPoints.length > 0 && (
          <Section title="Opponent's Points" icon={<AlertTriangle size={11} />} color="text-destructive">
            <ul className="space-y-1">
              {opponentPoints.map((w: string, i: number) => <Dot key={i} text={w} color="text-destructive/70" />)}
            </ul>
          </Section>
        )}

        {evidence.length > 0 && (
          <Section title="Evidence" icon={<FileText size={11} />}>
            <ul className="space-y-1">
              {evidence.map((e: string, i: number) => <Dot key={i} text={e} />)}
            </ul>
          </Section>
        )}

        {keyIssues.length > 0 && (
          <Section title="Key Issues" icon={<AlertTriangle size={11} />}>
            <ul className="space-y-1">
              {keyIssues.map((k: string, i: number) => <Dot key={i} text={k} />)}
            </ul>
          </Section>
        )}

        {laws.length > 0 && (
          <Section title="Relevant Laws" icon={<Shield size={11} />}>
            <ul className="space-y-1">
              {laws.map((l: string, i: number) => <Dot key={i} text={l} />)}
            </ul>
          </Section>
        )}
      </div>
    </ScrollArea>
  )
}

function Section({
  title, icon, color = 'text-muted-foreground', children,
}: { title: string; icon: React.ReactNode; color?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/10 p-3">
      <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider mb-2 ${color}`}>
        {icon}{title}
      </div>
      {children}
    </div>
  )
}

function Dot({ text, color = 'text-muted-foreground' }: { text: string; color?: string }) {
  return (
    <li className={`text-[11px] leading-relaxed flex gap-1.5 ${color}`}>
      <span className="mt-0.5 flex-shrink-0 text-muted-foreground/40">·</span>
      <span>{text}</span>
    </li>
  )
}
