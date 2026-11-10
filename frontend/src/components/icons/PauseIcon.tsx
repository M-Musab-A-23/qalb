import { IconBase, type IconProps } from "./IconBase";

export function PauseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 5H9C9.5523 5 10 5.4477 10 6V18C10 18.5523 9.5523 19 9 19H7C6.4477 19 6 18.5523 6 18V6C6 5.4477 6.4477 5 7 5Z" />
      <path d="M15 5H17C17.5523 5 18 5.4477 18 6V18C18 18.5523 17.5523 19 17 19H15C14.4477 19 14 18.5523 14 18V6C14 5.4477 14.4477 5 15 5Z" />
    </IconBase>
  );
}
