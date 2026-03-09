import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Gift, Users, Copy, Share2, Star, CheckCircle2, Clock, TrendingUp,
  ArrowRight, Shield, Zap, DollarSign
} from "lucide-react";
import { toast } from "sonner";
import {
  generateReferralCode, generateMockReferralMetrics,
  generateMockReferralActivity, REFERRAL_REWARDS,
} from "@/engines/referralEngine";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";

const myCode = generateReferralCode("User");
const metrics = generateMockReferralMetrics();
const activity = generateMockReferralActivity();

const ReferralPage = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Gift className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Invite & Earn</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Share LankaFix with friends and earn credits. They get LKR 300 off their first booking, you get LKR 500 in credits.
          </p>
        </div>

        {/* Referral Code Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">Your referral code</p>
            <div className="flex items-center justify-center gap-3">
              <div className="bg-card border-2 border-dashed border-primary/40 rounded-xl px-6 py-3">
                <span className="text-2xl font-mono font-bold text-primary tracking-widest">{myCode}</span>
              </div>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy Code"}
              </Button>
              <Button size="sm" className="gap-2">
                <Share2 className="w-4 h-4" /> Share Link
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">How Referrals Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { step: 1, icon: Share2, title: "Share your code", desc: "Send your unique code to friends or family" },
              { step: 2, icon: Users, title: "They sign up & book", desc: "Your friend creates an account and books a service" },
              { step: 3, icon: Gift, title: "Both earn credits", desc: "You get LKR 500, they get LKR 300 off their booking" },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                  {s.step}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Reward Tiers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" /> Reward Tiers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Customer → Customer", reward: REFERRAL_REWARDS.customer_to_customer, color: "bg-primary/10 text-primary" },
              { label: "Technician → Technician", reward: REFERRAL_REWARDS.technician_to_technician, color: "bg-success/10 text-success" },
              { label: "Customer → Technician", reward: REFERRAL_REWARDS.customer_to_technician, color: "bg-warning/10 text-warning" },
            ].map((t) => (
              <div key={t.label} className="p-4 rounded-xl bg-muted/30 border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{t.label}</span>
                  <Badge className={`${t.color}`} variant="outline">
                    LKR {t.reward.referrerCreditsLKR.toLocaleString()}
                  </Badge>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Referrer: LKR {t.reward.referrerCreditsLKR}</span>
                  {t.reward.refereeCreditsLKR > 0 && <span>Referee: LKR {t.reward.refereeCreditsLKR}</span>}
                  <span>Valid: {t.reward.expiryDays} days</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* My Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-5 h-5 text-primary mx-auto" />
              <p className="text-xl font-bold text-foreground mt-1">3</p>
              <p className="text-[10px] text-muted-foreground">Referrals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-5 h-5 text-success mx-auto" />
              <p className="text-xl font-bold text-foreground mt-1">1,500</p>
              <p className="text-[10px] text-muted-foreground">Credits Earned</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-5 h-5 text-warning mx-auto" />
              <p className="text-xl font-bold text-foreground mt-1">1</p>
              <p className="text-[10px] text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Referral Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  a.status === "completed" ? "bg-success/10 text-success" :
                  "bg-warning/10 text-warning"
                }`}>
                  {a.status === "completed" ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{a.referrerName}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span className="font-medium">{a.refereeName}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px]">{a.type.replace(/_/g, " ")}</Badge>
                    <span className="text-[10px] text-muted-foreground">{a.createdAt}</span>
                  </div>
                </div>
                {a.creditsAwarded > 0 && (
                  <span className="text-sm font-medium text-success">+LKR {a.creditsAwarded}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 py-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Verified Platform</div>
          <div className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Instant Credits</div>
          <div className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> No Limits</div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ReferralPage;
