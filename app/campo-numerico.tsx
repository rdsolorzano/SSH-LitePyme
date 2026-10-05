'use client'

export default function CampoNumerico({
  value,
  onChange,
  paso = 1,
  className = '',
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  paso?: number
  className?: string
  placeholder?: string
}) {
  function ajustar(delta: number) {
    const actual = parseFloat(value) || 0
    const nuevo = Math.round((actual + delta) * 100) / 100
    onChange(String(nuevo))
  }

  return (
    <div className="relative">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded border px-2 py-2 pr-6 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${className}`}
      />
      <div className="absolute right-0 top-0 flex h-full flex-col border-l">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => ajustar(paso)}
          className="flex-1 px-1 text-[9px] leading-none text-gray-500 hover:bg-gray-100"
        >
          ▲
        </button>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => ajustar(-paso)}
          className="flex-1 px-1 text-[9px] leading-none text-gray-500 hover:bg-gray-100"
        >
          ▼
        </button>
      </div>
    </div>
  )
}