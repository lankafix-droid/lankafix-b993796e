import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
  {
    q: "How does LankaFix work?",
    a: "Choose a service, describe your issue, and we match you with a verified technician. You'll see transparent pricing before booking. The technician arrives, diagnoses, and provides a quote for your approval before any work begins.",
  },
  {
    q: "Is there an advance payment?",
    a: "For most services, you pay only after the job is done and verified. A small commitment fee secures your booking slot and is deducted from the final bill. Online payment and cash are both accepted.",
  },
  {
    q: "How are technicians verified?",
    a: "Every LankaFix technician goes through identity verification, skill assessment, and background checks. They're rated by real customers after every job, and we monitor performance continuously.",
  },
  {
    q: "What areas do you cover?",
    a: "We currently serve Greater Colombo including Colombo 1–15, Rajagiriya, Battaramulla, Nawala, Nugegoda, Dehiwala, Mount Lavinia, and Thalawathugoda. We're expanding to more areas soon.",
  },
  {
    q: "What if I'm not satisfied with the service?",
    a: "All services include a warranty on parts and labour. If something isn't right, contact us and we'll arrange a revisit or resolve the issue through our mediation process.",
  },
  {
    q: "Can I get a price estimate before booking?",
    a: "Yes. You'll see estimated price ranges before booking. For diagnostic-first services, the technician will provide a detailed quote for your approval after inspection — no surprises.",
  },
];

const V2HomeFAQ = () => {
  return (
    <section className="py-12 md:py-16 bg-card border-t border-border/30">
      <div className="container max-w-2xl">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-2">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-muted-foreground">
            Quick answers to common questions about LankaFix
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <Accordion type="single" collapsible className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="bg-background rounded-xl border border-border/50 px-5 data-[state=open]:border-primary/20 data-[state=open]:shadow-card-hover transition-all duration-300"
              >
                <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-4 text-left">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-[13px] text-muted-foreground leading-relaxed pb-4">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Link
            to="/faq"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all duration-300"
          >
            View all FAQs
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default V2HomeFAQ;
