import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import Groq from 'groq-sdk'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.GROQ_API_KEY

  return {
    server: {
      proxy: {
        '/api': 'http://localhost:5000',
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'groq-chat-api',
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
              res.end(JSON.stringify({ error: 'missing_groq_api_key' }))
              return
            }

            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })

            req.on('end', async () => {
              try {
                const { message, history = [], context, currency } = JSON.parse(body || '{}')

                if (!message || typeof message !== 'string') {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'missing_message' }))
                  return
                }

                const systemInstruction = `You are a personal finance assistant inside a receipt-tracking app.
You answer questions about the user's spending using ONLY the data provided below — never invent numbers.
Currency is ${currency ?? 'PHP'}. When citing amounts, use that currency's symbol.
Be concise (2-4 sentences unless a breakdown is asked for). Use the precomputed totals for week/month/year
questions rather than recalculating from the raw receipt list. If the data doesn't cover what's asked,
say so plainly instead of guessing.

DATA:
${JSON.stringify(context ?? {})}`

                const groq = new Groq({ apiKey })

                const messages: Parameters<typeof groq.chat.completions.create>[0]['messages'] = [
                  { role: 'system', content: systemInstruction },
                  ...(history as Array<{ role: 'user' | 'assistant'; content: string }>).map((m) => ({
                    role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
                    content: m.content,
                  })),
                  { role: 'user', content: message },
                ]

                const completion = await groq.chat.completions.create({
                  model: 'openai/gpt-oss-120b',
                  messages,
                  temperature: 0.2,
                  max_completion_tokens: 1024,
                })

                const reply = completion.choices[0]?.message?.content ?? "I couldn't come up with an answer for that."

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ reply }))
              } catch (error) {
                console.error('Groq chat failed:', error)
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
