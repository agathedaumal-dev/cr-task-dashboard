import "./globals.css";
import Script from "next/script";
import localFont from "next/font/local";
import { Montserrat } from "next/font/google";
import { appConfig } from "@/lib/app-config";
import { Metadata } from "next";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: appConfig.appName,
  description: `Internal tool provided by ${appConfig.ownerTeam}`,
};

const avenir = localFont({
  src: [
    {
      path: './fonts/avenir-roman.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/avenir-medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: './fonts/avenir-heavy.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: './fonts/avenir-black.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: "--font-avenir",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});



export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const nonce = headerList.get("x-nonce") ?? undefined;

  return (
    <html lang="en" className={`${avenir.variable} ${montserrat.variable}`}>
      <body className={`min-h-screen flex flex-col antialiased`} suppressHydrationWarning>
        {children}
      </body>

      <Script
        src="https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-core.min.js"
        nonce={nonce}
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/prismjs@1/plugins/autoloader/prism-autoloader.min.js"
        nonce={nonce}
      />
    </html>
  );
}
