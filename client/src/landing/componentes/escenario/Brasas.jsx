import { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import * as T from "../../tiposProps";

const CANTIDAD = 38;

/**
 * Brasas violetas que suben sobre la mascota (canvas 2D, portado de la demo).
 * Se detiene fuera de pantalla, cuando la cortina tapó el escenario y con
 * movimiento reducido (en ese caso ni se monta).
 */
const Brasas = ({ className, progresoRef }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext?.("2d");
    if (!ctx) return undefined;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    let visible = true;
    let ultimo = performance.now();
    let cuadro = 0;

    const nueva = (inicial) => ({
      x: Math.random() * W,
      y: inicial ? Math.random() * H : H + 8,
      r: 0.8 + Math.random() * 2.2,
      v: 16 + Math.random() * 34,
      fase: Math.random() * 6.28,
      clara: Math.random() < 0.45,
    });
    let particulas = [];

    const ajustar = () => {
      const r = cv.getBoundingClientRect();
      W = r.width;
      H = r.height;
      if (!W || !H) return;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!particulas.length) particulas = Array.from({ length: CANTIDAD }, () => nueva(true));
    };
    ajustar();

    const observadorTamano = typeof ResizeObserver !== "undefined" ? new ResizeObserver(ajustar) : null;
    observadorTamano?.observe(cv);
    const observadorVista =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([e]) => {
            visible = e.isIntersecting;
            ultimo = performance.now();
          })
        : null;
    observadorVista?.observe(cv);

    const dibujar = (t) => {
      cuadro = requestAnimationFrame(dibujar);
      if (!visible || !W || (progresoRef?.current ?? 0) > 0.96) return;
      const dt = Math.min((t - ultimo) / 1000, 0.05);
      ultimo = t;
      ctx.clearRect(0, 0, W, H);
      particulas.forEach((p, i) => {
        p.y -= p.v * dt;
        p.x += Math.sin(t / 1100 + p.fase) * 0.22;
        if (p.y < -8) {
          particulas[i] = nueva(false);
          return;
        }
        const alfa = (Math.min(1, p.y / (H * 0.35)) * 0.85).toFixed(3);
        ctx.fillStyle = p.clara ? `rgba(215,180,255,${alfa})` : `rgba(150,100,255,${alfa})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fill();
      });
    };
    cuadro = requestAnimationFrame(dibujar);

    return () => {
      cancelAnimationFrame(cuadro);
      observadorTamano?.disconnect();
      observadorVista?.disconnect();
    };
  }, [progresoRef]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
};

Brasas.propTypes = { className: PropTypes.string, progresoRef: T.ref };

export default Brasas;
