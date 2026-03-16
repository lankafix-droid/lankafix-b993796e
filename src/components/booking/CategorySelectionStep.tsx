import { CONSUMER_CATEGORIES, type BookingCategory } from "@/data/consumerBookingCategories";
import { motion } from "framer-motion";

interface Props {
  selected: string;
  onSelect: (code: string) => void;
}

const CategorySelectionStep = ({ selected, onSelect }: Props) => (
  <div className="space-y-5">
    <div>
      <h2 className="text-xl font-bold text-foreground">What do you need fixed?</h2>
      <p className="text-sm text-muted-foreground mt-1">Select a service category to get started.</p>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {CONSUMER_CATEGORIES.map((cat, i) => (
        <motion.button
          key={cat.code}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.25 }}
          onClick={() => onSelect(cat.code)}
          className={`flex flex-col items-start gap-2 p-4 rounded-2xl border text-left transition-all active:scale-[0.97] ${
            selected === cat.code
              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
              : "border-border/50 bg-card hover:border-border hover:shadow-sm"
          }`}
        >
          <span className="text-2xl">{cat.icon}</span>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">{cat.label}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{cat.description}</p>
          </div>
        </motion.button>
      ))}
    </div>
  </div>
);

export default CategorySelectionStep;
