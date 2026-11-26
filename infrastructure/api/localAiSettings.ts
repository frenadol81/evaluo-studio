import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { Express, Request, Response, RequestHandler } from 'express';

type Provider = 'gemini' | 'openai';
type Settings = { provider?: Provider; keys?: Partial<Record<Provider, string>> };
const file = '.env.ai.local';

export function registerLocalAiSettings(app: Express, parseJson: RequestHandler) {
  let settings: Settings = {};
  let loadFailed = false;
  try {
    settings = JSON.parse(readFileSync(file, 'utf8'));
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error();
  } catch (error) {
    settings = {};
    loadFailed = (error as NodeJS.ErrnoException).code !== 'ENOENT';
  }

  const key = (provider: Provider) => settings.keys?.[provider] ||
    process.env[provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY']?.trim();
  const provider = (): Provider => settings.provider ||
    (process.env.AI_PROVIDER?.trim().toLowerCase() === 'openai' ||
      (!process.env.AI_PROVIDER?.trim() && !key('gemini') && key('openai')) ? 'openai' : 'gemini');
  const status = () => ({
    provider: provider(),
    configured: { gemini: Boolean(key('gemini')), openai: Boolean(key('openai')) },
  });

  const localOnly = (req: Request, res: Response, next: () => void) => {
    const host = req.get('host') || '';
    const origin = req.get('origin');
    const localHost = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;
    const loopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress || '');
    res.set('Cache-Control', 'no-store');
    if (!loopback || !localHost.test(host) || (origin && origin !== `${req.protocol}://${host}`)) {
      res.status(403).json({ error: 'La configuració de claus només està disponible a l’aplicació local.' });
      return;
    }
    if (loadFailed) {
      res.status(500).json({ error: 'No s’ha pogut llegir la configuració local d’IA.' });
      return;
    }
    next();
  };

  app.get('/api/ai/settings', localOnly, (_req, res) => { res.json(status()); });
  app.put('/api/ai/settings', localOnly, parseJson, (req, res) => {
    const { provider: selected, apiKey } = req.body || {};
    if ((selected !== 'gemini' && selected !== 'openai') ||
        (apiKey !== undefined && (typeof apiKey !== 'string' || !apiKey.trim() || apiKey.length > 512 || /\s/.test(apiKey.trim())))) {
      res.status(400).json({ error: 'Tria un proveïdor i comprova que la clau no contingui espais.' });
      return;
    }
    const updated: Settings = {
      provider: selected,
      keys: { ...settings.keys, ...(apiKey ? { [selected]: apiKey.trim() } : {}) },
    };
    const temporary = `${file}.${randomUUID()}`;
    try {
      writeFileSync(temporary, JSON.stringify(updated), { mode: 0o600, flag: 'wx' });
      renameSync(temporary, file);
      settings = updated;
      res.json(status());
    } catch {
      try { rmSync(temporary, { force: true }); } catch { /* The settings file was not changed. */ }
      res.status(500).json({ error: 'No s’ha pogut desar la configuració local d’IA.' });
    }
  });

  return { key, provider };
}
