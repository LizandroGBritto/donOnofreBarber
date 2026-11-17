import { render, screen } from "@testing-library/react";
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
    // El atajo "Próximo horario libre" se quitó el 2026-11-17: no se veía bien en todos los teléfonos.
    expect(screen.queryByText(/Próximo horario libre/)).not.toBeInTheDocument();
    expect(await screen.findByRole("radio", { name: /Lisandro/ })).toBeInTheDocument();
  });


  it("sin horarios, ubicación ni contacto cargados no muestra bloques vacíos", async () => {
    pintar();
    await screen.findByRole("radio", { name: /Lisandro/ });
    expect(screen.queryByRole("heading", { name: "Horarios" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ubicación" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Contacto" })).not.toBeInTheDocument();
  });

});
