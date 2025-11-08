import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import DownButton from "../assets/DownButton.svg";
import logoCenter from "../assets/assets_template/AlonzoStylev2.webp";
import backImg from "../assets/bg2.webp";

const NavBar = ({ agendarRef, footerRef }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [banners, setBanners] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const imageCacheRef = useRef(new Set()); // ✅ Usar useRef en lugar de useState para evitar re-renders

  // Detectar si es mobile o desktop con debounce
  useEffect(() => {
    let timeoutId;
    const checkIsMobile = () => {
      // ✅ Debounce para evitar múltiples re-renders
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth < 768);
      }, 150);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);

  // Cargar banners activos y precargar imágenes con link preload
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/banners`
        );
        const activeBanners = response.data.banners.filter(
          (banner) => banner.estado === "activo"
        );
        setBanners(activeBanners);

        // Precargar todas las imágenes de los banners usando link preload (mayor prioridad)
        activeBanners.forEach((banner) => {
          if (banner.imagen && !imageCacheRef.current.has(banner.imagen)) {
            const imageUrl = `${import.meta.env.VITE_API_URL}/uploads/${
              banner.imagen
            }`;

            // Usar link preload para mayor prioridad
            const link = document.createElement("link");
            link.rel = "preload";
            link.as = "image";
            link.href = imageUrl;
            document.head.appendChild(link);

            // Marcar en cache
            imageCacheRef.current.add(banner.imagen);

            // También crear Image() como respaldo
            const img = new Image();
            img.src = imageUrl;
          }
        });
      } catch (error) {
        console.error("Error al cargar banners:", error);
      }
    };

    fetchBanners();
  }, []); // ✅ Sin dependencias - solo ejecutar una vez

  // Transición automática entre banners
  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentBannerIndex(
            (prevIndex) => (prevIndex + 1) % banners.length
          );
          setIsTransitioning(false);
        }, 200); // Duración de la transición
      }, 4000); // Cambiar cada 4 segundos

      return () => clearInterval(interval);
    }
  }, [banners.length]);

  // Función para navegar manualmente al banner anterior
  const goToPrevBanner = () => {
    if (banners.length > 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentBannerIndex((prevIndex) =>
          prevIndex === 0 ? banners.length - 1 : prevIndex - 1
        );
        setIsTransitioning(false);
      }, 200);
    }
  };

  // Función para navegar manualmente al banner siguiente
  const goToNextBanner = () => {
    if (banners.length > 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentBannerIndex((prevIndex) => (prevIndex + 1) % banners.length);
        setIsTransitioning(false);
      }, 200);
    }
  };

  // Función para ir a un banner específico
  const goToBanner = (index) => {
    if (index !== currentBannerIndex && banners.length > 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentBannerIndex(index);
        setIsTransitioning(false);
      }, 200);
    }
  };

  // Obtener banners apropiados para la versión actual
  const getAppropiateBanners = () => {
    if (banners.length === 0) return [];

    const targetVersion = isMobile ? "mobile" : "escritorio";

    // Filtrar banners para la versión específica o "ambos"
    const appropriateBanners = banners.filter(
      (banner) => banner.version === targetVersion || banner.version === "ambos"
    );

    // Si no hay banners específicos, usar todos los disponibles
    return appropriateBanners.length > 0 ? appropriateBanners : banners;
  };

  const appropriateBanners = getAppropiateBanners();
  const currentBanner =
    appropriateBanners[currentBannerIndex % appropriateBanners.length];

  // Determinar la imagen de fondo
  // Prioridad: Banner > backImg
  const backgroundImage = currentBanner?.imagen
    ? `${import.meta.env.VITE_API_URL}/uploads/${currentBanner.imagen}`
    : backImg;

  // Funciones de navegación memoizadas
  const scrollToAgendar = useCallback(() => {
    if (agendarRef.current) {
      agendarRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [agendarRef]);

  const scrollToFooter = useCallback(() => {
    if (footerRef.current) {
      footerRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [footerRef]);

  const goToAdmin = useCallback(() => {
    navigate("/admin");
  }, [navigate]);

  return (
    <div
      className={`bg-cover bg-no-repeat bg-center h-screen relative transition-all duration-700 ease-in-out ${
        isTransitioning ? "opacity-90" : "opacity-100"
      }`}
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div
        className="navBar flex justify-evenly items-center backdrop-blur-sm p-4 rounded-lg mx-4 mt-4"
        style={{ backgroundColor: "rgba(41, 7, 64, 0.2)" }}
        id="home"
      >
        <div className="iconD ml-2">
          <ol className="flex items-center space-x-4">
            <li className="flex items-center">
              <button
                onClick={scrollToFooter}
                className="text-white hover:text-gray-200 font-medium transition-colors duration-200"
              >
                Contactame
              </button>
              <img
                src={DownButton}
                alt="Down Button"
                className="ml-1 w-4 h-4"
              />
            </li>
          </ol>
        </div>
        <div className="flex">
          <img
            src={logoCenter}
            alt="Logo Center"
            className="w-10 rounded-full cursor-pointer"
            onClick={goToAdmin}
          />
        </div>
        <div className="iconI mr-2">
          <ol className="flex items-center space-x-4">
            <li className="flex items-center">
              <button
                onClick={scrollToFooter}
                className="text-white hover:text-gray-200 font-medium transition-colors duration-200"
              >
                Ubicación
              </button>
              <img
                src={DownButton}
                alt="Down Button"
                className="ml-1 w-4 h-4"
              />
            </li>
          </ol>
        </div>
      </div>

      {/* Controles del carrusel */}
      {appropriateBanners.length > 1 && (
        <>
          {/* Flechas de navegación */}
          <button
            onClick={goToPrevBanner}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-200 z-10"
            aria-label="Banner anterior"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            onClick={goToNextBanner}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-200 z-10"
            aria-label="Banner siguiente"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          {/* Indicadores de posición */}
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
            {appropriateBanners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToBanner(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentBannerIndex % appropriateBanners.length
                    ? "bg-white"
                    : "bg-white bg-opacity-50 hover:bg-opacity-75"
                }`}
                aria-label={`Ir al banner ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}

      <div className="flex items-center flex-col mt-80 h-60 bg-black bg-opacity-50 p-6">
        <h2 className="text-4xl tracking-[0.05em] ">ALONZO STYLE</h2>
        <h3 className="tracking-[0.5em] mt-2 mb-2">CREANDO TU ESTILO</h3>
        <button
          className="bg-[#FF7D00] text-white py-2 px-4 rounded-md transition duration-300 ease-in-out transform hover:bg-orange-600 hover:scale-105"
          onClick={scrollToAgendar}
        >
          {location.pathname === "/admin/panel"
            ? "ADMINISTRAR TURNOS"
            : "RESERVAR TURNO"}
        </button>
      </div>
    </div>
  );
};

export default NavBar;
