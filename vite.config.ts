import * as fs from 'node:fs'
import * as path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function xutorokLocalImageReviewPlugin(): Plugin {
  return {
    name: 'xutorok-local-image-review',
    apply: 'serve', // Strictly dev-server only; never included in production builds
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/__xutorok_image_review/')) {
          return next()
        }

        const parsedUrl = new URL(req.url, 'http://localhost')
        const pathname = parsedUrl.pathname
        const reportsDir = path.resolve(process.cwd(), 'reports', 'xutorok-images')

        try {
          if (pathname === '/__xutorok_image_review/data' && req.method === 'GET') {
            const inventoryPath = path.join(reportsDir, 'inventory.json')
            const matchingPath = path.join(reportsDir, 'matching-report.json')
            const decisionsPath = path.join(reportsDir, 'review-decisions.json')
            const optimizationPath = path.join(reportsDir, 'optimization-report.json')
            const menuJsonPath = path.resolve(
              process.cwd(),
              'menu',
              'Xutorok_menu_HY_RU_EN.json'
            )

            const inventory = fs.existsSync(inventoryPath)
              ? JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'))
              : null
            const matching = fs.existsSync(matchingPath)
              ? JSON.parse(fs.readFileSync(matchingPath, 'utf-8'))
              : null
            const decisions = fs.existsSync(decisionsPath)
              ? JSON.parse(fs.readFileSync(decisionsPath, 'utf-8'))
              : null
            const optimization = fs.existsSync(optimizationPath)
              ? JSON.parse(fs.readFileSync(optimizationPath, 'utf-8'))
              : null

            const rawMenu = fs.existsSync(menuJsonPath)
              ? (JSON.parse(fs.readFileSync(menuJsonPath, 'utf-8')) as unknown[])
              : []

            const transformerMod = (await server.ssrLoadModule(
              '/src/features/menu/services/menuImportTransformer.ts'
            )) as {
              transformXutorokMenuData: (
                items: unknown[],
                tenantId: string
              ) => { categories: unknown[]; products: unknown[] }
            }
            const catalog = transformerMod.transformXutorokMenuData(rawMenu, 'xutorok')

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(
              JSON.stringify({
                inventory,
                matching,
                decisions,
                optimization,
                catalog: {
                  categories: catalog.categories,
                  products: catalog.products,
                },
              })
            )
            return
          }

          if (pathname === '/__xutorok_image_review/decisions' && req.method === 'POST') {
            const chunks: Buffer[] = []
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
            }
            const bodyStr = Buffer.concat(chunks).toString('utf-8')
            const payload = JSON.parse(bodyStr) as {
              decisions: Record<string, unknown>
            }

            if (!payload || typeof payload.decisions !== 'object') {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Invalid decisions payload' }))
              return
            }

            fs.mkdirSync(reportsDir, { recursive: true })
            const decisionsPath = path.join(reportsDir, 'review-decisions.json')
            const nowIso = new Date().toISOString()
            const fileObj = {
              version: 1,
              tenantId: 'xutorok',
              projectId: 'ai-twin-conflicts',
              generatedAt: nowIso,
              updatedAt: nowIso,
              decisions: payload.decisions,
            }
            fs.writeFileSync(decisionsPath, JSON.stringify(fileObj, null, 2), 'utf-8')

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, updatedAt: nowIso }))
            return
          }

          if (pathname === '/__xutorok_image_review/photo' && req.method === 'GET') {
            const imageId = parsedUrl.searchParams.get('imageId') || ''
            const inventoryPath = path.join(reportsDir, 'inventory.json')
            if (!fs.existsSync(inventoryPath)) {
              res.statusCode = 404
              res.end('Inventory not found')
              return
            }

            const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8')) as {
              images: Array<{
                id: string
                absoluteSourcePath: string
                shortHash: string
              }>
            }
            const img = inventory.images.find((i) => i.id === imageId)
            if (!img || !fs.existsSync(img.absoluteSourcePath)) {
              res.statusCode = 404
              res.end('Image not found')
              return
            }

            // Check if an optimized WebP already exists for this image hash
            const optimizedDir = path.join(reportsDir, 'optimized')
            if (fs.existsSync(optimizedDir)) {
              const matchWebp = fs
                .readdirSync(optimizedDir)
                .find((f) => f.endsWith(`-${img.shortHash}.webp`))
              if (matchWebp) {
                const webpPath = path.join(optimizedDir, matchWebp)
                res.statusCode = 200
                res.setHeader('Content-Type', 'image/webp')
                res.setHeader('Cache-Control', 'public, max-age=3600')
                fs.createReadStream(webpPath).pipe(res)
                return
              }
            }

            // Otherwise check/generate a cached WebP preview in reports/xutorok-images/previews/
            const previewsDir = path.join(reportsDir, 'previews')
            fs.mkdirSync(previewsDir, { recursive: true })
            const previewPath = path.join(previewsDir, `${img.id}-${img.shortHash}.webp`)
            if (!fs.existsSync(previewPath)) {
              const sharpMod = await import('sharp')
              const sharpFn = sharpMod.default
              await sharpFn(img.absoluteSourcePath)
                .rotate()
                .resize({ width: 800, withoutEnlargement: true, fit: 'inside' })
                .webp({ quality: 80 })
                .toFile(previewPath)
            }

            res.statusCode = 200
            res.setHeader('Content-Type', 'image/webp')
            res.setHeader('Cache-Control', 'public, max-age=3600')
            fs.createReadStream(previewPath).pipe(res)
            return
          }

          res.statusCode = 404
          res.end('Not found')
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : String(err),
            })
          )
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), xutorokLocalImageReviewPlugin()],
})
