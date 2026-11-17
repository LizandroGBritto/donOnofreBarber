import { useRef } from "react";
import { IconoCopiar } from "../Iconos";
import { useNotificar } from "../notificar";
import { soloDigitos, urlExterna, usuarioInstagram } from "../../dominio/formato";
import { copiar } from "../../dominio/portapapeles";
import comunes from "../../estilos/comunes.module.css";
import estilos from "./Info.module.css";
import PropTypes from "prop-types";
import * as T from "../../tiposProps";


const Fila = ({ etiqueta, valor, paraCopiar }) => {
  const valorRef = useRef(null);
  const notificar = useNotificar();
  return (
    <div className={estilos.fila}>
      <div>
        <small>{etiqueta}</small>
        <span ref={valorRef} className={estilos.valor}>
          {valor}
        </span>
      </div>
      <button
        className={estilos.copiar}
        type="button"
        aria-label={`Copiar ${etiqueta.toLowerCase()}`}
        onClick={async () =>
          notificar((await copiar(paraCopiar, valorRef.current)) ? "Copiado" : "Seleccioná y copiá el texto")
        }
      >
        <IconoCopiar />
      </button>
    </div>
  );
};

const Contacto = ({ contacto }) => {
  const usuario = usuarioInstagram(contacto.instagram);
  const perfil = urlExterna(contacto.instagramUrl) || (usuario ? `https://www.instagram.com/${usuario}/` : null);
  const whatsapp = soloDigitos(contacto.whatsapp);

  return (
    <div className={estilos.bloque}>
      <h3 className={comunes.subtitulo}>Contacto</h3>
      {contacto.whatsapp && <Fila etiqueta="Celular" valor={contacto.whatsapp} paraCopiar={contacto.whatsapp} />}
      {usuario && <Fila etiqueta="Instagram" valor={`@${usuario}`} paraCopiar={`@${usuario}`} />}
      {contacto.correo && <Fila etiqueta="Correo" valor={contacto.correo} paraCopiar={contacto.correo} />}
      <div className={estilos.enlaces}>
        {whatsapp && (
          <a
            className={`${comunes.btn} ${comunes.fantasma}`}
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
        )}
        {perfil && (
          <a className={`${comunes.btn} ${comunes.fantasma}`} href={perfil} target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
        )}
      </div>
    </div>
  );
};

Fila.propTypes = {
  etiqueta: PropTypes.string.isRequired,
  valor: PropTypes.node.isRequired,
  paraCopiar: PropTypes.string,
};

Contacto.propTypes = { contacto: T.contacto.isRequired };

export default Contacto;
