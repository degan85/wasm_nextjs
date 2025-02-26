"use client";

import { useEffect, useState } from "react";
import init, { compute_fft } from "../../rust-wasm/rust_wasm/pkg/rust_wasm";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init().then(() => {
      setData(compute_fft(128)); // Rust WebAssembly에서 FFT 연산 수행
      setLoading(false);
    });
  }, []);

  if (loading) return <p>Loading FFT...</p>;

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
