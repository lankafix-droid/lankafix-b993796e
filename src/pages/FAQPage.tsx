import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShieldCheck, CreditCard, Wrench, Clock, HelpCircle, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { SUPPORT_WHATSAPP, whatsappLink } from "@/config/contact";

const FAQ_SECTIONS = [
  {
    title: "Trust & Safety",
    icon: <ShieldCheck className="w-5 h-5" />,
    faqs: [
      { q: "How do I know the technician is trustworthy?", a: "Every LankaFix technician goes through identity verification, skill assessment, and background checks. They carry a LankaFix-verified digital ID, and your job is secured with OTP verification at start and completion. You can also see their rating, completed jobs count, and specializations before they arrive." },
      { q: "What if the technician does a bad job?", a: "Every LankaFix job comes with a service warranty. If something isn't right, contact us within the warranty period and we'll send a technician back at no extra cost. We also have a mediation system for disputes — LankaFix acts as a neutral party to resolve issues fairly." },
      { q: "Is my personal information safe?", a: "Yes. Your phone number is masked from technicians until booking confirmation. All data is encrypted, and we never share your personal information with third parties. Read our full Privacy Policy for details." },
      { q: "What is OTP verification?", a: "OTP (One-Time Password) verification ensures security at two key points: when the technician starts work, and when the job is completed. You'll receive a code on your phone — the technician needs this code to proceed. This prevents unauthorized work and ensures you confirm satisfaction." },
    ],
  },
  {
    title: "Pricing & Payments",
    icon: <CreditCard className="w-5 h-5" />,
    faqs: [
      { q: "Can I pay cash after the service?", a: "Yes! We understand Sri Lankan preferences — you can pay cash after the service is completed. We also support online payment through the app. Either way, you'll receive a digital invoice with a complete breakdown." },
      { q: "Are there hidden charges?", a: "Never. LankaFix shows you the price upfront for fixed-price services, or provides a detailed quote breakdown before any work begins on diagnostic/inspection services. You must approve every charge in the app before work starts." },
      { q: "What is the diagnostic/inspection fee?", a: "For complex issues, a small diagnostic fee (starting from LKR 1,000) covers the technician's visit to assess the problem. This fee is non-refundable but is deducted from your final bill if you proceed with the repair. Think of it as a commitment from both sides." },
      { q: "How does pricing work for large installations?", a: "For projects like CCTV, Solar, or Smart Home installations, a technician visits for a site inspection first. Based on the inspection, you'll receive a detailed quote with labor, parts, and materials breakdown. You approve the quote in the app before any work begins. Large projects use milestone payments for your protection." },
      { q: "What are milestone payments?", a: "For large projects (CCTV, Solar, Smart Home), the total cost is split into stages: inspection approval, equipment delivery, installation completion, and testing/handover. You pay at each milestone, reducing risk for both you and the technician." },
    ],
  },
  {
    title: "Services & Booking",
    icon: <Wrench className="w-5 h-5" />,
    faqs: [
      { q: "What services does LankaFix offer?", a: "We cover 9 categories: Mobile & Device Repair, IT Support, AC Service & Repair, CCTV & Security, Solar Power, Consumer Electronics (TV, fridge, washing machine), Smart Home/Office, Copier/Printer Repair, and Printing Supplies. Each category has multiple specific services." },
      { q: "How do I book a service?", a: "Simply open LankaFix, choose your service category, select the specific service, answer a few quick questions about your issue, pick a time slot, and confirm. You'll receive a booking confirmation instantly. No account required for browsing — sign up when you're ready to book." },
      { q: "Can I book for someone else?", a: "Yes! You can book a service for a family member, friend, or tenant. Just provide the service address during booking. The person at the location will need to verify the technician's arrival via OTP." },
      { q: "What areas do you cover?", a: "Currently, we serve Greater Colombo: Colombo 1-15, Dehiwala, Mount Lavinia, Nugegoda, Maharagama, Kottawa, Kaduwela, Battaramulla, Rajagiriya, and surrounding areas. We're expanding to Kandy and Galle soon — join our waitlist to be notified!" },
      { q: "Do you offer emergency services?", a: "Yes! We have 24/7 emergency support for urgent issues like AC breakdowns, power failures, or security system failures. Emergency bookings have faster response times and may include a small surcharge." },
    ],
  },
  {
    title: "During & After Service",
    icon: <Clock className="w-5 h-5" />,
    faqs: [
      { q: "Can I track my technician?", a: "Yes! Once a technician is assigned, you can track their real-time location, see their estimated arrival time, and communicate through the in-app chat (contact info is masked for your protection)." },
      { q: "What if extra work is needed during the repair?", a: "If the technician discovers additional issues, they must submit a revised quote through the app. You'll see the full breakdown and must approve before any extra work begins. No surprises on your bill — ever." },
      { q: "Do I get a warranty?", a: "Yes! Every LankaFix job includes a service warranty. The warranty period varies by service type (7-365 days). Warranty is valid only for jobs completed through the LankaFix platform — this ensures quality accountability." },
      { q: "How do I get my invoice?", a: "A digital invoice is automatically generated after job completion. It includes service details, labor cost, parts cost, warranty information, and the LankaFix reference number. You can access it anytime from your account." },
      { q: "What if I'm not satisfied?", a: "Contact us immediately through WhatsApp or the app. LankaFix has a formal mediation process: we review the job evidence (photos, timeline, technician notes) and work to resolve the issue fairly. Refunds are processed according to our refund policy." },
    ],
  },
];

const FAQPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-navy py-14 md:py-20">
          <div className="container max-w-3xl text-center">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <HelpCircle className="w-10 h-10 mx-auto mb-4" style={{ color: "hsl(211, 80%, 60%)" }} />
              <h1 className="font-heading text-3xl md:text-4xl font-extrabold text-white mb-3">Frequently Asked Questions</h1>
              <p className="text-sm md:text-base text-white/50">Everything you need to know about using LankaFix</p>
            </motion.div>
          </div>
        </section>

        {/* FAQ Sections */}
        <section className="py-12 md:py-16">
          <div className="container max-w-3xl space-y-10">
            {FAQ_SECTIONS.map((section, si) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: si * 0.08, duration: 0.4 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    {section.icon}
                  </div>
                  <h2 className="font-heading text-lg font-bold text-foreground">{section.title}</h2>
                </div>
                <Accordion type="single" collapsible className="space-y-2">
                  {section.faqs.map((faq, i) => (
                    <AccordionItem key={i} value={`${si}-${i}`} className="bg-card rounded-xl border border-border/60 px-5 data-[state=open]:shadow-sm">
                      <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-4">
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
        <section className="py-12 bg-secondary/50">
          <div className="container max-w-2xl text-center">
            <MessageCircle className="w-8 h-8 text-success mx-auto mb-3" />
            <h2 className="font-heading text-lg font-bold text-foreground mb-2">Still Have Questions?</h2>
            <p className="text-sm text-muted-foreground mb-6">Our support team is available on WhatsApp — we typically reply within minutes</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="rounded-full font-heading font-bold bg-success hover:bg-success/90">
                <a href={whatsappLink(SUPPORT_WHATSAPP, "Hi! I have a question about LankaFix")} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat on WhatsApp
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full font-heading font-bold">
                <Link to="/">Browse Services</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default FAQPage;
