/**
 * Poste de barbero 3D (three.js), portado de la demo.
 *
 * Se importa dinámicamente: three.js pesa y no hace falta para pintar la
 * página. Si no hay WebGL, `montarPoste` lanza y el componente se queda con el
 * poste de CSS.
 *
 * Diferencias con la demo, por la versión de three.js: `outputColorSpace` en
 * lugar de `outputEncoding`, y las luces con intensidad × π y sin caída por
 * distancia, que es como se ven igual que con las luces "legacy" de antes.
 */
export async function montarPoste(canvas, contenedor, { colores, tapa, movimientoReducido }) {
  const T = await import("three");

  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;

  const escena = new T.Scene();
  const camara = new T.PerspectiveCamera(32, 1, 0.1, 60);
  camara.position.set(0, 0, 10);

  // Textura de franjas diagonales con los colores del tema.
  const s = 256;
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = s;
  const ctx = lienzo.getContext("2d");
  const img = ctx.createImageData(s, s);
  const banda = 32;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const k = colores[Math.floor(((x + y) % s) / banda) % colores.length];
      const i = (y * s + x) * 4;
      img.data[i] = k[0];
      img.data[i + 1] = k[1];
      img.data[i + 2] = k[2];
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const textura = new T.CanvasTexture(lienzo);
  textura.wrapS = textura.wrapT = T.RepeatWrapping;
  textura.repeat.set(1, 0.75);
  textura.colorSpace = T.SRGBColorSpace;

  const poste = new T.Group();
  escena.add(poste);
  const cuerpo = new T.Mesh(
    new T.CylinderGeometry(0.62, 0.62, 3.4, 40, 1, true),
    new T.MeshPhongMaterial({ map: textura, shininess: 70, specular: 0x666677, side: T.DoubleSide })
  );
  poste.add(cuerpo);

  const cromo = new T.MeshPhongMaterial({ color: new T.Color(tapa), specular: 0xffffff, shininess: 95 });
  for (const signo of [1, -1]) {
    const collar = new T.Mesh(new T.CylinderGeometry(0.72, 0.72, 0.16, 32), cromo);
    collar.position.y = signo * 1.78;
    poste.add(collar);
    const cupula = new T.Mesh(new T.SphereGeometry(0.68, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), cromo);
    cupula.position.y = signo * 1.86;
    if (signo < 0) cupula.rotation.x = Math.PI;
    poste.add(cupula);
  }
  poste.rotation.x = 0.05;

  escena.add(new T.AmbientLight(0xbbaadd, 0.85 * Math.PI));
  const clave = new T.DirectionalLight(0xffffff, 0.9 * Math.PI);
  clave.position.set(3, 4, 6);
  escena.add(clave);
  const relleno = new T.PointLight(0xff7d00, 1 * Math.PI, 20, 0);
  relleno.position.set(3, -2, 4);
  escena.add(relleno);

  const ajustar = () => {
    const w = contenedor.clientWidth;
    const h = contenedor.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
  };
  ajustar();
  const observadorTamano = typeof ResizeObserver !== "undefined" ? new ResizeObserver(ajustar) : null;
  observadorTamano?.observe(contenedor);

  let girando = true;
  let impulso = 0;
  let visible = true;
  let ultimo = performance.now();
  let cuadro = 0;
  if (movimientoReducido) cuerpo.rotation.y = 0.6;

  const observadorVista =
    typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([e]) => {
          visible = e.isIntersecting;
          ultimo = performance.now();
        })
      : null;
  observadorVista?.observe(contenedor);

  const dibujar = (t) => {
    cuadro = requestAnimationFrame(dibujar);
    if (!visible) return;
    const dt = Math.min((t - ultimo) / 1000, 0.05);
    ultimo = t;
    if (!movimientoReducido) cuerpo.rotation.y += ((girando ? 1.1 : 0) + impulso) * dt;
    impulso *= Math.pow(0.05, dt);
    renderer.render(escena, camara);
  };
  cuadro = requestAnimationFrame(dibujar);

  return {
    /** Gira mientras el local está abierto; se frena cuando cierra. */
    setGirando(valor) {
      girando = Boolean(valor);
    },
    /** Tocar el poste le da un empujón. */
    empujar() {
      if (!movimientoReducido) impulso = Math.min(impulso + 7, 14);
    },
    destruir() {
      cancelAnimationFrame(cuadro);
      observadorTamano?.disconnect();
      observadorVista?.disconnect();
      escena.traverse((obj) => {
        obj.geometry?.dispose();
        if (obj.material) [].concat(obj.material).forEach((m) => m.dispose());
      });
      textura.dispose();
      renderer.dispose();
    },
  };
}

/** "#6A3DE0" → [106, 61, 224]. */
export const hexARgb = (hex) => {
  let h = String(hex).trim().replace("#", "");
  if (h.length === 3) h = h.replace(/(.)/g, "$1$1");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) || 0);
};
