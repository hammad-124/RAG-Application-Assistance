import CarProduct from "../models/carModel.js";
import CarVector from "../models/vectorModel.js";
import { embeddings } from "../utils/langchainEmbeddings.js";



const TEXT_FIELDS = new Set([
  "name",
  "brand",
  "description",
  "category",
  "fuelType",
  "transmission",
  "engineCapacity",
  "mileage"
]);


// Simple in-memory debounce map: carId -> timeoutId
const debounceMap = new Map();
const DEBOUNCE_MS = 3000; // 3 seconds; tune as needed


async function upsertEmbeddingForCar(car) {
    const carId = car._id;
    const text = `${car.name || ""} ${car.brand || ""} ${car.category || ""} ${car.description || ""} ${car.fuelType || ""} ${car.transmission || ""} ${car.engineCapacity || ""} ${car.mileage || ""}`.trim();
    
    try{
        // Generate embedding for the car text
        const vector = await embeddings.embedQuery(text);
        // Upsert the CarVector document
        await CarVector.findOneAndUpdate(
            { carId },
            { carId,
                text,
                embedding: vector,
                metadata: {
                    name: car.name,
                    brand: car.brand,
                    category: car.category,
                    price: car.price,
                    source: 'car_database'
                }
            },
            { upsert: true, new: true }
        );
        console.log(`Upserted embedding for car ID: ${carId}`);

    }catch(error){
        console.error("Error generating embedding:", error);
        return;
    }

}


export const watchCarChanges = async()=>{
    console.log("Watching for changes in CarProduct collection...");
    const changeStream = CarProduct.watch([], { fullDocument: 'updateLookup' });

    changeStream.on("change", async (change) => {
        try {
            const op = change.operationType;
            const carId = change.documentKey._id;
            if (op === "insert" || op === "update") {
                 const fulldoc = change.fullDocument;
                 await upsertEmbeddingForCar(fulldoc);
            }
            else if (op === "update") {
            const updatedFields = change.updateDescription?.updatedFields || {};
            const touchedFields = Object.keys(updatedFields);


            const shouldReembed = touchedFields.some(field => TEXT_FIELDS.has(field));
            if (shouldReembed) {

                // Debounce logic
                if (debounceMap.has(carId.toString())) {
            clearTimeout(debounceMap.get(carId.toString()));
          }
          const timeout = setTimeout(async () => {
            try {
              const car = await CarProduct.findById(carId);
              if (car) await upsertEmbeddingForCar(car);
            } catch (err) {
              console.error("Error in debounced upsert:", err);
            } finally {
              debounceMap.delete(carId.toString());
            }
          }, DEBOUNCE_MS);
            debounceMap.set(carId.toString(), timeout);
            }else{
                console.log(`No relevant text fields updated for car ID: ${carId}, skipping re-embedding.`);
                 const updatedMeta = {};
          if (updatedFields.price !== undefined) updatedMeta.price = updatedFields.price;
          if (updatedFields.available !== undefined) updatedMeta.available = updatedFields.available;

          if (Object.keys(updatedMeta).length) {
            await CarVector.findOneAndUpdate(
              { carId },
              { $set: { "metadata.price": updatedMeta.price, "metadata.available": updatedMeta.available } },
              { upsert: false }
            );
          }
            } 


            }else if (op === "delete") {
                await CarVector.findOneAndDelete({ carId });
                console.log(`Deleted embedding for removed car ID: ${carId}`);
            }

        }catch (error) {
            console.error("Error processing change event:", error);
        }
    });
    changeStream.on("error", (error) => {
        console.error("Change stream error:", error);
        setTimeout(() => watchCarChanges(), 5000); 
    })
}