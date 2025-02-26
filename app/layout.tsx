export const metadata = {
  title: "Rust WebAssembly Dashboard",
  description: "Next.js + Rust WASM 데이터 시각화",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
