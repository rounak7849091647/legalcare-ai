# Project Overview

## LegalCareAI - Complete Project Documentation

---

## 1. Project Identity

### 1.1 Name and Branding
- **Official Name:** LegalCareAI
- **AI Assistant Name:** CARE (Conversational AI for Reliable Expertise)
- **Tagline:** "Legal Intelligence"
- **Domain:** https://legalcareai.com

### 1.2 Logo and Visual Identity
- **Primary Logo:** "LC" monogram (favicon.ico, favicon.png)
- **Color Scheme:** Dark theme with amber/gold accents
- **Typography:** Inter (body), Plus Jakarta Sans (display)

---

## 2. Project Structure

```
legalcareai/
├── src/
│   ├── assets/                 # Static assets (images, backgrounds)
│   ├── components/             # React components
│   │   ├── ui/                 # UI component library (shadcn)
│   │   ├── dashboard/          # Dashboard-specific components
│   │   └── [feature].tsx       # Feature components
│   ├── contexts/               # React context providers
│   ├── data/                   # Static data files
│   ├── hooks/                  # Custom React hooks
│   ├── integrations/           # External service integrations
│   ├── lib/                    # Utility libraries
│   ├── pages/                  # Page components
│   │   └── tax/                # Tax service sub-pages
│   ├── App.tsx                 # Main application component
│   ├── main.tsx                # Application entry point
│   └── index.css               # Global styles and design tokens
├── supabase/
│   ├── functions/              # Edge functions (serverless)
│   │   ├── legal-chat/         # AI legal assistant
│   │   ├── text-to-speech/     # TTS service
│   │   ├── voice-to-text/      # STT service
│   │   ├── elevenlabs-tts/     # ElevenLabs integration
│   │   ├── murf-tts/           # Murf AI integration
│   │   └── bhashini-tts/       # Bhashini integration
│   └── config.toml             # Supabase configuration
├── public/
│   ├── favicon.ico             # Application icon
│   ├── sitemap.xml             # SEO sitemap
│   └── robots.txt              # Search engine instructions
├── docs/                       # Project documentation
└── [config files]              # Various configuration files
```

---

## 3. Application Features

### 3.1 Core Features

#### AI Legal Assistant (CARE)
- Real-time conversational AI for legal queries
- Voice input and output support
- BNS 2023 knowledge integration
- Multi-language support (11 Indian languages)
- Document analysis and summarization
- Streaming responses for fast interaction

#### Lawyer Directory
- 10M+ Bar Council verified lawyers
- Filter by state, city, practice area
- Lawyer profiles with ratings and reviews
- Direct contact functionality

#### Document Templates
- 100+ legal document templates
- Categories: Property, Business, Employment, Legal, Family
- Preview and download functionality
- Copy-to-clipboard feature

#### Tax Services
- ITR filing assistance
- Form 16 upload and processing
- CA-assisted filing
- Tax planning guidance
- Refund status tracking
- TDS solutions
- NRI tax services
- Tax notice handling

#### Community Features
- Public discussion forums
- Private document analysis
- AI-powered summaries
- User-generated content

#### User Dashboard
- Case management system
- Calendar with hearing dates
- Profile management
- Activity tracking

### 3.2 Technical Features

#### Voice System
- Speech-to-text (Whisper API)
- Text-to-speech (OpenAI TTS)
- Browser native TTS fallback
- Continuous listening mode
- Language detection

#### AI System
- Google Gemini 2.5 Flash model
- Streaming responses (SSE)
- Context-aware conversations
- Document context retention
- BNS knowledge base

#### Database
- PostgreSQL with Supabase
- Row Level Security (RLS)
- Real-time subscriptions
- Secure authentication

---

## 4. User Journeys

### 4.1 Anonymous User
1. Land on homepage
2. See AI orb interface
3. Ask legal questions (text or voice)
4. Receive AI responses
5. Browse lawyers/documents
6. Sign up for more features

### 4.2 Registered User
1. Login to account
2. Access personalized dashboard
3. Manage legal cases
4. Schedule calendar events
5. Save conversation history
6. Access premium features

### 4.3 Legal Query Flow
1. User speaks or types question
2. Language detection
3. Request sent to edge function
4. AI processes with BNS context
5. Streaming response begins
6. Auto-play voice response
7. Display formatted text

---

## 5. Page Inventory

| Page | Route | Description |
|------|-------|-------------|
| Home | / | AI assistant with orb interface |
| Auth | /auth | Login and signup |
| Dashboard | /dashboard | User dashboard |
| Documents | /documents | Document templates |
| Lawyers | /lawyers | Lawyer directory |
| Tax Services | /tax-services | Tax service hub |
| Community | /community | Community forum |
| Discussion | /discussion | Private discussions |
| File Return | /tax-services/file-return | ITR filing |
| Upload Form16 | /tax-services/upload-form16 | Form 16 upload |
| CA Filing | /tax-services/ca-filing | CA-assisted filing |
| Tax Planning | /tax-services/tax-planning | Tax planning |
| Refund Status | /tax-services/refund-status | Refund tracking |
| TDS Solution | /tax-services/tds-solution | TDS services |
| NRI Taxes | /tax-services/nri-taxes | NRI tax services |
| Tax Advisory | /tax-services/tax-advisory | Advisory services |
| Capital Gains | /tax-services/capital-gains | Capital gains |
| Tax Notices | /tax-services/tax-notices | Notice handling |
| Connect Expert | /tax-services/connect-expert | Expert connection |

---

## 6. Component Summary

### UI Components (50+)
- Accordion, Alert, Avatar, Badge, Button
- Calendar, Card, Carousel, Checkbox, Collapsible
- Command, Context Menu, Dialog, Drawer, Dropdown
- Form, Hover Card, Input, Label, Menubar
- Navigation, Pagination, Popover, Progress, Radio
- Scroll Area, Select, Separator, Sheet, Sidebar
- Skeleton, Slider, Switch, Table, Tabs
- Textarea, Toast, Toggle, Tooltip

### Feature Components
- AiOrb, AppSidebar, ChatHeader, ChatInput, ChatMessages
- DisclaimerPopup, LanguageSelector, MainContent
- PageLayout, SEOHead, ThemeToggle

### Dashboard Components
- CalendarView, CaseManagement, DashboardOverview

---

## 7. Custom Hooks

| Hook | Purpose |
|------|---------|
| useLegalChat | AI chat state and messaging |
| useOpenAITTS | Text-to-speech with OpenAI |
| useBrowserTTS | Browser native TTS fallback |
| useElevenLabsTTS | ElevenLabs voice synthesis |
| useSpeechRecognition | Browser speech recognition |
| useWhisperRecognition | Whisper API transcription |
| useTextToSpeech | Unified TTS interface |
| useAuth | Authentication state |
| useInactivityPrompt | Inactivity detection |
| useMobileAudio | Mobile audio unlocking |
| useIsMobile | Responsive detection |
| useToast | Toast notifications |

---

## 8. Edge Functions

| Function | Purpose |
|----------|---------|
| legal-chat | AI legal assistant with BNS |
| text-to-speech | OpenAI TTS service |
| voice-to-text | Whisper transcription |
| elevenlabs-tts | ElevenLabs integration |
| murf-tts | Murf AI integration |
| bhashini-tts | Bhashini Indian languages |

---

*This project overview is part of the LegalCareAI Copyright & Trademark Filing Documentation.*
