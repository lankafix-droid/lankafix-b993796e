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
    <section className="py-16 md:py-20 bg-navy relative overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
        backgroundSize: "32px 32px",
      }} />
      
      <div className="container space-y-10 relative z-10">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-heading text-xl md:text-3xl font-bold text-primary-foreground mb-2">
            Why Sri Lankans Trust LankaFix
          </h2>
          <p className="text-sm text-primary-foreground/45">
            Built for transparency, trust, and real service delivery
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {badges.map((item, i) => (
            <motion.div
              key={i}
              className="flex flex-col items-center text-center gap-3 group"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.06, duration: 0.4, ease: "easeOut" }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300"
                style={{ background: "linear-gradient(135deg, rgba(14,76,146,0.5), rgba(47,174,102,0.3))" }}
              >
                <span className="text-primary-foreground">{item.icon}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-primary-foreground block">{item.label}</span>
                <p className="text-[10px] text-primary-foreground/40 mt-0.5">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default V2TrustStrip;
