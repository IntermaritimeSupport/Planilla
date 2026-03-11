// ─────────────────────────────────────────────────────────────────────────────
// exportEngine.ts  — Motor unificado Excel + PDF (sin jspdf-autotable)
// Usa jsPDF@3.x nativo con dibujo manual de tablas
// ─────────────────────────────────────────────────────────────────────────────

import * as XLSX from "xlsx"
import jsPDF from "jspdf"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt2 = (n: number) =>
  `$${(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const today = () => new Date().toLocaleDateString("es-PA")

// Colores
const C = {
  primary:   [37,  99, 235] as [number,number,number],
  secondary: [100,116,139] as [number,number,number],
  dark:      [15,  23, 42]  as [number,number,number],
  light:     [248,250,252] as [number,number,number],
  alt:       [241,245,249] as [number,number,number],
  white:     [255,255,255] as [number,number,number],
  success:   [16, 185,129] as [number,number,number],
  warning:   [245,158, 11] as [number,number,number],
  danger:    [239, 68, 68] as [number,number,number],
  teal:      [20, 184,166] as [number,number,number],
}

// ─── Motor de tabla PDF manual ───────────────────────────────────────────────

interface ColDef { header: string; width: number; align?: "left"|"right"|"center" }

interface TableOpts {
  doc: jsPDF
  startY: number
  cols: ColDef[]
  rows: string[][]
  headerColor?: [number,number,number]
  fontSize?: number
  rowHeight?: number
  pageW?: number
  marginX?: number
}

/** Dibuja una tabla en el PDF y devuelve la Y final */
const drawTable = (opts: TableOpts): number => {
  const {
    doc, startY, cols, rows,
    headerColor = C.primary,
    fontSize = 7,
    rowHeight = 7,
    pageW = doc.internal.pageSize.getWidth(),
    marginX = 10,
  } = opts

  const totalW = cols.reduce((s, c) => s + c.width, 0)
  const scale  = (pageW - marginX * 2) / totalW
  const scaled = cols.map(c => ({ ...c, width: c.width * scale }))
  const cellH  = rowHeight
  const pageH  = doc.internal.pageSize.getHeight()

  let y = startY

  // Header
  doc.setFillColor(...headerColor)
  doc.rect(marginX, y, pageW - marginX * 2, cellH + 2, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(fontSize)
  doc.setFont("helvetica", "bold")

  let x = marginX
  for (const col of scaled) {
    const align = col.align ?? "left"
    const tx = align === "right" ? x + col.width - 2 : align === "center" ? x + col.width / 2 : x + 2
    doc.text(col.header, tx, y + cellH - 1.5, { align })
    x += col.width
  }
  y += cellH + 2

  // Rows
  doc.setFont("helvetica", "normal")
  doc.setTextColor(0, 0, 0)

  rows.forEach((row, ri) => {
    // Page break
    if (y + cellH > pageH - 15) {
      doc.addPage()
      y = 15
      // Redraw header on new page
      doc.setFillColor(...headerColor)
      doc.rect(marginX, y, pageW - marginX * 2, cellH + 2, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFont("helvetica", "bold")
      let hx = marginX
      for (const col of scaled) {
        const align = col.align ?? "left"
        const tx = align === "right" ? hx + col.width - 2 : align === "center" ? hx + col.width / 2 : hx + 2
        doc.text(col.header, tx, y + cellH - 1.5, { align })
        hx += col.width
      }
      y += cellH + 2
      doc.setFont("helvetica", "normal")
      doc.setTextColor(0, 0, 0)
    }

    // Last row = totals → dark bg
    const isTotal = ri === rows.length - 1
    if (isTotal) {
      doc.setFillColor(...C.dark)
      doc.setTextColor(255, 255, 255)
      doc.setFont("helvetica", "bold")
    } else if (ri % 2 === 1) {
      doc.setFillColor(...C.alt)
    } else {
      doc.setFillColor(...C.white)
    }
    doc.rect(marginX, y, pageW - marginX * 2, cellH, "F")

    let cx = marginX
    for (let ci = 0; ci < scaled.length; ci++) {
      const col = scaled[ci]
      const val = row[ci] ?? ""
      const align = col.align ?? (ci > 1 ? "right" : "left")
      const tx = align === "right" ? cx + col.width - 2 : align === "center" ? cx + col.width / 2 : cx + 2
      doc.text(val, tx, y + cellH - 1.5, { align })
      cx += col.width
    }

    if (isTotal) {
      doc.setTextColor(0, 0, 0)
      doc.setFont("helvetica", "normal")
    }
    y += cellH
  })

  return y + 3
}

// ─── Cabecera PDF ─────────────────────────────────────────────────────────────

const addHeader = (doc: jsPDF, title: string, subtitle: string, company: string): number => {
  const W = doc.internal.pageSize.getWidth()
  doc.setFillColor(...C.primary)
  doc.rect(0, 0, W, 26, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14); doc.setFont("helvetica", "bold")
  doc.text(title, 12, 11)
  doc.setFontSize(8); doc.setFont("helvetica", "normal")
  doc.text(subtitle, 12, 19)
  doc.setFontSize(7)
  doc.text(company, W - 12, 11, { align: "right" })
  doc.text(`Generado: ${today()}`, W - 12, 19, { align: "right" })
  doc.setTextColor(0, 0, 0)
  return 32
}

// ─── Pie de página ────────────────────────────────────────────────────────────

const addFooter = (doc: jsPDF) => {
  const pages = doc.getNumberOfPages()
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setDrawColor(...C.secondary)
    doc.setLineWidth(0.2)
    doc.line(10, H - 12, W - 10, H - 12)
    doc.setFontSize(6.5); doc.setTextColor(...C.secondary)
    doc.text("Sistema de Planilla — Panamá", 10, H - 7)
    doc.text(`Página ${i} de ${pages}`, W - 10, H - 7, { align: "right" })
  }
}

// ─── Hoja resumen Excel ───────────────────────────────────────────────────────

const summarySheet = (rows: (string | number | [string, string|number])[]) => {
  const formatted = rows.map(r => 
    Array.isArray(r) ? r : [r, ""]
  ) as [string|number, string|number][]
  const ws = XLSX.utils.aoa_to_sheet(formatted)
  ws["!cols"] = [{ wch: 38 }, { wch: 18 }]
  return ws
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PLANILLA
// ─────────────────────────────────────────────────────────────────────────────

export interface PayrollCalcRow {
  employee: { cedula: string; firstName: string; lastName: string }
  baseSalary: number; hoursExtra: number; bonifications: number; otherIncome: number
  grossSalary: number; sss: number; isr: number; recurringAmount: number
  otherDeductions: number; totalDeductions: number; netSalary: number
  thirteenthMonth?: number
}

export interface PayrollExportParams {
  rows: PayrollCalcRow[]
  payrollDate: string; payrollType: string; quincenal?: string
  companyName: string; isPeriodThirteenthMonth?: boolean
}

export const exportPayrollExcel = (p: PayrollExportParams) => {
  const wb = XLSX.utils.book_new()
  const data = p.rows.map(c => ({
    "Cédula": c.employee.cedula, "Nombre": `${c.employee.firstName} ${c.employee.lastName}`,
    "Sal. Base": c.baseSalary, "H.Extra": c.hoursExtra, "Bonif.": c.bonifications,
    "Otros Ing.": c.otherIncome, "Bruto": c.grossSalary,
    "SS (9.75%)": c.sss, "ISR": c.isr, "Desc.Fijos": c.recurringAmount,
    "Otras Deducc.": c.otherDeductions, "T.Deducc.": c.totalDeductions, "Neto": c.netSalary,
    ...(p.isPeriodThirteenthMonth ? { "13° Mes": c.thirteenthMonth ?? 0 } : {}),
  }))
  const sum = (k: string) => data.reduce((a, r: any) => a + (Number(r[k]) || 0), 0)
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.sheet_add_json(ws, [{ "Cédula":"TOTALES","Nombre":"","Sal. Base":sum("Sal. Base"),"H.Extra":sum("H.Extra"),"Bonif.":sum("Bonif."),"Otros Ing.":sum("Otros Ing."),"Bruto":sum("Bruto"),"SS (9.75%)":sum("SS (9.75%)"),"ISR":sum("ISR"),"Desc.Fijos":sum("Desc.Fijos"),"Otras Deducc.":sum("Otras Deducc."),"T.Deducc.":sum("T.Deducc."),"Neto":sum("Neto"),...(p.isPeriodThirteenthMonth?{"13° Mes":sum("13° Mes")}:{}) }], { origin: data.length+1, skipHeader:true })
  ws["!cols"] = [14,26,12,10,10,12,12,11,9,11,12,11,11,11].map(w=>({wch:w}))
  const period = p.payrollType==="Mensual"?"Mensual":`Quincenal ${p.quincenal??""}`
  XLSX.utils.book_append_sheet(wb, ws, "Planilla")
  XLSX.utils.book_append_sheet(wb, summarySheet([["RESUMEN DE PLANILLA"],[""],["Empresa",p.companyName],["Período",period],["Fecha",new Date(p.payrollDate).toLocaleDateString("es-PA")],["Empleados",p.rows.length],[""],["Salario Bruto Total",sum("Bruto")],["SS Total",sum("SS (9.75%)")],["ISR Total",sum("ISR")],["Desc. Fijos",sum("Desc.Fijos")],["T.Deducc.",sum("T.Deducc.")],["NETO A PAGAR",sum("Neto")],...(p.isPeriodThirteenthMonth?[["13° Mes Total",sum("13° Mes")]]:[])] as any), "Resumen")
  const m = new Date(p.payrollDate).toLocaleDateString("es-PA",{month:"long",year:"numeric"})
  XLSX.writeFile(wb, `Planilla_${m.replace(" ","_")}_${p.companyName}.xlsx`)
}

export const exportPayrollPDF = (p: PayrollExportParams) => {
  const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" })
  const period = p.payrollType==="Mensual"?"Mensual":`Quincenal ${p.quincenal??""}`
  const startY = addHeader(doc, "Planilla de Salarios", `${p.companyName} · ${period} · ${new Date(p.payrollDate).toLocaleDateString("es-PA")}`, p.companyName)
  const sum = (fn:(c:PayrollCalcRow)=>number) => fmt2(p.rows.reduce((a,c)=>a+fn(c),0))
  const rows = [
    ...p.rows.map(c=>[c.employee.cedula,`${c.employee.firstName} ${c.employee.lastName}`,fmt2(c.baseSalary),fmt2(c.hoursExtra),fmt2(c.bonifications),fmt2(c.grossSalary),fmt2(c.sss),fmt2(c.isr),fmt2(c.recurringAmount),fmt2(c.otherDeductions),fmt2(c.totalDeductions),fmt2(c.netSalary),...(p.isPeriodThirteenthMonth?[fmt2(c.thirteenthMonth??0)]:[])] ),
    ["TOTALES","",sum(c=>c.baseSalary),sum(c=>c.hoursExtra),sum(c=>c.bonifications),sum(c=>c.grossSalary),sum(c=>c.sss),sum(c=>c.isr),sum(c=>c.recurringAmount),sum(c=>c.otherDeductions),sum(c=>c.totalDeductions),sum(c=>c.netSalary),...(p.isPeriodThirteenthMonth?[sum(c=>c.thirteenthMonth??0)]:[])]
  ]
  drawTable({ doc, startY, headerColor:C.primary, rows,
    cols:[{header:"Cédula",width:18},{header:"Nombre",width:38},{header:"Base",width:18,align:"right"},{header:"H.Extra",width:16,align:"right"},{header:"Bonif.",width:16,align:"right"},{header:"Bruto",width:18,align:"right"},{header:"SS",width:16,align:"right"},{header:"ISR",width:14,align:"right"},{header:"Desc.",width:16,align:"right"},{header:"Otras",width:16,align:"right"},{header:"T.Deducc.",width:18,align:"right"},{header:"Neto",width:18,align:"right"},...(p.isPeriodThirteenthMonth?[{header:"13° Mes",width:18,align:"right" as const}]:[])]
  })
  addFooter(doc)
  const m = new Date(p.payrollDate).toLocaleDateString("es-PA",{month:"long",year:"numeric"})
  doc.save(`Planilla_${m.replace(" ","_")}_${p.companyName}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DÉCIMO
// ─────────────────────────────────────────────────────────────────────────────

export interface DecimoCalcRow { cedula:string; firstName:string; lastName:string; monthlySalary:number; grossThirteenth:number; ss:number; isr:number; net:number }
export interface DecimoExportParams { rows:DecimoCalcRow[]; period:string; companyName:string }

export const exportDecimoExcel = (p: DecimoExportParams) => {
  const wb = XLSX.utils.book_new()
  const data = p.rows.map(r=>({ "Cédula":r.cedula,"Nombre":`${r.firstName} ${r.lastName}`,"Sal. Mensual":r.monthlySalary,"Décimo Bruto":r.grossThirteenth,"SS (7.25%)":r.ss,"ISR":r.isr,"Neto":r.net }))
  const sum = (k:string) => data.reduce((a,r:any)=>a+(Number(r[k])||0),0)
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.sheet_add_json(ws,[{"Cédula":"TOTALES","Nombre":"","Sal. Mensual":sum("Sal. Mensual"),"Décimo Bruto":sum("Décimo Bruto"),"SS (7.25%)":sum("SS (7.25%)"),"ISR":sum("ISR"),"Neto":sum("Neto")}],{origin:data.length+1,skipHeader:true})
  ws["!cols"]=[14,26,16,14,12,10,14].map(w=>({wch:w}))
  XLSX.utils.book_append_sheet(wb,ws,"Décimo")
  XLSX.utils.book_append_sheet(wb,summarySheet([["RESUMEN DÉCIMO TERCER MES", ""],["Empresa",p.companyName],["Período",p.period],["Generado",today()],["Empleados",p.rows.length],["",""],["Total Bruto",sum("Décimo Bruto")],["Total SS",sum("SS (7.25%)")],["Total ISR",sum("ISR")],["TOTAL NETO",sum("Neto")]]) as any,"Resumen")
  XLSX.writeFile(wb,`Decimo_${p.companyName}.xlsx`)
}

export const exportDecimoPDF = (p: DecimoExportParams) => {
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" })
  const startY = addHeader(doc,"Décimo Tercer Mes",`${p.companyName} · ${p.period}`,p.companyName)
  const sum = (fn:(r:DecimoCalcRow)=>number) => fmt2(p.rows.reduce((a,r)=>a+fn(r),0))
  const rows = [...p.rows.map(r=>[r.cedula,`${r.firstName} ${r.lastName}`,fmt2(r.monthlySalary),fmt2(r.grossThirteenth),fmt2(r.ss),fmt2(r.isr),fmt2(r.net)]),["TOTALES","",sum(r=>r.monthlySalary),sum(r=>r.grossThirteenth),sum(r=>r.ss),sum(r=>r.isr),sum(r=>r.net)]]
  drawTable({ doc, startY, headerColor:C.warning, rows,
    cols:[{header:"Cédula",width:22},{header:"Nombre",width:50},{header:"Sal. Mensual",width:26,align:"right"},{header:"Bruto",width:22,align:"right"},{header:"SS",width:18,align:"right"},{header:"ISR",width:16,align:"right"},{header:"Neto",width:22,align:"right"}]
  })
  addFooter(doc)
  doc.save(`Decimo_${p.companyName}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SIPE
// ─────────────────────────────────────────────────────────────────────────────

export interface SipeCalcRow { cedula:string; firstName:string; lastName:string; gross:number; ssEmp:number; ssPat:number; eduEmp:number; eduPat:number; riesgo:number; isr:number; decCSS:number; totalSipe:number }
export interface SipeExportParams { rows:SipeCalcRow[]; month:string; companyName:string }

export const exportSipeExcel = (p: SipeExportParams) => {
  const wb = XLSX.utils.book_new()
  const data = p.rows.map(r=>({ "Cédula":r.cedula,"Nombre":`${r.firstName} ${r.lastName}`,"Bruto":r.gross,"SS Emp":r.ssEmp,"SS Pat":r.ssPat,"Edu Emp":r.eduEmp,"Edu Pat":r.eduPat,"Riesgo":r.riesgo,"ISR":r.isr,"Décimo CSS":r.decCSS,"Total SIPE":r.totalSipe }))
  const sum=(k:string)=>data.reduce((a,r:any)=>a+(Number(r[k])||0),0)
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.sheet_add_json(ws,[{"Cédula":"TOTALES","Nombre":"","Bruto":sum("Bruto"),"SS Emp":sum("SS Emp"),"SS Pat":sum("SS Pat"),"Edu Emp":sum("Edu Emp"),"Edu Pat":sum("Edu Pat"),"Riesgo":sum("Riesgo"),"ISR":sum("ISR"),"Décimo CSS":sum("Décimo CSS"),"Total SIPE":sum("Total SIPE")}],{origin:data.length+1,skipHeader:true})
  ws["!cols"]=[14,26,14,12,12,12,12,12,10,12,13].map(w=>({wch:w}))
  XLSX.utils.book_append_sheet(wb,ws,"SIPE")
  XLSX.utils.book_append_sheet(wb,summarySheet([["RESUMEN PLANILLA SIPE",""],["Empresa",p.companyName],["Mes",p.month],["Generado",today()],["Empleados",p.rows.length],["",""],["Total Bruto",sum("Bruto")],["SS Empleado",sum("SS Emp")],["SS Patrono",sum("SS Pat")],["Edu Empleado",sum("Edu Emp")],["Edu Patrono",sum("Edu Pat")],["Riesgo Profesional",sum("Riesgo")],["ISR",sum("ISR")],["Décimo CSS",sum("Décimo CSS")],["TOTAL SIPE",sum("Total SIPE")]]) as any,"Resumen")
  XLSX.writeFile(wb,`SIPE_${p.month}_${p.companyName}.xlsx`)
}

export const exportSipePDF = (p: SipeExportParams) => {
  const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" })
  const startY = addHeader(doc,"Planilla SIPE — CSS",`${p.companyName} · ${p.month}`,p.companyName)
  const sum=(fn:(r:SipeCalcRow)=>number)=>fmt2(p.rows.reduce((a,r)=>a+fn(r),0))
  const rows=[...p.rows.map(r=>[r.cedula,`${r.firstName} ${r.lastName}`,fmt2(r.gross),fmt2(r.ssEmp),fmt2(r.ssPat),fmt2(r.eduEmp),fmt2(r.eduPat),fmt2(r.riesgo),fmt2(r.isr),fmt2(r.decCSS),fmt2(r.totalSipe)]),["TOTALES","",sum(r=>r.gross),sum(r=>r.ssEmp),sum(r=>r.ssPat),sum(r=>r.eduEmp),sum(r=>r.eduPat),sum(r=>r.riesgo),sum(r=>r.isr),sum(r=>r.decCSS),sum(r=>r.totalSipe)]]
  drawTable({ doc, startY, headerColor:C.success, rows,
    cols:[{header:"Cédula",width:20},{header:"Nombre",width:38},{header:"Bruto",width:20,align:"right"},{header:"SS Emp",width:18,align:"right"},{header:"SS Pat",width:18,align:"right"},{header:"Edu Emp",width:18,align:"right"},{header:"Edu Pat",width:18,align:"right"},{header:"Riesgo",width:16,align:"right"},{header:"ISR",width:14,align:"right"},{header:"Dec.CSS",width:16,align:"right"},{header:"T.SIPE",width:18,align:"right"}]
  })
  addFooter(doc)
  doc.save(`SIPE_${p.month}_${p.companyName}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. VACACIONES
// ─────────────────────────────────────────────────────────────────────────────

export interface VacacionesCalcRow { cedula:string; firstName:string; lastName:string; hireDate:Date|string; monthsWorked:number; daysEarned:number; monthlyBaseSalary:number; dailySalary:number; grossVacationPay:number; ss:number; se:number; isr:number; netVacationPay:number; status:"disponible"|"parcial"|"pendiente" }
export interface VacacionesExportParams { rows:VacacionesCalcRow[]; refDate?:string; companyName:string }

export const exportVacacionesExcel = (p: VacacionesExportParams) => {
  const wb = XLSX.utils.book_new()
  const data = p.rows.map(r=>({ "Cédula":r.cedula,"Nombre":`${r.firstName} ${r.lastName}`,"Fecha Ingreso":new Date(r.hireDate).toLocaleDateString("es-PA"),"Meses":r.monthsWorked,"Días Ganados":+r.daysEarned.toFixed(2),"Sal. Mensual":r.monthlyBaseSalary,"Bruto Vac.":r.grossVacationPay,"SS":r.ss,"S.Edu.":r.se,"ISR":r.isr,"Neto Vac.":r.netVacationPay,"Estado":r.status==="disponible"?"Disponible":r.status==="parcial"?"Parcial":"Pendiente" }))
  const sum=(k:string)=>data.reduce((a,r:any)=>a+(Number(r[k])||0),0)
  const ws=XLSX.utils.json_to_sheet(data)
  XLSX.utils.sheet_add_json(ws,[{"Cédula":"TOTALES","Nombre":"","Fecha Ingreso":"","Meses":"","Días Ganados":sum("Días Ganados"),"Sal. Mensual":sum("Sal. Mensual"),"Bruto Vac.":sum("Bruto Vac."),"SS":sum("SS"),"S.Edu.":sum("S.Edu."),"ISR":sum("ISR"),"Neto Vac.":sum("Neto Vac."),"Estado":""}],{origin:data.length+1,skipHeader:true})
  ws["!cols"]=[14,26,14,10,13,14,12,10,10,10,12,12].map(w=>({wch:w}))
  XLSX.utils.book_append_sheet(wb,ws,"Vacaciones")
  XLSX.utils.book_append_sheet(wb,summarySheet([["RESUMEN VACACIONES PROPORCIONALES",""],["Empresa",p.companyName],["Fecha de corte",p.refDate??today()],["Empleados",p.rows.length],["Disponibles",p.rows.filter(r=>r.status==="disponible").length],["Parciales",p.rows.filter(r=>r.status==="parcial").length],["",""],["Total Bruto",sum("Bruto Vac.")],["Total SS",sum("SS")],["Total S.Edu.",sum("S.Edu.")],["Total ISR",sum("ISR")],["TOTAL NETO",sum("Neto Vac.")]]) as any,"Resumen")
  XLSX.writeFile(wb,`Vacaciones_${today().replace(/\//g,"-")}_${p.companyName}.xlsx`)
}

export const exportVacacionesPDF = (p: VacacionesExportParams) => {
  const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" })
  const startY = addHeader(doc,"Vacaciones Proporcionales",`${p.companyName} · Corte: ${p.refDate??today()} · Art. 54-60 CT`,p.companyName)
  const sum=(fn:(r:VacacionesCalcRow)=>number)=>fmt2(p.rows.reduce((a,r)=>a+fn(r),0))
  const rows=[...p.rows.map(r=>[r.cedula,`${r.firstName} ${r.lastName}`,new Date(r.hireDate).toLocaleDateString("es-PA"),`${r.monthsWorked}m`,`${r.daysEarned.toFixed(1)}d`,fmt2(r.monthlyBaseSalary),fmt2(r.grossVacationPay),fmt2(r.ss),fmt2(r.se),fmt2(r.isr),fmt2(r.netVacationPay),r.status==="disponible"?"✓":r.status==="parcial"?"Parc.":"Pend."]),["TOTALES","","","","",sum(r=>r.monthlyBaseSalary),sum(r=>r.grossVacationPay),sum(r=>r.ss),sum(r=>r.se),sum(r=>r.isr),sum(r=>r.netVacationPay),""]]
  drawTable({ doc, startY, headerColor:C.teal, rows,
    cols:[{header:"Cédula",width:20},{header:"Nombre",width:40},{header:"Ingreso",width:20},{header:"Antig.",width:14},{header:"Días",width:14},{header:"Sal.Mens.",width:22,align:"right"},{header:"Bruto",width:18,align:"right"},{header:"SS",width:14,align:"right"},{header:"S.Edu.",width:14,align:"right"},{header:"ISR",width:12,align:"right"},{header:"Neto",width:18,align:"right"},{header:"Estado",width:14,align:"center"}]
  })
  addFooter(doc)
  doc.save(`Vacaciones_${today().replace(/\//g,"-")}_${p.companyName}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. LIQUIDACIONES
// ─────────────────────────────────────────────────────────────────────────────

export interface LiquidacionExportRow { cedula:string; firstName:string; lastName:string; position?:string; hireDate:Date|string; fechaTerminacion:Date|string; tipoTerminacion:string; anosTrabajados:number; mesesTrabajados:number; salarioMensual:number; primaAntiguedadBruto:number; preaviso:number; vacacionesBruto:number; decimoProporcionalBruto:number; indemnizacionBruto:number; totalBruto:number; ss:number; se:number; isr:number; totalNeto:number }
export interface LiquidacionExportParams { rows:LiquidacionExportRow[]; companyName:string }

const TIPO_LABEL: Record<string,string> = { DESPIDO_INJUSTIFICADO:"Despido Injust.",RENUNCIA:"Renuncia",MUTUO_ACUERDO:"Mutuo Acuerdo",DESPIDO_JUSTIFICADO:"Despido Just." }

export const exportLiquidacionesExcel = (p: LiquidacionExportParams) => {
  const wb = XLSX.utils.book_new()
  const data = p.rows.map(r=>({ "Cédula":r.cedula,"Nombre":`${r.firstName} ${r.lastName}`,"Cargo":r.position??"","Ingreso":new Date(r.hireDate).toLocaleDateString("es-PA"),"Terminación":new Date(r.fechaTerminacion).toLocaleDateString("es-PA"),"Causa":TIPO_LABEL[r.tipoTerminacion]??r.tipoTerminacion,"Antigüedad":`${r.anosTrabajados}a ${r.mesesTrabajados%12}m`,"Sal. Mensual":r.salarioMensual,"Prima":r.primaAntiguedadBruto,"Preaviso":r.preaviso,"Vacaciones":r.vacacionesBruto,"Décimo":r.decimoProporcionalBruto,"Indemn.":r.indemnizacionBruto,"Bruto":r.totalBruto,"SS":r.ss,"S.Edu.":r.se,"ISR":r.isr,"Neto":r.totalNeto }))
  const sum=(k:string)=>data.reduce((a,r:any)=>a+(Number(r[k])||0),0)
  const ws=XLSX.utils.json_to_sheet(data)
  XLSX.utils.sheet_add_json(ws,[{"Cédula":"TOTALES","Nombre":"","Cargo":"","Ingreso":"","Terminación":"","Causa":"","Antigüedad":"","Sal. Mensual":sum("Sal. Mensual"),"Prima":sum("Prima"),"Preaviso":sum("Preaviso"),"Vacaciones":sum("Vacaciones"),"Décimo":sum("Décimo"),"Indemn.":sum("Indemn."),"Bruto":sum("Bruto"),"SS":sum("SS"),"S.Edu.":sum("S.Edu."),"ISR":sum("ISR"),"Neto":sum("Neto")}],{origin:data.length+1,skipHeader:true})
  ws["!cols"]=[14,26,16,12,14,18,12,13,12,12,12,12,12,12,10,10,10,12].map(w=>({wch:w}))
  XLSX.utils.book_append_sheet(wb,ws,"Liquidaciones")
  XLSX.utils.book_append_sheet(wb,summarySheet([["RESUMEN LIQUIDACIONES",""],["Empresa",p.companyName],["Generado",today()],["Empleados liquidados",p.rows.length],["",""],["Prima de Antigüedad",sum("Prima")],["Preaviso",sum("Preaviso")],["Vacaciones",sum("Vacaciones")],["Décimo",sum("Décimo")],["Indemnización",sum("Indemn.")],["Total Bruto",sum("Bruto")],["",""],["SS",sum("SS")],["Seg. Educativo",sum("S.Edu.")],["ISR",sum("ISR")],["TOTAL NETO",sum("Neto")]]) as any,"Resumen")
  XLSX.writeFile(wb,`Liquidaciones_${today().replace(/\//g,"-")}_${p.companyName}.xlsx`)
}

export const exportLiquidacionesPDF = (p: LiquidacionExportParams) => {
  const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" })
  const startY = addHeader(doc,"Liquidaciones Laborales",`${p.companyName} · Art. 224-225 CT Panamá · ${today()}`,p.companyName)
  const sum=(fn:(r:LiquidacionExportRow)=>number)=>fmt2(p.rows.reduce((a,r)=>a+fn(r),0))
  const rows=[...p.rows.map(r=>[r.cedula,`${r.firstName} ${r.lastName}`,TIPO_LABEL[r.tipoTerminacion]??r.tipoTerminacion,`${r.anosTrabajados}a ${r.mesesTrabajados%12}m`,fmt2(r.salarioMensual),fmt2(r.primaAntiguedadBruto),fmt2(r.preaviso),fmt2(r.vacacionesBruto),fmt2(r.decimoProporcionalBruto),fmt2(r.indemnizacionBruto),fmt2(r.totalBruto),fmt2(r.totalNeto)]),["TOTALES","","","",sum(r=>r.salarioMensual),sum(r=>r.primaAntiguedadBruto),sum(r=>r.preaviso),sum(r=>r.vacacionesBruto),sum(r=>r.decimoProporcionalBruto),sum(r=>r.indemnizacionBruto),sum(r=>r.totalBruto),sum(r=>r.totalNeto)]]
  drawTable({ doc, startY, headerColor:C.danger, rows,
    cols:[{header:"Cédula",width:20},{header:"Nombre",width:36},{header:"Causa",width:28},{header:"Antig.",width:14},{header:"Sal.Mens.",width:22,align:"right"},{header:"Prima",width:18,align:"right"},{header:"Preaviso",width:18,align:"right"},{header:"Vacac.",width:18,align:"right"},{header:"Décimo",width:16,align:"right"},{header:"Indemn.",width:18,align:"right"},{header:"Bruto",width:18,align:"right"},{header:"Neto",width:18,align:"right"}]
  })
  addFooter(doc)
  doc.save(`Liquidaciones_${today().replace(/\//g,"-")}_${p.companyName}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 5b. CARTA DE LIQUIDACIÓN INDIVIDUAL
// ─────────────────────────────────────────────────────────────────────────────

export interface LiquidacionIndividualParams {
  employee: { cedula: string; firstName: string; lastName: string; position?: string }
  companyName: string
  tipoTerminacion: string
  fechaIngreso: Date
  fechaTerminacion: Date
  anosTrabajados: number
  mesesTrabajados: number
  diasTrabajados: number
  salarioMensual: number
  salarioDiario: number
  // Conceptos brutos
  primaAntiguedadBruto: number
  semanasPrimaAntiguedad: number
  preaviso: number
  semanasPreaviso: number
  vacacionesBruto: number
  diasVacaciones: number
  decimoProporcionalBruto: number
  mesesDecimoActual: number
  indemnizacionBruto: number
  totalBruto: number
  // Deducciones
  ss: number
  se: number
  isr: number
  totalDeducciones: number
  totalNeto: number
}

export const exportLiquidacionIndividualPDF = (p: LiquidacionIndividualParams) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const W = doc.internal.pageSize.getWidth()
  const fmtDate = (d: Date) => d.toLocaleDateString("es-PA", { day: "2-digit", month: "long", year: "numeric" })

  // ── Encabezado ──
  doc.setFillColor(...C.danger)
  doc.rect(0, 0, W, 32, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(15); doc.setFont("helvetica", "bold")
  doc.text("CARTA DE LIQUIDACIÓN LABORAL", 12, 13)
  doc.setFontSize(8); doc.setFont("helvetica", "normal")
  doc.text(`Art. 224-225 · Código de Trabajo de Panamá`, 12, 21)
  doc.text(p.companyName, W - 12, 13, { align: "right" })
  doc.text(`Generado: ${today()}`, W - 12, 21, { align: "right" })
  doc.setTextColor(0, 0, 0)

  let y = 40

  // ── Info del empleado ──
  doc.setFillColor(...C.alt)
  doc.rect(10, y, W - 20, 28, "F")
  doc.setFontSize(9); doc.setFont("helvetica", "bold")
  doc.text("DATOS DEL COLABORADOR", 14, y + 7)
  doc.setFont("helvetica", "normal"); doc.setFontSize(8)
  doc.text(`Nombre: ${p.employee.firstName} ${p.employee.lastName}`, 14, y + 14)
  doc.text(`Cédula: ${p.employee.cedula}`, 14, y + 20)
  doc.text(`Cargo: ${p.employee.position ?? "—"}`, 90, y + 14)
  doc.text(`Causa: ${TIPO_LABEL[p.tipoTerminacion] ?? p.tipoTerminacion}`, 90, y + 20)
  doc.text(`Fecha de Ingreso: ${fmtDate(p.fechaIngreso)}`, 14, y + 26)
  doc.text(`Fecha de Terminación: ${fmtDate(p.fechaTerminacion)}`, 90, y + 26)
  y += 36

  // ── Antigüedad ──
  doc.setFontSize(8); doc.setFont("helvetica", "bold")
  doc.setTextColor(...C.secondary)
  doc.text(`Antigüedad: ${p.anosTrabajados} año(s) y ${p.mesesTrabajados % 12} mes(es) · ${p.diasTrabajados.toLocaleString()} días trabajados · Salario mensual: ${fmt2(p.salarioMensual)} · Salario diario: ${fmt2(p.salarioDiario)}`, 10, y)
  doc.setTextColor(0, 0, 0)
  y += 8

  // ── Tabla de conceptos ──
  const conceptos: [string, string, string][] = []
  conceptos.push(["Prima de Antigüedad (Art. 224)", `${p.semanasPrimaAntiguedad} sem.`, fmt2(p.primaAntiguedadBruto)])
  if (p.tipoTerminacion === "DESPIDO_INJUSTIFICADO") {
    conceptos.push(["Preaviso (Art. 683)", `${p.semanasPreaviso} sem.`, fmt2(p.preaviso)])
    conceptos.push(["Indemnización (Art. 225)", `${p.anosTrabajados} año(s)`, fmt2(p.indemnizacionBruto)])
  }
  conceptos.push(["Vacaciones Proporcionales (Art. 54)", `${p.diasVacaciones.toFixed(1)} días`, fmt2(p.vacacionesBruto)])
  conceptos.push(["Décimo Proporcional (Ley 44/1995)", `${p.mesesDecimoActual} meses`, fmt2(p.decimoProporcionalBruto)])

  doc.setFontSize(9); doc.setFont("helvetica", "bold")
  doc.text("CONCEPTOS A PAGAR", 10, y)
  y += 5

  drawTable({
    doc, startY: y, marginX: 10,
    headerColor: C.danger,
    cols: [
      { header: "Concepto", width: 110 },
      { header: "Base / Detalle", width: 40, align: "center" },
      { header: "Monto", width: 30, align: "right" },
    ],
    rows: [
      ...conceptos,
      ["TOTAL BRUTO", "", fmt2(p.totalBruto)],
    ],
    rowHeight: 7,
  })
  y += (conceptos.length + 2) * 7 + 12

  // ── Deducciones ──
  doc.setFontSize(9); doc.setFont("helvetica", "bold")
  doc.text("DEDUCCIONES", 10, y)
  y += 5

  drawTable({
    doc, startY: y, marginX: 10,
    headerColor: C.secondary,
    cols: [
      { header: "Concepto", width: 110 },
      { header: "Base", width: 40, align: "right" },
      { header: "Monto", width: 30, align: "right" },
    ],
    rows: [
      ["Seguro Social empleado (9.75%) — Art. 63 Ley 51/2005", fmt2(p.totalBruto), fmt2(p.ss)],
      ["Seguro Educativo empleado (1.25%) — D.L. 14 de 1994", fmt2(p.totalBruto), fmt2(p.se)],
      ["ISR — Código Fiscal Art. 700", fmt2(p.totalBruto), fmt2(p.isr)],
      ["TOTAL DEDUCCIONES", "", fmt2(p.totalDeducciones)],
    ],
    rowHeight: 7,
  })
  y += 5 * 7 + 14

  // ── Neto final ──
  doc.setFillColor(...C.success)
  doc.rect(10, y, W - 20, 16, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11); doc.setFont("helvetica", "bold")
  doc.text("TOTAL NETO A PAGAR", 14, y + 10)
  doc.text(fmt2(p.totalNeto), W - 14, y + 10, { align: "right" })
  doc.setTextColor(0, 0, 0)
  y += 26

  // ── Firmas ──
  if (y + 40 < doc.internal.pageSize.getHeight() - 20) {
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...C.secondary)
    doc.text("El presente documento certifica el pago de las prestaciones laborales correspondientes a la terminación de la relación laboral.", 10, y, { maxWidth: W - 20 })
    y += 10

    const midX = W / 2
    doc.setDrawColor(...C.secondary); doc.setLineWidth(0.3)
    doc.line(14, y + 20, midX - 8, y + 20)
    doc.line(midX + 8, y + 20, W - 14, y + 20)
    doc.setFontSize(7.5)
    doc.text("Firma del Empleador", 14, y + 25)
    doc.text(`${p.employee.firstName} ${p.employee.lastName}`, midX + 8, y + 25)
    doc.text("C.I.: " + p.employee.cedula, midX + 8, y + 30)
    doc.setTextColor(0, 0, 0)
  }

  addFooter(doc)
  doc.save(`Liquidacion_${p.employee.cedula}_${p.employee.lastName}.pdf`)
}
