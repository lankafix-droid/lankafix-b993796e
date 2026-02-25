import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, MapPin } from "lucide-react";
import { categories } from "@/data/categories";

const WaitlistPage = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const toggleCat = (code: string) => {
    setSelectedCats((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSubmit = () => {
    if (name && phone && area) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center max-w-md px-4">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">You're on the list!</h1>
            <p className="text-muted-foreground mb-6">
              We'll notify you when LankaFix launches in your area. Thank you for your interest!
            </p>
            <Button asChild variant="outline">
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-10 max-w-lg">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>

          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Join the Waitlist</h1>
          </div>
          <p className="text-muted-foreground mb-8">We're currently serving Greater Colombo. Tell us where you are and we'll notify you when we expand.</p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Phone *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="+94 7X XXX XXXX"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Your Area / City *</label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. Kandy, Galle, Jaffna"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Interested Categories</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.code}
                    onClick={() => toggleCat(cat.code)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${selectedCats.includes(cat.code) ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground hover:border-primary/30"}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button
            variant="hero"
            size="xl"
            className="w-full mt-8"
            onClick={handleSubmit}
            disabled={!name || !phone || !area}
          >
            Join Waitlist
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default WaitlistPage;
