import { useState, useEffect } from "react";
import { Card } from "flowbite-react";
import axios from "axios";

const Dashboard = () => {
  const [stats, setStats] = useState({
    today: { scheduled: 0, available: 0, generated: 0 },
    week: { scheduled: 0, available: 0, generated: 0 },
    month: { scheduled: 0, available: 0, generated: 0 },
    year: { scheduled: 0, available: 0, generated: 0 },
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
          generated: response.data.estadisticas.hoy.generado,
        },
        week: {
          scheduled: response.data.estadisticas.semana.agendados,
          available: response.data.estadisticas.semana.disponibles,
          generated: response.data.estadisticas.semana.generado,
        },
        month: {
          scheduled: response.data.estadisticas.mes.agendados,
          available: response.data.estadisticas.mes.disponibles,
          generated: response.data.estadisticas.mes.generado,
        },
        year: {
          scheduled: response.data.estadisticas.año.agendados,
          available: response.data.estadisticas.año.disponibles,
          generated: response.data.estadisticas.año.generado,
        },
      });
    } catch (error) {
      console.error("Error al obtener estadísticas:", error);
      // Datos de fallback
      setStats({
        today: { scheduled: 4, available: 5, generated: 2 },
        week: { scheduled: 18, available: 35, generated: 8 },
        month: { scheduled: 67, available: 150, generated: 25 },
        year: { scheduled: 245, available: 600, generated: 95 },
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

  const GeneratedCard = ({ title, generated, period }) => {
    return (
      <Card className="max-w-sm" style={{ backgroundColor: "#2D5A27" }}>
        <div className="flex flex-col items-center pb-4">
          <h5 className="mb-2 text-xl font-medium text-white">{title}</h5>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-300 mb-2">
              Gs. {generated}
            </div>
            <div className="text-sm text-gray-300 mb-3">
              Turnos pagados {period}
            </div>
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 bg-green-400 rounded-full mr-2"></div>
              <span className="text-xs text-gray-300">Ingresos generados</span>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas de Turnos */}
      <div>
        <h3 className="text-lg font-semibold text-white-900 dark:text-white mb-4">
          Estadísticas de Turnos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

          <StatsCard
            title="Este Año"
            scheduled={stats.year.scheduled}
            available={stats.year.available}
            period="en el año"
          />
        </div>
      </div>

      {/* Estadísticas de Ingresos Generados */}
      <div>
        <h3 className="text-lg font-semibold text-white-900 dark:text-white mb-4">
          Ingresos Generados
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <GeneratedCard
            title="Hoy"
            generated={stats.today.generated}
            period="hoy"
          />

          <GeneratedCard
            title="Esta Semana"
            generated={stats.week.generated}
            period="esta semana"
          />

          <GeneratedCard
            title="Este Mes"
            generated={stats.month.generated}
            period="este mes"
          />

          <GeneratedCard
            title="Este Año"
            generated={stats.year.generated}
            period="este año"
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
