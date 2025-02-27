"use client";

import { useState, useEffect, ChangeEvent } from 'react';
import init, {  process_excel } from '../../rust-wasm/pkg/rust_wasm';
import Chart from '../components/Chart';

// 상태 타입 정의
interface DateStat {
  date: string;
  count: number;
}

interface DepartmentStat {
  department: string;
  request_status: string;
  count: number;
}

export default function Upload() {
  const [dateStats, setDateStats] = useState<DateStat[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStat[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isWasmReady, setWasmReady] = useState(false);

  // WebAssembly 초기화
  useEffect(() => {
    init()
      .then(() => {
        console.log('WebAssembly 모듈 초기화 완료');
        setWasmReady(true);
      })
      .catch(err => {
        console.error('WebAssembly 초기화 실패:', err);
      });
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !isWasmReady) {
      console.log('파일이 선택되지 않았거나 WebAssembly가 준비되지 않았습니다.');
      return;
    }

    try {
      // 파일을 ArrayBuffer로 변환
      const buffer = await selectedFile.arrayBuffer();
      
      // WebAssembly 함수 직접 호출
      const result = process_excel(new Uint8Array(buffer));
      console.log('WebAssembly 결과:', result);

      // Map 객체에서 데이터 추출
      const dateStatsArray = result.get('date_stats');
      const departmentStatsArray = result.get('department_stats');

      if (dateStatsArray && departmentStatsArray) {
        setDateStats(dateStatsArray);
        setDepartmentStats(departmentStatsArray);
      }

    } catch (error) {
      console.error('파일 처리 중 에러:', error);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">📊 엑셀 데이터 분석</h1>

      <div className="mb-4">
        <input 
          type="file" 
          accept=".xlsx" 
          onChange={handleFileChange} 
          className="border p-2" 
          disabled={!isWasmReady}
        />
        <button 
          onClick={handleUpload}
          className={`ml-2 px-4 py-2 rounded ${
            isWasmReady 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          disabled={!isWasmReady}
        >
          {isWasmReady ? '업로드' : '초기화 중...'}
        </button>
      </div>

      {dateStats.length > 0 && departmentStats.length > 0 && (
        <Chart 
          dateStats={dateStats}
          departmentStats={departmentStats}
        />
      )}
    </div>
  );
}
