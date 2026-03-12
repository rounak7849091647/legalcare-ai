# Database Schema

## Complete Database Structure Documentation

---

## 1. Overview

LegalCareAI uses PostgreSQL as its primary database, managed through Supabase. The database implements Row Level Security (RLS) for data protection and includes automatic triggers for timestamp management.

---

## 2. Tables

### 2.1 profiles

Stores user profile information linked to authentication.

```sql
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

**TypeScript Type:**
```typescript
interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}
```

---

### 2.2 cases

Stores legal case information for case management.

```sql
CREATE TABLE public.cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  case_number TEXT,
  case_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT,
  client_name TEXT,
  opposing_party TEXT,
  court_name TEXT,
  next_hearing_date TIMESTAMP WITH TIME ZONE,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own cases"
  ON public.cases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cases"
  ON public.cases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cases"
  ON public.cases FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cases"
  ON public.cases FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_cases_user_id ON public.cases(user_id);
CREATE INDEX idx_cases_status ON public.cases(status);
CREATE INDEX idx_cases_next_hearing ON public.cases(next_hearing_date);
```

**TypeScript Type:**
```typescript
interface Case {
  id: string;
  user_id: string;
  title: string;
  case_number: string | null;
  case_type: string;
  status: string;
  priority: string | null;
  client_name: string | null;
  opposing_party: string | null;
  court_name: string | null;
  next_hearing_date: string | null;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

**Case Types:**
- Criminal
- Civil
- Family
- Property
- Corporate
- Labour
- Consumer
- Tax

**Status Values:**
- active
- pending
- closed
- on_hold

**Priority Levels:**
- high
- medium
- low

---

### 2.3 calendar_events

Stores calendar events for case-related hearings and appointments.

```sql
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  event_type TEXT,
  location TEXT,
  is_all_day BOOLEAN DEFAULT false,
  reminder_before INTEGER, -- minutes before event
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own events"
  ON public.calendar_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own events"
  ON public.calendar_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
  ON public.calendar_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
  ON public.calendar_events FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_events_user_id ON public.calendar_events(user_id);
CREATE INDEX idx_events_start_time ON public.calendar_events(start_time);
CREATE INDEX idx_events_case_id ON public.calendar_events(case_id);
```

**TypeScript Type:**
```typescript
interface CalendarEvent {
  id: string;
  user_id: string;
  case_id: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  event_type: string | null;
  location: string | null;
  is_all_day: boolean | null;
  reminder_before: number | null;
  created_at: string;
  updated_at: string;
}
```

**Event Types:**
- hearing
- meeting
- deadline
- reminder
- consultation

---

### 2.4 conversations

Stores chat conversation sessions.

```sql
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_session_id ON public.conversations(session_id);
```

**TypeScript Type:**
```typescript
interface Conversation {
  id: string;
  user_id: string;
  session_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}
```

---

### 2.5 chat_messages

Stores individual chat messages within conversations.

```sql
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  voice_content TEXT, -- Original voice content (for TTS)
  language TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view messages in own conversations"
  ON public.chat_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.chat_messages(created_at);
```

**TypeScript Type:**
```typescript
interface ChatMessage {
  id: string;
  conversation_id: string;
  role: string; // 'user' | 'assistant'
  content: string;
  voice_content: string | null;
  language: string | null;
  created_at: string;
}
```

---

## 3. Database Functions

### 3.1 update_updated_at_column()

Automatically updates the `updated_at` timestamp on row updates.

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
```

---

### 3.2 handle_new_user()

Creates a profile when a new user signs up.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## 4. Generated Types

The Supabase client types are auto-generated in `src/integrations/supabase/types.ts`:

```typescript
export type Database = {
  public: {
    Tables: {
      calendar_events: {
        Row: {
          case_id: string | null;
          created_at: string;
          description: string | null;
          end_time: string | null;
          event_type: string | null;
          id: string;
          is_all_day: boolean | null;
          location: string | null;
          reminder_before: number | null;
          start_time: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: { /* ... */ };
        Update: { /* ... */ };
        Relationships: [
          {
            foreignKeyName: "calendar_events_case_id_fkey";
            columns: ["case_id"];
            referencedRelation: "cases";
            referencedColumns: ["id"];
          }
        ];
      };
      cases: {
        Row: { /* ... */ };
        Insert: { /* ... */ };
        Update: { /* ... */ };
      };
      chat_messages: {
        Row: { /* ... */ };
        Insert: { /* ... */ };
        Update: { /* ... */ };
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          }
        ];
      };
      conversations: {
        Row: { /* ... */ };
        Insert: { /* ... */ };
        Update: { /* ... */ };
      };
      profiles: {
        Row: { /* ... */ };
        Insert: { /* ... */ };
        Update: { /* ... */ };
      };
    };
  };
};
```

---

## 5. Database Client Usage

```typescript
// Import the Supabase client
import { supabase } from "@/integrations/supabase/client";

// Query examples

// Get user profile
const { data: profile, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId)
  .single();

// Get user cases
const { data: cases, error } = await supabase
  .from('cases')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });

// Create a case
const { data: newCase, error } = await supabase
  .from('cases')
  .insert({
    user_id: userId,
    title: 'Property Dispute',
    case_type: 'Property',
    status: 'active',
    priority: 'high'
  })
  .select()
  .single();

// Update a case
const { error } = await supabase
  .from('cases')
  .update({ status: 'closed' })
  .eq('id', caseId);

// Get calendar events with case details
const { data: events, error } = await supabase
  .from('calendar_events')
  .select(`
    *,
    case:cases(title, case_number)
  `)
  .eq('user_id', userId)
  .gte('start_time', startDate)
  .lte('start_time', endDate);
```

---

*This database schema documentation is part of the LegalCareAI Copyright & Trademark Filing Documentation.*
