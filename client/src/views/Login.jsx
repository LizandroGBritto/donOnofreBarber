import LoginForm from "../components/LoginForm";

const Login = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-black bg-opacity-50 pb-[50%]">
      <div className="flex justify-center">
        <LoginForm formType="Iniciar Sesion" />
      </div>
    </div>
  );
};

export default Login;
