import { Link } from "react-router-dom";
import estilos from "./Pie.module.css";

/** Pie de la landing. El acceso del equipo queda discreto, sin competir con reservar. */
const Pie = () => (
  <footer className={estilos.pie}>
    <p>Alonzo Style. Tu estilo, nuestra pasión.</p>
    <p>
      <Link className={estilos.equipo} to="/admin">
        Acceso del equipo
      </Link>
    </p>
  </footer>
);

export default Pie;
