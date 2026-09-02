import { Volume2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface CourtroomVideoPanelProps {
  role: 'judge' | 'opponent' | 'user'
  name: string
  title: string
  isSpeaking: boolean
  isTTSSpeaking?: boolean
  lastStatement?: string
  isUser?: boolean
  videoRef?: React.RefObject<HTMLVideoElement | null>
}

const roleConfig = {
  judge: {
    borderIdle:    'border-border',
    borderActive:  'border-foreground/60',
    badgeClass:    'bg-foreground text-background',
    nameColor:     'text-foreground',
    labelColor:    'text-muted-foreground',
    avatar:        '⚖️',
    label:         'THE COURT',
    waveColor:     'bg-foreground',
    ringColor:     'border-foreground/40',
  },
  opponent: {
    borderIdle:    'border-border',
    borderActive:  'border-destructive/60',
    badgeClass:    'border-destructive/30 text-destructive bg-destructive/10',
    nameColor:     'text-destructive',
    labelColor:    'text-destructive/60',
    avatar:        '👨‍💼',
    label:         'OPPOSING COUNSEL',
    waveColor:     'bg-destructive',
    ringColor:     'border-destructive/40',
  },
  user: {
    borderIdle:    'border-border',
    borderActive:  'border-muted-foreground/50',
    badgeClass:    'border-border text-muted-foreground',
    nameColor:     'text-muted-foreground',
    labelColor:    'text-muted-foreground/60',
    avatar:        '👤',
    label:         'YOUR COUNSEL',
    waveColor:     'bg-muted-foreground',
    ringColor:     'border-muted-foreground/30',
  },
}

function AudioWave({ color }: { color: string }) {
  const heights = [0.4, 0.9, 0.6, 1.0, 0.7, 0.85, 0.5, 0.75, 0.45, 0.9, 0.6]
  return (
    <div className="flex items-end gap-[3px] h-5">
      {heights.map((h, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full ${color} animate-wave-bar`}
          style={{
            height: `${h * 6}px`,
            animationDelay: `${i * 0.05}s`,
            animationDuration: `${0.6 + i * 0.04}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function CourtroomVideoPanel({
  role, name, title, isSpeaking, isTTSSpeaking = false,
  lastStatement, isUser = false, videoRef,
}: CourtroomVideoPanelProps) {
  const cfg    = roleConfig[role]
  const active = isSpeaking || isTTSSpeaking

  return (
    <div className={`relative flex flex-col rounded-xl border overflow-hidden bg-card
      transition-all duration-300
      ${active ? cfg.borderActive + ' shadow-lg' : cfg.borderIdle}`}
    >
      {/* Video / Avatar */}
      <div className="relative aspect-video bg-background flex items-center justify-center overflow-hidden">
        {isUser && videoRef ? (
          <video ref={videoRef as React.RefObject<HTMLVideoElement>} autoPlay muted playsInline className="w-full h-full object-cover" />
        ) : (
          <AIAvatar cfg={cfg} isSpeaking={active} />
        )}

        {/* Audio wave when TTS playing */}
        {isTTSSpeaking && !isUser && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
            <AudioWave color={cfg.waveColor} />
          </div>
        )}

        {/* Speaking pill */}
        {active && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm rounded-full px-2 py-0.5 border border-border">
            <Volume2 size={10} className={cfg.nameColor} />
            <span className={`text-[10px] font-medium ${cfg.nameColor}`}>
              {isTTSSpeaking ? 'Speaking' : 'Responded'}
            </span>
          </div>
        )}

        {/* Role badge */}
        <div className={`absolute top-2 right-2`}>
          <Badge variant="outline" className={`text-[10px] font-semibold ${cfg.badgeClass}`}>
            {title}
          </Badge>
        </div>
      </div>

      {/* Name + last statement */}
      <div className="px-3 py-2 border-t border-border bg-card/80">
        <div className={`font-medium text-sm ${cfg.nameColor}`}>{name}</div>
        {lastStatement && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            "{lastStatement}"
          </p>
        )}
      </div>
    </div>
  )
}

function AIAvatar({
  cfg, isSpeaking,
}: { cfg: typeof roleConfig['judge']; isSpeaking: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-b from-muted/20 to-background">
      {/* Avatar */}
      <div className={`relative w-16 h-16 rounded-full border flex items-center justify-center text-3xl
        bg-muted transition-all duration-300
        ${isSpeaking ? cfg.borderActive + ' ' + cfg.waveColor + '/10' : 'border-border'}
        ${isSpeaking ? 'scale-105' : 'scale-100'}`}
      >
        {cfg.avatar}
        {isSpeaking && (
          <>
            <span className={`absolute inset-0 rounded-full border ${cfg.ringColor} animate-ping opacity-50`} />
            <span className={`absolute inset-0 rounded-full border ${cfg.ringColor} animate-ping opacity-25`}
              style={{ animationDelay: '0.3s' }} />
          </>
        )}
      </div>

      <div className={`mt-2 text-[10px] font-semibold uppercase tracking-widest ${cfg.labelColor}`}>
        {cfg.label}
      </div>
    </div>
  )
}
