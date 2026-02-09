import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
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
        max_tokens: 4096,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: `Olet suomalainen ruoka-asiantuntija. Kayttaja etsii resepteja hakusanalla: "${query}"

Ehdota 4-6 suomalaista reseptia jotka sopivat hakuun. Voit kayttaa resepteja jotka loytyisivat esim. Valio.fi tai K-Ruoka (Pirkka) sivuilta.

Vastaa JSON-muodossa (EI muuta tekstia, VAIN JSON):
[
  {
    "title": "Reseptin nimi",
    "description": "Lyhyt kuvaus",
    "prep_time": "esim. 30 min",
    "servings": "esim. 4 annosta",
    "source_site": "Valio" tai "K-Ruoka" tai "Kotiruoka",
    "ingredients": [
      {"name": "aineksen nimi", "amount": "maara", "unit": "yksikko"}
    ],
    "instructions": "Valmistusohjeet vaihe vaiheelta.\\n\\n1. Ensimmainen vaihe...\\n2. Toinen vaihe..."
  }
]

Ole tarkka maarien ja ohjeiden kanssa. Kayta suomalaisia mittayksikolta (dl, rkl, tl, g, kg, l). Reseptien tulee olla aitoja, toimivia resepteja.`
          }
        ]
      }),
    })

    if (!response.ok) {
      console.error('Claude API error:', await response.text())
      return NextResponse.json({ recipes: [] })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || '[]'

    // Extract JSON from the response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ recipes: [] })
    }

    try {
      const recipes = JSON.parse(jsonMatch[0])
      return NextResponse.json({ recipes })
    } catch {
      console.error('Failed to parse recipes JSON:', text)
      return NextResponse.json({ recipes: [] })
    }
  } catch (error) {
    console.error('Error searching recipes:', error)
    return NextResponse.json({ recipes: [] })
  }
}
