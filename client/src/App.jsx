import { useState, useEffect } from 'react'
import axios from 'axios'

function App() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Test API connection
    axios.get('/api/health')
      .then(response => {
        setMessage(response.data.message)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching data:', error)
        setMessage('Failed to connect to server')
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-6">
          Weather App
        </h1>
        <div className="text-center">
          {loading ? (
            <p className="text-gray-600">Loading...</p>
          ) : (
            <div>
              <p className="text-xl text-gray-700 mb-4">{message}</p>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Built with React, Vite, TailwindCSS & Node.js
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
