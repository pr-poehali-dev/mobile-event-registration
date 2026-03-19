import { Link } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import Icon from "@/components/ui/icon";

export default function HomePage() {
  const { events, teams } = useAppStore();
  const openEvents = events.filter((e) => e.isOpen);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="pt-4 pb-2">
        <div
          className="rounded-2xl p-6 md:p-10 relative overflow-hidden"
          style={{ background: "var(--accent-blue)" }}
        >
          <div className="relative z-10">
            <p className="text-blue-100 text-sm font-medium mb-2 uppercase tracking-widest">
              Система регистрации
            </p>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight">
              Бронируй слоты.<br />Играй с командой.
            </h1>
            <p className="text-blue-100 text-sm md:text-base mb-6 max-w-md">
              Регистрируй команду на мероприятия, управляй составом и смотри таблицу всех участников.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-white px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
                style={{ color: "var(--accent-blue)" }}
              >
                <Icon name="UserPlus" size={16} />
                Зарегистрировать команду
              </Link>
              <Link
                to="/teams"
                className="inline-flex items-center gap-2 bg-blue-600 border border-blue-400 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
              >
                <Icon name="Users" size={16} />
                Все команды
              </Link>
            </div>
          </div>
          {/* Decorative */}
          <div
            className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-10"
            style={{ background: "white" }}
          />
          <div
            className="absolute -right-2 bottom-0 w-24 h-24 rounded-full opacity-10"
            style={{ background: "white" }}
          />
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-3">
        {[
          { label: "Мероприятий", value: events.length, icon: "Calendar" },
          { label: "Открыто", value: openEvents.length, icon: "Unlock" },
          { label: "Команд", value: teams.length, icon: "Users" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4 text-center">
            <Icon
              name={stat.icon}
              size={18}
              className="mx-auto mb-2 text-muted-foreground"
            />
            <p className="text-2xl font-black">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* Open events */}
      {openEvents.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Открытые мероприятия</h2>
            <Link
              to="/events"
              className="text-sm font-medium flex items-center gap-1"
              style={{ color: "var(--accent-blue)" }}
            >
              Все <Icon name="ArrowRight" size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {openEvents.map((event) => {
              const eventTeams = teams.filter((t) => t.eventId === event.id);
              return (
                <div key={event.id} className="glass-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="status-open">
                          <Icon name="Circle" size={6} />
                          Открыта
                        </span>
                      </div>
                      <h3 className="font-semibold text-base truncate">
                        {event.title}
                      </h3>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Icon name="Calendar" size={13} />
                          {new Date(event.date).toLocaleDateString("ru-RU")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="Clock" size={13} />
                          {event.time} МСК
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="Map" size={13} />
                          {event.map}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-black">{eventTeams.length}</p>
                      <p className="text-xs text-muted-foreground">команд</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Link
                      to={`/register?event=${event.id}`}
                      className="flex-1 text-center py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ background: "var(--accent-blue)" }}
                    >
                      Зарегистрироваться
                    </Link>
                    <Link
                      to={`/teams?event=${event.id}`}
                      className="flex-1 text-center py-2 rounded-lg text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                    >
                      Команды
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {openEvents.length === 0 && (
        <div className="glass-card p-8 text-center">
          <Icon
            name="CalendarOff"
            size={40}
            className="mx-auto mb-3 text-muted-foreground opacity-40"
          />
          <p className="font-semibold mb-1">Нет открытых мероприятий</p>
          <p className="text-sm text-muted-foreground">
            Следите за обновлениями
          </p>
        </div>
      )}
    </div>
  );
}
