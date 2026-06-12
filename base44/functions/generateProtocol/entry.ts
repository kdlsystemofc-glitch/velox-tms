import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const year = new Date().getFullYear();
    const prefix = `VLX-${year}-`;

    // Fetch all orders for current year using service role
    const allOrders = await base44.asServiceRole.entities.Order.list('-created_date', 500);

    // Filter orders from current year with the right prefix
    const thisYearOrders = allOrders.filter(o => o.protocol && o.protocol.startsWith(prefix));

    let maxSeq = 0;
    thisYearOrders.forEach(o => {
      const parts = o.protocol.split('-');
      if (parts.length === 3) {
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    });

    const nextSeq = maxSeq + 1;
    const protocol = `VLX-${year}-${String(nextSeq).padStart(5, '0')}`;

    return Response.json({ protocol });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});