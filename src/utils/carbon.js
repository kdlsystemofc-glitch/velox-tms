// ESG / pegada de carbono (roadmap 4.5) — estimativa cost-free, sem API.
// Fatores padrão: diesel ≈ 2,68 kg CO₂ por litro (combustão). Sem litros,
// estima por distância (~0,90 kg CO₂/km para caminhão pesado).

export const CO2_KG_PER_LITER_DIESEL = 2.68;
export const CO2_KG_PER_KM_TRUCK = 0.9;

/**
 * CO₂ de uma viagem (kg). Prefere litros de combustível (mais preciso);
 * cai para distância quando não há litros.
 * @returns {{ kg:number, basis:'fuel'|'distance'|'none' }}
 */
export function tripCO2(trip) {
  const liters = Number(trip?.fuel_liters) || 0;
  if (liters > 0) return { kg: Math.round(liters * CO2_KG_PER_LITER_DIESEL * 10) / 10, basis: "fuel" };
  const km = Number(trip?.real_km) || 0;
  if (km > 0) return { kg: Math.round(km * CO2_KG_PER_KM_TRUCK * 10) / 10, basis: "distance" };
  return { kg: 0, basis: "none" };
}

// CO₂ total da frota nas viagens concluídas + intensidade (kg CO₂/km).
export function fleetCO2(trips = []) {
  const done = trips.filter(t => t.status === "completed");
  let kg = 0, km = 0;
  for (const t of done) {
    kg += tripCO2(t).kg;
    km += Number(t.real_km) || 0;
  }
  return {
    kg: Math.round(kg * 10) / 10,
    trips: done.length,
    perKm: km > 0 ? Math.round((kg / km) * 100) / 100 : null,
  };
}
