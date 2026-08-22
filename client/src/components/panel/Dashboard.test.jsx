import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TooltipUnaLinea } from "./Dashboard";

vi.mock("../../hooks/useApi", () => ({ useApi: () => ({ agenda: {} }) }));

const payloadDia = [{ payload: { dia: "jueves", total: 48 } }];

// Regresión: el tooltip de recharts arma etiqueta y valor en filas separadas.
// Como el `name` de la serie iba vacío, en el celular se veía el día en un
// renglón y ": 48 turnos" en el de abajo.
describe("TooltipUnaLinea", () => {
  it("muestra etiqueta y valor en un solo texto", () => {
    render(
      <TooltipUnaLinea
        active
        payload={payloadDia}
        texto={(d) => `${d.dia}: ${d.total} turnos`}
      />
    );

    // Un único nodo con todo junto: si estuviera partido en dos, esta
    // búsqueda por texto completo no encontraría nada.
    expect(screen.getByText("jueves: 48 turnos")).toBeInTheDocument();
  });

  it("no deja un renglón suelto empezando con dos puntos", () => {
    const { container } = render(
      <TooltipUnaLinea
        active
        payload={payloadDia}
        texto={(d) => `${d.dia}: ${d.total} turnos`}
      />
    );

    expect(container.textContent.trim().startsWith(":")).toBe(false);
    expect(container.querySelectorAll("span")).toHaveLength(1);
  });

  it("no se corta en varias líneas", () => {
    render(
      <TooltipUnaLinea
        active
        payload={payloadDia}
        texto={(d) => `${d.dia}: ${d.total} turnos`}
      />
    );

    expect(screen.getByText(/48 turnos/).className).toContain("whitespace-nowrap");
  });

  it("no renderiza nada si el tooltip no está activo", () => {
    const { container } = render(
      <TooltipUnaLinea active={false} payload={payloadDia} texto={() => "x"} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("no renderiza nada sin payload", () => {
    const { container } = render(
      <TooltipUnaLinea active payload={[]} texto={() => "x"} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("sirve para el caso de clientes, con teléfono incluido", () => {
    render(
      <TooltipUnaLinea
        active
        payload={[{ payload: { nombre: "Juan Perez", total: 5, numero: "0981000000" } }]}
        texto={(d) => `${d.nombre}: ${d.total} turnos · ${d.numero}`}
      />
    );

    expect(
      screen.getByText("Juan Perez: 5 turnos · 0981000000")
    ).toBeInTheDocument();
  });
});
