import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import estilos from "./Info.module.css";
import PropTypes from "prop-types";

/**
 * Mapa de OpenStreetMap en modo oscuro (teselas "Dark Matter" de CARTO).
 *
 * Va en su propio chunk (React.lazy desde Ubicacion.jsx): Leaflet solo se baja
 * cuando la sección está por verse. El marcador es un divIcon con los colores
 * del tema, así no depende de las imágenes por defecto de Leaflet, que se
 * rompen con el empaquetado de Vite.
 *
 * En celulares el mapa no se arrastra con un dedo: si no, deslizar la página
 * por encima del mapa lo movería en vez de bajar.
 */
const TESELAS = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const ATRIBUCION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const MapaOscuro = ({ lat, lng, nombre = "Alonzo Style", zoom = 16 }) => {
  const contenedorRef = useRef(null);

  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return undefined;

    const tactil = L.Browser.mobile || L.Browser.touch;
    const mapa = L.map(el, {
      center: [lat, lng],
      zoom,
      scrollWheelZoom: false,
      dragging: !tactil,
      tap: false,
      attributionControl: true,
    });

    L.tileLayer(TESELAS, {
      attribution: ATRIBUCION,
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(mapa);

    const icono = L.divIcon({
      className: estilos.marcador,
      html: `<span class="${estilos.halo}"></span><span class="${estilos.pin}"></span><span class="${estilos.etiquetaMapa}"></span>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
    const marcador = L.marker([lat, lng], { icon: icono, keyboard: false, title: nombre }).addTo(mapa);
    // El nombre se escribe como texto, nunca como HTML.
    marcador.getElement()?.querySelector(`.${estilos.etiquetaMapa}`)?.append(document.createTextNode(nombre));

    return () => mapa.remove();
  }, [lat, lng, nombre, zoom]);

  return (
    <div
      ref={contenedorRef}
      className={estilos.mapa}
      role="region"
      aria-label={`Mapa con la ubicación de ${nombre}`}
    />
  );
};

MapaOscuro.propTypes = {
  lat: PropTypes.number.isRequired,
  lng: PropTypes.number.isRequired,
  nombre: PropTypes.string,
  zoom: PropTypes.number,
};

export default MapaOscuro;
