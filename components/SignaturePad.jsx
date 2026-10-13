import { useEffect, useRef, useState } from 'react'

export default function SignaturePad({ onChange }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const inkRef = useRef(false)
  const [hasInk, setHasInk] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const ratio = Math.max(1, window.devicePixelRatio || 1)
    const width = canvas.getBoundingClientRect().width
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(180 * ratio)
    const context = canvas.getContext('2d'); context.scale(ratio, ratio); context.lineCap = 'round'; context.lineJoin = 'round'; context.lineWidth = 2.2; context.strokeStyle = '#26211f'
  }, [])

  const point = event => { const rect = canvasRef.current.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top } }
  const start = event => { event.preventDefault(); drawing.current = true; canvasRef.current.setPointerCapture(event.pointerId); const p = point(event); const ctx = canvasRef.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(p.x, p.y) }
  const move = event => { if (!drawing.current) return; event.preventDefault(); const p = point(event); const ctx = canvasRef.current.getContext('2d'); ctx.lineTo(p.x, p.y); ctx.stroke(); inkRef.current = true; setHasInk(true) }
  const finish = event => { if (!drawing.current) return; drawing.current = false; canvasRef.current.releasePointerCapture?.(event.pointerId); onChange(inkRef.current ? canvasRef.current.toDataURL('image/png') : '') }
  const clear = () => { const canvas = canvasRef.current; canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); inkRef.current = false; setHasInk(false); onChange('') }

  return <div className="signature-pad-wrap">
    <canvas ref={canvasRef} className="signature-pad" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} />
    <div className="signature-pad-footer"><span>{hasInk ? 'Signature captured' : 'Draw your signature above'}</span><button type="button" onClick={clear}>Clear</button></div>
  </div>
}
