import { IconBase, type IconProps } from "./IconBase";

export function FileIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14 3.5H7.5C7.1022 3.5 6.7206 3.658 6.4393 3.9393C6.158 4.2206 6 4.6022 6 5V19C6 19.3978 6.158 19.7794 6.4393 20.0607C6.7206 20.342 7.1022 20.5 7.5 20.5H16.5C16.8978 20.5 17.2794 20.342 17.5607 20.0607C17.842 19.7794 18 19.3978 18 19V7.5L14 3.5Z" />
      <path d="M14 3.5V7.5H18M9 13H15M9 16.5H13" />
    </IconBase>
  );
}
