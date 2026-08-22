import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import FormReservarTurno from "./FormReservarTurno";

vi.mock("axios");
vi.mock("sweetalert2", () => ({
  default: { fire: vi.fn().mockResolvedValue({}) },
}));

const BARBERO = { _id: "b1", nombre: "Lisandro Alonzo" };
const TURNO = {
  _id: "t1",
  fecha: "2026-09-15T03:00:00.000Z",
  hora: "10:00",
  diaSemana: "martes",
};

const SERVICIOS = [
  { _id: "s1", nombre: "Corte", precio: 50000 },
  { _id: "s2", nombre: "Barba", precio: 30000 },
];

beforeEach(() => {
  axios.get.mockImplementation((url) => {
    if (url.includes("/servicios")) return Promise.resolve({ data: SERVICIOS });
    // verificar-turno
    return Promise.resolve({ data: { tieneTurno: false } });
  });
  axios.post.mockResolvedValue({
    data: { turno: { _id: "t1", costoTotal: 50000, editToken: "tok" } },
  });
});

const renderForm = () =>
  render(
    <FormReservarTurno
      turno={TURNO}
      barbero={BARBERO}
      onCloseModal={vi.fn()}
      refreshData={vi.fn().mockResolvedValue()}
    />
  );

describe("FormReservarTurno", () => {
  it("ya no pide elegir barbero: viene dado", async () => {
    renderForm();

    await screen.findByText("Corte");
    expect(screen.queryByText(/Seleccionar Barbero/i)).not.toBeInTheDocument();
    // Y muestra con quién es la cita.
    expect(screen.getByText("Lisandro Alonzo")).toBeInTheDocument();
  });

  it("pide los servicios del barbero, no el catálogo global", async () => {
    renderForm();

    await screen.findByText("Corte");
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining("/api/barberos/b1/servicios")
    );
    expect(axios.get).not.toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/servicios$/)
    );
  });

  it("envía solo servicioIds, nunca precios", async () => {
    renderForm();

    await screen.findByText("Corte");

    await userEvent.type(screen.getByPlaceholderText(/nombre completo/i), "Juan Perez");
    await userEvent.type(screen.getByPlaceholderText("09XXXXXXXX"), "0981123456");
    await userEvent.click(screen.getAllByRole("checkbox")[0]);
    await userEvent.click(screen.getByRole("button", { name: /confirmar reserva/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());

    const [, payload] = axios.post.mock.calls[0];
    expect(payload.servicioIds).toEqual(["s1"]);
    expect(payload.barberoId).toBe("b1");
    // Esto es lo que cierra el agujero de manipulación de precios.
    expect(payload).not.toHaveProperty("servicios");
    expect(JSON.stringify(payload)).not.toContain("precio");
  });

  it("muestra el total mientras se eligen servicios", async () => {
    renderForm();

    await screen.findByText("Corte");
    await userEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(await screen.findByText(/Total: ₲50[.,]000/)).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("checkbox")[1]);
    expect(await screen.findByText(/Total: ₲80[.,]000/)).toBeInTheDocument();
  });

  it("no deja enviar sin servicios", async () => {
    renderForm();

    await screen.findByText("Corte");
    expect(
      screen.getByRole("button", { name: /confirmar reserva/i })
    ).toBeDisabled();
  });

  it("si falla la carga de servicios ofrece reintentar, sin inventar precios", async () => {
    axios.get.mockRejectedValue(new Error("network"));

    renderForm();

    expect(
      await screen.findByText(/No se pudieron cargar los servicios/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
  });
});
