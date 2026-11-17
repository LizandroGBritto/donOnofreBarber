import { describe, it, expect } from "vitest";
import { NAV_ITEMS, itemsParaRol, vistaInicialParaRol } from "./navItems";

const idsDe = (rol) => itemsParaRol(rol).map((i) => i.id);

describe("menú del panel por rol", () => {
  it("un barbero solo ve lo suyo", () => {
    expect(idsDe("barbero")).toEqual([
      "dashboard",
      "turnos",
      "mis-precios",
      "mis-horarios",
    ]);
  });

  it("un barbero NO ve la administración del negocio", () => {
    const ids = idsDe("barbero");
    for (const prohibido of [
      "usuarios",
      "barberos",
      "banners",
      "servicios",
      "horarios",
      "contacto",
      "ubicacion",
      "whatsapp",
      "notificaciones",
    ]) {
      expect(ids).not.toContain(prohibido);
    }
  });

  it("Banners no se publica en el menú: la landing usa un banner fijo", () => {
    expect(NAV_ITEMS.map((i) => i.id)).not.toContain("banners");
  });

  it("el admin ve todo menos los paneles personales del barbero", () => {
    const ids = idsDe("admin");
    expect(ids).toContain("usuarios");
    expect(ids).toContain("barberos");
    expect(ids).not.toContain("mis-precios");
    expect(ids).not.toContain("mis-horarios");
  });

  it("un rol desconocido se trata como admin (usuarios anteriores a la migración)", () => {
    expect(idsDe(undefined)).toEqual(idsDe("admin"));
    expect(idsDe(null)).toEqual(idsDe("admin"));
  });

  it("la vista inicial es válida para el rol", () => {
    expect(idsDe("barbero")).toContain(vistaInicialParaRol("barbero"));
    expect(idsDe("admin")).toContain(vistaInicialParaRol("admin"));
  });

  it("todo ítem declara al menos un rol", () => {
    for (const item of NAV_ITEMS) {
      expect(item.roles.length).toBeGreaterThan(0);
      expect(item.id).toBeTruthy();
      expect(item.label).toBeTruthy();
    }
  });
});
