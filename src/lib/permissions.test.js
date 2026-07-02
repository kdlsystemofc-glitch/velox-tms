import { describe, it, expect } from "vitest";
import { can, CAPABILITIES } from "./permissions";

const admin = { role: "admin" };
const operator = { role: "operator" };
const client = { role: "client" };
const driver = { role: "motorista" };

// Espelha a porteira única do servidor (has_capability): papel-base E deny-overlay.
describe("can() — política central (P07.1)", () => {
  it("nega quando não há usuário", () => {
    expect(can(null, "pay_invoice")).toBe(false);
  });

  it("equipe (admin/operador) pode capacidades de staff por padrão", () => {
    for (const cap of ["pay_invoice", "reconcile", "cancel_order", "offer_carrier"]) {
      expect(can(admin, cap)).toBe(true);
      expect(can(operator, cap)).toBe(true);
    }
  });

  it("não-staff (cliente/motorista) não tem capacidades sensíveis", () => {
    for (const cap of CAPABILITIES.map((c) => c.key)) {
      expect(can(client, cap)).toBe(false);
      expect(can(driver, cap)).toBe(false);
    }
  });

  it("approve_access é só admin (operador não)", () => {
    expect(can(admin, "approve_access")).toBe(true);
    expect(can(operator, "approve_access")).toBe(false);
  });

  it("deny-overlay: capacidade negada explicitamente é bloqueada mesmo para staff", () => {
    const restricted = { role: "operator", permissions: { pay_invoice: false } };
    expect(can(restricted, "pay_invoice")).toBe(false);
    expect(can(restricted, "reconcile")).toBe(true); // outras seguem permitidas
  });

  it("permissão presente e true não altera o default", () => {
    const u = { role: "operator", permissions: { reconcile: true } };
    expect(can(u, "reconcile")).toBe(true);
  });
});
