import { useState } from "react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Icon from "@/components/ui/icon";

interface Props {
  onClose: () => void;
}

type Method = "choose" | "email" | "tg_manual";

export default function AuthModal({ onClose }: Props) {
  const { setSession } = useAuthStore();
  const [method, setMethod] = useState<Method>("choose");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tgId, setTgId] = useState("");
  const [tgName, setTgName] = useState("");

  const sendCode = async () => {
    if (!email.trim() || !email.includes("@")) return setError("Введите корректный email");
    setLoading(true); setError("");
    try {
      await authApi.sendCode(email.trim().toLowerCase());
      setCodeSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally { setLoading(false); }
  };

  const verifyCode = async () => {
    if (!code.trim()) return setError("Введите код");
    setLoading(true); setError("");
    try {
      const data = await authApi.verifyCode(email.trim().toLowerCase(), code.trim());
      setSession(data.session_id, data.user);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally { setLoading(false); }
  };

  const loginTg = async () => {
    if (!tgId.trim()) return setError("Введите Telegram ID");
    setLoading(true); setError("");
    try {
      const data = await authApi.loginTg({
        id: tgId.trim(),
        first_name: tgName.trim() || `tg_${tgId.trim()}`,
        username: "",
      });
      setSession(data.session_id, data.user);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally { setLoading(false); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        style={{ background: "var(--background)" }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            {method !== "choose" && (
              <button
                onClick={() => { setMethod("choose"); setError(""); setCodeSent(false); }}
                className="text-muted-foreground hover:text-foreground mr-1"
              >
                <Icon name="ArrowLeft" size={16} />
              </button>
            )}
            <h2 className="font-bold text-lg">Войти</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {/* Choose method */}
          {method === "choose" && (
            <>
              <p className="text-sm text-muted-foreground mb-4">Выберите способ входа</p>

              <button
                onClick={() => setMethod("email")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:bg-secondary transition-colors"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-blue-light)" }}>
                  <Icon name="Mail" size={18} style={{ color: "var(--accent-blue)" }} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Email</p>
                  <p className="text-xs text-muted-foreground">Код на почту</p>
                </div>
                <Icon name="ChevronRight" size={16} className="ml-auto text-muted-foreground" />
              </button>

              <button
                onClick={() => setMethod("tg_manual")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:bg-secondary transition-colors"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#EFF6FF" }}>
                  <span className="text-lg">✈️</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Telegram</p>
                  <p className="text-xs text-muted-foreground">По ID аккаунта</p>
                </div>
                <Icon name="ChevronRight" size={16} className="ml-auto text-muted-foreground" />
              </button>

              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-border opacity-50 cursor-not-allowed"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#F0F4FF" }}>
                  <span className="text-lg">🔵</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">ВКонтакте</p>
                  <p className="text-xs text-muted-foreground">Скоро</p>
                </div>
              </div>
            </>
          )}

          {/* Email */}
          {method === "email" && (
            <>
              {!codeSent ? (
                <>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && sendCode()}
                    className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm"
                    autoFocus
                  />
                  {error && <p className="text-sm" style={{ color: "var(--accent-red)" }}>{error}</p>}
                  <button
                    onClick={sendCode}
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white mt-2"
                    style={{ background: "var(--accent-blue)" }}
                  >
                    {loading ? "Отправляем..." : "Получить код"}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Код отправлен на <strong>{email}</strong>
                  </p>
                  <label className="block text-sm font-medium mb-1">Код из письма</label>
                  <input
                    type="text"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => { setCode(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && verifyCode()}
                    maxLength={6}
                    className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm text-center text-xl tracking-widest font-mono"
                    autoFocus
                  />
                  {error && <p className="text-sm" style={{ color: "var(--accent-red)" }}>{error}</p>}
                  <button
                    onClick={verifyCode}
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white mt-2"
                    style={{ background: "var(--accent-blue)" }}
                  >
                    {loading ? "Проверяем..." : "Войти"}
                  </button>
                  <button
                    onClick={() => { setCodeSent(false); setCode(""); setError(""); }}
                    className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    Изменить email
                  </button>
                </>
              )}
            </>
          )}

          {/* Telegram manual */}
          {method === "tg_manual" && (
            <>
              <p className="text-sm text-muted-foreground">
                Узнать свой Telegram ID можно у бота <strong>@userinfobot</strong>
              </p>
              <div>
                <label className="block text-sm font-medium mb-1">Telegram ID</label>
                <input
                  type="text"
                  placeholder="123456789"
                  value={tgId}
                  onChange={(e) => { setTgId(e.target.value); setError(""); }}
                  className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Имя (необязательно)</label>
                <input
                  type="text"
                  placeholder="Иван Иванов"
                  value={tgName}
                  onChange={(e) => setTgName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              {error && <p className="text-sm" style={{ color: "var(--accent-red)" }}>{error}</p>}
              <button
                onClick={loginTg}
                disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: "var(--accent-blue)" }}
              >
                {loading ? "Входим..." : "Войти"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
