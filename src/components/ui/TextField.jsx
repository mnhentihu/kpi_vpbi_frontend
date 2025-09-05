export default function TextField({ label, type="text", value, onChange, name, placeholder, error }) {
  return (
    <div>
      {label && <label className="text-xs text-gray-600">{label}</label>}
      <input
        className={`mt-1 w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 ${error ? 'border-red-400' : 'border-gray-300'}`}
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
