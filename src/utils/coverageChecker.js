export function isAddressInCoverage(cep, state, city, settings) {
  if (!settings || !settings.coverage_type) return true;

  const cleanCep = (cep || "").replace(/\D/g, "");

  if (settings.coverage_type === "states") {
    return (settings.coverage_states || []).includes(state);
  }

  if (settings.coverage_type === "cities") {
    return (settings.coverage_cities || []).some(
      (c) => c.city.toLowerCase() === (city || "").toLowerCase() && c.state === state
    );
  }

  if (settings.coverage_type === "cep_range") {
    return (settings.coverage_cep_ranges || []).some((range) => {
      const from = (range.from || "").replace(/\D/g, "");
      const to = (range.to || "").replace(/\D/g, "");
      return cleanCep >= from && cleanCep <= to;
    });
  }

  return true;
}