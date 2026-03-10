import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import PageTransition from "@/components/motion/PageTransition";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShieldCheck, CreditCard, Wrench, Clock, HelpCircle, MessageCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { SUPPORT_WHATSAPP, whatsappLink } from "@/config/contact";

const FAQ_SECTIONS = [
  {
    title: "Trust & Safety",
    icon: <ShieldCheck className="w-5 h-5" />,
    faqs: [
      { q: "How do I know the technician is trustworthy?", a: "Every LankaFix technician goes through identity verification, skill assessment, and background checks. They carry a LankaFix-verified digital ID, and your job is secured with OTP verification at start and completion." },
      { q: "What if the technician does a bad job?", a: "Every job comes with a service warranty. If something isn't right, contact us within the warranty period and we'll send a technician back at no extra cost. We also have a mediation system for disputes." },
      { q: "Is my personal information safe?", a: "Yes. Your phone number is masked from technicians. All data is encrypted, and we never share your information with third parties." },
      { q: "What is OTP verification?", a: "OTP ensures security at job start and completion. You'll receive a code — the technician needs it to proceed, confirming your authorization." },
    ],
  },
  {
    title: "Pricing & Payments",
    icon: <CreditCard className="w-5 h-5" />,
    faqs: [
      { q: "Can I pay cash after the service?", a: "Yes! You can pay cash after completion. We also support online payment. Either way, you'll receive a digital invoice." },
      { q: "Are there hidden charges?", a: "Never. You see the price upfront for fixed-price services, or a detailed quote before any work begins. You must approve every charge." },
      { q: "What is the diagnostic fee?", a: "For complex issues, a small diagnostic fee (from LKR 1,000) covers the visit to assess the problem. This is deducted from your final bill if you proceed." },
      { q: "How does pricing work for large installations?", a: "For CCTV, Solar, or Smart Home installations, a technician visits first. You'll receive a detailed quote with labor and parts breakdown. Milestone payments reduce risk." },
    ],
  },
  {
    title: "Services & Booking",
    icon: <Wrench className="w-5 h-5" />,
    faqs: [
      { q: "What services does LankaFix offer?", a: "We cover 9+ categories: Mobile Repair, IT Support, AC Service, CCTV, Solar, Electronics, Smart Home, Copier Repair, and Printing Supplies." },
      { q: "How do I book a service?", a: "Choose your category, select the service, answer a few questions, pick a time slot, and confirm. Instant booking confirmation." },
      { q: "What areas do you cover?", a: "Currently Greater Colombo and surrounding areas. We're expanding to Kandy and Galle soon — join our waitlist!" },
      { q: "Do you offer emergency services?", a: "Yes! 24/7 emergency support for urgent issues like AC breakdowns, power failures, and security system failures." },
    ],
  },
  {
    title: "During & After Service",
    icon: <Clock className="w-5 h-5" />,
    faqs: [
      { q: "Can I track my technician?", a: "Yes! See real-time location, estimated arrival time, and communicate via in-app chat with masked contact info." },
      { q: "What if extra work is needed?", a: "A revised quote is submitted through the app. You must approve before any extra work begins." },
      { q: "Do I get a warranty?", a: "Yes! Warranty periods vary by service type (7-365 days). Valid only for in-platform jobs." },
      { q: "How do I get my invoice?", a: "A digital invoice is generated automatically after completion. Access it anytime from your account." },
    ],
  },
];

const FAQPage = () => {
  return (
    <PageTransition className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-primary/8 to-background pt-6 pb-8">
          <div className="container max-w-2xl px-4">
            <Link to="/account" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <HelpCircle className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Frequently Asked Questions</h1>
              <p className="text-sm text-muted-foreground">Everything you need to know about LankaFix</p>
            </motion.div>
          </div>
        </section>

        {/* FAQ Sections */}
        <section className="py-6 pb-28">
          <div className="container max-w-2xl px-4 space-y-8">
            {FAQ_SECTIONS.map((section, si) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: si * 0.06, duration: 0.4 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    {section.icon}
                  </div>
                  <h2 className="text-base font-bold text-foreground">{section.title}</h2>
                </div>
                <Accordion type="single" collapsible className="space-y-2">
                  {section.faqs.map((faq, i) => (
                    <AccordionItem key={i} value={`${si}-${i}`} className="bg-card rounded-xl border border-border/60 px-5 data-[state=open]:shadow-[var(--shadow-card)]">
                      <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-4 text-left">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Still have questions CTA */}
        <section className="py-10 bg-secondary/30">
          <div className="container max-w-2xl px-4 text-center">
            <MessageCircle className="w-8 h-8 text-success mx-auto mb-3" />
            <h2 className="text-base font-bold text-foreground mb-2">Still Have Questions?</h2>
            <p className="text-sm text-muted-foreground mb-5">Our support team typically replies within minutes</p>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <Button asChild className="rounded-xl h-12 font-semibold bg-success hover:bg-success/90 text-white">
                <a href={whatsappLink(SUPPORT_WHATSAPP, "Hi! I have a question about LankaFix")} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat on WhatsApp
                </a>
              </Button>
              <Button asChild variant="outline" className="rounded-xl h-12 font-semibold">
                <Link to="/">Browse Services</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </PageTransition>
  );
};

export default FAQPage;
