import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLingui } from "@lingui/react";
import Button from "../../../components/common/Button";
import FormInput from "../../../components/common/FormInput";
import { login, fetchCurrentUser } from "../services/authService";
import { API_BASE_URL, clearLoggedOutMark } from "../../../services/apiClient";
import { useAuth } from "../../../context/AuthContext";
import { translateErrorMessage } from "../../../utils/errorMessages";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const { setUser } = useAuth();
  const { i18n } = useLingui();
  const t = (id, message) => i18n._({ id, message });

  useEffect(() => {
    if (location.state?.oauthError) {
      setServerError(t("login.oauthError", "No se pudo iniciar sesión con Google/Meta. Intentá de nuevo."));
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      const me = await fetchCurrentUser();
      setUser({ username: username.trim(), ...me });
      navigate(location.state?.from ?? "/", { replace: true });
    } catch (err) {
      setServerError(translateErrorMessage(err, t("errors.generic", "Ocurrió un error"), i18n));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuthLogin = (provider) => {
    sessionStorage.setItem("oauthPending", "1");
    clearLoggedOutMark();
    window.location.href = `${API_BASE_URL}/oauth2/authorization/${provider}`;
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-bg px-5 py-10 min-[2560px]:px-12 min-[2560px]:py-16 min-[3840px]:px-20 min-[3840px]:py-24 transition-colors duration-400">
      <div className="w-full max-w-[23.75rem] min-[2560px]:max-w-[42rem] min-[3840px]:max-w-[56rem] flex flex-col items-center text-center">
        <div
          onClick={() => navigate("/")}
          title={t("auth.backToHome", "Volver al inicio")}
          className="cursor-pointer"
        >
          <img
            width={120}
            height={120}
            src="https://res.cloudinary.com/w1jl4sa5/image/upload/v1784825556/Logo_of_The_Sims_4.svg_jagzsl.webp"
            alt="Logo"
            className="w-[7.5rem] h-[7.5rem] min-[2560px]:w-[11rem] min-[2560px]:h-[11rem] min-[3840px]:w-[14rem] min-[3840px]:h-[14rem] object-contain"
          />
        </div>

        <h1 className="font-nunito text-2xl min-[2560px]:text-5xl min-[3840px]:text-7xl font-extrabold text-text mb-7 min-[2560px]:mb-12 transition-colors duration-400">
          {t("login.title", "Iniciar sesión")}
        </h1>

        <form className="w-full flex flex-col text-left" onSubmit={handleSubmit}>
          <FormInput
            id="login-email"
            label={t("login.username", "Usuario")}
            placeholder={t("login.usernamePlaceholder", "Ingresá tu usuario")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
          />

          <FormInput
            id="login-password"
            label={t("login.password", "Contraseña")}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />

          <div className="flex items-center w-full mb-6 text-text opacity-60 text-[0.8125rem] before:content-[''] before:flex-1 before:h-[0.0625rem] before:bg-snd-bg after:content-[''] after:flex-1 after:h-[0.0625rem] after:bg-snd-bg">
            <span className="px-3">{t("login.or", "o")}</span>
          </div>

          <div className="flex gap-3 w-full mb-6">
            <Button variant="oauth" onClick={() => handleOAuthLogin("google")}>
              Google
            </Button>
            <Button variant="oauth" onClick={() => handleOAuthLogin("meta")}>
              Meta
            </Button>
          </div>

          <label className="flex items-center gap-2 text-sm text-text mb-5 cursor-pointer transition-colors duration-400">
            <input
              type="checkbox"
              className="accent-main w-4 h-4 cursor-pointer"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            {t("login.remember", "Recordarme")}
          </label>

          {serverError ? (
            <p className="text-error text-sm text-center mb-4">{serverError}</p>
          ) : null}

          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? t("login.loading", "Ingresando...") : t("login.button", "Ingresar")}
          </Button>
        </form>

        <Button variant="link" onClick={() => navigate("/forgot-password")}>
          {t("login.forgot", "¿Olvidaste tu contraseña?")}
        </Button>

        <Button variant="outline" onClick={() => navigate("/register")}>
          {t("login.register", "Crear cuenta")}
        </Button>
      </div>
    </main>
  );
}

export default LoginPage;
