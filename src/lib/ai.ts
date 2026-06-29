import type { AIExplanation } from '@/types';

export async function explainFindings(
  findings: { scanner: string; title: string; detail: string; severity: string }[]
): Promise<AIExplanation> {
  const top = findings
    .filter((f) => f.severity === 'critical' || f.severity === 'high')
    .slice(0, 6);

  if (top.length === 0) {
    return { summary: 'No critical or high severity findings detected. Repository has a clean security posture.', items: [] };
  }

  const prompt = `You are a senior cybersecurity engineer reviewing automated security scan results.

Findings:
${top.map((f, i) => `${i + 1}. [${f.severity.toUpperCase()}] ${f.scanner.toUpperCase()}: ${f.title}\n   ${f.detail}`).join('\n\n')}

Respond ONLY with valid JSON (no markdown fences, no preamble):
{
  "summary": "2 sentences: overall risk level and most urgent action",
  "items": [
    {
      "title": "short finding name",
      "why_dangerous": "what an attacker can actually DO with this — be specific",
      "exact_fix": "exact commands or code to fix it right now",
      "real_example": "a real-world breach where this exact vulnerability was exploited"
    }
  ]
}`;

  // OpenRouter path
  if (process.env.OPENROUTER_API_KEY) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        'X-Title': 'Specter Security Scanner',
      },
      body: JSON.stringify({
        // 'openrouter/free' automatically selects from available free models at zero cost.
        model: process.env.OPENROUTER_MODEL ?? 'openrouter/free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.2,
      }),
    });
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? '';
    return parseAIResponse(text);
  }

  // Gemini direct path
  if (process.env.GEMINI_API_KEY) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2000 },
        }),
      }
    );
    const data = await res.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return parseAIResponse(text);
  }

  throw new Error('No AI API key configured. Set OPENROUTER_API_KEY or GEMINI_API_KEY in .env.local');
}

function parseAIResponse(text: string): AIExplanation {
  try {
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as AIExplanation;
  } catch {}
  return { summary: text.substring(0, 200), items: [] };
}