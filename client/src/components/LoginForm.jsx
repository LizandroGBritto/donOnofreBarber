import { Button, Checkbox, Label, TextInput } from "flowbite-react";
import * as Yup from "yup";
import { ErrorMessage, Formik, Field, Form } from "formik";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import UserContext from "../context/UserContext";

const LoginForm = ({ formType }) => {
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();

  const handleSubmit = (values, { setSubmitting, setErrors, resetForm }) => {
    if (formType === "Registrarse") {
      registerUser(values, setErrors);
    } else {
      loginUser(values, setErrors);
    }
    setSubmitting(false);
    resetForm();
  };

  const registerUser = async (values, setErrors) => {
    try {
      await axios.post(
        "http://localhost:8000/api/auth/register",
        {
          userName: values.userName,
          password: values.password,
        },
        { withCredentials: true }
      );
      loginUser(values, setErrors);
    } catch (err) {
      console.log("Error: ", err.response);
      setErrors({ general: err.response?.data?.msg || "Error desconocido" });
    }
  };

  const loginUser = async (values, setErrors) => {
    try {
      let res = await axios.post(
        "http://localhost:8000/api/auth/login",
        {
          userName: values.userName,
          password: values.password,
        },
        { withCredentials: true }
      );
      setUser(res.data.user);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/admin/panel");
    } catch (err) {
      console.log("Error: ", err.response);
      setErrors({ general: err.response?.data?.msg || "Error desconocido" });
    }
  };

  const validationSchema = Yup.object().shape({
    userName: Yup.string().required("Usuario es requerido"),
    password: Yup.string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .required("Contraseña es requerida"),
    ...(formType === "Registrarse"
      ? {
          confirmPassword: Yup.string()
            .oneOf(
              [Yup.ref("password"), null],
              "Las contraseñas deben coincidir"
            )
            .required("Confirme la contraseña"),
        }
      : {}),
  });

  return (
    <Formik
      initialValues={{
        userName: "",
        password: "",
        ...(formType === "Registrarse" ? { confirmPassword: "" } : {}),
      }}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {({ isSubmitting, errors }) => (
        <>
          <Form className="flex max-w-md flex-col gap-4 bg-slate-200 p-6 rounded-lg shadow-lg bg-opacity-90">
            <h2 className="text-pretty font-semibold text-gray-800 mb-3">
              {formType === "Iniciar Sesion" ? "Iniciar Sesion" : "Registrarse"}
            </h2>
            {errors?.general && (
              <div className="text-red-600">{errors.general}</div>
            )}

            <div>
              <div className="mb-2 block">
                <Label htmlFor="userName">Nombre de Usuario</Label>
              </div>
              <Field
                as={TextInput}
                id="userName"
                name="userName"
                type="text"
                placeholder="Nombre de Usuario"
                className="text-zinc-950"
              />
              <ErrorMessage
                name="userName"
                component="div"
                className="text-red-600"
              />
            </div>

            <div>
              <div className="mb-2 block">
                <Label htmlFor="password">Contraseña</Label>
              </div>
              <Field
                as={TextInput}
                id="password"
                name="password"
                type="password"
                placeholder="Contraseña"
                className="text-zinc-950"
              />
              <ErrorMessage
                name="password"
                component="div"
                className="text-red-600"
              />
            </div>

            {formType === "Registrarse" && (
              <div>
                <div className="mb-2 block">
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                </div>
                <Field
                  as={TextInput}
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirmar Contraseña"
                  className="text-zinc-950"
                />
                <ErrorMessage
                  name="confirmPassword"
                  component="div"
                  className="text-red-600"
                />
              </div>
            )}

            <Button
              className="bg-[var(--primary-color)]"
              type="submit"
              disabled={isSubmitting}
            >
              {formType === "Iniciar Sesion" ? "Entrar" : "Registrarse"}
            </Button>
            <Button
              className="bg-gray-500 hover:bg-gray-700 text-white mt-4"
              onClick={() => navigate("/")}
            >
              Volver
            </Button>
          </Form>
        </>
      )}
    </Formik>
  );
};

export default LoginForm;
