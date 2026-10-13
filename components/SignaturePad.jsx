import { useEffect, useRef, useState } from 'react'

// Crop to the inked area so the stored signature displays at a natural size
// instead of a few strokes lost in a full-width canvas.
function trimmed(canvas) {
  const { width, height } = canvas
  const pixels = canvas.getContext('2d').getImageData(0, 0, width, height).data
  let top = height, left = width, right = -1, bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3]) {
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
    }
  }
  if (right < 0) return ''
  const pad = 8
  left = Math.max(0, left - pad); top = Math.max(0, top - pad)
  const w = Math.min(width, right + pad) - left, h = Math.min(height, bottom + pad) - top
  const out = document.createElement('canvas')
  out.width = w; out.height = h
  out.getContext('2d').drawImage(canvas, left, top, w, h, 0, 0, w, h)
  return out.toDataURL('image/png')
}

// Finger/mouse signature pad. Calls onChange with a PNG data URL, or '' when cleared.
export default function SignaturePad({ onChange, disabled }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const last = useRef(null)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
    canvas.width = canvas.offsetWidth * ratio
    canvas.height = canvas.offsetHeight * ratio
    const ctx = canvas.getContext('2d')
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#111'
  }, [])

  const point = event => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }
  const start = event => {
    if (disabled) return
    event.preventDefault()
    canvasRef.current.setPointerCapture(event.pointerId)
    drawing.current = true
    last.current = point(event)
  }
  const move = event => {
    if (!drawing.current) return
    const ctx = canvasRef.current.getContext('2d')
    const next = point(event)
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(next.x, next.y)
    ctx.stroke()
    last.current = next
    if (empty) setEmpty(false)
  }
  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    onChange(trimmed(canvasRef.current))
  }
  const clear = () => {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setEmpty(true)
    onChange('')
  }

  return (
    <div className="signature-pad">
      <canvas ref={canvasRef} aria-label="Draw your signature" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onPointerLeave={end} />
      {empty ? <span className="signature-pad-hint">Sign here</span> : <button type="button" className="signature-pad-clear" onClick={clear} disabled={disabled}>Clear</button>}
    </div>
  )
}
