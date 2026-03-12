# Security Implementation

## Security Documentation

---

## 1. Overview

LegalCareAI implements multiple security layers to protect user data and ensure platform integrity.

---

## 2. Authentication Security

### 2.1 Supabase Auth

- Industry-standard authentication via Supabase Auth (GoTrue)
- Email/password authentication with email verification
- JWT tokens for session management
- Automatic token refresh
- Secure password hashing (bcrypt)

### 2.2 Session Management

```typescript
// Client configuration
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,        // Secure storage
    persistSession: true,         // Maintain sessions
    autoRefreshToken: true,       // Auto-refresh before expiry
  }
});
```

### 2.3 Auth State Listener

```typescript
// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Clear sensitive data
    clearUserData();
  }
});
```

---

## 3. Database Security

### 3.1 Row Level Security (RLS)

All tables have RLS enabled with policies that restrict access to authenticated users' own data.

```sql
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Profile policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Cases policies
CREATE POLICY "Users can manage own cases"
  ON public.cases FOR ALL
  USING (auth.uid() = user_id);

-- Calendar events policies
CREATE POLICY "Users can manage own events"
  ON public.calendar_events FOR ALL
  USING (auth.uid() = user_id);

-- Conversations policies
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR ALL
  USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can view messages in own conversations"
  ON public.chat_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE user_id = auth.uid()
    )
  );
```

### 3.2 Data Isolation

Each user can only access their own:
- Profile information
- Legal cases
- Calendar events
- Chat conversations and messages

---

## 4. API Security

### 4.1 Edge Function Security

```typescript
// CORS configuration
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Handle CORS preflight
if (req.method === "OPTIONS") {
  return new Response(null, { headers: corsHeaders });
}
```

### 4.2 API Key Protection

All API keys are stored as environment secrets:

```toml
# supabase/config.toml
[functions.legal-chat]
verify_jwt = false  # JWT verification handled in code
```

```typescript
// Accessing secrets in edge functions
const API_KEY = Deno.env.get("LOVABLE_API_KEY");

if (!API_KEY) {
  throw new Error("API key not configured");
}
```

### 4.3 Secret Management

| Secret | Purpose | Access Level |
|--------|---------|--------------|
| LOVABLE_API_KEY | AI Gateway | Edge Functions |
| OPENAI_API_KEY | TTS/STT | Edge Functions |
| ELEVENLABS_API_KEY | TTS | Edge Functions |
| SUPABASE_SERVICE_ROLE_KEY | Admin | Edge Functions |

---

## 5. Input Validation

### 5.1 Client-Side Validation

```typescript
// Form validation with Zod
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
```

### 5.2 Server-Side Validation

```typescript
// Edge function input validation
serve(async (req) => {
  const { message, sessionId, detectedLanguage } = await req.json();
  
  // Validate required fields
  if (!message || typeof message !== 'string') {
    return new Response(
      JSON.stringify({ error: "Message is required" }),
      { status: 400, headers: corsHeaders }
    );
  }
  
  // Sanitize input
  const sanitizedMessage = message.trim().slice(0, 5000);
  
  // ... process
});
```

---

## 6. Rate Limiting

### 6.1 API Rate Limits

```typescript
// Handle rate limiting responses
if (response.status === 429) {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please wait." }),
    { status: 429, headers: corsHeaders }
  );
}
```

---

## 7. Data Protection

### 7.1 Sensitive Data Handling

- No plaintext password storage
- API keys never exposed to client
- User data isolated by RLS
- Secure HTTPS transport

### 7.2 Privacy Considerations

- Chat messages stored per-session
- Document content processed but not stored permanently
- User profiles minimal data collection

---

## 8. Error Handling

### 8.1 Secure Error Responses

```typescript
// Don't expose internal errors to users
try {
  // ... logic
} catch (error) {
  console.error("Internal error:", error);
  
  // Return generic error to client
  return new Response(
    JSON.stringify({ error: "An error occurred. Please try again." }),
    { status: 500, headers: corsHeaders }
  );
}
```

### 8.2 Logging

```typescript
// Log errors for debugging (not exposed to users)
console.error("Legal chat error:", {
  message: error.message,
  sessionId,
  timestamp: new Date().toISOString(),
});
```

---

## 9. Frontend Security

### 9.1 Content Security

- React's built-in XSS protection
- Escaped HTML in markdown rendering
- No dangerouslySetInnerHTML usage

### 9.2 Secure Storage

```typescript
// Theme preference - non-sensitive
localStorage.setItem('legalcare-theme', theme);

// Language preference - non-sensitive
localStorage.setItem('care-language-preference', code);

// Auth tokens - managed by Supabase
// Stored securely with autoRefreshToken
```

---

## 10. Security Best Practices

### 10.1 Implemented

- ✓ Row Level Security on all tables
- ✓ JWT-based authentication
- ✓ HTTPS encryption
- ✓ API key protection
- ✓ Input validation
- ✓ Error handling without exposure
- ✓ CORS configuration

### 10.2 Recommendations

- Regular security audits
- Penetration testing
- Dependency updates
- Security monitoring

---

*This security implementation documentation is part of the LegalCareAI Copyright & Trademark Filing Documentation.*
