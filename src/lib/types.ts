export interface VideoFileDetail {
	name: string;
	relativePath: string;
	fullPath: string;
	sizeBytes: number;
	extension: string;
}

export interface MovieItem {
	id: string;
	folderId: string;
	folderPath: string;
	folderName: string;
	parsedTitle: string;
	parsedYear: number | null;
	title: string;
	overview: string | null;
	releaseDate: string | null;
	releaseYear: number | null;
	genres: string | null; // JSON string
	language: string | null;
	rating: number | null;
	runtime: number | null;
	contentRating: string | null;
	posterUrl: string | null;
	backdropUrl: string | null;
	trailerUrl: string | null;
	metadataSource: string | null;
	externalId: string | null;
	videoFiles: string | null; // JSON string
	createdAt: Date | string | null;
	updatedAt: Date | string | null;
	folderNameSource?: string;
	folderPathSource?: string;
	isFolderEnabled?: boolean;
}

export interface LibraryFolderItem {
	id: string;
	path: string;
	name: string;
	isEnabled: boolean;
	movieCount: number;
	lastScannedAt: Date | string | null;
}

export interface FilterOptions {
	genres: string[];
	years: number[];
	languages: string[];
	totalMovies: number;
}
