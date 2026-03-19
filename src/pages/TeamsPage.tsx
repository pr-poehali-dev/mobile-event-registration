import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import Icon from "@/components/ui/icon";

export default function TeamsPage() {
  const [searchParams] = useSearchParams();
  const { events, teams } = useAppStore();
  const [selectedEventId, setSelectedEventId] = useState(
    searchParams.get("event") || events[0]?.id || ""
  );
  const [search, setSearch] = useState("");

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const eventTeams = teams
    .filter((t) => t.eventId === selectedEventId)
    .filter(
      (t) =>
        !search ||
        t.teamName.toLowerCase().includes(search.toLowerCase()) ||
        t.tgContact.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black mb-1">Команды</h1>
        <p className="text-sm text-muted-foreground">
          Зарегистрированные команды и их слоты
        </p>
      </div>

      {/* Event filter */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-2 min-w-max pb-1">
          {events.map((event) => (
            <button
              key={event.id}
              onClick={() => setSelectedEventId(event.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                selectedEventId === event.id
                  ? "text-white"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
              style={
                selectedEventId === event.id
                  ? { background: "var(--accent-blue)" }
                  : {}
              }
            >
              {event.title}
            </button>
          ))}
        </div>
      </div>

      {selectedEvent && (
        <div className="glass-card p-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Icon name="Calendar" size={13} />
            {new Date(selectedEvent.date).toLocaleDateString("ru-RU")}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="Clock" size={13} />
            {selectedEvent.time} МСК
          </span>
          <span className="flex items-center gap-1">
            <Icon name="MapPin" size={13} />
            {selectedEvent.map}
          </span>
          <span className="flex items-center gap-1 ml-auto">
            {selectedEvent.isOpen ? (
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
          </span>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Icon
          name="Search"
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Поиск по названию или TG..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm"
        />
      </div>

      {/* Stats */}
      <div className="flex gap-3 text-sm">
        <span className="text-muted-foreground">
          Команд:{" "}
          <strong className="text-foreground">{eventTeams.length}</strong>
        </span>
        <span className="text-muted-foreground">
          Слотов:{" "}
          <strong className="text-foreground">
            {eventTeams.reduce(
              (a, t) => a + t.slots.filter((s) => !s.isReserve).length,
              0
            )}
          </strong>
        </span>
        <span className="text-muted-foreground">
          Участников:{" "}
          <strong className="text-foreground">
            {eventTeams.reduce(
              (a, t) =>
                a +
                t.slots.reduce(
                  (sa, s) =>
                    sa + s.participants.filter((p) => p.name.trim()).length,
                  0
                ),
              0
            )}
          </strong>
        </span>
      </div>

      {eventTeams.length === 0 && (
        <div className="glass-card p-10 text-center">
          <Icon
            name="Users"
            size={44}
            className="mx-auto mb-3 text-muted-foreground opacity-30"
          />
          <p className="font-semibold">Команд пока нет</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Будьте первыми!
          </p>
          {selectedEvent?.isOpen && (
            <Link
              to={`/register?event=${selectedEventId}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "var(--accent-blue)" }}
            >
              <Icon name="UserPlus" size={15} />
              Зарегистрироваться
            </Link>
          )}
        </div>
      )}

      <div className="space-y-4">
        {eventTeams.map((team, idx) => (
          <div key={team.id} className="glass-card overflow-hidden">
            {/* Team header */}
            <div
              className="px-4 py-3 border-b border-border"
              style={{ background: "var(--surface)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                    style={{ background: "var(--accent-blue)" }}
                  >
                    {idx + 1}
                  </span>
                  <h3 className="font-bold">{team.teamName}</h3>
                </div>
                <a
                  href={`https://t.me/${team.tgContact.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <Icon name="Send" size={11} />
                  {team.tgContact}
                </a>
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {team.slots.map((slot) => (
                  <span
                    key={slot.slotNumber}
                    className="slot-badge"
                    style={
                      slot.isReserve
                        ? { background: "#FED7AA", color: "#C2410C" }
                        : {}
                    }
                  >
                    #{slot.slotNumber}
                  </span>
                ))}
              </div>
            </div>

            {/* Slots */}
            <div className="divide-y divide-border">
              {team.slots.map((slot) => (
                <div key={slot.slotNumber} className="px-4 py-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {slot.isReserve
                      ? "Запасные"
                      : `Слот ${slot.slotNumber}`}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {slot.participants.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm"
                        style={{ background: "var(--surface)" }}
                      >
                        <span className="text-xs text-muted-foreground w-4 shrink-0">
                          {i + 1}.
                        </span>
                        {p.name ? (
                          <span className="truncate">{p.name}</span>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">
                            —
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Зарегистрирована:{" "}
                {new Date(team.registeredAt).toLocaleString("ru-RU", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
