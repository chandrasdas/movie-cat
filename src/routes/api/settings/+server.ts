import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db';
import { appSettings } from '#lib/server/db/schema';

export const GET: RequestHandler = async () => {
	try {
		const settings = await db.select().from(appSettings);
		const settingsMap: Record<string, string> = {};
		for (const s of settings) {
			settingsMap[s.key] = s.value;
		}
		return json({
			success: true,
			settings: {
				tmdbApiKey: settingsMap['tmdb_api_key'] || ''
			}
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return json({ success: false, error: message }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const tmdbApiKey = String(body.tmdbApiKey || '').trim();

		await db
			.insert(appSettings)
			.values({
				key: 'tmdb_api_key',
				value: tmdbApiKey
			})
			.onConflictDoUpdate({
				target: appSettings.key,
				set: { value: tmdbApiKey }
			});

		return json({ success: true });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return json({ success: false, error: message }, { status: 500 });
	}
};
