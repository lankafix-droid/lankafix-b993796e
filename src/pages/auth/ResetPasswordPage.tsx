/**
 * LankaFix Reset Password Page
 * User lands here from the password reset email link.
 */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import LankaFixLogo from "@/components/brand/LankaFixLogo";
import PageTransition from "@/components/motion/PageTransition";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Check URL hash for recovery token
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
    // Also listen for auth state change with recovery event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    setError("");

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    toast.success("Password updated successfully!");
    setLoading(false);
    setTimeout(() => navigate("/", { replace: true }), 2000);
  };

  if (!isRecovery && !success) {
    return (
      <PageTransition className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <LankaFixLogo size="md" />
          <h1 className="text-xl font-bold text-foreground">Invalid Reset Link</h1>
          <p className="text-sm text-muted-foreground">This password reset link is invalid or has expired.</p>
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/forgot-password">Request New Link</Link>
          </Button>
        </div>
      </PageTransition>
    );
  }

  if (success) {
    return (
      <PageTransition className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Password Updated</h1>
          <p className="text-sm text-muted-foreground">Redirecting you to home…</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-3">
            <LankaFixLogo size="md" />
            <h1 className="text-2xl font-bold text-foreground">Set New Password</h1>
          </div>

          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-11 rounded-xl" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="confirmPassword" type="password" placeholder="Repeat password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 h-11 rounded-xl" required />
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
              Update Password
            </Button>
          </form>
        </div>
      </div>
    </PageTransition>
  );
}
