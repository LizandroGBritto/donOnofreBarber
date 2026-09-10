import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState, useEffect, useContext } from "react";
import UserContext from "../../context/UserContext";
import { itemsParaRol, vistaInicialParaRol } from "./navItems";

/**
 * El panel real (AdminDashboard) tiene ~3400 líneas y monta media docena de
 * secciones, así que montarlo entero en jsdom prueba más el andamiaje que la
 * regla. Acá se reproduce sólo la lógica de identidad que se le agregó, que es
 * donde estaba el bug.
 *
 * Bug original: el rol salía de `localStorage["user"]`, el snapshot del último
 * login. A un barbero cuyo rol se asignó después le seguía apareciendo el menú
 * de admin, clickeaba secciones y el servidor las rechazaba con 403 — se veía
 * como "el barbero no puede editar sus servicios". Y encima ese dato lo puede
 * editar cualquiera desde el navegador.
 */
const PanelDePrueba = ({ api }) => {
  const { user, setUser } = useContext(UserContext);
  const [identidad, setIdentidad] = useState(null);

  useEffect(() => {
    let cancelado = false;
    api.users
      .me()
      .then((actual) => {
        if (cancelado) return;
        setIdentidad(actual);
        setUser((previo) => ({ ...previo, ...actual }));
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [api, setUser]);

  const efectivo = identidad || user;
  const rol = efectivo?.rol === "barbero" ? "barbero" : "admin";

  return (
    <div>
      <span data-testid="rol">{rol}</span>
      <span data-testid="barbero">{efectivo?.barbero || "sin-barbero"}</span>
      <span data-testid="vista-inicial">{vistaInicialParaRol(rol)}</span>
      <ul>
        {itemsParaRol(rol).map((i) => (
          <li key={i.id}>{i.label}</li>
        ))}
      </ul>
    </div>
  );
};

const renderConUsuario = (usuarioGuardado, api) => {
  const Wrapper = () => {
    const [user, setUser] = useState(usuarioGuardado);
    return (
      <UserContext.Provider value={{ user, setUser }}>
        <PanelDePrueba api={api} />
      </UserContext.Provider>
    );
  };
  return render(<Wrapper />);
};

let api;

beforeEach(() => {
  api = { users: { me: vi.fn() } };
});

describe("identidad del panel", () => {
  it("corrige el rol viejo del navegador con el del servidor", async () => {
    // localStorage dice que es admin (login anterior a la migración: sin rol).
    const guardado = { _id: "u1", userName: "LisandroAlonzo" };
    api.users.me.mockResolvedValue({
      _id: "u1",
      userName: "LisandroAlonzo",
      rol: "barbero",
      barbero: "b1",
    });

    renderConUsuario(guardado, api);

    // Antes de responder el servidor cae en admin (no hay dato mejor)...
    expect(screen.getByTestId("rol")).toHaveTextContent("admin");

    // ...y al responder queda como barbero.
    await waitFor(() =>
      expect(screen.getByTestId("rol")).toHaveTextContent("barbero")
    );
    expect(screen.getByTestId("barbero")).toHaveTextContent("b1");
  });

  it("con el rol corregido, el menú pasa a ser el del barbero", async () => {
    api.users.me.mockResolvedValue({ rol: "barbero", barbero: "b1" });

    renderConUsuario({ _id: "u1", userName: "x" }, api);

    await waitFor(() =>
      expect(screen.getByText("Mis Precios")).toBeInTheDocument()
    );
    expect(screen.getByText("Mis Horarios")).toBeInTheDocument();
    // Y desaparecen las secciones que el servidor le va a rechazar igual.
    expect(screen.queryByText("Usuarios")).not.toBeInTheDocument();
    expect(screen.queryByText("Barberos")).not.toBeInTheDocument();
  });

  it("un localStorage manipulado a admin no sobrevive al servidor", async () => {
    // Alguien editó localStorage para ver el menú completo.
    const manipulado = { _id: "u1", userName: "colado", rol: "admin" };
    api.users.me.mockResolvedValue({ rol: "barbero", barbero: "b1" });

    renderConUsuario(manipulado, api);

    await waitFor(() =>
      expect(screen.getByTestId("rol")).toHaveTextContent("barbero")
    );
    expect(screen.queryByText("Usuarios")).not.toBeInTheDocument();
  });

  it("un admin de verdad conserva el menú completo", async () => {
    api.users.me.mockResolvedValue({ rol: "admin", barbero: null });

    renderConUsuario({ _id: "u1", userName: "admin", rol: "admin" }, api);

    await waitFor(() =>
      expect(screen.getByText("Usuarios")).toBeInTheDocument()
    );
    expect(screen.getByText("Barberos")).toBeInTheDocument();
    expect(screen.queryByText("Mis Precios")).not.toBeInTheDocument();
  });

  it("si el servidor no responde, se sigue con lo guardado", async () => {
    api.users.me.mockRejectedValue(new Error("network"));

    renderConUsuario({ _id: "u1", userName: "admin", rol: "admin" }, api);

    await waitFor(() => expect(api.users.me).toHaveBeenCalled());
    // No se rompe ni deja al usuario sin panel.
    expect(screen.getByTestId("rol")).toHaveTextContent("admin");
  });

  it("la vista inicial corresponde al rol real", async () => {
    api.users.me.mockResolvedValue({ rol: "barbero", barbero: "b1" });

    renderConUsuario({ _id: "u1", userName: "x" }, api);

    await waitFor(() =>
      expect(screen.getByTestId("rol")).toHaveTextContent("barbero")
    );
    const inicial = screen.getByTestId("vista-inicial").textContent;
    expect(itemsParaRol("barbero").map((i) => i.id)).toContain(inicial);
  });
});
