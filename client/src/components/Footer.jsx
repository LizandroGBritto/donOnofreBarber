import Location from "../assets/Location on.svg";
import Maps from "../assets/Google Maps Old.svg";
import Whatsapp from "../assets/Whatsapp.svg";
import Instagram from "../assets/Instagram.svg";

const Footer = ({ footerRef }) => {
  return (
    <>
      <div
        ref={footerRef}
        className="bg-white bg-opacity-80 rounded-lg mx-4 mb-4 p-6 backdrop-blur-sm"
      >
        <div className="flex flex-col md:flex-row justify-evenly items-center gap-6">
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-purple-300">
              UBICACION
            </h3>
            <div className="flex justify-center items-center mb-3">
              <img src={Location} alt="Location" className="mr-2" />
              <p className="text-gray-900 font-medium">Asuncion - Paraguay</p>
            </div>
            <div className="flex justify-center items-center">
              <a
                className="flex items-center hover:text-purple-600 transition-colors duration-200"
                href="https://g.co/kgs/6UKZTmH"
              >
                <img src={Maps} alt="Location" className="mr-2" />
                <p className="text-orange-500 hover:text-orange-600 text-sm">
                  Toca Aquí para ver en Google Maps
                </p>
              </a>
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-purple-300">
              CONTACTO
            </h3>
            <div className="flex justify-center items-center mb-4">
              <a
                href="https://wa.me/595994622020"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center hover:text-green-600 transition-colors duration-200"
              >
                <img src={Whatsapp} alt="Whatsapp" className="mr-2" />
                <p className="text-gray-900 font-medium">+595 994 622 020</p>
              </a>
            </div>

            <div className="flex justify-center items-center">
              <a
                className="flex items-center hover:text-purple-600 transition-colors duration-200"
                href="https://www.instagram.com/acapuedo/?hl=es"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={Instagram} alt="Instagram" className="mr-2" />
                <p className="text-gray-900 font-medium">@acapuedo</p>
              </a>
            </div>
          </div>
        </div>
        <div className="bg-white bg-opacity-60 rounded-lg p-2 mt-4">
          <h6 className="text-gray-900 text-center text-xs font-medium">
            © 2024 Alonzo Style. Todos los derechos reservados.
          </h6>
        </div>
      </div>
    </>
  );
};

export default Footer;
