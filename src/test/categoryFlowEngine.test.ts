import { describe, it, expect } from "vitest";
import {
  getCategoryFlowConfig,
  resolveFlowFamily,
  getVisibleDiagnosticFields,
  getActiveDisclaimers,
} from "@/data/categoryFlowEngine";

describe("Category Flow Engine", () => {
  // ─── AC ──────────────────────────────
  describe("AC flow", () => {
    it("defaults to inspection_first", () => {
      expect(resolveFlowFamily("AC")).toBe("inspection_first");
    });
    it("general_service → direct_booking", () => {
      expect(resolveFlowFamily("AC", "general_service")).toBe("direct_booking");
    });
    it("installation → consultation_first", () => {
      expect(resolveFlowFamily("AC", "installation")).toBe("consultation_first");
    });
    it("shows R22 warning disclaimer", () => {
      const disclaimers = getActiveDisclaimers("AC", { refrigerant_type: "r22" });
      expect(disclaimers.some(d => d.key === "gas_type")).toBe(true);
    });
    it("hides installation_height when portable selected", () => {
      const fields = getVisibleDiagnosticFields("AC", { ac_type: "portable" });
      expect(fields.some(f => f.key === "installation_height")).toBe(false);
    });
    it("shows installation_height for split_wall", () => {
      const fields = getVisibleDiagnosticFields("AC", { ac_type: "split_wall" });
      expect(fields.some(f => f.key === "installation_height")).toBe(true);
    });
    it("has no requiredConsents (adult_presence handled by toggle)", () => {
      const config = getCategoryFlowConfig("AC");
      expect(config?.requiredConsents).toEqual([]);
    });
  });

  // ─── MOBILE ──────────────────────────
  describe("Mobile flow", () => {
    it("defaults to direct_booking", () => {
      expect(resolveFlowFamily("MOBILE")).toBe("direct_booking");
    });
    it("water_damage service → diagnosis_first", () => {
      expect(resolveFlowFamily("MOBILE", "water_damage")).toBe("diagnosis_first");
    });
    it("no_power service → diagnosis_first", () => {
      expect(resolveFlowFamily("MOBILE", "no_power")).toBe("diagnosis_first");
    });
    it("water_exposed condition overrides to diagnosis_first", () => {
      const result = resolveFlowFamily("MOBILE", "screen_replacement", {
        phone_condition: "water_exposed",
      });
      expect(result).toBe("diagnosis_first");
    });
    it("not_turning_on condition overrides to diagnosis_first", () => {
      const result = resolveFlowFamily("MOBILE", "screen_replacement", {
        phone_condition: "not_turning_on",
      });
      expect(result).toBe("diagnosis_first");
    });
    it("screen_cracked stays direct_booking", () => {
      const result = resolveFlowFamily("MOBILE", "screen_replacement", {
        phone_condition: "screen_cracked",
      });
      expect(result).toBe("direct_booking");
    });
    it("requires pin_passcode and data_risk consents", () => {
      const config = getCategoryFlowConfig("MOBILE");
      expect(config?.requiredConsents).toContain("pin_passcode");
      expect(config?.requiredConsents).toContain("data_risk");
      expect(config?.requiredConsents).toContain("data_safety");
      expect(config?.requiredConsents).toContain("backup_responsibility");
    });
    it("shows water damage critical disclaimer", () => {
      const disclaimers = getActiveDisclaimers("MOBILE", { phone_condition: "water_exposed" });
      expect(disclaimers.some(d => d.key === "water" && d.severity === "critical")).toBe(true);
    });
    it("shows dead phone warning", () => {
      const disclaimers = getActiveDisclaimers("MOBILE", { phone_condition: "not_turning_on" });
      expect(disclaimers.some(d => d.key === "dead_phone")).toBe(true);
    });
  });

  // ─── IT ──────────────────────────────
  describe("IT flow", () => {
    it("defaults to direct_booking", () => {
      expect(resolveFlowFamily("IT")).toBe("direct_booking");
    });
    it("data_recovery service → diagnosis_first", () => {
      expect(resolveFlowFamily("IT", "data_recovery")).toBe("diagnosis_first");
    });
    it("server_support service → diagnosis_first", () => {
      expect(resolveFlowFamily("IT", "server_support")).toBe("diagnosis_first");
    });
    it("motherboard_repair service → diagnosis_first", () => {
      expect(resolveFlowFamily("IT", "motherboard_repair")).toBe("diagnosis_first");
    });
    it("hardware_no_power service → diagnosis_first", () => {
      expect(resolveFlowFamily("IT", "hardware_no_power")).toBe("diagnosis_first");
    });
    it("server device type overrides to diagnosis_first", () => {
      const result = resolveFlowFamily("IT", "laptop_repair", {
        device_type: "server",
      });
      expect(result).toBe("diagnosis_first");
    });
    it("data issue_branch overrides to diagnosis_first", () => {
      const result = resolveFlowFamily("IT", "laptop_repair", {
        issue_branch: "data",
      });
      expect(result).toBe("diagnosis_first");
    });
    it("no_power issue_branch overrides to diagnosis_first", () => {
      const result = resolveFlowFamily("IT", "laptop_repair", {
        issue_branch: "no_power",
      });
      expect(result).toBe("diagnosis_first");
    });
    it("motherboard issue_branch overrides to diagnosis_first", () => {
      const result = resolveFlowFamily("IT", "laptop_repair", {
        issue_branch: "motherboard",
      });
      expect(result).toBe("diagnosis_first");
    });
    it("software issue stays direct_booking", () => {
      const result = resolveFlowFamily("IT", "laptop_repair", {
        issue_branch: "software",
      });
      expect(result).toBe("direct_booking");
    });
    it("remote_possible only visible for software/network/virus", () => {
      const software = getVisibleDiagnosticFields("IT", { issue_branch: "software" });
      expect(software.some(f => f.key === "remote_possible")).toBe(true);

      const hardware = getVisibleDiagnosticFields("IT", { issue_branch: "hardware" });
      expect(hardware.some(f => f.key === "remote_possible")).toBe(false);

      const data = getVisibleDiagnosticFields("IT", { issue_branch: "data" });
      expect(data.some(f => f.key === "remote_possible")).toBe(false);
    });
    it("shows motherboard critical disclaimer", () => {
      const disclaimers = getActiveDisclaimers("IT", { issue_branch: "motherboard" });
      expect(disclaimers.some(d => d.key === "motherboard_warn" && d.severity === "critical")).toBe(true);
    });
  });

  // ─── CCTV ────────────────────────────
  describe("CCTV flow", () => {
    it("shows indoor_outdoor field for new installs", () => {
      const fields = getVisibleDiagnosticFields("CCTV", { request_type: "new_install" });
      expect(fields.some(f => f.key === "indoor_outdoor")).toBe(true);
      expect(fields.some(f => f.key === "remote_viewing")).toBe(true);
      expect(fields.some(f => f.key === "ups_backup")).toBe(true);
    });
    it("hides package-builder fields for repairs", () => {
      const fields = getVisibleDiagnosticFields("CCTV", { request_type: "repair" });
      expect(fields.some(f => f.key === "indoor_outdoor")).toBe(false);
      expect(fields.some(f => f.key === "remote_viewing")).toBe(false);
      expect(fields.some(f => f.key === "ups_backup")).toBe(false);
    });
  });

  // ─── General ─────────────────────────
  describe("Registry", () => {
    it("returns null for unknown category", () => {
      expect(getCategoryFlowConfig("UNKNOWN")).toBeNull();
    });
    it("resolves unknown category to direct_booking", () => {
      expect(resolveFlowFamily("UNKNOWN")).toBe("direct_booking");
    });
  });
});
