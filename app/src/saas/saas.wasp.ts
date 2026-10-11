import { action, page, query, route, type Spec } from "@wasp.sh/spec";
import { SaasPage } from "./SaasPage" with { type: "ref" };
import { TicketsPage } from "./TicketsPage" with { type: "ref" };
import { getPublicPlans, getSaasAdministration, saveSaasPlan, createCompanyWorkspace, updateCompanyWorkspace, switchCompanyWorkspace, createOwnWorkspace, startWorkspaceCheckout, getWorkspaceBilling, openWorkspacePortal } from "./operations" with { type: "ref" };
import { getTickets, createTicket, replyTicket, updateTicket } from "./tickets" with { type: "ref" };
const billing = ["Workspace", "SaasPlan", "User", "Stock"] as const;
const tickets = ["Workspace", "User", "SupportTicket", "TicketMessage"] as const;
export const saasSpec: Spec = [
  route("SaasPlansRoute", "/admin/plans", page(SaasPage, { authRequired: true })),
  route("SaasWorkspacesRoute", "/admin/workspaces", page(SaasPage, { authRequired: true })),
  route("SaasTicketsRoute", "/admin/tickets", page(TicketsPage, { authRequired: true })),
  route("SupportRoute", "/tickets", page(TicketsPage, { authRequired: true })),
  query(getPublicPlans, { entities: ["SaasPlan"] }),
  query(getSaasAdministration, { entities: [...billing] }),
  action(saveSaasPlan, { entities: [...billing] }),
  action(createCompanyWorkspace, { entities: [...billing] }),
  action(updateCompanyWorkspace, { entities: [...billing] }),
  action(switchCompanyWorkspace, { entities: [...billing] }),
  action(createOwnWorkspace, { entities: [...billing] }),
  action(startWorkspaceCheckout, { entities: [...billing] }),
  query(getWorkspaceBilling, { entities: [...billing] }),
  action(openWorkspacePortal, { entities: [...billing] }),
  query(getTickets, { entities: [...tickets] }),
  action(createTicket, { entities: [...tickets] }),
  action(replyTicket, { entities: [...tickets] }),
  action(updateTicket, { entities: [...tickets] }),
];
