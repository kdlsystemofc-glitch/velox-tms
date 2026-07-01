import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock da camada base44 (Revenue.filter/create/update/delete).
// vi.hoisted garante que o mock exista antes do vi.mock (que é içado ao topo).
const { Revenue } = vi.hoisted(() => ({
  Revenue: { filter: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/repositories", () => ({ db: { Revenue } }));

import { ensureRevenueForOrder, cancelRevenuesForOrder } from "./revenueHelper";

beforeEach(() => {
  Revenue.filter.mockReset();
  Revenue.create.mockReset();
  Revenue.update.mockReset();
  Revenue.delete.mockReset();
});

describe("ensureRevenueForOrder", () => {
  it("não cria quando valor <= 0", async () => {
    const r = await ensureRevenueForOrder({ id: "o1" }, { amount: 0 });
    expect(r).toEqual({ created: false });
    expect(Revenue.create).not.toHaveBeenCalled();
  });

  it("não duplica quando já existe receita ativa", async () => {
    Revenue.filter.mockResolvedValue([{ id: "rev1", status: "receivable" }]);
    const r = await ensureRevenueForOrder({ id: "o1" }, { amount: 100 });
    expect(r.created).toBe(false);
    expect(r.revenue.id).toBe("rev1");
    expect(Revenue.create).not.toHaveBeenCalled();
  });

  it("cria receita quando não há ativa", async () => {
    Revenue.filter.mockResolvedValue([{ id: "old", status: "cancelled" }]);
    Revenue.create.mockResolvedValue({ id: "new" });
    const r = await ensureRevenueForOrder({ id: "o1", protocol: "P1", client_name: "ACME" }, { amount: 250 });
    expect(r.created).toBe(true);
    expect(Revenue.create).toHaveBeenCalledOnce();
    expect(Revenue.create.mock.calls[0][0]).toMatchObject({ order_id: "o1", amount: 250, status: "receivable" });
  });
});

describe("cancelRevenuesForOrder", () => {
  it("estorna receivable/overdue e retorna a contagem", async () => {
    Revenue.filter.mockResolvedValue([
      { id: "a", status: "receivable" },
      { id: "b", status: "overdue" },
      { id: "c", status: "received" },
    ]);
    Revenue.update.mockResolvedValue({});
    const n = await cancelRevenuesForOrder("o1");
    expect(n).toBe(2);
    expect(Revenue.update).toHaveBeenCalledTimes(2);
    expect(Revenue.update).toHaveBeenCalledWith("a", { status: "cancelled" });
  });

  it("faz fallback para delete quando update falha", async () => {
    Revenue.filter.mockResolvedValue([{ id: "a", status: "receivable" }]);
    Revenue.update.mockRejectedValue(new Error("CHECK constraint"));
    Revenue.delete.mockResolvedValue({});
    const n = await cancelRevenuesForOrder("o1");
    expect(n).toBe(1);
    expect(Revenue.delete).toHaveBeenCalledWith("a");
  });
});
