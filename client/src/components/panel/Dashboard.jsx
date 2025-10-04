import { useState, useEffect } from "react";
import { Card } from "flowbite-react";
import axios from "axios";

const Dashboard = () => {
  const [stats, setStats] = useState({
    today: { scheduled: 0, available: 5 },
    week: { scheduled: 0, available: 35 },
    month: { scheduled: 0, available: 150 },
  });

  // Función para obtener las estadísticas de turnos
  const fetchStats = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8000/api/agenda/dashboard/estadisticas"
      );
      setStats({
        today: {
          scheduled: response.data.estadisticas.hoy.agendados,
          available: response.data.estadisticas.hoy.disponibles,
        },
        week: {
          scheduled: response.data.estadisticas.semana.agendados,
          available: response.data.estadisticas.semana.disponibles,
        },
        month: {
          scheduled: response.data.estadisticas.mes.agendados,
          available: response.data.estadisticas.mes.disponibles,
        },
      });
    } catch (error) {
      console.error("Error al obtener estadísticas:", error);
      // Datos de fallback
      setStats({
        today: { scheduled: 4, available: 5 },
        week: { scheduled: 18, available: 35 },
        month: { scheduled: 67, available: 150 },
      });
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const StatsCard = ({ title, scheduled, available, period }) => {
    const total = scheduled + available;
    const percentage = total > 0 ? (scheduled / total) * 100 : 0;

    return (
      <Card className="max-w-sm" style={{ backgroundColor: "#5B4373" }}>
        <div className="flex flex-col items-center pb-4">
          <h5 className="mb-2 text-xl font-medium text-white">{title}</h5>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">
              {scheduled}/{total}
            </div>
            <div className="text-sm text-gray-300 mb-3">Turnos {period}</div>
            <div className="w-full bg-gray-600 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full transition-all duration-300"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: "var(--primary-color)",
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-300 mt-1">
              {percentage.toFixed(1)}% ocupado
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {available} disponibles
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <StatsCard
        title="Hoy"
        scheduled={stats.today.scheduled}
        available={stats.today.available}
        period="agendados hoy"
      />

      <StatsCard
        title="Esta Semana"
        scheduled={stats.week.scheduled}
        available={stats.week.available}
        period="en la semana"
      />

      <StatsCard
        title="Este Mes"
        scheduled={stats.month.scheduled}
        available={stats.month.available}
        period="en el mes"
      />
    </div>
  );
};

export default Dashboard;
