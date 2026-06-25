import { describe, it, expect } from "vitest";
import {
  stopWaitingMinutes, stopEstadia, tripEstadiaSummary, formatMinutes, DEFAULT_FREE_MINUTES,
} from "./waitingTime";

const at = (iso) => iso;
const stop = (arrivedMinAgo, durationMin, extra = {}) => {
  const arrived = new Date("2026-06-25T08:00:00");
  const completed = new Date(arrived.getTime() + durationMin * 60000);
  return { arrived_at: at(arrived.toISOString()), completed_at: at(completed.toISOString()), ...extra };
};

describe("stopWaitingMinutes", () => {
  it("calcula minutos entre chegada e conclusão", () => {
    expect(stopWaitingMinutes(stop(0, 90))).toBe(90);
  });
  it("retorna 0 sem dados ou com conclusão antes da chegada", () => {
    expect(stopWaitingMinutes({})).toBe(0);
    expect(stopWaitingMinutes({ arrived_at: "2026-06-25T10:00:00", completed_at: "2026-06-25T09:00:00" })).toBe(0);
    expect(stopWaitingMinutes({ arrived_at: "lixo", completed_at: "lixo" })).toBe(0);
  });
});

describe("stopEstadia (hora ou fração, após tempo livre)", () => {
  const pricing = { waiting_fee_hour: 60, waiting_free_minutes: 60 };
  it("dentro do tempo livre não cobra", () => {
    expect(stopEstadia(stop(0, 50), pricing).fee).toBe(0);
    expect(stopEstadia(stop(0, 60), pricing).fee).toBe(0);
  });
  it("1min além do livre cobra 1 hora cheia (fração)", () => {
    const e = stopEstadia(stop(0, 61), pricing);
    expect(e.billableMinutes).toBe(1);
    expect(e.billableHours).toBe(1);
    expect(e.fee).toBe(60);
  });
  it("2h05 de espera com 1h livre → 2 horas cobradas", () => {
    const e = stopEstadia(stop(0, 125), pricing);
    expect(e.billableMinutes).toBe(65);
    expect(e.billableHours).toBe(2);
    expect(e.fee).toBe(120);
  });
  it("tarifa zerada não gera cobrança", () => {
    expect(stopEstadia(stop(0, 180), { waiting_free_minutes: 60 }).fee).toBe(0);
  });
  it("usa tempo livre padrão quando não configurado", () => {
    const e = stopEstadia(stop(0, DEFAULT_FREE_MINUTES + 1), { waiting_fee_hour: 30 });
    expect(e.fee).toBe(30);
  });
});

describe("tripEstadiaSummary", () => {
  const pricing = { waiting_fee_hour: 60, waiting_free_minutes: 60 };
  it("lista só paradas cobráveis e soma totais + pendentes", () => {
    const trip = {
      stops: [
        stop(0, 30, { order_id: "o1", recipient_name: "A" }),          // sem estadia
        stop(0, 120, { order_id: "o2", recipient_name: "B" }),         // 1h cobrável = 60
        stop(0, 190, { order_id: "o3", recipient_name: "C", estadia_charged: true }), // 3h... já cobrada
      ],
    };
    const s = tripEstadiaSummary(trip, pricing);
    expect(s.rows.map(r => r.recipient_name)).toEqual(["B", "C"]);
    expect(s.totalFee).toBe(60 + 180);
    expect(s.pendingFee).toBe(60); // C já cobrada não entra no pendente
    expect(s.hasPending).toBe(true);
  });
  it("viagem sem espera → sem linhas", () => {
    expect(tripEstadiaSummary({ stops: [stop(0, 10)] }, pricing).rows).toHaveLength(0);
  });
});

describe("formatMinutes", () => {
  it("formata minutos e horas", () => {
    expect(formatMinutes(45)).toBe("45min");
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(95)).toBe("1h 35min");
  });
});
