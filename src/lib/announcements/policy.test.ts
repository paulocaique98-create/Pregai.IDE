import { describe, expect, it } from "vitest";
import { canManageAnnouncements, validateAnnouncement } from "./policy";

describe("canManageAnnouncements", () => {
  it("owner/pastor/secretaria gerenciam", () => {
    for (const r of ["owner", "pastor", "secretaria"] as const)
      expect(canManageAnnouncements(r)).toBe(true);
  });
  it("lider/membro/nulo não gerenciam", () => {
    for (const r of ["lider", "membro", null] as const)
      expect(canManageAnnouncements(r)).toBe(false);
  });
});

describe("validateAnnouncement", () => {
  it("aceita título + corpo", () => {
    expect(validateAnnouncement({ title: " Culto ", body: " amanhã " })).toEqual({
      ok: true,
      title: "Culto",
      body: "amanhã",
    });
  });
  it("aceita corpo vazio", () => {
    const r = validateAnnouncement({ title: "X" });
    expect(r.ok && r.body).toBe("");
  });
  it("rejeita título vazio", () => {
    expect(validateAnnouncement({ title: "   " }).ok).toBe(false);
  });
  it("rejeita título/corpo longos", () => {
    expect(validateAnnouncement({ title: "a".repeat(201) }).ok).toBe(false);
    expect(validateAnnouncement({ title: "ok", body: "b".repeat(5001) }).ok).toBe(false);
  });
});
