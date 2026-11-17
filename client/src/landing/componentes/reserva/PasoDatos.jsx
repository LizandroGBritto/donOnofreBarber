import { forwardRef, useState } from "react";
import Aviso from "./Aviso";
import CabeceraPaso from "./CabeceraPaso";
import { celularValido, nombreValido } from "../../dominio/celular";
import { fechaLarga } from "../../dominio/agenda";
import { guaranies } from "../../dominio/formato";

import estilos from "./Reserva.module.css";
import PropTypes from "prop-types";
import * as T from "../../tiposProps";


/** Recibo con lo elegido. El total es estimado: el definitivo lo calcula el servidor. */
const Recibo = ({ barbero, turno, servicios }) => {
  const total = servicios.reduce((suma, s) => suma + (s.precio || 0), 0);
  return (
    <div className={estilos.recibo}>
      <div className={estilos.fila}>
        <span>Barbero</span>
        <span>{barbero.nombre}</span>
      </div>
      <div className={estilos.fila}>
        <span>Cuándo</span>
        <span>
          {fechaLarga(turno.fecha)}, {turno.hora}
        </span>
      </div>
      {servicios.map((s) => (
        <div key={s._id} className={estilos.fila}>
          <span>{s.nombre}</span>
          <span>{guaranies(s.precio)}</span>
        </div>
      ))}
      <div className={`${estilos.fila} ${estilos.total}`}>
        <span>Total</span>
        <span>{guaranies(total)}</span>
      </div>
    </div>
  );
};

const PasoDatos = forwardRef(function PasoDatos(
  { barbero, turno, servicios, nombre, celular, aviso, enviando, onCampo, onConfirmar, onVolver },
  tituloRef
) {
  // Los errores se muestran recién cuando la persona dejó el campo: marcar en
  // rojo mientras todavía está escribiendo no ayuda.
  const [tocados, setTocados] = useState({ nombre: false, celular: false });
  const tocar = (campo) => () => setTocados((t) => ({ ...t, [campo]: true }));

  const errorNombre = tocados.nombre && !nombreValido(nombre);
  const errorCelular = tocados.celular && celular.trim() !== "" && !celularValido(celular);

  const enviar = (e) => {
    e.preventDefault();
    setTocados({ nombre: true, celular: true });
    if (nombreValido(nombre) && celularValido(celular) && !enviando) onConfirmar();
  };

  return (
    <div>
      <CabeceraPaso
        ref={tituloRef}
        numero={4}
        titulo="Tus datos"
        bajada="Con tu nombre y celular el barbero confirma el turno."
        onVolver={onVolver}
        etiquetaVolver="Volver al paso anterior"
      />

      {aviso && <Aviso titulo={aviso.titulo}>{aviso.texto}</Aviso>}

      <form id="form-reserva" className={estilos.formulario} noValidate onSubmit={enviar}>
        <div className={estilos.campo}>
          <label htmlFor="reserva-nombre">Nombre completo</label>
          <input
            id="reserva-nombre"
            className={estilos.entrada}
            name="nombre"
            type="text"
            autoComplete="name"
            placeholder="Tu nombre completo"
            value={nombre}
            maxLength={60}
            aria-invalid={errorNombre}
            aria-describedby="reserva-nombre-ayuda"
            onChange={(e) => onCampo("nombre", e.target.value)}
            onBlur={tocar("nombre")}
          />
          <p id="reserva-nombre-ayuda" className={estilos.ayuda} data-error={errorNombre}>
            {errorNombre ? "Escribí tu nombre, solo letras, al menos 3." : ""}
          </p>
        </div>
        <div className={estilos.campo}>
          <label htmlFor="reserva-celular">Número de celular</label>
          <input
            id="reserva-celular"
            className={estilos.entrada}
            name="celular"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0981 123 456"
            value={celular}
            maxLength={20}
            aria-invalid={errorCelular}
            aria-describedby="reserva-celular-ayuda"
            onChange={(e) => onCampo("celular", e.target.value)}
            onBlur={tocar("celular")}
          />
          <p id="reserva-celular-ayuda" className={estilos.ayuda} data-error={errorCelular}>
            {errorCelular ? "Revisá el número. Si no es de Paraguay, escribilo con el código de país (+54…)." : ""}
          </p>
        </div>
      </form>

      <Recibo barbero={barbero} turno={turno} servicios={servicios} />
    </div>
  );
});

Recibo.propTypes = {
  barbero: T.barbero.isRequired,
  turno: T.turnoVista.isRequired,
  servicios: PropTypes.arrayOf(T.servicio).isRequired,
};

PasoDatos.propTypes = {
  barbero: T.barbero.isRequired,
  turno: T.turnoVista.isRequired,
  servicios: PropTypes.arrayOf(T.servicio).isRequired,
  nombre: PropTypes.string.isRequired,
  celular: PropTypes.string.isRequired,
  aviso: T.aviso,
  enviando: PropTypes.bool.isRequired,
  onCampo: PropTypes.func.isRequired,
  onConfirmar: PropTypes.func.isRequired,
  onVolver: PropTypes.func.isRequired,
};

export default PasoDatos;
