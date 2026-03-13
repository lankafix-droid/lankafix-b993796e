import { ShieldCheck, Eye, Award, FileText, MapPin, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const reasons = [
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    title: "Verified Technicians",
    desc: "Background-checked, certified professionals. No random strangers at your door.",
    gradient: "from-primary/15 to-primary/5",
    color: "text-primary",
  },
  {
    icon: <Eye className="w-5 h-5" />,
    title: "Transparent Pricing",
    desc: "See price ranges upfront. Approve every charge before work begins. No hidden fees.",
    gradient: "from-success/15 to-success/5",
    color: "text-success",
  },
  {
    icon: <Award className="w-5 h-5" />,
    title: "Warranty-Backed Service",
    desc: "Parts and labour guaranteed. If something isn't right, we make it right.",
    gradient: "from-warning/15 to-warning/5",
    color: "text-warning",
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: "Digital Invoice & Records",
    desc: "Complete service history, itemized invoices, and device passports — all digital.",
    gradient: "from-accent/15 to-accent/5",
    color: "text-accent",
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    title: "Local to Greater Colombo",
    desc: "Technicians who know your area. Fast response across Colombo and suburbs.",
    gradient: "from-primary/15 to-primary/5",
    color: "text-primary",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: "Pay After Service",
    desc: "No advance payment for most services. Pay only after the job is completed and verified.",
    gradient: "from-success/15 to-success/5",
    color: "text-success",
  },
];

const V2WhyLankaFix = () => {
  return (
    <section className="py-12 md:py-16">
      <div className="container">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-2">
            Why Choose LankaFix?
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            The high-trust, high-transparency alternative to informal repair markets
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {reasons.map((reason, i) => (
            <motion.div
              key={reason.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="bg-card rounded-2xl border border-border/40 p-5 group hover:border-primary/20 hover:shadow-card-hover transition-all duration-300"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${reason.gradient} ${reason.color} flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform duration-300`}>
                {reason.icon}
              </div>
              <h3 className="font-heading font-bold text-sm text-foreground mb-1.5">{reason.title}</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{reason.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Link
            to="/how-pricing-works"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all duration-300"
          >
            Learn how we protect every booking
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default V2WhyLankaFix;
