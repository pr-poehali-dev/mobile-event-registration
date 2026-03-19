import { useState } from "react";
import { useAppStore, Slot } from "@/store/appStore";
import Icon from "@/components/ui/icon";

export default function CabinetPage() {
  const { teams, events, updateTeamSlots, deleteTeam } = useAppStore();
  const [token, setToken] = useState("");
  const [foundTeam, setFoundTeam] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [editingSlots, setEditingSlots] = useState<Slot[] | null>(null);
  const [editTeamId, setEditTeamId] = useState<string | null>(null);
  const [editError, setEditError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleFind = () => {
    setError("");
    const team = teams.find((t) => t.editToken === token);
    if (!team) return setError("Команда не найдена. Проверьте токен.");
    setFoundTeam(team.id);
    setEditingSlots(null);
    setEditTeamId(null);
    setDeleteConfirm(false);
  };

  const team = teams.find((t) => t.id === foundTeam);
  const event = events.find((e) => e.id === team?.eventId);

  const startEdit = () => {
    if (!team) return;
    setEditingSlots(JSON.parse(JSON.stringify(team.slots)));
    setEditTeamId(team.id);
    setEditError("");
    setSuccess("");
  };

  const updateParticipant = (
    slotIdx: number,
    partIdx: number,
    name: string
  ) => {
    if (!editingSlots) return;
    const slots = [...editingSlots];
    const participants = [...slots[slotIdx].participants];
    participants[partIdx] = { name };
    slots[slotIdx] = { ...slots[slotIdx], participants };
    setEditingSlots(slots);
  };

  const saveEdit = () => {
    if (!editingSlots || !editTeamId) return;
    for (const slot of editingSlots) {
      const filled = slot.participants.filter((p) => p.name.trim()).length;
      if (filled < 3) {
        return setEditError(
          `Слот №${slot.slotNumber}: минимум 3 участника из 4`
        );
      }
    }
    const ok = updateTeamSlots(editTeamId, token, editingSlots);
    if (!ok) return setEditError("Ошибка сохранения");
    setEditingSlots(null);
    setEditTeamId(null);
    setSuccess("Состав команды обновлён!");
  };

  const handleDelete = () => {
    if (!foundTeam) return;
    const ok = deleteTeam(foundTeam, token);
    if (!ok) return setError("Ошибка удаления");
    setFoundTeam(null);
    setToken("");
    setDeleteConfirm(false);
    setSuccess("Команда снята с регистрации.");
  };

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-black mb-1">Личный кабинет</h1>
        <p className="text-sm text-muted-foreground">
          Управление командой по токену регистрации
        </p>
      </div>

      {/* Token input */}
      {!foundTeam && (
        <div className="glass-card p-5 space-y-4">
          <div
            className="flex items-start gap-3 p-3 rounded-xl text-sm"
            style={{ background: "var(--accent-blue-light)", color: "var(--accent-blue)" }}
          >
            <Icon name="Info" size={16} className="mt-0.5 shrink-0" />
            <p>
              Токен выдаётся при регистрации команды. Без токена управление
              недоступно.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Токен управления
            </label>
            <input
              type="text"
              placeholder="Вставьте ваш токен..."
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setError("");
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm font-mono"
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--accent-red)" }}>
              {error}
            </p>
          )}

          <button
            onClick={handleFind}
            disabled={!token.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-opacity hover:opacity-90"
            style={{ background: "var(--accent-blue)" }}
          >
            Найти мою команду
          </button>
        </div>
      )}

      {/* Success message */}
      {success && !foundTeam && (
        <div
          className="flex items-center gap-2 p-3 rounded-xl text-sm"
          style={{ background: "#DCFCE7", color: "var(--accent-green)" }}
        >
          <Icon name="CheckCircle" size={16} />
          {success}
        </div>
      )}

      {/* Team found */}
      {team && (
        <div className="space-y-4">
          {success && (
            <div
              className="flex items-center gap-2 p-3 rounded-xl text-sm"
              style={{ background: "#DCFCE7", color: "var(--accent-green)" }}
            >
              <Icon name="CheckCircle" size={16} />
              {success}
            </div>
          )}

          {/* Team info */}
          <div className="glass-card overflow-hidden">
            <div
              className="px-4 py-3 border-b border-border flex items-center justify-between"
              style={{ background: "var(--surface)" }}
            >
              <div>
                <h3 className="font-bold">{team.teamName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {event?.title}
                </p>
              </div>
              <div className="flex gap-2">
                {!editingSlots && (
                  <button
                    onClick={startEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-secondary transition-colors"
                  >
                    <Icon name="Pencil" size={13} />
                    Изменить состав
                  </button>
                )}
                <button
                  onClick={() => setFoundTeam(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                >
                  <Icon name="X" size={14} />
                </button>
              </div>
            </div>

            <div className="px-4 py-3 flex flex-wrap gap-3 text-sm border-b border-border">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Icon name="Send" size={13} />
                {team.tgContact}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Icon name="Layers" size={13} />
                {team.slots.filter((s) => !s.isReserve).length} основных слота
              </span>
              {team.slots.some((s) => s.isReserve) && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Icon name="Shield" size={13} />1 запасной слот
                </span>
              )}
            </div>

            {/* Slots — view or edit */}
            <div className="divide-y divide-border">
              {(editingSlots || team.slots).map((slot, slotIdx) => (
                <div key={slot.slotNumber} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="slot-badge" style={slot.isReserve ? { background: "#FED7AA", color: "#C2410C" } : {}}>
                      #{slot.slotNumber}
                    </span>
                    <span className="text-sm font-medium">
                      {slot.isReserve ? "Запасные" : `Слот ${slot.slotNumber}`}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {slot.participants.map((p, partIdx) => (
                      <div key={partIdx} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4 text-right shrink-0">
                          {partIdx + 1}.
                        </span>
                        {editingSlots ? (
                          <input
                            type="text"
                            placeholder={`Участник ${partIdx + 1}${!slot.isReserve && partIdx < 3 ? " *" : ""}`}
                            value={editingSlots[slotIdx].participants[partIdx].name}
                            onChange={(e) =>
                              updateParticipant(slotIdx, partIdx, e.target.value)
                            }
                            className="flex-1 px-2.5 py-1.5 rounded-lg border border-border focus:outline-none focus:border-blue-500 text-sm"
                          />
                        ) : (
                          <span
                            className="flex-1 px-2.5 py-1.5 rounded-lg text-sm"
                            style={{ background: "var(--surface)" }}
                          >
                            {p.name || (
                              <span className="text-muted-foreground italic">—</span>
                            )}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Edit actions */}
            {editingSlots && (
              <div className="px-4 py-3 border-t border-border space-y-2">
                {editError && (
                  <p className="text-sm" style={{ color: "var(--accent-red)" }}>
                    {editError}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    className="flex-1 py-2 rounded-xl text-sm font-bold text-white"
                    style={{ background: "var(--accent-blue)" }}
                  >
                    Сохранить изменения
                  </button>
                  <button
                    onClick={() => { setEditingSlots(null); setEditTeamId(null); }}
                    className="flex-1 py-2 rounded-xl text-sm font-medium border border-border hover:bg-secondary transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Delete */}
          {!editingSlots && (
            <div className="glass-card p-4">
              <h4 className="text-sm font-semibold mb-1 text-red-600">
                Опасная зона
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Снять команду с регистрации — действие необратимо
              </p>
              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="w-full py-2 rounded-xl text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                >
                  Снять с регистрации
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-600">
                    Вы уверены? Это действие нельзя отменить.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      className="flex-1 py-2 rounded-xl text-sm font-bold text-white"
                      style={{ background: "var(--accent-red)" }}
                    >
                      Да, снять
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="flex-1 py-2 rounded-xl text-sm font-medium border border-border hover:bg-secondary transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
