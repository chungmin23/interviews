import "./globals.css";
import "./print.css";
import UIProvider from "@/components/UIProvider";
export const metadata = { title: "이력서 도우미" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <UIProvider>{children}</UIProvider>
      </body>
    </html>
  );
}
