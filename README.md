# 🚀 Rust WebAssembly + Next.js (App Router) 데이터 시각화 프로젝트

이 프로젝트는 **Rust WebAssembly(WASM)와 Next.js (App Router)**를 활용하여 **고급 데이터 연산 및 시각화**를 제공하는 웹 애플리케이션입니다.  
Rust의 고성능 연산을 WebAssembly로 변환하여 **브라우저에서 네이티브 성능**으로 실행하며, Next.js를 통해 UI를 구성합니다.

---

## 🛠️ **기술 스택**

- **프론트엔드**: [Next.js](https://nextjs.org/) (App Router, TypeScript, Recharts)
- **Rust WebAssembly**: [wasm-bindgen](https://rustwasm.github.io/wasm-bindgen/), [wasm-pack](https://rustwasm.github.io/wasm-pack/)
- **데이터 처리**: [rustfft](https://crates.io/crates/rustfft) (FFT), [nalgebra](https://crates.io/crates/nalgebra) (선형대수)
- **머신러닝**: [smartcore](https://crates.io/crates/smartcore) (선형 회귀 분석)

---

## 📂 **프로젝트 구조**

```
rust-wasm-dashboard/
 ├── app/                    # ✅ Next.js App Router (서버 컴포넌트 기반)
 │   ├── layout.tsx          # 공통 레이아웃
 │   ├── page.tsx            # 메인 페이지
 │   ├── components/         # UI 컴포넌트
 │   │   ├── Chart.tsx       # 데이터 시각화 (Recharts)
 │   │   ├── FFTChart.tsx    # FFT 차트
 │   │   ├── WASMProvider.tsx # WASM 로드 및 관리
 ├── rust-wasm/              # ✅ Rust WebAssembly 모듈
 │   ├── rust_wasm/          # Rust 코드
 │   ├── Cargo.toml          # Rust 설정 파일
 │   └── src/lib.rs          # Rust WebAssembly 코드
 ├── public/                 # 정적 파일
 ├── package.json            # 프로젝트 설정 파일
 ├── tsconfig.json           # TypeScript 설정
 └── README.md               # 프로젝트 설명
```

---

## 📥 **설치 및 실행 방법**

### 1️⃣. Rust 및 WebAssembly 환경 설정\*\*

Rust를 설치하지 않았다면 아래 명령어를 실행하세요.

```sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Rust의 WebAssembly 타겟을 추가합니다.

```sh
rustup target add wasm32-unknown-unknown
```

---

### 2️⃣ \*프로젝트 클론 및 의존성 설치\*\*

```sh
git clone https://github.com/yourusername/rust-wasm-dashboard.git
cd rust-wasm-dashboard
npm install
```

---

### 3️⃣ Rust WebAssembly 빌드\*\*

Rust WebAssembly 모듈을 컴파일합니다.

```sh
cd rust-wasm/rust_wasm
wasm-pack build --target web
```

빌드가 완료되면 `pkg/` 폴더가 생성됩니다.

---

### 4️⃣ **Next.js 실행**

```sh
cd rust-wasm-dashboard
npm run dev
```

이제 **`http://localhost:3000`** 에 접속하면 프로젝트가 실행됩니다! 🚀

---

## 🔥 **Rust WebAssembly 주요 기능**

### ✅ 1. **고속 푸리에 변환 (FFT)**

Rust의 `rustfft` 라이브러리를 활용하여 **주파수 분석 및 신호 처리**를 수행합니다.

```rust
#[wasm_bindgen]
pub fn compute_fft(n: usize) -> JsValue {
    let mut planner = FftPlanner::<f64>::new();
    let fft = planner.plan_fft_forward(n);

    let mut buffer: Vec<Complex<f64>> = (0..n)
        .map(|i| Complex::new((i as f64).sin(), 0.0))
        .collect();

    fft.process(&mut buffer);

    let result: Vec<DataPoint> = buffer.iter()
        .enumerate()
        .map(|(i, c)| DataPoint { x: i as f64, y: c.norm() })
        .collect();

    serde_wasm_bindgen::to_value(&result).unwrap()
}
```

📄 **`app/components/FFTChart.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import init, { compute_fft } from "../../rust-wasm/rust-wasm/pkg/rust_wasm";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function FFTChart() {
  const [data, setData] = useState<{ x: number; y: number }[]>([]);
  useEffect(() => {
    init().then(() => setData(compute_fft(128)));
  }, []);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="x" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="y" stroke="#8884d8" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

---

### ✅ 2. **선형대수 (행렬 연산)**

Rust의 `nalgebra` 라이브러리를 사용하여 행렬 연산을 수행합니다.

```rust
use nalgebra::Matrix2;

#[wasm_bindgen]
pub fn multiply_matrix() -> JsValue {
    let a = Matrix2::new(1.0, 2.0, 3.0, 4.0);
    let b = Matrix2::new(2.0, 0.0, 1.0, 2.0);

    let result = a * b;
    serde_wasm_bindgen::to_value(&[
        result[(0, 0)], result[(0, 1)],
        result[(1, 0)], result[(1, 1)]
    ]).unwrap()
}
```

---

### ✅ 3. **머신러닝 (선형 회귀)**

Rust에서 `smartcore`를 사용해 **선형 회귀 모델을 학습하고 예측**합니다.

```rust
use smartcore::linear::linear_regression::LinearRegression;
use smartcore::linalg::naive::dense_matrix::DenseMatrix;

#[wasm_bindgen]
pub fn train_linear_regression() -> JsValue {
    let x = DenseMatrix::from_2d_array(&[
        &[1.0], &[2.0], &[3.0], &[4.0], &[5.0]
    ]);
    let y = &[2.0, 4.0, 6.0, 8.0, 10.0];

    let model = LinearRegression::fit(&x, y, Default::default()).unwrap();
    let prediction = model.predict(&x).unwrap();

    serde_wasm_bindgen::to_value(&prediction).unwrap()
}
```
