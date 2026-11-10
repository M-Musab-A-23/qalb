import { IconBase, type IconProps } from "./IconBase";

export function LockIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6.7 10.5H17.3C18.515 10.5 19.5 11.485 19.5 12.7V18.3C19.5 19.515 18.515 20.5 17.3 20.5H6.7C5.485 20.5 4.5 19.515 4.5 18.3V12.7C4.5 11.485 5.485 10.5 6.7 10.5Z" />
      <path d="M8 10.5V8C8 6.9391 8.4215 5.9217 9.1716 5.1716C9.9217 4.4214 10.9391 4 12 4C13.0609 4 14.0783 4.4214 14.8284 5.1716C15.5785 5.9217 16 6.9391 16 8V10.5" />
    </IconBase>
  );
}
