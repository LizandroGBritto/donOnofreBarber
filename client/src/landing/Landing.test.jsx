import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import ParaguayDateUtil from "../utils/paraguayDate";
import * as cliente from "./datos/clienteLanding";
import Landing from "./Landing";

vi.mock("./datos/clienteLanding", () => ({
  listarBarberos: vi.fn(),
  listarServiciosDeBarbero: vi.fn(),
  listarTurnosDeBarbero: vi.fn(),
  listarHorariosDelLocal: vi.fn(),
  obtenerContacto: vi.fn(),
  obtenerUbicacion: vi.fn(),
  verificarTurnoAbierto: vi.fn(),
  reservarTurno: vi.fn(),
  invalidarTurnos: vi.fn(),
  // Copia del feed de Instagram vigente y vacía: la sección no carga el widget.
  obtenerFeedInstagram: vi.fn(() => Promise.resolve({ vigente: true, publicaciones: [] })),
  renovarFeedInstagram: vi.fn(() => Promise.resolve()),
  urlDeArchivo: (nombre) => (nombre ? `/uploads/${nombre}` : null),
}));
// three.js y Leaflet no corren en jsdom.
vi.mock("./componentes/encabezado/poste3d", () => ({
  hexARgb: () => [0, 0, 0],
  montarPoste: () => Promise.resolve({ setGirando: () => {}, empujar: () => {}, destruir: () => {} }),
}));
vi.mock("./componentes/info/MapaOscuro", () => ({ default: () => <div data-testid="mapa" /> }));

// Mañana a las 10:00 y a las 11:00 (la agenda real es relativa a "ahora").
const MANANA = ParaguayDateUtil.now().add(1, "day").startOf("day").toISOString();

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  HTMLCanvasElement.prototype.getContext = () => null;
});

beforeEach(() => {
  cliente.listarBarberos.mockResolvedValue([
    { _id: "b1", nombre: "Lisandro Alonzo" },
    { _id: "b2", nombre: "Elias Benítez" },
  ]);
  cliente.listarServiciosDeBarbero.mockResolvedValue([{ _id: "s1", nombre: "Corte", precio: 50000 }]);
  cliente.listarTurnosDeBarbero.mockImplementation((id) =>
    Promise.resolve(
      id === "b2"
        ? [{ _id: "t-elias", fecha: MANANA, hora: "10:00", estado: "disponible" }]
        : [{ _id: "t-lisandro", fecha: MANANA, hora: "11:00", estado: "disponible" }]
    )
  );
  cliente.listarHorariosDelLocal.mockResolvedValue([]);
  cliente.obtenerContacto.mockResolvedValue(null);
  cliente.obtenerUbicacion.mockResolvedValue(null);
});

const pintar = () =>
  render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>
  );

describe("Landing", () => {
  it("usa el banner fijo de la demo: mascota, neón y llamado a reservar", async () => {
    pintar();
    expect(screen.getByRole("heading", { level: 1, name: "Creando tu estilo" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Mascota de Alonzo Style/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reservar turno" })).toHaveAttribute("href", "#reservar");
    await screen.findByText(/Próximo horario libre/);
  });

  it("'Tomarlo' arma la reserva con el turno más cercano de cualquier barbero", async () => {
    const usuario = userEvent.setup();
    pintar();

    const proximo = await screen.findByText(/Próximo horario libre/);
    expect(within(proximo).getByText(/a las 10:00 con Elias/)).toBeInTheDocument();
    await usuario.click(within(proximo).getByRole("button", { name: "Tomarlo" }));

    // Queda en servicios con Elias elegido; al elegir uno y seguir, el turno ya está marcado.
    await usuario.click(await screen.findByRole("checkbox", { name: /Corte/ }));
    await usuario.click(screen.getByRole("button", { name: "Continuar" }));
    expect(await screen.findByRole("button", { name: "10:00" })).toHaveAttribute("aria-pressed", "true");
  });

  it("sin horarios, ubicación ni contacto cargados no muestra bloques vacíos", async () => {
    pintar();
    await screen.findByText(/Próximo horario libre/);
    expect(screen.queryByRole("heading", { name: "Horarios" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ubicación" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Contacto" })).not.toBeInTheDocument();
  });

  it("si la agenda falla, el escenario no muestra el atajo pero la reserva sigue disponible", async () => {
    cliente.listarTurnosDeBarbero.mockRejectedValue(new Error("500"));
    pintar();
    expect(await screen.findByRole("radio", { name: /Lisandro/ })).toBeInTheDocument();
    expect(screen.queryByText(/Próximo horario libre/)).not.toBeInTheDocument();
  });
});
