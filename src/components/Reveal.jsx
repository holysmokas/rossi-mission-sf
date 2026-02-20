import useReveal from '../hooks/useReveal'

export default function Reveal({ children, className = '', style }) {
  const ref = useReveal()
  return (
    <div ref={ref} className={`reveal ${className}`} style={style}>
      {children}
    </div>
  )
}
