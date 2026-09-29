import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import Servicios from "./Servicios";

vi.mock("axios");

const LISANDRO = { _id: "b1", nombre: "Lisandro Alonzo" };
const ELIAS = { _id: "b2", nombre: "Elias Lugo" };

// Cada barbero devuelve su propio catálogo ya resuelto por el servidor.
const catalogoPorBarbero = {
  b1: [{ _id: "s1", nombre: "Corte", precio: 50000, imagenes: [] }],
  b2: [{ _id: "s1", nombre: "Corte", precio: 80000, imagenes: [] }],
};

const mockearCatalogos = () => {
  axios.get.mockImplementation((url) => {
    const id = url.match(/barberos\/([^/]+)\/servicios/)?.[1];
    return Promise.resolve({ data: catalogoPorBarbero[id] ?? [] });
  });
};

describe("Servicios", () => {
  it("sin barbero muestra el catálogo completo del local, pero SIN precios", async () => {
    axios.get.mockResolvedValue({
      data: [
        { _id: "s1", nombre: "Corte", precio: 50000, imagenes: [] },
        { _id: "s2", nombre: "Ceja", precio: 20000, imagenes: [] },
      ],
    });

    render(<Servicios barbero={null} />);

    // La oferta se ve...
    expect(
      await screen.findByRole("heading", { name: "Corte" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ceja" })).toBeInTheDocument();

    // ...pero ningún número, porque depende de qué barbero elija.
    expect(screen.queryByText(/50[.,]000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/20[.,]000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Gs\./)).not.toBeInTheDocument();

    // Y pide el catálogo global, no el de un barbero.
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/servicios$/)
    );
  });

  it("sin barbero, el botón que queda es el de reservar", async () => {
    axios.get.mockResolvedValue({
      data: [{ _id: "s1", nombre: "Corte", precio: 50000, imagenes: [] }],
    });

    render(<Servicios barbero={null} />);

    await screen.findByRole("heading", { name: "Corte" });
    expect(
      screen.queryByRole("button", { name: /ver precio/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /reservar turno/i }).length
    ).toBeGreaterThan(0);
  });

  it("pide el catálogo del barbero seleccionado, no el global", async () => {
    mockearCatalogos();

    render(<Servicios barbero={LISANDRO} />);

    expect(
      await screen.findByRole("heading", { name: /Servicios de Lisandro/i })
    ).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining("/api/barberos/b1/servicios")
    );
  });

  it("al cambiar de barbero muestra el precio del nuevo", async () => {
    mockearCatalogos();

    const { rerender } = render(<Servicios barbero={LISANDRO} />);
    expect(await screen.findByText(/50[.,]000/)).toBeInTheDocument();

    rerender(<Servicios barbero={ELIAS} />);

    // Este es el corazón del sprint: el mismo servicio, otro precio.
    expect(await screen.findByText(/80[.,]000/)).toBeInTheDocument();
    expect(screen.queryByText(/50[.,]000/)).not.toBeInTheDocument();
  });

  it("avisa cuando la API falla, sin inventar precios", async () => {
    axios.get.mockRejectedValue(new Error("network down"));

    render(<Servicios barbero={LISANDRO} />);

    expect(
      await screen.findByText(/Error al cargar los servicios/i)
    ).toBeInTheDocument();
  });

  // Regresión: un servicio guardado sin el campo `imagenes` llegaba como
  // undefined y el carrusel explotaba en `[imagenes.length]`, un array de
  // dependencias que corre ANTES del guard de "sin imágenes". Tumbaba la
  // landing entera hasta el ErrorBoundary.
  describe("servicios sin el campo imagenes", () => {
    it("no rompe cuando imagenes viene undefined", async () => {
      axios.get.mockResolvedValue({
        data: [{ _id: "s1", nombre: "Corte Infantil", precio: 12000 }],
      });

      render(<Servicios barbero={LISANDRO} />);

      expect(
        await screen.findByRole("heading", { name: "Corte Infantil" })
      ).toBeInTheDocument();
    });

    it("usa el nombre como placeholder, igual que con imagenes vacías", async () => {
      axios.get.mockResolvedValue({
        data: [
          { _id: "s1", nombre: "Sin Campo", precio: 1000 },
          { _id: "s2", nombre: "Array Vacio", precio: 2000, imagenes: [] },
        ],
      });

      render(<Servicios barbero={LISANDRO} />);

      await screen.findByRole("heading", { name: "Sin Campo" });
      // El placeholder del carrusel repite el nombre: dos apariciones por
      // servicio (placeholder + título) en ambos casos.
      expect(screen.getAllByText("Sin Campo")).toHaveLength(2);
      expect(screen.getAllByText("Array Vacio")).toHaveLength(2);
    });

    it("tampoco rompe si imagenes viene null", async () => {
      axios.get.mockResolvedValue({
        data: [{ _id: "s1", nombre: "Con Null", precio: 1000, imagenes: null }],
      });

      render(<Servicios barbero={LISANDRO} />);

      expect(
        await screen.findByRole("heading", { name: "Con Null" })
      ).toBeInTheDocument();
    });
  });

  describe("tocar la tarjeta para ver la foto completa", () => {
    const DOS_SERVICIOS = [
      { _id: "s1", nombre: "Corte más asesoramiento", precio: 70000, imagenes: ["a.webp"] },
      { _id: "s2", nombre: "Combo corte más barba", precio: 100000, imagenes: ["b.webp"] },
    ];

    /** El panel de info de una tarjeta, por el título que contiene. */
    const panelDe = (nombre) =>
      screen.getByText(nombre).closest("[aria-hidden]");

    beforeEach(() => {
      axios.get.mockResolvedValue({ data: DOS_SERVICIOS });
    });

    it("arranca con la información visible", async () => {
      render(<Servicios barbero={LISANDRO} />);

      await screen.findByText("Corte más asesoramiento");
      expect(panelDe("Corte más asesoramiento")).toHaveAttribute(
        "aria-hidden",
        "false"
      );
    });

    it("al tocar la tarjeta se oculta el texto y su fondo", async () => {
      render(<Servicios barbero={LISANDRO} />);

      const titulo = await screen.findByText("Corte más asesoramiento");
      await userEvent.click(titulo.closest(".aspect-\\[9\\/16\\]"));

      const panel = panelDe("Corte más asesoramiento");
      expect(panel).toHaveAttribute("aria-hidden", "true");
      expect(panel.className).toContain("opacity-0");
      // Y deja de recibir toques, para no tapar la foto.
      expect(panel.className).toContain("pointer-events-none");
    });

    it("al tocarla de nuevo vuelve a la normalidad", async () => {
      render(<Servicios barbero={LISANDRO} />);

      const titulo = await screen.findByText("Corte más asesoramiento");
      const tarjeta = titulo.closest(".aspect-\\[9\\/16\\]");

      await userEvent.click(tarjeta);
      await userEvent.click(tarjeta);

      expect(panelDe("Corte más asesoramiento")).toHaveAttribute(
        "aria-hidden",
        "false"
      );
    });

    it("al tocar otra tarjeta, la primera vuelve a la normalidad", async () => {
      render(<Servicios barbero={LISANDRO} />);

      const primera = (
        await screen.findByText("Corte más asesoramiento")
      ).closest(".aspect-\\[9\\/16\\]");
      const segunda = screen
        .getByText("Combo corte más barba")
        .closest(".aspect-\\[9\\/16\\]");

      await userEvent.click(primera);
      await userEvent.click(segunda);

      // Solo una destapada a la vez.
      expect(panelDe("Corte más asesoramiento")).toHaveAttribute(
        "aria-hidden",
        "false"
      );
      expect(panelDe("Combo corte más barba")).toHaveAttribute(
        "aria-hidden",
        "true"
      );
    });

    it("al tocar fuera vuelve a la normalidad", async () => {
      render(<Servicios barbero={LISANDRO} />);

      const tarjeta = (
        await screen.findByText("Corte más asesoramiento")
      ).closest(".aspect-\\[9\\/16\\]");

      await userEvent.click(tarjeta);
      expect(panelDe("Corte más asesoramiento")).toHaveAttribute(
        "aria-hidden",
        "true"
      );

      await userEvent.click(document.body);

      expect(panelDe("Corte más asesoramiento")).toHaveAttribute(
        "aria-hidden",
        "false"
      );
    });

    it("reservar no destapa la tarjeta", async () => {
      render(<Servicios barbero={LISANDRO} />);

      await screen.findByText("Corte más asesoramiento");
      await userEvent.click(
        screen.getAllByRole("button", { name: /reservar turno/i })[0]
      );

      // El click en el botón no debe propagarse a la tarjeta.
      expect(panelDe("Corte más asesoramiento")).toHaveAttribute(
        "aria-hidden",
        "false"
      );
    });

    it("cambiar de barbero resetea el destapado", async () => {
      const { rerender } = render(<Servicios barbero={LISANDRO} />);

      const tarjeta = (
        await screen.findByText("Corte más asesoramiento")
      ).closest(".aspect-\\[9\\/16\\]");
      await userEvent.click(tarjeta);

      rerender(<Servicios barbero={ELIAS} />);

      await waitFor(() =>
        expect(panelDe("Corte más asesoramiento")).toHaveAttribute(
          "aria-hidden",
          "false"
        )
      );
    });
  });

  it("muestra el vacío si el barbero no ofrece ningún servicio", async () => {
    axios.get.mockResolvedValue({ data: [] });

    render(<Servicios barbero={ELIAS} />);

    expect(
      await screen.findByText(/todavía no tiene servicios/i)
    ).toBeInTheDocument();
  });

  it("con barbero SÍ muestra el precio", async () => {
    mockearCatalogos();

    render(<Servicios barbero={LISANDRO} />);

    expect(await screen.findByText(/Gs\..*50[.,]000/)).toBeInTheDocument();
  });
});
