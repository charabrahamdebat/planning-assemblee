import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Planning Assemblée — FOI VICTORIEUSE",description:"Gestion mensuelle des cultes de l’assemblée FOI VICTORIEUSE"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>) {
  return <html lang="fr"><body>{children}</body></html>;
}
