export type BusinessRole = "isRequester" | "isBuyer" | "isEditor";
export function hasBusinessRole(user: { isAuthorized: boolean; isRequester: boolean; isBuyer: boolean; isEditor: boolean }, role: BusinessRole) {
  return user.isAuthorized && user[role];
}
