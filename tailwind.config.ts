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
    "bg-button-choose-side-red",
    "bg-button-choose-side-blue",
    "bg-button-choose-side-green",
    "text-neonRed",
    "text-neonBlue",
    "text-neonGreen",
    "text-glow-neon-red",
    "text-glow-neon-blue",
    "text-glow-neon-green",
    "border-glow-red",
    "border-glow-blue",
    "border-glow-green",
    "hover:border-glow-red",
    "hover:border-glow-blue",
    "hover:border-glow-green",
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
        neonRed: "#FB635E",
        neonBlue: "#84F7FC",
        neonGreen: "#48EDE7",
      },
      backgroundImage: {
        "custom-svg": "url('/assets/BackgroundLight.svg')",
        "choose-side-red":
          "linear-gradient(0deg, rgba(6,10,8,0.2), rgba(6,10,8,0.2)), radial-gradient(307.14% 100% at 50% 0%, #470B07 0%, #2F0B09 8.32%, #060A08 51.57%)",
        "choose-side-blue":
          "linear-gradient(0deg, rgba(6,10,8,0.2), rgba(6,10,8,0.2)), radial-gradient(307.14% 100% at 50% 0%, #012D40 0%, #01202D 8.32%, #060A08 51.57%)",
        "choose-side-green":
          "linear-gradient(0deg, rgba(6,10,8,0.2), rgba(6,10,8,0.2)), radial-gradient(307.14% 100% at 50% 0%, #143631 0%, #0F2925 8.32%, #060A08 51.57%)",
        "button-choose-side-red":
          "linear-gradient(180deg, rgba(221,40,34,0.2) 0%, rgba(221,40,34,0) 50%, rgba(221,40,34,0.2) 100%), radial-gradient(70.66% 100% at 50% 0%, #841B15 0%, #370507 100%)",
        "button-choose-side-blue":
          "linear-gradient(180deg, rgba(30, 86, 118 ,0.2) 0%, rgba(221,40,34,0) 50%, rgba(30, 86, 118 ,0.2) 100%), radial-gradient(70.66% 100% at 50% 0%,rgb(30, 86, 118) 0%, #032637 100%)",
        "button-choose-side-green":
          "linear-gradient(180deg, rgba(36, 118, 106, 0)0%, rgba(255, 255, 255, 0.05) 100%, rgba(36, 118, 106, 0) 100%), radial-gradient(70.66% 100% at 50% 0%,rgb(36, 118, 106) 0%, #09231F 100%)",
        radial: "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        ".text-glow-neon-red": {
          "text-shadow":
            "0 0 2px rgba(251,99,94,0.8), 0 0 6px rgba(251,99,94,0.5), 0 0 12px rgba(251,99,94,0.3)",
        },
        ".text-glow-neon-blue": {
          "text-shadow":
            "0 0 2px rgba(132,247,252,0.8), 0 0 6px rgba(132,247,252,0.5), 0 0 12px rgba(132,247,252,0.3)",
        },
        ".text-glow-neon-green": {
          "text-shadow":
            "0 0 2px rgba(72,237,231,0.8), 0 0 6px rgba(72,237,231,0.5), 0 0 12px rgba(72,237,231,0.3)",
        },
        ".border-glow-red": {
          "border-color": "#FB635E",
          "box-shadow":
            "inset 0 0 4px rgba(251,99,94,0.8), inset 0 0 12px rgba(251,99,94,0.5), inset 0 0 24px rgba(251,99,94,0.3)",
        },
        ".border-glow-blue": {
          "border-color": "#84F7FC",
          "box-shadow":
            "inset 0 0 4px rgba(132,247,252,0.8), inset 0 0 12px rgba(132,247,252,0.5), inset 0 0 24px rgba(132,247,252,0.3)",
        },
        ".border-glow-green": {
          "border-color": "#48EDE7",
          "box-shadow":
            "inset 0 0 4px rgba(72,237,231,0.8), inset 0 0 12px rgba(72,237,231,0.5), inset 0 0 24px rgba(72,237,231,0.3)",
        },
      });
    },
  ],
};

export default config;
