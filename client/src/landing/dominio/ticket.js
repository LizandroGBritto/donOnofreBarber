import ParaguayDateUtil from "../../utils/paraguayDate";
import { iniciales } from "./formato";

/** "AS-1811-10LA": día, mes, hora e iniciales del barbero. Solo de referencia. */
export const codigoDeTurno = (turno, barbero) => {
  const ddmm = ParaguayDateUtil.format(turno.fecha, "DDMM");
  const hh = String(turno.hora).slice(0, 2);
  return `AS-${ddmm}-${hh}${iniciales(barbero?.nombre)}`;
};
