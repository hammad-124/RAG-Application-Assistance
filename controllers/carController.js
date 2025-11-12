import CarProduct from "../models/carModel.js";
import CarVector from "../models/vectorModel.js";
import { embeddings } from "../utils/langchainEmbeddings.js";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// Create a text splitter for consistent document processing
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

// Transform car data into a structured document format
const 
transformCarToDocument = (car) => {
  const content = `Car: ${car.name}
Brand: ${car.brand}
Model Year: ${car.modelYear || 'N/A'}
Category: ${car.category || 'N/A'}
Description: ${car.description || 'N/A'}
Price: ${car.price ? `$${car.price}` : 'N/A'}
Fuel Type: ${car.fuelType || 'N/A'}
Transmission: ${car.transmission || 'N/A'}
Engine Capacity: ${car.engineCapacity || 'N/A'}
Mileage: ${car.mileage || 'N/A'}`;

  return new Document({
    pageContent: content,
    metadata: {
      carId: car._id,
      name: car.name,
      brand: car.brand,
      category: car.category,
      price: car.price,
      source: 'car_database'
    }
  });
};

// LangChain pipeline for processing car documents
const processCarDocuments = async (cars) => {
  try {
    // Step 1: Transform cars into LangChain Documents
    const documents = cars.map(transformCarToDocument);
    
    // Step 2: Split documents if needed (for very long descriptions)
    const splitDocs = [];
    for (const doc of documents) {
      const splits = await textSplitter.splitDocuments([doc]);
      splitDocs.push(...splits);
    }
    
    // Step 3: Generate embeddings for all documents in batch
    console.log(`🔄 Generating embeddings for ${splitDocs.length} document chunks...`);
    const texts = splitDocs.map(doc => doc.pageContent);
    const vectors = await embeddings.embedDocuments(texts);
    
    // Step 4: Combine documents with their embeddings
    const processedDocs = splitDocs.map((doc, index) => ({
      document: doc,
      embedding: vectors[index],
      metadata: doc.metadata
    }));
    
    return processedDocs;
    
  } catch (error) {
    console.error('LangChain pipeline error:', error);
    throw new Error(`Pipeline processing failed: ${error.message}`);
  }
};

export const addCarProduct = async (req, res) => {
  try {
    const requestData = req.body;
    
    // Check if input is an array (multiple cars) or single car object
    const isArray = Array.isArray(requestData);
    const carDataArray = isArray ? requestData : [requestData];
    
    if (carDataArray.length === 0) {
      return res.status(400).json({ 
        message: "No car data provided" 
      });
    }

    console.log(`🚀 Processing ${carDataArray.length} car(s) using LangChain pipeline...`);

    const results = [];
    const errors = [];
    const createdCars = [];

    // Step 1: Create all car records first
    for (let i = 0; i < carDataArray.length; i++) {
      const carData = carDataArray[i];
      
      try {
        // Validate required fields
        if (!carData.name || !carData.brand) {
          throw new Error('Name and brand are required fields');
        }

        const car = await CarProduct.create(carData);
        createdCars.push(car);
        
        console.log(`✓ Created car record ${i + 1}/${carDataArray.length}: ${car.name}`);

      } catch (error) {
        console.error(`✗ Error creating car ${i + 1}:`, error.message);
        errors.push({
          index: i,
          error: error.message,
          carData: carData,
          stage: 'car_creation'
        });
      }
    }

    // Step 2: Process embeddings using LangChain pipeline (only for successfully created cars)
    if (createdCars.length > 0) {
      try {
        console.log(`🔄 Running LangChain pipeline for ${createdCars.length} cars...`);
        const processedDocs = await processCarDocuments(createdCars);
        
        // Step 3: Save embeddings to vector store
        for (let i = 0; i < processedDocs.length; i++) {
          const { document, embedding, metadata } = processedDocs[i];
          
          try {
            await CarVector.create({
              carId: metadata.carId,
              text: document.pageContent,
              embedding: embedding,
              metadata: metadata
            });
            
            // Find the corresponding car result
            const carIndex = createdCars.findIndex(car => car._id.equals(metadata.carId));
            if (carIndex !== -1) {
              results.push({
                index: carIndex,
                success: true,
                car: createdCars[carIndex],
                message: "Car and embedding created successfully via LangChain pipeline",
                embeddingChunks: processedDocs.filter(p => p.metadata.carId.equals(metadata.carId)).length
              });
            }
            
          } catch (vectorError) {
            console.error(`✗ Error saving vector for car ${metadata.name}:`, vectorError.message);
            errors.push({
              carId: metadata.carId,
              error: vectorError.message,
              stage: 'vector_creation'
            });
          }
        }
        
        console.log(`✅ LangChain pipeline completed successfully!`);
        
      } catch (pipelineError) {
        console.error('Pipeline processing failed:', pipelineError);
        
        // Mark all created cars as having pipeline errors
        createdCars.forEach((car, index) => {
          errors.push({
            index: index,
            error: `Pipeline processing failed: ${pipelineError.message}`,
            carData: car,
            stage: 'pipeline_processing'
          });
        });
      }
    }

    // Step 4: Prepare response based on whether it was single or multiple
    if (isArray) {
      // Multiple cars - return detailed summary
      const response = {
        message: `LangChain pipeline processed ${carDataArray.length} cars. ${results.length} successful, ${errors.length} failed.`,
        totalProcessed: carDataArray.length,
        successful: results.length,
        failed: errors.length,
        pipeline: "LangChain with Document Processing",
        results: results,
        errors: errors.length > 0 ? errors : undefined
      };
      
      const statusCode = errors.length > 0 ? 207 : 201;
      res.status(statusCode).json(response);
    } else {
      // Single car - return simple response
      if (results.length > 0) {
        res.status(201).json({
          message: "Car added and embedding generated successfully via LangChain pipeline!",
          car: results[0].car,
          pipeline: "LangChain with Document Processing",
          embeddingChunks: results[0].embeddingChunks
        });
      } else {
        res.status(400).json({
          message: "Failed to add car",
          error: errors[0]?.error || "Unknown error",
          stage: errors[0]?.stage || "unknown"
        });
      }
    }

  } catch (error) {
    console.error("Error in LangChain pipeline:", error);
    res.status(500).json({ 
      message: "Failed to process cars with LangChain pipeline", 
      error: error.message 
    });
  }
};

// GET all cars
export const getAllCars = async (req, res) => {
  try {
    const { page = 1, limit = 10, brand, category, fuelType } = req.query;
    
    // Build filter object
    const filter = {};
    if (brand) filter.brand = { $regex: brand, $options: 'i' };
    if (category) filter.category = { $regex: category, $options: 'i' };
    if (fuelType) filter.fuelType = { $regex: fuelType, $options: 'i' };

    const cars = await CarProduct.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await CarProduct.countDocuments(filter);

    res.json({
      cars,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error("Error fetching cars:", error);
    res.status(500).json({ message: "Failed to fetch cars", error: error.message });
  }
};

// GET single car by ID
export const getCarById = async (req, res) => {
  try {
    const { id } = req.params;
    const car = await CarProduct.findById(id);
    
    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }

    res.json({ car });
  } catch (error) {
    console.error("Error fetching car:", error);
    res.status(500).json({ message: "Failed to fetch car", error: error.message });
  }
};

// PUT update car by ID (this will trigger change stream)
export const updateCar = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate required fields if they're being updated
    if (updateData.name !== undefined && !updateData.name) {
      return res.status(400).json({ message: "Name cannot be empty" });
    }
    if (updateData.brand !== undefined && !updateData.brand) {
      return res.status(400).json({ message: "Brand cannot be empty" });
    }

    const car = await CarProduct.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );

    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }

    console.log(`🔄 Car updated: ${car.name} - Change stream will handle vector update`);

    res.json({
      message: "Car updated successfully. Vector embeddings will be updated automatically.",
      car
    });
  } catch (error) {
    console.error("Error updating car:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: "Validation error", error: error.message });
    }
    res.status(500).json({ message: "Failed to update car", error: error.message });
  }
};

// DELETE car by ID (this will trigger change stream)
export const deleteCar = async (req, res) => {
  try {
    const { id } = req.params;
    
    const car = await CarProduct.findByIdAndDelete(id);
    
    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }

    console.log(`🗑️ Car deleted: ${car.name} - Change stream will handle vector cleanup`);

    res.json({
      message: "Car deleted successfully. Vector embeddings will be cleaned up automatically.",
      deletedCar: car
    });
  } catch (error) {
    console.error("Error deleting car:", error);
    res.status(500).json({ message: "Failed to delete car", error: error.message });
  }
};

// POST single car (alternative to bulk add)
export const addSingleCar = async (req, res) => {
  try {
    const carData = req.body;

    // Validate required fields
    if (!carData.name || !carData.brand) {
      return res.status(400).json({ message: "Name and brand are required fields" });
    }

    const car = await CarProduct.create(carData);

    console.log(`➕ Single car added: ${car.name} - Change stream will handle vector creation`);

    res.status(201).json({
      message: "Car added successfully. Vector embeddings will be generated automatically.",
      car
    });
  } catch (error) {
    console.error("Error adding single car:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: "Validation error", error: error.message });
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: "Car with similar details already exists" });
    }
    res.status(500).json({ message: "Failed to add car", error: error.message });
  }
};

// GET vector count for testing
// export const getVectorStats = async (req, res) => {
//   try {
//     const carCount = await CarProduct.countDocuments();
//     const vectorCount = await CarVector.countDocuments();
    
//     res.json({
//       carCount,
//       vectorCount,
//       syncStatus: carCount === vectorCount ? 'synced' : 'out-of-sync',
//       message: "Vector sync statistics"
//     });
//   } catch (error) {
//     console.error("Error getting vector stats:", error);
//     res.status(500).json({ message: "Failed to get stats", error: error.message });
//   }
// };
