// Maneja sesión expirada/inválida de forma centralizada: cualquier request
// (venga del cliente axios por defecto o de la instancia de useApi.js) que
// reciba un 401 mientras se está en el panel admin limpia el usuario
// guardado y redirige al login. Sin esto, un token vencido dejaba el panel
// "adentro" (porque App.jsx solo mira si hay un user en localStorage, no si
// el token del servidor sigue siendo válido) mostrando errores 401 en
// consola en cada pantalla sin explicación ni salida.
export const attachSessionExpiredHandler = (axiosInstance) => {
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      const isUnauthorized = error.response?.status === 401;
      const isAdminRoute = window.location.pathname.startsWith("/admin");

      if (isUnauthorized && isAdminRoute) {
        localStorage.removeItem("user");

        if (window.location.pathname !== "/admin") {
          window.location.href = "/admin?sessionExpired=1";
        }
      }

      return Promise.reject(error);
    }
  );
};
