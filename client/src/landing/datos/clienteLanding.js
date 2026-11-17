import api from "../../hooks/useApi";
import config from "../../config/api.config";

/**
 * Llamadas públicas de la landing.
 *
 * Son funciones planas (no un hook) para que sean estables entre renders y se
 * puedan usar como dependencia de efectos. Van por la instancia compartida de
 * axios de `useApi.js` y por las rutas de `api.config.js`, como el resto del
 * cliente.
 *
 * Las lecturas que se repiten (servicios y turnos de cada barbero: las pide el
 * escenario para el "próximo libre", las tarjetas para el "desde" y el paso
 * correspondiente) pasan por una caché corta. Una reserva o un 409 la
 * invalidan para no mostrar un horario que ya se ocupó.
 */

const VIDA_CACHE_MS = 30_000;
const cache = new Map();

const conCache = (clave, cargar) => {
  const guardado = cache.get(clave);
  if (guardado && Date.now() - guardado.momento < VIDA_CACHE_MS) {
    return guardado.promesa;
  }
  const promesa = cargar().catch((error) => {
    // Un error no se cachea: el próximo intento vuelve a pedir.
    cache.delete(clave);
    throw error;
  });
  cache.set(clave, { promesa, momento: Date.now() });
  return promesa;
};

export const invalidarTurnos = (barberoId) => {
  if (barberoId) cache.delete(`turnos:${barberoId}`);
  else
    for (const clave of cache.keys())
      if (clave.startsWith("turnos:")) cache.delete(clave);
};

/** Solo para los tests. */
export const vaciarCache = () => cache.clear();

/** 404 = "todavía no se cargó", no un error: la sección simplemente no va. */
const nuloSi404 = (error) => {
  if (error?.response?.status === 404) return null;
  throw error;
};

const rutas = config.api;

export const listarBarberos = () =>
  conCache("barberos", () =>
    api.get(rutas.barberos.activos).then((r) => r.data || [])
  );

export const listarServiciosDeBarbero = (barberoId) =>
  conCache(`servicios:${barberoId}`, () =>
    api.get(rutas.barberos.servicios(barberoId)).then((r) => r.data || [])
  );

export const listarTurnosDeBarbero = (barberoId) =>
  conCache(`turnos:${barberoId}`, () =>
    api
      .get(rutas.agenda.landing, { params: { barberoId } })
      .then((r) => r.data?.agendas || [])
  );

export const obtenerContacto = () =>
  api.get(rutas.contacto).then((r) => r.data?.contacto ?? null, nuloSi404);

export const obtenerUbicacion = () =>
  api.get(rutas.ubicacion).then((r) => r.data?.ubicacion ?? null, nuloSi404);

export const listarHorariosDelLocal = () =>
  api
    .get(rutas.horarios, { params: { estado: "activo" } })
    .then((r) => r.data?.horarios || []);

export const verificarTurnoAbierto = (celular) =>
  api.get(rutas.agenda.verificarTurno(celular)).then((r) => r.data);

export const reservarTurno = (datos) =>
  api.post(rutas.agenda.reservarConBarbero, datos).then((r) => r.data);

/**
 * Copia diaria del feed de Instagram que guarda el servidor (para no cargar el
 * widget de Elfsight en cada visita). `vigente: false` = hay que renovarla.
 */
export const obtenerFeedInstagram = () =>
  api.get(rutas.instagram).then((r) => ({
    vigente: Boolean(r.data?.vigente),
    publicaciones: (r.data?.publicaciones || []).map((p) => ({
      id: p.archivo,
      imagen: urlDeArchivo(p.archivo),
      enlace: p.enlace,
      esReel: Boolean(p.esReel),
      likes: p.likes ?? null,
      comentarios: p.comentarios ?? null,
    })),
  }));

/** Manda lo que se le leyó al widget para renovar la copia del servidor. */
export const renovarFeedInstagram = (publicaciones) =>
  api.post(rutas.instagram, {
    publicaciones: publicaciones.map(({ imagen, enlace, likes, comentarios }) => ({ imagen, enlace, likes, comentarios })),
  });

export const urlDeArchivo = (nombre) =>
  nombre ? config.getUploadUrl(nombre) : null;
