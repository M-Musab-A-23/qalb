import { IconBase, type IconProps } from "./IconBase";

export function CloseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 6L12 12M12 12L18 18M12 12L18 6M12 12L6 18" />
    </IconBase>
  );
}
