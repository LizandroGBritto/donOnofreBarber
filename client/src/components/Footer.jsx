import Location from "../assets/Location on.svg";
import Maps from "../assets/Google Maps Old.svg";
import Whatsapp from "../assets/Whatsapp.svg";
import Instagram from "../assets/Instagram.svg";

const Footer = ({ footerRef }) => {
  return (
    <>
      <div ref={footerRef} className="flex justify-evenly items-center mb-3">
        <div className="pb-10">
          <h3 className="flex justify-center mt-8 ml-8 mr-8 border-b-2 border-gray-300 pb-2 pl-4 pr-4">
            UBICACION
          </h3>
          <div className="flex justify-center items-baseline ">
            <img src={Location} alt="Location" className="mr-1" />
            <p className="flex justify-center ">Asuncion - Paraguay</p>
          </div>
          <div className="flex justify-center items-baseline mt-2 mr-2">
            <a className="flex" href="https://g.co/kgs/6UKZTmH">
              <img src={Maps} alt="Location" className="mr-1 ml-5 mb-5" />
              <p className="flex justify-center text-[#FF7D00]">
                Toca Aquí para ver en
                <br />
                Google Maps
              </p>
            </a>
          </div>
        </div>
        <div className="">
          <h3 className="flex justify-center mt-8 ml-8 mr-8 border-b-2 border-gray-300 pb-2 pl-4 pr-4">
            CONTACTO
          </h3>
          <div className="flex justify-center items-baseline">
            <a
              href="https://wa.me/595994622020"
              target="_blank"
              rel="noopener noreferrer"
              className="flex"
            >
              <img src={Whatsapp} alt="Whatsapp" className="mr-1" />

              <p className="flex">+595 994 622 020</p>
            </a>
          </div>

          <div className="flex justify-center items-baseline mt-10 mb-9">
            <a
              className="flex"
              href="https://www.instagram.com/acapuedo/?hl=es"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={Instagram} alt="Instagram" className="mr-1" />
              <p className="flex justify mr-7">@acapuedo</p>
            </a>
          </div>
        </div>
      </div>
      <div className="bg-white">
        <h6 className="text-black flex justify-center text-xs">
          © 2024 Alonzo Style. Todos los derechos reservados.
        </h6>
      </div>
    </>
  );
};

export default Footer;
