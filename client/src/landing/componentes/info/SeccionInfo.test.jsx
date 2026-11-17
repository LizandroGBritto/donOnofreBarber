import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProveedorNotificaciones } from "../Notificaciones";
import SeccionInfo from "./SeccionInfo";

// Leaflet no corre en jsdom: el mapa se reemplaza por un marcador de prueba.
vi.mock("./MapaOscuro", () => ({
  default: ({ lat, lng }) => <div data-testid="mapa">{`${lat},${lng}`}</div>,
}));

const peticion = (datos, extra = {}) => ({ datos, cargando: false, error: null, recargar: vi.fn(), ...extra });
const FILAS = [
  { clave: "1", etiqueta: "Lunes", rango: "Cerrado", dias: [1] },
  { clave: "2-3-4-5-6", etiqueta: "Martes a sábado", rango: "09:00 a 20:00", dias: [2, 3, 4, 5, 6] },
];

const pintar = (props = {}) =>
  render(
    <ProveedorNotificaciones>
      <SeccionInfo
        horarios={peticion([{}])}
        filasHorario={FILAS}
        hoy={2}
        apertura={{ abierto: true, texto: "Abierto hasta las 20:00" }}
        ubicacion={peticion({ direccion: "Av. Mcal. López 1234", enlaceMaps: "https://maps.app.goo.gl/abc" })}
        contacto={peticion({ whatsapp: "+595 983 974 440", instagram: "@alonzo_style" })}
        {...props}
      />
    </ProveedorNotificaciones>
  );

describe("SeccionInfo", () => {
  it("muestra esqueletos por bloque mientras cargan", () => {
    pintar({
      horarios: peticion(null, { cargando: true }),
      ubicacion: peticion(null, { cargando: true }),
      contacto: peticion(null, { cargando: true }),
    });
    expect(screen.getAllByText("Cargando…")).toHaveLength(3);
  });

  it("oculta los bloques sin datos cargados en el panel", () => {
    pintar({ filasHorario: [], ubicacion: peticion(null), contacto: peticion(null) });
    expect(screen.queryByRole("heading", { name: "Horarios" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ubicación" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Contacto" })).not.toBeInTheDocument();
  });

  it("marca el día de hoy y el estado de apertura", () => {
    pintar();
    expect(screen.getByText("Abierto hasta las 20:00")).toBeInTheDocument();
    expect(screen.getByText("Martes a sábado").closest("[aria-current]")).toHaveAttribute("aria-current", "date");
  });
});

describe("Ubicación", () => {
  it("sin coordenadas no dibuja mapa, pero muestra la dirección y el botón a Google Maps", () => {
    pintar();
    expect(screen.queryByTestId("mapa")).not.toBeInTheDocument();
    expect(screen.queryByText(/Esquema ilustrativo/)).not.toBeInTheDocument();
    expect(screen.getByText("Av. Mcal. López 1234")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver en Google Maps" })).toHaveAttribute(
      "href",
      "https://maps.app.goo.gl/abc"
    );
  });

  it("con coordenadas carga el mapa oscuro en ese punto", async () => {
    pintar({
      ubicacion: peticion({
        direccion: "Av. Mcal. López 1234",
        enlaceMaps: "https://maps.app.goo.gl/abc",
        coordenadas: { lat: -25.2865, lng: -57.6470 },
      }),
    });
    expect(await screen.findByTestId("mapa")).toHaveTextContent("-25.2865,-57.647");
  });

  it("coordenadas a medias no dibujan un mapa en 0,0", () => {
    pintar({ ubicacion: peticion({ direccion: "X", coordenadas: { lat: -25.2865, lng: null } }) });
    expect(screen.queryByTestId("mapa")).not.toBeInTheDocument();
  });

  it("un enlace que no es http(s) no se publica", () => {
    pintar({ ubicacion: peticion({ direccion: "X", enlaceMaps: "javascript:alert(1)" }) });
    expect(screen.queryByRole("link", { name: "Ver en Google Maps" })).not.toBeInTheDocument();
  });
});

describe("Contacto", () => {
  it("arma los enlaces a WhatsApp e Instagram", () => {
    pintar();
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/595983974440");
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/alonzo_style/"
    );
  });

  it("ignora un instagramUrl peligroso y usa el usuario", () => {
    pintar({ contacto: peticion({ instagram: "alonzo_style", instagramUrl: "javascript:alert(1)" }) });
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/alonzo_style/"
    );
  });

  it("copia el celular y lo confirma", async () => {
    const usuario = userEvent.setup();
    pintar();
    await usuario.click(screen.getByRole("button", { name: "Copiar celular" }));
    expect(await navigator.clipboard.readText()).toBe("+595 983 974 440");
    expect(screen.getByRole("status")).toHaveTextContent("Copiado");
  });

  it("si el navegador no deja copiar, pide copiar a mano", async () => {
    const usuario = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("NotAllowedError"));
    pintar();
    await usuario.click(screen.getByRole("button", { name: "Copiar celular" }));
    expect(screen.getByRole("status")).toHaveTextContent("Seleccioná y copiá el texto");
  });
});
