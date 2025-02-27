"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { useMemo, useEffect } from 'react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
);

interface DateStat extends Map<string, any> {
  month: string;
  requests: number;
  closed: number;
  closure_rate: number;
}

interface DepartmentStat extends Map<string, any> {
  department: string;
  request_status: string;
  request_date: string;
  count: number;
}

interface ChartProps {
  dateStats: DateStat[];
  departmentStats: DepartmentStat[];
}

const Chart = ({ dateStats, departmentStats }: ChartProps) => {
  const latestMonth = useMemo(() => {
    const months = dateStats.map(stat => stat.get('month'));
    return months.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  }, [dateStats]);

  const monthlyData = useMemo(() => {
    try {
      const processedData = dateStats.map(stat => ({
        date: stat.get('month'),
        requests: stat.get('requests'),
        closed: stat.get('closed'),
      }));

      const sortedDates = processedData
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 12)
        .reverse();

      return {
        labels: sortedDates.map(stat => stat.date),
        datasets: [
          {
            type: 'bar' as const,
            label: '종료 건수',
            data: sortedDates.map(stat => stat.closed),
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
            borderColor: 'rgba(53, 162, 235, 1)',
            borderWidth: 1,
            borderRadius: 4,
            order: 2
          },
          {
            type: 'line' as const,
            label: '요청 건수',
            data: sortedDates.map(stat => stat.requests),
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(255, 99, 132, 1)',
            pointBorderColor: 'rgba(255, 99, 132, 1)',
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
            fill: true,
            order: 1,
            segment: {
              borderColor: ctx => {
                if (ctx.p0.skip || ctx.p1.skip) return 'rgba(255, 99, 132, 0.3)';
                return undefined;
              },
              borderDash: ctx => {
                if (ctx.p0.skip || ctx.p1.skip) return [6, 6];
                return undefined;
              },
            },
            spanGaps: true
          }
        ],
      };
    } catch (error) {
      return { labels: [], datasets: [] };
    }
  }, [dateStats]);

  const departmentData = useMemo(() => {
    try {
      const statusColors = {
        '종료': 'rgba(75, 192, 192, 0.5)',
        '요청': 'rgba(255, 99, 132, 0.5)',
        '테스트': 'rgba(255, 206, 86, 0.5)',
        '협의': 'rgba(153, 102, 255, 0.5)',
        '운영점검': 'rgba(54, 162, 235, 0.5)',
        '반려': 'rgba(255, 159, 64, 0.5)',
      };

      const latestMonthData = departmentStats.filter(stat => {
        const requestDate = stat.get('request_date');
        return requestDate && requestDate.startsWith(latestMonth);
      });

      const deptStatusSummary = latestMonthData.reduce((acc, curr) => {
        const dept = curr.get('request_status')?.trim();
        const status = curr.get('department')?.trim();
        const count = Number(curr.get('count')) || 0;

        if (!dept || !status || /^\d{4}-\d{2}/.test(dept)) return acc;

        if (!acc[dept]) {
          acc[dept] = {};
        }
        acc[dept][status] = (acc[dept][status] || 0) + count;
        return acc;
      }, {} as Record<string, Record<string, number>>);

      const topDepts = Object.entries(deptStatusSummary)
        .sort(([, a], [, b]) => 
          Object.values(b).reduce((sum, val) => sum + val, 0) - 
          Object.values(a).reduce((sum, val) => sum + val, 0)
        )
        .slice(0, 10);

      const statuses = Array.from(new Set(
        latestMonthData
          .map(stat => stat.get('department'))
          .filter(status => status && !/^\d{4}-\d{2}/.test(status))
      ));

      return {
        labels: topDepts.map(([dept]) => dept),
        datasets: statuses.map(status => ({
          label: status,
          data: topDepts.map(([dept]) => deptStatusSummary[dept][status] || 0),
          backgroundColor: statusColors[status] || `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.5)`,
          borderColor: 'rgba(0, 0, 0, 0.1)',
          borderWidth: 1,
        })),
      };
    } catch (error) {
      return { labels: [], datasets: [] };
    }
  }, [departmentStats, latestMonth]);

  const monthlyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          padding: 15,
          font: { size: 12 }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    },
    animation: {
      duration: 1500,
      easing: 'easeInOutQuart',
      delay: (context: any) => context.dataIndex * 100
    }
  };

  const departmentOptions = {
    responsive: true,
    maintainAspectRatio: false,
    height: 500,
    plugins: {
      legend: {
        position: 'right' as const,
        align: 'start',
        labels: {
          padding: 20,
          font: { size: 14 }
        }
      }
    },
    scales: {
      x: { 
        stacked: true,
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 13,
            weight: '500'
          }
        },
        grid: { display: false }
      },
      y: { 
        stacked: true, 
        beginAtZero: true,
        max: 60,
        ticks: {
          stepSize: 10,
          font: {
            size: 14,
            weight: '500'
          },
          padding: 12
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    },
    animation: {
      duration: 1500,
      easing: 'easeInOutQuart',
      delay: (context: any) => {
        const datasetIndex = context.datasetIndex || 0;
        const dataIndex = context.dataIndex || 0;
        return dataIndex * 100 + datasetIndex * 50;
      }
    }
  };

  useEffect(() => {
    console.log('Window width:', window.innerWidth);
    console.log('Grid container width:', document.querySelector('.grid')?.clientWidth);
    console.log('Chart containers:', document.querySelectorAll('.bg-white').length);
    
    const chartContainers = document.querySelectorAll('.bg-white');
    chartContainers.forEach((container, idx) => {
      console.log(`Chart ${idx + 1} dimensions:`, {
        width: container.clientWidth,
        height: container.clientHeight,
        aspectRatio: container.clientWidth / container.clientHeight
      });
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* 월별 추이 */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 w-full" style={{ height: '500px' }}>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">월별 요청 처리 현황</h2>
            <div style={{ height: 'calc(100% - 40px)', width: '100%', position: 'relative' }}>
              {monthlyData.labels?.length > 0 && (
                <Bar 
                  options={{
                    ...monthlyOptions,
                    responsive: true,
                    maintainAspectRatio: false,
                  }} 
                  data={monthlyData}
                />
              )}
            </div>
          </div>

          {/* 부서별 상세 차트 */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 w-full" style={{ height: '500px' }}>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">부서별 상세 현황</h2>
            <div style={{ height: 'calc(100% - 40px)', width: '100%', position: 'relative' }}>
              {departmentData.labels?.length > 0 && (
                <Bar 
                  options={{
                    ...departmentOptions,
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                  data={departmentData}
                />
              )}
            </div>
          </div>

          {/* 처리율 추이 */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 w-full" style={{ height: '500px' }}>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">처리율 추이</h2>
            <div style={{ height: 'calc(100% - 40px)', width: '100%', position: 'relative' }}>
              {monthlyData.labels?.length > 0 && (
                <Line 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                  data={{
                    labels: monthlyData.labels,
                    datasets: [{
                      label: '처리율',
                      data: monthlyData.labels.map((_, i) => {
                        const completed = monthlyData.datasets[0].data[i];
                        const total = monthlyData.datasets[1].data[i];
                        return total ? (completed / total * 100) : 0;
                      }),
                      borderColor: 'rgba(75, 192, 192, 1)',
                      backgroundColor: 'rgba(75, 192, 192, 0.2)',
                      tension: 0.4,
                      fill: true
                    }]
                  }}
                />
              )}
            </div>
          </div>

          {/* 상태 분포 */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 w-full" style={{ height: '500px' }}>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">상태별 분포</h2>
            <div style={{ height: 'calc(100% - 40px)', width: '100%', position: 'relative' }}>
              {departmentData.datasets.length > 0 && (
                <Doughnut
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                  data={{
                    labels: departmentData.datasets.map(ds => ds.label),
                    datasets: [{
                      data: departmentData.datasets.map(ds => 
                        ds.data.reduce((a, b) => a + b, 0)
                      ),
                      backgroundColor: departmentData.datasets.map(ds => ds.backgroundColor)
                    }]
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chart;
