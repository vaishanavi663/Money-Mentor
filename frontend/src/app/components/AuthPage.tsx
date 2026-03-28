import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { api, type AuthResponse, type UserPlan } from "../lib/api";
import { MotionBackground } from "./MotionBackground";

type AuthMode = "login" | "register";

interface AuthPageProps {
  mode: AuthMode;
  /** Saved on register only; ignored for login. */
  signupPlan?: UserPlan;
  onBackToLanding: () => void;
  onAuthSuccess: (payload: AuthResponse, source: AuthMode) => void | Promise<void>;
}

interface RegisterFormState {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface LoginFormState {
  email: string;
  password: string;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function AuthPage({ mode, signupPlan = "free", onBackToLanding, onAuthSuccess }: AuthPageProps) {
  const [activeMode, setActiveMode] = useState<AuthMode>(mode);
  const [registerData, setRegisterData] = useState<RegisterFormState>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loginData, setLoginData] = useState<LoginFormState>({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = useMemo(
    () => (activeMode === "register" ? "Create your account" : "Welcome back"),
    [activeMode],
  );

  const subtitle = useMemo(
    () =>
      activeMode === "register"
        ? "Start managing your money smarter with Money Mentor."
        : "Log in to continue tracking your finances.",
    [activeMode],
  );

  const validateRegister = () => {
    if (!registerData.fullName.trim()) return "Full name is required";
    if (registerData.fullName.trim().length < 2) return "Full name must be at least 2 characters";
    if (!registerData.email.trim()) return "Email is required";
    if (!isValidEmail(registerData.email.trim())) return "Please enter a valid email";
    if (registerData.password.length < 8) return "Password must be at least 8 characters";
    if (registerData.password !== registerData.confirmPassword) return "Passwords do not match";
    return "";
  };

  const validateLogin = () => {
    if (!loginData.email.trim()) return "Email is required";
    if (!isValidEmail(loginData.email.trim())) return "Please enter a valid email";
    if (!loginData.password) return "Password is required";
    return "";
  };

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateRegister();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      const response = await api.register({
        fullName: registerData.fullName.trim(),
        email: registerData.email.trim(),
        password: registerData.password,
        plan: signupPlan,
      });
      await onAuthSuccess(response, "register");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateLogin();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      const response = await api.login({
        email: loginData.email.trim(),
        password: loginData.password,
      });
      await onAuthSuccess(response, "login");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <MotionBackground />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-10">
        <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-lg">
          <button
            type="button"
            onClick={onBackToLanding}
            className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to landing page
          </button>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
            {activeMode === "register" && signupPlan === "pro" && (
              <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                You are signing up for <span className="font-semibold">Pro</span> (₹99/mo) — no payment step for this
                demo; your account will be created as Pro.
              </p>
            )}
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => {
                setError("");
                setActiveMode("login");
              }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeMode === "login" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setError("");
                setActiveMode("register");
              }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeMode === "register" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {activeMode === "register" ? (
            <form className="space-y-4" onSubmit={handleRegisterSubmit}>
              <input
                type="text"
                placeholder="Full Name"
                value={registerData.fullName}
                onChange={(event) =>
                  setRegisterData((previous) => ({ ...previous, fullName: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-colors focus:border-green-500"
              />
              <input
                type="email"
                placeholder="Email"
                value={registerData.email}
                onChange={(event) =>
                  setRegisterData((previous) => ({ ...previous, email: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-colors focus:border-green-500"
              />
              <input
                type="password"
                placeholder="Password"
                value={registerData.password}
                onChange={(event) =>
                  setRegisterData((previous) => ({ ...previous, password: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-colors focus:border-green-500"
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={registerData.confirmPassword}
                onChange={(event) =>
                  setRegisterData((previous) => ({
                    ...previous,
                    confirmPassword: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-colors focus:border-green-500"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-gradient-to-r from-green-600 to-green-500 px-4 py-3 font-medium text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Creating account..." : "Create account"}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <input
                type="email"
                placeholder="Email"
                value={loginData.email}
                onChange={(event) =>
                  setLoginData((previous) => ({ ...previous, email: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-colors focus:border-green-500"
              />
              <input
                type="password"
                placeholder="Password"
                value={loginData.password}
                onChange={(event) =>
                  setLoginData((previous) => ({ ...previous, password: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-colors focus:border-green-500"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-green-600 px-4 py-3 font-medium text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Logging in..." : "Log in"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
