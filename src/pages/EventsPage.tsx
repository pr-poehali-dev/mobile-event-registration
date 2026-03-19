import { Link } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import Icon from "@/components/ui/icon";

export default function EventsPage() {
  const { events, teams } = useAppStore();

  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black mb-1">Мероприятия</h1>
        <p className="text-sm text-muted-foreground">
          Все доступные мероприятия для регистрации
        </p>
      </div>

      {sorted.length === 0 && (
        <div className="glass-card p-10 text-center">
          <Icon
            name="Calendar"
            size={44}
            className="mx-auto mb-3 text-muted-foreground opacity-30"
          />
          <p className="font-semibold">Мероприятий пока нет</p>
          <p className="text-sm text-muted-foreground mt-1">
            Обратитесь к администратору
          </p>
        </div>
      )}

      <div className="space-y-3">
        {sorted.map((event) => {
          const eventTeams = teams.filter((t) => t.eventId === event.id);
          const totalSlots = eventTeams.reduce(
            (acc, t) => acc + t.slots.filter((s) => !s.isReserve).length,
            0
          );

          return (
            <div key={event.id} className="glass-card overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {event.isOpen ? (
                        <span className="status-open">
                          <Icon name="Circle" size={6} />
                          Регистрация открыта
                        </span>
                      ) : (
                        <span className="status-closed">
                          <Icon name="Circle" size={6} />
                          Закрыта
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-base">{event.title}</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Icon name="Calendar" size={14} />
                        <span>
                          {new Date(event.date).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Icon name="Clock" size={14} />
                        <span>{event.time} МСК</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Icon name="MapPin" size={14} />
                        <span>Карта: {event.map}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Icon name="Users" size={14} />
                        <span>
                          {eventTeams.length} команд · {totalSlots} слотов
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border px-4 py-3 bg-secondary/30 flex gap-2">
                {event.isOpen ? (
                  <Link
                    to={`/register?event=${event.id}`}
                    className="flex-1 text-center py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: "var(--accent-blue)" }}
                  >
                    Зарегистрировать команду
                  </Link>
                ) : (
                  <button
                    disabled
                    className="flex-1 text-center py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground cursor-not-allowed"
                  >
                    Регистрация закрыта
                  </button>
                )}
                <Link
                  to={`/teams?event=${event.id}`}
                  className="flex-1 text-center py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors"
                >
                  Посмотреть команды
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
