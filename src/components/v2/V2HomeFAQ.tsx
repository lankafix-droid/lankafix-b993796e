import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { track } from "@/lib/analytics";
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
    a: "Describe your issue, see transparent pricing, and get matched with a verified technician. You'll approve a final quote before any work begins. Pay only after completion.",
  },
  {
    q: "Do I need to pay in advance?",
    a: "No. For most services, you pay only after the job is done. A small commitment fee secures your slot and is deducted from the final bill.",
  },
  {
    q: "How are technicians verified?",
    a: "Every technician goes through identity verification, skill assessment, and background checks. They're rated after every job, and we monitor quality continuously.",
  },
  {
    q: "What areas do you cover?",
    a: "We currently serve Greater Colombo — including Colombo 1–15, Rajagiriya, Battaramulla, Nugegoda, Dehiwala, Mount Lavinia, and surrounding areas. Expanding soon.",
  },
  {
    q: "What if I'm not happy with the service?",
    a: "All services include a warranty on parts and labour. If something isn't right, we'll arrange a free revisit or resolve it through our mediation process.",
  },
];

const V2HomeFAQ = () => {
  return (
    <section className="py-12 md:py-16 bg-card border-t border-border/20">
      <div className="container max-w-2xl">
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-1">
            Common Questions
          </h2>
          <p className="text-sm text-muted-foreground">
            Quick answers about how LankaFix works
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.08, duration: 0.35 }}
        >
          <Accordion type="single" collapsible className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="bg-background rounded-xl border border-border/40 px-5 data-[state=open]:border-primary/15 transition-all duration-200"
              >
                <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-4 text-left" onClick={() => track("homepage_faq_expand", { question: item.q })}>
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
          className="text-center mt-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <Link
            to="/faq"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2 transition-all duration-200"
          >
            View all FAQs
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default V2HomeFAQ;
