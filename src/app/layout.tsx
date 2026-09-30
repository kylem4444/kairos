import type { Metadata } from "next";
import localFont from "next/font/local";
import { Libre_Franklin } from "next/font/google";
import "./globals.css";

/** Serith — preview for kairos branding. Personal-use license; need commercial license for live sale. */
const display = localFont({
  src: "../fonts/Serith.otf",
  variable: "--font-display",
  display: "swap",
});

const body = Libre_Franklin({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "kairos — one artwork. one week. one million to zero.",
  description:
    "A single artwork for sale. The price decays from $1,000,000 to $0 over seven days. Purchase it or destroy it. If the price hits zero, it is destroyed on livestream.",
  openGraph: {
    title: "kairos",
    description:
      "One artwork. The price falls for seven days. Purchase or destroy.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
