import { useReducer } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PropTypes from "prop-types";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import ParaguayDateUtil from "../../../utils/paraguayDate";
import * as cliente from "../../datos/clienteLanding";
import * as push from "../../datos/notificacionesPush";
import { estadoInicial, reservaReducer } from "../../dominio/reserva";
import { ProveedorNotificaciones } from "../Notificaciones";
import Reserva from "./Reserva";

vi.mock("../../datos/clienteLanding", () => ({
  listarServiciosDeBarbero: vi.fn(),
  listarTurnosDeBarbero: vi.fn(),
  reservarTurno: vi.fn(),
  verificarTurnoAbierto: vi.fn(),
  invalidarTurnos: vi.fn(),
  urlDeArchivo: (nombre) => (nombre ? `/uploads/${nombre}` : null),
}));

vi.mock("../../datos/notificacionesPush", () => {
  class PermisoDenegado extends Error {}
  return {
    PermisoDenegado,
    pushDisponible: vi.fn(),
    permisoActual: vi.fn(),
    activarRecordatorio: vi.fn(),
  };
});

// Martes 17 de noviembre de 2026, 10:30 en Asunción.
const AHORA = ParaguayDateUtil.toParaguayTime("2026-11-17T10:30:00-03:00");
const FECHA_18 = "2026-11-18T03:00:00.000Z";

const BARBEROS = [
  { _id: "b1", nombre: "Lisandro Alonzo", descripcion: "Fades y diseños" },
  { _id: "b2", nombre: "Elias" },
];
const SERVICIOS = [
  { _id: "s1", nombre: "Corte clásico", precio: 50000, imagenes: [] },
  { _id: "s2", nombre: "Barba", precio: 30000, imagenes: [] },
];
const TURNOS = [
  { _id: "t-pasado", fecha: "2026-11-17T03:00:00.000Z", hora: "09:00", estado: "disponible" },
  { _id: "t-ocupado", fecha: FECHA_18, hora: "10:00", estado: "reservado" },
  { _id: "t-libre", fecha: FECHA_18, hora: "11:00", estado: "disponible" },
];

const peticion = (datos, extra = {}) => ({ datos, cargando: false, error: null, recargar: vi.fn(), ...extra });

const Arnes = ({ barberos = peticion(BARBEROS) }) => {
  const [estado, despachar] = useReducer(reservaReducer, estadoInicial);
  return (
    <MemoryRouter>
      <ProveedorNotificaciones>
        <Reserva
          estado={estado}
          despachar={despachar}
          barberos={barberos}
          ahora={AHORA}
          contacto={{ instagram: "@alonzo_style" }}
          ubicacion={{ direccion: "Av. Siempre Viva 123" }}
          filasHorario={[]}
          onVolverArriba={() => {}}
        />
      </ProveedorNotificaciones>
    </MemoryRouter>
  );
};

Arnes.propTypes = { barberos: PropTypes.object };

beforeAll(() => {
  // jsdom no implementa scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  cliente.listarServiciosDeBarbero.mockResolvedValue(SERVICIOS);
  cliente.listarTurnosDeBarbero.mockResolvedValue(TURNOS);
  cliente.verificarTurnoAbierto.mockResolvedValue({ tieneTurno: false });
  push.pushDisponible.mockReturnValue(true);
  push.permisoActual.mockReturnValue("default");
  vi.spyOn(ParaguayDateUtil, "now").mockImplementation(() => AHORA.clone());
});

/** Recorre los pasos 1 a 3 y deja el formulario de datos completo. */
const hastaDatos = async (usuario) => {
  await usuario.click(screen.getByRole("radio", { name: /Lisandro Alonzo/ }));
  await usuario.click(await screen.findByRole("checkbox", { name: /Corte clásico/ }));
  await usuario.click(screen.getByRole("button", { name: "Continuar" }));
  await usuario.click(await screen.findByRole("button", { name: "11:00" }));
  await usuario.click(screen.getByRole("button", { name: "Continuar" }));
  await usuario.type(await screen.findByLabelText("Nombre completo"), "José Peña");
  await usuario.type(screen.getByLabelText("Número de celular"), "+595 981 123 456");
};

describe("Reserva: recorrido completo", () => {
  it("reserva con servicios por id y muestra el ticket del servidor", async () => {
    const usuario = userEvent.setup();
    cliente.reservarTurno.mockResolvedValue({
      turno: {
        _id: "t-libre",
        fecha: FECHA_18,
        hora: "11:00",
        nombreCliente: "José Peña",
        editToken: "token-secreto",
        costoTotal: 50000,
        servicios: [{ nombre: "Corte clásico", precio: 50000 }],
      },
    });
    render(<Arnes />);

    await hastaDatos(usuario);
    await usuario.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("heading", { name: "Tu turno está reservado" })).toBeInTheDocument();
    // Se manda el celular normalizado y los ids de servicio; nunca un precio.
    expect(cliente.reservarTurno).toHaveBeenCalledWith({
      fecha: FECHA_18,
      hora: "11:00",
      barberoId: "b1",
      nombreCliente: "José Peña",
      numeroCliente: "0981123456",
      servicioIds: ["s1"],
    });
    expect(localStorage.getItem("editToken:t-libre")).toBe("token-secreto");
    expect(cliente.invalidarTurnos).toHaveBeenCalledWith("b1");
    // El ticket no muestra un código de turno: no servía para nada.
    expect(screen.queryByText(/^AS-\d{4}-/)).not.toBeInTheDocument();
  });

  it("no muestra turnos pasados y deshabilita los ocupados", async () => {
    const usuario = userEvent.setup();
    render(<Arnes />);
    await usuario.click(screen.getByRole("radio", { name: /Lisandro Alonzo/ }));
    await usuario.click(await screen.findByRole("checkbox", { name: /Corte clásico/ }));
    await usuario.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByRole("button", { name: /10:00/ })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "09:00" })).not.toBeInTheDocument();
  });

  it("no deja confirmar con un celular inválido", async () => {
    const usuario = userEvent.setup();
    render(<Arnes />);
    await hastaDatos(usuario);
    const celular = screen.getByLabelText("Número de celular");
    await usuario.clear(celular);
    await usuario.type(celular, "021 123 456");
    await usuario.tab();

    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
    expect(screen.getByText(/código de país/)).toBeInTheDocument();
    expect(cliente.reservarTurno).not.toHaveBeenCalled();
  });
});

describe("Reserva: errores", () => {
  it("409: el horario se ocupó, vuelve al paso 3 con aviso y recarga la agenda", async () => {
    const usuario = userEvent.setup();
    cliente.reservarTurno.mockRejectedValue({ response: { status: 409, data: {} } });
    render(<Arnes />);
    await hastaDatos(usuario);
    const llamadasAntes = cliente.listarTurnosDeBarbero.mock.calls.length;

    await usuario.click(screen.getByRole("button", { name: "Confirmar" }));

    const aviso = await screen.findByRole("alert");
    expect(within(aviso).getByText("Atención")).toBeInTheDocument();
    expect(within(aviso).getByText(/ya no está disponible/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Elegí día y hora" })).toBeInTheDocument();
    expect(cliente.invalidarTurnos).toHaveBeenCalledWith("b1");
    await waitFor(() => expect(cliente.listarTurnosDeBarbero.mock.calls.length).toBeGreaterThan(llamadasAntes));
  });

  it("si ya tiene un turno en las próximas 12 horas no reserva otro", async () => {
    const usuario = userEvent.setup();
    cliente.verificarTurnoAbierto.mockResolvedValue({
      tieneTurno: true,
      turno: { fecha: "18/11/2026", hora: "09:00", barbero: "Elias" },
    });
    render(<Arnes />);
    await hastaDatos(usuario);
    await usuario.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText("Ya tenés un turno")).toBeInTheDocument();
    expect(cliente.reservarTurno).not.toHaveBeenCalled();
  });

  it("si la verificación falla, la reserva sigue (el servidor es quien valida)", async () => {
    const usuario = userEvent.setup();
    cliente.verificarTurnoAbierto.mockRejectedValue(new Error("Network Error"));
    cliente.reservarTurno.mockResolvedValue({
      turno: { _id: "t-libre", fecha: FECHA_18, hora: "11:00", nombreCliente: "José Peña", costoTotal: 50000 },
    });
    render(<Arnes />);
    await hastaDatos(usuario);
    await usuario.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("heading", { name: "Tu turno está reservado" })).toBeInTheDocument();
  });

  it("sin red al confirmar, avisa y se queda en el paso 4 con los datos cargados", async () => {
    const usuario = userEvent.setup();
    cliente.reservarTurno.mockRejectedValue(new Error("Network Error"));
    render(<Arnes />);
    await hastaDatos(usuario);
    await usuario.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText(/Revisá tu conexión/)).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre completo")).toHaveValue("José Peña");
  });

  it("si la agenda no carga ofrece reintentar", async () => {
    const usuario = userEvent.setup();
    cliente.listarTurnosDeBarbero.mockRejectedValueOnce(new Error("500")).mockResolvedValue(TURNOS);
    render(<Arnes />);
    await usuario.click(screen.getByRole("radio", { name: /Lisandro Alonzo/ }));
    await usuario.click(await screen.findByRole("checkbox", { name: /Corte clásico/ }));
    await usuario.click(screen.getByRole("button", { name: "Continuar" }));

    await usuario.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("button", { name: "11:00" })).toBeEnabled();
  });
});

describe("Reserva: aviso push después de confirmar", () => {
  const TURNO = {
    _id: "t-libre",
    fecha: FECHA_18,
    hora: "11:00",
    nombreCliente: "José Peña",
    editToken: "token-secreto",
    costoTotal: 50000,
    servicios: [{ nombre: "Corte clásico", precio: 50000 }],
  };
  /** "Ahora" a tantos minutos del turno del 18 a las 11:00. */
  const faltando = (minutos) => {
    const ahora = ParaguayDateUtil.toParaguayTime("2026-11-18T11:00:00-03:00").subtract(minutos, "minutes");
    ParaguayDateUtil.now.mockImplementation(() => ahora.clone());
  };
  const confirmar = async (usuario) => {
    cliente.reservarTurno.mockResolvedValue({ turno: TURNO });
    render(<Arnes />);
    await hastaDatos(usuario);
    await usuario.click(screen.getByRole("button", { name: "Confirmar" }));
    await screen.findByRole("heading", { name: "Tu turno está reservado" });
  };

  it("ofrece avisar una hora antes con el foco en Activar, y lo activa", async () => {
    const usuario = userEvent.setup();
    push.activarRecordatorio.mockResolvedValue({ minutosAntes: 60 });
    await confirmar(usuario);

    const modal = await screen.findByRole("dialog", { name: "Activá las notificaciones" });
    expect(within(modal).getByText(/te avisamos una hora antes de tu turno/)).toBeInTheDocument();
    const activar = within(modal).getByRole("button", { name: "Activar" });
    await waitFor(() => expect(activar).toHaveFocus());

    await usuario.click(activar);

    expect(push.activarRecordatorio).toHaveBeenCalledWith("t-libre", "token-secreto");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Listo: te avisamos una hora antes")).toBeInTheDocument();
    expect(localStorage.getItem("recordatorio:t-libre")).toBe("activado");
  });

  it.each([
    [50, "40 minutos"],
    [30, "20 minutos"],
    [12, "5 minutos"],
  ])("con %s minutos por delante recorta a %s", async (minutos, texto) => {
    faltando(minutos);
    await confirmar(userEvent.setup());

    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByText(new RegExp(`te avisamos ${texto} antes`))).toBeInTheDocument();
  });

  it("con 5 minutos o menos no lo ofrece", async () => {
    faltando(5);
    await confirmar(userEvent.setup());

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("no lo ofrece si el navegador no tiene push o lo tiene bloqueado", async () => {
    push.permisoActual.mockReturnValue("denied");
    await confirmar(userEvent.setup());

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Ahora no lo cierra, no lo vuelve a ofrecer y devuelve el foco al ticket", async () => {
    const usuario = userEvent.setup();
    await confirmar(usuario);

    await usuario.click(await screen.findByRole("button", { name: "Ahora no" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem("recordatorio:t-libre")).toBe("descartado");
    await waitFor(() => expect(screen.getByRole("heading", { name: "Tu turno está reservado" })).toHaveFocus());
    expect(push.activarRecordatorio).not.toHaveBeenCalled();
  });

  it("Escape lo cierra", async () => {
    const usuario = userEvent.setup();
    await confirmar(usuario);
    await screen.findByRole("dialog");

    await usuario.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("si el permiso se niega, explica cómo habilitarlo", async () => {
    const usuario = userEvent.setup();
    push.activarRecordatorio.mockRejectedValue(new push.PermisoDenegado());
    await confirmar(usuario);

    await usuario.click(await screen.findByRole("button", { name: "Activar" }));

    const modal = await screen.findByRole("dialog", { name: "Atención" });
    expect(within(modal).getByText(/bloqueadas en este navegador/)).toBeInTheDocument();
  });

  it("si el servidor lo rechaza, muestra el motivo y deja reintentar", async () => {
    const usuario = userEvent.setup();
    push.activarRecordatorio
      .mockRejectedValueOnce({ response: { data: { message: "El turno ya no está reservado" } } })
      .mockResolvedValue({ minutosAntes: 60 });
    await confirmar(usuario);

    await usuario.click(await screen.findByRole("button", { name: "Activar" }));
    expect(await screen.findByText("El turno ya no está reservado")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Activar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
