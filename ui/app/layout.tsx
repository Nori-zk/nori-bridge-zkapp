import { MinaWalletProvider } from "@/providers/MinaWalletProvider";
import "../styles/globals.css";

export const metadata = {
  title: "Mina zkApp UI",
  description: "built with o1js",
  icons: {
    icon: "/assets/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <MinaWalletProvider>
        <body>{children}</body>
      </MinaWalletProvider>
    </html>
  );
}
