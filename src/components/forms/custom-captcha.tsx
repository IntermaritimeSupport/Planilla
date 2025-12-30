"use client"

import { t } from "i18next"
import type React from "react"
import { useState, useRef } from "react"

interface CustomCaptchaProps {
  verified: boolean
  onVerify: (verified: boolean) => void
}

export const CustomCaptcha: React.FC<CustomCaptchaProps> = ({ verified, onVerify }) => {
  const [captchaCode, setCaptchaCode] = useState("")
  const [userInput, setUserInput] = useState("")
  const [error, setError] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Generar un código CAPTCHA aleatorio
  const generateCaptcha = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
    let code = ""
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setCaptchaCode(code)
    drawCaptcha(code)
    setUserInput("")
    setError(false)
    onVerify(false)
  }

  // Dibujar el CAPTCHA en el canvas
  const drawCaptcha = (code: string) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Limpiar el canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Fondo
    ctx.fillStyle = "#f3f4f6"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Dibujar líneas aleatorias
    ctx.strokeStyle = "#94a3b8"
    ctx.lineWidth = 1
    for (let i = 0; i < 10; i++) {
      ctx.beginPath()
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height)
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height)
      ctx.stroke()
    }

    // Dibujar puntos aleatorios
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = "#94a3b8"
      ctx.beginPath()
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1, 0, Math.PI * 2)
      ctx.fill()
    }

    // Configurar el texto
    ctx.font = "bold 24px Arial"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    // Dibujar cada carácter con rotación y posición aleatoria
    for (let i = 0; i < code.length; i++) {
      ctx.save()
      ctx.translate(20 + i * 25, canvas.height / 2)
      ctx.rotate((Math.random() - 0.5) * 0.4)
      ctx.fillStyle = `rgb(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, ${Math.floor(
        Math.random() * 100,
      )})`
      ctx.fillText(code[i], 0, 0)
      ctx.restore()
    }
  }

  // Verificar el CAPTCHA
  const verifyCaptcha = () => {
    if (userInput.toLowerCase() === captchaCode.toLowerCase()) {
      onVerify(true)
      setError(false)
    } else {
      setError(true)
      onVerify(false)
      generateCaptcha()
    }
  }

  // Generar CAPTCHA al cargar el componente
  useState(() => {
    generateCaptcha()
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center">
        <canvas
          ref={canvasRef}
          width={180}
          height={60}
          className="border border-gray-200 rounded-l-xl bg-gray-50"
        ></canvas>
        <button
          type="button"
          onClick={generateCaptcha}
          className="h-[60px] px-4 bg-gray-100 border border-l-0 border-gray-200 rounded-r-xl hover:bg-gray-200 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      <div className="flex space-x-2">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={t("Enter Code")}
          className="flex-1 h-12 px-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={verifyCaptcha}
          className="h-12 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          {t("Verify")}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{t("Incorrect code. Please try again.")}</p>}
      {verified && <p className="text-sm text-green-500">{t("Verification successful!")}</p>}
    </div>
  )
}
