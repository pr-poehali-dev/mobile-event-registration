import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAppStore, Slot } from "@/store/appStore";
import Icon from "@/components/ui/icon";

type Step = "event" | "form" | "slots" | "success";

interface FormData {
  eventId: string;
  password: string;
  teamName: string;
  tgContact: string;
  mainSlotsCount: number;
  hasReserve: boolean;
  slots: Slot[];
}

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { events, addTeam, getNextSlotNumbers } = useAppStore();
  const [step, setStep] = useState<Step>("event");
  const [error, setError] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");
  const [registeredTeam, setRegisteredTeam] = useState<{ teamName: string; slots: Slot[]; id: string } | null>(null);
  const [reserveListMode, setReserveListMode] = useState(false);
  const [reserveListText, setReserveListText] = useState("");

  const [form, setForm] = useState<FormData>({
    eventId: searchParams.get("event") || "",
    password: "",
    teamName: "",
    tgContact: "",
    mainSlotsCount: 1,
    hasReserve: false,
    slots: [],
  });

  const openEvents = events.filter((e) => e.isOpen);
  const selectedEvent = events.find((e) => e.id === form.eventId);

  useEffect(() => {
    if (searchParams.get("event")) {
      setForm((f) => ({ ...f, eventId: searchParams.get("event") || "" }));
    }
  }, [searchParams]);

  const initSlots = () => {
    const slotNumbers = getNextSlotNumbers(form.eventId, form.mainSlotsCount);
    const slots: Slot[] = slotNumbers.map((num) => ({
      slotNumber: num,
      participants: Array(4).fill({ name: "" }),
      isReserve: false,
    }));
    if (form.hasReserve) {
      const reserveNumbers = getNextSlotNumbers(
        form.eventId,
        form.mainSlotsCount + 1
      );
      const reserveNum = reserveNumbers[form.mainSlotsCount];
      slots.push({
        slotNumber: reserveNum || slotNumbers[slotNumbers.length - 1] + 1,
        participants: Array(4).fill({ name: "" }),
        isReserve: true,
      });
    }
    return slots;
  };

  const validateStep = () => {
    setError("");
    if (step === "event") {
      if (!form.eventId) return setError("Выберите мероприятие");
      if (!form.password) return setError("Введите пароль");
      if (selectedEvent?.password !== form.password)
        return setError("Неверный пароль");
      setStep("form");
    } else if (step === "form") {
      if (!form.teamName.trim()) return setError("Введите название команды");
      if (!form.tgContact.trim()) return setError("Введите Telegram никнейм");
      const tg = form.tgContact.startsWith("@")
        ? form.tgContact
        : `@${form.tgContact}`;
      setForm((f) => ({ ...f, tgContact: tg }));
      const slots = initSlots();
      setForm((f) => ({ ...f, slots }));
      setStep("slots");
    } else if (step === "slots") {
      // Apply list mode for reserve slot if active
      let finalSlots = form.slots;
      if (reserveListMode) {
        const names = reserveListText
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 4);
        if (names.length === 0) return setError("Введите хотя бы одного запасного участника");
        finalSlots = form.slots.map((slot) => {
          if (!slot.isReserve) return slot;
          const participants = Array(4).fill({ name: "" }).map((_, i) => ({ name: names[i] || "" }));
          return { ...slot, participants };
        });
        setForm((f) => ({ ...f, slots: finalSlots }));
      }
      for (const slot of finalSlots) {
        const filled = slot.participants.filter((p) => p.name.trim()).length;
        const minRequired = slot.isReserve ? 1 : 3;
        if (filled < minRequired)
          return setError(
            slot.isReserve
              ? `Запасной слот: введите хотя бы одного участника`
              : `Слот №${slot.slotNumber}: нужно заполнить минимум 3 участника из 4`
          );
      }
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const token = addTeam({
      teamName: form.teamName,
      tgContact: form.tgContact,
      eventId: form.eventId,
      slots: form.slots,
    });
    setRegistrationToken(token);
    setRegisteredTeam({
      teamName: form.teamName,
      slots: form.slots,
      id: token,
    });
    setStep("success");
  };

  const updateParticipant = (
    slotIdx: number,
    partIdx: number,
    name: string
  ) => {
    setForm((f) => {
      const slots = [...f.slots];
      const participants = [...slots[slotIdx].participants];
      participants[partIdx] = { name };
      slots[slotIdx] = { ...slots[slotIdx], participants };
      return { ...f, slots };
    });
  };

  if (step === "success" && registeredTeam) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="glass-card p-5 text-center border-green-200" style={{ borderColor: "#BBF7D0" }}>
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: "#DCFCE7" }}
          >
            <Icon name="CheckCircle" size={28} style={{ color: "var(--accent-green)" }} />
          </div>
          <h2 className="text-xl font-black mb-1">Команда зарегистрирована!</h2>
          <p className="text-sm text-muted-foreground">
            Сохраните токен для управления командой
          </p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Ваш токен управления
            </p>
            <button
              onClick={() => navigator.clipboard.writeText(registrationToken)}
              className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <Icon name="Copy" size={12} />
              Скопировать
            </button>
          </div>
          <code
            className="block w-full p-3 rounded-lg text-sm font-mono break-all"
            style={{ background: "var(--surface)" }}
          >
            {registrationToken}
          </code>
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ Сохраните токен — он нужен для редактирования и удаления команды
          </p>
        </div>

        <div className="glass-card overflow-hidden">
          <div
            className="px-4 py-3 border-b border-border"
            style={{ background: "var(--accent-blue-light)" }}
          >
            <p className="font-bold text-sm" style={{ color: "var(--accent-blue)" }}>
              🏆 {registeredTeam.teamName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedEvent?.title}
            </p>
          </div>
          <div className="divide-y divide-border">
            {registeredTeam.slots.map((slot) => (
              <div key={slot.slotNumber} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="slot-badge">#{slot.slotNumber}</span>
                  <span className="text-sm font-medium">
                    {slot.isReserve ? "Запасные" : `Слот ${slot.slotNumber}`}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {slot.participants.map((p, i) => (
                    <div
                      key={i}
                      className="text-sm px-2 py-1 rounded-md"
                      style={{ background: "var(--surface)" }}
                    >
                      {p.name || (
                        <span className="text-muted-foreground italic">
                          Пусто
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate("/cabinet")}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "var(--accent-blue)" }}
          >
            Перейти в кабинет
          </button>
          <button
            onClick={() => navigate("/teams")}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-secondary transition-colors"
          >
            Все команды
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Progress */}
      <div>
        <h1 className="text-2xl font-black mb-4">Регистрация команды</h1>
        <div className="flex items-center gap-1">
          {["event", "form", "slots"].map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div
                className="h-1.5 flex-1 rounded-full transition-colors"
                style={{
                  background:
                    ["event", "form", "slots", "success"].indexOf(step) > i
                      ? "var(--accent-blue)"
                      : step === s
                      ? "var(--accent-blue)"
                      : "var(--border-color)",
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted-foreground">Мероприятие</span>
          <span className="text-xs text-muted-foreground">Команда</span>
          <span className="text-xs text-muted-foreground">Участники</span>
        </div>
      </div>

      {/* Step 1 */}
      {step === "event" && (
        <div className="glass-card p-5 space-y-4">
          <h2 className="font-bold">Выберите мероприятие</h2>
          {openEvents.length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                Нет открытых мероприятий
              </p>
            </div>
          )}
          <div className="space-y-2">
            {openEvents.map((event) => (
              <label
                key={event.id}
                className={`block p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                  form.eventId === event.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-border hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="event"
                  className="sr-only"
                  value={event.id}
                  checked={form.eventId === event.id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, eventId: e.target.value }))
                  }
                />
                <p className="font-semibold text-sm">{event.title}</p>
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                  <span>
                    {new Date(event.date).toLocaleDateString("ru-RU")}
                  </span>
                  <span>{event.time} МСК</span>
                  <span>{event.map}</span>
                </div>
              </label>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Пароль для регистрации
            </label>
            <input
              type="password"
              placeholder="Введите пароль"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === "form" && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => setStep("event")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Icon name="ArrowLeft" size={16} />
            </button>
            <h2 className="font-bold">Данные команды</h2>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Название команды
            </label>
            <input
              type="text"
              placeholder="Например: Team Alpha"
              value={form.teamName}
              onChange={(e) =>
                setForm((f) => ({ ...f, teamName: e.target.value }))
              }
              className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Telegram представителя
            </label>
            <input
              type="text"
              placeholder="@username"
              value={form.tgContact}
              onChange={(e) =>
                setForm((f) => ({ ...f, tgContact: e.target.value }))
              }
              className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">
              Количество основных слотов{" "}
              <span className="text-muted-foreground font-normal">(1–5, по 4 участника)</span>
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    mainSlotsCount: Math.max(1, f.mainSlotsCount - 1),
                  }))
                }
                className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors"
              >
                <Icon name="Minus" size={16} />
              </button>
              <span className="text-xl font-black w-8 text-center">
                {form.mainSlotsCount}
              </span>
              <button
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    mainSlotsCount: Math.min(5, f.mainSlotsCount + 1),
                  }))
                }
                className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors"
              >
                <Icon name="Plus" size={16} />
              </button>
              <span className="text-sm text-muted-foreground ml-1">
                = {form.mainSlotsCount * 4} участников
              </span>
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-secondary/50 transition-colors">
            <input
              type="checkbox"
              className="w-4 h-4 accent-blue-600"
              checked={form.hasReserve}
              onChange={(e) =>
                setForm((f) => ({ ...f, hasReserve: e.target.checked }))
              }
            />
            <div>
              <p className="text-sm font-medium">Добавить слот запасных</p>
              <p className="text-xs text-muted-foreground">
                1 дополнительный слот, до 4 запасных участников
              </p>
            </div>
          </label>

          <div
            className="p-3 rounded-xl text-sm"
            style={{ background: "var(--accent-blue-light)", color: "var(--accent-blue)" }}
          >
            Итого: {form.mainSlotsCount} основных слота
            {form.hasReserve ? " + 1 запасной" : ""} ·{" "}
            {form.mainSlotsCount * 4 + (form.hasReserve ? 4 : 0)} мест
          </div>
        </div>
      )}

      {/* Step 3 — slots */}
      {step === "slots" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep("form")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Icon name="ArrowLeft" size={16} />
            </button>
            <h2 className="font-bold">Состав команды</h2>
          </div>
          <p className="text-sm text-muted-foreground -mt-2">
            Минимум 3 из 4 участников в каждом слоте обязательны
          </p>

          {form.slots.map((slot, slotIdx) => (
            <div key={slotIdx} className="glass-card overflow-hidden">
              <div
                className="px-4 py-2.5 flex items-center gap-2 border-b border-border"
                style={{
                  background: slot.isReserve ? "#FFF7ED" : "var(--accent-blue-light)",
                }}
              >
                <span
                  className="slot-badge text-xs"
                  style={
                    slot.isReserve
                      ? { background: "#FED7AA", color: "#C2410C" }
                      : {}
                  }
                >
                  #{slot.slotNumber}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={
                    slot.isReserve
                      ? { color: "#C2410C" }
                      : { color: "var(--accent-blue)" }
                  }
                >
                  {slot.isReserve ? "Запасной слот" : `Слот ${slot.slotNumber}`}
                </span>
                {slot.isReserve ? (
                  <div className="ml-auto flex items-center gap-1 rounded-lg overflow-hidden border border-orange-200">
                    <button
                      type="button"
                      onClick={() => setReserveListMode(false)}
                      className="px-2 py-1 text-xs transition-colors"
                      style={{
                        background: !reserveListMode ? "#FED7AA" : "transparent",
                        color: "#C2410C",
                        fontWeight: !reserveListMode ? 700 : 400,
                      }}
                    >
                      По одному
                    </button>
                    <button
                      type="button"
                      onClick={() => setReserveListMode(true)}
                      className="px-2 py-1 text-xs transition-colors"
                      style={{
                        background: reserveListMode ? "#FED7AA" : "transparent",
                        color: "#C2410C",
                        fontWeight: reserveListMode ? 700 : 400,
                      }}
                    >
                      Списком
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground ml-auto">
                    4 участника / мин. 3
                  </span>
                )}
              </div>
              {slot.isReserve && reserveListMode ? (
                <div className="p-3 space-y-2">
                  <textarea
                    placeholder={"Иванов Иван\nПетров Пётр\nСидоров Сидор"}
                    value={reserveListText}
                    onChange={(e) => setReserveListText(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-border focus:outline-none focus:border-orange-400 text-sm resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Каждый участник с новой строки или через запятую · максимум 4
                  </p>
                  {reserveListText && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {reserveListText
                        .split(/[\n,]+/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .slice(0, 4)
                        .map((name, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: "#FED7AA", color: "#C2410C" }}
                          >
                            {name}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 grid grid-cols-1 gap-2">
                  {slot.participants.map((p, partIdx) => (
                    <div key={partIdx} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                        {partIdx + 1}.
                      </span>
                      <input
                        type="text"
                        placeholder={
                          slot.isReserve
                            ? `Запасной ${partIdx + 1}`
                            : `Участник ${partIdx + 1}${partIdx < 3 ? " *" : ""}`
                        }
                        value={p.name}
                        onChange={(e) =>
                          updateParticipant(slotIdx, partIdx, e.target.value)
                        }
                        className="flex-1 px-3 py-2 rounded-lg border border-border focus:outline-none focus:border-blue-500 text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="flex items-start gap-2 p-3 rounded-xl text-sm"
          style={{ background: "#FEF2F2", color: "#DC2626" }}
        >
          <Icon name="AlertCircle" size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      {step !== "success" && (
        <button
          onClick={validateStep}
          className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--accent-blue)" }}
        >
          {step === "slots" ? "Зарегистрировать команду" : "Продолжить"}
          <Icon name="ArrowRight" size={16} className="inline ml-2" />
        </button>
      )}
    </div>
  );
}