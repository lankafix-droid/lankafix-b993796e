/**
 * LankaFix Login Page — Email/Password + Social Sign-In
 */
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import LankaFixLogo from "@/components/brand/LankaFixLogo";
import PageTransition from "@/components/motion/PageTransition";
import SocialSignInButtons from "@/components/auth/SocialSignInButtons";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please enter email and password"); return; }
    setLoading(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      toast.success("Welcome back!");
      navigate(redirectTo, { replace: true });
    }
    setLoading(false);
  };

  return (
    <PageTransition className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-3">
            <Link to="/" className="inline-block">
              <LankaFixLogo size="md" />
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
            <p className="text-sm text-muted-foreground">Sign in to manage your bookings</p>
          </div>

          {/* Social Sign-In */}
          <SocialSignInButtons onError={setError} disabled={loading} />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11 rounded-xl" required />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11 rounded-xl" required />
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
              Sign In
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to={`/signup${redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`} className="text-primary font-medium hover:underline">
                Sign up
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