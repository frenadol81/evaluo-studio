import { useEffect, useRef, useState } from 'react';

type Provider = 'gemini' | 'openai';
type Status = { provider: Provider; configured: Record<Provider, boolean> };

async function readStatus(response: Response): Promise<Status> {
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Reinicia el servidor local per activar la configuració d’IA.');
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No s’ha pogut carregar la configuració d’IA.');
  return data;
}

export function AiSettings({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState<Status>();
  const [provider, setProvider] = useState<Provider>('gemini');
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
    const request = new AbortController();
    fetch('/api/ai/settings', { signal: request.signal }).then(readStatus).then(data => {
      setStatus(data);
      setProvider(data.provider);
    }).catch(error => {
      if (!request.signal.aborted) setError(error.message);
    });
    return () => request.abort();
  }, []);

  return (
    <dialog ref={dialog} onCancel={onClose} aria-labelledby="ai-settings-title"
      className="fixed inset-auto bottom-20 left-4 m-0 max-h-[calc(100dvh-6rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl p-6 text-slate-900 shadow-xl backdrop:bg-slate-900/40">
      <form className="space-y-4" onSubmit={async event => {
        event.preventDefault();
        if (saving || !status) return;
        setSaving(true);
        setError('');
        try {
          await readStatus(await fetch('/api/ai/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider, apiKey: key.trim() || undefined }),
          }));
          setKey('');
          onClose();
        } catch (error) {
          setError(error instanceof Error ? error.message : 'No s’ha pogut desar la configuració.');
        } finally {
          setSaving(false);
        }
      }}>
        <h2 id="ai-settings-title" className="text-lg font-bold">Configuració d’IA</h2>
        <label className="block text-sm font-medium">
          Proveïdor de text
          <select value={provider} disabled={!status || saving} onChange={event => {
            setProvider(event.target.value as Provider);
            setKey('');
            setError('');
          }} className="mt-1 block w-full rounded-lg border border-warm-300 p-2">
            <option value="gemini">Gemini</option>
            <option value="openai">OpenAI (ChatGPT)</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          Clau API
          <input type="password" autoComplete="off" spellCheck={false} value={key} maxLength={512}
            required={Boolean(status && !status.configured[provider])} disabled={!status || saving}
            onChange={event => setKey(event.target.value)}
            placeholder={status?.configured[provider] ? 'Enganxa una clau nova per substituir-la' : 'Enganxa la clau API'}
            className="mt-1 block w-full rounded-lg border border-warm-300 p-2" />
        </label>
        {status?.configured[provider] && <p className="text-sm text-emerald-700">Clau configurada. Deixa el camp buit per conservar-la.</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-warm-300 px-4 py-2 text-sm">Tancar</button>
          <button type="submit" disabled={!status || saving} className="rounded-lg bg-primary-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? 'Desant…' : 'Desar'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
