export default function InlineError({ message }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">
      {message}
    </div>
  );
}
