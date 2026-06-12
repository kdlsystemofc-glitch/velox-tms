import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { cnpj } = await req.json();

    if (!cnpj) return Response.json({ found: false });

    const clean = cnpj.replace(/\D/g, "");
    if (clean.length !== 14 && clean.length !== 11) return Response.json({ found: false });

    const allClients = await base44.asServiceRole.entities.Client.list("-created_date", 1000);
    const match = allClients.find(c =>
      (c.cpf_cnpj || "").replace(/\D/g, "") === clean
    );

    if (!match) return Response.json({ found: false });

    return Response.json({
      found: true,
      company_name: match.company_name || "",
      phone:        match.phone        || "",
      email:        match.email        || "",
      client_id:    match.id,
      address:      match.address      || null,
      primary_contact: (match.contacts || []).find(c => c.is_primary) || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});