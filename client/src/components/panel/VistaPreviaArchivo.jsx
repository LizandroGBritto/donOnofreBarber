import { useState, useEffect } from "react";

/**
 * Vista previa de un archivo de imagen todavía no subido.
 *
 * Existe para dos cosas:
 *
 * 1. Los inputs de foto/logo del barbero no tenían preview: mostraban solo la
 *    imagen ya guardada, así que al elegir un archivo nuevo no cambiaba nada
 *    en pantalla y no había forma de saber si se había elegido el correcto.
 *
 * 2. Donde sí había preview se llamaba `URL.createObjectURL(archivo)` dentro
 *    del render. Eso crea un blob URL NUEVO en cada re-render y ninguno se
 *    libera: con el modal abierto y tipeando en otro campo, cada tecla dejaba
 *    un objeto colgado en memoria. Acá la URL se crea una sola vez por archivo
 *    y se revoca al desmontar o al cambiar de archivo.
 */
const VistaPreviaArchivo = ({ archivo, alt, etiqueta, className }) => {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!archivo) {
      setUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(archivo);
    setUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [archivo]);

  if (!url) return null;

  return (
    <div className="mt-2">
      <img src={url} alt={alt} className={className} />
      {etiqueta && <p className="text-xs text-green-600">{etiqueta}</p>}
    </div>
  );
};

export default VistaPreviaArchivo;
