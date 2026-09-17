import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"BAC MASTER 2027",description:"نماذج البكالوريا مع الحلول حسب شعبتك"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ar" dir="rtl"><body>{children}</body></html>}