'use strict';

const Module = require( './i18nModule' ),
	_ = require( 'lodash' );

/**
 * The dictionary keeps track of all i18n modules
 * @constructor
 */
function Dictionary( file_name_pattern, shared_text_key ) {
	this.modulesByIdentifier = {};
	this.file_name_pattern = file_name_pattern;
	this.shared_text_key = shared_text_key;
}

/**
 * Add a module to the dictionary
 */
Dictionary.prototype.addModule = function ( identifier, info, originalModule, chunkCopy ) {
	let m;
	if ( !this.modulesByIdentifier[identifier] ) {
		m = this.modulesByIdentifier[identifier] = new Module( identifier, info, originalModule );
	} else {
		m = this.modulesByIdentifier[identifier];
		if ( originalModule.index2 < m.getOriginalModule().index2 ) {
			m.setOriginalModule( originalModule );
		}
	}
	m.addToChunk( chunkCopy );
	return m;
}


/**
 * Build the assets files & add them to the compilation
 */
Dictionary.prototype.buildAndAddAssets = function ( compilation, callback ) {
	const file_name_pattern = this.file_name_pattern,
		  shared_text_key = this.shared_text_key;

	// get a list of all chunks that have i18n data
	const all_chunks = _.reduce( this.modulesByIdentifier, function ( chunks, module ) {
		return _.reduce( module.chunks, function ( chunks, chunk ) {
			if ( chunks.indexOf( chunk ) < 0 ) {
				chunks.push( chunk );
			}
			return chunks;
		}, chunks );
	}, [] );

	// loop through each parent chunk
	_.each( all_chunks, function ( chunk ) {
		const originalChunk = chunk.originalChunk;

		// build a single dictionary of locales that includes text from each module
		const locales = _.reduce( chunk.mapModules(), function ( locales, module ) {
			return module.extractLocales( locales, shared_text_key );
		}, {} );

		// loop through the dictionary, each item of which is a JSONConcatSource
		_.each( locales, function ( concat_source, locale ) {
			// figure out the filename for the source
			const file = compilation.getPath( file_name_pattern, {
				chunk: originalChunk
			} ).replace( '[locale]', locale );

			// add the file to assets & to the files array on the original chunk
			compilation.assets[file] = concat_source;
			originalChunk.files.push( file );
		} );
	} );

	callback();
}

module.exports = Dictionary;
