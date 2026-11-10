import { IconBase, type IconProps } from "./IconBase";

export function ChevronIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 5.5L15.5 12L9 18.5" />
    </IconBase>
  );
}
