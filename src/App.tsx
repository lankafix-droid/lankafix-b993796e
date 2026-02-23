import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import CategoryPage from "./pages/CategoryPage";
import PrecheckPage from "./pages/PrecheckPage";
import PricingBuilder from "./pages/PricingBuilder";
import QuoteApproval from "./pages/QuoteApproval";
import BookingTracker from "./pages/BookingTracker";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/category/:code" element={<CategoryPage />} />
          <Route path="/precheck/:catCode/:svcCode" element={<PrecheckPage />} />
          <Route path="/pricing/:catCode/:svcCode" element={<PricingBuilder />} />
          <Route path="/quote" element={<QuoteApproval />} />
          <Route path="/booking/:jobId" element={<BookingTracker />} />
          <Route path="/categories" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
