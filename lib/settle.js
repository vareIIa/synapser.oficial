import { db } from "./db.js";
import { isPaid, readOrder } from "./pagbank.js";

export async function settleOrder(id, userId) {
  const sql = await db();
  const rows = userId
    ? await sql`select * from orders where id = ${id} and user_id = ${userId} limit 1`
    : await sql`select * from orders where id = ${id} or provider_order_id = ${id} limit 1`;
  const order = rows[0];
  if (!order || order.status === "paid" || !order.provider_order_id) return order || null;
  const remote = await readOrder(order.provider_order_id);
  if (!isPaid(remote)) return order;
  await sql`update orders set status = 'paid', paid_at = now() where id = ${order.id} and status <> 'paid'`;
  await sql`
    insert into entitlements (user_id, plan, order_id, updated_at)
    values (${order.user_id}, ${order.plan}, ${order.id}, now())
    on conflict (user_id) do update set plan = excluded.plan, order_id = excluded.order_id, updated_at = now()
  `;
  return { ...order, status: "paid" };
}
