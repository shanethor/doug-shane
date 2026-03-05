export interface BetaUser {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
}

export const BETA_USERS: Record<string, BetaUser> = {
  jane: {
    id: "jane",
    name: "Jane Smith",
    initials: "JS",
    avatarColor: "bg-emerald-600",
  },
  douglas: {
    id: "douglas",
    name: "Douglas Wenz",
    initials: "DW",
    avatarColor: "bg-blue-600",
  },
};

export function getOtherUser(currentId: string): BetaUser {
  return currentId === "jane" ? BETA_USERS.douglas : BETA_USERS.jane;
}

export function getCurrentBetaUser(): BetaUser | null {
  const id = sessionStorage.getItem("betaUserId");
  if (!id || !BETA_USERS[id]) return null;
  return BETA_USERS[id];
}

export function setBetaUser(id: string) {
  sessionStorage.setItem("betaUserId", id);
}

export function clearBetaUser() {
  sessionStorage.removeItem("betaUserId");
}
