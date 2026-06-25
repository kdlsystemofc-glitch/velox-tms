import { describe, it, expect } from "vitest";
import {
  normalizePriority, priorityRank, isElevatedPriority,
  comparePriority, sortByPriority, DEFAULT_PRIORITY,
} from "./priority";

describe("priority", () => {
  it("normaliza valores inválidos para normal", () => {
    expect(normalizePriority("xpto")).toBe("normal");
    expect(normalizePriority(undefined)).toBe("normal");
    expect(normalizePriority("critical")).toBe("critical");
  });

  it("ranqueia crítica < urgente < normal", () => {
    expect(priorityRank("critical")).toBeLessThan(priorityRank("high"));
    expect(priorityRank("high")).toBeLessThan(priorityRank("normal"));
  });

  it("isElevatedPriority só para urgente/crítica", () => {
    expect(isElevatedPriority("critical")).toBe(true);
    expect(isElevatedPriority("high")).toBe(true);
    expect(isElevatedPriority("normal")).toBe(false);
    expect(isElevatedPriority(DEFAULT_PRIORITY)).toBe(false);
  });

  it("ordena fila: críticos primeiro, normais por último", () => {
    const orders = [
      { id: "a", priority: "normal" },
      { id: "b", priority: "critical" },
      { id: "c", priority: "high" },
      { id: "d" }, // sem prioridade → normal
    ];
    expect(sortByPriority(orders).map(o => o.id)).toEqual(["b", "c", "a", "d"]);
  });

  it("usa o tiebreak quando a prioridade empata", () => {
    const orders = [
      { id: "a", priority: "high", date: 2 },
      { id: "b", priority: "high", date: 1 },
    ];
    const sorted = sortByPriority(orders, (x, y) => x.date - y.date);
    expect(sorted.map(o => o.id)).toEqual(["b", "a"]);
  });

  it("não muta a lista original", () => {
    const orders = [{ id: "a", priority: "normal" }, { id: "b", priority: "critical" }];
    sortByPriority(orders);
    expect(orders.map(o => o.id)).toEqual(["a", "b"]);
  });
});
