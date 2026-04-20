import React from "react";

type ErrorTooltipSVGProps = {
  children?: React.ReactNode;
  width?: number;
  height?: number;
  className?: string;
};

const ErrorTooltipSVG = ({
  children,
  width = 370,
  height = 125,
  className = "",
}: ErrorTooltipSVGProps) => {
  const arrowHeight = 8;
  const cx = width / 2;

  return (
    <div
      className={`relative ${className}`}
      style={{
        width: `${width}px`,
        minHeight: `${height}px`,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox={`0 0 ${width} ${height + arrowHeight}`}
        width="100%"
        height={height + arrowHeight}
        style={{
          display: "block",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <g filter="url(#error_tooltip_filter_shadow)">
          <rect
            x="0.5"
            y="0.5"
            width={width - 1}
            height={height - 1}
            rx="19.5"
            fill="#060A08"
            shapeRendering="crispEdges"
          />
          <rect
            x="0.5"
            y="0.5"
            width={width - 1}
            height={height - 1}
            rx="19.5"
            stroke="#EA5C5C"
            shapeRendering="crispEdges"
          />
          <path
            d={`M${cx + 4.5} ${height}H${cx - 4.5}C${cx - 4.5} ${height} ${cx} ${height + 1} ${cx} ${height + arrowHeight}C${cx} ${height + 1} ${cx + 4.5} ${height} ${cx + 4.5} ${height}Z`}
            fill="#EA5C5C"
          />
        </g>

        <defs>
          <filter
            id="error_tooltip_filter_shadow"
            x="-70"
            y="-20"
            width={width + 140}
            height={height + arrowHeight + 90}
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
        </defs>
      </svg>

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: `${height}px`,
          pointerEvents: "all",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ErrorTooltipSVG;
