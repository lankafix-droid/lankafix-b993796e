import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { SUPPORT_WHATSAPP, SUPPORT_PHONE, SUPPORT_EMAIL, whatsappLink } from "@/config/contact";
import LankaFixLogo from "@/components/brand/LankaFixLogo";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background/70 py-12">
      <div className="container">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="mb-3">
              <LankaFixLogo size="md" variant="light" />
            </div>
            <p className="text-sm leading-relaxed mt-2">Verified Tech. Fixed Fast.</p>
            <p className="text-xs leading-relaxed mt-1 opacity-70">Sri Lanka's structured smart service ecosystem.</p>
          </div>
          <div>
            <h4 className="font-semibold text-background mb-3 text-sm">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/categories" className="hover:text-background transition-colors">Categories</Link></li>
              <li><Link to="/track" className="hover:text-background transition-colors">Track Job</Link></li>
              <li><Link to="/waitlist" className="hover:text-background transition-colors">Join Waitlist</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-background mb-3 text-sm">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li><a href={whatsappLink(SUPPORT_WHATSAPP)} target="_blank" rel="noopener noreferrer" className="hover:text-background transition-colors">WhatsApp Support</a></li>
              <li>{SUPPORT_PHONE}</li>
              <li>{SUPPORT_EMAIL}</li>
              <li className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Colombo, Sri Lanka (Phase 1)</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-background/10 mt-8 pt-6 flex flex-wrap gap-4 justify-between text-xs">
          <span>© 2026 LankaFix. All rights reserved.</span>
          <div className="flex gap-4"><a href="#" className="hover:text-background transition-colors">Terms</a><a href="#" className="hover:text-background transition-colors">Privacy</a></div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
