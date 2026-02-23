import { useParams, Link } from "react-router-dom";
import { categories, serviceModeLabels } from "@/data/mockData";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Zap, Stethoscope, FileText } from "lucide-react";
import { useState } from "react";

const CategoryPage = () => {
  const { code } = useParams<{ code: string }>();
  const category = categories.find((c) => c.code === code);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [emergency, setEmergency] = useState(false);

  if (!category) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Category not found</p>
        </main>
      </div>
    );
  }

  const allModes = [...new Set(category.services.flatMap((s) => s.allowedModes))];

  const filteredServices = selectedMode
    ? category.services.filter((s) => s.allowedModes.includes(selectedMode))
    : category.services;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container py-8 max-w-3xl">
          {/* Header */}
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to categories
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-1">{category.name}</h1>
          <p className="text-muted-foreground mb-6">{category.description}</p>

          {/* Mode Selector */}
          <div className="mb-6">
            <p className="text-sm font-medium text-foreground mb-2">Service Mode</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedMode === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMode(null)}
              >
                All
              </Button>
              {allModes.map((mode) => (
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

          {/* Emergency Toggle */}
          <button
            onClick={() => setEmergency(!emergency)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium mb-8 transition-colors ${
              emergency
                ? "bg-warning/10 border-warning/30 text-warning"
                : "bg-card border text-muted-foreground hover:border-warning/30"
            }`}
          >
            <Zap className="w-4 h-4" />
            Emergency (Within 2 Hours)
            {emergency && <span className="text-xs">+20% surcharge</span>}
          </button>

          {/* Service List */}
          <div className="space-y-3">
            {filteredServices.map((service) => (
              <Link
                key={service.id}
                to={`/precheck/${category.code}/${service.code}`}
                className="block bg-card rounded-xl border p-5 hover:shadow-md hover:border-primary/20 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{service.name}</h3>
                      {service.requiresDiagnostic && (
                        <Badge variant="outline" className="text-xs gap-1 border-muted-foreground/30">
                          <Stethoscope className="w-3 h-3" /> Diagnostic
                        </Badge>
                      )}
                      {service.requiresQuote && (
                        <Badge variant="outline" className="text-xs gap-1 border-warning/30 text-warning">
                          <FileText className="w-3 h-3" /> Quote
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>From <span className="font-semibold text-foreground">LKR {service.fromPrice.toLocaleString()}</span></span>
                      <span>•</span>
                      <span>{service.allowedModes.map((m) => serviceModeLabels[m]).join(", ")}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mt-1 shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CategoryPage;
