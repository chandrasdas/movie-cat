import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const libraryFolders = sqliteTable('library_folders', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	path: text('path').notNull().unique(),
	name: text('name').notNull(),
	isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(true),
	movieCount: integer('movie_count').notNull().default(0),
	lastScannedAt: integer('last_scanned_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const movies = sqliteTable('movies', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	folderId: text('folder_id')
		.notNull()
		.references(() => libraryFolders.id, { onDelete: 'cascade' }),
	folderPath: text('folder_path').notNull(),
	folderName: text('folder_name').notNull(),
	parsedTitle: text('parsed_title').notNull(),
	parsedYear: integer('parsed_year'),
	title: text('title').notNull(),
	overview: text('overview'),
	releaseDate: text('release_date'),
	releaseYear: integer('release_year'),
	genres: text('genres'), // JSON array string e.g. '["Sci-Fi","Action"]'
	language: text('language'),
	rating: real('rating'),
	runtime: integer('runtime'), // in minutes
	contentRating: text('content_rating'),
	posterUrl: text('poster_url'),
	backdropUrl: text('backdrop_url'),
	trailerUrl: text('trailer_url'),
	metadataSource: text('metadata_source'), // "itunes" | "tmdb" | "local"
	externalId: text('external_id'),
	videoFiles: text('video_files'), // JSON array of file info {name, size, extension}
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const appSettings = sqliteTable('app_settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});

export type LibraryFolder = typeof libraryFolders.$inferSelect;
export type InsertLibraryFolder = typeof libraryFolders.$inferInsert;
export type Movie = typeof movies.$inferSelect;
export type InsertMovie = typeof movies.$inferInsert;
export type AppSetting = typeof appSettings.$inferSelect;
