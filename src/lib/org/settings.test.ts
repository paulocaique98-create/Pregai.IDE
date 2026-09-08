import { describe, expect, it } from "vitest";
import { canEditOrgSettings, validateOrgSettings } from "./settings";

describe("canEditOrgSettings", () => {
  it("owner e pastor podem", () => {
    expect(canEditOrgSettings("owner")).toBe(true);
    expect(canEditOrgSettings("pastor")).toBe(true);
  });
  it("secretaria, lider, membro e nulo não podem", () => {
    for (const r of ["secretaria", "lider", "membro", null] as const)
      expect(canEditOrgSettings(r)).toBe(false);
  });
});

describe("validateOrgSettings", () => {
  it("aceita nome + modo válidos", () => {
    const r = validateOrgSettings({ name: "  Igreja X  ", memberMode: "open" });
    expect(r).toEqual({ ok: true, name: "Igreja X", memberMode: "open" });
  });
  it("rejeita nome vazio", () => {
    expect(validateOrgSettings({ name: "   ", memberMode: "approval" }).ok).toBe(false);
  });
  it("rejeita nome longo", () => {
    expect(validateOrgSettings({ name: "a".repeat(121), memberMode: "approval" }).ok).toBe(false);
  });
  it("rejeita modo inválido", () => {
    expect(validateOrgSettings({ name: "X", memberMode: "auto" }).ok).toBe(false);
    expect(validateOrgSettings({ name: "X" }).ok).toBe(false);
  });
});
