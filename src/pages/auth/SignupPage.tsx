/**
 * LankaFix Signup Page — Email/Password + Social Sign-In
 */
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import LankaFixLogo from "@/components/brand/LankaFixLogo";
import PageTransition from "@/components/motion/PageTransition";
import SocialSignInButtons from "@/components/auth/SocialSignInButtons";

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please enter email and password"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || undefined },
        emailRedirectTo: window.location.origin,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user && !data.session) {
      setEmailSent(true);
      setLoading(false);
      return;
    }

    if (data.user && data.session) {
      toast.success("Account created!");
      navigate(redirectTo, { replace: true });
    }
    setLoading(false);
  };

  if (emailSent) {
    return (
      <PageTransition className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Check Your Email</h1>
          <p className="text-sm text-muted-foreground">We sent a verification link to <strong className="text-foreground">{email}</strong>. Please verify your email, then sign in.</p>
          <Button asChild variant="outline" className="rounded-xl">
            <Link to={`/login${redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}>Go to Sign In</Link>
          </Button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-3">
            <Link to="/" className="inline-block">
              <LankaFixLogo size="md" />
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
            <p className="text-sm text-muted-foreground">Sign up to book services and track jobs</p>
          </div>

          {/* Social Sign-In */}
          <SocialSignInButtons onError={setError} disabled={loading} redirectTo={redirectTo} />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="fullName" type="text" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 h-11 rounded-xl" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11 rounded-xl" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11 rounded-xl" required />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-xl text-xs text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl font-bold gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Account
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to={`/login${redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`} className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </form>

          <p className="text-center text-[10px] text-muted-foreground leading-relaxed">
            Social sign-in only imports your name and email.
            <br />Phone and address can be added later.
          </p>

          <div className="text-center">
            <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-3 h-3" /> Back to home
            </Link>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}