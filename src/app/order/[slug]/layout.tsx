import { Karla, Playfair_Display } from "next/font/google";

const karla = Karla({ subsets: ["latin"], variable: "--font-body" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-display" });

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${karla.variable} ${playfair.variable} [font-family:var(--font-body)]`}
    >
      {children}
    </div>
  );
}
