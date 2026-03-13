import { Link } from "react-router-dom";
import { MessageCircle, HelpCircle, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { track } from "@/lib/analytics";
import { SUPPORT_WHATSAPP, whatsappLink } from "@/config/contact";

const entries = [
  {
    icon: <MessageCircle className="w-5 h-5" />,
    title: "WhatsApp Support",
    desc: "Chat with us anytime",
    href: whatsappLink(SUPPORT_WHATSAPP),
    external: true,
    gradient: "from-success/15 to-success/5",
    color: "text-success",
  },
  {
    icon: <HelpCircle className="w-5 h-5" />,
    title: "Help & FAQ",
    desc: "Find answers quickly",
    href: "/faq",
    external: false,
    gradient: "from-primary/15 to-primary/5",
    color: "text-primary",
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: "Track Your Job",
    desc: "Live status updates",
    href: "/track",
    external: false,
    gradient: "from-warning/15 to-warning/5",
    color: "text-warning",
  },
];

const V2SupportEntry = () => {
  return (
    <section className="py-10 md:py-12">
      <div className="container">
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="font-heading text-lg md:text-xl font-bold text-foreground mb-1">Need Help?</h2>
          <p className="text-xs text-muted-foreground">We're here for you — before, during, and after your service</p>
        </motion.div>

        <div className="grid grid-cols-3 gap-3">
          {entries.map((entry, i) => {
            const Wrapper = entry.external ? "a" : Link;
            const props = entry.external
              ? { href: entry.href, target: "_blank", rel: "noopener noreferrer" }
              : { to: entry.href };

            return (
              <motion.div
                key={entry.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.35 }}
              >
                {/* @ts-ignore - dynamic component */}
                <Wrapper
                  {...props}
                  className="group flex flex-col items-center text-center gap-3 p-4 bg-card rounded-2xl border border-border/40 hover:border-primary/20 hover:shadow-card-hover transition-all duration-300 active:scale-[0.97]"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${entry.gradient} ${entry.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    {entry.icon}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground font-heading">{entry.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{entry.desc}</p>
                  </div>
                </Wrapper>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default V2SupportEntry;
