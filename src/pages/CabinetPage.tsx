import { useState, useEffect } from "react";
import { teamsApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import AuthModal from "@/components/AuthModal";
import Icon from "@/components/ui/icon";

interface Participant { name: string; }
interface Slot { id?: number; slot_number: number; is_reserve: boolean; participants: Participant[]; }
interface TeamItem {
  id: string; event_id: string; team_name: string; tg_contact: string;
  payment_status: string; slots: Slot[];
}

export default function CabinetPage() {
  const { user } = useAuthStore();
  const [authOpen, setAuthOpen] = useState(false);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editSlots, setEditSlots] = useState<Slot[]>([]);
  const [editError, setEditError] = useState("");
  const [success, setSuccess] = useState("");

  const loadTeams = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await teamsApi.myTeams();
      setTeams(data.teams || []);
    } catch {/* ignore */}
    finally { setLoading(false); }
  };

  useEffect(() => { loadTeams(); }, [user]);

  const startEdit = (team: TeamItem) => {
    setEditingTeam(team.id);
    setEditSlots(JSON.parse(JSON.stringify(team.slots)));
    setEditError("");
    setSuccess("");
  };

  const updateParticipant = (slotIdx: number, partIdx: number, name: string) => {
    const slots = [...editSlots];
    const participants = [...slots[slotIdx].participants];
    participants[partIdx] = { name };
    slots[slotIdx] = { ...slots[slotIdx], participants };
    setEditSlots(slots);
  };

  const saveEdit = async () => {
    if (!editingTeam) return;
    for (const slot of editSlots) {
      const filled = slot.participants.filter((p) => p.name.trim()).length;
      const minReq = slot.is_reserve ? 1 : 3;
      if (filled < minReq) return setEditError(slot.is_reserve ? "Запасной слот: введите хотя бы одного" : `Слот №${slot.slot_number}: минимум 3 из 4`);
    }
    try {
      await teamsApi.update(editingTeam, editSlots.map((s) => ({ slotNumber: s.slot_number, isReserve: s.is_reserve, participants: s.participants })));
      setEditingTeam(null);
      setSuccess("Состав обновлён!");
      await loadTeams();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Ошибка сохранения");
    }
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-black mb-1">Личный кабинет</h1>
          <p className="text-sm text-muted-foreground">Управление своими командами</p>
        </div>
        <div className="glass-card p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ background: "var(--accent-blue-light)" }}>
            <Icon name="LogIn" size={24} style={{ color: "var(--accent-blue)" }} />
          </div>
          <div>
            <p className="font-bold mb-1">Войдите, чтобы увидеть ваши команды</p>
            <p className="text-sm text-muted-foreground">После входа здесь появятся все команды, которые вы регистрировали</p>
          </div>
          <button onClick={() => setAuthOpen(true)}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: "var(--accent-blue)" }}>
            Войти
          </button>
        </div>
        {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black mb-1">Личный кабинет</h1>
          <p className="text-sm text-muted-foreground">
            {user.display_name}
            {user.email && <span className="ml-1">· {user.email}</span>}
          </p>
        </div>
        <button onClick={loadTeams} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title="Обновить">
          <Icon name="RefreshCw" size={16} />
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: "#DCFCE7", color: "var(--accent-green)" }}>
          <Icon name="CheckCircle" size={16} />
          {success}
        </div>
      )}

      {loading && (
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Загружаем команды...</p>
        </div>
      )}

      {!loading && teams.length === 0 && (
        <div className="glass-card p-8 text-center space-y-2">
          <Icon name="Users" size={32} className="mx-auto text-muted-foreground opacity-30" />
          <p className="font-medium">У вас пока нет команд</p>
          <p className="text-sm text-muted-foreground">Зарегистрируйте команду на мероприятие</p>
        </div>
      )}

      {teams.map((team) => {
        const isEditing = editingTeam === team.id;
        const displaySlots = isEditing ? editSlots : team.slots;
        return (
          <div key={team.id} className="glass-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between" style={{ background: "var(--surface)" }}>
              <div>
                <h3 className="font-bold">{team.team_name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{team.tg_contact}</span>
                  {team.payment_status === "paid" ? (
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ background: "#DCFCE7", color: "var(--accent-green)" }}>
                      ✓ Оплачено
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ background: "#FEF9C3", color: "#A16207" }}>
                      Ожидает оплаты
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {!isEditing && (
                  <button onClick={() => startEdit(team)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-secondary transition-colors">
                    <Icon name="Pencil" size={13} />
                    Изменить
                  </button>
                )}
                {isEditing && (
                  <button onClick={() => setEditingTeam(null)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
                    <Icon name="X" size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-border">
              {displaySlots.map((slot, slotIdx) => (
                <div key={slotIdx} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="slot-badge" style={slot.is_reserve ? { background: "#FED7AA", color: "#C2410C" } : {}}>
                      #{slot.slot_number}
                    </span>
                    <span className="text-sm font-medium">
                      {slot.is_reserve ? "Запасные" : `Слот ${slot.slot_number}`}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {slot.participants.map((p, partIdx) => (
                      <div key={partIdx} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4 text-right shrink-0">{partIdx + 1}.</span>
                        {isEditing ? (
                          <input type="text"
                            placeholder={`Участник ${partIdx + 1}${!slot.is_reserve && partIdx < 3 ? " *" : ""}`}
                            value={editSlots[slotIdx]?.participants[partIdx]?.name || ""}
                            onChange={(e) => updateParticipant(slotIdx, partIdx, e.target.value)}
                            className="flex-1 px-2 py-1.5 rounded-lg border border-border focus:outline-none focus:border-blue-500 text-sm"
                          />
                        ) : (
                          <span className={`text-sm px-2 py-1 rounded-md ${!p.name ? "text-muted-foreground italic" : ""}`} style={{ background: "var(--surface)" }}>
                            {p.name || "Пусто"}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {isEditing && (
              <div className="px-4 pb-4 space-y-2">
                {editError && <p className="text-sm" style={{ color: "var(--accent-red)" }}>{editError}</p>}
                <button onClick={saveEdit}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: "var(--accent-blue)" }}>
                  Сохранить изменения
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
