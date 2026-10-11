import type Stripe from "stripe";
import { prisma } from "wasp/server";
import { stripeClient } from "../payment/stripe/stripeClient";
function customerId(value: string | { id: string } | null) { return typeof value === "string" ? value : value?.id; }
export async function handleWorkspaceStripeEvent(event: Stripe.Event): Promise<boolean> {
  if (event.type === "invoice.paid") {
    const customer = customerId(event.data.object.customer);
    return Boolean(customer && await prisma.workspace.findUnique({ where: { stripeCustomerId: customer } }));
  }
  let subscription: Stripe.Subscription;
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (!session.metadata?.workspaceId) return false;
    const id = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (!id) throw new Error("Abonnement absent du paiement");
    subscription = await stripeClient.subscriptions.retrieve(id);
  } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted" || event.type === "customer.subscription.created") subscription = event.data.object;
  else return false;
  const customer = customerId(subscription.customer);
  if (!customer) return false;
  const space = await prisma.workspace.findUnique({ where: { stripeCustomerId: customer } });
  if (!space) {
    if (subscription.metadata.workspaceId) throw new Error("Entreprise de facturation introuvable");
    return false;
  }
  if (subscription.metadata.workspaceId && subscription.metadata.workspaceId !== space.id) throw new Error("Entreprise de facturation incohérente");
  if (space.stripeSubscriptionId && space.stripeSubscriptionId !== subscription.id) throw new Error("Un autre abonnement est déjà associé à cette entreprise");
  const price = subscription.items.data.length === 1 ? subscription.items.data[0].price : null;
  const plan = price ? await prisma.saasPlan.findUnique({ where: { stripePriceId: price.id } }) : null;
  if (!plan || price?.currency !== "eur" || price.unit_amount !== plan.monthlyPriceCents || price.recurring?.interval !== "month" || price.recurring.interval_count !== 1) throw new Error("Tarif Stripe absent ou incohérent avec les offres YoyOrder");
  const timestamp = new Date(event.created * 1000);
  const canceled = event.type === "customer.subscription.deleted" || ["canceled", "incomplete_expired"].includes(subscription.status);
  await prisma.workspace.updateMany({ where: { id: space.id, OR: [{ billingUpdatedAt: null }, { billingUpdatedAt: { lte: timestamp } }] }, data: { planId: plan.id, subscriptionStatus: canceled ? "canceled" : subscription.status, stripeSubscriptionId: canceled ? null : subscription.id, billingUpdatedAt: timestamp } });
  return true;
}
