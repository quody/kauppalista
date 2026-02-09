import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Fetch the page content
    let pageContent: string
    try {
      const pageResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KauppalistaBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
        },
      })
      pageContent = await pageResponse.text()
    } catch {
      return NextResponse.json({ error: 'Sivun hakeminen epaonnistui' }, { status: 400 })
    }

    // Trim to reasonable size for Claude
    const trimmedContent = pageContent.substring(0, 15000)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4096,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: `Pura tasta HTML-sivusta reseptin tiedot. Sivu on osoitteesta: ${url}

HTML-sisalto (lyhennetty):
${trimmedContent}

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
