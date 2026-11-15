import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { browseDirectories, pickFolderDialog } from '#lib/server/system';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const targetPath = url.searchParams.get('path') || undefined;
		const result = await browseDirectories(targetPath);
		return json(result);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return json({ success: false, error: message }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		let body: { path?: string; native?: boolean } = {};
		try {
			body = await request.json();
		} catch {
			// Body is optional
		}

		if (body.native) {
			const selectedPath = await pickFolderDialog();
			if (selectedPath) {
				return json({ success: true, path: selectedPath });
			}
			return json({ success: false, path: null, cancelled: true });
		}

		const result = await browseDirectories(body.path);
		return json(result);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return json({ success: false, error: message }, { status: 500 });
	}
};
