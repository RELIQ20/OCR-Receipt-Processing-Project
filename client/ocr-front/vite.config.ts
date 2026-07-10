import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { GoogleGenerativeAI } from '@google/generative-ai'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.GEMINI_API_KEY

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'gemini-chat-api',
        configureServer(server) {
          server.middlewares.use('/api/chat', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'method_not_allowed' }))
              return
            }

            if (!apiKey) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'missing_gemini_api_key' }))
              return
            }

            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })

            req.on('end', async () => {
              try {
                const { message, history = [] } = JSON.parse(body || '{}')

                if (!message || typeof message !== 'string') {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'missing_message' }))
                  return
                }

                const genAI = new GoogleGenerativeAI(apiKey)
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
                const chat = model.startChat({
                  history: (history as Array<{ role: 'user' | 'assistant'; content: string }>).map((m) => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }],
                  })),
                  generationConfig: { temperature: 0.2 },
                })

                const result = await chat.sendMessage(message)
                const reply = result.response.text()

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ reply }))
              } catch (error) {
                console.error('Gemini chat failed:', error)
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({
                  error: 'chat_failed',
                  details: error instanceof Error ? error.message : 'Unknown error',
                }))
              }
            })
          })
        },
      },
    ],
  }
})
