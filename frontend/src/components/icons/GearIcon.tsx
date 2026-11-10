import { IconBase, type IconProps } from "./IconBase";

export function GearIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7H12.5M17.5 7H20M4 17H6.5M11.5 17H20" />
      <path d="M17.5 7C17.5 8.3807 16.3807 9.5 15 9.5C13.6193 9.5 12.5 8.3807 12.5 7C12.5 5.6193 13.6193 4.5 15 4.5C16.3807 4.5 17.5 5.6193 17.5 7Z" />
      <path d="M11.5 17C11.5 18.3807 10.3807 19.5 9 19.5C7.6193 19.5 6.5 18.3807 6.5 17C6.5 15.6193 7.6193 14.5 9 14.5C10.3807 14.5 11.5 15.6193 11.5 17Z" />
    </IconBase>
  );
}
