import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import CategoriesPage from "./pages/CategoriesPage";
import CategoryPage from "./pages/CategoryPage";
import PrecheckPage from "./pages/PrecheckPage";
import PricingBuilder from "./pages/PricingBuilder";
import QuoteApproval from "./pages/QuoteApproval";
import BookingTracker from "./pages/BookingTracker";
import TrackJob from "./pages/TrackJob";
import WaitlistPage from "./pages/WaitlistPage";
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
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/category/:code" element={<CategoryPage />} />
          <Route path="/precheck/:catCode/:svcCode" element={<PrecheckPage />} />
          <Route path="/pricing/:catCode/:svcCode" element={<PricingBuilder />} />
          <Route path="/quote/:jobId" element={<QuoteApproval />} />
          <Route path="/tracker/:jobId" element={<BookingTracker />} />
          <Route path="/track" element={<TrackJob />} />
          <Route path="/waitlist" element={<WaitlistPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
