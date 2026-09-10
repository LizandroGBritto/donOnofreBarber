import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import VistaPreviaArchivo from "./VistaPreviaArchivo";

const archivoFalso = (nombre = "corte.png") =>
  new File(["contenido"], nombre, { type: "image/png" });

let creadas;
let revocadas;

beforeEach(() => {
  creadas = [];
  revocadas = [];
  let contador = 0;
  // jsdom no implementa estas dos, y además queremos contarlas.
  URL.createObjectURL = vi.fn(() => {
    const url = `blob:falso-${++contador}`;
    creadas.push(url);
    return url;
  });
  URL.revokeObjectURL = vi.fn((url) => revocadas.push(url));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("VistaPreviaArchivo", () => {
  it("muestra el archivo elegido", async () => {
    render(<VistaPreviaArchivo archivo={archivoFalso()} alt="Nueva foto" />);

    const img = await screen.findByAltText("Nueva foto");
    expect(img).toHaveAttribute("src", "blob:falso-1");
  });

  it("no renderiza nada sin archivo", () => {
    const { container } = render(
      <VistaPreviaArchivo archivo={null} alt="Nueva foto" />
    );

    expect(container).toBeEmptyDOMElement();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("muestra la etiqueta cuando se le pasa", async () => {
    render(
      <VistaPreviaArchivo
        archivo={archivoFalso()}
        alt="Nueva foto"
        etiqueta="Nueva foto (aún sin guardar)"
      />
    );

    expect(
      await screen.findByText("Nueva foto (aún sin guardar)")
    ).toBeInTheDocument();
  });

  // Regresión: antes se llamaba URL.createObjectURL dentro del render, así que
  // cada re-render creaba un blob nuevo y ninguno se liberaba.
  describe("manejo de blob URLs", () => {
    it("crea una sola URL aunque el componente re-renderice", async () => {
      const archivo = archivoFalso();
      const { rerender } = render(
        <VistaPreviaArchivo archivo={archivo} alt="Nueva foto" />
      );

      await screen.findByAltText("Nueva foto");

      // Re-renders que no cambian el archivo: no deberían crear más URLs.
      rerender(<VistaPreviaArchivo archivo={archivo} alt="Nueva foto" />);
      rerender(<VistaPreviaArchivo archivo={archivo} alt="Nueva foto" />);
      rerender(<VistaPreviaArchivo archivo={archivo} alt="Otro alt" />);

      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    });

    it("libera la URL al desmontar", async () => {
      const { unmount } = render(
        <VistaPreviaArchivo archivo={archivoFalso()} alt="Nueva foto" />
      );

      await screen.findByAltText("Nueva foto");
      unmount();

      await waitFor(() => expect(revocadas).toEqual(creadas));
    });

    it("libera la anterior al cambiar de archivo", async () => {
      const { rerender } = render(
        <VistaPreviaArchivo archivo={archivoFalso("a.png")} alt="Nueva foto" />
      );
      await screen.findByAltText("Nueva foto");

      rerender(
        <VistaPreviaArchivo archivo={archivoFalso("b.png")} alt="Nueva foto" />
      );

      await waitFor(() => {
        expect(creadas).toHaveLength(2);
        expect(revocadas).toContain("blob:falso-1");
      });
      // La nueva sigue en uso.
      expect(revocadas).not.toContain("blob:falso-2");
    });

    it("limpia la vista si se saca el archivo", async () => {
      const { rerender } = render(
        <VistaPreviaArchivo archivo={archivoFalso()} alt="Nueva foto" />
      );
      await screen.findByAltText("Nueva foto");

      rerender(<VistaPreviaArchivo archivo={null} alt="Nueva foto" />);

      await waitFor(() =>
        expect(screen.queryByAltText("Nueva foto")).not.toBeInTheDocument()
      );
    });
  });
});
