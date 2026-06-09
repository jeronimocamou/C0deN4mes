export default function Logo({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const titleClass = size === 'lg'
    ? 'font-mono text-5xl sm:text-7xl font-bold tracking-tight'
    : 'font-mono text-2xl font-bold tracking-tight'

  return (
    <div className="relative inline-block select-none">
      {/* Glow blobs behind title */}
      {size === 'lg' && (
        <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
          <div className="w-72 h-36 bg-red-600/25 rounded-full blur-3xl translate-x-[-45%]" />
          <div className="w-72 h-36 bg-blue-600/25 rounded-full blur-3xl translate-x-[45%]" />
        </div>
      )}
      <h1 className={titleClass}>
        <span
          className="text-red-500"
          style={{ textShadow: '0 0 24px rgba(239,68,68,0.7)' }}
        >c</span>
        <span className="text-white">0de</span>
        <span
          className="text-blue-500"
          style={{ textShadow: '0 0 24px rgba(59,130,246,0.7)' }}
        >n</span>
        <span className="text-white">4mes</span>
      </h1>
    </div>
  )
}
