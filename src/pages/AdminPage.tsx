import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import Icon from "@/components/ui/icon";

export default function AdminPage() {
  const { events, teams, addEvent, toggleEventRegistration, deleteEvent, adminPassword } = useAppStore();
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState("");
  const [passError, setPassError] = useState("");
  const [activeTab, setActiveTab] = useState<"events" | "create">("events");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    date: "",
    time: "",
    map: "",
    password: "",
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const login = () => {
    if (pass === adminPassword) {
      setAuthed(true);
      setPassError("");
    } else {
      setPassError("Неверный пароль администратора");
    }
  };

  const handleCreate = () => {
    setFormError("");
    if (!form.title.trim()) return setFormError("Введите название");
    if (!form.date) return setFormError("Выберите дату");
    if (!form.time) return setFormError("Укажите время");
    if (!form.map.trim()) return setFormError("Укажите карту");
    if (!form.password.trim()) return setFormError("Задайте пароль для регистрации");

    addEvent({ ...form, isOpen: true });
    setForm({ title: "", date: "", time: "", map: "", password: "" });
    setFormSuccess("Мероприятие создано!");
    setActiveTab("events");
    setTimeout(() => setFormSuccess(""), 3000);
  };

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto mt-8">
        <div className="glass-card p-6 space-y-4">
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "var(--accent-blue)" }}
            >
              <Icon name="ShieldCheck" size={22} className="text-white" />
            </div>
            <h1 className="text-xl font-black">Админ-панель</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Введите пароль администратора
            </p>
          </div>

          <div>
            <input
              type="password"
              placeholder="Пароль"
              value={pass}
              onChange={(e) => { setPass(e.target.value); setPassError(""); }}
              onKeyDown={(e) => e.key === "Enter" && login()}
              className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm"
            />
            {passError && (
              <p className="text-sm mt-1.5" style={{ color: "var(--accent-red)" }}>
                {passError}
              </p>
            )}
          </div>

          <button
            onClick={login}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: "var(--accent-blue)" }}
          >
            Войти
          </button>

          <p className="text-xs text-muted-foreground text-center">
            Пароль по умолчанию: <code>admin123</code>
          </p>
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
        <button
          onClick={() => { setAuthed(false); setPass(""); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-secondary transition-colors"
        >
          <Icon name="LogOut" size={14} />
          Выйти
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Мероприятий", value: events.length, icon: "Calendar" },
          { label: "Команд", value: teams.length, icon: "Users" },
          { label: "Участников", value: teams.reduce((a, t) => a + t.slots.reduce((sa, s) => sa + s.participants.filter(p => p.name.trim()).length, 0), 0), icon: "User" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-3 text-center">
            <p className="text-xl font-black">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {formSuccess && (
        <div
          className="flex items-center gap-2 p-3 rounded-xl text-sm"
          style={{ background: "#DCFCE7", color: "var(--accent-green)" }}
        >
          <Icon name="CheckCircle" size={16} />
          {formSuccess}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { key: "events", label: "Мероприятия" },
          { key: "create", label: "Создать" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as "events" | "create")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-blue-500 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Events list */}
      {activeTab === "events" && (
        <div className="space-y-3">
          {events.length === 0 && (
            <div className="glass-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Нет мероприятий. Создайте первое!
              </p>
            </div>
          )}
          {events.map((event) => {
            const eventTeams = teams.filter((t) => t.eventId === event.id);
            return (
              <div key={event.id} className="glass-card overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        {event.isOpen ? (
                          <span className="status-open">
                            <Icon name="Circle" size={6} />
                            Открыта
                          </span>
                        ) : (
                          <span className="status-closed">
                            <Icon name="Circle" size={6} />
                            Закрыта
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold">{event.title}</h3>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Icon name="Calendar" size={11} />
                          {new Date(event.date).toLocaleDateString("ru-RU")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="Clock" size={11} />
                          {event.time} МСК
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="MapPin" size={11} />
                          {event.map}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="Lock" size={11} />
                          {event.password}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-black">{eventTeams.length}</p>
                      <p className="text-xs text-muted-foreground">команд</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border px-4 py-3 flex gap-2">
                  <button
                    onClick={() => toggleEventRegistration(event.id)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      event.isOpen
                        ? "border border-border text-muted-foreground hover:bg-secondary"
                        : "text-white hover:opacity-90"
                    }`}
                    style={!event.isOpen ? { background: "var(--accent-green)" } : {}}
                  >
                    {event.isOpen ? "Закрыть регистрацию" : "Открыть регистрацию"}
                  </button>

                  {deleteConfirm === event.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => { deleteEvent(event.id); setDeleteConfirm(null); }}
                        className="px-3 py-2 rounded-xl text-sm font-bold text-white"
                        style={{ background: "var(--accent-red)" }}
                      >
                        Удалить
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-2 rounded-xl text-sm border border-border hover:bg-secondary transition-colors"
                      >
                        <Icon name="X" size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(event.id)}
                      className="p-2 rounded-xl border border-border text-red-400 hover:bg-red-50 transition-colors"
                    >
                      <Icon name="Trash2" size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create form */}
      {activeTab === "create" && (
        <div className="glass-card p-5 space-y-4">
          <h2 className="font-bold">Новое мероприятие</h2>

          <div>
            <label className="block text-sm font-medium mb-1.5">Название</label>
            <input
              type="text"
              placeholder="Название турнира"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Дата</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Время МСК
              </label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Карта</label>
            <input
              type="text"
              placeholder="Например: Mirage, Inferno..."
              value={form.map}
              onChange={(e) => setForm((f) => ({ ...f, map: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Пароль для регистрации
            </label>
            <input
              type="text"
              placeholder="Пароль для участников"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          {formError && (
            <p className="text-sm" style={{ color: "var(--accent-red)" }}>
              {formError}
            </p>
          )}

          <button
            onClick={handleCreate}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
            style={{ background: "var(--accent-blue)" }}
          >
            <Icon name="Plus" size={16} className="inline mr-2" />
            Создать мероприятие
          </button>
        </div>
      )}
    </div>
  );
}
