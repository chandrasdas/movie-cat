import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db';
import { libraryFolders, movies, type LibraryFolder } from '#lib/server/db/schema';
import { eq, count } from 'drizzle-orm';
import path from 'node:path';
import fs from 'node:fs/promises';

export const GET: RequestHandler = async () => {
	try {
		const folders = await db.select().from(libraryFolders);
		// Get real-time movie counts per folder
		const counts = await db
			.select({
				folderId: movies.folderId,
				count: count(movies.id)
			})
			.from(movies)
			.groupBy(movies.folderId);

		const countMap = new Map<string, number>(
			counts.map((c: { folderId: string; count: number }) => [c.folderId, c.count])
		);

		const enriched = folders.map((f: LibraryFolder) => ({
			...f,
			movieCount: countMap.get(f.id) ?? f.movieCount
		}));

		return json({ success: true, folders: enriched });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return json({ success: false, error: message }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const folderPath = String(body.path || '').trim();

		if (!folderPath) {
			return json({ success: false, error: 'Folder path is required' }, { status: 400 });
		}

		// Verify folder exists on local disk
		try {
			const stat = await fs.stat(folderPath);
			if (!stat.isDirectory()) {
				return json({ success: false, error: 'Path is not a valid directory' }, { status: 400 });
			}
		} catch {
			return json(
				{ success: false, error: `Directory does not exist: ${folderPath}` },
				{ status: 400 }
			);
		}

		const folderName = body.name?.trim() || path.basename(folderPath) || folderPath;

		// Check if already registered
		const existing = await db
			.select()
			.from(libraryFolders)
			.where(eq(libraryFolders.path, folderPath));

		if (existing.length > 0) {
			return json({ success: true, folder: existing[0], existed: true });
		}

		const [newFolder] = await db
			.insert(libraryFolders)
			.values({
				path: folderPath,
				name: folderName,
				isEnabled: true,
				movieCount: 0
			})
			.returning();

		return json({ success: true, folder: newFolder, existed: false });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return json({ success: false, error: message }, { status: 500 });
	}
};
