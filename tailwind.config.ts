import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  //safelist tells Tailwind: “keep these classes in the final CSS even if they don’t appear literally in the source files.”
  //This is necessary when using dynamic class names like bg-choose-side-${radialBg}.
  safelist: [
    "bg-choose-side-red",
    "bg-choose-side-blue",
    "bg-choose-side-green",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        darkGreen: "#062817",
        veryDarkGreen: "#060A08",
        connectedGreen: "#1f3029",
        lightGreen: "#64E18E",
        veryDarkRed: "#3F1717",
        darkRed: "#950606",
        lightRed: "#FF0000",
      },
      backgroundImage: {
        "custom-svg": "url('/assets/BackgroundLight.svg')",
        "choose-side-red":
          "linear-gradient(0deg, rgba(6,10,8,0.2), rgba(6,10,8,0.2)), radial-gradient(307.14% 100% at 50% 0%, #470B07 0%, #2F0B09 8.32%, #060A08 51.57%)",
        "choose-side-blue":
          "linear-gradient(0deg, rgba(6,10,8,0.2), rgba(6,10,8,0.2)), radial-gradient(307.14% 100% at 50% 0%, #012D40 0%, #01202D 8.32%, #060A08 51.57%)",
        "choose-side-green":
          "linear-gradient(0deg, rgba(6,10,8,0.2), rgba(6,10,8,0.2)), radial-gradient(307.14% 100% at 50% 0%, #143631 0%, #0F2925 8.32%, #060A08 51.57%)",
        radial: "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
