import { useEffect, useRef, useState } from "react";
import { useMovimientoReducido } from "../../hooks/useMovimientoReducido";
import { hexARgb, montarPoste } from "./poste3d";
import estilos from "./Encabezado.module.css";
import PropTypes from "prop-types";

/**
 * Poste del encabezado. Arranca como poste de CSS (se ve desde el primer
 * cuadro) y, si el navegador tiene WebGL, se reemplaza por el 3D cuando
 * three.js termina de bajar. Gira mientras el local está abierto.
 */
const PosteBarbero = ({ girando }) => {
  const contenedorRef = useRef(null);
  const canvasRef = useRef(null);
  const posteRef = useRef(null);
  const [es3d, setEs3d] = useState(false);
  const movimientoReducido = useMovimientoReducido();

  useEffect(() => {
    let cancelado = false;
    const contenedor = contenedorRef.current;
    const canvas = canvasRef.current;
    if (!contenedor || !canvas) return undefined;

    const css = getComputedStyle(contenedor);
    const leer = (nombre, defecto) => css.getPropertyValue(nombre).trim() || defecto;
    const a = hexARgb(leer("--pole-a", "#6A3DE0"));
    const b = hexARgb(leer("--pole-b", "#CFCBDA"));
    const c = hexARgb(leer("--pole-c", "#E06A00"));

    // three.js se baja acá adentro (import dinámico en poste3d.js).
    montarPoste(canvas, contenedor, {
      colores: [a, b, c, b],
      tapa: leer("--cap", "#8D8AA0"),
      movimientoReducido,
    })
      .then((poste) => {
        if (cancelado) {
          poste.destruir();
          return;
        }
        posteRef.current = poste;
        setEs3d(true);
      })
      .catch(() => {
        // Sin WebGL o sin red para bajar three.js: queda el poste de CSS.
      });

    return () => {
      cancelado = true;
      posteRef.current?.destruir();
      posteRef.current = null;
    };
  }, [movimientoReducido]);

  useEffect(() => {
    posteRef.current?.setGirando(girando);
  }, [girando, es3d]);

  return (
    <span
      ref={contenedorRef}
      className={estilos.poste}
      data-3d={es3d}
      aria-hidden="true"
      onPointerDown={() => posteRef.current?.empujar()}
    >
      <canvas ref={canvasRef} className={estilos.posteCanvas} />
      <span className={estilos.posteCss} data-girando={girando} />
    </span>
  );
};

PosteBarbero.propTypes = { girando: PropTypes.bool };

export default PosteBarbero;
