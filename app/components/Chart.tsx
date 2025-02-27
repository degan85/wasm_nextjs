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
import { useMemo, useEffect, useState, useRef } from 'react';
import XLSX from 'xlsx';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [chartData, setChartData] = useState<any>(null);

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
    indexAxis: 'y' as const,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false
        }
      },
      y: {
        stacked: true,
        grid: {
          display: true
        }
      }
    },
    barPercentage: 0.7,
    categoryPercentage: 1,
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
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setGridWidth(width);
        console.log('=== Chart Dimensions ===');
        console.log('Window Width:', window.innerWidth);
        console.log('Container Width:', width);
        console.log('Grid Layout:', window.innerWidth >= 1024 ? '2x2' : '1x4');
        console.log('Breakpoint:', window.innerWidth >= 1024 ? 'Desktop' : 'Mobile');
        console.log('=====================');
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const isDesktop = window.innerWidth >= 1024;

  const gridContainerStyle = {
    display: 'grid',
    gridTemplateColumns: isDesktop ? 'repeat(2, 1fr)' : '1fr',
    gridTemplateRows: isDesktop ? 'repeat(2, minmax(500px, 600px))' : 'repeat(4, minmax(450px, 500px))',
    gap: '1.5rem',
    width: '100%',
    padding: '1rem',
  };

  const exportToExcel = () => {
    console.log('Excel 내보내기 시작...');
    
    if (!chartData) {
      console.error('chartData가 없습니다.');
      alert('내보낼 데이터가 없습니다.');
      return;
    }

    try {
      console.log('Excel 워크북 생성 중...');
      console.log('chartData:', chartData);
      
      const workbook = XLSX.utils.book_new();

      // 시간별 처리량 데이터
      console.log('월별 데이터 시트 생성 중...');
      const monthlySheet = XLSX.utils.json_to_sheet(
        chartData.monthlyData.labels.map((label, idx) => {
          console.log(`데이터 행 ${idx}: 날짜=${label}`);
          return {
            '날짜': label,
            '완료': chartData.monthlyData.datasets[0].data[idx],
            '총 요청': chartData.monthlyData.datasets[1].data[idx],
            '처리율(%)': chartData.monthlyData.datasets[1].data[idx] ? 
              ((chartData.monthlyData.datasets[0].data[idx] / chartData.monthlyData.datasets[1].data[idx]) * 100).toFixed(2) : 0
          };
        })
      );

      // 부서별 상세 현황 데이터
      console.log('부서별 데이터 시트 생성 중...');
      const departmentSheet = XLSX.utils.json_to_sheet(
        chartData.departmentData.labels.map((dept, idx) => {
          console.log(`부서 데이터 행 ${idx}: 부서=${dept}`);
          const row = { '부서명': dept };
          chartData.departmentData.datasets.forEach(ds => {
            row[ds.label] = ds.data[idx];
          });
          return row;
        })
      );

      XLSX.utils.book_append_sheet(workbook, monthlySheet, "시간별 처리량");
      XLSX.utils.book_append_sheet(workbook, departmentSheet, "부서별 현황");

      console.log('Excel 파일 저장 중...');
      const fileName = `데이터분석리포트_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      console.log('Excel 내보내기 완료!');
    } catch (error) {
      console.error('Excel 내보내기 실패:', error);
      alert('Excel 파일 생성 중 오류가 발생했습니다.');
    }
  };

  const exportToPDF = async () => {
    console.log('PDF 내보내기 시작...');
    
    try {
      if (!containerRef.current || !chartData) {
        console.error('containerRef 또는 chartData가 없습니다.');
        alert('내보낼 데이터가 없습니다.');
        return;
      }

      // 로딩 표시
      console.log('로딩 오버레이 생성 중...');
      const loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      loadingOverlay.innerHTML = `
        <div class="bg-white rounded-lg p-6 shadow-xl">
          <div class="flex items-center space-x-3">
            <div class="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p class="text-gray-700">PDF 생성 중...</p>
          </div>
        </div>
      `;
      document.body.appendChild(loadingOverlay);

      try {
        console.log('HTML을 캔버스로 변환 중...');
        const canvas = await html2canvas(containerRef.current, {
          scale: 2,
          logging: true, // 로깅 활성화
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });

        console.log('캔버스를 이미지로 변환 중...');
        const imgData = canvas.toDataURL('image/png');
        
        console.log('PDF 생성 중...');
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

        const imgWidth = 297; // A4 가로
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        console.log(`PDF 이미지 크기: ${imgWidth}mm x ${imgHeight}mm`);

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        
        console.log('PDF 파일 저장 중...');
        const fileName = `데이터분석리포트_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
        pdf.save(fileName);
        console.log('PDF 내보내기 완료!');
      } finally {
        // 로딩 제거
        console.log('로딩 오버레이 제거 중...');
        document.body.removeChild(loadingOverlay);
      }
    } catch (error) {
      console.error('PDF 내보내기 실패:', error);
      alert('PDF 파일 생성 중 오류가 발생했습니다.');
    }
  };

  // 차트 데이터 초기화
  useEffect(() => {
    if (!dateStats || !departmentStats) return;

    try {
      // 최신 월 계산
      const months = dateStats
        .filter(stat => stat && typeof stat.get === 'function')
        .map(stat => stat.get('month'))
        .filter(Boolean);
      
      const latestMonth = months.length > 0 
        ? months.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
        : null;

      // 월별 데이터
      const monthlyData = {
        labels: months,
        datasets: [
          {
            label: '완료',
            data: months.map(month => 
              dateStats
                .filter(stat => stat.get('month') === month)
                .reduce((sum, stat) => sum + (stat.get('status') === 'completed' ? stat.get('count') : 0), 0)
            ),
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          },
          {
            label: '총 요청',
            data: months.map(month =>
              dateStats
                .filter(stat => stat.get('month') === month)
                .reduce((sum, stat) => sum + stat.get('count'), 0)
            ),
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          }
        ]
      };

      // 부서별 데이터
      const departments = [...new Set(departmentStats.map(stat => stat.get('department')))];
      const statuses = ['pending', 'in_progress', 'completed', 'failed'];
      
      const departmentData = {
        labels: departments,
        datasets: statuses.map(status => ({
          label: status,
          data: departments.map(dept =>
            departmentStats
              .filter(stat => stat.get('department') === dept && stat.get('status') === status)
              .reduce((sum, stat) => sum + stat.get('count'), 0)
          ),
          backgroundColor: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.2)`,
          borderColor: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 1)`,
          borderWidth: 1
        }))
      };

      setChartData({
        latestMonth,
        monthlyData,
        departmentData
      });
    } catch (error) {
      console.error('데이터 처리 중 오류 발생:', error);
    }
  }, [dateStats, departmentStats]);

  // EmptyState 컴포넌트
  const EmptyState = () => (
    <div className="min-h-[500px] bg-white rounded-xl shadow-sm p-6 flex items-center justify-center">
      <p className="text-gray-500 text-lg">
        데이터를 업로드하면 차트가 이곳에 표시됩니다.
      </p>
    </div>
  );

  if (!chartData) {
    return <EmptyState />;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      {/* 헤더 영역 */}
      <div className="max-w-[1600px] mx-auto mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white rounded-xl shadow-sm p-5 mb-6">
          {/* 버튼 그룹 */}
          <div className="flex items-center space-x-4">
            {/* 파일 첨부 버튼 */}
            {/* PDF 저장 버튼 */}
            <button
              onClick={() => {
                console.log('PDF 저장 버튼 클릭됨');
                exportToPDF();
              }}
              className="flex items-center justify-center h-9 px-3 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 transition-colors"
            >
              <span className="ml-2 text-sm font-medium text-gray-700">PDF 저장</span>
            </button>
          </div>
        </div>
      </div>

      {/* 차트 컨테이너 */}
      <div ref={containerRef} className="max-w-[1600px] mx-auto" style={gridContainerStyle}>
        {/* 월별 추이 */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 flex flex-col" style={{ height: '100%' }}>
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-6">시간별 처리량</h2>
          <div className="flex-1 relative w-full">
            {monthlyData.labels?.length > 0 && (
              <Bar 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    }
                  },
                }}
                data={monthlyData}
                style={{ position: 'absolute', width: '100%', height: '100%' }}
              />
            )}
          </div>
        </div>

        {/* 부서별 상세 차트 */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 flex flex-col" style={{ height: '100%' }}>
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-6">부서별 상세 현황</h2>
          <div className="flex-1 relative w-full">
            {departmentData.labels?.length > 0 && (
              <Bar 
                options={{
                  ...departmentOptions,
                  responsive: true,
                  maintainAspectRatio: false,
                }}
                data={departmentData}
                style={{ position: 'absolute', width: '100%', height: '100%' }}
              />
            )}
          </div>
        </div>

        {/* 처리율 추이 */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 flex flex-col" style={{ height: '100%' }}>
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-6">처리율 추이</h2>
          <div className="flex-1 relative w-full">
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
                style={{ position: 'absolute', width: '100%', height: '100%' }}
              />
            )}
          </div>
        </div>

        {/* 상태 분포 */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 flex flex-col" style={{ height: '100%' }}>
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-6">상태별 분포</h2>
          <div className="flex-1 relative w-full">
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
                style={{ position: 'absolute', width: '100%', height: '100%' }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chart;
