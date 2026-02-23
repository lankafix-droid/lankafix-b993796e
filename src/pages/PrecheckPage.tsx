import { useParams, useNavigate, Link } from "react-router-dom";
import { categories, serviceModeLabels } from "@/data/mockData";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, CalendarDays, MapPin } from "lucide-react";
import { useState } from "react";

const PrecheckPage = () => {
  const { catCode, svcCode } = useParams<{ catCode: string; svcCode: string }>();
  const navigate = useNavigate();
  const category = categories.find((c) => c.code === catCode);
  const service = category?.services.find((s) => s.code === svcCode);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedMode, setSelectedMode] = useState(service?.allowedModes[0] || "on_site");

  if (!category || !service) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Service not found</p>
        </main>
      </div>
    );
  }

  const handleProceed = () => {
    navigate(`/pricing/${category.code}/${service.code}`, {
      state: { answers, serviceMode: selectedMode },
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-2xl">
          <Link to={`/category/${category.code}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to {category.name}
          </Link>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">Step 1 of 3</span>
            <span className="text-sm text-muted-foreground">{service.name} — Pre-Check</span>
          </div>

          {/* Service mode */}
          {service.allowedModes.length > 1 && (
            <div className="bg-card rounded-xl border p-5 mb-4">
              <p className="text-sm font-medium text-foreground mb-3">Service Mode</p>
              <div className="flex flex-wrap gap-2">
                {service.allowedModes.map((mode) => (
                  <Button
                    key={mode}
                    variant={selectedMode === mode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedMode(mode)}
                  >
                    {serviceModeLabels[mode]}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Questions */}
          <div className="space-y-4 mb-6">
            {service.precheckQuestions.map((q) => (
              <div key={q.key} className="bg-card rounded-xl border p-5">
                <label className="text-sm font-medium text-foreground mb-3 block">
                  {q.question}
                  {q.required && <span className="text-destructive ml-1">*</span>}
                </label>
                {q.inputType === "boolean" && (
                  <div className="flex gap-2">
                    {["Yes", "No"].map((opt) => (
                      <Button
                        key={opt}
                        variant={answers[q.key] === opt.toLowerCase() ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAnswers({ ...answers, [q.key]: opt.toLowerCase() })}
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                )}
                {q.inputType === "single_select" && q.options && (
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((opt) => (
                      <Button
                        key={opt.value}
                        variant={answers[q.key] === opt.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAnswers({ ...answers, [q.key]: opt.value })}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                )}
                {q.inputType === "text" && (
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                    placeholder="Type your answer..."
                    value={answers[q.key] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Photo upload */}
          <div className="bg-card rounded-xl border p-5 mb-4">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Upload className="w-5 h-5" />
              <div>
                <p className="text-sm font-medium text-foreground">Upload Photos (Optional)</p>
                <p className="text-xs text-muted-foreground">Upload photos for faster diagnosis</p>
              </div>
            </div>
            <div className="mt-3 border-2 border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground cursor-pointer hover:border-primary/30 transition-colors">
              Tap to upload photos
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-card rounded-xl border p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Schedule</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Date</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Time Slot</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
                  <option>8:00 AM – 10:00 AM</option>
                  <option>10:00 AM – 12:00 PM</option>
                  <option>1:00 PM – 3:00 PM</option>
                  <option>3:00 PM – 5:00 PM</option>
                </select>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-card rounded-xl border p-5 mb-8">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Address</p>
            </div>
            <div className="space-y-3">
              <button className="w-full text-left border rounded-lg px-4 py-3 text-sm hover:border-primary/30 transition-colors bg-background">
                <p className="font-medium text-foreground">Home</p>
                <p className="text-xs text-muted-foreground">42 Galle Road, Colombo 3</p>
              </button>
              <button className="w-full text-left border rounded-lg px-4 py-3 text-sm border-dashed text-muted-foreground hover:border-primary/30 transition-colors bg-background">
                + Add New Address
              </button>
            </div>
          </div>

          <Button variant="hero" size="xl" className="w-full" onClick={handleProceed}>
            Proceed to Pricing
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrecheckPage;
