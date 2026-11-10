import { IconBase, type IconProps } from "./IconBase";

export function InfoIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M21 12C21 16.9706 16.9706 21 12 21C7.0294 21 3 16.9706 3 12C3 7.0294 7.0294 3 12 3C16.9706 3 21 7.0294 21 12Z" />
      <path d="M12 11V16.2M12 7.8V7.9" />
    </IconBase>
  );
}
