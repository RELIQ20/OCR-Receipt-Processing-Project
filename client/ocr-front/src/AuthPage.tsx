import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Flame } from "lucide-react";
import { signup, login, AuthError, type PublicUser } from "./lib/auth-client";

type Mode = "login" | "signup";
type FieldErrors = Record<string, string>;

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

// Enhanced Input field with focus animations
function InputField({ error, ...props }: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <motion.div
      className="w-full relative"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        animate={{
          boxShadow: isFocused ? "0px 0px 0px 2px rgba(59, 130, 246, 0.2)" : "0px 0px 0px 0px rgba(59, 130, 246, 0)",
          borderColor: isFocused ? "#3B82F6" : error ? "#EF4444" : "#F3F4F6",
          backgroundColor: isFocused ? "#FFFFFF" : "#F9FAFB"
        }}
        className="rounded-xl overflow-hidden border transition-colors duration-300"
      >
        <input
          {...props}
          onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
          className="w-full px-4 py-3.5 bg-transparent focus:outline-none text-sm text-gray-800 placeholder-gray-400"
        />
      </motion.div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0, y: -5 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -5 }}
            className="text-[11px] text-red-500 mt-1.5 ml-1 font-medium"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export interface AuthPageProps {
  onAuthSuccess?: (user: PublicUser) => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<Mode>("signup");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const switchMode = (next: Mode) => {
    setMode(next);
    setFormError(null);
    setFieldErrors({});
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!identifier.trim() || !loginPassword) {
      setFieldErrors({
        identifier: !identifier.trim() ? "Required" : "",
        password: !loginPassword ? "Required" : "",
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
    const errs: FieldErrors = {};
    if (!fullName.trim()) errs.fullName = "Required";
    if (username.trim().length < 3) errs.username = "At least 3 characters";
    if (!EMAIL_RE.test(email)) errs.email = "Enter a valid email";
    if (signupPassword.length < 8) errs.password = "At least 8 characters";

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    const [firstName = "", ...lastNameParts] = fullName.trim().split(" ");
    const lastName = lastNameParts.join(" ") || " ";

    try {
      const user = await signup({
        firstName,
        lastName,
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
    <div className="min-h-screen w-full flex bg-[#F4F7FB] p-0 md:p-6 lg:p-12 overflow-hidden relative">
      {/* Soft background glow */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-400/20 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2 pointer-events-none" />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-6xl mx-auto flex-1 flex flex-col md:flex-row bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] md:rounded-[2.5rem] overflow-hidden relative z-10"
      >

        {/* Left Panel (Premium Blue Branding) */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 md:w-[45%] p-10 lg:p-16 flex flex-col relative overflow-hidden hidden md:flex">

          {/* Animated Background Hexagons */}
          <motion.div
            animate={{ y: [0, -20, 0], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute right-0 top-1/4"
          >
            <svg width="250" height="450" viewBox="0 0 200 400" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 0L150 50L150 150L50 100Z" fill="white" />
              <path d="M100 200L200 250L200 350L100 300Z" fill="white" />
            </svg>
          </motion.div>

          <motion.div
            animate={{ y: [0, 20, 0], opacity: [0.1, 0.15, 0.1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -left-10 bottom-32"
          >
            <svg width="150" height="300" viewBox="0 0 100 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M25 0L75 25L75 75L25 50Z" fill="white" />
            </svg>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-12 backdrop-blur-md z-10 border border-white/20 shadow-lg"
          >
            <Flame className="text-white" size={24} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-white text-4xl lg:text-[3.2rem] font-bold leading-[1.1] z-10 relative tracking-tight"
          >
            One click to go<br />all digital.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-blue-100/80 mt-6 max-w-sm z-10 leading-relaxed"
          >
            Streamline your receipts, organize your expenses, and take control of your financial data effortlessly.
          </motion.p>

          {/* Floating Dashboard Illustration */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8, type: "spring", bounce: 0.4 }}
            className="mt-auto relative z-10 w-full max-w-[400px] mx-auto"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-[24px] shadow-2xl transform -rotate-3 hover:rotate-0 transition-transform duration-500"
            >
              {/* Dashboard Header */}
              <div className="flex gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-400/80 shadow-sm"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400/80 shadow-sm"></div>
                <div className="w-3 h-3 rounded-full bg-green-400/80 shadow-sm"></div>
              </div>
              <div className="h-4 w-32 bg-white/30 rounded-full mb-6"></div>

              {/* Dashboard Content */}
              <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-4">
                  <div className="h-20 bg-blue-400/40 rounded-xl flex items-end p-3 border border-white/10">
                    <svg className="w-full h-10 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                  </div>
                  <div className="h-14 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                    <div className="w-8 h-8 rounded-full bg-green-400/80 border-2 border-white/50 shadow-[0_0_15px_rgba(74,222,128,0.5)]"></div>
                  </div>
                </div>

                <div className="flex-[1.5] bg-[#0A1A2F]/60 rounded-xl p-4 flex items-center border border-white/10 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-100%] animate-[shimmer_3s_infinite]" />
                  <svg className="w-full h-16 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 100 40" preserveAspectRatio="none"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M0 30 Q 25 10, 50 20 T 100 10" className="text-blue-400 drop-shadow-md"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M0 20 Q 25 30, 50 15 T 100 25" className="drop-shadow-md"></path></svg>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Right Panel (Interactive Form) */}
        <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-24 bg-white relative z-20">
          <div className="w-full max-w-[380px] mx-auto">
            {/* Mobile Logo */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="md:hidden w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-blue-500/30"
            >
              <Flame className="text-white" size={24} />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-extrabold text-gray-900 mb-8 tracking-tight"
            >
              {mode === "signup" ? "Create an account" : "Welcome back"}
            </motion.h2>

            <AnimatePresence mode="wait">
              {formError && (
                <motion.div
                  key="form-error"
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-[13px] font-medium border border-red-100 flex items-start gap-3"
                >
                  <div className="bg-red-100 p-1 rounded-full mt-0.5">
                    <svg className="w-3 h-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </div>
                  {formError}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: mode === "signup" ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: mode === "signup" ? -20 : 20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {mode === "signup" ? (
                    <form onSubmit={handleSignup} className="space-y-4">
                      <InputField
                        type="text"
                        placeholder="Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        error={fieldErrors.fullName}
                      />
                      <InputField
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        error={fieldErrors.username}
                      />
                      <InputField
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        error={fieldErrors.email}
                      />
                      <InputField
                        type="password"
                        placeholder="Password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        error={fieldErrors.password}
                      />

                      <motion.p
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                        className="text-[12px] text-gray-500 mt-6 leading-relaxed pr-4"
                      >
                        By continuing, you agree to our{" "}
                        <a href="#" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">Terms of Service</a>
                        {" "}and{" "}
                        <a href="#" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">Privacy Policy</a>
                      </motion.p>

                      <motion.button
                        whileHover={{ scale: 1.01, boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.4)" }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[15px] font-semibold py-3.5 rounded-xl transition-all mt-6 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : "Get Started"}
                      </motion.button>
                    </form>
                  ) : (
                    <form onSubmit={handleLogin} className="space-y-4">
                      <InputField
                        type="text"
                        placeholder="Username or Email"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        error={fieldErrors.identifier}
                      />
                      <InputField
                        type="password"
                        placeholder="Password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        error={fieldErrors.password}
                      />

                      <div className="flex justify-end pt-1">
                        <a href="#" className="text-[13px] text-blue-600 font-medium hover:text-blue-700 transition-colors">
                          Forgot password?
                        </a>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.01, boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.4)" }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[15px] font-semibold py-3.5 rounded-xl transition-all mt-6 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : "Sign In"}
                      </motion.button>
                    </form>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-10 text-center text-[14px] text-gray-600 font-medium"
            >
              {mode === "signup" ? (
                <>
                  Already a member?{" "}
                  <button type="button" onClick={() => switchMode("login")} className="text-blue-600 font-bold hover:text-blue-700 transition-colors ml-1">
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don't have an account?{" "}
                  <button type="button" onClick={() => switchMode("signup")} className="text-blue-600 font-bold hover:text-blue-700 transition-colors ml-1">
                    Sign up
                  </button>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}