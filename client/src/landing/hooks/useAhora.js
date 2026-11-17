import { useEffect, useState } from "react";
import ParaguayDateUtil from "../../utils/paraguayDate";

/**
 * "Ahora" en hora de Asunción, que se actualiza cada minuto. Lo usan el
 * estado de apertura y la agenda, para que un turno que acaba de empezar deje
 * de ofrecerse sin recargar la página.
 */
export const useAhora = (cadaMs = 60_000) => {
  const [ahora, setAhora] = useState(() => ParaguayDateUtil.now());

  useEffect(() => {
    const id = setInterval(() => setAhora(ParaguayDateUtil.now()), cadaMs);
    return () => clearInterval(id);
  }, [cadaMs]);

  return ahora;
};
