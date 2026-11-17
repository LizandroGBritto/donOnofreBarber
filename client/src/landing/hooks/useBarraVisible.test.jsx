import { act, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBarraVisible } from "./useBarraVisible";

let topCortina = 600;

const Prueba = () => {
  const cortinaRef = useRef(null);
  const visible = useBarraVisible(cortinaRef);
  return (
    <>
      <p>{visible ? "barra visible" : "barra oculta"}</p>
      <div ref={cortinaRef} data-testid="cortina" />
    </>
  );
};

const desplazar = async (top) => {
  topCortina = top;
  await act(async () => {
    window.dispatchEvent(new Event("scroll"));
  });
};

describe("useBarraVisible", () => {
  beforeEach(() => {
    topCortina = 600;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({ top: topCortina }));
  });
  afterEach(() => vi.restoreAllMocks());

  it("en la primera carga, con el banner a la vista, la barra está oculta", () => {
    render(<Prueba />);
    expect(screen.getByText("barra oculta")).toBeInTheDocument();
  });

  it("aparece cuando la cortina llega arriba y se va al volver al banner", async () => {
    render(<Prueba />);

    await desplazar(200);
    expect(screen.getByText("barra oculta")).toBeInTheDocument();

    await desplazar(60);
    expect(screen.getByText("barra visible")).toBeInTheDocument();

    await desplazar(600);
    expect(screen.getByText("barra oculta")).toBeInTheDocument();
  });
});
