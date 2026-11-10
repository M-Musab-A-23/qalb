import type { SVGProps } from "react";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  /** Rendered width and height in px. The artwork is drawn on a 24px grid. */
  size?: number | string;
};

/**
 * Shared frame for the QALB icon set: 24px grid, 1.75 rounded stroke,
 * coloured through currentColor so icons follow the active theme.
 */
export function IconBase({
  size = 24,
  children,
  "aria-label": ariaLabel,
  ...rest
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}
