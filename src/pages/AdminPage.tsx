import { useState, useEffect } from "react";
import { eventsApi } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface EventItem {
  id: string; title: string; date: string; time: string; map: string;
  password: string; slot_price: number; is_open: boolean; teams_count: number;
}

const ADMIN_PASS_KEY = "admin_pass";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState("");
  const [passError, setPassError] = useState("");
  const [activeTab, setActiveTab] = useState<"events" | "create">("events");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [form, setForm] = useState({
    title: "", date: "", time: "", map: "", password: "", slot_price: "0",
  });

  const savedPass = () => sessionStorage.getItem(ADMIN_PASS_KEY) || pass;

  const loadEvents = async (p: string) => {
    try {
      const data = await eventsApi.adminList(p);
      setEvents(data.events || []);
    } catch {
      setPassError("Неверный пароль или нет доступа");
      setAuthed(false);
    }
  };

  const login = async () => {
    setPassError(""); setLoading(true);
    try {
      const data = await eventsApi.adminList(pass);
      setEvents(data.events || []);
      sessionStorage.setItem(ADMIN_PASS_KEY, pass);
      setAuthed(true);
    } catch {
      setPassError("Неверный пароль администратора");
    } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    setFormError("");
    if (!form.title.trim()) return setFormError("Введите название");
    if (!form.date) return setFormError("Выберите дату");
    if (!form.time) return setFormError("Укажите время");
    if (!form.map.trim()) return setFormError("Укажите карту");
    if (!form.password.trim()) return setFormError("Задайте пароль");
    setLoading(true);
    try {
      await eventsApi.create(savedPass(), {
        title: form.title, date: form.date, time: form.time,
        map: form.map, password: form.password,
        slot_price: parseInt(form.slot_price) || 0,
      });
      setForm({ title: "", date: "", time: "", map: "", password: "", slot_price: "0" });
      setFormSuccess("Мероприятие создано!");
      setActiveTab("events");
      await loadEvents(savedPass());
      setTimeout(() => setFormSuccess(""), 3000);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Ошибка");
    } finally { setLoading(false); }
  };

  const handleToggle = async (eventId: string) => {
    try {
      await eventsApi.toggle(savedPass(), eventId);
      await loadEvents(savedPass());
    } catch {/* ignore */}
  };

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto mt-8">
        <div className="glass-card p-6 space-y-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "var(--accent-blue)" }}>
              <Icon name="ShieldCheck" size={22} className="text-white" />
            </div>
            <h1 className="text-xl font-black">Админ-панель</h1>
            <p className="text-sm text-muted-foreground mt-1">Введите пароль администратора</p>
          </div>
          <div>
            <input type="password" placeholder="Пароль" value={pass}
              onChange={(e) => { setPass(e.target.value); setPassError(""); }}
              onKeyDown={(e) => e.key === "Enter" && login()}
              className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm"
            />
            {passError && <p className="text-sm mt-1.5" style={{ color: "var(--accent-red)" }}>{passError}</p>}
          </div>
          <button onClick={login} disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            style={{ background: "var(--accent-blue)" }}>
            {loading ? "Входим..." : "Войти"}
          </button>
          <p className="text-xs text-muted-foreground text-center">Пароль по умолчанию: <code>admin123</code></p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black mb-0.5">Панель управления</h1>
          <p className="text-sm text-muted-foreground">Управление мероприятиями</p>
        </div>
        <button onClick={() => { setAuthed(false); sessionStorage.removeItem(ADMIN_PASS_KEY); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-secondary transition-colors">
          <Icon name="LogOut" size={14} />
          Выйти
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Мероприятий", value: events.length },
          { label: "Команд", value: events.reduce((a, e) => a + e.teams_count, 0) },
          { label: "Выручка", value: events.reduce((a, e) => a + e.teams_count * e.slot_price, 0) + " ₽" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-3 text-center">
            <p className="text-xl font-black">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {formSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: "#DCFCE7", color: "var(--accent-green)" }}>
          <Icon name="CheckCircle" size={16} />
          {formSuccess}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[{ key: "events", label: "Мероприятия" }, { key: "create", label: "Создать" }].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as "events" | "create")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key ? "border-blue-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Events list */}
      {activeTab === "events" && (
        <div className="space-y-3">
          {events.length === 0 && (
            <div className="glass-card p-8 text-center">
              <p className="text-sm text-muted-foreground">Нет мероприятий. Создайте первое!</p>
            </div>
          )}
          {events.map((event) => (
            <div key={event.id} className="glass-card overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {event.is_open ? (
                        <span className="status-open"><Icon name="Circle" size={6} />Открыта</span>
                      ) : (
                        <span className="status-closed"><Icon name="Circle" size={6} />Закрыта</span>
                      )}
                      {event.slot_price > 0 && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--accent-blue-light)", color: "var(--accent-blue)" }}>
                          {event.slot_price} ₽/слот
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold">{event.title}</h3>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Icon name="Calendar" size={11} />{new Date(event.date).toLocaleDateString("ru-RU")}</span>
                      <span className="flex items-center gap-1"><Icon name="Clock" size={11} />{event.time} МСК</span>
                      <span className="flex items-center gap-1"><Icon name="MapPin" size={11} />{event.map}</span>
                      <span className="flex items-center gap-1"><Icon name="Lock" size={11} />{event.password}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-black">{event.teams_count}</p>
                    <p className="text-xs text-muted-foreground">команд</p>
                  </div>
                </div>
              </div>
              <div className="border-t border-border px-4 py-3 flex gap-2">
                <button onClick={() => handleToggle(event.id)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    event.is_open
                      ? "border border-border text-muted-foreground hover:bg-secondary"
                      : "text-white"
                  }`}
                  style={!event.is_open ? { background: "var(--accent-green)" } : {}}>
                  {event.is_open ? "Закрыть регистрацию" : "Открыть регистрацию"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      {activeTab === "create" && (
        <div className="glass-card p-5 space-y-4">
          <h2 className="font-bold">Новое мероприятие</h2>
          {[
            { key: "title", label: "Название", placeholder: "Турнир по CS2" },
            { key: "map", label: "Карта / локация", placeholder: "Mirage" },
            { key: "password", label: "Пароль для регистрации", placeholder: "secret2026" },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium mb-1.5">{f.label}</label>
              <input type="text" placeholder={f.placeholder} value={form[f.key as keyof typeof form]}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Дата</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Время (МСК)</label>
              <input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Цена за слот <span className="text-muted-foreground font-normal">(0 = бесплатно)</span>
            </label>
            <div className="relative">
              <input type="number" min="0" placeholder="0" value={form.slot_price}
                onChange={(e) => setForm((f) => ({ ...f, slot_price: e.target.value }))}
                className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₽</span>
            </div>
            {parseInt(form.slot_price) > 0 && (
              <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "var(--accent-blue)" }}>
                <Icon name="CreditCard" size={11} />
                Оплата через YooKassa · {form.slot_price} ₽ за каждый основной слот
              </p>
            )}
          </div>
          {formError && <p className="text-sm" style={{ color: "var(--accent-red)" }}>{formError}</p>}
          <button onClick={handleCreate} disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            style={{ background: "var(--accent-blue)" }}>
            {loading ? "Создаём..." : "Создать мероприятие"}
          </button>
        </div>
      )}
    </div>
  );
}
