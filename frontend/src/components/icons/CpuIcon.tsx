import { IconBase, type IconProps } from "./IconBase";

export function CpuIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8.2 6H15.8C17.015 6 18 6.985 18 8.2V15.8C18 17.015 17.015 18 15.8 18H8.2C6.985 18 6 17.015 6 15.8V8.2C6 6.985 6.985 6 8.2 6Z" />
      <path d="M10.4 9.6H13.6C14.0418 9.6 14.4 9.9582 14.4 10.4V13.6C14.4 14.0418 14.0418 14.4 13.6 14.4H10.4C9.9582 14.4 9.6 14.0418 9.6 13.6V10.4C9.6 9.9582 9.9582 9.6 10.4 9.6Z" />
      <path d="M9 2.5V6M15 2.5V6M9 18V21.5M15 18V21.5M2.5 9H6M2.5 15H6M18 9H21.5M18 15H21.5" />
    </IconBase>
  );
}
