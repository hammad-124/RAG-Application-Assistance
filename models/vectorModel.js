// models/CarVector.js
import mongoose from "mongoose";

const carVectorSchema = new mongoose.Schema(
  {
    carId: { type: mongoose.Schema.Types.ObjectId, ref: "CarProduct" },
    text: { type: String, required: true }, // combined text fields (brand, desc, etc.)
    embedding: {
      type: [Number],
      index: "vector_index", // MongoDB Atlas Vector Search index
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // Store LangChain document metadata
      default: {}
    }
  },
  { timestamps: true }
);

export default mongoose.model("CarVector", carVectorSchema);
