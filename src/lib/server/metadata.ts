export interface ParsedFolderInfo {
	parsedTitle: string;
	parsedYear: number | null;
	cleanTitle: string;
}

export interface MovieMetadata {
	title: string;
	releaseYear: number | null;
	releaseDate?: string | null;
	overview?: string | null;
	genres: string[];
	language?: string | null;
	rating?: number | null;
	runtime?: number | null;
	contentRating?: string | null;
	posterUrl?: string | null;
	backdropUrl?: string | null;
	trailerUrl?: string | null;
	metadataSource: 'wikipedia' | 'itunes' | 'tmdb' | 'local';
	externalId?: string | null;
}

/**
 * Parses folder names like 'Dune (2021)' or 'Blade Runner 2049 (2017) [1080p]'
 */
export function parseFolderName(folderName: string): ParsedFolderInfo {
	const trimmed = folderName.trim();

	// Primary format: Title (YYYY)
	const match = trimmed.match(/^(.+?)\s*\(([12]\d{3})\)/i);
	if (match) {
		const parsedTitle = match[1].replace(/[._]/g, ' ').trim();
		const parsedYear = parseInt(match[2], 10);
		return {
			parsedTitle,
			parsedYear,
			cleanTitle: parsedTitle
		};
	}

	// Secondary format: Title YYYY (e.g. Dune 2021 or Dune.2021)
	const altMatch = trimmed.match(/^(.+?)[.\s_-]+([12]\d{3})(?:[.\s_-]|$)/i);
	if (altMatch) {
		const parsedTitle = altMatch[1].replace(/[._]/g, ' ').trim();
		const parsedYear = parseInt(altMatch[2], 10);
		return {
			parsedTitle,
			parsedYear,
			cleanTitle: parsedTitle
		};
	}

	// Fallback if no 4-digit year found
	const cleanTitle = trimmed.replace(/[._]/g, ' ').trim();
	return {
		parsedTitle: cleanTitle,
		parsedYear: null,
		cleanTitle
	};
}

/**
 * Extracts standard genres from a film synopsis or text description
 */
function extractGenresFromText(text: string): string[] {
	const lower = text.toLowerCase();
	const genres: string[] = [];

	const patterns: [RegExp, string][] = [
		[/sci-fi|science fiction|space opera/i, 'Sci-Fi'],
		[/action/i, 'Action'],
		[/superhero/i, 'Superhero'],
		[/adventure/i, 'Adventure'],
		[/thriller|suspense|psychological/i, 'Thriller'],
		[/drama/i, 'Drama'],
		[/comedy|humor/i, 'Comedy'],
		[/horror|slasher|supernatural/i, 'Horror'],
		[/crime|heist|gangster/i, 'Crime'],
		[/mystery|detective/i, 'Mystery'],
		[/romance|romantic/i, 'Romance'],
		[/fantasy/i, 'Fantasy'],
		[/animation|animated/i, 'Animation'],
		[/documentary/i, 'Documentary'],
		[/war|military/i, 'War'],
		[/western/i, 'Western']
	];

	for (const [regex, genreName] of patterns) {
		if (regex.test(lower)) {
			genres.push(genreName);
		}
	}

	return genres.length > 0 ? genres : ['Feature Film'];
}

/**
 * Searches Wikipedia Official REST API (Free, zero registration, accurate official posters)
 */
export async function fetchWikipediaMetadata(
	title: string,
	year: number | null
): Promise<MovieMetadata | null> {
	try {
		const cleanTitle = title.replace(/\s+/g, '_');
		const slugs = [
			year ? `${cleanTitle}_(${year}_film)` : null,
			`${cleanTitle}_(film)`,
			cleanTitle
		].filter(Boolean) as string[];

		for (const slug of slugs) {
			try {
				const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`;
				const res = await fetch(url, {
					headers: { 'User-Agent': 'MovieCat/1.0 (contact@moviecat.local)' },
					signal: AbortSignal.timeout(5000)
				});

				if (!res.ok) continue;

				const data = (await res.json()) as {
					type: string;
					title: string;
					extract?: string;
					thumbnail?: { source: string };
					originalimage?: { source: string };
				};

				if (data.type === 'standard' && (data.thumbnail || data.extract)) {
					const overview = data.extract || null;
					const poster = data.originalimage?.source || data.thumbnail?.source || null;
					const cleanName = data.title
						.replace(/\s*\(\d{4}\s*film\)/i, '')
						.replace(/\s*\(film\)/i, '');
					const genres = overview ? extractGenresFromText(overview) : ['Feature Film'];

					return {
						title: cleanName || title,
						releaseYear: year,
						overview,
						genres,
						language: 'en',
						rating: null,
						runtime: null,
						posterUrl: poster,
						backdropUrl: poster,
						metadataSource: 'wikipedia'
					};
				}
			} catch {
				// try next slug
			}
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Searches iTunes Public Search API
 */
export async function fetchItunesMetadata(
	title: string,
	year: number | null
): Promise<MovieMetadata | null> {
	try {
		const url = `https://itunes.apple.com/search?term=${encodeURIComponent(title)}&limit=15`;
		const response = await fetch(url, {
			headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
			signal: AbortSignal.timeout(5000)
		});

		if (!response.ok) return null;

		const data = (await response.json()) as {
			resultCount: number;
			results: Array<{
				trackId?: number;
				trackName?: string;
				collectionName?: string;
				kind?: string;
				wrapperType?: string;
				releaseDate?: string;
				longDescription?: string;
				shortDescription?: string;
				primaryGenreName?: string;
				contentAdvisoryRating?: string;
				artworkUrl100?: string;
				previewUrl?: string;
				trackTimeMillis?: number;
			}>;
		};

		if (!data.results || data.results.length === 0) return null;

		const movieCandidates = data.results.filter(
			(r) =>
				r.kind === 'feature-movie' ||
				(r.primaryGenreName && !['Podcast', 'Music', 'Audiobook'].includes(r.primaryGenreName))
		);

		if (movieCandidates.length === 0) return null;

		let bestMatch = movieCandidates[0];
		if (year) {
			const matched = movieCandidates.find((item) => {
				if (!item.releaseDate) return false;
				const itemYear = new Date(item.releaseDate).getFullYear();
				return Math.abs(itemYear - year) <= 1;
			});
			if (matched) bestMatch = matched;
		}

		const releaseDate = bestMatch.releaseDate ? bestMatch.releaseDate.split('T')[0] : null;
		const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : year;

		let highResPoster: string | null = null;
		if (bestMatch.artworkUrl100) {
			highResPoster = bestMatch.artworkUrl100
				.replace('/100x100bb.jpg', '/1000x1000bb.jpg')
				.replace('/100x100bb.png', '/1000x1000bb.png');
		}

		const genres: string[] = [];
		if (bestMatch.primaryGenreName) {
			genres.push(bestMatch.primaryGenreName);
		}

		const runtime = bestMatch.trackTimeMillis
			? Math.round(bestMatch.trackTimeMillis / 60000)
			: null;

		return {
			title: bestMatch.trackName || bestMatch.collectionName || title,
			releaseYear,
			releaseDate,
			overview: bestMatch.longDescription || bestMatch.shortDescription || null,
			genres,
			language: 'en',
			rating: null,
			runtime,
			contentRating: bestMatch.contentAdvisoryRating || null,
			posterUrl: highResPoster,
			backdropUrl: highResPoster,
			trailerUrl: bestMatch.previewUrl || null,
			metadataSource: 'itunes',
			externalId: bestMatch.trackId ? String(bestMatch.trackId) : null
		};
	} catch {
		return null;
	}
}

/**
 * Optional TMDB API metadata fetcher if user provided an API key in settings
 */
export async function fetchTmdbMetadata(
	title: string,
	year: number | null,
	apiKey: string
): Promise<MovieMetadata | null> {
	try {
		const yearParam = year ? `&year=${year}` : '';
		const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(title)}${yearParam}`;

		const response = await fetch(searchUrl, {
			signal: AbortSignal.timeout(6000)
		});

		if (!response.ok) return null;

		const data = (await response.json()) as {
			results: Array<{
				id: number;
				title: string;
				release_date?: string;
				overview?: string;
				original_language?: string;
				vote_average?: number;
				poster_path?: string;
				backdrop_path?: string;
			}>;
		};

		if (!data.results || data.results.length === 0) return null;
		const result = data.results[0];

		const releaseDate = result.release_date || null;
		const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : year;

		const detailUrl = `https://api.themoviedb.org/3/movie/${result.id}?api_key=${encodeURIComponent(apiKey)}`;
		let runtime: number | null = null;
		const genres: string[] = [];

		try {
			const detailRes = await fetch(detailUrl, { signal: AbortSignal.timeout(5000) });
			if (detailRes.ok) {
				const detailData = (await detailRes.json()) as {
					runtime?: number;
					genres?: Array<{ name: string }>;
				};
				runtime = detailData.runtime || null;
				if (detailData.genres) {
					for (const g of detailData.genres) {
						genres.push(g.name);
					}
				}
			}
		} catch {
			// ignore detail error
		}

		const posterUrl = result.poster_path
			? `https://image.tmdb.org/t/p/w780${result.poster_path}`
			: null;
		const backdropUrl = result.backdrop_path
			? `https://image.tmdb.org/t/p/w1280${result.backdrop_path}`
			: null;

		return {
			title: result.title || title,
			releaseYear,
			releaseDate,
			overview: result.overview || null,
			genres,
			language: result.original_language || 'en',
			rating: result.vote_average ? Math.round(result.vote_average * 10) / 10 : null,
			runtime,
			posterUrl,
			backdropUrl,
			metadataSource: 'tmdb',
			externalId: String(result.id)
		};
	} catch {
		return null;
	}
}

/**
 * Universal resolver: tries TMDB (if key), then Wikipedia REST API, then iTunes, then local fallback
 */
export async function resolveMovieMetadata(
	parsedTitle: string,
	parsedYear: number | null,
	tmdbApiKey?: string | null
): Promise<MovieMetadata> {
	// 1. Try TMDB if key exists
	if (tmdbApiKey && tmdbApiKey.trim().length > 0) {
		const tmdbData = await fetchTmdbMetadata(parsedTitle, parsedYear, tmdbApiKey.trim());
		if (tmdbData) return tmdbData;
	}

	// 2. Try Wikipedia Official REST API (High accuracy, official posters, zero key required)
	const wikiData = await fetchWikipediaMetadata(parsedTitle, parsedYear);
	if (wikiData && wikiData.posterUrl) {
		// Also fetch iTunes for trailer preview clip if possible
		const itunesClip = await fetchItunesMetadata(parsedTitle, parsedYear);
		if (itunesClip?.trailerUrl) {
			wikiData.trailerUrl = itunesClip.trailerUrl;
		}
		return wikiData;
	}

	// 3. Try iTunes API
	const itunesData = await fetchItunesMetadata(parsedTitle, parsedYear);
	if (itunesData && itunesData.posterUrl) return itunesData;

	// If wiki has overview but no poster, use wiki
	if (wikiData) return wikiData;

	// 4. Fallback: Local
	return {
		title: parsedTitle,
		releaseYear: parsedYear,
		overview: `Local video collection: ${parsedTitle} (${parsedYear || 'Unknown'})`,
		genres: ['Feature Film'],
		language: 'en',
		rating: null,
		runtime: null,
		posterUrl: null,
		backdropUrl: null,
		trailerUrl: null,
		metadataSource: 'local'
	};
}
