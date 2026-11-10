import { IconBase, type IconProps } from "./IconBase";

export function HistoryIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 12C3.5 7.3056 7.3056 3.5 12 3.5C16.6944 3.5 20.5 7.3056 20.5 12C20.5 16.6944 16.6944 20.5 12 20.5C9.6 20.5 7.4 19.5 5.9 17.8" />
      <path d="M3.5 7.5V12H8M12 7.5V12.2L14.8 13.8" />
    </IconBase>
  );
}
