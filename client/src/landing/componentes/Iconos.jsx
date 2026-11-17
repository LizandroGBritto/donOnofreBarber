import PropTypes from "prop-types";
/* Íconos de trazo de la demo. Decorativos: el texto accesible va en el botón. */

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: "false",
};

export const IconoVolver = ({ tamano = 22 }) => (
  <svg {...base} width={tamano} height={tamano} strokeWidth="2.4">
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);

export const IconoCopiar = ({ tamano = 20 }) => (
  <svg {...base} width={tamano} height={tamano} strokeWidth="2">
    <rect x="9" y="9" width="12" height="12" rx="2.5" />
    <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
  </svg>
);

export const IconoTilde = ({ tamano = 16 }) => (
  <svg width={tamano} height={tamano} viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
    <path d="M3 8.5l3.2 3.2L13 4.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconoInstagram = ({ tamano = 18, className }) => (
  <svg {...base} width={tamano} height={tamano} strokeWidth="2" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r=".6" fill="currentColor" />
  </svg>
);

export const IconoAtencion = ({ tamano = 20 }) => (
  <svg {...base} width={tamano} height={tamano} strokeWidth="2.2">
    <path d="M12 3l9.5 17h-19z" />
    <path d="M12 10v4M12 17.5v.5" />
  </svg>
);

export const IconoCampana = ({ tamano = 28 }) => (
  <svg {...base} width={tamano} height={tamano} strokeWidth="2">
    <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" />
    <path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" />
  </svg>
);

export const IconoCorazon = ({ tamano = 16 }) => (
  <svg {...base} width={tamano} height={tamano} strokeWidth="2.2">
    <path d="M12 20s-7.5-4.6-9-9.3C2 7.4 4.2 4.5 7.3 4.5c2 0 3.6 1.1 4.7 2.8 1.1-1.7 2.7-2.8 4.7-2.8 3.1 0 5.3 2.9 4.3 6.2C19.5 15.4 12 20 12 20z" />
  </svg>
);

export const IconoComentario = ({ tamano = 16 }) => (
  <svg {...base} width={tamano} height={tamano} strokeWidth="2.2">
    <path d="M20.5 11.5a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1.4-4.4A8.5 8.5 0 1 1 20.5 11.5z" />
  </svg>
);

const propsIcono = { tamano: PropTypes.number };
IconoVolver.propTypes = propsIcono;
IconoCopiar.propTypes = propsIcono;
IconoTilde.propTypes = propsIcono;
IconoInstagram.propTypes = { ...propsIcono, className: PropTypes.string };
IconoAtencion.propTypes = propsIcono;
IconoCampana.propTypes = propsIcono;
IconoCorazon.propTypes = propsIcono;
IconoComentario.propTypes = propsIcono;
