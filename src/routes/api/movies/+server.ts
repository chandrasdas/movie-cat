import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db';
import { movies, libraryFolders } from '#lib/server/db/schema';
import { eq, and, desc, asc, like, gte, or } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const search = url.searchParams.get('search')?.trim() || '';
		const genre = url.searchParams.get('genre')?.trim() || '';
		const yearParam = url.searchParams.get('year')?.trim() || '';
		const language = url.searchParams.get('language')?.trim() || '';
		const minRatingParam = url.searchParams.get('minRating')?.trim() || '';
		const sort = url.searchParams.get('sort')?.trim() || 'recent_added';
		const folderId = url.searchParams.get('folderId')?.trim() || '';
		const includeDisabled = url.searchParams.get('includeDisabled') === 'true';

		// Base condition: Only show movies from ENABLED folders unless explicitly overridden
		const conditions = [];

		if (!includeDisabled) {
			conditions.push(eq(libraryFolders.isEnabled, true));
		}

		if (folderId) {
			conditions.push(eq(movies.folderId, folderId));
		}

		if (search) {
			const term = `%${search}%`;
			conditions.push(
				or(like(movies.title, term), like(movies.parsedTitle, term), like(movies.overview, term))
			);
		}

		if (genre && genre !== 'all') {
			conditions.push(like(movies.genres, `%"${genre}"%`));
		}

		if (yearParam && yearParam !== 'all') {
			const yearNum = parseInt(yearParam, 10);
			if (!isNaN(yearNum)) {
				conditions.push(eq(movies.releaseYear, yearNum));
			}
		}

		if (language && language !== 'all') {
			conditions.push(eq(movies.language, language));
		}

		if (minRatingParam) {
			const minRating = parseFloat(minRatingParam);
			if (!isNaN(minRating)) {
				conditions.push(gte(movies.rating, minRating));
			}
		}

		const query = db
			.select({
				id: movies.id,
				folderId: movies.folderId,
				folderPath: movies.folderPath,
				folderName: movies.folderName,
				parsedTitle: movies.parsedTitle,
				parsedYear: movies.parsedYear,
				title: movies.title,
				overview: movies.overview,
				releaseDate: movies.releaseDate,
				releaseYear: movies.releaseYear,
				genres: movies.genres,
				language: movies.language,
				rating: movies.rating,
				runtime: movies.runtime,
				contentRating: movies.contentRating,
				posterUrl: movies.posterUrl,
				backdropUrl: movies.backdropUrl,
				trailerUrl: movies.trailerUrl,
				metadataSource: movies.metadataSource,
				externalId: movies.externalId,
				videoFiles: movies.videoFiles,
				createdAt: movies.createdAt,
				updatedAt: movies.updatedAt,
				folderNameSource: libraryFolders.name,
				folderPathSource: libraryFolders.path,
				isFolderEnabled: libraryFolders.isEnabled
			})
			.from(movies)
			.innerJoin(libraryFolders, eq(movies.folderId, libraryFolders.id));

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		let orderByClause;
		switch (sort) {
			case 'title_asc':
				orderByClause = asc(movies.title);
				break;
			case 'year_desc':
				orderByClause = desc(movies.releaseYear);
				break;
			case 'year_asc':
				orderByClause = asc(movies.releaseYear);
				break;
			case 'rating_desc':
				orderByClause = desc(movies.rating);
				break;
			case 'recent_added':
			default:
				orderByClause = desc(movies.createdAt);
				break;
		}

		const results = await (whereClause
			? query.where(whereClause).orderBy(orderByClause)
			: query.orderBy(orderByClause));

		// Extract available filter metadata (genres, years, languages) from all enabled movies
		const allEnabledMovies = await db
			.select({
				genres: movies.genres,
				releaseYear: movies.releaseYear,
				language: movies.language
			})
			.from(movies)
			.innerJoin(libraryFolders, eq(movies.folderId, libraryFolders.id))
			.where(eq(libraryFolders.isEnabled, true));

		const genreSet = new Set<string>();
		const yearSet = new Set<number>();
		const languageSet = new Set<string>();

		for (const m of allEnabledMovies) {
			if (m.genres) {
				try {
					const parsed = JSON.parse(m.genres) as string[];
					for (const g of parsed) if (g) genreSet.add(g);
				} catch {
					// ignore json parse error
				}
			}
			if (m.releaseYear) yearSet.add(m.releaseYear);
			if (m.language) languageSet.add(m.language);
		}

		const availableGenres = Array.from(genreSet).sort();
		const availableYears = Array.from(yearSet).sort((a, b) => b - a);
		const availableLanguages = Array.from(languageSet).sort();

		return json({
			success: true,
			movies: results,
			filterOptions: {
				genres: availableGenres,
				years: availableYears,
				languages: availableLanguages,
				totalMovies: results.length
			}
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return json({ success: false, error: message }, { status: 500 });
	}
};
