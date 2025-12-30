import { forwardRef } from "react";

const InputLabel = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input(props, ref) {
  return (
    <input
      ref={ref}
      {...props}
      aria-autocomplete="none"
      className="block h-10 w-full rounded-md border-2 border-black p-2 text-sm placeholder-slate-500 shadow-[0_2px_4px_rgba(0,0,0,0.15)] disabled:opacity-55 text-black appearance-none"      />
  );
});
export default InputLabel;
