# System Architecture

## LegalCareAI Technical Architecture Documentation

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    React SPA (Single Page App)                    │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐  │   │
│  │  │   Pages     │ │ Components  │ │   Hooks     │ │  Contexts  │  │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            API GATEWAY                                   │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     Supabase Client SDK                           │   │
│  │  • Authentication   • Database Queries   • Edge Functions         │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌──────────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐
│    EDGE FUNCTIONS    │ │    DATABASE      │ │      AI GATEWAY          │
│  ┌────────────────┐  │ │  ┌────────────┐  │ │  ┌──────────────────┐    │
│  │  legal-chat    │  │ │  │  profiles  │  │ │  │ Gemini 2.5 Flash │    │
│  │  text-to-speech│  │ │  │  cases     │  │ │  └──────────────────┘    │
│  │  voice-to-text │  │ │  │  events    │  │ │  ┌──────────────────┐    │
│  │  elevenlabs-tts│  │ │  │  messages  │  │ │  │  OpenAI Whisper  │    │
│  │  murf-tts      │  │ │  │  convo     │  │ │  └──────────────────┘    │
│  │  bhashini-tts  │  │ │  └────────────┘  │ │  ┌──────────────────┐    │
│  └────────────────┘  │ │                  │ │  │    OpenAI TTS    │    │
└──────────────────────┘ └──────────────────┘ └──────────────────────────┘
```

---

## 2. Component Architecture

### 2.1 React Component Hierarchy

```
<App>
├── <ThemeProvider>
│   └── <LanguageProvider>
│       └── <QueryClientProvider>
│           └── <BrowserRouter>
│               └── <Routes>
│                   ├── <Index>
│                   │   ├── <SEOHead />
│                   │   ├── <SidebarProvider>
│                   │   │   ├── <AppSidebar />
│                   │   │   └── <SidebarInset>
│                   │   │       ├── <ChatHeader />
│                   │   │       └── <MainContent>
│                   │   │           ├── <AiOrb />
│                   │   │           ├── <ChatMessages />
│                   │   │           └── <ChatInput />
│                   │   └── <DisclaimerPopup />
│                   ├── <Auth />
│                   ├── <Dashboard>
│                   │   ├── <DashboardOverview />
│                   │   ├── <CaseManagement />
│                   │   └── <CalendarView />
│                   ├── <Documents />
│                   ├── <Lawyers />
│                   ├── <TaxServices />
│                   ├── <Community />
│                   └── <Discussion />
```

### 2.2 State Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           GLOBAL STATE                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐   │
│  │   ThemeContext   │  │ LanguageContext  │  │  QueryClient Cache   │   │
│  │   - theme        │  │ - currentLang    │  │  - server state      │   │
│  │   - toggleTheme  │  │ - setLanguage    │  │  - cached queries    │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          COMPONENT STATE                                 │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     useLegalChat Hook                             │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │   │
│  │  │  messages   │ │  isLoading  │ │  sessionId  │ │ lastLanguage│ │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │   │
│  │                                                                   │   │
│  │  ┌───────────────────────────────────────────────────────────┐   │   │
│  │  │  Functions: sendMessage, summarizeDocument, clearMessages  │   │   │
│  │  └───────────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow Architecture

### 3.1 Chat Message Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│ USER INPUT                                                                │
│ ┌─────────────────┐                                                       │
│ │ Voice / Text    │                                                       │
│ └────────┬────────┘                                                       │
│          │                                                                │
│          ▼                                                                │
│ ┌─────────────────┐      ┌─────────────────┐                              │
│ │ Language Detect │─────▶│ Message Format  │                              │
│ └─────────────────┘      └────────┬────────┘                              │
│                                   │                                       │
└───────────────────────────────────┼───────────────────────────────────────┘
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ EDGE FUNCTION: legal-chat                                                 │
│ ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐    │
│ │ BNS Knowledge   │─────▶│ Build Prompt    │─────▶│ AI Gateway      │    │
│ │ Base            │      │ with Context    │      │ (Gemini)        │    │
│ └─────────────────┘      └─────────────────┘      └────────┬────────┘    │
│                                                             │             │
│                          ┌──────────────────────────────────┘             │
│                          ▼                                                │
│               ┌─────────────────┐                                         │
│               │ Stream Response │─────────────────────────────────────────│
│               │ (SSE Events)    │                                         │
│               └─────────────────┘                                         │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ CLIENT RESPONSE HANDLING                                                  │
│ ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐    │
│ │ Parse SSE       │─────▶│ Update UI       │─────▶│ Auto TTS        │    │
│ │ Chunks          │      │ (Real-time)     │      │ Playback        │    │
│ └─────────────────┘      └─────────────────┘      └─────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Voice Processing Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│ VOICE INPUT                                                               │
│ ┌─────────────────┐                                                       │
│ │ Microphone      │                                                       │
│ └────────┬────────┘                                                       │
│          │                                                                │
│          ▼                                                                │
│ ┌─────────────────┐      ┌─────────────────┐                              │
│ │ Web Speech API  │ OR   │ Whisper API     │                              │
│ │ (Browser)       │      │ (Edge Function) │                              │
│ └────────┬────────┘      └────────┬────────┘                              │
│          │                        │                                       │
│          └───────────┬────────────┘                                       │
│                      ▼                                                    │
│          ┌─────────────────┐                                              │
│          │ Transcript Text │                                              │
│          │ + Language Code │                                              │
│          └────────┬────────┘                                              │
│                   │                                                       │
└───────────────────┼───────────────────────────────────────────────────────┘
                    ▼
          ┌─────────────────┐
          │ Chat Pipeline   │
          │ (Same as text)  │
          └────────┬────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ VOICE OUTPUT                                                              │
│          ┌─────────────────┐                                              │
│          │ AI Response     │                                              │
│          └────────┬────────┘                                              │
│                   │                                                       │
│          ┌───────────────────────────────────────┐                        │
│          ▼                        ▼              ▼                        │
│ ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐          │
│ │ OpenAI TTS      │   │ ElevenLabs TTS  │   │ Browser TTS     │          │
│ │ (Primary)       │   │ (Alternative)   │   │ (Fallback)      │          │
│ └────────┬────────┘   └────────┬────────┘   └────────┬────────┘          │
│          │                     │                     │                    │
│          └───────────────┬─────┴─────────────────────┘                    │
│                          ▼                                                │
│               ┌─────────────────┐                                         │
│               │ Audio Playback  │                                         │
│               └─────────────────┘                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Database Architecture

### 4.1 Entity Relationship Diagram

```
┌─────────────────────┐
│     auth.users      │
│─────────────────────│
│ id (UUID) PK        │
│ email               │
│ encrypted_password  │
│ created_at          │
└─────────┬───────────┘
          │
          │ 1:1
          ▼
┌─────────────────────┐
│      profiles       │
│─────────────────────│
│ id (UUID) PK        │
│ user_id FK ──────────────┐
│ full_name           │    │
│ email               │    │
│ phone               │    │
│ avatar_url          │    │
│ created_at          │    │
│ updated_at          │    │
└─────────────────────┘    │
                           │
┌─────────────────────┐    │
│       cases         │    │
│─────────────────────│    │
│ id (UUID) PK        │    │ 1:N
│ user_id FK ──────────────┤
│ title               │    │
│ case_number         │    │
│ case_type           │    │
│ status              │    │
│ priority            │    │
│ client_name         │    │
│ opposing_party      │    │
│ court_name          │    │
│ next_hearing_date   │    │
│ description         │    │
│ notes               │    │
│ created_at          │    │
│ updated_at          │    │
└─────────┬───────────┘    │
          │                │
          │ 1:N            │
          ▼                │
┌─────────────────────┐    │
│   calendar_events   │    │
│─────────────────────│    │
│ id (UUID) PK        │    │
│ user_id FK ──────────────┤
│ case_id FK          │    │
│ title               │    │
│ description         │    │
│ start_time          │    │
│ end_time            │    │
│ event_type          │    │
│ location            │    │
│ is_all_day          │    │
│ reminder_before     │    │
│ created_at          │    │
│ updated_at          │    │
└─────────────────────┘    │
                           │
┌─────────────────────┐    │
│    conversations    │    │
│─────────────────────│    │
│ id (UUID) PK        │    │ 1:N
│ user_id FK ──────────────┤
│ session_id          │    │
│ title               │    │
│ created_at          │    │
│ updated_at          │    │
└─────────┬───────────┘    │
          │                │
          │ 1:N            │
          ▼                │
┌─────────────────────┐    │
│    chat_messages    │    │
│─────────────────────│    │
│ id (UUID) PK        │    │
│ conversation_id FK  │    │
│ role                │    │
│ content             │    │
│ voice_content       │    │
│ language            │    │
│ created_at          │    │
└─────────────────────┘    │
```

### 4.2 Row Level Security Policies

```sql
-- profiles table
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- cases table
CREATE POLICY "Users can manage own cases"
  ON public.cases FOR ALL
  USING (auth.uid() = user_id);

-- calendar_events table
CREATE POLICY "Users can manage own events"
  ON public.calendar_events FOR ALL
  USING (auth.uid() = user_id);

-- conversations table
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

-- chat_messages table
CREATE POLICY "Users can view messages in own conversations"
  ON public.chat_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );
```

---

## 5. Security Architecture

### 5.1 Authentication Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│ AUTHENTICATION FLOW                                                       │
│                                                                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                   │
│  │   Client    │───▶│  Supabase   │───▶│  PostgreSQL │                   │
│  │   (React)   │    │    Auth     │    │  auth.users │                   │
│  └─────────────┘    └─────────────┘    └─────────────┘                   │
│        │                  │                   │                          │
│        │                  │                   │                          │
│        ▼                  ▼                   ▼                          │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │                     JWT TOKEN                                    │     │
│  │  {                                                               │     │
│  │    "sub": "user-uuid",                                          │     │
│  │    "email": "user@example.com",                                 │     │
│  │    "role": "authenticated",                                     │     │
│  │    "exp": 1234567890                                            │     │
│  │  }                                                               │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│        │                                                                 │
│        │ Stored in localStorage                                          │
│        │ Auto-refresh on expiry                                          │
│        │                                                                 │
│        ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │                  API REQUESTS                                    │     │
│  │  Authorization: Bearer <jwt-token>                               │     │
│  └─────────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.2 API Security

```
┌──────────────────────────────────────────────────────────────────────────┐
│ EDGE FUNCTION SECURITY                                                    │
│                                                                           │
│  ┌─────────────────┐                                                      │
│  │ Incoming Request│                                                      │
│  └────────┬────────┘                                                      │
│           │                                                               │
│           ▼                                                               │
│  ┌─────────────────┐     ┌─────────────────┐                              │
│  │  CORS Headers   │────▶│  Rate Limiting  │                              │
│  └─────────────────┘     └────────┬────────┘                              │
│                                   │                                       │
│                                   ▼                                       │
│                          ┌─────────────────┐                              │
│                          │ Input Validation│                              │
│                          └────────┬────────┘                              │
│                                   │                                       │
│                                   ▼                                       │
│                          ┌─────────────────┐                              │
│                          │ Secret Keys     │                              │
│                          │ (env variables) │                              │
│                          └─────────────────┘                              │
│                                   │                                       │
│ Secrets:                          │                                       │
│ - LOVABLE_API_KEY                 │                                       │
│ - OPENAI_API_KEY                  │                                       │
│ - ELEVENLABS_API_KEY              │                                       │
│ - SUPABASE_SERVICE_ROLE_KEY       │                                       │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Deployment Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          LOVABLE CLOUD                                    │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │                        CDN LAYER                                 │     │
│  │  • Static assets (JS, CSS, images)                               │     │
│  │  • Global edge caching                                           │     │
│  │  • SSL/TLS termination                                           │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                              │                                           │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │                    APPLICATION LAYER                             │     │
│  │  • React SPA served                                              │     │
│  │  • Route handling (client-side)                                  │     │
│  │  • Preview & Production environments                             │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                              │                                           │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │                     SUPABASE LAYER                               │     │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │     │
│  │  │   Database    │  │ Edge Functions│  │ Auth Service  │        │     │
│  │  │  (PostgreSQL) │  │    (Deno)     │  │   (GoTrue)    │        │     │
│  │  └───────────────┘  └───────────────┘  └───────────────┘        │     │
│  └─────────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

*This system architecture documentation is part of the LegalCareAI Copyright & Trademark Filing Documentation.*
