// @ts-check
'use strict';

// dependencies
const _      = require( 'lodash' );
const Module = require( './i18nModule' );


// only needed for typing
const Chunk            = require( 'webpack/lib/Chunk' );
const Compilation      = require( 'webpack/lib/Compilation' );
const NormalModule     = require( 'webpack/lib/NormalModule' );
const JSONConcatSource = require( './JSONConcatSource' );

/**
 * The dictionary keeps track of all i18n modules
 */
class Dictionary {
	/**
	 * Creates a new Dictionary object
	 * @param {string} file_name_pattern
	 * @param {string} shared_text_key
	 * @param {string[]} [locales]
	 */
	constructor( file_name_pattern, shared_text_key, locales ) {
		/** @type {Object.<string, Module>} */
		this.modulesByIdentifier = {};
		this.file_name_pattern = file_name_pattern;
		this.shared_text_key = shared_text_key;
		this.locales = locales;
	}

	/**
	 * Add a module to the dictionary
	 * @param {string} identifier
	 * @param {object} info
	 * @param {string} info.key
	 * @param {Object.<string, object>} info.json
	 * @param {NormalModule} originalModule
	 * @param {Chunk} chunkCopy
	 */
	addModule( identifier, info, originalModule, chunkCopy ) {
		const obj = this.modulesByIdentifier;

		// init Module, if applicable
		if ( !obj[identifier] ) {
			obj[identifier] = new Module( identifier, info, originalModule );
		}

		// update originalModule, if applicable
		const mod = obj[identifier];
		if ( originalModule.index2 < mod.getOriginalModule().index2 ) {
			mod.setOriginalModule( originalModule );
		}

		// add chunk to Module, then return Module
		mod.addToChunk( chunkCopy );
		return mod;
	}

	/**
	 * Build the assets files & add them to the compilation
	 * @param {Compilation} compilation
	 * @param {Function} callback
	 */
	buildAndAddAssets( compilation, callback ) {
	
		// get a list of all chunks that have i18n data
		const all_chunks= [];
		for (const ident in this.modulesByIdentifier ) {
			for ( const chunk of this.modulesByIdentifier[ident].chunks ) {
				if ( !all_chunks.includes( chunk ) ) {
					all_chunks.push( chunk );
				}
			}
		}
		
		// loop through each parent chunk
		for ( const chunk of all_chunks ) {

			// this property only exists on our copied chunk
			/** @type {Chunk} */
			const originalChunk = chunk['originalChunk'];
	
			// build a single dictionary of locales that includes text from each module
			/** @type {Object.<string, JSONConcatSource>} */
			let locales = {};
			for ( const module of Array.from( chunk.modulesIterable ) ) {
				locales = module.extractLocales( locales, this.shared_text_key )
			}
	
			// loop through the dictionary, each item of which is a JSONConcatSource
			_.each( locales, ( concat_source, locale ) => {
				// if we are filtering locales down and current locale wasn't specified, break out early
				if ( Array.isArray( this.locales ) && !this.locales.includes( locale ) ) {
					return;
				}

				// figure out the filename for the source
				const file = compilation.getPath(
					this.file_name_pattern,
					{ chunk: originalChunk }
				).replace( '[locale]', locale );
	
				// add the file to assets & to the files array on the original chunk
				compilation.assets[file] = concat_source;
				originalChunk.files.push( file );
			} );
		}
	
		callback();
	}
}

module.exports = Dictionary;
