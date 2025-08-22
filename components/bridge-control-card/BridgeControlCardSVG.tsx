type BridgeControlCardSVGProps = {
  width?: string;
  height?: string;
  children?: React.ReactNode;
};

const BridgeControlCardSVG = ({
  width,
  height,
  children,
}: BridgeControlCardSVGProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="70 0 830 475"
      width={width}
      height={447}
    >
      <g filter="url(#filter0_d_273_5871)">
        <rect
          x="70"
          width="830"
          height="475"
          rx="20"
          fill="#060A08"
          fillOpacity="0.1"
          shapeRendering="crispEdges"
        />
        <rect
          x="70"
          width="830"
          height="475"
          rx="20"
          fill="url(#paint0_radial_273_5871)"
          fillOpacity="0.2"
          shapeRendering="crispEdges"
        />
        <rect
          x="70.5"
          y="0.5"
          width="829"
          height="474"
          rx="19.5"
          stroke="url(#paint1_linear_273_5871)"
          strokeOpacity="0.1"
          shapeRendering="crispEdges"
        />
        <rect
          x="70.5"
          y="0.5"
          width="829"
          height="474"
          rx="19.5"
          stroke="url(#paint2_radial_273_5871)"
          shapeRendering="crispEdges"
        />
        <rect
          x="70.5"
          y="0.5"
          width="829"
          height="474"
          rx="19.5"
          stroke="url(#paint3_radial_273_5871)"
          shapeRendering="crispEdges"
        />
      </g>
      <foreignObject x="70" y="0" width="830" height="475">
        {children}
      </foreignObject>
      <defs>
        <filter
          id="filter0_d_273_5871"
          x="0"
          y="-20"
          width="970"
          height="635"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feMorphology
            radius="50"
            operator="erode"
            in="SourceAlpha"
            result="effect1_dropShadow_273_5871"
          />
          <feOffset dx="-20" dy="70" dx="20" />
          <feGaussianBlur stdDeviation="60" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_273_5871"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_273_5871"
            result="shape"
          />
        </filter>
        <radialGradient
          id="paint0_radial_273_5871"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(70) rotate(33.5305) scale(995.691 588.873)"
        >
          <stop stopColor="#03FF9F" stopOpacity="0.2" />
          <stop offset="0.2" stopColor="#03FF9F" stopOpacity="0.1" />
          <stop offset="0.48476" stopColor="#03FF9F" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id="paint1_linear_273_5871"
          x1="485"
          y1="0"
          x2="485"
          y2="475"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="#999999" />
        </linearGradient>
        <radialGradient
          id="paint2_radial_273_5871"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(70) rotate(90) scale(264.137 225.049)"
        >
          <stop stopColor="#64E18E" />
          <stop offset="0.25" stopColor="#1F6344" />
          <stop offset="1" stopColor="#1F6344" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id="paint3_radial_273_5871"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(900) rotate(90) scale(254.99 244.107)"
        >
          <stop stopColor="#64E18E" />
          <stop offset="0.25" stopColor="#1F6344" />
          <stop offset="1" stopColor="#1F6344" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
};

export default BridgeControlCardSVG;
