import { ClerkProvider } from "@clerk/nextjs";
import type { Appearance } from "@clerk/types";
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

/**
 * This object can be customized to change Clerk's built-in appearance. To learn more: https://clerk.com/docs/customization/overview
 */
const clerkAppearanceObject = {
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "var(--primary)",
    colorBackground: "var(--background)",
    colorText: "var(--foreground)",
  },
  elements: {
    socialButtonsBlockButton:
      "bg-card border-border hover:bg-muted hover:border-border text-muted-foreground hover:text-foreground",
    socialButtonsBlockButtonText: "font-semibold",
    formButtonReset:
      "bg-card border border-solid border-border hover:bg-muted hover:border-border text-muted-foreground hover:text-foreground",
    membersPageInviteButton:
      "bg-primary text-primary-foreground border border-primary hover:bg-primary/90 hover:text-primary-foreground",
    card: "bg-card",
  },
} satisfies Appearance;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const nonce = headerList.get("x-nonce") ?? undefined;

  return (
    <ClerkProvider appearance={clerkAppearanceObject} dynamic>
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
    </ClerkProvider>
  );
}
