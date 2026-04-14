type NetworkSelectCardSVGProps = {
  children?: React.ReactNode;
};

const NetworkSelectCardSVG = ({ children }: NetworkSelectCardSVGProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 364 224"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      <rect
        x="0.5"
        y="0.5"
        width="363"
        height="223"
        rx="19.5"
        fill="#060A08"
        fillOpacity="0.4"
      />
      <rect
        x="0.5"
        y="0.5"
        width="363"
        height="223"
        rx="19.5"
        fill="url(#paint0_radial_nsc)"
        fillOpacity="0.2"
      />
      <rect
        x="0.5"
        y="0.5"
        width="363"
        height="223"
        rx="19.5"
        stroke="url(#paint1_linear_nsc)"
        strokeOpacity="0.1"
      />
      <rect
        x="0.5"
        y="0.5"
        width="363"
        height="223"
        rx="19.5"
        stroke="url(#paint2_radial_nsc)"
      />
      <rect
        x="0.5"
        y="0.5"
        width="363"
        height="223"
        rx="19.5"
        stroke="url(#paint3_radial_nsc)"
      />
      <foreignObject x="0" y="0" width="364" height="224">
        {children}
      </foreignObject>
      <defs>
        <radialGradient
          id="paint0_radial_nsc"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="rotate(31.6075) scale(427.401 694.527)"
        >
          <stop stopColor="#03FF9F" stopOpacity="0.2" />
          <stop offset="0.2" stopColor="#03FF9F" stopOpacity="0.1" />
          <stop offset="0.48" stopColor="#03FF9F" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id="paint1_linear_nsc"
          x1="182"
          y1="0"
          x2="182"
          y2="224"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="#999999" />
        </linearGradient>
        <radialGradient
          id="paint2_radial_nsc"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="rotate(90) scale(107.576 113.826)"
        >
          <stop stopColor="#64E18E" />
          <stop offset="0.25" stopColor="#1F6344" />
          <stop offset="1" stopColor="#1F6344" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id="paint3_radial_nsc"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(364 4.88727) rotate(90) scale(98.963 118.733)"
        >
          <stop offset="0.130226" stopColor="#64E18E" />
          <stop offset="0.372439" stopColor="#1F6344" />
          <stop offset="1" stopColor="#1F6344" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
};

export default NetworkSelectCardSVG;
