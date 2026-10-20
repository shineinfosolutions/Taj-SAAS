import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * One audited business day (6 AM → 6 AM). Created when the cashier/admin
 * submits the day-close audit, when an admin overrides it, or automatically
 * for a day with no sales. The `summary` is a frozen snapshot of the system
 * totals at the time of closing — it is never recomputed or edited.
 */
export type DayCloseStatus = "closed" | "overridden" | "auto_no_sales";

export interface IDayCloseDoc extends Document {
  businessDate: string; // "YYYY-MM-DD"
  status: DayCloseStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  summary?: Record<string, any>;
  cashExpected?: number;
  cashCounted?: number;
  cashDiff?: number;
  cardReported?: number;
  upiReported?: number;
  remark?: string;
  pinApproved?: boolean;
  overrideReason?: string;
  closedById?: string;
  closedByName?: string;
  closedByRole?: string;
  closedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DayCloseSchema = new Schema<IDayCloseDoc>(
  {
    businessDate: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["closed", "overridden", "auto_no_sales"],
      required: true,
    },
    summary: { type: Schema.Types.Mixed },
    cashExpected: { type: Number },
    cashCounted: { type: Number },
    cashDiff: { type: Number },
    cardReported: { type: Number },
    upiReported: { type: Number },
    remark: { type: String, trim: true },
    pinApproved: { type: Boolean, default: false },
    overrideReason: { type: String, trim: true },
    closedById: { type: String },
    closedByName: { type: String },
    closedByRole: { type: String },
    closedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

const DayClose: Model<IDayCloseDoc> =
  mongoose.models.DayClose ||
  mongoose.model<IDayCloseDoc>("DayClose", DayCloseSchema);

export default DayClose;
