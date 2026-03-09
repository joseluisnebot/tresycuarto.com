async function verifyStripeSignature(rawBody, sigHeader, secret) {
  const parts = sigHeader.split(",");
  const timestamp = parts.find(p => p.startsWith("t="))?.slice(2);
  const signatures = parts.filter(p => p.startsWith("v1=")).map(p => p.slice(3));
  if (!timestamp || !signatures.length) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(signedPayload));
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return signatures.some(s => s === expected);
}

export async function onRequestPost({ request, env }) {
  const sigHeader = request.headers.get("stripe-signature") || "";
  const rawBody = await request.text();

  if (!await verifyStripeSignature(rawBody, sigHeader, env.STRIPE_WEBHOOK_SECRET)) {
    return new Response("Signature inválida", { status: 400 });
  }

  let event;
  try { event = JSON.parse(rawBody); } catch { return new Response("JSON inválido", { status: 400 }); }

  const { type, data } = event;

  if (type === "checkout.session.completed") {
    const session = data.object;
    const subscriptionId = session.subscription;
    const customerId = session.customer;
    const ulId = session.metadata?.ul_id;
    const localId = session.metadata?.local_id;

    if (!ulId && !localId) return new Response("OK", { status: 200 });

    // Fetch subscription to get period end
    const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
    });
    const sub = await subRes.json();
    const planExpires = sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null;

    if (ulId) {
      await env.DB.prepare(
        "UPDATE usuario_locales SET plan='pro', stripe_customer_id=?, stripe_subscription_id=?, plan_expires=? WHERE id=?"
      ).bind(customerId, subscriptionId, planExpires, ulId).run();
    } else if (localId) {
      await env.DB.prepare(
        "UPDATE usuario_locales SET plan='pro', stripe_customer_id=?, stripe_subscription_id=?, plan_expires=? WHERE local_id=?"
      ).bind(customerId, subscriptionId, planExpires, localId).run();
    }
  }

  if (type === "customer.subscription.updated") {
    const sub = data.object;
    const planExpires = sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null;
    const status = sub.status;
    const newPlan = (status === "active" || status === "trialing") ? "pro" : "free";

    await env.DB.prepare(
      "UPDATE usuario_locales SET plan=?, plan_expires=?, stripe_subscription_id=? WHERE stripe_customer_id=?"
    ).bind(newPlan, planExpires, sub.id, sub.customer).run();
  }

  if (type === "customer.subscription.deleted") {
    const sub = data.object;
    await env.DB.prepare(
      "UPDATE usuario_locales SET plan='free', plan_expires=NULL, stripe_subscription_id=NULL WHERE stripe_customer_id=?"
    ).bind(sub.customer).run();
  }

  return new Response("OK", { status: 200 });
}
