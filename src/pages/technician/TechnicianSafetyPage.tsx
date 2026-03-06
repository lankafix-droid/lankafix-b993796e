import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, AlertTriangle, Shield, Phone, MapPin,
  Radio, CheckCircle2, Siren,
} from "lucide-react";

export default function TechnicianSafetyPage() {
  const navigate = useNavigate();
  const [sosActive, setSosActive] = useState(false);
  const [sosConfirm, setSosConfirm] = useState(false);

  const handleSOS = () => {
    if (!sosConfirm) {
      setSosConfirm(true);
      return;
    }
    setSosActive(true);
    setSosConfirm(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/technician")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Safety Tools</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* SOS Button */}
        <Card className={`border-2 ${sosActive ? "border-destructive bg-destructive/5" : "border-destructive/30"}`}>
          <CardContent className="p-6 text-center">
            <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
              sosActive ? "bg-destructive animate-pulse" : "bg-destructive/10"
            }`}>
              <Siren className={`w-10 h-10 ${sosActive ? "text-destructive-foreground" : "text-destructive"}`} />
            </div>
            {sosActive ? (
              <>
                <h2 className="text-lg font-bold text-destructive mb-1">SOS Active</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  LankaFix support has been notified. Help is on the way.
                </p>
                <Button variant="outline" onClick={() => setSosActive(false)}>Cancel SOS</Button>
              </>
            ) : sosConfirm ? (
              <>
                <h2 className="text-lg font-bold text-destructive mb-1">Confirm Emergency</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  This will alert LankaFix support and share your live location.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="destructive" onClick={handleSOS}>
                    <AlertTriangle className="w-4 h-4 mr-2" /> Confirm SOS
                  </Button>
                  <Button variant="ghost" onClick={() => setSosConfirm(false)}>Cancel</Button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-foreground mb-1">Emergency SOS</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Press if you feel unsafe or need immediate assistance
                </p>
                <Button variant="destructive" size="lg" onClick={handleSOS}>
                  <Siren className="w-5 h-5 mr-2" /> Activate SOS
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Safety Features */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Safety Features</h2>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Live Job Tracking</p>
                <p className="text-xs text-muted-foreground">Your location is shared with LankaFix during active jobs</p>
              </div>
              <Badge className="bg-success/10 text-success text-[10px]">
                <CheckCircle2 className="w-3 h-3 mr-0.5" /> Active
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Radio className="w-5 h-5 text-warning" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Support Alert</p>
                <p className="text-xs text-muted-foreground">Silently notify support without the customer knowing</p>
              </div>
              <Button size="sm" variant="outline" className="text-xs h-7">Send</Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Insurance Coverage</p>
                <p className="text-xs text-muted-foreground">You are covered during active LankaFix jobs</p>
              </div>
              <Badge className="bg-success/10 text-success text-[10px]">Covered</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Emergency Contacts */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Emergency Contacts</h2>
          <div className="space-y-2">
            {[
              { name: "LankaFix Support", number: "011-234-5678" },
              { name: "Police Emergency", number: "119" },
              { name: "Ambulance", number: "1990" },
            ].map((contact) => (
              <Card key={contact.name}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Phone className="w-4 h-4 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">{contact.number}</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs h-7">Call</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="bg-success/5 border border-success/20 rounded-lg p-3">
          <p className="text-xs text-success text-center">
            <Shield className="w-3.5 h-3.5 inline mr-1" />
            Your safety is our priority. All active jobs are monitored.
          </p>
        </div>
      </div>
    </div>
  );
}
