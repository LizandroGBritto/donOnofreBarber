import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as cliente from "../../datos/clienteLanding";
import PasoBarbero from "./PasoBarbero";

vi.mock("../../datos/clienteLanding", () => ({
  listarServiciosDeBarbero: vi.fn(),
  urlDeArchivo: (nombre) => (nombre ? `/uploads/${nombre}` : null),
}));

const BARBEROS = [
  { _id: "b1", nombre: "Lisandro Alonzo", descripcion: "Fades y diseños", logo: "logo.png" },
  { _id: "b2", nombre: "Elias" },
];
const peticion = (extra) => ({ datos: null, cargando: false, error: null, recargar: vi.fn(), ...extra });
const pintar = (barberos, props = {}) =>
  render(<PasoBarbero barberos={barberos} barberoId={null} onElegir={vi.fn()} onVolverArriba={vi.fn()} {...props} />);

beforeEach(() => {
  cliente.listarServiciosDeBarbero.mockImplementation((id) =>
    id === "b1"
      ? Promise.resolve([{ precio: 70000 }, { precio: 50000 }])
      : Promise.reject(new Error("500"))
  );
});

describe("PasoBarbero", () => {
  it("muestra esqueletos mientras carga", () => {
    pintar(peticion({ cargando: true }));
    expect(screen.getByText("Cargando barberos…")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("si falla la carga avisa y permite reintentar", async () => {
    const barberos = peticion({ error: new Error("500") });
    pintar(barberos);
    expect(screen.getByText("Atención")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(barberos.recargar).toHaveBeenCalled();
  });

  it("sin barberos activos lo dice", () => {
    pintar(peticion({ datos: [] }));
    expect(screen.getByText(/no hay barberos disponibles/)).toBeInTheDocument();
  });

  it("muestra el precio más bajo y no el 'Libre…' de la demo", async () => {
    pintar(peticion({ datos: BARBEROS }));
    expect(await screen.findByText("Desde Gs. 50.000")).toBeInTheDocument();
    expect(screen.queryByText(/Libre/i)).not.toBeInTheDocument();
  });

  it("si no se pudo saber el precio de un barbero no inventa uno", async () => {
    pintar(peticion({ datos: BARBEROS }));
    await screen.findByText("Desde Gs. 50.000");
    expect(screen.getAllByText(/^Desde/)).toHaveLength(1);
  });

  it("marca el elegido y avisa la elección", async () => {
    const onElegir = vi.fn();
    pintar(peticion({ datos: BARBEROS }), { barberoId: "b2", onElegir });
    expect(screen.getByRole("radio", { name: /Elias/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Lisandro/ })).toHaveAttribute("aria-checked", "false");
    await userEvent.click(screen.getByRole("radio", { name: /Lisandro/ }));
    expect(onElegir).toHaveBeenCalledWith("b1");
  });
});
