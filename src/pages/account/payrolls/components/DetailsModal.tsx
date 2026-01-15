"use client"

import type React from "react"
import { useMemo } from "react"
import { X, Download, Landmark, ReceiptText, Wallet, CalendarDays, User } from "lucide-react"
import { formatCurrency, type PayrollCalculation } from "./AllPayrolls"
import jsPDF from "jspdf"

// --- Utilidades de Cálculo con Tipado Seguro ---
const preciseRound = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100

const getDeductionAmount = (
  deduction: { amount: string | number; frequency: string; isActive: boolean },
  isQuincenalRequest: boolean,
): number => {
  if (!deduction?.isActive) return 0
  
  // Convertimos a número de forma segura
  const amount = Number(deduction.amount) || 0
  
  if (deduction.frequency === "Quincenal") {
    return isQuincenalRequest ? amount : amount * 2
  }
  
  // Frecuencia Mensual
  return isQuincenalRequest ? amount / 2 : amount
}

const DetailsModal: React.FC<{
  calculation: PayrollCalculation
  isOpen: boolean
  onClose: () => void
}> = ({ calculation, isOpen, onClose }) => {
  const totals = useMemo(() => {
    const recurring = calculation.employee.recurringDeductions?.filter(d => d.isActive) || []
    
    // Aseguramos que ISR y SSS sean números (o 0 si son undefined)
    const sss = Number(calculation.sss) || 0
    const isr = Number(calculation.isr) || 0
    
    const monthlyRecurringTotal = recurring.reduce((acc, d) => 
      acc + getDeductionAmount(d, false), 0)
    
    const biweeklyRecurringTotal = recurring.reduce((acc, d) => 
      acc + getDeductionAmount(d, true), 0)

    return {
      monthlyDeductions: preciseRound(sss + isr + monthlyRecurringTotal),
      biweeklyDeductions: preciseRound((sss / 2) + (isr / 2) + biweeklyRecurringTotal),
      recurringItems: recurring,
      sss,
      isr,
      thirteenthMonth: Number(calculation.thirteenthMonth) || 0
    }
  }, [calculation])

  if (!isOpen) return null

  const handleDownloadPDF = (isMonthly: boolean) => {
    const doc = new jsPDF()
    const margin = 20
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 25

    // Estilos de ayuda
    const drawLine = () => {
      doc.setDrawColor(220, 220, 220)
      doc.line(margin, y, pageWidth - margin, y)
      y += 10
    }

    // Encabezado
    doc.setFillColor(30, 41, 59)
    doc.rect(0, 0, pageWidth, 45, "F")
    
    // Logo de la compañía (si existe)
    const companyLogo = (calculation?.employee as any)?.company?.logo
    const logoX = pageWidth - margin - 28
    const logoY = 10
    
    if (companyLogo) {
      try {
        doc.addImage(companyLogo, "PNG", logoX, logoY, 22, 22)
      } catch (e) {
        // Si hay error al cargar la imagen, usar logo generico
        drawGenericLogo(doc, logoX, logoY)
      }
    } else {
      // Logo generico default si no existe
      drawGenericLogo(doc, logoX, logoY)
    }
    
    // Función para dibujar un logo genérico
    function drawGenericLogo(doc: any, x: number, y: number) {
      const size = 22
      // Cuadrado redondeado
      doc.setFillColor(59, 130, 246) // Azul
      doc.setDrawColor(29, 78, 216)
      doc.rect(x, y, size, size, "FD")
      
      // Letras "BP" en blanco
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text("LOGO", x + size / 2, y + size / 2 + 2, { align: "center" })
    }
    
    // Título y fecha
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont("helvetica", "bold")
    doc.text("COMPROBANTE DE PAGO", margin, 20)
    
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, margin, 32)

    y = 50
    // Info Compañía
    doc.setFillColor(241, 245, 249)
    doc.rect(margin - 5, y - 5, pageWidth - (margin * 2) + 10, 20, "F")
    doc.setTextColor(30, 41, 59)
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text((calculation?.employee as any)?.company?.name || "N/A", margin, y + 4)
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(71, 85, 105)
    doc.text(`Departamento: ${calculation?.employee?.department || "N/A"}`, margin, y + 12)
    
    y += 26
    // Info Empleado
    doc.setTextColor(100, 100, 100)
    doc.setFontSize(9)
    doc.text("COLABORADOR", margin, y)
    y += 6
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text(`${calculation.employee.firstName} ${calculation.employee.lastName}`, margin, y)
    doc.setFont("helvetica", "normal")
    doc.text(`ID: ${calculation.employee.cedula}`, margin + 80, y)
    y += 6
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(`Posición: ${calculation?.employee?.position || "N/A"}`, margin, y)
    y += 8
    drawLine()

    // Cuerpo de Cálculos
    const renderRow = (label: string, value: number, isTotal = false) => {
      doc.setFontSize(10)
      doc.setFont("helvetica", isTotal ? "bold" : "normal")
      doc.text(label, margin, y)
      doc.text(formatCurrency(value), pageWidth - margin, y, { align: "right" })
      y += 8
    }

    doc.setFont("helvetica", "bold")
    if (isMonthly) {
      doc.text("DESGLOSE MENSUAL (30 DÍAS)", margin, y)
    } else {
      doc.text("DESGLOSE QUINCENAL (15 DÍAS)", margin, y)
    }
    y += 8
    renderRow("Salario Base Bruto", isMonthly ? calculation.baseSalary : calculation.baseSalary / 2)
    renderRow("Seguro Social (SSS)", isMonthly ? -totals.sss : -(totals.sss / 2))
    if (totals.isr > 0) renderRow("Impuesto sobre la Renta (ISR)", isMonthly ? -totals.isr : -(totals.isr / 2))
    
    totals.recurringItems.forEach(d => {
      renderRow(
        `${d.name}`, 
        -getDeductionAmount(d, !isMonthly)
      )
    })

    y += 2
    doc.setFillColor(248, 250, 252)
    doc.rect(margin - 2, y - 5, pageWidth - (margin * 2) + 4, 10, "F")
    if (isMonthly) {
      renderRow("SALARIO NETO MENSUAL", calculation.netSalaryMonthly, true)
    } else {
      renderRow("SALARIO NETO QUINCENAL", calculation.netSalaryBiweekly, true)
    }
    
    if (isMonthly && totals.thirteenthMonth > 0) {
      y += 5
      renderRow("Provisión Décimo Tercer Mes", totals.thirteenthMonth)
    }

    // Pie de página / Firma
    y = 250
    doc.setDrawColor(150, 150, 150)
    doc.line(margin, y, margin + 60, y)
    doc.setFontSize(8)
    doc.text("Firma del Recibido", margin, y + 5)
    
    const period = isMonthly ? "Mensual" : "Quincenal"
    doc.save(`Recibo_${period}_${calculation.employee.lastName}_${calculation.employee.cedula}.pdf`)
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header Superior */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
              <ReceiptText size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Detalle de Nómina</h2>
              <p className="text-sm text-slate-400">Periodo de pago actual</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleDownloadPDF(true)}
              className="group flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium border border-blue-500"
              title="Descargar desglose mensual en PDF"
            >
              <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
              <span>PDF Mensual</span>
            </button>
            <button
              onClick={() => handleDownloadPDF(false)}
              className="group flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-all duration-200 font-medium border border-violet-500"
              title="Descargar desglose quincenal en PDF"
            >
              <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
              <span>PDF Quincenal</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-xl"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 space-y-8">
          {/* Información de la Compañía */}
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-800/30 p-5 rounded-xl border border-slate-700/50 mb-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Landmark size={28} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white mb-1">{(calculation?.employee as any)?.company?.name || "N/A"}</h3>
                <div className="flex flex-wrap gap-3 text-sm">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-slate-500">Departamento:</span>
                    <span className="font-medium">{calculation?.employee?.department || "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Identidad */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <User size={14} />
                <span className="text-xs font-semibold uppercase tracking-wider">Empleado</span>
              </div>
              <p className="text-white font-medium">{calculation?.employee?.firstName} {calculation?.employee?.lastName}</p>
              <p className="text-slate-500 text-sm">{calculation?.employee?.cedula}</p>
              <p className="text-slate-400 text-xs mt-1">{calculation?.employee?.position || "N/A"}</p>
            </div>
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Landmark size={14} />
                <span className="text-xs font-semibold uppercase tracking-wider">Salario Base</span>
              </div>
              <p className="text-white font-medium">{formatCurrency(Number(calculation.employee.salary))}</p>
              <p className="text-slate-500 text-sm capitalize">{calculation.employee.salaryType}</p>
            </div>
            <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <Wallet size={14} />
                <span className="text-xs font-semibold uppercase tracking-wider">Ingreso Bruto</span>
              </div>
              <p className="text-blue-400 font-bold text-xl">{formatCurrency(calculation.baseSalary)}</p>
            </div>
          </div>

          {/* Deducciones */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-slate-300">Mensual</h4>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-lg">30 DÍAS</span>
              </div>
              <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-800 space-y-4">
                <DeductionRow label="Seguro Social (SSS)" value={totals.sss} />
                {totals.isr > 0 && <DeductionRow label="Impuesto Renta (ISR)" value={totals.isr} />}
                {totals.recurringItems.map((d, i) => (
                  <DeductionRow key={i} label={d.name} value={getDeductionAmount(d, false)} sublabel={d.frequency} />
                ))}
                <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                  <span className="text-sm font-bold text-red-400">Total Deducciones</span>
                  <span className="text-lg font-bold text-red-400">{formatCurrency(totals.monthlyDeductions)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-slate-300">Quincenal</h4>
                <span className="px-2 py-1 bg-violet-500/20 text-violet-400 text-xs font-semibold rounded-lg">15 DÍAS</span>
              </div>
              <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-800 space-y-4">
                <DeductionRow label="Seguro Social" value={totals.sss / 2} />
                {totals.isr > 0 && <DeductionRow label="ISR" value={totals.isr / 2} />}
                {totals.recurringItems.map((d, i) => (
                  <DeductionRow key={i} label={d.name} value={getDeductionAmount(d, true)} />
                ))}
                <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                  <span className="text-sm font-bold text-orange-400">Deducción p/pago</span>
                  <span className="text-lg font-bold text-orange-400">{formatCurrency(totals.biweeklyDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Totales Netos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResultCard 
              label="Pago Neto Mensual" 
              value={calculation.netSalaryMonthly} 
              icon={<Wallet className="text-blue-200" />} 
              gradient="from-blue-600 to-blue-700" 
            />
            <ResultCard 
              label="Pago por Quincena" 
              value={calculation.netSalaryBiweekly} 
              icon={<CalendarDays className="text-emerald-200" />} 
              gradient="from-emerald-600 to-emerald-700" 
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Sub-componentes para limpiar el código principal
const DeductionRow = ({ label, value, sublabel }: { label: string; value: number; sublabel?: string }) => (
  <div className="flex justify-between items-center">
    <div className="flex flex-col">
      <span className="text-sm text-slate-300">{label}</span>
      {sublabel && <span className="text-[10px] text-slate-500 uppercase">{sublabel}</span>}
    </div>
    <span className="text-sm font-semibold text-slate-100">{formatCurrency(value)}</span>
  </div>
)

const ResultCard = ({ label, value, icon, gradient }: { label: string; value: number; icon: React.ReactNode; gradient: string }) => (
  <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} rounded-2xl p-6 shadow-xl`}>
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <span className="text-white/90 font-medium">{label}</span>
      </div>
      <div className="text-4xl font-black text-white tracking-tight">{formatCurrency(value)}</div>
    </div>
    <div className="absolute -right-4 -bottom-4 text-white/10 rotate-12">
        <Landmark size={120} />
    </div>
  </div>
)

export default DetailsModal