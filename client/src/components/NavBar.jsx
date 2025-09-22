import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import DownButton from "../assets/DownButton.svg";
import logoCenter from "../assets/logoCenter.webp";
import backImg from "../assets/bg2.webp";

const NavBar = ({ agendarRef, footerRef }) => {
  const navigate = useNavigate();
  const [banners, setBanners] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar si es mobile o desktop
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // Cargar banners activos
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await axios.get("http://localhost:8000/api/banners");
        const activeBanners = response.data.banners.filter(
          (banner) => banner.estado === "activo"
        );
        setBanners(activeBanners);
      } catch (error) {
        console.error("Error al cargar banners:", error);
      }
    };

    fetchBanners();
  }, []);

  // Transición automática entre banners
  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBannerIndex((prevIndex) => (prevIndex + 1) % banners.length);
      }, 5000); // Cambiar cada 5 segundos

      return () => clearInterval(interval);
    }
  }, [banners.length]);

  // Obtener banner apropiado para la versión actual
  const getCurrentBanner = () => {
    if (banners.length === 0) return null;

    const targetVersion = isMobile ? "mobile" : "escritorio";

    // Buscar banner para la versión específica
    let appropriateBanner = banners.find(
      (banner) => banner.version === targetVersion
    );

    // Si no hay para la versión específica, usar cualquier banner disponible
    if (!appropriateBanner && banners.length > 0) {
      appropriateBanner = banners[currentBannerIndex];
    }

    return appropriateBanner;
  };

  const currentBanner = getCurrentBanner();
  const backgroundImage = currentBanner?.imagen
    ? `http://localhost:8000/uploads/${currentBanner.imagen}`
    : backImg;

  const scrollToAgendar = () => {
    if (agendarRef.current) {
      agendarRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToFooter = () => {
    if (footerRef.current) {
      footerRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const goToAdmin = () => {
    navigate("/admin");
  };

  return (
    <div
      className="bg-cover bg-no-repeat h- relative transition-all duration-1000 ease-in-out"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div
        className="navBar flex justify-evenly items-center bg-white bg-opacity-20 backdrop-blur-sm p-4 rounded-lg mx-4 mt-4"
        id="home"
      >
        <div className="iconD ml-2">
          <ol className="flex items-center space-x-4">
            <li className="flex items-center">
              <button
                onClick={scrollToFooter}
                className="text-gray-900 hover:text-purple-600 font-medium transition-colors duration-200"
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
                className="text-gray-900 hover:text-purple-600 font-medium transition-colors duration-200"
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
