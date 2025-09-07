import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  let availableCategories: string[] = []
  
  try {
    const { itemName, availableCategories: categories } = await request.json()
    availableCategories = categories || []
    
    if (!itemName) {
      return NextResponse.json({ error: 'Item name is required' }, { status: 400 })
    }

    if (!availableCategories || availableCategories.length === 0) {
      return NextResponse.json({ category: 'Other' })
    }

    const categoryList = availableCategories.map((cat: string, index: number) => `${index + 1}. ${cat}`).join('\n')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 50,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: `You are a shopping list categorizer. Given a shopping item name, return ONLY the exact category name from this list:

${categoryList}

Item: "${itemName}"

Vaipat kuuluu muut kategoriaan.

You MUST respond with only one of the category names from the list above, exactly as written. Do not create new categories.`
          }
        ]
      }),
    })

    if (!response.ok) {
      console.error('Claude API error:', await response.text())
      return NextResponse.json({ category: availableCategories[0] || 'Other' })
    }

    const data = await response.json()
    let category = data.content?.[0]?.text?.trim() || availableCategories[0]

    // Ensure the returned category exists in the available categories
    const exactMatch = availableCategories.find((cat: string) => 
      cat.toLowerCase() === category.toLowerCase()
    )
    
    if (exactMatch) {
      category = exactMatch
    } else {
      // Fallback to first available category if no match
      category = availableCategories[0]
    }
    
    return NextResponse.json({ category })
  } catch (error) {
    console.error('Error categorizing item:', error)
    return NextResponse.json({ category: availableCategories?.[0] || 'Other' })
  }
}