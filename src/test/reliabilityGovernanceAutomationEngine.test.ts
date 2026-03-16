import { describe, it, expect } from "vitest";
import {
  computeOverdueActions,
  computeDueFollowUps,
  computeUnownedCriticalActions,
  computeShiftReadiness,
  computeGovernanceDigest,
  computeOperatorLoad,
  computeGovernanceRecommendations,
  computeAutomationCandidates,
  type GovernanceAction,
  type ShiftNote,
} from "@/engines/reliabilityGovernanceAutomationEngine";

function makeAction(overrides: Partial<GovernanceAction> = {}): GovernanceAction {
  return {
    id: "a1",
    created_at: new Date(Date.now() - 60_000).toISOString(), // 1m ago
    updated_at: new Date().toISOString(),
    action_type: "hotspot_acknowledged",
    action_title: "Test action",
    status: "open",
    priority: "medium",
    owner_name: "Operator A",
    owner_role: "Ops Lead",
    note: "",
    decision_summary: null,
    resolved_at: null,
    source_zone_id: "zone_1",
    source_category_code: "AC",
    metadata: {},
    ...overrides,
  };
}

describe("computeOverdueActions", () => {
  it("returns empty for fresh actions", () => {
    const actions = [makeAction()];
    expect(computeOverdueActions(actions)).toHaveLength(0);
  });

  it("returns overdue open actions (>2h)", () => {
    const actions = [makeAction({ created_at: new Date(Date.now() - 3 * 60 * 60_000).toISOString() })];
    expect(computeOverdueActions(actions)).toHaveLength(1);
  });

  it("excludes resolved actions", () => {
    const actions = [makeAction({ status: "resolved", created_at: new Date(Date.now() - 3 * 60 * 60_000).toISOString() })];
    expect(computeOverdueActions(actions)).toHaveLength(0);
  });

  it("detects critical overdue (>48h)", () => {
    const actions = [makeAction({ status: "waiting", created_at: new Date(Date.now() - 49 * 60 * 60_000).toISOString() })];
    const result = computeOverdueActions(actions);
    expect(result).toHaveLength(1);
  });
});

describe("computeDueFollowUps", () => {
  it("returns empty when no follow-up dates", () => {
    expect(computeDueFollowUps([makeAction()])).toHaveLength(0);
  });

  it("detects follow-up due today", () => {
    const today = new Date().toISOString().split("T")[0];
    const actions = [makeAction({ metadata: { followup_date: today } })];
    expect(computeDueFollowUps(actions)).toHaveLength(1);
  });

  it("detects overdue follow-up", () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
    const actions = [makeAction({ metadata: { followup_date: yesterday } })];
    expect(computeDueFollowUps(actions)).toHaveLength(1);
  });

  it("excludes future follow-ups", () => {
    const future = new Date(Date.now() + 5 * 86_400_000).toISOString().split("T")[0];
    const actions = [makeAction({ metadata: { followup_date: future } })];
    expect(computeDueFollowUps(actions)).toHaveLength(0);
  });
});

describe("computeUnownedCriticalActions", () => {
  it("returns unowned critical actions", () => {
    const actions = [makeAction({ priority: "critical", owner_name: null })];
    expect(computeUnownedCriticalActions(actions)).toHaveLength(1);
  });

  it("returns unowned high actions", () => {
    const actions = [makeAction({ priority: "high", owner_name: null })];
    expect(computeUnownedCriticalActions(actions)).toHaveLength(1);
  });

  it("excludes owned critical actions", () => {
    const actions = [makeAction({ priority: "critical", owner_name: "Kasun" })];
    expect(computeUnownedCriticalActions(actions)).toHaveLength(0);
  });

  it("excludes unowned low actions", () => {
    const actions = [makeAction({ priority: "low", owner_name: null })];
    expect(computeUnownedCriticalActions(actions)).toHaveLength(0);
  });
});

describe("computeShiftReadiness", () => {
  it("returns ready when no issues", () => {
    const result = computeShiftReadiness(
      [makeAction()],
      { note: "All good", operator: "Op", timestamp: new Date().toISOString() },
      { open: 1, critical: 0, inReview: 0, resolvedToday: 0, decisionsToday: 0 },
    );
    expect(result.ready).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });

  it("blocks when unowned critical actions exist", () => {
    const result = computeShiftReadiness(
      [makeAction({ priority: "critical", owner_name: null })],
      { note: "x", operator: "Op", timestamp: new Date().toISOString() },
      null,
    );
    expect(result.ready).toBe(false);
    expect(result.blockers.length).toBeGreaterThan(0);
  });

  it("warns when no shift note", () => {
    const result = computeShiftReadiness([makeAction()], null, null);
    expect(result.warnings).toContain("No shift handover note has been recorded");
  });

  it("blocks when >= 5 overdue actions", () => {
    const old = new Date(Date.now() - 3 * 60 * 60_000).toISOString();
    const actions = Array.from({ length: 5 }, (_, i) =>
      makeAction({ id: `a${i}`, created_at: old })
    );
    const result = computeShiftReadiness(actions, { note: "x", operator: "Op", timestamp: new Date().toISOString() }, null);
    expect(result.ready).toBe(false);
  });
});

describe("computeGovernanceDigest", () => {
  it("returns LOW when everything clean", () => {
    const digest = computeGovernanceDigest([makeAction()], null);
    expect(digest.recommendedAttentionLevel).toBe("LOW");
  });

  it("escalates to CRITICAL for unowned critical", () => {
    const actions = [makeAction({ priority: "critical", owner_name: null })];
    const digest = computeGovernanceDigest(actions, null);
    expect(digest.recommendedAttentionLevel).toBe("CRITICAL");
    expect(digest.unownedCriticalCount).toBe(1);
  });

  it("escalates to HIGH for multiple overdue", () => {
    const old = new Date(Date.now() - 3 * 60 * 60_000).toISOString();
    const actions = Array.from({ length: 3 }, (_, i) => makeAction({ id: `a${i}`, created_at: old }));
    const digest = computeGovernanceDigest(actions, null);
    expect(digest.recommendedAttentionLevel).toBe("HIGH");
  });

  it("includes digest lines", () => {
    const digest = computeGovernanceDigest([], { open: 0, critical: 0, inReview: 0, resolvedToday: 2, decisionsToday: 1 });
    expect(digest.digestLines.some(l => l.includes("resolved"))).toBe(true);
  });
});

describe("computeOperatorLoad", () => {
  it("computes load per operator", () => {
    const actions = [
      makeAction({ id: "1", owner_name: "Kasun" }),
      makeAction({ id: "2", owner_name: "Kasun" }),
      makeAction({ id: "3", owner_name: "Nimal" }),
    ];
    const loads = computeOperatorLoad(actions);
    const kasun = loads.find(l => l.ownerName === "Kasun");
    expect(kasun?.totalActive).toBe(2);
  });

  it("clamps workload score to 0-100", () => {
    const loads = computeOperatorLoad([makeAction()]);
    for (const l of loads) {
      expect(l.workloadScore).toBeGreaterThanOrEqual(0);
      expect(l.workloadScore).toBeLessThanOrEqual(100);
    }
  });

  it("groups unassigned separately", () => {
    const actions = [makeAction({ owner_name: null })];
    const loads = computeOperatorLoad(actions);
    expect(loads.find(l => l.ownerName === "Unassigned")).toBeDefined();
  });
});

describe("computeGovernanceRecommendations", () => {
  it("recommends assigning owners for unowned critical", () => {
    const recs = computeGovernanceRecommendations(
      [makeAction({ priority: "critical", owner_name: null })],
      null,
    );
    expect(recs.some(r => r.title.includes("Assign owners"))).toBe(true);
  });

  it("recommends snapshot refresh when stale", () => {
    const recs = computeGovernanceRecommendations([], null, "stale");
    expect(recs.some(r => r.title.includes("snapshot"))).toBe(true);
  });

  it("recommends shift handover when missing", () => {
    const recs = computeGovernanceRecommendations([], null);
    expect(recs.some(r => r.title.includes("handover"))).toBe(true);
  });
});

describe("computeAutomationCandidates", () => {
  it("suggests reminding owner for overdue owned items", () => {
    const old = new Date(Date.now() - 3 * 60 * 60_000).toISOString();
    const actions = [makeAction({ created_at: old, owner_name: "Kasun" })];
    const candidates = computeAutomationCandidates(actions);
    expect(candidates.some(c => c.suggestion === "Remind owner")).toBe(true);
  });

  it("suggests management review for unowned critical", () => {
    const actions = [makeAction({ priority: "critical", owner_name: null })];
    const candidates = computeAutomationCandidates(actions);
    expect(candidates.some(c => c.suggestion === "Management review suggested")).toBe(true);
  });

  it("returns empty for resolved actions", () => {
    const actions = [makeAction({ status: "resolved" })];
    expect(computeAutomationCandidates(actions)).toHaveLength(0);
  });

  it("deterministic output for identical input", () => {
    const actions = [makeAction({ priority: "critical", owner_name: null, created_at: "2025-01-01T00:00:00Z" })];
    const r1 = computeAutomationCandidates(actions);
    const r2 = computeAutomationCandidates(actions);
    expect(r1).toEqual(r2);
  });
});
