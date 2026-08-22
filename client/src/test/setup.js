import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// VITE_API_URL no existe cuando corren los tests: se fija acá para que las
// URLs que arman los componentes sean estables y comparables en las
// aserciones.
import.meta.env.VITE_API_URL = "http://test.local";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});
