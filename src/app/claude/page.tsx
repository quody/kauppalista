import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shopping API — for other projects',
}

const sectionTitle = 'text-xl font-semibold mt-8 mb-2 text-gray-900'
const code = 'block whitespace-pre-wrap font-mono text-xs bg-gray-900 text-gray-100 rounded p-3 overflow-x-auto'
const inlineCode = 'font-mono text-xs bg-gray-100 rounded px-1.5 py-0.5 text-gray-800'

export default function ClaudeDocsPage() {
  const baseUrlExample = 'https://your-shopping.app'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10 text-gray-800">
        <h1 className="text-3xl font-bold">Ostoslista API</h1>
        <p className="mt-2 text-gray-600">
          A small HTTP API so other projects can list and tick off shopping items as bought.
        </p>

        <h2 className={sectionTitle}>Concepts</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Recurring items</strong> (<code className={inlineCode}>is_recurring: true</code>) are part
            of the weekly order. They have a <code className={inlineCode}>quantity</code> and can be paused
            for one week via <code className={inlineCode}>paused_until</code>.
          </li>
          <li>
            <strong>One-off items</strong> (<code className={inlineCode}>is_recurring: false</code>) are
            single-use. When crossed off, they are auto-deleted ~12 hours later.
          </li>
          <li>
            Crossing off a recurring item marks it bought for this week but does <em>not</em> delete it.
          </li>
        </ul>

        <h2 className={sectionTitle}>Item shape</h2>
        <pre className={code}>{`{
  "id": 123,
  "name": "Maito",
  "category_id": 4,
  "category": { "id": 4, "name": "Maitotuotteet" },
  "is_recurring": true,
  "quantity": 3,
  "paused_until": null,
  "crossed_out": false,
  "crossed_out_at": null,
  "created_at": "2026-05-03T18:00:00.000Z"
}`}</pre>

        <h2 className={sectionTitle}>GET /api/items</h2>
        <p>List active items (default: not crossed off, not paused).</p>
        <p className="mt-2">Query params:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><code className={inlineCode}>type=recurring</code> or <code className={inlineCode}>type=one_off</code> — filter by kind</li>
          <li><code className={inlineCode}>include_paused=true</code> — include paused recurring items</li>
          <li><code className={inlineCode}>include_crossed=true</code> — include items already crossed off</li>
        </ul>
        <pre className={code}>{`curl "${baseUrlExample}/api/items?type=recurring"

# Response
{
  "items": [ { "id": 123, "name": "Maito", "quantity": 3, ... } ]
}`}</pre>

        <h2 className={sectionTitle}>POST /api/items/cross</h2>
        <p>
          Mark items as bought. Identify by <code className={inlineCode}>id</code> (preferred) or by{' '}
          <code className={inlineCode}>name</code> (case-insensitive match against the most recent item).
        </p>
        <p className="mt-2">Body — single:</p>
        <pre className={code}>{`{ "id": 123 }
{ "name": "Maito" }
{ "id": 123, "crossed": false }   // un-cross`}</pre>
        <p className="mt-2">Body — batch:</p>
        <pre className={code}>{`{
  "items": [
    { "name": "Maito" },
    { "id": 124 },
    { "name": "Banaani" }
  ]
}`}</pre>
        <pre className={code}>{`curl -X POST "${baseUrlExample}/api/items/cross" \\
  -H "Content-Type: application/json" \\
  -d '{"items":[{"name":"Maito"},{"name":"Banaani"}]}'

# Response
{
  "results": [
    { "ok": true, "item": { "id": 123, "name": "Maito", "crossed_out": true, ... } },
    { "ok": false, "input": { "name": "Banaani" }, "error": "Item not found" }
  ],
  "updated": 1,
  "failed": 1
}`}</pre>

        <h2 className={sectionTitle}>POST /api/items</h2>
        <p>Create an item.</p>
        <pre className={code}>{`curl -X POST "${baseUrlExample}/api/items" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Maito",
    "is_recurring": true,
    "quantity": 3
  }'`}</pre>

        <h2 className={sectionTitle}>Typical integration</h2>
        <p>An external service (e.g. a grocery-order automation) finishes an order and wants to mark the bought items off:</p>
        <pre className={code}>{`const bought = ["Maito", "Banaani", "Kahvi"];

await fetch("${baseUrlExample}/api/items/cross", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ items: bought.map(name => ({ name })) }),
});`}</pre>

        <h2 className={sectionTitle}>Notes</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>CORS is open (<code className={inlineCode}>Access-Control-Allow-Origin: *</code>).</li>
          <li>No authentication. Don&apos;t expose this if your data is sensitive.</li>
          <li>Realtime-aware: the main UI updates immediately when you POST here.</li>
        </ul>
      </div>
    </div>
  )
}
