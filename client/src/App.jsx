import "./App.css";
import Landing from "./views/Landing";
import { Route, Routes, Navigate } from "react-router-dom";
import UserContext from "./context/UserContext";
import { useState, lazy, Suspense } from "react";
import EditarTurno from "./components/EditarTurno";
import ErrorBoundary from "./components/ErrorBoundary";

// El público general nunca visita /admin: separarlo en su propio chunk
// evita que ese código (y sus dependencias) se descargue en la landing.
const Admin = lazy(() => import("./views/Admin"));
const Login = lazy(() => import("./views/Login"));

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch (error) {
    console.error("No se pudo leer el usuario guardado:", error);
    return null;
  }
};

const App = () => {
  const [user, setUser] = useState(getStoredUser());

  const setUserKeyValue = (clave, valor) => {
    setUser({
      ...user,
      [clave]: valor,
    });
  };

  const objetContext = {
    user,
    setUser,
    setUserKeyValue,
  };

  return (
    <div>
      <ErrorBoundary>
        <UserContext.Provider value={objetContext}>
          <Suspense fallback={<div>Cargando...</div>}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route
                path="/editar-turno/:turnoId"
                element={<EditarTurno />}
              />
              <Route
                path="/admin"
                element={user ? <Navigate to="/admin/panel" /> : <Login />}
              />
              <Route
                path="/admin/panel"
                element={
                  user ? (
                    <Admin user={user} setUser={setUser} />
                  ) : (
                    <Navigate to="/admin" />
                  )
                }
              />
            </Routes>
          </Suspense>
        </UserContext.Provider>
      </ErrorBoundary>
    </div>
  );
};

export default App;
