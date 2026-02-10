import { NextRequest, NextResponse } from 'next/server'

function stripHtmlToText(html: string): string {
  // Remove script, style, nav, footer, header, aside, svg tags and their content
  let cleaned = html.replace(/<(script|style|nav|footer|header|aside|svg|noscript|iframe|link|meta)[\s\S]*?<\/\1>/gi, '')
  // Remove remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ')
  // Decode common HTML entities
  cleaned = cleaned.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  return cleaned
}

function extractJsonLd(html: string): object | null {
  // Look for JSON-LD recipe structured data (schema.org)
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1])
      // Could be a single object or an array
      if (Array.isArray(data)) {
        const recipe = data.find((item: Record<string, unknown>) => item['@type'] === 'Recipe')
        if (recipe) return recipe
      } else if (data['@type'] === 'Recipe') {
        return data
      } else if (data['@graph']) {
        const recipe = data['@graph'].find((item: Record<string, unknown>) => item['@type'] === 'Recipe')
        if (recipe) return recipe
      }
    } catch {
      // Invalid JSON-LD, continue searching
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Fetch the page content with a realistic browser User-Agent
    let pageContent: string
    try {
      const pageResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fi-FI,fi;q=0.9,en;q=0.8',
        },
      })
      if (!pageResponse.ok) {
        return NextResponse.json({ error: `Sivun hakeminen epaonnistui (${pageResponse.status})` }, { status: 400 })
      }
      pageContent = await pageResponse.text()
    } catch {
      return NextResponse.json({ error: 'Sivun hakeminen epaonnistui' }, { status: 400 })
    }

    // Try to extract JSON-LD structured data first (most token-efficient)
    const jsonLd = extractJsonLd(pageContent)
    let contentForClaude: string

    if (jsonLd) {
      // Send only the structured data - much smaller than raw HTML
      contentForClaude = JSON.stringify(jsonLd, null, 2).substring(0, 8000)
    } else {
      // Strip HTML to plain text to maximize useful content per character
      const plainText = stripHtmlToText(pageContent)
      contentForClaude = plainText.substring(0, 8000)
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 2048,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: `Pura tasta ${jsonLd ? 'JSON-LD-datasta' : 'sivun tekstisisallosta'} reseptin tiedot. Sivu on osoitteesta: ${url}

${jsonLd ? 'JSON-LD data' : 'Sivun tekstisisalto'}:
${contentForClaude}

Vastaa VAIN JSON-muodossa (ei muuta tekstia):
{
  "title": "Reseptin nimi",
  "description": "Lyhyt kuvaus",
  "prep_time": "valmistusaika",
  "servings": "annosten maara",
  "ingredients": [
    {"name": "aineksen nimi", "amount": "maara", "unit": "yksikko"}
  ],
  "instructions": "Valmistusohjeet"
}

Jos sivulta ei loydy reseptia, vastaa: {"error": "Reseptia ei loytynyt"}`,
          }
        ]
      }),
    })

    if (!response.ok) {
      console.error('Claude API error:', await response.text())
      return NextResponse.json({ error: 'Reseptin lukeminen epaonnistui' }, { status: 500 })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Reseptin lukeminen epaonnistui' }, { status: 500 })
    }

    try {
      const recipe = JSON.parse(jsonMatch[0])

      if (recipe.error) {
        return NextResponse.json({ error: recipe.error }, { status: 400 })
      }

      // Determine source site from URL
      let source_site = 'Web'
      if (url.includes('valio.fi')) source_site = 'Valio'
      else if (url.includes('k-ruoka.fi')) source_site = 'K-Ruoka'
      else if (url.includes('kotikokki.net')) source_site = 'Kotikokki'
      else if (url.includes('soppa365.fi')) source_site = 'Soppa365'

      return NextResponse.json({
        recipe: {
          ...recipe,
          source_url: url,
          source_site,
        }
      })
    } catch {
      console.error('Failed to parse recipe JSON:', text)
      return NextResponse.json({ error: 'Reseptin lukeminen epaonnistui' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error parsing recipe:', error)
    return NextResponse.json({ error: 'Virhe reseptin kasittelyssa' }, { status: 500 })
  }
}
