import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Scale, Mail, Lock, User, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import SEOHead from '@/components/SEOHead';

const emailSchema = z.string().email('Please enter a valid email');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');

type AuthMode = 'login' | 'signup' | 'forgot';

const Auth = () => {
  const navigate = useNavigate();
  const { user, signUp, signIn, resetPassword, isLoading: authLoading } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Redirect if already logged in
  if (user && !authLoading) {
    navigate('/dashboard');
    return null;
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) newErrors.email = e.errors[0].message;
    }
    
    if (mode !== 'forgot') {
      try {
        passwordSchema.parse(password);
      } catch (e) {
        if (e instanceof z.ZodError) newErrors.password = e.errors[0].message;
      }
    }
    
    if (mode === 'signup') {
      try {
        nameSchema.parse(fullName);
      } catch (e) {
        if (e instanceof z.ZodError) newErrors.fullName = e.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors({});
    
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          setErrors({ form: error.message.includes('Invalid') ? 'Invalid email or password' : error.message });
        }
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          setErrors({ form: error.message.includes('already') ? 'This email is already registered' : error.message });
        }
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) {
          setErrors({ form: error.message });
        } else {
          setEmailSent(true);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrors({});
    setEmailSent(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Success state for forgot password
  if (mode === 'forgot' && emailSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-between p-4 sm:p-6">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <div className="flex items-center gap-2">
          <img src="/favicon.ico" alt="LegalCareAI" className="w-8 h-8" />
          <span className="text-lg font-semibold">LegalCareAI</span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-sm text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-green-500/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Check your email</h1>
            <p className="text-muted-foreground text-sm mb-6">
              We've sent a password reset link to <span className="text-foreground">{email}</span>
            </p>
            <Button
              onClick={() => switchMode('login')}
              variant="outline"
              className="w-full h-11"
            >
              Back to Sign In
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Sign In - LegalCareAI"
        description="Sign in or create an account to access LegalCareAI dashboard, manage cases, and get personalized legal assistance."
        canonicalUrl="/auth"
        noIndex={true}
      />
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 sm:p-6">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        <div className="flex items-center gap-2">
          <img src="/favicon.ico" alt="LegalCareAI" className="w-8 h-8" />
          <span className="text-lg font-semibold">LegalCareAI</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'forgot' && 'Reset Password'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {mode === 'login' && 'Sign in to continue'}
              {mode === 'signup' && 'Get started with LegalCareAI'}
              {mode === 'forgot' && 'Enter your email to reset password'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="pl-10 h-11 bg-muted/50 border-border"
                  />
                </div>
                {errors.fullName && <p className="text-destructive text-xs">{errors.fullName}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 h-11 bg-muted/50 border-border"
                />
              </div>
              {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-11 bg-muted/50 border-border"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-destructive text-xs">{errors.password}</p>}
              </div>
            )}

            {errors.form && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive text-sm">{errors.form}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-medium"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'forgot' && 'Send Reset Link'}
                </>
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="text-center mt-6 space-y-2">
            {mode === 'forgot' ? (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to Sign In
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">
                {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                  className="text-foreground font-medium hover:underline"
                >
                  {mode === 'login' ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
    </>
  );
};

export default Auth;
