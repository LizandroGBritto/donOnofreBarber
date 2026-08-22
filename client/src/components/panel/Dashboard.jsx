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

const tooltipProps = {
  contentStyle: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: "#374151", fontWeight: 600 },
  cursor: { fill: "rgba(145, 66, 225, 0.06)" },
};

const labelStyle = { fill: "#374151", fontSize: 12 };

const ChartCard = ({ icon: Icon, title, subtitle, isEmpty, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5">
    <div className="flex items-center gap-2 mb-1">
      <Icon className="w-5 h-5 text-[var(--primary-color)]" />
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

const Dashboard = () => {
  const api = useApi();
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
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={metricas.porDia}
              margin={{ top: 20, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="#eef0f2" />
              <XAxis
                dataKey="dia"
                tickFormatter={(d) => DIAS_CORTOS[d] || d}
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                {...tooltipProps}
                formatter={(value) => [`${value} turnos`, ""]}
                labelFormatter={(d) => DIAS_LARGOS[d] || d}
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
                height={45}
              />
              <YAxis hide />
              <Tooltip {...tooltipProps} formatter={(value) => [`${value} turnos`, ""]} />
              <Bar dataKey="total" fill="#4a3aa7" radius={[4, 4, 0, 0]} maxBarSize={30}>
                <LabelList dataKey="total" position="top" style={labelStyle} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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
              margin={{ top: 4, right: 30, left: 8, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} stroke="#eef0f2" />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="servicio"
                width={120}
                tick={{ fontSize: 12, fill: "#374151" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip {...tooltipProps} formatter={(value) => [`${value} turnos`, ""]} />
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
              margin={{ top: 4, right: 30, left: 8, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} stroke="#eef0f2" />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="barbero"
                width={120}
                tick={{ fontSize: 12, fill: "#374151" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip {...tooltipProps} formatter={(value) => [`${value} turnos`, ""]} />
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
              width={160}
              tick={{ fontSize: 12, fill: "#374151" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              {...tooltipProps}
              formatter={(value, _name, item) => [
                `${value} turnos · ${item.payload.numero}`,
                "",
              ]}
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
