import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import FotosServicioBarbero from "./FotosServicioBarbero";

const subir = vi.fn();
const quitar = vi.fn();

vi.mock("../../hooks/useApi", () => ({
  useApi: () => ({
    barberos: {
      subirImagenesServicio: (...args) => subir(...args),
      quitarImagenServicio: (...args) => quitar(...args),
    },
  }),
}));

const SERVICIO_SIN_PROPIAS = {
  servicioId: "s1",
  nombre: "Corte",
  imagenes: [],
  imagenesLocal: ["local-1.webp", "local-2.webp"],
};

const SERVICIO_CON_PROPIAS = {
  servicioId: "s1",
  nombre: "Corte",
  imagenes: ["mia-1.webp"],
  imagenesLocal: ["local-1.webp"],
};

const archivoFalso = (nombre = "corte.png") =>
  new File(["x"], nombre, { type: "image/png" });

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:falso");
  URL.revokeObjectURL = vi.fn();
  subir.mockReset().mockResolvedValue({});
  quitar.mockReset().mockResolvedValue({});
});

const renderModal = (servicio, props = {}) =>
  render(
    <FotosServicioBarbero
      barberoId="b1"
      servicio={servicio}
      onCerrar={vi.fn()}
      onCambio={vi.fn().mockResolvedValue()}
      {...props}
    />
  );

describe("FotosServicioBarbero", () => {
  describe("qué fotos están en uso", () => {
    it("sin fotos propias, avisa que se usan las del local", () => {
      renderModal(SERVICIO_SIN_PROPIAS);

      expect(
        screen.getByText(/ahora se muestran las fotos del local/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/todavía no subiste ninguna/i)).toBeInTheDocument();
    });

    it("con fotos propias, avisa que esas reemplazan a las del local", () => {
      renderModal(SERVICIO_CON_PROPIAS);

      expect(
        screen.getByText(/se están mostrando tus fotos/i)
      ).toBeInTheDocument();
    });

    it("muestra atenuadas las del local cuando hay propias", () => {
      renderModal(SERVICIO_CON_PROPIAS);

      const local = screen.getByAltText("Foto del local");
      expect(local.className).toContain("opacity-40");
    });

    it("no atenúa las del local cuando son las que se usan", () => {
      renderModal(SERVICIO_SIN_PROPIAS);

      const locales = screen.getAllByAltText("Foto del local");
      locales.forEach((img) => expect(img.className).not.toContain("opacity-40"));
    });
  });

  describe("subida", () => {
    it("manda las fotos al endpoint del barbero y del servicio", async () => {
      renderModal(SERVICIO_SIN_PROPIAS);

      const input = screen.getByLabelText(/agregar fotos/i);
      await userEvent.upload(input, archivoFalso());
      await userEvent.click(screen.getByRole("button", { name: /subir/i }));

      await waitFor(() => expect(subir).toHaveBeenCalled());
      const [barberoId, servicioId, formData] = subir.mock.calls[0];
      expect(barberoId).toBe("b1");
      expect(servicioId).toBe("s1");
      expect(formData).toBeInstanceOf(FormData);
      expect(formData.getAll("imagenes")).toHaveLength(1);
    });

    it("avisa al contenedor para que refresque", async () => {
      const alCambiar = vi.fn().mockResolvedValue();
      renderModal(SERVICIO_SIN_PROPIAS, { onCambio: alCambiar });

      await userEvent.upload(
        screen.getByLabelText(/agregar fotos/i),
        archivoFalso()
      );
      await userEvent.click(screen.getByRole("button", { name: /subir/i }));

      await waitFor(() => expect(alCambiar).toHaveBeenCalled());
    });

    it("no deja subir sin haber elegido nada", () => {
      renderModal(SERVICIO_SIN_PROPIAS);

      expect(screen.getByRole("button", { name: /subir/i })).toBeDisabled();
    });

    it("muestra la vista previa de lo elegido antes de subir", async () => {
      renderModal(SERVICIO_SIN_PROPIAS);

      await userEvent.upload(
        screen.getByLabelText(/agregar fotos/i),
        archivoFalso()
      );

      expect(await screen.findByAltText("Nueva foto 1")).toBeInTheDocument();
    });

    it("informa el error del servidor en vez de fallar en silencio", async () => {
      subir.mockRejectedValue({
        response: { data: { message: "El servicio no existe" } },
      });
      renderModal(SERVICIO_SIN_PROPIAS);

      await userEvent.upload(
        screen.getByLabelText(/agregar fotos/i),
        archivoFalso()
      );
      await userEvent.click(screen.getByRole("button", { name: /subir/i }));

      expect(
        await screen.findByText("El servicio no existe")
      ).toBeInTheDocument();
    });
  });

  describe("límite de fotos", () => {
    it("bloquea el input al llegar al máximo", () => {
      renderModal({
        ...SERVICIO_CON_PROPIAS,
        imagenes: ["1.webp", "2.webp", "3.webp", "4.webp", "5.webp"],
      });

      expect(screen.getByLabelText(/agregar fotos/i)).toBeDisabled();
      expect(screen.getByText(/llegaste al máximo/i)).toBeInTheDocument();
    });

    it("informa cuántas más se pueden subir", () => {
      renderModal(SERVICIO_CON_PROPIAS); // ya tiene 1 de 5

      expect(screen.getByText(/podés subir 4 más/i)).toBeInTheDocument();
    });
  });

  describe("borrado", () => {
    it("quita una foto propia por nombre", async () => {
      const alCambiar = vi.fn().mockResolvedValue();
      renderModal(SERVICIO_CON_PROPIAS, { onCambio: alCambiar });

      await userEvent.click(
        screen.getByRole("button", { name: /quitar foto/i })
      );

      await waitFor(() => expect(quitar).toHaveBeenCalled());
      expect(quitar).toHaveBeenCalledWith("b1", "s1", "mia-1.webp");
      expect(alCambiar).toHaveBeenCalled();
    });

    it("no ofrece quitar las fotos del local", () => {
      renderModal(SERVICIO_SIN_PROPIAS);

      expect(
        screen.queryByRole("button", { name: /quitar foto/i })
      ).not.toBeInTheDocument();
    });
  });
});
