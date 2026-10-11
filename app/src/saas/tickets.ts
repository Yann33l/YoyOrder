import { HttpError, prisma } from "wasp/server";
import type { User, SupportTicket, TicketMessage } from "wasp/entities";
import type { GetTickets, CreateTicket, ReplyTicket, UpdateTicket } from "wasp/server/operations";
import { z } from "zod";
import { isAccountValid } from "../inventory/access";
import { ensureArgsSchemaOrThrowHttpError as parse } from "../server/validation";
import { requireSuperAdmin } from "./operations";
export const categories = ["BUG_REPORT", "FEATURE_REQUEST", "SUPPORT"] as const;
export const statuses = ["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"] as const;
export const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
async function actor(context: { user?: User | null }) {
  const user = context.user;
  if (!user) throw new HttpError(401, "Authentification requise");
  if (!isAccountValid(user)) throw new HttpError(403, "Compte inactif ou archivé");
  if (!user.workspaceId && !user.isSuperAdmin) throw new HttpError(403, "Aucun espace de travail attribué");
  return user;
}
export function ticketScope(user: Pick<User, "isSuperAdmin" | "isAdmin" | "workspaceId" | "id">) {
  return user.isSuperAdmin ? {} : { workspaceId: user.workspaceId!, ...(!user.isAdmin ? { createdById: user.id } : {}) };
}
export type TicketView = SupportTicket & { messages: TicketMessage[]; workspace: { name: string } };
export const getTickets: GetTickets<{ workspaceOnly?: boolean }, TicketView[]> = async (args, context) => {
  const user = await actor(context);
  const { workspaceOnly } = parse(z.object({ workspaceOnly: z.boolean().optional() }), args);
  if (workspaceOnly && !user.workspaceId) throw new HttpError(403, "Sélectionnez un espace de travail");
  return prisma.supportTicket.findMany({ where: user.isSuperAdmin && workspaceOnly ? { workspaceId: user.workspaceId! } : ticketScope(user), include: { workspace: { select: { name: true } }, messages: { orderBy: { createdAt: "asc" } } }, orderBy: { updatedAt: "desc" } });
};
const newSchema = z.object({ title: z.string().trim().min(3).max(200), category: z.enum(categories), body: z.string().trim().min(1).max(20000) });
export const createTicket: CreateTicket<z.infer<typeof newSchema>, { id: string }> = async (args, context) => {
  const user = await actor(context);
  if (!user.workspaceId) throw new HttpError(400, "Sélectionnez un espace de travail");
  const { body, ...data } = parse(newSchema, args);
  return prisma.supportTicket.create({ data: { ...data, workspaceId: user.workspaceId, createdById: user.id, messages: { create: { authorId: user.id, authorEmail: user.email ?? "", isStaff: user.isSuperAdmin, body } } }, select: { id: true } });
};
export const replyTicket: ReplyTicket<{ ticketId: string; body: string }, { id: string }> = async (args, context) => {
  const user = await actor(context);
  const input = parse(z.object({ ticketId: z.string(), body: z.string().trim().min(1).max(20000) }), args);
  const ticket = await prisma.supportTicket.findFirst({ where: { id: input.ticketId, ...ticketScope(user) } });
  if (!ticket) throw new HttpError(404, "Ticket introuvable");
  return prisma.supportTicket.update({ where: { id: ticket.id }, data: { updatedAt: new Date(), ...(!user.isSuperAdmin && ["RESOLVED", "CLOSED"].includes(ticket.status) ? { status: "OPEN", reviewed: false } : {}), messages: { create: { authorId: user.id, authorEmail: user.email ?? "", isStaff: user.isSuperAdmin, body: input.body } } }, select: { id: true } });
};
const updateSchema = z.object({ id: z.string(), status: z.enum(statuses), priority: z.enum(priorities), reviewed: z.boolean() });
export const updateTicket: UpdateTicket<z.infer<typeof updateSchema>, { id: string }> = async (args, context) => {
  await requireSuperAdmin(context);
  const { id, ...data } = parse(updateSchema, args);
  return prisma.supportTicket.update({ where: { id }, data, select: { id: true } });
};
