import { Filter } from "lucide-react";

type Props = {
  filterCategory: string;
  setFilterCategory: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  filterAssigned: string;
  setFilterAssigned: (v: string) => void;
  uniqueCategories: string[];
  catNameMap: Record<string, string>;
};

export default function DemandFilters({
  filterCategory, setFilterCategory,
  filterStatus, setFilterStatus,
  filterAssigned, setFilterAssigned,
  uniqueCategories, catNameMap,
}: Props) {
  const selectCls = "px-2 py-1 rounded border bg-card text-foreground text-xs";

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Filter className="w-3.5 h-3.5" /> Filters:
      </div>
      <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={selectCls}>
        <option value="all">All Categories</option>
        {uniqueCategories.map((c) => <option key={c} value={c}>{catNameMap[c] || c}</option>)}
      </select>
      <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectCls}>
        <option value="all">All Status</option>
        <option value="pending">Pending</option>
        <option value="assigned">Assigned</option>
        <option value="contacted">Contacted</option>
        <option value="converted">Converted</option>
        <option value="closed">Closed</option>
      </select>
      <select value={filterAssigned} onChange={(e) => setFilterAssigned(e.target.value)} className={selectCls}>
        <option value="all">All Leads</option>
        <option value="unassigned">Unassigned</option>
        <option value="assigned">Assigned</option>
      </select>
    </div>
  );
}
