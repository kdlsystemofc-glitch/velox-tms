import { describe, it, expect } from "vitest";
import { suggestMatch, matchCandidates } from "./reconcileMatch";

const revenues = [
  { id: "r1", amount: 1200, due_date: "2024-01-14", description: "Frete A", status: "receivable" },
  { id: "r2", amount: 1200, due_date: "2024-03-01", description: "Frete B", status: "receivable" },
  { id: "r3", amount: 999, due_date: "2024-01-15", description: "Frete C", status: "receivable" },
];
const expenses = [
  { id: "e1", amount: 350.5, due_date: "2024-01-16", description: "Combustível", status: "pending" },
];

describe("suggestMatch", () => {
  it("crédito casa receita de valor exato mais próxima na data", () => {
    const m = suggestMatch({ amount: 1200, posted_at: "2024-01-15" }, revenues, expenses);
    expect(m).toMatchObject({ type: "revenue", confidence: "high" });
    expect(m.candidate.id).toBe("r1"); // 1 dia vs 46 dias
  });
  it("débito casa despesa de valor exato", () => {
    const m = suggestMatch({ amount: -350.5, posted_at: "2024-01-16" }, revenues, expenses);
    expect(m).toMatchObject({ type: "expense", confidence: "high" });
    expect(m.candidate.id).toBe("e1");
  });
  it("sem valor exato, sem sugestão", () => {
    expect(suggestMatch({ amount: 7777, posted_at: "2024-01-15" }, revenues, expenses)).toBeNull();
  });
  it("confiança média quando longe na data", () => {
    const m = suggestMatch({ amount: 1200, posted_at: "2024-02-10" }, [revenues[1]], []);
    expect(m.confidence).toBe("medium"); // ~21 dias
  });
});

describe("matchCandidates", () => {
  it("lista o lado certo ordenado por data", () => {
    const c = matchCandidates({ amount: 500, posted_at: "2024-01-15" }, revenues, expenses);
    expect(c.every(x => x.type === "revenue")).toBe(true);
    expect(c).toHaveLength(3);
  });
});
