# LegalCareAI - Complete Source Code Appendix

## Appendix Overview

This appendix contains references to all source code files in the LegalCareAI project. For the complete source code, please refer to the project repository.

---

## File Inventory

### Core Application Files
- `src/App.tsx` - Main application with routing
- `src/main.tsx` - Application entry point
- `src/index.css` - Global styles and design tokens

### Pages (15 files)
- `src/pages/Index.tsx` - Home page with AI assistant
- `src/pages/Auth.tsx` - Authentication page
- `src/pages/Dashboard.tsx` - User dashboard
- `src/pages/Documents.tsx` - Document templates
- `src/pages/Lawyers.tsx` - Lawyer directory
- `src/pages/TaxServices.tsx` - Tax services hub
- `src/pages/Community.tsx` - Community forum
- `src/pages/Discussion.tsx` - Private discussions
- `src/pages/NotFound.tsx` - 404 page
- `src/pages/tax/*.tsx` - 11 tax service sub-pages

### Components (50+ files)
- `src/components/AiOrb.tsx` - Voice AI interface
- `src/components/AppSidebar.tsx` - Navigation sidebar
- `src/components/ChatHeader.tsx` - Chat header
- `src/components/ChatInput.tsx` - Message input
- `src/components/ChatMessages.tsx` - Message display
- `src/components/DisclaimerPopup.tsx` - Legal disclaimer
- `src/components/LanguageSelector.tsx` - Language picker
- `src/components/MainContent.tsx` - Main chat area
- `src/components/PageLayout.tsx` - Page wrapper
- `src/components/SEOHead.tsx` - SEO meta tags
- `src/components/ThemeToggle.tsx` - Theme switcher
- `src/components/ui/*.tsx` - 50+ UI components

### Hooks (15 files)
- `src/hooks/useLegalChat.ts` - AI chat logic
- `src/hooks/useOpenAITTS.ts` - OpenAI TTS
- `src/hooks/useBrowserTTS.ts` - Browser TTS
- `src/hooks/useElevenLabsTTS.ts` - ElevenLabs TTS
- `src/hooks/useSpeechRecognition.ts` - Web Speech API
- `src/hooks/useWhisperRecognition.ts` - Whisper STT
- `src/hooks/useTextToSpeech.ts` - Unified TTS
- `src/hooks/useAuth.ts` - Authentication
- `src/hooks/useInactivityPrompt.ts` - Inactivity detection
- `src/hooks/useMobileAudio.ts` - Mobile audio unlock
- `src/hooks/use-mobile.tsx` - Mobile detection
- `src/hooks/use-toast.ts` - Toast notifications

### Edge Functions (6 files)
- `supabase/functions/legal-chat/index.ts` - AI legal assistant
- `supabase/functions/legal-chat/bns-knowledge.ts` - BNS 2023 data
- `supabase/functions/text-to-speech/index.ts` - OpenAI TTS
- `supabase/functions/voice-to-text/index.ts` - Whisper STT
- `supabase/functions/elevenlabs-tts/index.ts` - ElevenLabs TTS
- `supabase/functions/murf-tts/index.ts` - Murf AI TTS
- `supabase/functions/bhashini-tts/index.ts` - Bhashini TTS

### Data Files
- `src/data/lawyersData.ts` - Lawyer directory data

### Configuration
- `supabase/config.toml` - Supabase configuration
- `tailwind.config.ts` - Tailwind CSS config
- `vite.config.ts` - Vite build config
- `tsconfig.json` - TypeScript config
- `components.json` - Shadcn UI config

### Public Assets
- `public/favicon.ico` - Application icon
- `public/sitemap.xml` - SEO sitemap
- `public/robots.txt` - Search engine rules
- `src/assets/supreme-court-bg.jpg` - Background image

---

## Total Lines of Code

| Category | Estimated Lines |
|----------|-----------------|
| React Components | ~8,000 |
| Custom Hooks | ~1,500 |
| Edge Functions | ~800 |
| Pages | ~3,000 |
| Styles (CSS) | ~500 |
| Configuration | ~300 |
| **Total** | **~14,000+** |

---

## Copyright Notice

All source code, documentation, and assets in this project are the exclusive property of LegalCareAI. Unauthorized reproduction, distribution, or use is strictly prohibited.

**Copyright © 2024-2026 LegalCareAI. All Rights Reserved.**

---

*This appendix is part of the LegalCareAI Copyright & Trademark Filing Documentation.*
