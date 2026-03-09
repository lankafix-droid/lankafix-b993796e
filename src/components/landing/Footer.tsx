import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { SUPPORT_WHATSAPP, SUPPORT_PHONE, SUPPORT_EMAIL, whatsappLink } from "@/config/contact";
import LankaFixLogo from "@/components/brand/LankaFixLogo";

const Footer = () => {
  return (
    <footer className="bg-navy text-white/70 py-16">
      <div className="container">
        <div className="grid md:grid-cols-3 gap-10">
          <div>
            <div className="mb-5">
              <LankaFixLogo size="lg" variant="light" layout="icon" />
            </div>
            <p className="text-sm font-semibold text-white mt-2 font-heading">Verified Tech. Fixed Fast.</p>
            <p className="text-xs leading-relaxed mt-1 text-white/45">Sri Lanka's trusted tech service marketplace.</p>
            <div className="flex gap-2 mt-4">
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-success/20 text-success font-semibold">Verified</span>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-primary/20 text-primary font-semibold" style={{ color: "hsl(211, 80%, 60%)" }}>Warranty-backed</span>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-accent/20 text-accent font-semibold">OTP Secured</span>
            </div>
          </div>
          <div>
            <h4 className="font-heading font-bold text-white mb-4 text-sm">Quick Links</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/#categories" className="hover:text-white transition-colors">Categories</Link></li>
              <li><Link to="/diagnose" className="hover:text-white transition-colors">Diagnose Problem</Link></li>
              <li><Link to="/track" className="hover:text-white transition-colors">Track Job</Link></li>
              <li><Link to="/join" className="hover:text-white transition-colors">Become a Provider</Link></li>
              <li><Link to="/waitlist" className="hover:text-white transition-colors">Join Waitlist</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-bold text-white mb-4 text-sm">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li><a href={whatsappLink(SUPPORT_WHATSAPP)} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp Support</a></li>
              <li>{SUPPORT_PHONE}</li>
              <li>{SUPPORT_EMAIL}</li>
              <li className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" style={{ color: "hsl(211, 80%, 60%)" }} />Colombo, Sri Lanka (Phase 1)</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 mt-10 pt-6 flex flex-wrap gap-4 justify-between text-xs text-white/40">
          <span>© 2026 LankaFix by Smart Office. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/warranty" className="hover:text-white transition-colors">Warranty</Link>
            <Link to="/refund" className="hover:text-white transition-colors">Refunds</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
