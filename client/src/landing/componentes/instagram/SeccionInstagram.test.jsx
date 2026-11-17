import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as cliente from "../../datos/clienteLanding";
import SeccionInstagram from "./SeccionInstagram";
import { ESPERA_POR_WIDGET_MS, QUIETUD_ANTES_DE_GUARDAR_MS } from "./useFeedInstagram";

vi.mock("../../datos/clienteLanding", () => ({
  obtenerFeedInstagram: vi.fn(),
  renovarFeedInstagram: vi.fn(),
}));

const CONTACTO = { instagram: "@alonzo_style" };
const IMG = (n) => `https://scontent.cdninstagram.com/v/foto-${n}.jpg`;

/** Lo que haría el script de Elfsight: dibujar dentro de su contenedor. */
const dibujarWidget = (html) => {
  const contenedor = document.querySelector("[class^='elfsight-app-']");
  contenedor.innerHTML = html;
  return contenedor;
};

beforeEach(() => {
  vi.useFakeTimers();
  cliente.obtenerFeedInstagram.mockResolvedValue({ vigente: false, publicaciones: [] });
  cliente.renovarFeedInstagram.mockResolvedValue({});
});

/** Monta la sección y deja que responda el pedido de la copia del servidor. */
const montar = async () => {
  render(<SeccionInstagram contacto={CONTACTO} />);
  await act(() => vi.advanceTimersByTimeAsync(0));
};

const COPIA = [1, 2, 3].map((n) => ({
  id: `instagram/${n}.webp`,
  imagen: `/uploads/instagram/${n}.webp`,
  enlace: `https://www.instagram.com/p/COPIA${n}/`,
  esReel: false,
  likes: "10",
  comentarios: "1",
}));

afterEach(() => {
  vi.useRealTimers();
  document.head.querySelectorAll("script[src*='elfsight']").forEach((s) => s.remove());
});

describe("SeccionInstagram", () => {
  it("mientras el widget dibuja muestra esqueletos y pide el script una sola vez", async () => {
    await montar();
    expect(screen.getByText("Cargando publicaciones…")).toBeInTheDocument();
    expect(document.head.querySelectorAll("script[src*='elfsight']")).toHaveLength(1);
  });

  it("redibuja las publicaciones del widget como reels propios", async () => {
    await montar();
    await act(async () => {
      dibujarWidget(`
        <div class="es-post">
          <a href="https://www.instagram.com/reel/AAA/" aria-label="Fade"><img src="${IMG(1)}"></a>
          <span class="eapps-instagram-feed-posts-item-likes-count-label">48</span>
          <span class="eapps-instagram-feed-posts-item-comments-count-label">2</span>
        </div>
        <div class="es-post">
          <a href="https://www.instagram.com/p/BBB/"><img src="${IMG(2)}" alt="Barba"></a>
        </div>
      `);
      await vi.advanceTimersByTimeAsync(400);
    });

    const reel = screen.getByRole("link", { name: "Reel de Instagram, 48 me gusta, 2 comentarios" });
    expect(reel).toHaveAttribute("href", "https://www.instagram.com/reel/AAA/");
    // Pie con los contadores y sin la descripción.
    expect(reel).toHaveTextContent("48");
    expect(reel).not.toHaveTextContent("Fade");
    expect(screen.getByRole("link", { name: "Publicación de Instagram" })).not.toHaveTextContent("Barba");
    expect(screen.getByRole("link", { name: "Ver más en Instagram" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/alonzo_style/"
    );
    // El widget original queda oculto para lectores de pantalla.
    expect(document.querySelector("[class^='elfsight-app-']").parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("si el primer widget no dibuja, prueba el de respaldo", async () => {
    await montar();
    const primero = document.querySelector("[class^='elfsight-app-']").className;
    await act(() => vi.advanceTimersByTimeAsync(ESPERA_POR_WIDGET_MS));
    const segundo = document.querySelector("[class^='elfsight-app-']").className;
    expect(segundo).not.toBe(primero);
  });

  it("si ningún widget dibuja, queda el enlace al perfil sin esqueletos", async () => {
    await montar();
    await act(() => vi.advanceTimersByTimeAsync(ESPERA_POR_WIDGET_MS));
    await act(() => vi.advanceTimersByTimeAsync(ESPERA_POR_WIDGET_MS));

    expect(screen.queryByText("Cargando publicaciones…")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver más en Instagram" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /de Instagram/ })).not.toBeInTheDocument();
  });

  it("si el widget dibuja algo ilegible, lo muestra tal cual antes que nada", async () => {
    await montar();
    await act(() => vi.advanceTimersByTimeAsync(ESPERA_POR_WIDGET_MS));
    await act(async () => {
      dibujarWidget(`<iframe title="feed"></iframe>`);
      await vi.advanceTimersByTimeAsync(ESPERA_POR_WIDGET_MS);
    });

    const anfitrion = document.querySelector("[class^='elfsight-app-']").parentElement;
    expect(anfitrion).not.toHaveAttribute("aria-hidden");
    expect(screen.queryByText("Ver más en Instagram")).not.toBeInTheDocument();
  });
});

describe("SeccionInstagram: copia diaria del servidor", () => {
  it("con la copia vigente la dibuja y no carga el widget (no gasta vistas)", async () => {
    cliente.obtenerFeedInstagram.mockResolvedValue({ vigente: true, publicaciones: COPIA });
    await montar();

    expect(screen.getAllByRole("link", { name: "Publicación de Instagram, 10 me gusta, 1 comentario" })).toHaveLength(3);
    expect(document.querySelector("[class^=elfsight-app-]")).toBeNull();
    expect(document.head.querySelector("script[src*=elfsight]")).toBeNull();
    expect(cliente.renovarFeedInstagram).not.toHaveBeenCalled();
  });

  it("vencida: muestra la vieja mientras el widget carga y manda lo nuevo cuando se queda quieto", async () => {
    cliente.obtenerFeedInstagram.mockResolvedValue({ vigente: false, publicaciones: COPIA });
    await montar();

    // La copia vieja, sin esqueletos, mientras el widget dibuja.
    expect(screen.getAllByRole("link", { name: /Publicación de Instagram/ })).toHaveLength(3);
    expect(screen.queryByText("Cargando publicaciones…")).not.toBeInTheDocument();
    expect(document.querySelector("[class^=elfsight-app-]")).not.toBeNull();

    await act(async () => {
      dibujarWidget(`
        <div class="es-post"><a href="https://www.instagram.com/p/NUEVA/"><img src="${IMG(9)}"></a>
        <span class="eapps-instagram-feed-posts-item-likes-count-label">5</span></div>`);
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(screen.getByRole("link", { name: "Publicación de Instagram, 5 me gusta" })).toBeInTheDocument();
    expect(cliente.renovarFeedInstagram).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(QUIETUD_ANTES_DE_GUARDAR_MS));
    expect(cliente.renovarFeedInstagram).toHaveBeenCalledTimes(1);
    expect(cliente.renovarFeedInstagram.mock.calls[0][0][0]).toMatchObject({
      imagen: IMG(9),
      enlace: "https://www.instagram.com/p/NUEVA/",
      likes: "5",
    });
  });

  it("vencida y el widget no dibuja: queda la copia vieja", async () => {
    cliente.obtenerFeedInstagram.mockResolvedValue({ vigente: false, publicaciones: COPIA });
    await montar();
    await act(() => vi.advanceTimersByTimeAsync(ESPERA_POR_WIDGET_MS * 2));

    expect(screen.getAllByRole("link", { name: /Publicación de Instagram/ })).toHaveLength(3);
    expect(cliente.renovarFeedInstagram).not.toHaveBeenCalled();
  });

  it("si el servidor no responde, carga el widget como antes", async () => {
    cliente.obtenerFeedInstagram.mockRejectedValue(new Error("Network Error"));
    await montar();

    expect(document.querySelector("[class^=elfsight-app-]")).not.toBeNull();
  });
});
