export default function Button({ children, className="", ...props }) {
  return (
    <button
      className={`w-full bg-black text-white rounded-xl px-4 py-2 hover:bg-black/90 disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
