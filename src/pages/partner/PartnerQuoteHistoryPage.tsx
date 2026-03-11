import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCurrentPartner, usePartnerQuotes } from "@/hooks/useCurrentPartner";
import { useState } from "react";
import { ArrowLeft, FileText, Loader2, Search, UserPlus, Filter } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-primary/10 text-primary",
  awaiting_approval: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  revision_requested: "bg-warning/10 text-warning",
  expired: "bg-muted text-muted-foreground",
};

export default function PartnerQuoteHistoryPage() {
  const navigate = useNavigate();
  const { data: partner, isLoading: partnerLoading } = useCurrentPartner();
  const { data: quotes = [], isLoading: quotesLoading } = usePartnerQuotes(partner?.id);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  if (partnerLoading || quotesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <UserPlus className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-bold text-foreground">No Partner Profile</h2>
            <Button onClick={() => navigate("/join")}>Join as Provider</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statuses = ["all", "draft", "submitted", "awaiting_approval", "approved", "rejected", "revision_requested", "expired"];

  const filtered = quotes.filter((q: any) => {
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        q.id?.toLowerCase().includes(s) ||
        q.booking_id?.toLowerCase().includes(s) ||
        q.status?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/partner")} aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Quote History</h1>
          <p className="text-xs text-muted-foreground">{quotes.length} total quotes</p>
        </div>
      </div>

      <div className="p-4 space-y-3 max-w-2xl mx-auto">
        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search quotes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {statuses.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              className="text-[10px] h-7 px-2"
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "All" : s.replace(/_/g, " ")}
            </Button>
          ))}
        </div>

        {/* Quotes List */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {quotes.length === 0 ? "No quotes yet. Quotes will appear here as you submit them for jobs." : "No quotes match your filter."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((q: any) => {
              const booking = q.bookings;
              return (
                <Card key={q.id} className="cursor-pointer hover:border-primary/30" onClick={() => navigate(`/partner/job/${q.booking_id}`)}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {q.total_lkr ? `LKR ${q.total_lkr.toLocaleString()}` : "Draft"}
                      </span>
                      <Badge className={`text-[10px] ${STATUS_COLORS[q.status] || "bg-muted text-muted-foreground"}`}>
                        {q.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {booking?.category_code || "—"} • {booking?.service_type || "General"}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(q.created_at).toLocaleDateString()}
                      </p>
                      {q.customer_note && (
                        <p className="text-[10px] text-warning truncate max-w-[150px]">
                          Customer: {q.customer_note}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
