# Core Features

## LegalCareAI Feature Documentation

---

## 1. AI Legal Assistant (CARE)

### 1.1 Overview

CARE (Conversational AI for Reliable Expertise) is the core AI assistant that provides legal guidance through natural conversation. It is trained on Indian law with specialized knowledge of BNS 2023.

### 1.2 Technical Implementation

#### Chat Hook (useLegalChat.ts)

```typescript
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  voiceContent?: string;
  timestamp: Date;
  language?: string;
  isDocumentSummary?: boolean;
}

interface LegalChatHook {
  messages: Message[];
  isLoading: boolean;
  sessionId: string;
  lastLanguage: string;
  lastVoiceResponse: string;
  documentContext: string | null;
  sendMessage: (message: string, detectedLanguage?: string, documentContent?: string) => Promise<void>;
  summarizeDocument: (documentContent: string, documentName: string, detectedLanguage?: string) => Promise<void>;
  clearMessages: () => void;
  setDocumentContext: (content: string | null) => void;
}

export const useLegalChat = (): LegalChatHook => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => 
    `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );

  const sendMessage = useCallback(async (
    message: string, 
    detectedLanguage: string = 'en-IN'
  ) => {
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
      language: detectedLanguage
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Stream response from edge function
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        message: message.trim(),
        sessionId,
        detectedLanguage,
        conversationHistory: formatMessagesForAI(currentMessages),
        stream: true
      }),
    });

    // Process streaming response
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Parse SSE events and update UI in real-time
      const chunk = decoder.decode(value);
      // ... process chunk
    }
  }, [messages, sessionId]);

  return { messages, isLoading, sendMessage, /* ... */ };
};
```

### 1.3 Features

1. **Real-time Streaming** - Responses appear word-by-word
2. **Multi-language Support** - 11 Indian languages
3. **Context Retention** - Maintains conversation history
4. **Document Analysis** - Can summarize uploaded documents
5. **BNS 2023 Knowledge** - Updated criminal law references
6. **Voice I/O** - Speak questions, hear answers

---

## 2. Voice Interaction System

### 2.1 Speech-to-Text

#### Browser Web Speech API
```typescript
// useSpeechRecognition.ts
export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || 
                               window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'hi-IN';

    recognitionRef.current.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      onTranscript(transcript);
    };
  }, []);

  const startListening = () => {
    recognitionRef.current?.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return { isListening, startListening, stopListening };
};
```

#### Whisper API Integration
```typescript
// useWhisperRecognition.ts
const transcribe = async (audioBlob: Blob) => {
  const { data, error } = await supabase.functions.invoke('voice-to-text', {
    body: { audio: base64Audio }
  });
  
  return data.transcript;
};
```

### 2.2 Text-to-Speech

#### OpenAI TTS
```typescript
// useOpenAITTS.ts
export const useOpenAITTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = async (text: string, language: string) => {
    setIsSpeaking(true);
    
    const { data, error } = await supabase.functions.invoke('text-to-speech', {
      body: { text, language }
    });

    if (data?.audio) {
      audioRef.current = new Audio(`data:audio/mp3;base64,${data.audio}`);
      audioRef.current.onended = () => setIsSpeaking(false);
      await audioRef.current.play();
    }
  };

  const stop = () => {
    audioRef.current?.pause();
    setIsSpeaking(false);
  };

  return { speak, stop, isSpeaking };
};
```

#### Browser TTS Fallback
```typescript
// useBrowserTTS.ts
export const useBrowserTTS = () => {
  const speak = (text: string, language: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  };

  return { speak };
};
```

---

## 3. Lawyer Directory

### 3.1 Features

- **10M+ Verified Lawyers** - Bar Council verified
- **State/City Filter** - All Indian states and cities
- **Practice Area Filter** - Criminal, Civil, Family, Corporate, etc.
- **Lawyer Profiles** - Ratings, reviews, experience
- **Contact Integration** - Direct contact functionality

### 3.2 Implementation

```typescript
// Lawyers.tsx
const Lawyers = () => {
  const [selectedState, setSelectedState] = useState('All States');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedPractice, setSelectedPractice] = useState('All Practice Areas');

  const filteredLawyers = useMemo(() => {
    return lawyers.filter(lawyer => {
      const matchesState = selectedState === 'All States' || 
                           lawyer.state === selectedState;
      const matchesCity = selectedCity === 'All Cities' || 
                          lawyer.city === selectedCity;
      const matchesPractice = selectedPractice === 'All Practice Areas' || 
                              lawyer.practiceAreas.includes(selectedPractice);
      return matchesState && matchesCity && matchesPractice;
    });
  }, [selectedState, selectedCity, selectedPractice]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredLawyers.map(lawyer => (
        <LawyerCard key={lawyer.id} lawyer={lawyer} />
      ))}
    </div>
  );
};
```

### 3.3 Data Structure

```typescript
interface Lawyer {
  id: string;
  name: string;
  state: string;
  city: string;
  practiceAreas: string[];
  barCouncil: string;
  experience: number;
  rating: number;
  reviews: number;
  verified: boolean;
}

// 75+ lawyers across all Indian states
export const lawyers: Lawyer[] = [
  {
    id: '1',
    name: 'Adv. Priya Sharma',
    state: 'Delhi',
    city: 'New Delhi',
    practiceAreas: ['Criminal Law', 'Civil Rights'],
    barCouncil: 'D/1234/2015',
    experience: 9,
    rating: 4.9,
    reviews: 156,
    verified: true
  },
  // ... more lawyers
];
```

---

## 4. Document Templates

### 4.1 Features

- **100+ Templates** - Legal document templates
- **Categories** - Property, Business, Employment, Legal, Family
- **Preview** - View before download
- **Copy to Clipboard** - Quick copy functionality
- **Download** - Save as text file

### 4.2 Template Categories

| Category | Templates |
|----------|-----------|
| Property | Rental Agreement, Sale Deed, Gift Deed, Commercial Lease |
| Business | NDA, Partnership Deed, Loan Agreement, Service Agreement |
| Employment | Employment Contract, Appointment Letter, Experience Letter, Termination Letter |
| Legal | Power of Attorney, Affidavit, Indemnity Bond, Legal Notice |
| Family | Will/Testament, Divorce Petition |

### 4.3 Implementation

```typescript
interface DocumentTemplate {
  id: number;
  name: string;
  downloads: string;
  rating: number;
  category: string;
  description: string;
  content: string;
}

const Documents = () => {
  const [selectedDocument, setSelectedDocument] = useState<DocumentTemplate | null>(null);

  const handleCopy = async (doc: DocumentTemplate) => {
    await navigator.clipboard.writeText(doc.content);
    toast.success('Document copied to clipboard!');
  };

  const handleDownload = (doc: DocumentTemplate) => {
    const blob = new Blob([doc.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name.replace(/\s+/g, '_')}.txt`;
    a.click();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map(doc => (
        <DocumentCard 
          key={doc.id}
          document={doc}
          onPreview={() => setSelectedDocument(doc)}
          onCopy={() => handleCopy(doc)}
          onDownload={() => handleDownload(doc)}
        />
      ))}
    </div>
  );
};
```

---

## 5. Tax Services

### 5.1 Service Modules

| Service | Route | Description |
|---------|-------|-------------|
| File Return | /tax-services/file-return | DIY ITR filing |
| Upload Form 16 | /tax-services/upload-form16 | Auto-fill from Form 16 |
| CA-Assisted Filing | /tax-services/ca-filing | Expert CA assistance |
| Tax Planning | /tax-services/tax-planning | Tax saving strategies |
| Refund Status | /tax-services/refund-status | Track refund status |
| TDS Solution | /tax-services/tds-solution | TDS certificates & filings |
| NRI Taxes | /tax-services/nri-taxes | Non-resident tax services |
| Tax Advisory | /tax-services/tax-advisory | Expert consultation |
| Capital Gains | /tax-services/capital-gains | Investment tax calculation |
| Tax Notices | /tax-services/tax-notices | Notice response help |
| Connect Expert | /tax-services/connect-expert | Expert matching |

### 5.2 Implementation

```typescript
// TaxServices.tsx
const taxServices = [
  {
    icon: FileText,
    title: 'File ITR',
    description: 'File your Income Tax Return online',
    path: '/tax-services/file-return',
  },
  {
    icon: Upload,
    title: 'Upload Form 16',
    description: 'Auto-fill ITR from Form 16',
    path: '/tax-services/upload-form16',
  },
  // ... more services
];

const TaxServices = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {taxServices.map((service, index) => (
      <Link 
        key={index} 
        to={service.path}
        className="bg-card border border-border rounded-xl p-6 hover:bg-accent"
      >
        <service.icon className="w-8 h-8 text-primary mb-4" />
        <h3 className="font-semibold">{service.title}</h3>
        <p className="text-muted-foreground text-sm">{service.description}</p>
      </Link>
    ))}
  </div>
);
```

---

## 6. User Dashboard

### 6.1 Dashboard Overview

```typescript
// DashboardOverview.tsx
const DashboardOverview = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    // Fetch user data
    const fetchData = async () => {
      const { data: casesData } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });
      
      const { data: eventsData } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', new Date().toISOString());
      
      setCases(casesData || []);
      setEvents(eventsData || []);
    };
    fetchData();
  }, []);

  return (
    <div className="grid gap-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Active Cases" value={activeCases.length} />
        <StatCard title="Upcoming Hearings" value={upcomingEvents.length} />
        <StatCard title="Closed Cases" value={closedCases.length} />
      </div>
      
      {/* Recent cases */}
      <CaseList cases={cases.slice(0, 5)} />
      
      {/* Upcoming events */}
      <EventList events={events.slice(0, 5)} />
    </div>
  );
};
```

### 6.2 Case Management

```typescript
// CaseManagement.tsx
const CaseManagement = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleCreateCase = async (formData: CaseFormData) => {
    const { data, error } = await supabase
      .from('cases')
      .insert({
        user_id: user.id,
        ...formData
      })
      .select()
      .single();

    if (data) {
      setCases([data, ...cases]);
      setIsCreateDialogOpen(false);
      toast.success('Case created successfully');
    }
  };

  return (
    <div>
      <Button onClick={() => setIsCreateDialogOpen(true)}>
        Add New Case
      </Button>
      
      <CaseTable 
        cases={cases}
        onEdit={handleEditCase}
        onDelete={handleDeleteCase}
      />
      
      <CreateCaseDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateCase}
      />
    </div>
  );
};
```

### 6.3 Calendar View

```typescript
// CalendarView.tsx
const CalendarView = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Calendar
        selected={selectedDate}
        onSelect={setSelectedDate}
        modifiers={{
          hasEvents: events.map(e => new Date(e.start_time))
        }}
      />
      
      <EventList
        events={events.filter(e => 
          isSameDay(new Date(e.start_time), selectedDate)
        )}
      />
    </div>
  );
};
```

---

*This core features documentation is part of the LegalCareAI Copyright & Trademark Filing Documentation.*
