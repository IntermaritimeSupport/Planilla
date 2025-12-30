import type React from "react"
import { useState, useRef } from "react"
import { FrontendNetworkConnection, NetworkDeviceStatus } from "./AllNetwork"

interface NetworkTopologyProps {
  conexiones: FrontendNetworkConnection[]
  selectedCompany?: { name: string } | null
}

const NetworkTopology: React.FC<NetworkTopologyProps> = ({ conexiones }) => {
  const [selectedDevice, setSelectedDevice] = useState<FrontendNetworkConnection | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hoveredDevice, setHoveredDevice] = useState<any>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ONLINE: "En línea",
      OFFLINE: "Desconectado",
      MAINTENANCE: "Mantenimiento",
      DECOMMISSIONED: "Desactivado",
      UNKNOWN: "Desconocido",
    }
    return labels[status] || status
  }

  const handleDeviceClick = (device: FrontendNetworkConnection) => {
    setSelectedDevice(selectedDevice?.id === device.id ? null : device)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.5, Math.min(3, zoomLevel * delta))
    setZoomLevel(newZoom)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleDeviceHover = (device: any, e: React.MouseEvent) => {
    setHoveredDevice(device)
    const rect = svgRef.current?.getBoundingClientRect()
    if (rect) {
      setTooltipPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }

  const handleDeviceLeave = () => {
    setHoveredDevice(null)
  }

  const resetView = () => {
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl mb-8">
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-xl font-semibold text-white mb-2">Topología de Red</h2>
        <p className="text-gray-400 text-sm mb-4">
          Visualización de las redes WiFi conectadas • Rueda del mouse para zoom • Arrastra para mover
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomLevel(Math.max(0.5, zoomLevel * 0.8))}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm hover:bg-slate-600"
          >
            -
          </button>
          <span className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm min-w-[5rem] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel(Math.min(3, zoomLevel * 1.2))}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm hover:bg-slate-600"
          >
            +
          </button>
          <button
            onClick={resetView}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm hover:bg-slate-600"
          >
            🎯 Reset
          </button>
        </div>
      </div>

      <div className="p-6">
        <svg
          ref={svgRef}
          viewBox="0 0 1200 800"
          className="w-full h-[600px] bg-slate-900 border border-slate-600 rounded-lg cursor-grab active:cursor-grabbing"
          style={{ background: "radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)" }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}>
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="1" opacity="0.3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Proveedor/Internet */}
            <g transform="translate(600, 80)">
              <circle cx="0" cy="0" r="40" fill="#ef4444" stroke="#dc2626" strokeWidth="2" />
              <text x="0" y="5" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                ISP
              </text>
              <text x="0" y="60" textAnchor="middle" fill="#94a3b8" fontSize="10">
                Proveedor de Internet
              </text>
            </g>

            {/* Router Principal */}
            <g transform="translate(600, 200)">
              <rect x="-30" y="-20" width="60" height="40" rx="8" fill="#3b82f6" stroke="#2563eb" strokeWidth="2" />
              <text x="0" y="5" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                Gateway
              </text>
              <text x="0" y="50" textAnchor="middle" fill="#94a3b8" fontSize="9">
                Centro de Conexiones
              </text>
            </g>

            {/* Línea ISP a Gateway */}
            <line x1="600" y1="120" x2="600" y2="180" stroke="#64748b" strokeWidth="2" strokeDasharray="5,5" />

            {/* Dispositivos de Red */}
            {conexiones.map((conexion, index) => {
              const angle = (index * 2 * Math.PI) / Math.max(conexiones.length, 1)
              const radius = 200
              const x = 600 + Math.cos(angle) * radius
              const y = 400 + Math.sin(angle) * radius

              const isSelected = selectedDevice?.id === conexion.id
              const isOnline = conexion.estado === NetworkDeviceStatus.ONLINE

              return (
                <g key={conexion.id} transform={`translate(${x}, ${y})`}>
                  {/* Línea al gateway */}
                  <line
                    x1={600 - x}
                    y1={200 - y}
                    x2="0"
                    y2="0"
                    stroke={isOnline ? "#10b981" : "#ef4444"}
                    strokeWidth={isSelected ? "3" : "2"}
                    opacity="0.8"
                  />

                  <g
                    style={{ cursor: "pointer" }}
                    onClick={() => handleDeviceClick(conexion)}
                    onMouseEnter={(e) => handleDeviceHover(conexion, e)}
                    onMouseLeave={handleDeviceLeave}
                  >
                    {isSelected && (
                      <circle cx="0" cy="0" r="35" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" opacity="0.8" />
                    )}

                    <rect
                      x="-25"
                      y="-15"
                      width="50"
                      height="30"
                      rx="6"
                      fill={isOnline ? "#059669" : "#dc2626"}
                      stroke={isOnline ? "#047857" : "#b91c1c"}
                      strokeWidth={isSelected ? "3" : "2"}
                    />

                    <text x="0" y="5" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
                      📶 WiFi
                    </text>

                    <text x="0" y="35" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="medium">
                      {conexion.nombre.length > 12 ? conexion.nombre.substring(0, 12) + "..." : conexion.nombre}
                    </text>
                    <text x="0" y="48" textAnchor="middle" fill="#64748b" fontSize="8">
                      {conexion.ssid}
                    </text>

                    <circle cx="25" cy="-25" r="4" fill={isOnline ? "#10b981" : "#ef4444"}>
                      {isOnline && <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />}
                    </circle>
                  </g>
                </g>
              )
            })}

            {/* Leyenda */}
            <g transform="translate(50, 650)">
              <rect
                x="0"
                y="0"
                width="280"
                height="100"
                rx="8"
                fill="#1e293b"
                stroke="#334155"
                strokeWidth="1"
                opacity="0.9"
              />
              <text x="15" y="20" fill="#f1f5f9" fontSize="12" fontWeight="bold">
                Leyenda
              </text>

              <circle cx="25" cy="40" r="6" fill="#ef4444" />
              <text x="40" y="45" fill="#94a3b8" fontSize="10">
                ISP/Proveedor
              </text>

              <rect x="19" y="55" width="12" height="8" rx="2" fill="#3b82f6" />
              <text x="40" y="62" fill="#94a3b8" fontSize="10">
                Gateway
              </text>

              <rect x="19" y="75" width="12" height="8" rx="2" fill="#059669" />
              <text x="40" y="82" fill="#94a3b8" fontSize="10">
                Red WiFi Online
              </text>

              <circle cx="180" cy="40" r="3" fill="#10b981" />
              <text x="195" y="45" fill="#94a3b8" fontSize="10">
                Online
              </text>

              <circle cx="180" cy="60" r="3" fill="#ef4444" />
              <text x="195" y="65" fill="#94a3b8" fontSize="10">
                Offline
              </text>

              <line x1="180" y1="80" x2="200" y2="80" stroke="#10b981" strokeWidth="2" />
              <text x="210" y="85" fill="#94a3b8" fontSize="10">
                Conectada
              </text>
            </g>

            {/* Info en tiempo real */}
            <g transform="translate(950, 650)">
              <rect x="0" y="0" width="200" height="100" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="1" opacity="0.9" />
              <text x="15" y="20" fill="#f1f5f9" fontSize="12" fontWeight="bold">
                Estado
              </text>
              <text x="15" y="40" fill="#94a3b8" fontSize="10">
                Redes Online:
              </text>
              <text x="150" y="40" fill="#10b981" fontSize="10" fontWeight="bold">
                {conexiones.filter((c) => c.estado === NetworkDeviceStatus.ONLINE).length}
              </text>
              <text x="15" y="55" fill="#94a3b8" fontSize="10">
                Total Redes:
              </text>
              <text x="150" y="55" fill="#94a3b8" fontSize="10" fontWeight="bold">
                {conexiones.length}
              </text>
              <text x="15" y="70" fill="#94a3b8" fontSize="10">
                Proveedores:
              </text>
              <text x="150" y="70" fill="#94a3b8" fontSize="10" fontWeight="bold">
                {new Set(conexiones.map((c) => c.proveedor)).size}
              </text>
            </g>
          </g>

          {/* Tooltip al pasar el mouse */}
          {hoveredDevice && (
            <g transform={`translate(${tooltipPosition.x + 10}, ${tooltipPosition.y - 10})`}>
              <rect x="0" y="0" width="200" height="100" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1" />
              <text x="10" y="20" fill="white" fontSize="11" fontWeight="bold">
                {hoveredDevice.nombre}
              </text>
              <text x="10" y="40" fill="#94a3b8" fontSize="9">
                SSID: {hoveredDevice.ssid}
              </text>
              <text x="10" y="55" fill="#94a3b8" fontSize="9">
                IP: {hoveredDevice.ip}
              </text>
              <text x="10" y="70" fill="#94a3b8" fontSize="9">
                Estado:{" "}
                <tspan fill={hoveredDevice.estado === NetworkDeviceStatus.ONLINE ? "#10b981" : "#ef4444"}>
                  {getStatusLabel(hoveredDevice.estado)}
                </tspan>
              </text>
              <text x="10" y="85" fill="#94a3b8" fontSize="9">
                Proveedor: {hoveredDevice.proveedor}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  )
}

export default NetworkTopology