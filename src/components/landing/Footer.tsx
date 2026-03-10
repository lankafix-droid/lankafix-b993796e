import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { SUPPORT_WHATSAPP, SUPPORT_PHONE, SUPPORT_EMAIL, whatsappLink } from "@/config/contact";
import LankaFixLogo from "@/components/brand/LankaFixLogo";

const Footer = () => {
  return (
    <footer className="bg-navy text-primary-foreground/60 py-12 md:py-16 relative overflow-hidden pb-24 md:pb-16">
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
        backgroundSize: "24px 24px",
      }} />
      
      <div className="container relative z-10">
        <div className="grid md:grid-cols-3 gap-10">
          <div>
            <div className="mb-5">
              <LankaFixLogo size="lg" variant="light" layout="icon" />
            </div>
            <p className="text-sm font-semibold text-primary-foreground mt-2 font-heading">Verified Tech. Fixed Fast.</p>
            <p className="text-xs leading-relaxed mt-1 text-primary-foreground/40">Sri Lanka's trusted tech service marketplace.</p>
            <div className="flex gap-2 mt-4">
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-success/20 text-success font-semibold">Verified</span>
              <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold" style={{ background: "rgba(14,76,146,0.25)", color: "hsl(211, 80%, 60%)" }}>Warranty-backed</span>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-accent/20 text-accent font-semibold">OTP Secured</span>
            </div>
          </div>
          <div>
            <h4 className="font-heading font-bold text-primary-foreground mb-4 text-sm">Quick Links</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/#categories" className="hover:text-primary-foreground transition-colors">Categories</Link></li>
              <li><Link to="/diagnose" className="hover:text-primary-foreground transition-colors">Diagnose Problem</Link></li>
              <li><Link to="/track" className="hover:text-primary-foreground transition-colors">Track Job</Link></li>
              <li><Link to="/home-health" className="hover:text-primary-foreground transition-colors">Home Health</Link></li>
              <li><Link to="/how-pricing-works" className="hover:text-primary-foreground transition-colors">How Pricing Works</Link></li>
              <li><Link to="/faq" className="hover:text-primary-foreground transition-colors">FAQ</Link></li>
              <li><Link to="/about" className="hover:text-primary-foreground transition-colors">About Us</Link></li>
              <li><Link to="/join" className="hover:text-primary-foreground transition-colors">Become a Provider</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-bold text-primary-foreground mb-4 text-sm">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li><a href={whatsappLink(SUPPORT_WHATSAPP)} target="_blank" rel="noopener noreferrer" className="hover:text-primary-foreground transition-colors">WhatsApp Support</a></li>
              <li>{SUPPORT_PHONE}</li>
              <li>{SUPPORT_EMAIL}</li>
              <li className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" style={{ color: "hsl(211, 80%, 60%)" }} />Colombo, Sri Lanka (Phase 1)</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10 mt-10 pt-6 flex flex-wrap gap-4 justify-between text-xs text-primary-foreground/35">
          <span>© 2026 LankaFix by Smart Office Pvt Ltd. All rights reserved.</span>
          <div className="flex flex-wrap gap-4">
            <Link to="/terms" className="hover:text-primary-foreground transition-colors">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-primary-foreground transition-colors">Privacy Policy</Link>
            <Link to="/warranty" className="hover:text-primary-foreground transition-colors">Warranty</Link>
            <Link to="/refund" className="hover:text-primary-foreground transition-colors">Refunds</Link>
            <Link to="/support/account-deletion" className="hover:text-primary-foreground transition-colors">Data Deletion</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
