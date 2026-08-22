import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import MisHorarios from "./MisHorarios";

vi.mock("axios");

const HORARIOS_LOCAL = {
  usaHorariosPropios: false,
  horarios: [
    { _id: "h1", hora: "09:00", dias: ["lunes"] },
    { _id: "h2", hora: "10:00", dias: ["lunes"] },
  ],
};

const HORARIOS_PROPIOS = {
  usaHorariosPropios: true,
  horarios: [{ _id: "p1", hora: "14:00", dias: ["martes", "jueves"] }],
};

beforeEach(() => {
  axios.post.mockResolvedValue({ data: {} });
  axios.patch.mockResolvedValue({ data: {} });
  axios.delete.mockResolvedValue({ data: {} });
});

describe("MisHorarios", () => {
  it("usando los del local, ofrece personalizar", async () => {
    axios.get.mockResolvedValue({ data: HORARIOS_LOCAL });

    render(<MisHorarios barberoId="b1" />);

    expect(
      await screen.findByText(/Estás usando los horarios del local/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /personalizar mis horarios/i })
    ).toBeInTheDocument();
    // No hay ABM todavía.
    expect(
      screen.queryByRole("button", { name: /nueva hora/i })
    ).not.toBeInTheDocument();
  });

  it("personalizar llama al clonado de los globales", async () => {
    axios.get.mockResolvedValue({ data: HORARIOS_LOCAL });

    render(<MisHorarios barberoId="b1" />);

    await userEvent.click(
      await screen.findByRole("button", { name: /personalizar mis horarios/i })
    );

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post.mock.calls[0][0]).toContain(
      "/api/barberos/b1/horarios/clonar-globales"
    );
  });

  it("con horarios propios muestra el ABM", async () => {
    axios.get.mockResolvedValue({ data: HORARIOS_PROPIOS });

    render(<MisHorarios barberoId="b1" />);

    expect(await screen.findByText("14:00")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /nueva hora/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /volver a los del local/i })
    ).toBeInTheDocument();
  });

  it("volver a los del local usa el endpoint correcto", async () => {
    axios.get.mockResolvedValue({ data: HORARIOS_PROPIOS });

    render(<MisHorarios barberoId="b1" />);

    await userEvent.click(
      await screen.findByRole("button", { name: /volver a los del local/i })
    );

    await waitFor(() => expect(axios.patch).toHaveBeenCalled());
    expect(axios.patch.mock.calls[0][0]).toContain(
      "/api/barberos/b1/horarios/usar-globales"
    );
  });

  it("avisa si no tiene ninguna hora cargada", async () => {
    axios.get.mockResolvedValue({
      data: { usaHorariosPropios: true, horarios: [] },
    });

    render(<MisHorarios barberoId="b1" />);

    expect(
      await screen.findByText(/no se generarán turnos para vos/i)
    ).toBeInTheDocument();
  });

  it("avisa si el usuario no tiene barbero asignado", () => {
    render(<MisHorarios barberoId={null} />);

    expect(screen.getByText(/no tiene un barbero asignado/i)).toBeInTheDocument();
  });
});
