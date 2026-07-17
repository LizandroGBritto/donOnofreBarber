import AdminDashboard from "../components/AdminDashboard";
import Footer from "../components/Footer";
import backgroundImage from "../assets/assets_template/AlonzoStylev2.webp";

const Admin = () => {
  return (
    <>
      <div>
        <div
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundAttachment: "fixed",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
          }}
        >
          <AdminDashboard />
          <Footer />
        </div>
      </div>
    </>
  );
};

export default Admin;
