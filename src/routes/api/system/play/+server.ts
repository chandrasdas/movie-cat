import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { playInDefaultPlayer } from '#lib/server/system';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { path: targetPath } = await request.json();
		if (!targetPath) {
			return json({ success: false, error: 'Path is required' }, { status: 400 });
		}
		const success = await playInDefaultPlayer(String(targetPath));
		return json({ success });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return json({ success: false, error: message }, { status: 500 });
	}
};
