import { describe, expect, it } from "vitest";
import {
  assignableRoles,
  canManage,
  isValidTransition,
  type MemberStatus,
} from "./policy";

describe("máquina de estados", () => {
  const ok: [MemberStatus, MemberStatus][] = [
    ["pending", "active"],
    ["active", "blocked"],
    ["blocked", "active"],
  ];
  const bad: [MemberStatus, MemberStatus][] = [
    ["active", "pending"],
    ["blocked", "pending"],
    ["pending", "blocked"],
  ];
  it.each(ok)("permite %s -> %s", (a, b) => expect(isValidTransition(a, b)).toBe(true));
  it.each(bad)("bloqueia %s -> %s", (a, b) => expect(isValidTransition(a, b)).toBe(false));
});

describe("canManage — aprovar", () => {
  it("owner/pastor/secretaria aprovam", () => {
    for (const r of ["owner", "pastor", "secretaria"] as const)
      expect(canManage(r, "approve")).toBe(true);
  });
  it("lider/membro não aprovam", () => {
    expect(canManage("lider", "approve")).toBe(false);
    expect(canManage("membro", "approve")).toBe(false);
    expect(canManage(null, "approve")).toBe(false);
  });
});

describe("canManage — bloquear (proteção de alvo)", () => {
  it("secretaria bloqueia membro", () =>
    expect(canManage("secretaria", "block", { role: "membro" })).toBe(true));
  it("ninguém bloqueia owner", () => {
    for (const r of ["owner", "pastor", "secretaria"] as const)
      expect(canManage(r, "block", { role: "owner" })).toBe(false);
  });
  it("só owner bloqueia pastor", () => {
    expect(canManage("owner", "block", { role: "pastor" })).toBe(true);
    expect(canManage("pastor", "block", { role: "pastor" })).toBe(false);
    expect(canManage("secretaria", "block", { role: "pastor" })).toBe(false);
  });
  it("ninguém bloqueia a si mesmo", () =>
    expect(canManage("owner", "block", { role: "owner", self: true })).toBe(false));
});

describe("canManage — alterar papel", () => {
  it("secretaria NÃO altera papel", () =>
    expect(canManage("secretaria", "set_role", { role: "membro" })).toBe(false));
  it("owner/pastor alteram papel de membro", () => {
    expect(canManage("owner", "set_role", { role: "membro" })).toBe(true);
    expect(canManage("pastor", "set_role", { role: "membro" })).toBe(true);
  });
  it("só owner mexe em pastor", () => {
    expect(canManage("owner", "set_role", { role: "pastor" })).toBe(true);
    expect(canManage("pastor", "set_role", { role: "pastor" })).toBe(false);
  });
  it("ninguém altera owner", () =>
    expect(canManage("owner", "set_role", { role: "owner" })).toBe(false));
});

describe("assignableRoles", () => {
  it("owner concede qualquer papel não-owner", () =>
    expect(assignableRoles("owner")).toEqual(["pastor", "secretaria", "lider", "membro"]));
  it("pastor não concede pastor", () =>
    expect(assignableRoles("pastor")).toEqual(["secretaria", "lider", "membro"]));
  it("secretaria não concede nada", () => expect(assignableRoles("secretaria")).toEqual([]));
});

describe("convites", () => {
  it("secretaria cria convite mas não de staff", () => {
    expect(canManage("secretaria", "create_invite")).toBe(true);
    expect(canManage("secretaria", "invite_staff")).toBe(false);
  });
  it("owner/pastor convidam staff", () => {
    expect(canManage("owner", "invite_staff")).toBe(true);
    expect(canManage("pastor", "invite_staff")).toBe(true);
  });
  it("lider não cria convite", () => expect(canManage("lider", "create_invite")).toBe(false));
});
