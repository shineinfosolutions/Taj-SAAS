import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILocationDoc extends Document {
  type: "room" | "table";
  label: string;
  code: string;
  floor?: string;
  capacity?: number;
  isActive: boolean;
  isOccupied: boolean;
  notes?: string;
  // Set while this table's bill has been folded into another table's bill
  // (multi-table merge). The table stays occupied/unselectable until the
  // target table's bill is settled, which clears this back to undefined.
  mergedIntoTableId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<ILocationDoc>(
  {
    type: { type: String, enum: ["room", "table"], required: true },
    label: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    floor: { type: String },
    capacity: { type: Number },
    isActive: { type: Boolean, default: true },
    isOccupied: { type: Boolean, default: false },
    notes: { type: String },
    mergedIntoTableId: { type: Schema.Types.ObjectId, ref: "Location" },
  },
  { timestamps: true },
);

LocationSchema.index({ type: 1, isActive: 1 });
// { code: 1 } index is already created by unique:true on the field

const Location: Model<ILocationDoc> =
  mongoose.models.Location ||
  mongoose.model<ILocationDoc>("Location", LocationSchema);

export default Location;
