import "./globals.css";
import "./print.css";
export const metadata = { title: "이력서 도우미" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
