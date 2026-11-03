import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Planning Assemblée",description:"Gestion mensuelle des cultes en ligne"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>) {
  return <html lang="fr"><body>{children}</body></html>;
}
