import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db';
import { libraryFolders, movies } from '#lib/server/db/schema';
import { eq } from 'drizzle-orm';

// PATCH /api/folders/[id] - toggle enabled/disabled
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const { id } = params;
		const body = await request.json();

		if (typeof body.isEnabled !== 'boolean') {
			return json({ success: false, error: 'isEnabled must be a boolean' }, { status: 400 });
		}

		const updated = await db
			.update(libraryFolders)
			.set({ isEnabled: body.isEnabled })
			.where(eq(libraryFolders.id, id))
			.returning();

		if (updated.length === 0) {
			return json({ success: false, error: 'Folder not found' }, { status: 404 });
		}

		return json({ success: true, folder: updated[0] });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return json({ success: false, error: message }, { status: 500 });
	}
};

// DELETE /api/folders/[id] - removes folder and associated movies
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;

		await db.delete(movies).where(eq(movies.folderId, id));
		await db.delete(libraryFolders).where(eq(libraryFolders.id, id));

		return json({ success: true });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return json({ success: false, error: message }, { status: 500 });
	}
};
