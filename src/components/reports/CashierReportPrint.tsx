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

/**
 * Printable cashier-wise billing report — 80mm thermal receipt format, same
 * as the customer bill (TableReceiptContent), since that's the printer this
 * report actually goes out on at the till.
 */
export const CashierReportPrintContent = forwardRef<
  HTMLDivElement,
  CashierReportPrintContentProps
>(function CashierReportPrintContent({ data, hotelName = "Taj Restaurant & Cafe", gstNumber }, ref) {
  return (
    <div
      ref={ref}
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: "12px",
        lineHeight: 1.4,
        padding: "8mm",
        maxWidth: "80mm",
        color: "#000",
        background: "#fff",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 16, fontWeight: "bold", letterSpacing: 1 }}>
          {hotelName.toUpperCase()}
        </div>
        {gstNumber && <div style={{ fontSize: 10 }}>GSTIN: {gstNumber}</div>}
        <div style={{ fontSize: 12, fontWeight: "bold", marginTop: 2 }}>
          CASHIER-WISE BILLING REPORT
        </div>
        <div style={{ fontSize: 10 }}>Date: {data.date}</div>
        <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />
      </div>

      {data.cashiers.map((c) => (
        <div key={c.cashierId} style={{ marginBottom: 6 }}>
          <table style={{ width: "100%", fontSize: 11 }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: "bold" }}>{c.name}</td>
                <td style={{ textAlign: "right" }}>{c.orderCount} orders</td>
              </tr>
              <tr>
                <td style={{ fontSize: 10 }}>Cash / Card / UPI</td>
                <td style={{ textAlign: "right", fontSize: 10 }}>
                  {formatPrice(c.cash)} / {formatPrice(c.card)} / {formatPrice(c.upi)}
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold" }}>Total</td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>
                  {formatPrice(c.total)}
                </td>
              </tr>
            </tbody>
          </table>
          <div style={{ borderTop: "1px dashed #000", margin: "5px 0" }} />
        </div>
      ))}

      <table style={{ width: "100%", fontSize: 13 }}>
        <tbody>
          <tr>
            <td style={{ fontWeight: "bold" }}>GRAND TOTAL</td>
            <td style={{ textAlign: "right", fontWeight: "bold" }}>
              {formatPrice(data.grandTotal)}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: 10, fontSize: 9, color: "#444", textAlign: "center" }}>
        Generated {new Date().toLocaleString("en-IN")}
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
    pageStyle: `@page { size: 80mm auto; margin: 0; } @media print { body { margin: 0; } }`,
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
