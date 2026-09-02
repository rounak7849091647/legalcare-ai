/**
 * useAudio — Courtroom TTS + STT hook
 *
 * TTS: Google Cloud TTS via the Express backend (/functions/v1/speak).
 *   • Judge   → en-IN-Wavenet-B, rate 0.80, pitch -5.0  (deep, slow, 60+ authoritative male)
 *   • Opponent → en-IN-Chirp3-HD-Aoede, rate 1.10       (fluent, confident 25yr female lawyer)
 *
 * STT: Browser Web Speech API (same as before — recognition-only, no change needed).
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { invokeFunction } from '@/lib/api'

export type AudioRole = 'judge' | 'opponent'

export function useAudio() {
  const [isListening,   setIsListening]   = useState(false)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [isTTSSpeaking, setIsTTSSpeaking] = useState(false)
  const [ttsRole,       setTtsRole]       = useState<AudioRole | null>(null)
  const [audioEnabled,  setAudioEnabled]  = useState(true)
  const [micAvailable,  setMicAvailable]  = useState(false)

  const recognitionRef  = useRef<any>(null)
  const audioCtxRef     = useRef<AudioContext | null>(null)
  const audioSourceRef  = useRef<AudioBufferSourceNode | null>(null)
  const onDoneRef       = useRef<(() => void) | undefined>(undefined)

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setMicAvailable(!!SR)
    return () => {
      // Cleanup on unmount
      try { audioSourceRef.current?.stop() } catch {}
      window.speechSynthesis?.cancel()
    }
  }, [])

  // ── AudioContext (lazy, shared) ───────────────────────────────────────────
  const getAudioCtx = (): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext()
    }
    return audioCtxRef.current
  }

  // ── Stop any current speech ───────────────────────────────────────────────
  const stopSpeaking = useCallback(() => {
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop() } catch {}
      audioSourceRef.current = null
    }
    window.speechSynthesis?.cancel()
    setIsTTSSpeaking(false)
    setTtsRole(null)
    // Fire pending onDone so awaiting callers unblock
    const cb = onDoneRef.current
    onDoneRef.current = undefined
    cb?.()
  }, [])

  // ── Browser TTS fallback (if Google fails) ────────────────────────────────
  const browserFallback = useCallback((text: string, role: AudioRole, onDone?: () => void) => {
    if (typeof window === 'undefined') { onDone?.(); return }
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang  = 'en-IN'
    // Best-effort male voice for judge, female for opponent
    const voices = window.speechSynthesis.getVoices()
    if (role === 'judge') {
      const v = voices.find(v => /male|man|george|daniel/i.test(v.name) && v.lang.startsWith('en'))
        ?? voices.find(v => v.lang === 'en-GB')
        ?? voices.find(v => v.lang.startsWith('en'))
      if (v) utt.voice = v
      utt.rate  = 0.82
      utt.pitch = 0.6
    } else {
      const v = voices.find(v => /female|woman|samantha|karen|aoede/i.test(v.name) && v.lang.startsWith('en'))
        ?? voices.find(v => v.lang === 'en-IN')
        ?? voices.find(v => v.lang.startsWith('en'))
      if (v) utt.voice = v
      utt.rate  = 1.05
      utt.pitch = 1.1
    }
    utt.onend   = () => { setIsTTSSpeaking(false); setTtsRole(null); onDone?.() }
    utt.onerror = () => { setIsTTSSpeaking(false); setTtsRole(null); onDone?.() }
    window.speechSynthesis.speak(utt)
  }, [])

  // ── Main speak function — Google Cloud TTS ────────────────────────────────
  const speak = useCallback((text: string, role: AudioRole, onDone?: () => void): void => {
    if (!audioEnabled || !text?.trim()) { onDone?.(); return }

    // Cancel anything currently playing
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop() } catch {}
      audioSourceRef.current = null
    }
    window.speechSynthesis?.cancel()

    setIsTTSSpeaking(true)
    setTtsRole(role)
    onDoneRef.current = onDone

    // Fire async — caller uses speakAsync wrapper to await
    ;(async () => {
      try {
        const { data, error } = await invokeFunction('speak', {
          body: { text: text.trim(), language: 'en-IN', role },
        })

        if (error || !data?.audioContent) {
          console.warn('[useAudio] Google TTS unavailable — browser fallback:', error)
          browserFallback(text, role, () => {
            setIsTTSSpeaking(false)
            setTtsRole(null)
            const cb = onDoneRef.current; onDoneRef.current = undefined; cb?.()
          })
          return
        }

        // Decode base64 MP3 → ArrayBuffer
        const b64    = data.audioContent as string
        const binary = atob(b64)
        const bytes  = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

        const ctx = getAudioCtx()
        if (ctx.state === 'suspended') {
          try { await ctx.resume() } catch {}
        }

        const audioBuffer = await ctx.decodeAudioData(bytes.buffer)
        const source      = ctx.createBufferSource()
        source.buffer     = audioBuffer
        source.connect(ctx.destination)

        source.onended = () => {
          audioSourceRef.current = null
          setIsTTSSpeaking(false)
          setTtsRole(null)
          const cb = onDoneRef.current; onDoneRef.current = undefined; cb?.()
        }

        audioSourceRef.current = source
        source.start(0)

      } catch (err) {
        console.error('[useAudio] TTS error:', err)
        setIsTTSSpeaking(false)
        setTtsRole(null)
        const cb = onDoneRef.current; onDoneRef.current = undefined; cb?.()
      }
    })()
  }, [audioEnabled, browserFallback])

  // ── STT — unchanged from original ─────────────────────────────────────────
  const startListening = useCallback((onFinal: (text: string) => void) => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Speech recognition not supported. Use Chrome or Edge.'); return }
    stopSpeaking()

    const recognition = new SR()
    recognitionRef.current = recognition
    recognition.continuous     = false
    recognition.interimResults = true
    recognition.lang           = 'en-IN'

    let accumulated = ''
    recognition.onstart  = () => { setIsListening(true); setLiveTranscript(''); accumulated = '' }
    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) accumulated += event.results[i][0].transcript + ' '
        else interim += event.results[i][0].transcript
      }
      setLiveTranscript(accumulated || interim)
    }
    recognition.onend   = () => {
      setIsListening(false)
      setLiveTranscript('')
      const final = accumulated.trim()
      if (final) onFinal(final)
    }
    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech') console.warn('STT:', e.error)
      setIsListening(false)
      setLiveTranscript('')
    }
    recognition.start()
  }, [stopSpeaking])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
    setLiveTranscript('')
  }, [])

  return {
    isListening,
    liveTranscript,
    isTTSSpeaking,
    ttsRole,
    audioEnabled,
    micAvailable,
    setAudioEnabled,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
  }
}
