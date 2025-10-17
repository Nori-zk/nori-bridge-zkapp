import React from "react";

type TooltipSVGProps = {
  children?: React.ReactNode;
  width?: number;
  height?: number;
  className?: string;
};

const TooltipSVG = ({
  children,
  width = 364,
  height = 150,
  className = "",
}: TooltipSVGProps) => {
  return (
    <div
      className={`relative ${className}`}
      style={{
        width: `${width}px`,
        minHeight: height ? `${height}px` : "auto",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        style={{
          display: "block",
          position: "absolute",
          top: 0,
          left: 0,
          borderRadius: "20px",
        }}
      >
        <g filter="url(#tooltip_filter_shadow)">
          <rect
            x="0.5"
            y="0.5"
            width={width - 1}
            height={height - 1}
            rx="19.5"
            fill="#060A08"
            fillOpacity="1"
            shapeRendering="crispEdges"
          />
          <rect
            x="0.5"
            y="0.5"
            width={width - 1}
            height={height - 1}
            rx="19.5"
            fill="url(#tooltip_paint0_radial)"
            fillOpacity="0.2"
            shapeRendering="crispEdges"
          />
          <rect
            x="0.5"
            y="0.5"
            width={width - 1}
            height={height - 1}
            rx="19.5"
            stroke="url(#tooltip_paint1_linear)"
            strokeOpacity="0.1"
            shapeRendering="crispEdges"
          />
          <rect
            x="0.5"
            y="0.5"
            width={width - 1}
            height={height - 1}
            rx="19.5"
            stroke="url(#tooltip_paint2_radial)"
            shapeRendering="crispEdges"
          />
          <rect
            x="0.5"
            y="0.5"
            width={width - 1}
            height={height - 1}
            rx="19.5"
            stroke="url(#tooltip_paint3_radial)"
            shapeRendering="crispEdges"
          />
        </g>

        <defs>
          <filter
            id="tooltip_filter_shadow"
            x="-70"
            y="-20"
            width={width + 140}
            height={height + 90}
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
              result="effect1_dropShadow"
            />
            <feOffset dy="70" />
            <feGaussianBlur stdDeviation="60" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0"
            />
            <feBlend
              mode="normal"
              in2="BackgroundImageFix"
              result="effect1_dropShadow"
            />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="effect1_dropShadow"
              result="shape"
            />
          </filter>

          <radialGradient
            id="tooltip_paint0_radial"
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
            id="tooltip_paint1_linear"
            x1={width / 2}
            y1="0"
            x2={width / 2}
            y2={height}
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="white" />
            <stop offset="1" stopColor="#999999" />
          </linearGradient>

          <radialGradient
            id="tooltip_paint2_radial"
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
            id="tooltip_paint3_radial"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform={`translate(${width} 4.88727) rotate(90) scale(98.963 118.733)`}
          >
            <stop offset="0.130226" stopColor="#64E18E" />
            <stop offset="0.372439" stopColor="#1F6344" />
            <stop offset="1" stopColor="#1F6344" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "all",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default TooltipSVG;
