import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { SUPPORT_WHATSAPP, SUPPORT_PHONE, SUPPORT_EMAIL, whatsappLink } from "@/config/contact";
import LankaFixLogo from "@/components/brand/LankaFixLogo";

const Footer = () => {
  return (
    <footer className="bg-navy text-navy-foreground/70 py-14">
      <div className="container">
        <div className="grid md:grid-cols-3 gap-10">
          <div>
            <div className="mb-4">
              <LankaFixLogo size="md" variant="light" />
            </div>
            <p className="text-sm leading-relaxed mt-2 text-navy-foreground/90">Verified Tech. Fixed Fast.</p>
            <p className="text-xs leading-relaxed mt-1 text-navy-foreground/50">Sri Lanka's trusted tech service marketplace.</p>
            <div className="flex gap-2 mt-4">
              <span className="text-[10px] px-2 py-1 rounded-full bg-lankafix-green/20 text-lankafix-green font-medium">Verified</span>
              <span className="text-[10px] px-2 py-1 rounded-full bg-primary/20 text-primary font-medium">Warranty-backed</span>
              <span className="text-[10px] px-2 py-1 rounded-full bg-accent/20 text-accent font-medium">OTP Secured</span>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-navy-foreground mb-3 text-sm">Quick Links</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/#categories" className="hover:text-navy-foreground transition-colors">Categories</Link></li>
              <li><Link to="/diagnose" className="hover:text-navy-foreground transition-colors">Diagnose Problem</Link></li>
              <li><Link to="/track" className="hover:text-navy-foreground transition-colors">Track Job</Link></li>
              <li><Link to="/join" className="hover:text-navy-foreground transition-colors">Become a Provider</Link></li>
              <li><Link to="/waitlist" className="hover:text-navy-foreground transition-colors">Join Waitlist</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-navy-foreground mb-3 text-sm">Contact</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href={whatsappLink(SUPPORT_WHATSAPP)} target="_blank" rel="noopener noreferrer" className="hover:text-navy-foreground transition-colors">WhatsApp Support</a></li>
              <li>{SUPPORT_PHONE}</li>
              <li>{SUPPORT_EMAIL}</li>
              <li className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Colombo, Sri Lanka (Phase 1)</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-navy-foreground/10 mt-10 pt-6 flex flex-wrap gap-4 justify-between text-xs text-navy-foreground/50">
          <span>© 2026 LankaFix by Smart Office. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-navy-foreground transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-navy-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;