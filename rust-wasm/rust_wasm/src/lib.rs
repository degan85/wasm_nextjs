use num_complex::Complex;
use rustfft::FftPlanner;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

// Rust에서 사용할 데이터 구조체 정의
#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct DataPoint {
    pub x: f64,
    pub y: f64,
}

// FFT 변환 함수
#[wasm_bindgen]
pub fn compute_fft(n: usize) -> JsValue {
    let mut planner = FftPlanner::<f64>::new();
    let fft = planner.plan_fft_forward(n);

    // 입력 데이터를 사인 곡선으로 설정
    let mut buffer: Vec<Complex<f64>> = (0..n)
        .map(|i| Complex::new((i as f64).sin(), 0.0))
        .collect();

    fft.process(&mut buffer);

    // 결과를 직렬화하여 반환
    let result: Vec<DataPoint> = buffer
        .iter()
        .enumerate()
        .map(|(i, c)| DataPoint {
            x: i as f64,
            y: c.norm(),
        }) // 복소수 크기 출력
        .collect();

    serde_wasm_bindgen::to_value(&result).unwrap()
}
