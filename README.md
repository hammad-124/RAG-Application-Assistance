# 🚗 RAG Car Assistant Backend

A high-performance **Retrieval Augmented Generation (RAG)** application built with Express.js, MongoDB Atlas Vector Search, and LangChain. This intelligent car assistant provides contextual answers about car inventory using advanced AI embeddings and vector similarity search.

## 🎯 Features

- **🤖 RAG-Powered AI Assistant** - Ask natural language questions about cars and get intelligent responses
- **⚡ Vector Search** - MongoDB Atlas vector search with OpenAI embeddings for semantic similarity
- **🔄 Real-time Sync** - Change streams automatically update vector embeddings when car data changes
- **📊 Smart Caching** - Response caching with 3-minute TTL for improved performance
- **🏗️ MVC Architecture** - Clean, scalable Express.js structure
- **🔧 Performance Optimized** - Connection pooling, debounced updates, and optimized LLM settings

## 🏗️ Project Structure

```
backend/
├── index.js                 # Main application entry point
├── package.json             # Dependencies and scripts
├── .gitignore              # Git ignore file (protects .env)
├── db/
│   └── connection.js       # MongoDB connection setup
├── controllers/
│   ├── carController.js    # Car CRUD operations with LangChain pipeline
│   └── ragController.js    # RAG assistant with vector search
├── models/
│   ├── carModel.js         # Car product schema
│   └── vectorModel.js      # Vector embedding schema
├── routers/
│   ├── carRouter.js        # Car API routes
│   └── ragRoute.js         # RAG API routes
├── listeners/
│   └── vectorSync.js       # Change stream for auto-embedding sync
└── utils/
    ├── cache.js            # Response caching utility
    ├── langchainEmbeddings.js  # LangChain embedding setup
    ├── logger.js           # Logging utility
    └── mongoPool.js        # MongoDB connection pool
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- MongoDB Atlas account with Vector Search enabled
- OpenAI API key

### Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the backend directory:
   ```env
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/RAG
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   NODE_ENV=development
   ```

4. **MongoDB Atlas Vector Search Setup**
   - Create a vector search index named `vector_index` on the `carvectors` collection
   - Use these index settings:
   ```json
   {
     "fields": [
       {
         "type": "vector",
         "path": "embedding",
         "numDimensions": 1536,
         "similarity": "cosine"
       }
     ]
   }
   ```

5. **Start the server**
   ```bash
   npm run dev    # Development with nodemon
   # or
   npm start      # Production
   ```

## 📚 API Documentation

### 🚗 Car Management APIs

#### Get All Cars
```http
GET /api/v1/cars
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Range Rover Evoque",
      "brand": "Land Rover",
      "price": 45000,
      "category": "SUV",
      "description": "Luxury compact SUV...",
      "fuelType": "Petrol",
      "transmission": "Automatic"
    }
  ]
}
```

#### Add Single Car
```http
POST /api/v1/cars/add
Content-Type: application/json

{
  "name": "Range Rover Evoque",
  "brand": "Land Rover",
  "price": 45000,
  "category": "SUV",
  "description": "Luxury compact SUV with advanced features",
  "fuelType": "Petrol",
  "transmission": "Automatic",
  "engineCapacity": "2.0L",
  "mileage": "25 mpg"
}
```

#### Bulk Add Cars
```http
POST /api/v1/cars/bulk
Content-Type: application/json

{
  "cars": [
    { "name": "Car 1", "brand": "Brand 1", ... },
    { "name": "Car 2", "brand": "Brand 2", ... }
  ]
}
```

#### Update Car
```http
PUT /api/v1/cars/:id
Content-Type: application/json

{
  "price": 42000,
  "available": true
}
```

#### Delete Car
```http
DELETE /api/v1/cars/:id
```

### 🤖 RAG Assistant API

#### Ask Car Assistant
```http
POST /api/v1/rag/ask
Content-Type: application/json

{
  "query": "What Range Rover models do you have and their prices?"
}
```

**Response:**
```json
{
  "query": "What Range Rover models do you have and their prices?",
  "answer": "We have several Range Rover models available: Range Rover Evoque priced at $45,000, Range Rover Sport at $65,000, and Range Rover Velar at $55,000. All models come with advanced features and luxury specifications.",
  "responseTime": "2847ms",
  "cached": false,
  "sources": [
    {
      "name": "Range Rover Evoque",
      "brand": "Land Rover",
      "price": "$45,000",
      "category": "SUV"
    }
  ]
}
```

## 🔧 Configuration

### Environment Variables
- `MONGO_URI` - MongoDB Atlas connection string (required)
- `OPENAI_API_KEY` - OpenAI API key for embeddings and chat (required)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)

### Performance Settings
- **Connection Pool**: Max 10 connections, 5s timeout
- **Cache TTL**: 3 minutes for RAG responses
- **Vector Search**: Limited to 3 results for faster processing
- **LLM Model**: GPT-3.5-turbo for speed optimization
- **Debounce**: 3-second delay for batch embedding updates

## 🚀 Deployment

1. Set `NODE_ENV=production` in your environment
2. Ensure MongoDB Atlas is configured with proper network access
3. Set up vector search index as described above
4. Deploy using your preferred platform (Heroku, AWS, etc.)

## 🧠 How It Works

1. **Data Ingestion**: Cars are added via API and stored in MongoDB
2. **Embedding Generation**: LangChain creates vector embeddings using OpenAI
3. **Vector Storage**: Embeddings are stored in MongoDB Atlas vector collection
4. **Change Streams**: Automatic re-embedding when car data changes
5. **Query Processing**: User questions are converted to embeddings
6. **Similarity Search**: MongoDB Atlas finds relevant cars using vector search
7. **RAG Response**: OpenAI generates contextual answers using retrieved data

## 🛠️ Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas with Vector Search
- **AI/ML**: OpenAI GPT-3.5-turbo, text-embedding-3-small
- **Framework**: LangChain for AI pipeline
- **Caching**: In-memory cache with TTL
- **Real-time**: MongoDB Change Streams

## 📈 Performance Features

- ⚡ **Sub-3s Response Times** - Optimized for production speed
- 🔄 **Smart Caching** - Reduces repeated API calls
- 📊 **Connection Pooling** - Efficient database connections
- 🎯 **Debounced Updates** - Prevents excessive re-embedding
- 📝 **Detailed Logging** - Monitor embedding creation and performance
