import "./App.css";
import Landing from "./views/Landing";
import { Route, Routes, Navigate } from "react-router-dom";
import UserContext from "./context/UserContext";
import { useState } from "react";
import Admin from "./views/Admin";
import Login from "./views/Login";
import backgroundImage from "./assets/assets_template/AlonzoStylev2.png";

const App = () => {
  const userDetails = JSON.parse(localStorage.getItem("user"));
  const [user, setUser] = useState(userDetails || null);

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
    <div
      className="min-h-screen bg-fixed bg-cover bg-center backdrop-blur-md bg-opacity-60"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
      }}
    >
      <UserContext.Provider value={objetContext}>
        <Routes>
          <Route path="/" element={<Landing />} />
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
      </UserContext.Provider>
    </div>
  );
};

export default App;
