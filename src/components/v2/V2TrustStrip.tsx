import { ShieldCheck, Eye, Award, Lock, HeartHandshake, FileText, MessageCircle, KeyRound } from "lucide-react";
import { motion } from "framer-motion";

const badges = [
  { icon: <ShieldCheck className="w-5 h-5" />, label: "Verified Technicians", desc: "Background checked & certified" },
  { icon: <Eye className="w-5 h-5" />, label: "Transparent Pricing", desc: "No hidden fees, ever" },
  { icon: <KeyRound className="w-5 h-5" />, label: "OTP Job Verification", desc: "Secure start & completion" },
  { icon: <Award className="w-5 h-5" />, label: "Approval Before Extra Work", desc: "No surprises on your bill" },
  { icon: <FileText className="w-5 h-5" />, label: "Digital Invoice", desc: "Complete breakdown after service" },
  { icon: <Lock className="w-5 h-5" />, label: "Warranty Included", desc: "Parts and labor guaranteed" },
  { icon: <HeartHandshake className="w-5 h-5" />, label: "LankaFix Mediation", desc: "We resolve disputes fairly" },
  { icon: <MessageCircle className="w-5 h-5" />, label: "WhatsApp Support", desc: "Help when you need it" },
];

const V2TrustStrip = () => {
  return (
    <section className="py-14 bg-navy">
      <div className="container space-y-8">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-lg md:text-xl font-bold text-navy-foreground mb-1">
            Why Sri Lankans Trust LankaFix
          </h2>
          <p className="text-xs text-navy-foreground/60">
            Built for transparency, trust, and real service delivery
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {badges.map((item, i) => (
            <motion.div
              key={i}
              className="flex flex-col items-center text-center gap-3"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.06, duration: 0.4, ease: "easeOut" }}
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-primary">{item.icon}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-navy-foreground block">{item.label}</span>
                <p className="text-[10px] text-navy-foreground/50 mt-0.5">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default V2TrustStrip;
