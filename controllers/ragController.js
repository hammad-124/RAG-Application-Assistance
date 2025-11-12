// controllers/ragController.js
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { RunnableSequence } from "@langchain/core/runnables";
import { PromptTemplate } from "@langchain/core/prompts";
import mongoPool from "../utils/mongoPool.js";
import { ragCache } from "../utils/cache.js";

export const askCarAssistant = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ message: "Please provide a question." });
    }

    // 🚀 Check cache first (normalize query for better hit rate)
    const cacheKey = query.toLowerCase().trim();
    const cachedResponse = ragCache.get(cacheKey);
    
    if (cachedResponse) {
      console.log(`💨 Cache hit for query: "${query}"`);
      return res.json({
        ...cachedResponse,
        cached: true,
        cacheHit: true
      });
    }

    // 1️⃣ Get MongoDB client connection from pool
    const client = await mongoPool.getClient();
    
    const collection = client.db("RAG").collection("carvectors");

    // 2️⃣ Initialize LangChain components with proper MongoDB client
    const embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-small",
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 2,
      timeout: 10000
    });

    const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
      collection,
      indexName: "vector_index", // must match your Atlas index
      textKey: "text",
      embeddingKey: "embedding"
    });

    // 3️⃣ Perform similarity search (reduced to 3 results for faster processing)
    const startTime = Date.now();
    const results = await vectorStore.similaritySearch(query, 3); // reduced from 4 to 3
    const vectorSearchTime = Date.now() - startTime;
    
    // Enhanced context construction with metadata integration (optimized)
    const contextParts = results.map((r, index) => {
      const meta = r.metadata || {};
      let price = meta.price || meta.metadata?.price;
      let name = meta.name || meta.metadata?.name;
      
      // Simplified context - only essential info
      let contextText = r.pageContent;
      if (price && name) {
        contextText += `\nCURRENT PRICE: $${price}`;
      }
      
      return `[Car ${index + 1}]\n${contextText}`;
    });
    
    const context = contextParts.join("\n\n---\n\n");

    console.log(`⚡ Vector search completed in ${vectorSearchTime}ms`);

    // 4️⃣ Define system prompt (RAG style)
    const prompt = PromptTemplate.fromTemplate(`
You are Refine AI Car Assistant — an intelligent, friendly automotive expert.

IMPORTANT: Use ONLY the information provided in the Context below to answer questions. When specific details like prices, specifications, or features are mentioned in the context, include them in your answer.

Context:
{context}

Question: {question}

Instructions:
- If price information is available in the context, always mention the exact price
- If specifications are provided, include relevant details
- Be specific and factual based on the context
- If information is not in the context, clearly state that you don't have that information
- Always be helpful and conversational

Answer:`);

    // 5️⃣ Build LangChain pipeline (optimized for speed)
    const llm = new ChatOpenAI({
      model: "gpt-3.5-turbo", // Faster than gpt-4o-mini
      temperature: 0.1, // Lower temperature for faster, more focused responses
      apiKey: process.env.OPENAI_API_KEY,
      maxTokens: 300, // Limit response length for speed
      timeout: 15000, // 15 second timeout
      maxRetries: 1 // Reduce retries
    });

    // 6️⃣ Generate the RAG response (optimized)
    const llmStartTime = Date.now();
    const response = await llm.invoke([
      {
        role: "system",
        content: `You are Refine AI Car Assistant. Use ONLY the provided context to answer questions. Always include exact prices when available. Be concise and specific.

Context:
${context}`
      },
      {
        role: "user", 
        content: query
      }
    ]);
    const llmTime = Date.now() - llmStartTime;

    // Using connection pool - no need to close

    const totalTime = Date.now() - startTime;
    console.log(`🚀 Total RAG response time: ${totalTime}ms (Vector: ${vectorSearchTime}ms, LLM: ${llmTime}ms)`);

    const responseData = {
      query,
      answer: response.content,
      responseTime: `${totalTime}ms`,
      cached: false,
      sources: results.map(r => {
        const meta = r.metadata || {};
        
        // Optimized metadata extraction
        let name = meta.name || meta.metadata?.name;
        let brand = meta.brand || meta.metadata?.brand;
        let price = meta.price || meta.metadata?.price;
        let category = meta.category || meta.metadata?.category;
        
        // Quick fallback to pageContent parsing only if needed
        if (!name && r.pageContent) {
          const lines = r.pageContent.split('\n');
          name = lines.find(line => line.startsWith('Car:'))?.replace('Car:', '').trim() || 'Unknown';
          brand = lines.find(line => line.startsWith('Brand:'))?.replace('Brand:', '').trim() || 'Unknown';
          price = lines.find(line => line.startsWith('Price:'))?.replace('Price:', '').trim() || 'N/A';
          category = lines.find(line => line.startsWith('Category:'))?.replace('Category:', '').trim() || 'Unknown';
        }
        
        return {
          name: name || 'Unknown',
          brand: brand || 'Unknown',
          price: price || 'N/A',
          category: category || 'Unknown'
        };
      })
    };

    // 💾 Cache the response for future queries
    ragCache.set(cacheKey, responseData);
    
    res.json(responseData);

  } catch (error) {
    console.error("RAG pipeline error:", error);
    res.status(500).json({
      message: "Failed to generate RAG response",
      error: error.message
    });
  }
};
