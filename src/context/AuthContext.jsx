import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, setToken, clearToken, isLoggedOut } from "../services/apiClient";
import { getCartScopeId, switchCartScope } from "../store/cartStore";

const AuthContext = createContext();

const USER_KEY = "authUser";

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUserState] = useState(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  // Rastrea de qué cuenta es el carrito actualmente cargado, para
  // rehidratarlo solo cuando cambia el usuario real (no en updates
  // como el toggle de beta tester, que reutiliza el mismo id).
  const cartScopeRef = useRef(getCartScopeId(user));

  const setUser = (data) => {
    const nextScope = getCartScopeId(data);
    const scopeChanged = nextScope !== cartScopeRef.current;

    setUserState(data);
    if (data) {
      localStorage.setItem(USER_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(USER_KEY);
    }

    if (scopeChanged) {
      cartScopeRef.current = nextScope;
      switchCartScope();
    }
  };

  const clearUser = () => setUser(null);

  useEffect(() => {
    // Tras un login OAuth2 (Google/Meta), el backend redirige acá con el JWT
    // (o un error) en la query string — se captura una sola vez y se limpia
    // de la URL para que no quede expuesto ni se reenvíe en un refresh o al
    // compartir el link.
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    const oauthError = params.get("error");

    if (urlToken || oauthError) {
      params.delete("token");
      params.delete("error");
      const cleanSearch = params.toString();
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (cleanSearch ? `?${cleanSearch}` : "") + window.location.hash
      );
    }

    if (oauthError) {
      navigate("/login", { replace: true, state: { oauthError: true } });
      return;
    }

    if (urlToken) {
      setToken(urlToken);
      import("../features/auth/services/authService")
        .then(({ fetchCurrentUser }) => fetchCurrentUser())
        .then((me) => {
          if (me) {
            setUser(me);
          } else {
            // Token inválido o vencido: no queda nada útil que persistir.
            clearToken();
            navigate("/login", { replace: true, state: { oauthError: true } });
          }
        });
      return;
    }

    if (user || getToken() || isLoggedOut()) return;

    const oauthPending = sessionStorage.getItem("oauthPending");

    // Flujo anterior basado en cookie de sesión OAuth2 (fallback si el
    // backend todavía no redirige con ?token= para algún proveedor).
    if (!oauthPending) return;

    import("../features/auth/services/authService")
      .then(({ checkOAuthSession, fetchCurrentUser }) =>
        checkOAuthSession().then(async (data) => {
          if (data) {
            const me = await fetchCurrentUser();
            setUser({ name: data.name, email: data.email, provider: data.provider, ...me });
          }
        })
      )
      .catch(() => {
        // Caso normal: no hay sesión OAuth2 activa.
      })
      .finally(() => {
        sessionStorage.removeItem("oauthPending");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, clearUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
