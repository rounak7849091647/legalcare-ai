import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { invokeFunction } from '@/lib/api';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Mail, Lock, User, ArrowLeft, Eye, EyeOff,
  CheckCircle, Loader2, XCircle, Check, ShieldCheck,
} from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import { toast } from 'sonner';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

// ─── Validators ────────────────────────────────────────────────────────────
const isValidEmailFormat = (e: string) => /^[^\s@]+@[^\s@]{1,253}\.[^\s@]{2,}$/.test(e);
// Must match Cognito pool policy: ≥8 chars, uppercase, lowercase, number, symbol
const isValidPassword = (p: string) =>
  p.length >= 8 &&
  /[A-Z]/.test(p) &&
  /[a-z]/.test(p) &&
  /[0-9]/.test(p) &&
  /[^A-Za-z0-9]/.test(p);
const isValidName = (n: string) => n.trim().length >= 2;

// ─── Password strength ──────────────────────────────────────────────────────
const getStrength = (pwd: string) => {
  if (!pwd) return null;
  let s = 0;
  if (pwd.length >= 8)          s++;
  if (/[A-Z]/.test(pwd))        s++;
  if (/[0-9]/.test(pwd))        s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  if (s <= 1) return { label: 'Weak',   score: s, bar: 'bg-red-500',    text: 'text-red-500' };
  if (s === 2) return { label: 'Fair',   score: s, bar: 'bg-yellow-500', text: 'text-yellow-500' };
  if (s === 3) return { label: 'Good',   score: s, bar: 'bg-blue-500',   text: 'text-blue-500' };
  return              { label: 'Strong', score: s, bar: 'bg-green-500',  text: 'text-green-500' };
};

type AuthMode   = 'login' | 'signup' | 'forgot';
type EmailStatus = 'idle' | 'checking' | 'valid' | 'invalid';

// ─── Shared page shell ───────────────────────────────────────────��─────────
const PageShell = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between p-4 sm:p-6">
        <button onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /><span className="text-sm">Back</span>
        </button>
        <div className="flex items-center gap-2">
          <img src="/favicon.ico" alt="LegalCareAI" className="w-8 h-8" />
          <span className="text-lg font-semibold">LegalCareAI</span>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-8">{children}</main>
    </div>
  );
};

// ─── 6-digit OTP input ──────────────────────────────────────────────────────
const OTPInput = ({
  value, onChange, disabled,
}: { value: string; onChange: (v: string) => void; disabled?: boolean }) => {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, '').split('').slice(0, 6);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = digits.map((d, idx) => (idx === i ? '' : d)).join('').trimEnd();
      onChange(next.padEnd(i > 0 && !digits[i] ? i - 1 : i, next).slice(0, 6));
      if (!digits[i] && i > 0) refs.current[i - 1]?.focus();
    }
  };

  const handleChange = (i: number, raw: string) => {
    const ch = raw.replace(/\D/g, '').slice(-1);
    const next = digits.map((d, idx) => (idx === i ? ch : d)).join('');
    onChange(next);
    if (ch && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) { onChange(pasted); refs.current[Math.min(pasted.length, 5)]?.focus(); }
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ''}
          disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onFocus={e => e.target.select()}
          className={`w-11 h-14 text-center text-xl font-bold rounded-lg border-2 bg-muted/50
            transition-colors outline-none
            ${digits[i] ? 'border-primary text-foreground' : 'border-border text-muted-foreground'}
            focus:border-primary focus:ring-2 focus:ring-primary/20
            disabled:opacity-50 disabled:cursor-not-allowed`}
        />
      ))}
    </div>
  );
};

// ─── Main Auth component ───────────────────────────────────────────────────
const Auth = () => {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signUp, signIn, signInWithGoogle, resetPassword, confirmPasswordReset, sendOTP, verifyOTP, isLoading: authLoading } = useAuth();

  const [mode, setMode]           = useState<AuthMode>('login');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [fullName, setFullName]   = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  // Signup OTP screen
  const [otpScreen, setOtpScreen]   = useState(false);
  const [otpEmail, setOtpEmail]     = useState('');
  const [otpUserId, setOtpUserId]   = useState('');
  const [otpCode, setOtpCode]       = useState('');
  const [otpError, setOtpError]     = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  // Store password for auto-login after OTP (in ref so no re-render)
  const passwordForOTP = useRef('');

  // Forgot-password OTP screen
  const [resetSent, setResetSent]           = useState(false);
  const [resetOtpScreen, setResetOtpScreen] = useState(false);
  const [resetOtpCode, setResetOtpCode]     = useState('');
  const [resetNewPwd, setResetNewPwd]       = useState('');
  const [resetEmail, setResetEmail]         = useState('');
  const [resetOtpError, setResetOtpError]   = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Real-time email validation
  const [emailStatus, setEmailStatus]   = useState<EmailStatus>('idle');
  const [emailMessage, setEmailMessage] = useState('');
  const validationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // "Email verified!" toast when user returns via email link
  useEffect(() => {
    if (searchParams.get('verified') === '1') {
      toast.success('Email verified! You can now sign in.', { duration: 5000 });
      setMode('login');
    }
  }, [searchParams]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Real-time email validation (debounced 600 ms)
  useEffect(() => {
    if (validationTimer.current) clearTimeout(validationTimer.current);
    if (!email) { setEmailStatus('idle'); setEmailMessage(''); return; }
    if (!isValidEmailFormat(email)) {
      setEmailStatus('invalid'); setEmailMessage('Please enter a valid email address.'); return;
    }
    setEmailStatus('checking'); setEmailMessage('');
    validationTimer.current = setTimeout(async () => {
      try {
        const { data } = await invokeFunction('validate-email', { body: { email } });
        if (data?.valid) { setEmailStatus('valid'); setEmailMessage(''); }
        else { setEmailStatus('invalid'); setEmailMessage(data?.reason || 'Could not verify this email.'); }
      } catch {
        setEmailStatus('valid'); setEmailMessage(''); // don't block if endpoint is down
      }
    }, 600);
    return () => { if (validationTimer.current) clearTimeout(validationTimer.current); };
  }, [email]);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode); setFormError(''); setFieldErrors({});
    setResetSent(false); setOtpScreen(false);
  };

  // Redirect already-verified users
  if (user && user.emailVerified && !authLoading) { navigate('/dashboard'); return null; }

  // ── Form submit ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(''); setFieldErrors({});

    const errs: Record<string, string> = {};
    if (!email) errs.email = 'Email is required.';
    else if (!isValidEmailFormat(email)) errs.email = 'Please enter a valid email.';
    if (mode !== 'forgot') {
      if (!password) errs.password = 'Password is required.';
      // Only enforce strict password policy for signup. For login, accept any
      // non-empty password and let Cognito decide — otherwise users whose stored
      // password predates the current policy are blocked at the client.
      else if (mode === 'signup' && !isValidPassword(password)) errs.password = 'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.';
    }
    if (mode === 'signup') {
      if (!fullName.trim()) errs.fullName = 'Name is required.';
      else if (!isValidName(fullName)) errs.fullName = 'Name must be at least 2 characters.';
    }
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    // Email-status gating only applies to signup. Login must always be allowed
    // to reach Cognito — the user already has an account; the third-party
    // validate-email check can return false-negatives we must not honor here.
    if (mode === 'signup') {
      if (emailStatus === 'checking') { setFormError('Please wait — verifying your email address.'); return; }
      if (emailStatus === 'invalid')  { setFormError(emailMessage || 'Please enter a valid email.'); return; }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          const msg = error.message;
          if (msg.startsWith('EMAIL_NOT_VERIFIED:')) setFormError(msg.replace('EMAIL_NOT_VERIFIED: ', ''));
          else if (/invalid|credential|password/i.test(msg)) setFormError('Incorrect email or password. Please try again.');
          else setFormError(msg);
        }

      } else if (mode === 'signup') {
        const { error, userId, emailError } = await signUp(email, password, fullName);
        if (error) {
          const msg = error.message;
          if (/already registered|already exists/i.test(msg)) setFormError('This email is already registered. Try signing in.');
          else setFormError(msg);
        } else {
          // Account created. Show OTP screen. If the verification email failed to
          // send, tell the user and let them resend immediately (no cooldown).
          passwordForOTP.current = password;
          setOtpEmail(email);
          setOtpUserId(userId || '');
          setOtpCode('');
          setOtpError(emailError ? 'We couldn’t send your code. Tap “Resend code” to try again.' : '');
          setOtpScreen(true);
          setResendCooldown(emailError ? 0 : 60);
        }

      } else {
        const { error } = await resetPassword(email);
        if (error) setFormError(error.message);
        else {
          // Show OTP + new-password screen
          setResetEmail(email);
          setResetOtpCode('');
          setResetNewPwd('');
          setResetOtpError('');
          setResetOtpScreen(true);
          setResendCooldown(60);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── OTP verify ───────────────────────────────���─────────────────────────
  const handleVerifyOTP = async () => {
    if (otpCode.length < 6) { setOtpError('Please enter all 6 digits.'); return; }
    setOtpError('');
    setOtpVerifying(true);
    const { error } = await verifyOTP(otpEmail, otpCode, passwordForOTP.current);
    setOtpVerifying(false);
    if (error) setOtpError(error.message);
  };

  // ── Resend OTP ─────────────────────────────────────────────────────────
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setResendLoading(true);
    const { error } = await sendOTP(otpEmail, otpUserId);
    setResendLoading(false);
    if (error) { toast.error('Could not resend code. Please try again.'); }
    else { toast.success('New verification code sent!'); setOtpCode(''); setResendCooldown(60); }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // ── OTP verification screen ───────────────────────────────────────────
  if (otpScreen) {
    return (
      <PageShell>
        <div className="w-full max-w-sm mx-auto text-center space-y-6">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Verify your email</h1>
            <p className="text-muted-foreground text-sm">
              We sent a 6-digit code to
            </p>
            <p className="text-foreground font-semibold text-sm mt-1">{otpEmail}</p>
          </div>

          {/* 6-digit OTP boxes */}
          <OTPInput value={otpCode} onChange={v => { setOtpCode(v); setOtpError(''); }} disabled={otpVerifying} />

          {/* OTP error */}
          {otpError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-left">
              <p className="text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4 flex-shrink-0" />{otpError}
              </p>
            </div>
          )}

          {/* Verify button */}
          <Button
            onClick={handleVerifyOTP}
            disabled={otpCode.length < 6 || otpVerifying}
            className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-medium"
          >
            {otpVerifying
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</>
              : <><Check className="w-4 h-4 mr-2" />Verify &amp; Sign In</>
            }
          </Button>

          {/* Resend */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Did not receive it? Check spam/junk folder.</p>
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={resendCooldown > 0 || resendLoading}
              className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed"
            >
              {resendLoading
                ? 'Sending…'
                : resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : 'Resend verification code'
              }
            </button>
          </div>

          {/* Back */}
          <button
            type="button"
            onClick={() => { setOtpScreen(false); setOtpCode(''); setOtpError(''); }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Sign Up
          </button>
        </div>
      </PageShell>
    );
  }

  // ── Forgot-password OTP + new password ───────────────────────────────
  if (resetOtpScreen) {
    const handleConfirmReset = async () => {
      if (resetOtpCode.length < 6)    { setResetOtpError('Please enter all 6 digits.'); return; }
      if (!isValidPassword(resetNewPwd)) { setResetOtpError('Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.'); return; }
      setResetSubmitting(true);
      const { error } = await confirmPasswordReset(resetEmail, resetOtpCode, resetNewPwd);
      setResetSubmitting(false);
      if (error) setResetOtpError(error.message);
    };
    const handleResendReset = async () => {
      if (resendCooldown > 0) return;
      setResendLoading(true);
      const { error } = await resetPassword(resetEmail);
      setResendLoading(false);
      if (!error) { toast.success('New code sent!'); setResetOtpCode(''); setResendCooldown(60); }
      else toast.error('Could not resend code. Please try again.');
    };

    return (
      <PageShell>
        <div className="w-full max-w-sm mx-auto text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold mb-2">Reset your password</h1>
            <p className="text-muted-foreground text-sm">We sent a 6-digit code to</p>
            <p className="font-semibold text-sm mt-1">{resetEmail}</p>
          </div>
          <OTPInput value={resetOtpCode} onChange={v => { setResetOtpCode(v); setResetOtpError(''); }} disabled={resetSubmitting} />
          <div className="space-y-1.5 text-left">
            <label className="text-sm font-medium text-foreground">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type={showPassword ? 'text' : 'password'} value={resetNewPwd}
                onChange={e => { setResetNewPwd(e.target.value); setResetOtpError(''); }}
                placeholder="Min 8 chars, uppercase, number, symbol"
                className="pl-10 pr-10 h-11 bg-muted/50 border-border" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {resetOtpError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-left">
              <p className="text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4 flex-shrink-0" />{resetOtpError}
              </p>
            </div>
          )}
          <Button onClick={handleConfirmReset} disabled={resetOtpCode.length < 6 || !resetNewPwd || resetSubmitting}
            className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-medium">
            {resetSubmitting
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetting…</>
              : <><Check className="w-4 h-4 mr-2" />Reset Password</>}
          </Button>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Did not receive it? Check spam/junk.</p>
            <button type="button" onClick={handleResendReset} disabled={resendCooldown > 0 || resendLoading}
              className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed">
              {resendLoading ? 'Sending…' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </button>
          </div>
          <button type="button" onClick={() => { setResetOtpScreen(false); setMode('forgot'); }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back
          </button>
        </div>
      </PageShell>
    );
  }

  // ── Forgot-password sent ──────────────────────────────────────────────
  if (mode === 'forgot' && resetSent) {
    return (
      <PageShell>
        <div className="w-full max-w-sm text-center mx-auto space-y-5">
          <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Check your email</h1>
          <p className="text-muted-foreground text-sm">Password reset link sent to</p>
          <p className="text-foreground font-semibold">{email}</p>
          <Button onClick={() => switchMode('login')} variant="outline" className="w-full h-11">
            Back to Sign In
          </Button>
        </div>
      </PageShell>
    );
  }

  // ── Main sign-in / sign-up / forgot form ──────────────────────────────
  const strength = mode === 'signup' ? getStrength(password) : null;
  const emailBorder =
    emailStatus === 'valid'   ? 'border-green-500 focus-visible:ring-green-500/20' :
    emailStatus === 'invalid' ? 'border-red-500   focus-visible:ring-red-500/20'   : '';
  const submitDisabled =
    isSubmitting || emailStatus === 'checking' ||
    (mode === 'signup' && emailStatus === 'invalid');

  return (
    <>
      <SEOHead title="Sign In - LegalCareAI" description="Sign in to LegalCareAI." canonicalUrl="/auth" noIndex={true} />
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-between p-4 sm:p-6">
          <button onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /><span className="text-sm">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <img src="/favicon.ico" alt="LegalCareAI" className="w-8 h-8" />
            <span className="text-lg font-semibold">LegalCareAI</span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2">
                {mode === 'login' && 'Welcome Back'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'forgot' && 'Reset Password'}
              </h1>
              <p className="text-muted-foreground text-sm">
                {mode === 'login' && 'Sign in to your account'}
                {mode === 'signup' && 'Get started with LegalCareAI'}
                {mode === 'forgot' && 'Enter your email to receive a reset link'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Full Name */}
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                      placeholder="Ravi Kumar" autoComplete="name"
                      className={`pl-10 h-11 bg-muted/50 border-border ${fieldErrors.fullName ? 'border-red-500' : ''}`} />
                  </div>
                  {fieldErrors.fullName && <p className="text-red-500 text-xs flex items-center gap-1"><XCircle className="w-3 h-3" />{fieldErrors.fullName}</p>}
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" value={email}
                    onChange={e => { setEmail(e.target.value); setFormError(''); }}
                    placeholder="you@example.com"
                    autoComplete={mode === 'signup' ? 'email' : 'username'}
                    className={`pl-10 pr-10 h-11 bg-muted/50 border-border transition-colors ${emailBorder} ${fieldErrors.email ? 'border-red-500' : ''}`} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {emailStatus === 'checking' && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
                    {emailStatus === 'valid' && email && <Check className="w-4 h-4 text-green-500" />}
                    {emailStatus === 'invalid' && <XCircle className="w-4 h-4 text-red-500" />}
                  </span>
                </div>
                {emailStatus === 'invalid' && emailMessage && (
                  <p className="text-red-500 text-xs flex items-center gap-1"><XCircle className="w-3 h-3 flex-shrink-0" />{emailMessage}</p>
                )}
                {emailStatus === 'valid' && email && (
                  <p className="text-green-600 text-xs flex items-center gap-1"><Check className="w-3 h-3" />Email looks good</p>
                )}
                {fieldErrors.email && <p className="text-red-500 text-xs flex items-center gap-1"><XCircle className="w-3 h-3" />{fieldErrors.email}</p>}
              </div>

              {/* Password */}
              {mode !== 'forgot' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">Password</label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => switchMode('forgot')}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type={showPassword ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      className={`pl-10 pr-10 h-11 bg-muted/50 border-border ${fieldErrors.password ? 'border-red-500' : ''}`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="text-red-500 text-xs flex items-center gap-1"><XCircle className="w-3 h-3" />{fieldErrors.password}</p>}

                  {/* Strength bar (signup only) */}
                  {mode === 'signup' && password && strength && (
                    <div className="space-y-1 pt-0.5">
                      <div className="flex gap-1">
                        {[1,2,3,4].map(n => (
                          <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= strength.score ? strength.bar : 'bg-muted'}`} />
                        ))}
                      </div>
                      <div className="flex justify-between">
                        <p className={`text-xs font-medium ${strength.text}`}>{strength.label}</p>
                        {strength.score < 3 && (
                          <p className="text-[10px] text-muted-foreground">Add {strength.score < 2 ? 'uppercase, numbers & symbols' : 'numbers & symbols'}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {mode === 'signup' && !password && (
                    <p className="text-xs text-muted-foreground">Min 8 characters — must include uppercase, lowercase, number &amp; symbol (e.g. Password@1).</p>
                  )}
                </div>
              )}

              {/* Form error */}
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{formError}</p>
                  {/not verified|verify your email/i.test(formError) && email && (
                    <button type="button"
                      onClick={async () => {
                        // Re-trigger OTP flow for login page when user hasn't verified
                        setResendLoading(true);
                        const { error } = await sendOTP(email, '');
                        setResendLoading(false);
                        if (!error) {
                          passwordForOTP.current = password;
                          setOtpEmail(email); setOtpCode(''); setOtpError('');
                          setOtpScreen(true); setResendCooldown(60);
                        } else toast.error('Could not send code. Please try again.');
                      }}
                      disabled={resendLoading}
                      className="mt-1.5 text-xs text-blue-500 hover:underline disabled:opacity-50">
                      {resendLoading ? 'Sending…' : 'Send new verification code →'}
                    </button>
                  )}
                </div>
              )}

              {/* Submit */}
              <Button type="submit" disabled={submitDisabled}
                className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-medium disabled:opacity-60">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> :
                 emailStatus === 'checking' ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying email…</> : (
                  <>
                    {mode === 'login'  && 'Sign In'}
                    {mode === 'signup' && 'Create Account'}
                    {mode === 'forgot' && 'Send Reset Link'}
                  </>
                )}
              </Button>
            </form>

            {/* Google Sign-In — only shown when VITE_GOOGLE_CLIENT_ID is configured */}
            {GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'your-google-client-id.apps.googleusercontent.com' && mode !== 'forgot' && (
              <div className="mt-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or continue with</span>
                  </div>
                </div>
                <div className="mt-4 flex justify-center">
                  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                    <GoogleLogin
                      onSuccess={async (credentialResponse) => {
                        if (!credentialResponse.credential) return;
                        const { error } = await signInWithGoogle(credentialResponse.credential);
                        if (error) toast.error(error.message || 'Google sign-in failed. Please try again.');
                      }}
                      onError={() => toast.error('Google sign-in failed. Please try again.')}
                      useOneTap={false}
                      theme="outline"
                      size="large"
                      text={mode === 'signup' ? 'signup_with' : 'signin_with'}
                      shape="rectangular"
                      width="320"
                    />
                  </GoogleOAuthProvider>
                </div>
              </div>
            )}

            {/* Mode toggle */}
            <div className="text-center mt-6">
              {mode === 'forgot' ? (
                <button type="button" onClick={() => switchMode('login')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  ← Back to Sign In
                </button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                  <button type="button" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                    className="text-foreground font-medium hover:underline">
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
