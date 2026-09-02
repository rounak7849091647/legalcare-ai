import { useEffect, useRef } from 'react'
import { Scale, User, UserX, BookOpen } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

export interface TranscriptEntry {
  role: string
  content: string
  timestamp: number
}

interface CourtroomTranscriptProps {
  entries: TranscriptEntry[]
}

const roleStyle: Record<string, { icon: React.ReactNode; color: string; border: string; label: string }> = {
  'JUDGE': {
    icon: <Scale size={12} />,
    color: 'text-foreground',
    border: 'border-l-foreground/40',
    label: 'Judge',
  },
  'JUDGE (VERDICT)': {
    icon: <Scale size={12} />,
    color: 'text-foreground font-semibold',
    border: 'border-l-foreground',
    label: 'VERDICT',
  },
  'OPPONENT': {
    icon: <UserX size={12} />,
    color: 'text-destructive',
    border: 'border-l-destructive/50',
    label: 'Opponent',
  },
  'USER (COUNSEL)': {
    icon: <User size={12} />,
    color: 'text-muted-foreground',
    border: 'border-l-muted-foreground/40',
    label: 'You',
  },
}

function getStyle(role: string) {
  return roleStyle[role] || {
    icon: <BookOpen size={12} />,
    color: 'text-muted-foreground',
    border: 'border-l-border',
    label: role,
  }
}

export default function CourtroomTranscript({ entries }: CourtroomTranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <BookOpen size={13} className="text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">Court Transcript</span>
        <span className="ml-auto text-[10px] text-muted-foreground">{entries.length}</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {entries.length === 0 ? (
            <p className="text-center text-muted-foreground text-xs py-8">Proceedings have not begun yet</p>
          ) : (
            entries.map((entry, i) => {
              const style = getStyle(entry.role)
              return (
                <div
                  key={i}
                  className={`rounded-md border-l-2 px-3 py-2 bg-muted/20 ${style.border} animate-slide-up`}
                >
                  <div className={`flex items-center gap-1.5 text-[10px] font-semibold mb-1 ${style.color}`}>
                    {style.icon}
                    {style.label}
                  </div>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  )
}
