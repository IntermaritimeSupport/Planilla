import classNames from "classnames";
import Spinner from "./Spinner";
export default function LoginSubmitButton({
  pending,
  model,
}: {
  pending: boolean;
  modelExists: boolean;
  model: string;
}) {
  return (
    <button
      data-testid="submit-button"
      type="submit"
      className={classNames({
        "w-full rounded bg-black px-6 py-2 text-sm font-bold uppercase tracking-wider text-white":
          true,
        "pointer-events-none cursor-not-allowed opacity-50": pending,
      })}
      aria-disabled={pending}
    >
      {pending ? (
        <>
          <Spinner /> Saving...
        </>
      ) : (`${model}`)}
    </button>
  );
}
