import { IconBase, type IconProps } from "./IconBase";

export function PlusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4.5V12M12 12V19.5M12 12H4.5M12 12H19.5" />
    </IconBase>
  );
}
