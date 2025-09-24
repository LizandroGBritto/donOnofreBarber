const moment = require("moment-timezone");

// Zona horaria de Paraguay
const PARAGUAY_TIMEZONE = "America/Asuncion";

class ParaguayDateUtil {
  // Obtener la fecha actual en Paraguay
  static now() {
    return moment().tz(PARAGUAY_TIMEZONE);
  }

  // Obtener la fecha actual en Paraguay como Date object
  static nowAsDate() {
    return this.now().toDate();
  }

  // Convertir una fecha a la zona horaria de Paraguay
  static toParaguayTime(date) {
    return moment(date).tz(PARAGUAY_TIMEZONE);
  }

  // Obtener el inicio del día en Paraguay (00:00:00)
  static startOfDay(date = null) {
    const targetDate = date ? moment(date) : this.now();
    return targetDate.tz(PARAGUAY_TIMEZONE).startOf("day");
  }

  // Obtener el final del día en Paraguay (23:59:59.999)
  static endOfDay(date = null) {
    const targetDate = date ? moment(date) : this.now();
    return targetDate.tz(PARAGUAY_TIMEZONE).endOf("day");
  }

  // Formatear fecha para Paraguay
  static format(date, format = "YYYY-MM-DD") {
    return moment(date).tz(PARAGUAY_TIMEZONE).format(format);
  }

  // Obtener fecha en formato ISO pero ajustada a Paraguay
  static toISOString(date = null) {
    const targetDate = date ? moment(date) : this.now();
    return targetDate.tz(PARAGUAY_TIMEZONE).toISOString();
  }

  // Obtener solo la fecha (YYYY-MM-DD) en Paraguay
  static getDateOnly(date = null) {
    const targetDate = date ? moment(date) : this.now();
    return targetDate.tz(PARAGUAY_TIMEZONE).format("YYYY-MM-DD");
  }

  // Verificar si una fecha es hoy en Paraguay
  static isToday(date) {
    const today = this.getDateOnly();
    const targetDate = this.getDateOnly(date);
    return today === targetDate;
  }

  // Verificar si una fecha es mañana en Paraguay
  static isTomorrow(date) {
    const tomorrow = this.now().add(1, "day").format("YYYY-MM-DD");
    const targetDate = this.getDateOnly(date);
    return tomorrow === targetDate;
  }

  // Obtener mañana en Paraguay
  static tomorrow() {
    return this.now().add(1, "day");
  }

  // Obtener ayer en Paraguay
  static yesterday() {
    return this.now().subtract(1, "day");
  }

  // Crear un rango de fechas para queries de base de datos
  static createDateRange(date) {
    const startOfDay = this.startOfDay(date).toDate();
    const endOfDay = this.endOfDay(date).toDate();
    return { startOfDay, endOfDay };
  }

  // Obtener el día de la semana en español
  static getDayOfWeek(date = null) {
    const targetDate = date ? moment(date) : this.now();
    const dayNames = {
      0: "domingo",
      1: "lunes",
      2: "martes",
      3: "miercoles",
      4: "jueves",
      5: "viernes",
      6: "sabado",
    };
    return dayNames[targetDate.tz(PARAGUAY_TIMEZONE).day()];
  }

  // Crear una fecha específica de Paraguay
  static createDate(year, month, day, hour = 0, minute = 0, second = 0) {
    return moment.tz(
      [year, month - 1, day, hour, minute, second],
      PARAGUAY_TIMEZONE
    );
  }
}

module.exports = ParaguayDateUtil;
