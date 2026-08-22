import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import axios from "axios";
import Barberos from "./Barberos";

vi.mock("axios");

const BARBEROS = [
  { _id: "b1", nombre: "Lisandro Alonzo", descripcion: "Barbero", foto: "f1.webp" },
  { _id: "b2", nombre: "Elias Lugo", descripcion: "Barbero", foto: "f2.webp" },
];

describe("Barberos (selector)", () => {
  it("marca cuál está seleccionado de forma accesible", async () => {
    axios.get.mockResolvedValue({ data: BARBEROS });

    render(<Barberos barberoSeleccionado={BARBEROS[1]} onSeleccionar={() => {}} />);

    const opciones = await screen.findAllByRole("radio");
    expect(opciones).toHaveLength(2);
    expect(opciones[0]).toHaveAttribute("aria-checked", "false");
    expect(opciones[1]).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/Seleccionado/)).toBeInTheDocument();
  });

  it("avisa al elegir uno", async () => {
    axios.get.mockResolvedValue({ data: BARBEROS });
    const alSeleccionar = vi.fn();

    render(<Barberos barberoSeleccionado={null} onSeleccionar={alSeleccionar} />);

    await userEvent.click(await screen.findByRole("radio", { name: "Elias Lugo" }));

    expect(alSeleccionar).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "b2" })
    );
  });

  it("se puede elegir con el teclado", async () => {
    axios.get.mockResolvedValue({ data: BARBEROS });
    const alSeleccionar = vi.fn();

    render(<Barberos barberoSeleccionado={null} onSeleccionar={alSeleccionar} />);

    const opcion = await screen.findByRole("radio", { name: "Lisandro Alonzo" });
    opcion.focus();
    await userEvent.keyboard("{Enter}");

    expect(alSeleccionar).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "b1" })
    );
  });

  it("no preselecciona a nadie: ninguna tarjeta arranca marcada", async () => {
    axios.get.mockResolvedValue({ data: BARBEROS });

    render(<Barberos barberoSeleccionado={null} onSeleccionar={() => {}} />);

    const opciones = await screen.findAllByRole("radio");
    opciones.forEach((o) => expect(o).toHaveAttribute("aria-checked", "false"));
    expect(screen.queryByText(/Seleccionado/)).not.toBeInTheDocument();
  });

  it("tampoco preselecciona cuando hay un solo barbero", async () => {
    axios.get.mockResolvedValue({ data: [BARBEROS[0]] });

    render(<Barberos barberoSeleccionado={null} onSeleccionar={() => {}} />);

    const opciones = await screen.findAllByRole("radio");
    expect(opciones).toHaveLength(1);
    expect(opciones[0]).toHaveAttribute("aria-checked", "false");
  });

  it("sin barbero elegido no muestra el call to action de reservar", async () => {
    axios.get.mockResolvedValue({ data: BARBEROS });

    render(<Barberos barberoSeleccionado={null} onSeleccionar={() => {}} />);

    await screen.findAllByRole("radio");
    expect(
      screen.queryByRole("button", { name: /Reservar Turno/i })
    ).not.toBeInTheDocument();
  });

  it("invita a elegir sin advertir sobre precios distintos", async () => {
    axios.get.mockResolvedValue({ data: BARBEROS });

    render(<Barberos barberoSeleccionado={null} onSeleccionar={() => {}} />);

    expect(
      await screen.findByRole("heading", {
        name: /Seleccioná tu barbero preferido/i,
      })
    ).toBeInTheDocument();
    // La bajada ya no explica que cada uno cobra distinto: eso ponía el foco
    // en el precio antes de que el cliente siquiera mirara la oferta.
    expect(
      screen.queryByText(/tiene sus propios horarios y precios/i)
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/elegí con quién querés atenderte/i)
    ).toBeInTheDocument();
  });

  describe("resalte al intentar agendar sin elegir", () => {
    it("con destacar activo, las tarjetas no seleccionadas se resaltan", async () => {
      axios.get.mockResolvedValue({ data: BARBEROS });

      render(
        <Barberos barberoSeleccionado={null} onSeleccionar={() => {}} destacar />
      );

      const opciones = await screen.findAllByRole("radio");
      opciones.forEach((o) =>
        expect(o.className).toContain("barbero-destacado")
      );
    });

    it("sin destacar, no se resalta nada", async () => {
      axios.get.mockResolvedValue({ data: BARBEROS });

      render(<Barberos barberoSeleccionado={null} onSeleccionar={() => {}} />);

      const opciones = await screen.findAllByRole("radio");
      opciones.forEach((o) =>
        expect(o.className).not.toContain("barbero-destacado")
      );
    });

    it("el ya seleccionado no se resalta", async () => {
      axios.get.mockResolvedValue({ data: BARBEROS });

      render(
        <Barberos
          barberoSeleccionado={BARBEROS[0]}
          onSeleccionar={() => {}}
          destacar
        />
      );

      const opciones = await screen.findAllByRole("radio");
      expect(opciones[0].className).not.toContain("barbero-destacado");
      expect(opciones[1].className).toContain("barbero-destacado");
    });
  });
});
