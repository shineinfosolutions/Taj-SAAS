"use client";

import { forwardRef, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export interface CashierReportRow {
  cashierId: string;
  name: string;
  orderCount: number;
  total: number;
  cash: number;
  card: number;
  upi: number;
}

export interface CashierReportData {
  date: string;
  cashiers: CashierReportRow[];
  grandTotal: number;
}

interface CashierReportPrintContentProps {
  data: CashierReportData;
  hotelName?: string;
  gstNumber?: string;
}

/** Printable A4 cashier-wise billing report. */
export const CashierReportPrintContent = forwardRef<
  HTMLDivElement,
  CashierReportPrintContentProps
>(function CashierReportPrintContent({ data, hotelName = "Taj Restaurant & Cafe", gstNumber }, ref) {
  return (
    <div
      ref={ref}
      style={{
        padding: "16mm 12mm",
        fontFamily: "Arial, sans-serif",
        color: "#000",
        width: "100%",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{hotelName}</div>
        {gstNumber && <div style={{ fontSize: 11 }}>GSTIN: {gstNumber}</div>}
        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>
          Cashier-wise Billing Report
        </div>
        <div style={{ fontSize: 11, color: "#444" }}>Date: {data.date}</div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #000" }}>
            <th style={{ textAlign: "left", padding: "6px 4px" }}>Cashier</th>
            <th style={{ textAlign: "right", padding: "6px 4px" }}>Orders</th>
            <th style={{ textAlign: "right", padding: "6px 4px" }}>Cash</th>
            <th style={{ textAlign: "right", padding: "6px 4px" }}>Card</th>
            <th style={{ textAlign: "right", padding: "6px 4px" }}>UPI</th>
            <th style={{ textAlign: "right", padding: "6px 4px" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.cashiers.map((c) => (
            <tr key={c.cashierId} style={{ borderBottom: "1px solid #ccc" }}>
              <td style={{ padding: "6px 4px", fontWeight: 700 }}>{c.name}</td>
              <td style={{ textAlign: "right", padding: "6px 4px" }}>{c.orderCount}</td>
              <td style={{ textAlign: "right", padding: "6px 4px" }}>{formatPrice(c.cash)}</td>
              <td style={{ textAlign: "right", padding: "6px 4px" }}>{formatPrice(c.card)}</td>
              <td style={{ textAlign: "right", padding: "6px 4px" }}>{formatPrice(c.upi)}</td>
              <td style={{ textAlign: "right", padding: "6px 4px", fontWeight: 800 }}>
                {formatPrice(c.total)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "2px solid #000" }}>
            <td style={{ padding: "8px 4px", fontWeight: 800 }} colSpan={5}>
              Grand Total
            </td>
            <td style={{ textAlign: "right", padding: "8px 4px", fontWeight: 800 }}>
              {formatPrice(data.grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>

      <div style={{ marginTop: 24, fontSize: 10, color: "#666", textAlign: "center" }}>
        Generated on {new Date().toLocaleString("en-IN")}
      </div>
    </div>
  );
});

/** "Print / Save PDF" button — reuses the browser print dialog, same mechanism
 * as bill printing. Choosing "Save as PDF" downloads a PDF; choosing a
 * physical printer prints it. No KOT logic involved. */
export function CashierReportPrintButton({
  data,
  hotelName,
  gstNumber,
  label = "Print / Save PDF",
  className = "btn btn-sm gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold border-none rounded-xl",
}: {
  data: CashierReportData;
  hotelName?: string;
  gstNumber?: string;
  label?: string;
  className?: string;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Cashier-Report-${data.date}`,
    pageStyle: `@page { size: A4 portrait; margin: 12mm; } @media print { body { margin: 0; } }`,
  });

  return (
    <>
      <button
        onClick={() => handlePrint()}
        disabled={data.cashiers.length === 0}
        className={className}
        title="Print or save this report as PDF"
      >
        <Printer className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </button>
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <CashierReportPrintContent ref={printRef} data={data} hotelName={hotelName} gstNumber={gstNumber} />
      </div>
    </>
  );
}
