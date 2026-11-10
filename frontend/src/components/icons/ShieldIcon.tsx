import { IconBase, type IconProps } from "./IconBase";

export function ShieldIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3L4.5 6V11.6C4.5 16 7.5 19.5 12 21C16.5 19.5 19.5 16 19.5 11.6V6L12 3Z" />
      <path d="M8.8 12L11 14.2L15.2 9.8" />
    </IconBase>
  );
}
