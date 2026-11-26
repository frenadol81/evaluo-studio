type ResponseOutput = {
  type: string;
  content?: Array<{ type: string; text?: string }>;
};

export async function generateOpenAiText(prompt: string, systemInstruction?: string, apiKey = process.env.OPENAI_API_KEY?.trim()): Promise<string> {
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini',
      input: prompt,
      instructions: systemInstruction,
      store: false,
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    throw Object.assign(new Error(`OpenAI HTTP ${response.status}`), { status: response.status });
  }
  const data = await response.json() as { status?: string; output?: ResponseOutput[] };
  const text = (data.output || []).filter(item => item.type === 'message')
    .flatMap(item => item.content || []).filter(part => part.type === 'output_text')
    .map(part => part.text || '').join('\n').trim();
  if (!text || data.status === 'incomplete') throw new Error('OpenAI returned no complete text');
  return text;
}
