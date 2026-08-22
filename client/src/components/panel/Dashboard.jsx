import { useState, useEffect, useCallback } from "react";
import { Select } from "flowbite-react";
import { HiCalendar, HiClock, HiTag, HiUserGroup, HiUsers } from "react-icons/hi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { useApi } from "../../hooks/useApi";

const DIAS_CORTOS = {
  lunes: "Lun",
  martes: "Mar",
  miercoles: "Mié",
  jueves: "Jue",
  viernes: "Vie",
  sabado: "Sáb",
  domingo: "Dom",
};

const DIAS_LARGOS = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
};

const PERIODOS = [
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
  { value: "365", label: "Último año" },
  { value: "", label: "Todo el historial" },
];

/**
 * Tooltip de una sola línea.
 *
 * El de recharts arma la etiqueta y el valor en filas separadas, y como acá el
 * `name` de la serie va vacío quedaba un renglón suelto tipo ": 48 turnos"
 * debajo del día. Con un content propio se controla el texto entero.
 *
 * `texto(payload)` devuelve la línea completa a mostrar.
 */
export const TooltipUnaLinea = ({ active, payload, texto }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-1.5">
      <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
        {texto(payload[0].payload)}
      </span>
    </div>
  );
};

const cursorTooltip = { fill: "rgba(145, 66, 225, 0.06)" };

const labelStyle = { fill: "#374151", fontSize: 12 };

/** true cuando el viewport es de celular. Los gráficos necesitan otra
 *  configuración ahí: menos ancho para las etiquetas y scroll horizontal. */
const useEsMobile = () => {
  const [esMobile, setEsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );

  useEffect(() => {
    const consulta = window.matchMedia("(max-width: 767px)");
    const alCambiar = (e) => setEsMobile(e.matches);
    consulta.addEventListener("change", alCambiar);
    return () => consulta.removeEventListener("change", alCambiar);
  }, []);

  return esMobile;
};

const ChartCard = ({ icon: Icon, title, subtitle, isEmpty, children }) => (
  // `overflow-hidden` importa: sin él, un gráfico que se pasa del ancho de la
  // tarjeta deja ver el fondo de la página (que es negro, ver index.css) y
  // parece un borde negro alrededor.
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5 overflow-hidden">
    <div className="flex items-center gap-2 mb-1">
      <Icon className="w-5 h-5 text-[var(--primary-color)] flex-shrink-0" />
      <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
    </div>
    {subtitle && <p className="text-xs text-gray-400 mb-3">{subtitle}</p>}
    {isEmpty ? (
      <div className="h-48 flex items-center justify-center text-sm text-gray-400">
        Sin datos en este período
      </div>
    ) : (
      children
    )}
  </div>
);

/**
 * Envoltorio para gráficos que no entran en una pantalla angosta: en vez de
 * apretar las barras hasta que las etiquetas se pisen, se deja desplazar en
 * horizontal con un ancho mínimo.
 */
const ScrollHorizontal = ({ anchoMinimo, children }) => (
  <div className="overflow-x-auto -mx-1 px-1">
    <div style={{ minWidth: anchoMinimo }}>{children}</div>
  </div>
);

const Dashboard = () => {
  const api = useApi();
  const esMobile = useEsMobile();
  const [periodo, setPeriodo] = useState("90");
  const [metricas, setMetricas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetricas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.agenda.getMetricas(periodo || undefined);
      setMetricas(data.metricas);
    } catch (err) {
      console.error("Error al obtener métricas del dashboard:", err);
      setError(
        "No se pudieron cargar las métricas. Intentá de nuevo en unos segundos."
      );
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo]);

  useEffect(() => {
    fetchMetricas();
  }, [fetchMetricas]);

  const periodoActual = PERIODOS.find((p) => p.value === periodo) || PERIODOS[1];

  if (loading && !metricas) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Cargando métricas...
      </div>
    );
  }

  if (error && !metricas) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6 text-center">
        <p className="text-red-600 text-sm mb-3">{error}</p>
        <button
          onClick={fetchMetricas}
          className="px-4 py-2 text-sm rounded-lg text-white"
          style={{ backgroundColor: "var(--primary-color)" }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">
            {metricas?.totalSolicitados ?? 0} turnos solicitados ·{" "}
            {periodoActual.label.toLowerCase()}
          </p>
        </div>
        <Select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="w-full sm:w-56"
        >
          {PERIODOS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          icon={HiCalendar}
          title="Días más pedidos"
          isEmpty={!metricas?.porDia?.some((d) => d.total > 0)}
        >
          {/* 7 días: en mobile se muestran todos con `interval={0}`, que evita
              que recharts saltee etiquetas cuando no le entran. */}
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={metricas.porDia}
              margin={{ top: 20, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="#eef0f2" />
              <XAxis
                dataKey="dia"
                tickFormatter={(d) => DIAS_CORTOS[d] || d}
                tick={{ fontSize: esMobile ? 10 : 12, fill: "#6b7280" }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={false}
                interval={0}
              />
              <YAxis hide />
              <Tooltip
                cursor={cursorTooltip}
                content={
                  <TooltipUnaLinea
                    texto={(d) =>
                      `${DIAS_LARGOS[d.dia] || d.dia}: ${d.total} turnos`
                    }
                  />
                }
              />
              <Bar dataKey="total" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                <LabelList dataKey="total" position="top" style={labelStyle} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          icon={HiClock}
          title="Horas más pedidas"
          isEmpty={!metricas?.porHora?.length}
        >
          {/* Puede haber muchas horas (hoy 11). Apretarlas en una pantalla
              angosta pisa las etiquetas, así que se le da un ancho mínimo por
              barra y se desplaza en horizontal. */}
          <ScrollHorizontal anchoMinimo={(metricas.porHora?.length || 0) * 46}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={metricas.porHora}
                margin={{ top: 20, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="#eef0f2" />
                <XAxis
                  dataKey="hora"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={false}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={50}
                />
                <YAxis hide />
                <Tooltip
                  cursor={cursorTooltip}
                  content={
                    <TooltipUnaLinea
                      texto={(d) => `${d.hora}: ${d.total} turnos`}
                    />
                  }
                />
                <Bar dataKey="total" fill="#4a3aa7" radius={[4, 4, 0, 0]} maxBarSize={30}>
                  <LabelList dataKey="total" position="top" style={labelStyle} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ScrollHorizontal>
        </ChartCard>

        <ChartCard
          icon={HiTag}
          title="Servicios más solicitados"
          isEmpty={!metricas?.porServicio?.length}
        >
          <ResponsiveContainer
            width="100%"
            height={Math.max(180, (metricas?.porServicio?.length || 0) * 40)}
          >
            <BarChart
              data={metricas.porServicio}
              layout="vertical"
              margin={{ top: 4, right: 34, left: 8, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} stroke="#eef0f2" />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="servicio"
                width={esMobile ? 88 : 120}
                tick={{ fontSize: esMobile ? 11 : 12, fill: "#374151" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={cursorTooltip}
                content={
                  <TooltipUnaLinea
                    texto={(d) => `${d.servicio}: ${d.total} turnos`}
                  />
                }
              />
              <Bar dataKey="total" fill="#1baf7a" radius={[0, 4, 4, 0]} maxBarSize={22}>
                <LabelList dataKey="total" position="right" style={labelStyle} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          icon={HiUserGroup}
          title="Barbero más solicitado"
          isEmpty={!metricas?.porBarbero?.length}
        >
          <ResponsiveContainer
            width="100%"
            height={Math.max(180, (metricas?.porBarbero?.length || 0) * 40)}
          >
            <BarChart
              data={metricas.porBarbero}
              layout="vertical"
              margin={{ top: 4, right: 34, left: 8, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} stroke="#eef0f2" />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="barbero"
                width={esMobile ? 88 : 120}
                tick={{ fontSize: esMobile ? 11 : 12, fill: "#374151" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={cursorTooltip}
                content={
                  <TooltipUnaLinea
                    texto={(d) => `${d.barbero}: ${d.total} turnos`}
                  />
                }
              />
              <Bar dataKey="total" fill="#eb6834" radius={[0, 4, 4, 0]} maxBarSize={22}>
                <LabelList dataKey="total" position="right" style={labelStyle} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard
        icon={HiUsers}
        title="Clientes que más agendaron"
        subtitle="Top 10 por cantidad de turnos solicitados"
        isEmpty={!metricas?.porCliente?.length}
      >
        <ResponsiveContainer
          width="100%"
          height={Math.max(220, (metricas?.porCliente?.length || 0) * 36)}
        >
          <BarChart
            data={metricas.porCliente}
            layout="vertical"
            margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} stroke="#eef0f2" />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="nombre"
              // Los nombres de cliente son lo más largo del dashboard: en
              // mobile se recortan para no dejar al gráfico sin ancho.
              width={esMobile ? 96 : 160}
              tick={{ fontSize: esMobile ? 11 : 12, fill: "#374151" }}
              tickFormatter={(n) =>
                esMobile && n?.length > 13 ? n.slice(0, 12) + "…" : n
              }
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={cursorTooltip}
              content={
                <TooltipUnaLinea
                  texto={(d) => `${d.nombre}: ${d.total} turnos · ${d.numero}`}
                />
              }
            />
            <Bar dataKey="total" fill="#e87ba4" radius={[0, 4, 4, 0]} maxBarSize={20}>
              <LabelList dataKey="total" position="right" style={labelStyle} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

export default Dashboard;
