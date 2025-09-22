import AdminDashboard from "../components/AdminDashboard";
import Footer from "../components/Footer";
import backgroundImage from "../assets/assets_template/AlonzoStylev2.png";
import { useEffect } from "react";

const Admin = () => {
  useEffect(() => {
    // Función para obtener o crear un userId único
    const generateUUID = () => {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };

    const getUserId = () => {
      let userId = localStorage.getItem("userId");
      if (!userId) {
        userId = generateUUID();
        localStorage.setItem("userId", userId);
      }
      return userId;
    };

    const userId = getUserId();
    console.log("User ID:", userId);
  }, []);

  return (
    <>
      <div>
        <div    style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
      }}>
          <AdminDashboard />
          <Footer />
        </div>
      </div>
    </>
  );
};

export default Admin;
