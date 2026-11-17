/**
 * Estado del asistente de reserva (cuatro pasos y el ticket final).
 *
 * Es un reducer puro: toda la lógica de "qué se limpia cuando cambia qué"
 * vive acá y tiene tests, en lugar de repartirse entre efectos.
 */

export const PASOS = [
  { n: 1, titulo: "Barbero" },
  { n: 2, titulo: "Servicios" },
  { n: 3, titulo: "Horario" },
  { n: 4, titulo: "Datos" },
];

export const estadoInicial = {
  paso: 1,
  barberoId: null,
  servicioIds: [],
  diaClave: null,
  turnoId: null,
  nombre: "",
  celular: "",
  enviando: false,
  aviso: null, // { titulo, texto, tipo?, datos? }
  confirmado: null, // turno devuelto por el servidor
};

export function reservaReducer(estado, accion) {
  switch (accion.type) {
    case "elegirBarbero": {
      const cambio = accion.barberoId !== estado.barberoId;
      return {
        ...estado,
        barberoId: accion.barberoId,
        // Otro barbero es otra agenda: el día y la hora elegidos ya no valen.
        // Los servicios se conservan y después se podan a los que este
        // barbero ofrece (ver "podarServicios").
        diaClave: cambio ? null : estado.diaClave,
        turnoId: cambio ? null : estado.turnoId,
        paso: 2,
        aviso: null,
      };
    }

    case "tomarProximo":
      return {
        ...estado,
        barberoId: accion.barberoId,
        diaClave: accion.diaClave,
        turnoId: accion.turnoId,
        paso: 2,
        aviso: null,
        confirmado: null,
      };

    case "alternarServicio": {
      const ya = estado.servicioIds.includes(accion.servicioId);
      return {
        ...estado,
        servicioIds: ya
          ? estado.servicioIds.filter((id) => id !== accion.servicioId)
          : [...estado.servicioIds, accion.servicioId],
      };
    }

    case "podarServicios": {
      const disponibles = new Set(accion.disponibles.map(String));
      const servicioIds = estado.servicioIds.filter((id) => disponibles.has(String(id)));
      return servicioIds.length === estado.servicioIds.length
        ? estado
        : { ...estado, servicioIds };
    }

    case "elegirDia":
      return accion.diaClave === estado.diaClave
        ? estado
        : { ...estado, diaClave: accion.diaClave, turnoId: null };

    case "elegirTurno":
      return { ...estado, turnoId: accion.turnoId };

    case "soltarTurno":
      return estado.turnoId ? { ...estado, turnoId: null } : estado;

    // El turno elegido dejó de estar libre (lo tomó otra persona, o llegó su
    // hora) mientras el cliente completaba los datos: se lo manda a elegir
    // otro, avisando, en lugar de dejarlo confirmar algo que va a fallar.
    case "perderTurno":
      if (!estado.turnoId) return estado;
      return {
        ...estado,
        turnoId: null,
        paso: Math.min(estado.paso, 3),
        aviso:
          estado.paso >= 4
            ? { titulo: "Atención", texto: "El horario que elegiste ya no está disponible. Elegí otro, por favor." }
            : estado.aviso,
      };

    case "irAPaso": {
      // Solo hacia atrás o al paso actual: hacia adelante se avanza con
      // "avanzar", que es el que exige lo de cada paso.
      if (accion.paso < 1 || accion.paso > estado.paso) return estado;
      return { ...estado, paso: accion.paso, aviso: null };
    }

    case "avanzar":
      return puedeAvanzar(estado)
        ? { ...estado, paso: Math.min(estado.paso + 1, 4), aviso: null }
        : estado;

    case "retroceder":
      return estado.paso > 1
        ? { ...estado, paso: estado.paso - 1, aviso: null }
        : estado;

    case "editarCampo":
      return { ...estado, [accion.campo]: accion.valor };

    case "enviar":
      return { ...estado, enviando: true, aviso: null };

    case "confirmar":
      return { ...estado, enviando: false, confirmado: accion.turno, aviso: null };

    case "fallar":
      return {
        ...estado,
        enviando: false,
        aviso: accion.aviso,
        paso: accion.volverAPaso ?? estado.paso,
        turnoId: accion.soltarTurno ? null : estado.turnoId,
        barberoId: accion.soltarBarbero ? null : estado.barberoId,
      };

    case "cerrarAviso":
      return { ...estado, aviso: null };

    case "reiniciar":
      return estadoInicial;

    default:
      return estado;
  }
}

/** Lo que exige cada paso para pasar al siguiente. */
export function puedeAvanzar(estado) {
  switch (estado.paso) {
    case 1:
      return Boolean(estado.barberoId);
    case 2:
      return estado.servicioIds.length > 0;
    case 3:
      return Boolean(estado.diaClave && estado.turnoId);
    default:
      return false;
  }
}
