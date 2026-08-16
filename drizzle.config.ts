import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Local đọc .env.local; trên Vercel/CI biến đã có sẵn trong môi trường.
config({ path: '.env.local', quiet: true })

const databaseUrl = process.env['DATABASE_URL']
if (!databaseUrl) {
  throw new Error(
    'Thiếu DATABASE_URL. Chép .env.example thành .env.local rồi điền connection string của Neon branch tương ứng.',
  )
}

export default defineConfig({
  schema: './src/shared/db/schema.ts',
  out: './src/shared/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
})
