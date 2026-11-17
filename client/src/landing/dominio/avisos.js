/**
 * Avisos para la persona que reserva. Siempre advertencia con título
 * "Atención", nunca un error en rojo.
 */

/** Traduce el error del servidor a un aviso y a qué paso conviene volver. */
export const avisoParaError = (error) => {
  const status = error?.response?.status;
  const mensaje = error?.response?.data?.message;

  // Regla del negocio: un turno abierto por celular en las próximas 12 horas.
  if (status === 409 && error.response.data?.motivo === "turno_abierto") {
    const t = error.response.data.turno || {};
    const cuando = t.fecha && t.hora ? ` el ${t.fecha} a las ${t.hora}${t.barbero ? ` con ${t.barbero}` : ""}` : "";
    return {
      aviso: {
        titulo: "Ya tenés un turno",
        texto: `Tenés un turno${cuando}. Para reservar otro, primero cancelá o completá ese.`,
      },
    };
  }
  if (status === 409) {
    return {
      aviso: { titulo: "Atención", texto: "Ese horario ya no está disponible. Elegí otro, por favor." },
      volverAPaso: 3,
      soltarTurno: true,
      refrescarTurnos: true,
    };
  }
  if (status === 404) {
    return {
      aviso: { titulo: "Atención", texto: "Ese barbero ya no está tomando reservas. Elegí otro, por favor." },
      volverAPaso: 1,
      soltarBarbero: true,
      soltarTurno: true,
      refrescarBarberos: true,
    };
  }
  if (status === 400) {
    return {
      aviso: {
        titulo: "Atención",
        texto: mensaje || "Revisá los datos de la reserva e intentá de nuevo.",
      },
      // Un 400 con servicios inválidos (alguno se desactivó mientras tanto)
      // se resuelve eligiéndolos de nuevo.
      volverAPaso: /servicio/i.test(mensaje || "") ? 2 : undefined,
      refrescarServicios: /servicio/i.test(mensaje || ""),
    };
  }
  return {
    aviso: {
      titulo: "Atención",
      texto: "No pudimos confirmar la reserva. Revisá tu conexión y probá de nuevo.",
    },
  };
};
