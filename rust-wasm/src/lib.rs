use calamine::{Reader, Xlsx};
use serde::{Deserialize, Serialize};
use serde_wasm_bindgen::to_value;
use std::collections::HashMap;
use std::io::Cursor;
use wasm_bindgen::prelude::*;

// 📊 요청 상태별 부서별 집계를 위한 데이터 구조체
#[derive(Serialize, Deserialize)]
struct DepartmentStats {
    department: String,
    request_status: String,
    count: u32,
    request_date: String,
}

// 📊 기존 날짜별 통계 구조체
#[derive(Serialize, Deserialize)]
struct Stats {
    month: String,
    requests: u32,
    closed: u32,
    closure_rate: f64,
}

// 📊 부서별 통계 구조체
#[derive(Serialize, Deserialize)]
struct DepartmentStat {
    department: String,
    request_status: String,
    count: u32,
    request_date: String,
}

// 📌 엑셀 데이터를 분석하여 월별 통계와 부서별 요청 상태를 함께 반환
#[wasm_bindgen]
pub fn process_excel(file_data: &[u8]) -> JsValue {
    let cursor = Cursor::new(file_data);
    let mut workbook = Xlsx::new(cursor).expect("Excel 파일을 열 수 없습니다.");
    let sheet = workbook
        .worksheet_range_at(0)
        .expect("시트 읽기 실패")
        .unwrap();

    let mut date_stats_map: HashMap<String, (u32, u32)> = HashMap::new();
    let mut department_stats_map: HashMap<(String, String, String), u32> = HashMap::new();

    for row in sheet.rows().skip(1) {
        let request_date = row[9].to_string(); // 요청일시 컬럼
        let status = row[2].to_string(); // 상태 컬럼
        let department = row[7].to_string(); // 부서 컬럼

        // 📊 날짜별 통계 계산
        if let Some(month) = request_date.split_whitespace().next() {
            let month = month[..7].to_string();
            let entry = date_stats_map.entry(month.clone()).or_insert((0, 0));
            entry.0 += 1; // 총 요청 수 증가
            if status == "종료" {
                entry.1 += 1; // 종료된 요청 수 증가
            }

            // 📊 부서별 요청 상태 통계 계산 (날짜 포함)
            let key = (department.clone(), status.clone(), month.clone());
            *department_stats_map.entry(key).or_insert(0) += 1;
        }
    }

    // 📊 날짜별 통계 변환
    let mut date_stats: Vec<Stats> = date_stats_map
        .into_iter()
        .map(|(month, (requests, closed))| {
            let closure_rate = if requests > 0 {
                (closed as f64 / requests as f64) * 100.0
            } else {
                0.0
            };
            Stats {
                month,
                requests,
                closed,
                closure_rate,
            }
        })
        .collect();

    // 날짜 정렬
    date_stats.sort_by(|a, b| a.month.cmp(&b.month));

    // 📊 부서별 요청 상태 통계 변환
    let mut department_stats: Vec<DepartmentStat> = Vec::new();

    for row in sheet.rows().skip(1) {
        if let (Some(dept), Some(status), Some(date)) = (
            row.get(7).and_then(|c| c.as_string()), // 부서명 (여덜 번째 열)
            row.get(2).and_then(|c| c.as_string()), // 상태 (세 번째 열)
            row.get(9).and_then(|c| c.as_string()), // 요청일시 (열 번째 열)
        ) {
            let key = (date.clone(), status.clone(), dept.clone());
            *department_stats_map.entry(key).or_insert(0) += 1;
        }
    }

    // 부서별 통계 벡터로 변환
    for ((date, department, status), count) in department_stats_map {
        department_stats.push(DepartmentStat {
            department: department,
            request_status: status,
            count,
            request_date: date,
        });
    }

    // 📦 JSON 변환 후 반환
    let result = serde_json::json!({
        "date_stats": date_stats,
        "department_stats": department_stats
    });

    to_value(&result).unwrap()
}
