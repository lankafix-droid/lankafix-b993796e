import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, GraduationCap, Play, CheckCircle2, Clock, Award, BookOpen } from "lucide-react";

interface TrainingModule {
  id: string;
  title: string;
  category: string;
  duration: string;
  completed: boolean;
  progress: number;
  contributesTier: boolean;
}

const MODULES: TrainingModule[] = [
  { id: "T01", title: "Customer Service Excellence", category: "Soft Skills", duration: "15 min", completed: true, progress: 100, contributesTier: true },
  { id: "T02", title: "LankaFix Platform Rules", category: "Platform", duration: "10 min", completed: true, progress: 100, contributesTier: true },
  { id: "T03", title: "Pricing Transparency Guidelines", category: "Platform", duration: "8 min", completed: false, progress: 60, contributesTier: true },
  { id: "T04", title: "Safety Procedures on Site", category: "Safety", duration: "12 min", completed: false, progress: 0, contributesTier: true },
  { id: "T05", title: "AC Gas Handling Best Practices", category: "Technical", duration: "20 min", completed: false, progress: 0, contributesTier: true },
  { id: "T06", title: "Equipment Care & Maintenance", category: "Technical", duration: "15 min", completed: false, progress: 0, contributesTier: false },
  { id: "T07", title: "Electrical Safety Standards", category: "Safety", duration: "18 min", completed: false, progress: 0, contributesTier: true },
  { id: "T08", title: "CCTV Installation Standards", category: "Technical", duration: "25 min", completed: false, progress: 0, contributesTier: false },
];

export default function TechnicianTrainingPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("All");

  const completedCount = MODULES.filter((m) => m.completed).length;
  const overallProgress = Math.round((completedCount / MODULES.length) * 100);
  const categories = ["All", ...Array.from(new Set(MODULES.map((m) => m.category)))];

  const filtered = filter === "All" ? MODULES : MODULES.filter((m) => m.category === filter);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/technician")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Training Center</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Progress Overview */}
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Training Progress</p>
                <p className="text-xs text-muted-foreground">{completedCount}/{MODULES.length} modules completed</p>
              </div>
              <span className="text-2xl font-bold text-primary">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-2">
              <Award className="w-3 h-3 inline mr-1" />
              Complete all tier-qualifying modules to upgrade your provider tier
            </p>
          </CardContent>
        </Card>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={filter === cat ? "default" : "outline"}
              className="text-xs shrink-0 h-7"
              onClick={() => setFilter(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Modules */}
        <div className="space-y-3">
          {filtered.map((mod) => (
            <Card key={mod.id} className={mod.completed ? "border-success/20" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    mod.completed ? "bg-success/10" : "bg-muted"
                  }`}>
                    {mod.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : mod.progress > 0 ? (
                      <Play className="w-5 h-5 text-primary" />
                    ) : (
                      <BookOpen className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{mod.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">{mod.category}</Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> {mod.duration}
                      </span>
                      {mod.contributesTier && (
                        <Badge className="bg-warning/10 text-warning text-[10px]">
                          <Award className="w-3 h-3 mr-0.5" /> Tier
                        </Badge>
                      )}
                    </div>
                    {!mod.completed && mod.progress > 0 && (
                      <Progress value={mod.progress} className="h-1.5 mt-2" />
                    )}
                  </div>
                  {!mod.completed && (
                    <Button size="sm" variant="outline" className="text-xs h-7 shrink-0">
                      {mod.progress > 0 ? "Continue" : "Start"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
