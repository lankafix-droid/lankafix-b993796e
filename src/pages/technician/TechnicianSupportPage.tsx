import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Headphones, Phone, MessageSquare, FileText,
  ChevronRight, HelpCircle, CreditCard, Wrench, AlertTriangle,
} from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FaqItem[] = [
  { question: "How do I get paid?", answer: "Payouts are released after job completion verification. Settlements are processed to your registered bank account within 2-3 business days.", category: "Payments" },
  { question: "What if the customer is not available?", answer: "Mark the job as 'Site Inaccessible' in the outcome selector. You will receive a partial payout for the trip.", category: "Jobs" },
  { question: "How do I raise a dispute?", answer: "Open the job detail page and scroll to the Disputes section. Select a reason, describe the issue, and submit. Our team will review within 24 hours.", category: "Disputes" },
  { question: "How to upgrade my tier?", answer: "Complete training modules, maintain a 4.5+ rating, and achieve 95%+ job completion rate. Tier upgrades are reviewed monthly.", category: "Account" },
  { question: "What happens if I decline too many jobs?", answer: "Declining more than 30% of job offers may lower your dispatch priority. Emergency-only mode does not count as declines.", category: "Jobs" },
  { question: "Can I order parts through LankaFix?", answer: "Yes! Visit the Parts Store from your dashboard. Parts can be delivered to your location or picked up from partner stores.", category: "Parts" },
];

export default function TechnicianSupportPage() {
  const navigate = useNavigate();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/technician")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Support Center</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Contact Options */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="cursor-pointer hover:border-primary/30" onClick={() => setShowContactForm(true)}>
            <CardContent className="p-4 text-center">
              <MessageSquare className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">Chat Support</p>
              <p className="text-[10px] text-muted-foreground">Usually replies in 5 min</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/30">
            <CardContent className="p-4 text-center">
              <Phone className="w-6 h-6 text-success mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">Call Hotline</p>
              <p className="text-[10px] text-muted-foreground">011-234-5678</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Topics */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Quick Help Topics</h2>
          <div className="space-y-2">
            {[
              { icon: CreditCard, label: "Payment Issues", color: "text-warning" },
              { icon: Wrench, label: "Job Problems", color: "text-primary" },
              { icon: AlertTriangle, label: "Safety Concerns", color: "text-destructive" },
              { icon: HelpCircle, label: "Account & Profile", color: "text-muted-foreground" },
            ].map((topic) => (
              <Card key={topic.label} className="cursor-pointer hover:border-primary/20">
                <CardContent className="p-3 flex items-center gap-3">
                  <topic.icon className={`w-5 h-5 ${topic.color}`} />
                  <span className="text-sm font-medium text-foreground flex-1">{topic.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        {showContactForm && (
          <Card className="border-primary/20">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Send us a message</p>
              <Textarea
                placeholder="Describe your issue..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" disabled={!message.trim()} className="flex-1">Send</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowContactForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* FAQ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-2">
            {FAQ_ITEMS.map((faq, idx) => (
              <Card key={idx} className="cursor-pointer" onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-sm font-medium text-foreground flex-1">{faq.question}</p>
                    <Badge variant="outline" className="text-[9px] shrink-0">{faq.category}</Badge>
                  </div>
                  {expandedFaq === idx && (
                    <p className="text-xs text-muted-foreground mt-2 ml-6">{faq.answer}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
