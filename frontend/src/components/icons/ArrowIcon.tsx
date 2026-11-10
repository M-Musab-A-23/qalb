import { IconBase, type IconProps } from "./IconBase";

export function ArrowIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 12H20M13.5 18.5L20 12L13.5 5.5" />
    </IconBase>
  );
}
