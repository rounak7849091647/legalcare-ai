import { Gavel, Scale, BookOpen, RefreshCw, Download, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface CourtroomFeedbackReportProps {
  verdictData: {
    verdict?: string
    summary?: string
    reasoning?: string
    relevantLaws?: string[]
    order?: string
    raw?: string
  } | null
  caseTitle: string
  transcript: { role: string; content: string; timestamp: number }[]
  onReset: () => void
}

export default function CourtroomFeedbackReport({
  verdictData, caseTitle, transcript, onReset,
}: CourtroomFeedbackReportProps) {
  const verdict   = verdictData?.verdict   || verdictData?.summary || verdictData?.raw || 'The court has reached its decision.'
  const reasoning = verdictData?.reasoning || ''
  const laws      = verdictData?.relevantLaws || []
  const order     = verdictData?.order || ''

  const handleDownload = () => {
    const lines = [
      'AI COURTROOM — FINAL JUDGMENT',
      '='.repeat(50),
      `Case: ${caseTitle}`,
      `Date: ${new Date().toLocaleDateString('en-IN')}`,
      'Note: AI-generated simulation for educational purposes only.',
      '='.repeat(50),
      '',
      'VERDICT',
      '-'.repeat(40),
      verdict,
      '',
      reasoning ? 'REASONING\n' + '-'.repeat(40) + '\n' + reasoning : '',
      order     ? 'ORDER OF THE COURT\n' + '-'.repeat(40) + '\n' + order : '',
      laws.length ? 'RELEVANT LAWS\n' + '-'.repeat(40) + '\n' + laws.map((l: string) => `  · ${l}`).join('\n') : '',
      '',
      'FULL TRANSCRIPT',
      '='.repeat(50),
      ...transcript.map(e => `[${e.role}]\n${e.content}\n`),
    ].filter(Boolean).join('\n')

    const blob = new Blob([lines], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `courtroom-judgment-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-2xl mx-auto p-6 space-y-5">

        {/* Header */}
        <div className="text-center space-y-2 animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-1">
            <Gavel className="h-7 w-7 text-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Case Concluded</h2>
          <p className="text-sm text-muted-foreground">{caseTitle}</p>
          <Badge variant="outline" className="text-xs">AI-Generated Simulation</Badge>
        </div>

        {/* Verdict */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-4 w-4 text-muted-foreground" />
              Judge's Verdict
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{verdict}</p>
          </CardContent>
        </Card>

        {/* Reasoning */}
        {reasoning && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                Judicial Reasoning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{reasoning}</p>
            </CardContent>
          </Card>
        )}

        {/* Order */}
        {order && (
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Order of the Court</p>
            <p className="text-sm text-foreground leading-relaxed">{order}</p>
          </div>
        )}

        {/* Laws */}
        {laws.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Laws Cited
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {laws.map((l: string, i: number) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-muted-foreground/40 mt-0.5">·</span>
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Disclaimer */}
        <div className="rounded-lg border border-border bg-muted/10 p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Disclaimer:</strong> This is an AI-generated courtroom simulation for educational purposes only. It does not constitute legal advice. Please consult a qualified lawyer for actual legal matters.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleDownload} className="flex-1 gap-2">
            <Download className="h-4 w-4" /> Download Judgment
          </Button>
          <Button onClick={onReset} className="flex-1 gap-2">
            <RefreshCw className="h-4 w-4" /> Practice Again
          </Button>
        </div>
      </div>
    </ScrollArea>
  )
}
