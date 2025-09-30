import Providers from "@/providers/Providers.tsx";
import "../styles/globals.css";
import { Toaster } from "sonner";

export const metadata = {
  title: "Nori Token Bridge zkApp",
  description: "Blockchain interoperability with zero-knowledge proofs",
  icons: {
    icon: "/assets/favicon.png",
  },
  metadataBase: new URL("https://app.nori-zk.com"),
  openGraph: {
    title: "Nori Token Bridge zkApp",
    description: "Blockchain interoperability with zero-knowledge proofs",
    url: "https://app.nori-zk.com",
    siteName: "Nori zkApp",
    images: [
      {
        url: "/assets/Cover.png", // 1200x630 recommended
        width: 1500,
        height: 500,
        alt: "Nori zkApp Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nori Token Bridge zkApp",
    description: "Blockchain interoperability with zero-knowledge proofs",
    images: ["/assets/Cover.png"],
  },
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
