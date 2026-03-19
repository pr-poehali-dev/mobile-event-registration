import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { eventsApi, teamsApi, paymentApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import AuthModal from "@/components/AuthModal";
import Icon from "@/components/ui/icon";

interface Participant { name: string; }
interface Slot { slotNumber: number; participants: Participant[]; isReserve: boolean; }
interface EventItem {
  id: string; title: string; date: string; time: string; map: string;
  password: string; slot_price: number; is_open: boolean;
}

type Step = "event" | "form" | "payment" | "slots" | "success";

interface FormData {
  eventId: string; password: string; teamName: string; tgContact: string;
  mainSlotsCount: number; hasReserve: boolean; slots: Slot[];
}

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [authOpen, setAuthOpen] = useState(false);
  const [step, setStep] = useState<Step>("event");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [registeredTeam, setRegisteredTeam] = useState<{ teamName: string; slots: Slot[] } | null>(null);
  const [reserveListMode, setReserveListMode] = useState(false);
  const [reserveListText, setReserveListText] = useState("");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentChecking, setPaymentChecking] = useState(false);

  const [form, setForm] = useState<FormData>({
    eventId: searchParams.get("event") || "",
    password: "", teamName: "", tgContact: "",
    mainSlotsCount: 1, hasReserve: false, slots: [],
  });

  const selectedEvent = events.find((e) => e.id === form.eventId);

  useEffect(() => {
    eventsApi.list().then((d) => setEvents(d.events || [])).catch(() => {});
  }, []);

  // Проверка возврата с оплаты
  useEffect(() => {
    const pid = searchParams.get("payment_id") || searchParams.get("paid");
    const eid = searchParams.get("event");
    if (pid && pid !== "1" && eid) {
      setPaymentId(pid);
      setForm((f) => ({ ...f, eventId: eid }));
      setStep("slots");
    }
  }, [searchParams]);

  const initSlots = (eventId: string, mainCount: number, hasReserve: boolean): Slot[] => {
    const slots: Slot[] = Array.from({ length: mainCount }, (_, i) => ({
      slotNumber: i + 1,
      participants: Array(4).fill({ name: "" }),
      isReserve: false,
    }));
    if (hasReserve) slots.push({ slotNumber: mainCount + 1, participants: Array(4).fill({ name: "" }), isReserve: true });
    return slots;
  };

  const validateStep = async () => {
    setError("");

    if (step === "event") {
      if (!user) return setAuthOpen(true);
      if (!form.eventId) return setError("Выберите мероприятие");
      if (!form.password) return setError("Введите пароль");
      if (selectedEvent?.password !== form.password) return setError("Неверный пароль");
      setStep("form");
    }

    else if (step === "form") {
      if (!form.teamName.trim()) return setError("Введите название команды");
      if (!form.tgContact.trim()) return setError("Введите Telegram никнейм");
      const tg = form.tgContact.startsWith("@") ? form.tgContact : `@${form.tgContact}`;
      const slots = initSlots(form.eventId, form.mainSlotsCount, form.hasReserve);
      setForm((f) => ({ ...f, tgContact: tg, slots }));
      // Если платная — сначала оплата
      if (selectedEvent && selectedEvent.slot_price > 0) {
        setStep("payment");
      } else {
        setPaymentId("free");
        setStep("slots");
      }
    }

    else if (step === "payment") {
      setLoading(true);
      try {
        const data = await paymentApi.create(form.eventId, form.mainSlotsCount);
        if (data.free) {
          setPaymentId("free");
          setStep("slots");
        } else {
          window.location.href = data.confirmation_url;
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Ошибка оплаты");
      } finally { setLoading(false); }
    }

    else if (step === "slots") {
      let finalSlots = form.slots;
      if (reserveListMode) {
        const names = reserveListText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean).slice(0, 4);
        if (names.length === 0) return setError("Введите хотя бы одного запасного участника");
        finalSlots = form.slots.map((slot) => {
          if (!slot.isReserve) return slot;
          return { ...slot, participants: Array(4).fill({ name: "" }).map((_, i) => ({ name: names[i] || "" })) };
        });
        setForm((f) => ({ ...f, slots: finalSlots }));
      }
      for (const slot of finalSlots) {
        const filled = slot.participants.filter((p) => p.name.trim()).length;
        const minReq = slot.isReserve ? 1 : 3;
        if (filled < minReq) return setError(slot.isReserve ? "Запасной слот: введите хотя бы одного участника" : `Слот №${slot.slotNumber}: нужно минимум 3 из 4`);
      }
      await handleSubmit(finalSlots);
    }
  };

  const handleSubmit = async (finalSlots: Slot[]) => {
    setLoading(true);
    try {
      const slotsPayload = finalSlots.map((slot) => ({
        slotNumber: slot.slotNumber,
        isReserve: slot.isReserve,
        participants: slot.participants,
      }));
      await teamsApi.create({
        event_id: form.eventId,
        team_name: form.teamName,
        tg_contact: form.tgContact,
        slots: slotsPayload,
        payment_id: paymentId,
      });
      setRegisteredTeam({ teamName: form.teamName, slots: finalSlots });
      setStep("success");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка регистрации");
    } finally { setLoading(false); }
  };

  const checkPayment = async () => {
    if (!paymentId || paymentId === "free") return;
    setPaymentChecking(true);
    try {
      const data = await paymentApi.status(paymentId);
      if (data.status === "succeeded") {
        setStep("slots");
      } else {
        setError("Оплата ещё не подтверждена, попробуйте позже");
      }
    } catch {
      setError("Не удалось проверить статус");
    } finally { setPaymentChecking(false); }
  };

  const updateParticipant = (slotIdx: number, partIdx: number, name: string) => {
    setForm((f) => {
      const slots = [...f.slots];
      const participants = [...slots[slotIdx].participants];
      participants[partIdx] = { name };
      slots[slotIdx] = { ...slots[slotIdx], participants };
      return { ...f, slots };
    });
  };

  // Success
  if (step === "success" && registeredTeam) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="glass-card p-5 text-center" style={{ borderColor: "#BBF7D0" }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "#DCFCE7" }}>
            <Icon name="CheckCircle" size={28} style={{ color: "var(--accent-green)" }} />
          </div>
          <h2 className="text-xl font-black mb-1">Команда зарегистрирована!</h2>
          <p className="text-sm text-muted-foreground">Управляйте командой в личном кабинете</p>
        </div>
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border" style={{ background: "var(--accent-blue-light)" }}>
            <p className="font-bold text-sm" style={{ color: "var(--accent-blue)" }}>🏆 {registeredTeam.teamName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{selectedEvent?.title}</p>
          </div>
          <div className="divide-y divide-border">
            {registeredTeam.slots.map((slot) => (
              <div key={slot.slotNumber} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="slot-badge">#{slot.slotNumber}</span>
                  <span className="text-sm font-medium">{slot.isReserve ? "Запасные" : `Слот ${slot.slotNumber}`}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {slot.participants.map((p, i) => (
                    <div key={i} className="text-sm px-2 py-1 rounded-md" style={{ background: "var(--surface)" }}>
                      {p.name || <span className="text-muted-foreground italic">Пусто</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate("/cabinet")} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--accent-blue)" }}>
            В личный кабинет
          </button>
          <button onClick={() => navigate("/teams")} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-secondary transition-colors">
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
          {(["event", "form", ...(selectedEvent?.slot_price ? ["payment"] : []), "slots"] as string[]).map((s, i, arr) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className="h-1.5 flex-1 rounded-full transition-colors" style={{
                background: (["event", "form", "payment", "slots"] as string[]).indexOf(step) >= i ? "var(--accent-blue)" : "var(--border)"
              }} />
            </div>
          ))}
        </div>
      </div>

      {/* Не авторизован */}
      {!user && step !== "event" && (
        <div className="glass-card p-4 flex items-center gap-3">
          <Icon name="LogIn" size={20} style={{ color: "var(--accent-blue)" }} />
          <div className="flex-1">
            <p className="text-sm font-medium">Необходима авторизация</p>
            <p className="text-xs text-muted-foreground">Войдите чтобы продолжить регистрацию</p>
          </div>
          <button onClick={() => setAuthOpen(true)} className="text-sm font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--accent-blue)" }}>
            Войти
          </button>
        </div>
      )}

      {/* Step 1 — Event */}
      {step === "event" && (
        <div className="glass-card p-5 space-y-4">
          <h2 className="font-bold">Выберите мероприятие</h2>
          {!user && (
            <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: "var(--accent-blue-light)" }}>
              <Icon name="Info" size={16} style={{ color: "var(--accent-blue)" }} />
              <p className="text-sm" style={{ color: "var(--accent-blue)" }}>
                Для регистрации необходимо{" "}
                <button onClick={() => setAuthOpen(true)} className="font-bold underline">войти</button>
              </p>
            </div>
          )}
          <div className="space-y-2">
            {events.length === 0 && <p className="text-sm text-muted-foreground">Нет открытых мероприятий</p>}
            {events.map((event) => (
              <label
                key={event.id}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  form.eventId === event.id ? "border-blue-400 bg-blue-50" : "border-border hover:bg-secondary/50"
                }`}
              >
                <input type="radio" name="event" className="sr-only" value={event.id}
                  checked={form.eventId === event.id}
                  onChange={(e) => setForm((f) => ({ ...f, eventId: e.target.value }))}
                />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{event.title}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{new Date(event.date).toLocaleDateString("ru-RU")}</span>
                    <span>{event.time} МСК</span>
                    <span>{event.map}</span>
                  </div>
                  {event.slot_price > 0 && (
                    <span className="inline-block mt-1.5 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--accent-blue-light)", color: "var(--accent-blue)" }}>
                      {event.slot_price} ₽ / слот
                    </span>
                  )}
                </div>
              </label>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Пароль для регистрации</label>
            <input type="password" placeholder="Введите пароль" value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
        </div>
      )}

      {/* Step 2 — Form */}
      {step === "form" && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => setStep("event")} className="text-muted-foreground hover:text-foreground"><Icon name="ArrowLeft" size={16} /></button>
            <h2 className="font-bold">Данные команды</h2>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Название команды</label>
            <input type="text" placeholder="Например: Team Alpha" value={form.teamName}
              onChange={(e) => setForm((f) => ({ ...f, teamName: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Telegram представителя</label>
            <input type="text" placeholder="@username" value={form.tgContact}
              onChange={(e) => setForm((f) => ({ ...f, tgContact: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-3">
              Количество основных слотов <span className="text-muted-foreground font-normal">(1–5, по 4 участника)</span>
            </label>
            <div className="flex items-center gap-3">
              <button onClick={() => setForm((f) => ({ ...f, mainSlotsCount: Math.max(1, f.mainSlotsCount - 1) }))}
                className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors">
                <Icon name="Minus" size={16} />
              </button>
              <span className="text-xl font-black w-8 text-center">{form.mainSlotsCount}</span>
              <button onClick={() => setForm((f) => ({ ...f, mainSlotsCount: Math.min(5, f.mainSlotsCount + 1) }))}
                className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors">
                <Icon name="Plus" size={16} />
              </button>
              <span className="text-sm text-muted-foreground ml-1">= {form.mainSlotsCount * 4} участников</span>
            </div>
          </div>
          <label className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-secondary/50 transition-colors">
            <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={form.hasReserve}
              onChange={(e) => setForm((f) => ({ ...f, hasReserve: e.target.checked }))} />
            <div>
              <p className="text-sm font-medium">Добавить слот запасных</p>
              <p className="text-xs text-muted-foreground">1 дополнительный слот, до 4 запасных участников</p>
            </div>
          </label>
          <div className="p-3 rounded-xl text-sm" style={{ background: "var(--accent-blue-light)", color: "var(--accent-blue)" }}>
            Итого: {form.mainSlotsCount} осн. слот{form.mainSlotsCount > 1 ? "а" : ""}{form.hasReserve ? " + 1 запасной" : ""}
            {selectedEvent && selectedEvent.slot_price > 0 && (
              <span className="font-bold ml-2">· {selectedEvent.slot_price * form.mainSlotsCount} ₽</span>
            )}
          </div>
        </div>
      )}

      {/* Step — Payment */}
      {step === "payment" && selectedEvent && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => setStep("form")} className="text-muted-foreground hover:text-foreground"><Icon name="ArrowLeft" size={16} /></button>
            <h2 className="font-bold">Оплата слотов</h2>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Мероприятие</span>
              <span className="font-medium">{selectedEvent.title}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Слотов</span>
              <span className="font-medium">{form.mainSlotsCount} × {selectedEvent.slot_price} ₽</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-bold">
              <span>Итого</span>
              <span style={{ color: "var(--accent-blue)" }}>{selectedEvent.slot_price * form.mainSlotsCount} ₽</span>
            </div>
          </div>
          <div className="p-3 rounded-xl text-xs text-muted-foreground" style={{ background: "var(--surface)" }}>
            Вы будете перенаправлены на страницу оплаты YooKassa. После успешной оплаты вернётесь сюда для заполнения состава команды.
          </div>
          {paymentId && paymentId !== "free" && (
            <button onClick={checkPayment} disabled={paymentChecking}
              className="w-full py-2.5 rounded-xl text-sm font-semibold border border-border hover:bg-secondary transition-colors">
              {paymentChecking ? "Проверяем..." : "Я уже оплатил — проверить"}
            </button>
          )}
        </div>
      )}

      {/* Step 3 — Slots */}
      {step === "slots" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setStep(selectedEvent?.slot_price ? "payment" : "form")} className="text-muted-foreground hover:text-foreground">
              <Icon name="ArrowLeft" size={16} />
            </button>
            <h2 className="font-bold">Состав команды</h2>
          </div>
          <p className="text-sm text-muted-foreground -mt-2">Минимум 3 из 4 участников в каждом слоте обязательны</p>

          {form.slots.map((slot, slotIdx) => (
            <div key={slotIdx} className="glass-card overflow-hidden">
              <div className="px-4 py-2.5 flex items-center gap-2 border-b border-border"
                style={{ background: slot.isReserve ? "#FFF7ED" : "var(--accent-blue-light)" }}>
                <span className="slot-badge text-xs" style={slot.isReserve ? { background: "#FED7AA", color: "#C2410C" } : {}}>
                  #{slot.slotNumber}
                </span>
                <span className="text-sm font-semibold" style={slot.isReserve ? { color: "#C2410C" } : { color: "var(--accent-blue)" }}>
                  {slot.isReserve ? "Запасной слот" : `Слот ${slot.slotNumber}`}
                </span>
                {slot.isReserve ? (
                  <div className="ml-auto flex items-center gap-1 rounded-lg overflow-hidden border border-orange-200">
                    <button type="button" onClick={() => setReserveListMode(false)}
                      className="px-2 py-1 text-xs transition-colors"
                      style={{ background: !reserveListMode ? "#FED7AA" : "transparent", color: "#C2410C", fontWeight: !reserveListMode ? 700 : 400 }}>
                      По одному
                    </button>
                    <button type="button" onClick={() => setReserveListMode(true)}
                      className="px-2 py-1 text-xs transition-colors"
                      style={{ background: reserveListMode ? "#FED7AA" : "transparent", color: "#C2410C", fontWeight: reserveListMode ? 700 : 400 }}>
                      Списком
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground ml-auto">4 участника / мин. 3</span>
                )}
              </div>
              {slot.isReserve && reserveListMode ? (
                <div className="p-3 space-y-2">
                  <textarea placeholder={"Иванов Иван\nПетров Пётр\nСидоров Сидор"} value={reserveListText}
                    onChange={(e) => setReserveListText(e.target.value)} rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-border focus:outline-none focus:border-orange-400 text-sm resize-none" />
                  <p className="text-xs text-muted-foreground">Каждый с новой строки или через запятую · макс. 4</p>
                  {reserveListText && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {reserveListText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean).slice(0, 4).map((name, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "#FED7AA", color: "#C2410C" }}>{name}</span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 grid grid-cols-1 gap-2">
                  {slot.participants.map((p, partIdx) => (
                    <div key={partIdx} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{partIdx + 1}.</span>
                      <input type="text"
                        placeholder={slot.isReserve ? `Запасной ${partIdx + 1}` : `Участник ${partIdx + 1}${partIdx < 3 ? " *" : ""}`}
                        value={p.name}
                        onChange={(e) => updateParticipant(slotIdx, partIdx, e.target.value)}
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
        <div className="flex items-start gap-2 p-3 rounded-xl text-sm" style={{ background: "#FEF2F2", color: "var(--accent-red)" }}>
          <Icon name="AlertCircle" size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Next button */}
      {step !== "success" && (
        <button
          onClick={validateStep}
          disabled={loading}
          className="w-full py-3 rounded-xl font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--accent-blue)" }}
        >
          {loading ? "Загрузка..." : step === "slots" ? "Зарегистрировать команду" : step === "payment" ? "Перейти к оплате" : "Далее"}
        </button>
      )}

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
