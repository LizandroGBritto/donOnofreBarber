import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import MisPrecios from "./MisPrecios";

vi.mock("axios");

// MisPrecios usa axios directo, pero importa el modal de fotos, que usa
// useApi. Con `axios` automockeado, `axios.create()` devuelve undefined y el
// módulo real de useApi explota al engancharle el interceptor. Se lo mockea
// para cortar esa cadena: acá solo se prueba que el modal abra.
vi.mock("../../hooks/useApi", () => ({
  useApi: () => ({ barberos: {} }),
}));

const PRECIOS = [
  {
    servicioId: "s1",
    nombre: "Corte",
    precioGlobal: 50000,
    precio: 70000,
    personalizado: true,
    activo: true,
  },
  {
    servicioId: "s2",
    nombre: "Ceja",
    precioGlobal: 20000,
    precio: 20000,
    personalizado: false,
    activo: true,
  },
];

beforeEach(() => {
  axios.get.mockResolvedValue({ data: { precios: PRECIOS } });
  axios.put.mockResolvedValue({ data: { precios: PRECIOS } });
});

describe("MisPrecios", () => {
  it("pide los precios del barbero logueado", async () => {
    render(<MisPrecios barberoId="b1" />);

    await screen.findByText("Corte");
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining("/api/barberos/b1/precios"),
      expect.objectContaining({ withCredentials: true })
    );
  });

  it("distingue el precio propio del precio del local", async () => {
    render(<MisPrecios barberoId="b1" />);

    await screen.findByText("Corte");
    // El no personalizado se marca como tal. Match exacto y sensible a
    // mayúsculas para no chocar con el encabezado "Precio del local".
    expect(screen.getByText("precio del local")).toBeInTheDocument();
    // Y el personalizado no lleva ese badge.
    expect(screen.getAllByText("precio del local")).toHaveLength(1);
  });

  it("guarda contra el endpoint del propio barbero", async () => {
    render(<MisPrecios barberoId="b1" />);

    await screen.findByText("Corte");
    await userEvent.click(
      screen.getByRole("button", { name: /guardar cambios/i })
    );

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    const [url, payload] = axios.put.mock.calls[0];
    expect(url).toContain("/api/barberos/b1/precios");
    expect(payload).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ servicioId: "s1", precio: 70000 }),
      ])
    );
  });

  it("no ofrece revertir al precio del local", async () => {
    render(<MisPrecios barberoId="b1" />);

    await screen.findByText("Corte");
    expect(
      screen.queryByRole("button", { name: /volver al del local/i })
    ).not.toBeInTheDocument();
  });

  describe("fotos propias por servicio", () => {
    it("indica cuándo se usan las del local y cuándo las propias", async () => {
      axios.get.mockResolvedValue({
        data: {
          precios: [
            { ...PRECIOS[0], imagenes: ["mia.webp"], imagenesLocal: [] },
            { ...PRECIOS[1], imagenes: [], imagenesLocal: ["local.webp"] },
          ],
        },
      });

      render(<MisPrecios barberoId="b1" />);

      await screen.findByText("Corte");
      expect(
        screen.getByRole("button", { name: "1 propia" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /usar las del local/i })
      ).toBeInTheDocument();
    });

    it("pluraliza bien la cantidad de fotos propias", async () => {
      axios.get.mockResolvedValue({
        data: {
          precios: [
            { ...PRECIOS[0], imagenes: ["a.webp", "b.webp"], imagenesLocal: [] },
          ],
        },
      });

      render(<MisPrecios barberoId="b1" />);

      expect(
        await screen.findByRole("button", { name: "2 propias" })
      ).toBeInTheDocument();
    });

    it("abre el modal de fotos del servicio elegido", async () => {
      axios.get.mockResolvedValue({
        data: {
          precios: [{ ...PRECIOS[0], imagenes: [], imagenesLocal: [] }],
        },
      });

      render(<MisPrecios barberoId="b1" />);

      await screen.findByText("Corte");
      await userEvent.click(
        screen.getByRole("button", { name: /usar las del local/i })
      );

      expect(await screen.findByText("Fotos de Corte")).toBeInTheDocument();
    });
  });

  describe("vista del admin sobre otro barbero", () => {
    it("titula con el nombre del barbero, no 'Mis Precios'", async () => {
      render(<MisPrecios barberoId="b2" nombreBarbero="Elias Lugo" />);

      expect(
        await screen.findByRole("heading", { name: /Precios de Elias Lugo/i })
      ).toBeInTheDocument();
      expect(screen.queryByText("Mis Precios")).not.toBeInTheDocument();
    });

    it("habla en tercera persona", async () => {
      render(<MisPrecios barberoId="b2" nombreBarbero="Elias Lugo" />);

      await screen.findByText("Corte");
      expect(screen.getByText("Su precio")).toBeInTheDocument();
      expect(screen.getByText("Lo ofrece")).toBeInTheDocument();
      expect(screen.queryByText("Mi precio")).not.toBeInTheDocument();
    });

    it("guarda contra el barbero que está viendo, no contra el logueado", async () => {
      render(<MisPrecios barberoId="b2" nombreBarbero="Elias Lugo" />);

      await screen.findByText("Corte");
      await userEvent.click(
        screen.getByRole("button", { name: /guardar precios/i })
      );

      await waitFor(() => expect(axios.put).toHaveBeenCalled());
      expect(axios.put.mock.calls[0][0]).toContain("/api/barberos/b2/precios");
    });
  });

  it("avisa si el usuario no tiene barbero asignado", () => {
    render(<MisPrecios barberoId={null} />);

    expect(screen.getByText(/no tiene un barbero asignado/i)).toBeInTheDocument();
    expect(axios.get).not.toHaveBeenCalled();
  });
});
