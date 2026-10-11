import type { WorkspaceNews, User } from "wasp/entities";
import { HttpError } from "wasp/server";
import type { GetCompanyNews, SaveCompanyNews } from "wasp/server/operations";
import { z } from "zod";
import { requireActiveUser } from "./access";
import { workspaceDb } from "./workspace";
import { ensureArgsSchemaOrThrowHttpError as parse } from "../server/validation";
export const getCompanyNews: GetCompanyNews<Record<string, never>, WorkspaceNews[]> = async (_args, context) => {
  const user = await requireActiveUser(context);
  return workspaceDb(user).workspaceNews.findMany({ where: context.user?.isAdmin ? {} : { published: true }, orderBy: { createdAt: "desc" } });
};
const schema = z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(1).max(200), body: z.string().trim().min(1).max(20000), published: z.boolean() });
export function assertNewsAdmin(user?: Pick<User, "isAdmin"> | null) {
  if (!user?.isAdmin) throw new HttpError(403, "La publication des actualités est réservée à l’administrateur de l’entreprise");
}
export const saveCompanyNews: SaveCompanyNews<z.infer<typeof schema>, { id: string }> = async (args, context) => {
  assertNewsAdmin(context.user);
  const user = await requireActiveUser(context), db = workspaceDb(user);
  const { id, ...data } = parse(schema, args);
  return id ? db.workspaceNews.update({ where: { id }, data, select: { id: true } }) : db.workspaceNews.create({ data: { ...data, createdByUserId: user.id, createdByEmail: user.email ?? "" }, select: { id: true } });
};
