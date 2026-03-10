import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageTransition from "@/components/motion/PageTransition";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <PageTransition className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-sm"
      >
        <div className="w-20 h-20 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-6">
          <Search className="w-9 h-9 text-muted-foreground/50" />
        </div>
        <h1 className="font-heading text-5xl font-extrabold text-foreground mb-2">404</h1>
        <p className="text-lg font-semibold text-foreground mb-1">Page not found</p>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button className="bg-gradient-to-r from-primary to-primary/85 text-primary-foreground rounded-xl h-12 px-8 font-semibold gap-2 shadow-sm active:scale-[0.97] transition-transform">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
      </motion.div>
    </PageTransition>
  );
};

export default NotFound;
