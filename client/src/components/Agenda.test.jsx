import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import Agenda from "./Agenda";

vi.mock("axios");

const BARBERO = { _id: "b1", nombre: "Lisandro Alonzo" };

// Un turno futuro y disponible, para que el botón AGENDAR quede habilitado.
const enDosDias = new Date(Date.now() + 48 * 60 * 60 * 1000);
const TURNOS = [
  {
    _id: "t1",
    fecha: enDosDias.toISOString(),
    hora: "23:30",
    diaSemana: "lunes",
    estado: "disponible",
  },
];

const HORARIOS_SEMANAS = {
  diasActivos: ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"],
  semanas: [{ numero: 1, inicioSemana: "2026-08-24", finSemana: "2026-08-30", label: "S1" }],
  horariosActivos: [{ hora: "23:30", dias: ["lunes"] }],
};

beforeEach(() => {
  axios.get.mockImplementation((url) => {
    if (url.includes("horarios-semanas")) {
      return Promise.resolve({ data: HORARIOS_SEMANAS });
    }
    // Servicios del barbero: los pide FormReservarTurno al abrirse.
    if (url.includes("/servicios")) {
      return Promise.resolve({
        data: [{ _id: "s1", nombre: "Corte", precio: 50000 }],
      });
    }
    if (url.includes("verificar-turno")) {
      return Promise.resolve({ data: { tieneTurno: false } });
    }
    return Promise.resolve({ data: { agendas: TURNOS } });
  });
});

const renderAgenda = (props = {}) =>
  render(
    <MemoryRouter>
      <Agenda horarios={TURNOS} setHorarios={vi.fn()} {...props} />
    </MemoryRouter>
  );

describe("Agenda sin barbero elegido", () => {
  it("muestra igual la grilla de horarios, no una pantalla vacía", async () => {
    renderAgenda({ barbero: null, onElegirBarbero: vi.fn() });

    expect(await screen.findByText("23:30")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /AGENDAR/i })
    ).toBeInTheDocument();
  });

  it("pide los horarios de TODOS (sin barberoId) para armar la grilla", async () => {
    renderAgenda({ barbero: null, onElegirBarbero: vi.fn() });

    await screen.findByText("23:30");

    const llamada = axios.get.mock.calls.find(([url]) =>
      url.includes("horarios-semanas")
    );
    expect(llamada[1]?.params).toEqual({});
  });

  it("al tocar AGENDAR pide elegir barbero en vez de abrir la reserva", async () => {
    renderAgenda({ barbero: null, onElegirBarbero: vi.fn() });

    await userEvent.click(
      await screen.findByRole("button", { name: /AGENDAR/i })
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Te olvidaste de algo/i)).toBeInTheDocument();
    expect(
      screen.getByText(/debés elegir con quién cortarte/i)
    ).toBeInTheDocument();
    // No se abrió el formulario de reserva.
    expect(
      screen.queryByText(/Confirmar Reserva/i)
    ).not.toBeInTheDocument();
  });

  it("el aviso no menciona precios", async () => {
    renderAgenda({ barbero: null, onElegirBarbero: vi.fn() });

    await userEvent.click(
      await screen.findByRole("button", { name: /AGENDAR/i })
    );

    const modal = await screen.findByRole("dialog");
    expect(modal.textContent).not.toMatch(/precio/i);
  });

  it('"Seleccionar barbero" cierra el modal y avisa al contenedor', async () => {
    const alElegir = vi.fn();
    renderAgenda({ barbero: null, onElegirBarbero: alElegir });

    await userEvent.click(
      await screen.findByRole("button", { name: /AGENDAR/i })
    );
    await userEvent.click(
      screen.getByRole("button", { name: /seleccionar barbero/i })
    );

    expect(alElegir).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });

  it("se puede cancelar sin elegir nada", async () => {
    const alElegir = vi.fn();
    renderAgenda({ barbero: null, onElegirBarbero: alElegir });

    await userEvent.click(
      await screen.findByRole("button", { name: /AGENDAR/i })
    );
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(alElegir).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });
});

describe("Agenda con barbero elegido", () => {
  it("filtra los turnos por barbero", async () => {
    renderAgenda({ barbero: BARBERO, onElegirBarbero: vi.fn() });

    await screen.findByText("23:30");

    const llamada = axios.get.mock.calls.find(([url]) =>
      url.includes("/api/agenda/landing")
    );
    expect(llamada[1].params.barberoId).toBe("b1");
  });

  it("al tocar AGENDAR abre la reserva, no el aviso", async () => {
    renderAgenda({ barbero: BARBERO, onElegirBarbero: vi.fn() });

    await userEvent.click(
      await screen.findByRole("button", { name: /AGENDAR/i })
    );

    expect(
      screen.queryByText(/Te olvidaste de algo/i)
    ).not.toBeInTheDocument();
    expect(
      await screen.findByText(/Confirmar Reserva/i)
    ).toBeInTheDocument();
  });
});
