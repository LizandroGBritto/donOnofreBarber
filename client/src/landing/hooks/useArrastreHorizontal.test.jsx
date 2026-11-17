import { useRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import PropTypes from "prop-types";
import { describe, expect, it, vi } from "vitest";
import { useArrastreHorizontal } from "./useArrastreHorizontal";

const Carril = ({ onElegir }) => {
  const ref = useRef(null);
  useArrastreHorizontal(ref);
  return (
    <div ref={ref} data-testid="carril">
      <button type="button" onClick={onElegir}>
        Tarjeta
      </button>
    </div>
  );
};
Carril.propTypes = { onElegir: PropTypes.func.isRequired };

/** jsdom no tiene PointerEvent: un MouseEvent con el tipo de puntero alcanza. */
const puntero = (tipo, clientX, pointerType = "mouse") => {
  const evento = new MouseEvent(tipo, { bubbles: true, cancelable: true, clientX, button: 0 });
  Object.defineProperty(evento, "pointerType", { value: pointerType });
  return evento;
};

describe("useArrastreHorizontal", () => {
  it("arrastrar con el mouse desplaza el carril y no dispara el clic de la tarjeta", () => {
    const onElegir = vi.fn();
    render(<Carril onElegir={onElegir} />);
    const carril = screen.getByTestId("carril");
    const tarjeta = screen.getByRole("button", { name: "Tarjeta" });
    carril.scrollLeft = 200;

    fireEvent(tarjeta, puntero("pointerdown", 300));
    fireEvent(window, puntero("pointermove", 250));
    expect(carril.dataset.arrastrando).toBe("true");
    expect(carril.style.scrollSnapType).toBe("none");
    fireEvent(window, puntero("pointermove", 180));
    expect(carril.scrollLeft).toBe(320);
    fireEvent(window, puntero("pointerup", 180));
    fireEvent.click(tarjeta);

    expect(onElegir).not.toHaveBeenCalled();
    expect(carril.dataset.arrastrando).toBeUndefined();
    expect(carril.style.scrollSnapType).toBe("");
  });

  it("un clic sin moverse sigue siendo un clic", () => {
    const onElegir = vi.fn();
    render(<Carril onElegir={onElegir} />);
    const tarjeta = screen.getByRole("button", { name: "Tarjeta" });

    fireEvent(tarjeta, puntero("pointerdown", 300));
    fireEvent(window, puntero("pointermove", 302));
    fireEvent(window, puntero("pointerup", 302));
    fireEvent.click(tarjeta);

    expect(onElegir).toHaveBeenCalledTimes(1);
  });

  it("con el dedo no interviene: el desplazamiento es el nativo", () => {
    render(<Carril onElegir={vi.fn()} />);
    const carril = screen.getByTestId("carril");
    carril.scrollLeft = 0;

    fireEvent(carril, puntero("pointerdown", 300, "touch"));
    fireEvent(window, puntero("pointermove", 100, "touch"));

    expect(carril.scrollLeft).toBe(0);
    expect(carril.dataset.arrastrando).toBeUndefined();
  });

  it("evita que el navegador arrastre la imagen o el enlace como archivo", () => {
    render(<Carril onElegir={vi.fn()} />);
    const evento = new Event("dragstart", { bubbles: true, cancelable: true });

    screen.getByRole("button", { name: "Tarjeta" }).dispatchEvent(evento);

    expect(evento.defaultPrevented).toBe(true);
  });
});
