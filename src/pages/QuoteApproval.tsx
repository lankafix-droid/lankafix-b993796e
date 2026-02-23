import { Link } from "react-router-dom";
import { mockQuote } from "@/data/mockData";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, FileText } from "lucide-react";
import { useState } from "react";

const QuoteApproval = () => {
  const q = mockQuote;
  const [decided, setDecided] = useState<"approved" | "rejected" | null>(null);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-2xl">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>

          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Quote Approval</h1>
          </div>

          {/* Header Info */}
          <div className="bg-card rounded-xl border p-5 mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Job ID</span>
                <p className="font-semibold text-foreground">{q.jobId}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Technician</span>
                <p className="font-semibold text-foreground">{q.technicianName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Submitted</span>
                <p className="font-semibold text-foreground">{q.submittedDate}</p>
              </div>
            </div>
          </div>

          {/* Labor */}
          <div className="bg-card rounded-xl border p-5 mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Labor</h3>
            <div className="space-y-2">
              {q.laborItems.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.description}</span>
                  <span className="font-medium text-foreground">LKR {item.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Parts */}
          <div className="bg-card rounded-xl border p-5 mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Parts</h3>
            <div className="space-y-2">
              {q.partsItems.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.description}</span>
                  <span className="font-medium text-foreground">LKR {item.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Add-ons */}
          {q.addOns.length > 0 && (
            <div className="bg-card rounded-xl border p-5 mb-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Add-Ons</h3>
              <div className="space-y-2">
                {q.addOns.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.description}</span>
                    <span className="font-medium text-foreground">LKR {item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="bg-primary/5 rounded-xl border border-primary/20 p-5 mb-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Labor Total</span>
                <span className="text-foreground">LKR {q.totals.labor.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Parts Total</span>
                <span className="text-foreground">LKR {q.totals.parts.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Add-Ons</span>
                <span className="text-foreground">LKR {q.totals.addOns.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
                <span className="text-foreground">Total</span>
                <span className="text-primary">LKR {q.totals.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Warranty */}
          <div className="bg-success/5 border border-success/20 rounded-xl p-4 mb-8 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-success shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Warranty Terms</p>
              <p className="text-xs text-muted-foreground mt-1">Labor: {q.warranty.labor}</p>
              <p className="text-xs text-muted-foreground">Parts: {q.warranty.parts}</p>
            </div>
          </div>

          {/* Actions */}
          {decided === null ? (
            <div className="flex gap-3">
              <Button variant="hero" size="xl" className="flex-1" onClick={() => setDecided("approved")}>
                Approve Quote
              </Button>
              <Button variant="outline" size="xl" className="flex-1" onClick={() => setDecided("rejected")}>
                Reject Quote
              </Button>
            </div>
          ) : (
            <div className={`rounded-xl p-5 text-center ${decided === "approved" ? "bg-success/10 border border-success/20" : "bg-destructive/10 border border-destructive/20"}`}>
              <p className="font-semibold text-foreground">
                {decided === "approved" ? "✓ Quote Approved" : "✗ Quote Rejected"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {decided === "approved" ? "Work will begin as scheduled." : "Your technician has been notified."}
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default QuoteApproval;
