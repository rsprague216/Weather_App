import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    message: '🎉 Server is running successfully!',
    timestamp: new Date().toISOString()
  })
})

app.get('/api/weather', (req, res) => {
  // Placeholder for weather API integration
  res.json({
    city: 'San Francisco',
    temperature: 72,
    condition: 'Sunny',
    humidity: 65
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})
