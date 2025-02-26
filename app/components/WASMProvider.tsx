"use client"; // 클라이언트 컴포넌트

import { useEffect, useState } from "react";
import init, { compute_fft } from "../../rust-wasm/rust_wasm/pkg/rust_wasm";

export default function WASMProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [data, setData] = useState<{ x: number; y: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init().then(() => {
      setData(compute_fft(100)); // Rust WebAssembly 함수 호출
      setLoading(false);
    });
  }, []);

  return (
    <div>
      {loading ? <p>Loading WebAssembly...</p> : children}{" "}
      {/* 함수 형태가 아니라 JSX 형태로 렌더링 */}
    </div>
  );
}
