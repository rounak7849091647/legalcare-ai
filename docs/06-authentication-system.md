# Authentication System

## User Authentication Documentation

---

## 1. Overview

LegalCareAI uses Supabase Authentication with email/password authentication. The system provides secure user registration, login, and session management.

---

## 2. Auth Configuration

### 2.1 Supabase Client Setup

```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY, 
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
```

---

## 3. Auth Page Implementation

### 3.1 Auth.tsx

```typescript
// src/pages/Auth.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard');
    });
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        toast.success('Signed in successfully');
        navigate('/dashboard');
      } else {
        // Sign Up
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        
        if (error) throw error;
        toast.success('Account created! Please check your email to verify.');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-xl border border-border">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <img src="/favicon.ico" alt="LegalCareAI" className="w-8 h-8" />
          <span className="text-lg font-semibold">LegalCareAI</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <Input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          )}
          
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
          </Button>
        </form>

        {/* Toggle */}
        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:underline"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
```

---

## 4. Auth State Management

### 4.1 useAuth Hook

```typescript
// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, signOut };
};
```

### 4.2 Sidebar Auth Integration

```typescript
// src/components/AppSidebar.tsx
const AppSidebar = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  return (
    <Sidebar>
      {/* ... content ... */}
      
      <SidebarFooter>
        {user ? (
          // Show user info and sign out button
          <>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {user.email?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{user.email}</span>
            </div>
            
            <SidebarMenuButton onClick={handleSignOut}>
              <LogOut /> Sign Out
            </SidebarMenuButton>
          </>
        ) : (
          // Show login button
          <SidebarMenuButton asChild>
            <Link to="/auth">
              <LogIn /> Login / Sign Up
            </Link>
          </SidebarMenuButton>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};
```

---

## 5. Protected Routes

### 5.1 Route Protection Pattern

```typescript
// Example: Dashboard protection
const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
      setLoading(false);
    });
  }, [navigate]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div>
      {/* Dashboard content */}
    </div>
  );
};
```

---

## 6. Profile Management

### 6.1 Auto Profile Creation

```sql
-- Database trigger for new users
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

### 6.2 Profile Fetch

```typescript
const fetchProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
};
```

---

## 7. Session Management

### 7.1 Session Persistence

```typescript
// Configured in client
{
  auth: {
    storage: localStorage,      // Store session in localStorage
    persistSession: true,       // Persist across page refreshes
    autoRefreshToken: true,     // Auto-refresh before expiry
  }
}
```

### 7.2 Token Refresh

Supabase automatically handles JWT token refresh. The client monitors token expiry and refreshes before it expires.

---

## 8. Security Considerations

### 8.1 Row Level Security

All user data is protected by RLS policies:

```sql
-- Users can only access their own data
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own cases"
  ON public.cases FOR SELECT
  USING (auth.uid() = user_id);
```

### 8.2 Password Requirements

- Minimum 6 characters
- Enforced by Supabase Auth

### 8.3 Email Verification

- Email verification is enabled by default
- Users must verify email before accessing protected features

---

*This authentication system documentation is part of the LegalCareAI Copyright & Trademark Filing Documentation.*
