import { IoLogoWhatsapp } from "react-icons/io";
import { RiRobot2Fill } from "react-icons/ri";
import { FaPencilRuler, FaArrowRight } from "react-icons/fa";
import { MdTableChart } from "react-icons/md";
import { FaRegCircleCheck } from "react-icons/fa6";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { supabase } from "../utils/supabase";

type AuthMode = "login" | "signup";

// Any text that looks like raw JSON/an object dump rather than a human sentence.
// This is what protects the UI from ever showing "{}" or similar.
function looksLikeRawObjectDump(text: string): boolean {
    const trimmed = text.trim();
    return (
        trimmed === "{}" ||
        trimmed === "[object Object]" ||
        (trimmed.startsWith("{") && trimmed.endsWith("}"))
    );
}

function getErrorMessage(error: unknown): string {
    // Always log the raw shape so the real root cause is visible in devtools.
    console.error("[auth] raw error:", error);

    let candidate: string | undefined;
    let status: unknown;

    if (typeof error === "string") {
        candidate = error;
    } else if (error instanceof Error) {
        candidate = error.message;
    } else if (error && typeof error === "object") {
        const e = error as Record<string, unknown>;
        candidate =
            (e.message as string) ??
            (e.error_description as string) ??
            (e.details as string) ??
            (e.msg as string); // some Supabase error shapes use `msg` instead of `message`
        status = e.status ?? e.code;
    }

    if (status === 429) {
        return "Too many attempts — please wait a moment and try again.";
    }

    if (candidate && !looksLikeRawObjectDump(candidate)) {
        return candidate;
    }

    // Either no usable message was found, or the SDK handed back a raw
    // object dump (empty response body, dual-package `instanceof` mismatch,
    // misconfigured Supabase URL/key, etc). Never show that to the user.
    return "We couldn't complete that request. Please check your details and try again.";
}

function validate(fields: Record<string, string>, mode: AuthMode) {
  const errors: Record<string, string> = {};

    if (mode === "signup" && !fields.name?.trim()) {
        errors.name = "Full name is required";
    }

  if (!fields.email?.trim())
    errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))
    errors.email = "Enter a valid email address";

    if (!fields.password?.trim()) {
        errors.password = "Password is required";
    } else if (mode === "signup" && fields.password.length < 8) {
        errors.password = "Password must be at least 8 characters";
    }

    if (mode === "signup" && fields.confirm !== fields.password) {
        errors.confirm = "Passwords do not match";
    }

  return errors;
}

const features = [
  { icon: IoLogoWhatsapp, text: "Send receipts via WhatsApp" },
  { icon: RiRobot2Fill, text: "AI extracts data instantly" },
  { icon: FaPencilRuler,  text: "Review & correct in one click" },
  { icon: MdTableChart, text: "Export to Excel or CSV" },
];

export default function AuthPage({ onAuth }: { onAuth: () => void }){
    const [mode, setMode] = useState<AuthMode>("login");
    const [fields, setFields] = useState({ name:"", email:"", password:"", confirm:"" });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [showPw,  setShowPw]  = useState(false);
    const [showCf,  setShowCf]  = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [shake,   setShake]   = useState(false);
    const [verifying, setVerifying] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return !!params.get("token_hash");
    });
    const [authError, setAuthError] = useState<string | null>(null);
    const [authSuccess, setAuthSuccess] = useState(false);
    const [claims, setClaims] = useState<Record<string, unknown> | null>(null);

    const setField = (key: string, val: string) => {
        const next = { ...fields, [key]: val };
        setFields(next);
        if (touched[key]) {
        const e = validate(next, mode);
        setErrors(prev => ({ ...prev, [key]: e[key] ?? "" }));
        }
    };

    const blur = (key: string) => {
        setTouched(prev => ({ ...prev, [key]: true }));
        const e = validate(fields, mode);
        setErrors(prev => ({ ...prev, [key]: e[key] ?? "" }));
    };

    const switchMode = (m: AuthMode) => {
        setMode(m);
        setFields({ name:"", email:"", password:"", confirm:"" });
        setErrors({});
        setTouched({});
        setShowPw(false);
        setShowCf(false);
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token_hash = params.get("token_hash");
        const type = params.get("type");

        if (token_hash) {
            supabase.auth
                .verifyOtp({
                    token_hash,
                    type: type || "signup",
                })
                .then(({ error }) => {
                    if (error) {
                        const message = getErrorMessage(error);
                        setAuthError(message);
                        setErrors(prev => ({ ...prev, email: message }));
                    } else {
                        setAuthSuccess(true);
                        setSuccess(true);
                        window.history.replaceState({}, document.title, "/");
                    }
                    setVerifying(false);
                });
        }

        supabase.auth.getClaims().then(({ data }) => {
            setClaims(data?.claims ?? null);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(() => {
            supabase.auth.getClaims().then(({ data }) => {
                setClaims(data?.claims ?? null);
            });
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (claims) {
            onAuth();
        }
    }, [claims, onAuth]);

    useEffect(() => {
        if (!authError) {
            return;
        }

        setShake(true);
        const timeoutId = window.setTimeout(() => setShake(false), 600);
        return () => window.clearTimeout(timeoutId);
    }, [authError]);

    const fieldClass = (key: string) =>
    `w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border transition-all focus:outline-none focus:ring-2 ${
      errors[key] && touched[key]
        ? "border-red-400 focus:ring-red-100 bg-red-50"
        : "border-gray-200 focus:ring-green-100 focus:border-green-400 bg-white"
    }`;


    const submit = () => {
        const allTouched = Object.fromEntries(
            (mode === "signup" ? ["name", "email", "password", "confirm"] : ["email", "password"]).map(k => [k, true])
        );
        setTouched(allTouched);
        const e = validate(fields, mode);
        setErrors(e);
        if (Object.values(e).some(Boolean)) {
            setShake(true);
            setTimeout(() => setShake(false), 600);
            return;
        }

        setLoading(true);
        setAuthError(null);

        const authAction = mode === "login"
            ? supabase.auth.signInWithPassword({
                email: fields.email,
                password: fields.password,
            })
            : supabase.auth.signUp({
                email: fields.email,
                password: fields.password,
                options: {
                    emailRedirectTo: `${window.location.origin}/pages/auth`,
                    data: {
                        full_name: fields.name,
                    },
                },
            });

        authAction.then((result) => {
            const { error } = result;

            if (error) {
                const message = getErrorMessage(error);
                setAuthError(message);
                setErrors(prev => ({ ...prev, email: message }));
                setLoading(false);
                return;
            }

            // Supabase quirk: signing up with an email that already has an
            // account resolves *without* an error, but `identities` comes
            // back empty (to avoid leaking which emails are registered).
            if (
                mode === "signup" &&
                "data" in result &&
                result.data?.user &&
                result.data.user.identities?.length === 0
            ) {
                const message = "An account with this email already exists. Try signing in instead.";
                setAuthError(message);
                setErrors(prev => ({ ...prev, email: message }));
                setLoading(false);
                return;
            }

            setSuccess(true);
            setLoading(false);
        }).catch((err) => {
            console.error("[auth] unexpected rejection:", err);
            setAuthError("An unexpected error occurred. Please try again.");
            setLoading(false);
        });
    };
    
    return (
        <div className="min-h-screen flex overflow-hidden bg-sea">
            <motion.div
                className="hidden lg:flex lg:w-[46%] relative flex-col justify-between p-12 overflow-hidden bg-serpent"
                initial={{ x: -60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10 bg-serpent" />
                <div className="absolute -bottom-32 -right-32 w-120 h-120 rounded-full opacity-10 bg-saffaron" />
                <div className="absolute top-1/2 -translate-y-1/2 -right-20 w-64 h-64 rounded-full opacity-5 bg-castleton" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-16">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-castleton">
                            {/* Change to actual icon */}
                            <div className="w-6 h-6 bg-white" />
                        </div>
                        <div>
                            <p className="text-base font-bold text-white leading-tight">Receipt AI</p>
                            <p className="text-xs" style={{ color: "rgba(245,238,219,0.4)" }}>by Lifewood</p>
                        </div>
                    </div>

                    <h1 className="text-4xl font-bold text-white leading-tight mb-4">
                        Your receipts,<br />
                        <span className="text-saffron">organised instantly.</span>
                    </h1>
                    <p className="text-base leading-relaxed" style={{ color: "rgba(245,238,219,0.6)" }}>
                        Send receipt photos on WhatsApp. Our AI extracts, categorises, and stores everything — ready to review and export.
                    </p>
                </div>

                <div className="relative z-10 space-y-4">
                {features.map((f, i) => {
                    const Icon = f.icon;

                    return (
                        <motion.div
                            key={i}
                            className="flex items-center gap-3"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                        >
                            <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                                style={{ backgroundColor: "rgba(255,255,255,0.07)" }}
                            >
                                <Icon />
                            </div>

                            <span
                                className="text-sm"
                                style={{ color: "rgba(245,238,219,0.75)" }}
                            >
                                {f.text}
                            </span>
                        </motion.div>
                    );
                })}
                </div>

                {/* Bottom tagline */}
                <p className="relative z-10 text-xs" style={{ color: "rgba(245,238,219,0.25)" }}>
                    © 2026 Lifewood. All rights reserved.
                </p>
            </motion.div>

            <motion.div
                className="flex-1 flex items-center justify-center p-8"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
                <div className="w-full max-w-md">
                    <div className="flex items-center gap-2.5 mb-8 lg:hidden">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-castleton">
                        {/* Change to actual icon */}
                            <div className="w-6 h-6 bg-white" />
                        </div>
                        <p className="text-sm font-bold bg-castleton">Receipt AI</p>
                    </div>

                    <div className="flex p-1 rounded-xl mb-8 border border-gray-100 bg-sea">
                        {(["login","signup"] as AuthMode[]).map(m => (
                        <button 
                            key={m} 
                            onClick={() => switchMode(m)}
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all relative ${
                                mode === m ? "bg-castleton" : "text-gray-400"
                            }`}
                        >
                            {mode === m && (
                                <motion.div layoutId="tab-pill"
                                    className="absolute inset-0 rounded-lg shadow-sm"
                                    style={{ backgroundColor: "white" }}
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10 capitalize">{m === "login" ? "Sign In" : "Create Account"}</span>
                        </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div key={mode}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                        >
                            <h2 className="text-2xl font-bold mb-1 text-serpent">
                                {mode === "login" ? "Welcome back" : "Get started free"}
                            </h2>
                            <p className="text-sm text-gray-400 mb-7">
                                {mode === "login"
                                ? "Sign in to your Receipt AI account"
                                : "Create your account in under a minute"}
                            </p>
                        </motion.div>
                    </AnimatePresence>

                    <AnimatePresence>
                        {success && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex flex-col items-center justify-center py-10 gap-4"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                            >
                                <FaRegCircleCheck className="text-4xl text-castleton" />
                            </motion.div>
                            <p className="text-lg font-bold bg-serpent" >
                                {mode === "login" ? "Signed in!" : "Account created!"}
                            </p>
                            <p className="text-sm text-gray-400">Taking you to your dashboard…</p>
                        </motion.div>
                        )}
                    </AnimatePresence>

                    {!success && (
                        <motion.form
                            key={mode + "-form"}
                            animate={shake ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
                            transition={{ duration: 0.5 }}
                            onSubmit={e => { e.preventDefault(); submit(); }}
                            className="space-y-4"
                        >
                            <AnimatePresence initial={false}>
                                {mode === "signup" && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.28 }}
                                    style={{ overflow: "hidden" }}
                                >
                                    <div className="pb-0.5">
                                    <label className="text-xs font-semibold text-gray-500 block mb-1.5 uppercase tracking-wide">
                                        Full Name
                                    </label>
                                    <div className="relative">
                                        <FiUser size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                                        <input 
                                            value={fields.name} 
                                            onChange={e => setField("name", e.target.value)}
                                            onBlur={() => blur("name")} 
                                            placeholder="Nathaniel Lawas"
                                            className={`${fieldClass("name")} bg-serpent`}
                                        />
                                    </div>
                                    {errors.name && touched.name && (
                                        <motion.p 
                                            initial={{opacity:0,y:-4}} 
                                            animate={{opacity:1,y:0}}
                                            className="text-xs text-red-500 mt-1"
                                        >
                                            {errors.name}
                                        </motion.p>
                                    )}
                                    </div>
                                </motion.div>
                                )}
                            </AnimatePresence>

                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1.5 uppercase tracking-wide">
                                Email Address
                            </label>
                            <div className="relative">
                                <FiMail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                                <input 
                                    value={fields.email} 
                                    onChange={e => setField("email", e.target.value)}
                                    onBlur={() => blur("email")} type="email" placeholder="you@company.com"
                                    className={`${fieldClass("email")} bg-serpent`}
                                />
                            </div>
                            {errors.email && touched.email && (
                            <motion.p initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}}
                                className="text-xs text-red-500 mt-1">{errors.email}</motion.p>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1.5 uppercase tracking-wide">
                                Password
                            </label>
                            <div className="relative">
                                <FiLock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                                <input value={fields.password} onChange={e => setField("password", e.target.value)}
                                    onBlur={() => blur("password")} type={showPw ? "text" : "password"}
                                    placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"}
                                    className={`${fieldClass("password")} pr-10 bg-serpent`}
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowPw(!showPw)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showPw ? <FiEyeOff size={15}/> : <FiEye size={15}/>}
                                </button>
                            </div>
                            {errors.password && touched.password && (
                            <motion.p initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}}
                                className="text-xs text-red-500 mt-1">{errors.password}</motion.p>
                            )}
                        </div>

                        <AnimatePresence initial={false}>
                            {mode === "signup" && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.28 }}
                                style={{ overflow: "hidden" }}
                            >
                                <div className="pb-0.5">
                                <label className="text-xs font-semibold text-gray-500 block mb-1.5 uppercase tracking-wide">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <FiLock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                                    <input 
                                        value={fields.confirm} 
                                        onChange={e => setField("confirm", e.target.value)}
                                        onBlur={() => blur("confirm")} 
                                        type={showCf ? "text" : "password"}
                                        placeholder="Repeat password"
                                        className={`${fieldClass("confirm")} pr-10 bg-serpent`}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowCf(!showCf)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showCf ? <FiEyeOff size={15}/> : <FiEye size={15}/>}
                                    </button>
                                </div>
                                {errors.confirm && touched.confirm && (
                                    <motion.p initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}}
                                    className="text-xs text-red-500 mt-1">{errors.confirm}</motion.p>
                                )}
                                </div>
                            </motion.div>
                            )}
                        </AnimatePresence>

                        {mode === "login" && (
                            <div className="flex justify-end">
                            <button 
                                type="button" 
                                className="text-xs font-semibold hover:underline text-castleton"
                            >
                                Forgot password?
                            </button>
                            </div>
                        )}

                        <button 
                            type="submit"
                            className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all mt-2 disabled:opacity-70 bg-castleton"
                            disabled={loading || verifying || authSuccess}
                        >
                            {loading ? (
                            <motion.div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                                animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}/>
                            ) : success ? (
                            <><FaRegCircleCheck size={16}/> Done</>
                            ) : (
                            <>{mode === "login" ? "Sign In" : "Create Account"}<FaArrowRight size={16}/></>
                            )}
                        </button>

                        {mode === "signup" && (
                            <p className="text-xs text-gray-400 text-center">
                                By creating an account you agree to our{" "}
                            <span className="underline cursor-pointer text-castleton">Terms</span>{" "}
                                and{" "}
                            <span className="underline cursor-pointer text-castleton">Privacy Policy</span>.
                            </p>
                        )}
                        </motion.form>
                    )}
                </div>
            </motion.div>
        </div>
    );
}