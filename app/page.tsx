import WASMProvider from "./components/WASMProvider";
import FFTChart from "./components/FFTChart";

export default function Home() {
  return (
    <WASMProvider>
      <FFTChart />
    </WASMProvider>
  );
}
