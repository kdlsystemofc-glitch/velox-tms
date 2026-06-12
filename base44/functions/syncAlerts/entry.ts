import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function differenceInDays(dateA, dateB) {
  return Math.floor((dateA - dateB) / (1000 * 60 * 60 * 24));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const [drivers, trucks, orders, existingAlerts, settingsList] = await Promise.all([
      base44.asServiceRole.entities.Driver.list(),
      base44.asServiceRole.entities.Truck.list(),
      base44.asServiceRole.entities.Order.list('-created_date', 500),
      base44.asServiceRole.entities.Alert.list(),
      base44.asServiceRole.entities.CompanySettings.list(),
    ]);
    const settings = settingsList[0] || {};

    const today = new Date();
    const desiredAlerts = [];

    // CNH drivers
    for (const d of drivers) {
      if (!d.cnh_expiry) continue;
      const days = differenceInDays(new Date(d.cnh_expiry), today);
      if (days < 0) {
        desiredAlerts.push({ type: 'cnh_expiring', level: 'critical', message: `CNH de ${d.name} está VENCIDA`, reference_id: d.id, reference_type: 'driver' });
      } else if (days <= 60) {
        desiredAlerts.push({ type: 'cnh_expiring', level: days <= 30 ? 'critical' : 'warning', message: `CNH de ${d.name} vence em ${days} dias`, reference_id: d.id, reference_type: 'driver' });
      }
    }

    // CRLV, Seguro e Tacógrafo dos caminhões
    const truckChecks = [
      { field: 'crlv_expiry',      type: 'crlv_expiring',      label: 'CRLV',      criticalDays: 30, warningDays: 60 },
      { field: 'insurance_expiry', type: 'insurance_expiring',  label: 'Seguro',    criticalDays: 30, warningDays: 60 },
      { field: 'tachograph_next',  type: 'tachograph_expiring', label: 'Tacógrafo', criticalDays: 15, warningDays: 30 },
    ];
    for (const t of trucks) {
      for (const check of truckChecks) {
        if (!t[check.field]) continue;
        const days = differenceInDays(new Date(t[check.field]), today);
        if (days < 0) {
          desiredAlerts.push({ type: check.type, level: 'critical', message: `${check.label} do caminhão ${t.plate} está VENCIDO`, reference_id: t.id, reference_type: 'truck' });
        } else if (days <= check.warningDays) {
          desiredAlerts.push({ type: check.type, level: days <= check.criticalDays ? 'critical' : 'warning', message: `${check.label} do caminhão ${t.plate} vence em ${days} dias`, reference_id: t.id, reference_type: 'truck' });
        }
      }
    }

    // Alertas por quilometragem (usa limiar do caminhão com fallback global)
    const kmAlerts = settings.maintenance_km_alerts || {};
    const kmChecks = [
      { type: 'oil_maintenance_km', label: 'Troca de óleo', truckKey: 'km_alert_oil',    thresholdKey: 'oil_change_km',     defaultKm: 20000, historyType: 'óleo' },
      { type: 'review_km',          label: 'Revisão geral', truckKey: 'km_alert_review', thresholdKey: 'general_review_km', defaultKm: 40000, historyType: 'revisão' },
    ];
    for (const truck of trucks) {
      const currentKm = truck.total_km || 0;
      if (currentKm === 0) continue;
      const history = truck.maintenance_history || [];
      for (const check of kmChecks) {
        const thresholdKm = truck[check.truckKey] || kmAlerts[check.thresholdKey] || check.defaultKm;
        const lastKm = history
          .filter(m => m.type === check.historyType)
          .sort((a, b) => (b.km || 0) - (a.km || 0))[0]?.km || 0;
        const kmSinceLast = currentKm - lastKm;
        const pct = kmSinceLast / thresholdKm;
        if (pct >= 0.9) {
          const kmRemaining = thresholdKm - kmSinceLast;
          desiredAlerts.push({
            type: check.type,
            level: kmRemaining <= 0 ? 'critical' : 'warning',
            message: kmRemaining <= 0
              ? `${check.label} da ${truck.plate} está ATRASADA (${Math.abs(kmRemaining).toLocaleString('pt-BR')} km acima do limite)`
              : `${check.label} da ${truck.plate} prevista em ${kmRemaining.toLocaleString('pt-BR')} km`,
            reference_id: truck.id,
            reference_type: 'truck',
          });
        }
      }
    }

    // Orders without driver > 24h
    for (const o of orders) {
      if (o.status === 'confirmed' && !o.driver_id) {
        const hoursAgo = (today - new Date(o.created_date)) / 1000 / 3600;
        if (hoursAgo > 24) {
          desiredAlerts.push({ type: 'order_no_driver', level: 'warning', message: `Pedido ${o.protocol} sem motorista há ${Math.floor(hoursAgo)}h`, reference_id: o.id, reference_type: 'order' });
        }
      }
    }

    // Sync: create missing, resolve stale
    const activeAlerts = existingAlerts.filter(a => !a.resolved);

    // Create new alerts that don't exist yet
    for (const desired of desiredAlerts) {
      const exists = activeAlerts.find(a => a.type === desired.type && a.reference_id === desired.reference_id);
      if (!exists) {
        await base44.asServiceRole.entities.Alert.create({ ...desired, read: false, resolved: false });
      }
    }

    // Resolve stale alerts whose condition no longer applies
    for (const active of activeAlerts) {
      const stillValid = desiredAlerts.find(d => d.type === active.type && d.reference_id === active.reference_id);
      if (!stillValid) {
        await base44.asServiceRole.entities.Alert.update(active.id, { resolved: true });
      }
    }

    // Return current unresolved alerts
    const current = await base44.asServiceRole.entities.Alert.list();
    const unresolved = current.filter(a => !a.resolved);

    return Response.json({ ok: true, count: unresolved.length, alerts: unresolved });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});