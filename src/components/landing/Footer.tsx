import { MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background/70 py-12">
      <div className="container">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">LF</span>
              </div>
              <span className="font-bold text-lg text-background">
                Lanka<span className="text-primary">Fix</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed">
              Sri Lanka's structured smart service ecosystem. Verified technicians, transparent pricing, warranty-backed jobs.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-background mb-3 text-sm">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#categories" className="hover:text-background transition-colors">Categories</a></li>
              <li><a href="#" className="hover:text-background transition-colors">How It Works</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Partner With Us</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-background mb-3 text-sm">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li>WhatsApp: +94 77 123 4567</li>
              <li>info@lankafix.lk</li>
              <li className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                Colombo, Sri Lanka (Phase 1)
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-background/10 mt-8 pt-6 flex flex-wrap gap-4 justify-between text-xs">
          <span>© 2026 LankaFix. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-background transition-colors">Terms</a>
            <a href="#" className="hover:text-background transition-colors">Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
