import type { SVGProps } from "react";

export type LogoMarkProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  /** Rendered width and height in px. Minimum recommended size is 24. */
  size?: number | string;
};

/** QALB mark: a heart carrying an ECG line. */
export function LogoMark({ size = 40, ...rest }: LogoMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 88 88"
      fill="none"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={rest["aria-label"] ? undefined : true}
      role={rest["aria-label"] ? "img" : undefined}
      focusable="false"
      {...rest}
    >
      <path
        d="M44 79.2L12.32 47.08C9.87923 42.7986 9.01258 37.7984 9.87012 32.9452C10.7277 28.0921 13.2554 23.6917 17.0156 20.506C20.7758 17.3202 25.5317 15.5498 30.4598 15.5012C35.3878 15.4526 40.1777 17.129 44 20.24C47.8223 17.129 52.6122 15.4526 57.5402 15.5012C62.4683 15.5498 67.2242 17.3202 70.9844 20.506C74.7446 23.6917 77.2723 28.0921 78.1299 32.9452C78.9874 37.7984 78.1208 42.7986 75.68 47.08L44 79.2Z"
        fill="var(--color-brand-fill)"
        stroke="var(--color-brand-fill)"
      />
      <path
        d="M18.7 48.4H30.8L37.4 32.56L47.08 62.04L54.12 41.8L57.64 48.4H69.3"
        stroke="var(--color-text-on-brand)"
      />
    </svg>
  );
}
