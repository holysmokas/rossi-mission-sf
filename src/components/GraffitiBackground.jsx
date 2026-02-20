import { useEffect, useRef } from 'react'

class FloatingItem {
  constructor(w, h, startRandom) {
    this.w = w
    this.h = h
    this.reset(startRandom)
  }

  reset(startRandom) {
    this.x = Math.random() * this.w
    this.y = startRandom ? Math.random() * this.h : -80
    this.size = 30 + Math.random() * 55
    this.speed = 0.2 + Math.random() * 0.4
    this.opacity = 0.25 + Math.random() * 0.4
    this.type = Math.floor(Math.random() * 5)
    this.rotation = (Math.random() - 0.5) * 0.6
    this.rotSpeed = (Math.random() - 0.5) * 0.003
    this.drift = (Math.random() - 0.5) * 0.2
    this.wobble = Math.random() * Math.PI * 2
    this.wobbleSpeed = 0.008 + Math.random() * 0.012
    this.wobbleAmt = 0.3 + Math.random() * 0.5
  }

  update() {
    this.y += this.speed
    this.wobble += this.wobbleSpeed
    this.x += Math.sin(this.wobble) * this.wobbleAmt + this.drift
    this.rotation += this.rotSpeed
    if (this.y > this.h + 100) this.reset(false)
  }

  draw(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rotation)
    ctx.globalAlpha = this.opacity
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5 + this.size / 40
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const s = this.size
    switch (this.type) {
      case 0: this.drawSneaker(ctx, s); break
      case 1: this.drawTShirt(ctx, s); break
      case 2: this.drawPants(ctx, s); break
      case 3: this.drawPastel(ctx, s); break
      case 4: this.drawPalette(ctx, s); break
    }
    ctx.restore()
  }

  drawSneaker(ctx, s) {
    ctx.beginPath()
    ctx.moveTo(-s / 2, s / 4)
    ctx.lineTo(-s / 2 - s / 10, s / 3)
    ctx.lineTo(s / 2 + s / 8, s / 3)
    ctx.lineTo(s / 2 + s / 6, s / 5)
    ctx.quadraticCurveTo(s / 2 + s / 6, -s / 10, s / 3, -s / 6)
    ctx.lineTo(s / 6, -s / 5)
    ctx.lineTo(-s / 10, -s / 4)
    ctx.lineTo(-s / 4, -s / 3)
    ctx.lineTo(-s / 3, -s / 3)
    ctx.lineTo(-s / 2, -s / 6)
    ctx.closePath()
    ctx.stroke()
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.arc(-s / 10 + i * s / 6, -s / 6 - i * s / 20, 1.5, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${this.opacity})`
      ctx.fill()
    }
    ctx.beginPath()
    ctx.moveTo(-s / 3, s / 8)
    ctx.quadraticCurveTo(0, -s / 8, s / 3, s / 10)
    ctx.stroke()
  }

  drawTShirt(ctx, s) {
    ctx.beginPath()
    ctx.moveTo(-s / 6, -s / 2.5)
    ctx.lineTo(-s / 2, -s / 4)
    ctx.lineTo(-s / 2 - s / 8, -s / 10)
    ctx.lineTo(-s / 3, -s / 10)
    ctx.lineTo(-s / 3.5, s / 10)
    ctx.lineTo(-s / 3, s / 2)
    ctx.lineTo(s / 3, s / 2)
    ctx.lineTo(s / 3.5, s / 10)
    ctx.lineTo(s / 3, -s / 10)
    ctx.lineTo(s / 2 + s / 8, -s / 10)
    ctx.lineTo(s / 2, -s / 4)
    ctx.lineTo(s / 6, -s / 2.5)
    ctx.quadraticCurveTo(0, -s / 4, -s / 6, -s / 2.5)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-s / 8, -s / 2.8)
    ctx.lineTo(0, -s / 4)
    ctx.lineTo(s / 8, -s / 2.8)
    ctx.stroke()
  }

  drawPants(ctx, s) {
    ctx.beginPath()
    ctx.moveTo(-s / 3, -s / 2)
    ctx.lineTo(s / 3, -s / 2)
    ctx.lineTo(s / 3, -s / 2.8)
    ctx.lineTo(-s / 3, -s / 2.8)
    ctx.closePath()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-s / 3, -s / 2)
    ctx.lineTo(-s / 2.5, s / 2)
    ctx.lineTo(-s / 12, s / 2)
    ctx.lineTo(0, s / 10)
    ctx.lineTo(s / 12, s / 2)
    ctx.lineTo(s / 2.5, s / 2)
    ctx.lineTo(s / 3, -s / 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, -s / 2)
    ctx.lineTo(0, s / 10)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-s / 3.5, -s / 3)
    ctx.lineTo(-s / 6, -s / 3.5)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(s / 3.5, -s / 3)
    ctx.lineTo(s / 6, -s / 3.5)
    ctx.stroke()
  }

  drawPastel(ctx, s) {
    const cw = s / 4
    const ch = s * 0.9
    ctx.beginPath()
    ctx.moveTo(-cw, -ch / 2 + ch / 5)
    ctx.lineTo(-cw, ch / 2)
    ctx.lineTo(cw, ch / 2)
    ctx.lineTo(cw, -ch / 2 + ch / 5)
    ctx.closePath()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-cw, -ch / 2 + ch / 5)
    ctx.lineTo(0, -ch / 2)
    ctx.lineTo(cw, -ch / 2 + ch / 5)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-cw, ch / 8)
    ctx.lineTo(cw, ch / 8)
    ctx.moveTo(-cw, ch / 4)
    ctx.lineTo(cw, ch / 4)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, -ch / 3, 2, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${this.opacity * 0.6})`
    ctx.fill()
  }

  drawPalette(ctx, s) {
    ctx.beginPath()
    ctx.ellipse(0, 0, s / 2, s / 2.5, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(-s / 5, s / 8, s / 8, s / 10, -0.3, 0, Math.PI * 2)
    ctx.stroke()
    const blobs = [
      { x: s / 5, y: -s / 6, r: s / 10 },
      { x: 0, y: -s / 4, r: s / 12 },
      { x: -s / 6, y: -s / 5, r: s / 14 },
      { x: s / 6, y: s / 8, r: s / 11 },
      { x: s / 3, y: 0, r: s / 13 },
    ]
    blobs.forEach(b => {
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
      ctx.stroke()
    })
  }
}

class PaintSpeck {
  constructor(w, h) {
    this.w = w
    this.h = h
    this.reset()
  }

  reset() {
    this.x = Math.random() * this.w
    this.y = Math.random() * this.h
    this.radius = 0.5 + Math.random() * 2.5
    this.opacity = Math.random() * 0.35
    this.life = 300 + Math.random() * 500
    this.maxLife = this.life
    this.driftX = (Math.random() - 0.5) * 0.15
    this.driftY = -0.05 - Math.random() * 0.15
  }

  update() {
    this.life--
    this.x += this.driftX
    this.y += this.driftY
    if (this.life <= 0) this.reset()
  }

  draw(ctx) {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${this.opacity * (this.life / this.maxLife)})`
    ctx.fill()
  }
}

export default function GraffitiBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)
    let animId

    const items = Array.from({ length: 18 }, () => new FloatingItem(w, h, true))
    const particles = Array.from({ length: 60 }, () => new PaintSpeck(w, h))

    const handleResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
      items.forEach(i => { i.w = w; i.h = h })
      particles.forEach(p => { p.w = w; p.h = h })
    }
    window.addEventListener('resize', handleResize)

    const animate = () => {
      ctx.clearRect(0, 0, w, h)
      particles.forEach(p => { p.update(); p.draw(ctx) })
      items.forEach(i => { i.update(); i.draw(ctx) })
      animId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        opacity: 0.12,
        pointerEvents: 'none',
      }}
    />
  )
}
