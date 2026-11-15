import type { RequestHandler } from './$types';
import { db } from '#lib/server/db';
import { libraryFolders, movies, appSettings } from '#lib/server/db/schema';
import { scanDirectoryForMovies } from '#lib/server/scanner';
import { resolveMovieMetadata } from '#lib/server/metadata';
import { eq } from 'drizzle-orm';
import path from 'node:path';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const targetFolderId = body.folderId ? String(body.folderId) : null;
	let targetPath = body.path ? String(body.path).trim() : null;

	let targetFolder: typeof libraryFolders.$inferSelect | null = null;

	if (targetFolderId) {
		const existing = await db
			.select()
			.from(libraryFolders)
			.where(eq(libraryFolders.id, targetFolderId));
		if (existing.length > 0) {
			targetFolder = existing[0];
			targetPath = targetFolder.path;
		}
	} else if (targetPath) {
		const existing = await db
			.select()
			.from(libraryFolders)
			.where(eq(libraryFolders.path, targetPath));
		if (existing.length > 0) {
			targetFolder = existing[0];
		} else {
			const folderName = body.name?.trim() || path.basename(targetPath) || targetPath;
			const [inserted] = await db
				.insert(libraryFolders)
				.values({
					path: targetPath,
					name: folderName,
					isEnabled: true,
					movieCount: 0
				})
				.returning();
			targetFolder = inserted;
		}
	}

	if (!targetFolder || !targetPath) {
		return new Response(JSON.stringify({ error: 'Valid folder ID or path is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Fetch TMDB key from appSettings if available
	const tmdbSetting = await db
		.select()
		.from(appSettings)
		.where(eq(appSettings.key, 'tmdb_api_key'));
	const tmdbApiKey = tmdbSetting[0]?.value || null;

	const folder = targetFolder;
	const folderScanPath = targetPath;

	// Use ReadableStream for Server-Sent Events to fuel the Live Scanning Modal
	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			function sendEvent(eventType: string, data: Record<string, unknown>) {
				const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
				controller.enqueue(encoder.encode(message));
			}

			try {
				sendEvent('start', {
					folderId: folder.id,
					folderName: folder.name,
					folderPath: folderScanPath,
					message: `Starting deep scan in ${folderScanPath}...`
				});

				// Step 1: Discover all movie directories matching 'Title (Year)'
				const discoveredMovies = await scanDirectoryForMovies(
					folderScanPath,
					(status: { message: string; count: number }) => {
						sendEvent('discovery_progress', {
							message: status.message,
							count: status.count
						});
					}
				);

				const total = discoveredMovies.length;
				sendEvent('discovery_complete', {
					total,
					message: `Discovered ${total} movie folders. Fetching metadata...`
				});

				let processed = 0;
				let added = 0;
				let updated = 0;

				for (const item of discoveredMovies) {
					processed++;
					const { folderPath, folderName, parsedInfo, videoFiles } = item;

					sendEvent('item_progress', {
						current: processed,
						total,
						folderName,
						title: parsedInfo.parsedTitle,
						year: parsedInfo.parsedYear,
						message: `Resolving metadata for "${parsedInfo.parsedTitle} (${parsedInfo.parsedYear || ''})"`
					});

					// Fetch metadata from iTunes (free) or TMDB
					const metadata = await resolveMovieMetadata(
						parsedInfo.parsedTitle,
						parsedInfo.parsedYear,
						tmdbApiKey
					);

					// Check if movie already indexed
					const existingMovie = await db
						.select()
						.from(movies)
						.where(eq(movies.folderPath, folderPath));

					const genresJson = JSON.stringify(metadata.genres || []);
					const videoFilesJson = JSON.stringify(videoFiles);

					if (existingMovie.length > 0) {
						await db
							.update(movies)
							.set({
								title: metadata.title || parsedInfo.parsedTitle,
								overview: metadata.overview,
								releaseDate: metadata.releaseDate,
								releaseYear: metadata.releaseYear ?? parsedInfo.parsedYear,
								genres: genresJson,
								language: metadata.language || 'en',
								rating: metadata.rating,
								runtime: metadata.runtime,
								contentRating: metadata.contentRating,
								posterUrl: metadata.posterUrl,
								backdropUrl: metadata.backdropUrl,
								trailerUrl: metadata.trailerUrl,
								metadataSource: metadata.metadataSource,
								externalId: metadata.externalId,
								videoFiles: videoFilesJson,
								updatedAt: new Date()
							})
							.where(eq(movies.id, existingMovie[0].id));
						updated++;
					} else {
						await db.insert(movies).values({
							folderId: folder.id,
							folderPath,
							folderName,
							parsedTitle: parsedInfo.parsedTitle,
							parsedYear: parsedInfo.parsedYear,
							title: metadata.title || parsedInfo.parsedTitle,
							overview: metadata.overview,
							releaseDate: metadata.releaseDate,
							releaseYear: metadata.releaseYear ?? parsedInfo.parsedYear,
							genres: genresJson,
							language: metadata.language || 'en',
							rating: metadata.rating,
							runtime: metadata.runtime,
							contentRating: metadata.contentRating,
							posterUrl: metadata.posterUrl,
							backdropUrl: metadata.backdropUrl,
							trailerUrl: metadata.trailerUrl,
							metadataSource: metadata.metadataSource,
							externalId: metadata.externalId,
							videoFiles: videoFilesJson
						});
						added++;
					}

					sendEvent('item_completed', {
						current: processed,
						total,
						title: metadata.title || parsedInfo.parsedTitle,
						posterUrl: metadata.posterUrl,
						genres: metadata.genres,
						source: metadata.metadataSource
					});
				}

				// Update folder stats
				await db
					.update(libraryFolders)
					.set({
						movieCount: total,
						lastScannedAt: new Date()
					})
					.where(eq(libraryFolders.id, folder.id));

				sendEvent('complete', {
					total,
					added,
					updated,
					message: `Scan finished successfully! ${added} added, ${updated} updated.`
				});
			} catch (err: unknown) {
				const errorMessage = err instanceof Error ? err.message : 'Unknown scan error';
				console.error('Scan stream error:', err);
				sendEvent('error', { message: errorMessage });
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive'
		}
	});
};
