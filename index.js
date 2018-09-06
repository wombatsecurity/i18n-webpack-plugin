// @ts-check
'use strict';

// node builtin
const { realpathSync }  = require( 'fs' );

// package dependencies
const async = require( 'async' );
const Chunk = require( 'webpack/lib/Chunk' );

// only needed for typing
const Compiler    = require( 'webpack/lib/Compiler' );
const Compilation = require( 'webpack/lib/Compilation' );
const Module      = require( 'webpack/lib/NormalModule' );

// local dependencies
const Loader     = require.resolve( './loader' );
const Dictionary = require( './lib/i18nDictionary' );

// package-level variables
const NS = realpathSync( __dirname );
let nextId = 0;

class I18nPlugin {
	/**
	 * ctor for I18nPlugin objects
	 * @param {Object} options
	 * @param {string} options.file_name_pattern
	 * @param {string} options.root
	 * @param {string} options.shared_text_key
	 * @param {string[]} [options.locales]
	 * @param {Function} options.getTextGen
	 * @param {Function} options.keyFn
	 * @param {string} [options.id]
	 */
	constructor( options ) {
		this.options = Object.assign( {
			root: process.cwd(),
			file_name_pattern: 'i18n/[locale].i18n',
			shared_text_key: null,
			id: nextId++
		}, options );

		this.id = options.id;
	}

	/**
	 * Main plugin method
	 * @param {Compiler} compiler 
	 */
	apply( compiler ) {
		const { options } = this;

		// Attach to a compilation to modify stuff
		compiler.hooks.thisCompilation.tap( I18nPlugin.name,
			/** @param {Compilation} compilation */ ( compilation ) => {

			// the dictionary holds all of the extracted text
			const dictionary = new Dictionary( options.file_name_pattern, options.shared_text_key, options.locales );

			// this array will hold a copy of all of the chunks in the compilation
			let chunkCopyList;

			// Attach to the normal-module-loader (runs before specific loaders)
			compilation.hooks.normalModuleLoader.tap( I18nPlugin.name,
				/** @param {Module} module */ ( loaderContext, module ) => {

					// Set up a namespace for the plugin on the loaderContext.
					// This lets the loader set meta-information on the module itself.
					loaderContext[NS] = { setPluginContent( content ) {
						if ( !module[NS] ) module[NS] = {};
						module[NS].content = content;
					} };
				}
			);

			// We need to figure out whether this module is one we should to combine/extract
			compilation.hooks.optimizeTree.tapAsync( I18nPlugin.name,
				/** @param {Chunk[]} originalChunkList */ ( originalChunkList, _, callback ) => {

					// Make a copy of each chunk in the list
					chunkCopyList = copyChunks( originalChunkList );

					// Process each chunk
					async.forEach(
						originalChunkList,
						processChunk.bind( this, originalChunkList, chunkCopyList, dictionary ),
						postProcessChunks.bind( this, compilation, chunkCopyList, callback )
					);
				}
			);

			// Build the output files and add them as additional assets
			compilation.hooks.additionalAssets.tapAsync(
				I18nPlugin.name,
				dictionary.buildAndAddAssets.bind( dictionary, compilation )
			);
		} );
	}

	/**
	 * Static method to retrieve loader
	 */
	static loader( options ) {
		return { loader: Loader, options: options };
	}

	/**
	 * Instance method to retrieve a loader for this specific plugin instance (copies options)
	 */
	loader( options ) {
		return I18nPlugin.loader( Object.assign( { id: this.id }, this.options, options ) );
	}
}

/**
 * Process a chunk during the optimize-tree phase. If loader has set content on the plugin 
 * namespace, add the module's content to the dictionary.
 * NOTE: the context is bound to the plugin & first 3 params are bound as well
 * @param {Chunk[]} originalChunkList
 * @param {Chunk[]} chunkCopyList
 * @param {Dictionary} dictionary
 * @param {Chunk} chunk
 */
function processChunk( originalChunkList, chunkCopyList, dictionary, chunk, callback ) {

	// look up the copy of the chunk
	let chunkCopy = chunkCopyList[originalChunkList.indexOf( chunk )];

	// loop through each module in the chunk
	async.forEach( Array.from( chunk.modulesIterable ),
		/** @param {Module} module */ ( module, callback ) => {

			// get plugin metadata from plugin namespace
			let meta = module[NS];

			// make sure plugin data was set (means this module was handled by loader)
			if ( meta && meta.content ) {
				dictionary.addModule( module.identifier(), meta.content, module, chunkCopy );
			}

			// call the callback
			callback();
		}, ( err ) => {
			if ( err ) return callback( err );
			callback();
		}
	);
}

/**
 * After we process each chunk, we need to do some post-processing
 * @param {Compilation} compilation
 * @param {Chunk[]} chunkCopyList
 */
function postProcessChunks( compilation, chunkCopyList, callback, err ) {
	if ( err ) return callback( err );

	// once all content has been added to the extracted chunks....
	// 1. merge non-initial chunks
	chunkCopyList.forEach( ( extractedChunk ) => {
		if ( isInitialOrHasNoParents( extractedChunk ) )
			mergeNonInitialChunks( extractedChunk );
	} );

	// 2. remove all modules that have been merged
	chunkCopyList.forEach( ( extractedChunk ) => {
		if ( !isInitialOrHasNoParents( extractedChunk ) ) {
			for ( const module of extractedChunk.modulesIterable ) {
				extractedChunk.removeModule( module );
			}
		}
	} );

	// 3. optimize the extracted chunks
	compilation.hooks.optimizeExtractedChunks.call( chunkCopyList );

	callback();
}

/**
 * Merge all modules to the initial chunks
 * @param {Chunk} chunk
 * @param {Chunk} [intoChunk]
 * @param {Chunk[]} [checkedChunks]
 */
function mergeNonInitialChunks( chunk, intoChunk, checkedChunks ) {

	// triggered first time function is called
	if ( !intoChunk ) {
		const newCheckedChunks = [];

		for ( const asyncChunk of chunk.getAllAsyncChunks() ) {
			if ( !asyncChunk.isOnlyInitial() ) {
				mergeNonInitialChunks( asyncChunk, chunk, newCheckedChunks );
			}
		}
	}

	// triggered when function is called recursively
	else if ( !checkedChunks.includes( chunk ) ) {
		const newCheckedChunks = checkedChunks.concat(chunk);

		for ( const chunkModule of chunk.modulesIterable ) {
			intoChunk.addModule( chunkModule );
			chunkModule.addChunk( intoChunk );
		}

		for ( const asyncChunk of chunk.getAllAsyncChunks() ) {
			if ( !asyncChunk.isOnlyInitial() ) {
				mergeNonInitialChunks( asyncChunk, intoChunk, newCheckedChunks );
			}
		}
	}
};


/**
 * Is a chunk an initial or leaf chunk?
 * @param {Chunk} chunk 
 */
function isInitialOrHasNoParents( chunk ) {
	let parentCount = 0;

	for ( const group of chunk.groupsIterable ) {
		parentCount += group.getNumberOfParents();
	}

	return chunk.isOnlyInitial() || parentCount === 0;
}

/**
 * Make a copy of a list of chunks
 * @param {Chunk[]} originalChunkList
 * @return {Chunk[]} copied list of chunks
 */
function copyChunks( originalChunkList ) {

	// create a new list of chunks to hold information identical to the original list of chunks
	let chunkCopyList = originalChunkList.map( ( orig ) => new Chunk( orig.name ) );

	// update copied chunks with links to other chunks
	originalChunkList.forEach( ( orig, i ) => {
		const copy = chunkCopyList[i];

		// these props don't exist on Chunk, so use bracket property accessors
		copy['index'] = i;
		copy['originalChunk'] = orig;

		// add all of original chunk's groups to copy
		for ( const group of orig.groupsIterable ) copy.addGroup( group );
	} );

	return chunkCopyList;
}

module.exports = I18nPlugin;
