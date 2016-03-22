/********************************************************************************
 * (C) 2016 Wombat Security Technologies, Inc.
 * Description: Holds extracted text in various locales
 * Author:      Jason R Brubaker
 * Date:        3/22/2016
 *******************************************************************************/
var Module = require( './i18nModule' );
var _ = require( 'lodash' );

/**
 * The dictionary keeps track of all i18n modules
 * @constructor
 */
function Dictionary() {
	this.modulesByIdentifier = {};

	this.addModule = function ( identifier, info, originalModule, parentChunk ) {
		var m;
		if ( !this.modulesByIdentifier[identifier] ) {
			m = this.modulesByIdentifier[identifier] = new Module( identifier, info, originalModule );
		} else {
			m = this.modulesByIdentifier[identifier];
			if ( originalModule.index2 < m.getOriginalModule().index2 ) {
				m.setOriginalModule( originalModule );
			}
		}
		m.addToChunk( parentChunk );

		return m;
	}

	/**
	 * Build the assets files & add them to the compilation
	 * @param compilation
	 */
	this.buildAndAddAssets = function ( compilation ) {

		// get a list of all chunks that have i18n data
		var all_chunks = _.reduce( this.modulesByIdentifier, function ( chunks, module ) {
			return _.reduce( module.chunks, function ( chunks, chunk ) {
				if ( chunks.indexOf( chunk ) < 0 ) {
					chunks.push( chunk );
				}
				return chunks;
			}, chunks );
		}, [] );
		
		// loop through each parent chunk
		_.each( all_chunks, function( chunk ) {
			var originalChunk = chunk.originalChunk;

			// build a single dictionary of locales that includes text from each module
			var locales = _.reduce( chunk.modules, function( locales, module ) {
				return module.extractLocales( locales );
			}, {} );
			
			// loop through the dictionary, each item of which is a JSONConcatSource
			_.each( locales, function( concat_source, locale ) {
				// figure out the filename for the source
				var file = compilation.getPath( locale + '.i18n.json', {
					chunk: originalChunk
				} );

				// add the file to assets & to the files array on the original chunk
				compilation.assets[file] = concat_source;
				originalChunk.files.push( file );
			} );
		} );
	}
}

module.exports = Dictionary;