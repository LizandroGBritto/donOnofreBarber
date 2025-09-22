import LoginForm from "../components/LoginForm";
import backgroundImage from "../assets/assets_template/AlonzoStylev2.png";

const Login = () => {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4 bg-black bg-opacity-50 pb-[50%]"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="flex justify-center">
        <LoginForm formType="Iniciar Sesion" />
      </div>
    </div>
  );
};

export default Login;
