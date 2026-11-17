import { IconoAtencion } from "../Iconos";
import estilos from "./Reserva.module.css";
import PropTypes from "prop-types";

/**
 * Aviso al cliente. Siempre como advertencia, con el título "Atención" por
 * defecto (convención de la agencia): lo que se avisa es algo que el cliente
 * puede resolver, no "el sitio se rompió".
 */
const Aviso = ({ titulo = "Atención", children, accion }) => (
  <div className={estilos.aviso} role="alert">
    <span className={estilos.avisoIcono}>
      <IconoAtencion />
    </span>
    <div>
      <p className={estilos.avisoTitulo}>{titulo}</p>
      <div className={estilos.avisoTexto}>{children}</div>
      {accion}
    </div>
  </div>
);

Aviso.propTypes = {
  titulo: PropTypes.string,
  children: PropTypes.node,
  accion: PropTypes.node,
};

export default Aviso;
