const URLS = {
  auth: "https://functions.poehali.dev/92f857f3-f2d7-4eff-92ff-03498afc448a",
  events: "https://functions.poehali.dev/bccb7ea1-3674-4c8c-8e3b-c8aec7f13742",
  teams: "https://functions.poehali.dev/e90344a2-b93b-43fc-ab0e-c04a2b017a83",
  payment: "https://functions.poehali.dev/487f9128-e542-4ab9-aeb6-5e1750b88fc8",
};

function sessionHeaders(): Record<string, string> {
  const sid = localStorage.getItem("session_id");
  return sid ? { "X-Session-Id": sid } : {};
}

async function req(url: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...sessionHeaders(),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка запроса");
  return data;
}

// ─── Auth ────────────────────────────────────────────────────────
export const authApi = {
  sendCode: (email: string) =>
    req(URLS.auth, "/email/send", { method: "POST", body: JSON.stringify({ email }) }),

  verifyCode: (email: string, code: string) =>
    req(URLS.auth, "/email/verify", { method: "POST", body: JSON.stringify({ email, code }) }),

  loginTg: (tgData: Record<string, unknown>) =>
    req(URLS.auth, "/tg", { method: "POST", body: JSON.stringify(tgData) }),

  loginVk: (vkData: Record<string, unknown>) =>
    req(URLS.auth, "/vk", { method: "POST", body: JSON.stringify(vkData) }),

  me: () => req(URLS.auth, "/me"),

  logout: () => req(URLS.auth, "/logout", { method: "POST" }),
};

// ─── Events ──────────────────────────────────────────────────────
export const eventsApi = {
  list: () => req(URLS.events, "/"),

  adminList: (adminPass: string) =>
    req(URLS.events, "/?admin=1", { headers: { "X-Admin-Pass": adminPass } }),

  create: (adminPass: string, data: Record<string, unknown>) =>
    req(URLS.events, "/", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "X-Admin-Pass": adminPass },
    }),

  toggle: (adminPass: string, eventId: string) =>
    req(URLS.events, `/${eventId}/toggle`, {
      method: "PATCH",
      headers: { "X-Admin-Pass": adminPass },
    }),
};

// ─── Teams ───────────────────────────────────────────────────────
export const teamsApi = {
  byEvent: (eventId: string) => req(URLS.teams, `/?event_id=${eventId}`),

  myTeams: () => req(URLS.teams, "/my"),

  create: (data: Record<string, unknown>) =>
    req(URLS.teams, "/", { method: "POST", body: JSON.stringify(data) }),

  update: (teamId: string, slots: unknown[]) =>
    req(URLS.teams, `/${teamId}`, { method: "PATCH", body: JSON.stringify({ slots }) }),
};

// ─── Payment ─────────────────────────────────────────────────────
export const paymentApi = {
  create: (eventId: string, slotsCount: number) =>
    req(URLS.payment, "/create", {
      method: "POST",
      body: JSON.stringify({ event_id: eventId, slots_count: slotsCount }),
    }),

  status: (paymentId: string) => req(URLS.payment, `/status?payment_id=${paymentId}`),
};
