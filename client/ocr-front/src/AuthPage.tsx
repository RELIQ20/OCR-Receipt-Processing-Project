import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { CardStack } from "../pages/CardStack";
import { signup, login, AuthError, type PublicUser } from "./lib/auth-client";

const t = {
  pageBg: "#FBFBF9",
  panelBg: "#003B28",
  panelBgDeep: "#04160F",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F6F3",
  text: "#0F241B",
  textMuted: "#5C6B65",
  onPanel: "#F5EEDB",
  onPanelMuted: "rgba(245,238,219,0.6)",
  green: "#00563B",
  accent: "#F4C430",
  accentInk: "#3A2A00",
  border: "rgba(0,86,59,0.12)",
  danger: "#B3261E",
  paper: "#F5EEDB",
};

type Mode = "login" | "signup";

interface FieldErrors {
  [key: string]: string | undefined;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ERROR_COPY: Record<string, string> = {
  invalid_credentials: "That username/email or password isn't right.",
  account_exists: "An account with that username or email already exists.",
  account_inactive: "This account isn't active. Contact an admin for access.",
  missing_fields: "Fill in every field to continue.",
  invalid_email: "Enter a valid email address.",
  invalid_username: "Username needs to be at least 3 characters.",
  weak_password: "Password needs to be at least 8 characters.",
  request_failed: "Something went wrong. Try again.",
};

function friendlyError(err: unknown): string {
  if (err instanceof AuthError) {
    return ERROR_COPY[err.code] ?? "Something went wrong. Try again.";
  }
  return "Couldn't reach the server. Check your connection and try again.";
}

function Field({ icon: Icon, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; error?: string }) {
  return (
    <div>
      <div
        className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border transition-colors"
        style={{
          background: t.surfaceAlt,
          borderColor: error ? t.danger : t.border,
        }}
      >
        <Icon size={15} color={t.textMuted} strokeWidth={1.8} />
        <input
          {...props}
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#5C6B65]/50"
          style={{ color: t.text }}
        />
      </div>
      {error && (
        <p className="text-[11px] mt-1 ml-1" style={{ color: t.danger }}>
          {error}
        </p>
      )}
    </div>
  );
}

export interface AuthPageProps {
  onAuthSuccess?: (user: PublicUser) => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const switchMode = (next: Mode) => {
    setMode(next);
    setFormError(null);
    setFieldErrors({});
    setShowPassword(false);
  };

  const validateSignup = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (!firstName.trim()) errs.firstName = "Required";
    if (!lastName.trim()) errs.lastName = "Required";
    if (username.trim().length < 3) errs.username = "At least 3 characters";
    if (!EMAIL_RE.test(email)) errs.email = "Enter a valid email";
    if (signupPassword.length < 8) errs.password = "At least 8 characters";
    if (confirmPassword !== signupPassword) errs.confirmPassword = "Passwords don't match";
    return errs;
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!identifier.trim() || !loginPassword) {
      setFieldErrors({
        identifier: !identifier.trim() ? "Required" : undefined,
        password: !loginPassword ? "Required" : undefined,
      });
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const user = await login({ identifier: identifier.trim(), password: loginPassword });
      onAuthSuccess?.(user);
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errs = validateSignup();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const user = await signup({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        email: email.trim(),
        password: signupPassword,
      });
      onAuthSuccess?.(user);
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex" style={{ background: t.pageBg }}>
      <div
        className="hidden lg:flex flex-col justify-between w-[46%] px-14 py-12 relative overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${t.panelBg} 0%, ${t.panelBgDeep} 100%)` }}
      >
        <div
          className="absolute inset-0 opacity-[0.4] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 20% 15%, rgba(244,196,48,0.10), transparent 45%), radial-gradient(circle at 80% 85%, rgba(0,86,59,0.35), transparent 50%)",
          }}
        />

        <div className="relative z-10 flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: t.accent }}>
            <Sparkles size={15} color={t.accentInk} />
          </div>
          <span className="font-bold tracking-tight text-lg" style={{ color: t.onPanel }}>
            LifeReceipt
          </span>
        </div>

        <div className="relative z-10 flex-1 flex items-center justify-center">
          <CardStack name="Your Spending" balance="₱12,480.50" size="hero" autoRotate />
        </div>

        <div className="relative z-10 max-w-sm">
          <p className="text-xl font-semibold leading-snug" style={{ color: t.onPanel }}>
            Every receipt, tracked automatically.
          </p>
          <p className="text-sm mt-2" style={{ color: t.onPanelMuted }}>
            Forward a photo on WhatsApp and LifeReceipt reads it, sorts it, and keeps your
            spending totals current — no spreadsheets required.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: t.accent }}>
              <Sparkles size={15} color={t.accentInk} />
            </div>
            <span className="font-bold tracking-tight text-lg" style={{ color: t.text }}>
              LifeReceipt
            </span>
          </div>

          <div
            className="flex items-center gap-1 rounded-full p-1 mb-8 mx-auto w-full max-w-[280px]"
            style={{ background: t.surfaceAlt }}
          >
            {(["login", "signup"] as Mode[]).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className="relative flex-1 text-sm font-semibold py-2 rounded-full transition-colors"
                  style={{ color: active ? "#fff" : t.textMuted }}
                >
                  {active && (
                    <motion.div
                      layoutId="auth-mode-pill"
                      className="absolute inset-0 rounded-full"
                      style={{ background: t.green }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative">{m === "login" ? "Log in" : "Sign up"}</span>
                </button>
              );
            })}
          </div>

          <h1 className="text-2xl font-bold mb-1" style={{ color: t.text }}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm mb-6" style={{ color: t.textMuted }}>
            {mode === "login"
              ? "Log in to see your latest receipts and spending."
              : "Start tracking every receipt in one place."}
          </p>

          <AnimatePresence>
            {formError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 px-3.5 py-2.5 rounded-xl text-xs overflow-hidden"
                style={{ background: `${t.danger}12`, color: t.danger, border: `1px solid ${t.danger}30` }}
              >
                {formError}
              </motion.div>
            )}
          </AnimatePresence>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-3.5" noValidate>
              <Field
                icon={Mail}
                type="text"
                placeholder="Username or email"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                error={fieldErrors.identifier}
              />
              <div className="relative">
                <Field
                  icon={Lock}
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  error={fieldErrors.password}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C6B65]"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold"
                style={{ background: t.green, color: "#fff" }}
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : "Continue"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-3.5" noValidate>
              <div className="grid grid-cols-2 gap-3.5">
                <Field
                  icon={User}
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  error={fieldErrors.firstName}
                />
                <Field
                  icon={User}
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  error={fieldErrors.lastName}
                />
              </div>
              <Field
                icon={User}
                type="text"
                placeholder="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                error={fieldErrors.username}
              />
              <Field
                icon={Mail}
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={fieldErrors.email}
              />
              <div className="relative">
                <Field
                  icon={Lock}
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={signupPassword}
                  onChange={(event) => setSignupPassword(event.target.value)}
                  error={fieldErrors.password}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C6B65]"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <Field
                icon={Lock}
                type={showPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                error={fieldErrors.confirmPassword}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold"
                style={{ background: t.green, color: "#fff" }}
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : "Create account"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm" style={{ color: t.textMuted }}>
            {mode === "login" ? (
              <span>
                Don&apos;t have an account?{' '}
                <button type="button" className="font-semibold text-[#0F241B] underline" onClick={() => switchMode("signup")}>Create one</button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button type="button" className="font-semibold text-[#0F241B] underline" onClick={() => switchMode("login")}>Log in</button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
