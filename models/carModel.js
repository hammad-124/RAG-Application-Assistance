// models/CarProduct.js
import mongoose from "mongoose";

const carProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },            // e.g. "Toyota Corolla"
    brand: { type: String, required: true },           // e.g. "Toyota"
    modelYear: { type: Number },                       // e.g. 2023
    category: { type: String },                        // e.g. "Sedan"
    description: { type: String },                     // full text description
    price: { type: Number },                           // optional
    fuelType: { type: String },                        // e.g. "Hybrid"
    transmission: { type: String },                    // e.g. "Automatic"
    engineCapacity: { type: String },                  // e.g. "1.8L"
    mileage: { type: String },                         // e.g. "15 km/l"
    available: { type: Boolean, default: true },       // true = in stock
  },
  { timestamps: true }
);

export default mongoose.model("CarProduct", carProductSchema);
