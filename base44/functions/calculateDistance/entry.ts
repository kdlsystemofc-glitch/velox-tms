import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { origin_cep, dest_ceps } = await req.json();

    if (!origin_cep || !dest_ceps || dest_ceps.length === 0) {
      return Response.json({ error: "origin_cep e dest_ceps são obrigatórios", distance_km: null }, { status: 400 });
    }

    // Buscar API key nas configurações da empresa
    const settingsList = await base44.asServiceRole.entities.CompanySettings.list();
    const settings = settingsList[0];
    const API_KEY = settings?.google_maps_api_key;

    if (!API_KEY) {
      return Response.json({ error: "Google Maps API key não configurada", distance_km: null });
    }

    const originAddr = encodeURIComponent(`${origin_cep}, Brasil`);
    const destinations = dest_ceps
      .map(cep => encodeURIComponent(`${cep}, Brasil`))
      .join("|");

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json` +
      `?origins=${originAddr}&destinations=${destinations}&key=${API_KEY}&language=pt-BR`;

    const resp = await fetch(url);
    const data = await resp.json();

    if (data.status !== "OK") {
      return Response.json({ error: data.status, distance_km: null });
    }

    let totalMeters = 0;
    const rows = data.rows[0]?.elements || [];
    rows.forEach(el => {
      if (el.status === "OK") totalMeters += el.distance.value;
    });

    return Response.json({
      distance_km: Math.round(totalMeters / 1000),
      legs: rows.map(el => ({
        distance_km: el.status === "OK" ? Math.round(el.distance.value / 1000) : null,
        duration_min: el.status === "OK" ? Math.round(el.duration.value / 60) : null,
      }))
    });
  } catch (err) {
    return Response.json({ error: err.message, distance_km: null }, { status: 500 });
  }
});