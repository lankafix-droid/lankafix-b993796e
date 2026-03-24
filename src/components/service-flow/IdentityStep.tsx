/**
 * IdentityStep — Step 5: Collect or verify name and phone.
 */
import { Input } from "@/components/ui/input";
import { CheckCircle2, Phone, Shield, User } from "lucide-react";

interface IdentityStepProps {
  name: string;
  phone: string;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  isAuthenticated: boolean;
}

export default function IdentityStep({
  name, phone, onNameChange, onPhoneChange, isAuthenticated,
}: IdentityStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">Your details</h2>
        <p className="text-sm text-muted-foreground mt-1">So we can coordinate your service</p>
      </div>
      {isAuthenticated && name && phone ? (
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{name}</p>
              <p className="text-xs text-muted-foreground">{phone}</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Your name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="What should we call you?" value={name} onChange={(e) => onNameChange(e.target.value)} className="pl-10 h-11 rounded-xl" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Phone number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="tel" placeholder="07X XXX XXXX" value={phone} onChange={(e) => onPhoneChange(e.target.value)} className="pl-10 h-11 rounded-xl" />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Shield className="w-3 h-3" /> Your phone is used for coordination only
          </p>
        </div>
      )}
    </div>
  );
}
