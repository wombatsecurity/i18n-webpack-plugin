/********************************************************************************
 * (C) 2016 Wombat Security Technologies, Inc.
 * Description:    A Webpack plugin that extracts localized text and pulls it into
 *                a json file for each locale.
 * Author:        Jason R Brubaker
 * Date:        3/18/2016
 *******************************************************************************/

var async = require( "async" );
var Chunk = require( "webpack/lib/Chunk" );

var Dictionary = require( './lib/i18nDictionary' );

/**
 * The main plugin class
 * @param id
 * @param filename
 * @param options
 * @constructor
 */
function I18nPlugin( options ) {
	if ( !options ) options = {};
	this.options = options;
}

// Static method for adding the loader
I18nPlugin.loader = function ( options ) {
	return require.resolve( "./loader" ) + (options ? "?" + JSON.stringify( options ) : "");
};

/**
 * Main method used by webpack to start the plugin
 * @param compiler
 */
I18nPlugin.prototype.apply = function ( compiler ) {
	// save options
	var options = this.options;

	// Add a plugin to the compiler to attach to an individual compilation run
	compiler.plugin( "this-compilation", function ( compilation ) {
		/**
		 * Definitions
		 */

		// the dictionary holds all of the extracted text
		var dictionary = new Dictionary();

		// a clone of every chunk in the compilation
		var extractedChunks;

		// list of chunks marked "entry"
		var entryChunks

		// list of chunks marked as "initial"
		var initialChunks;

		// Add a plugin to the normal-module-loader (runs before specific loaders)
		compilation.plugin( "normal-module-loader", function ( loaderContext, module ) {
			// add a function to the loaderContext to be called from the loader.
			// when called, save the info on the module via the meta object's properties
			loaderContext[__dirname] = function ( info ) {
				module.meta[__dirname] = info;
			};
		} );

		// in "optimize" step, get a list of entry chunks & inital chunks
		compilation.plugin( "optimize", function () {
			entryChunks = compilation.chunks.filter( function ( c ) {
				return c.entry;
			} );
			initialChunks = compilation.chunks.filter( function ( c ) {
				return c.initial;
			} );
		} );

		// in "optimize-tree" step, get full list of extracted chunks
		compilation.plugin( "optimize-tree", function ( chunks, modules, callback ) {
			// create a new list of chunks to hold information identical to the original list of chunks
			extractedChunks = chunks.map( function ( chunk, i ) {
				return new Chunk();
			} );

			// loop through the supplied chunks and update our own list with their information
			chunks.forEach( function ( chunk, i ) {
				var extractedChunk = extractedChunks[i];
				extractedChunk.index = i;
				extractedChunk.originalChunk = chunk;
				extractedChunk.name = chunk.name;
				extractedChunk.entry = chunk.entry;
				extractedChunk.initial = chunk.initial;
				chunk.chunks.forEach( function ( c ) {
					extractedChunk.addChunk( extractedChunks[chunks.indexOf( c )] );
				} );
				chunk.parents.forEach( function ( c ) {
					extractedChunk.addParent( extractedChunks[chunks.indexOf( c )] );
				} );
			} );

			// update extracted chunks & set entry flag
			entryChunks.forEach( function ( chunk ) {
				var idx = chunks.indexOf( chunk );
				if ( idx < 0 ) return;
				var extractedChunk = extractedChunks[idx];
				extractedChunk.entry = true;
			} );

			// update extracted chunks & set initial flag
			initialChunks.forEach( function ( chunk ) {
				var idx = chunks.indexOf( chunk );
				if ( idx < 0 ) return;
				var extractedChunk = extractedChunks[idx];
				extractedChunk.initial = true;
			} );

			// loop over every chunk
			async.forEach( chunks,
				// iterator
				function ( chunk, callback ) {
					var extractedChunk = extractedChunks[chunks.indexOf( chunk )];

					// should we extract from this chunk? if so, loop over each of the modules in the chunk
					if ( !!(options.allChunks || chunk.initial) ) {
						async.forEach( chunk.modules.slice(),
							// iterator
							function ( module, callback ) {
								var meta = module.meta && module.meta[__dirname];

								// if this module has our meta tag, process it
								if ( meta ) {
									dictionary.addModule( module.identifier(), meta, module, extractedChunk );
								}

								// we're done here
								callback();
							},
							// callback
							function ( err ) {
								if ( err ) {
									return callback( err );
								}
								callback();
							} );
					}
				},

				// callback
				function ( err ) {

					if ( err ) return callback( err );

					// loop over extracted chunks & merge an initial chunk's sub-chunks into the initial chunk
					extractedChunks.forEach( function ( extractedChunk ) {
						if ( extractedChunk.initial ) {
							this.mergeModulesToInitialChunks( extractedChunk );
						}
					}, this );

					// optimize the final list of extracted chunks
					compilation.applyPlugins( "optimize-extracted-chunks", extractedChunks );

					// we're done
					callback();
				}.bind( this ) );

		}.bind( this ) );

		// Add the extracted chunk(s) as additional asses
		compilation.plugin( "additional-assets", function ( callback ) {
			dictionary.buildAndAddAssets( compilation );
			callback();
		}.bind( this ) );


	}.bind( this ) );
};

/**
 * Merge all modules to the initial chunks
 * @param chunk
 * @param checkedChunks
 * @param intoChunk
 */
I18nPlugin.prototype.mergeModulesToInitialChunks = function ( chunk, checkedChunks, intoChunk ) {
	// default checkedChunks
	if ( !checkedChunks ) {
		checkedChunks = [];
	}

	// make sure we haven't already dealt with this chunk
	if (checkedChunks.indexOf( chunk) ) {
		return;
	}

	// intoChunk is provided, so we want to remove this chunk's modules and add them to
	// the intoChunk
	if (intoChunk) {
		checkedChunks.push( chunk );
		chunk.modules.slice().forEach( function ( module ) {
			module.removeFromChunk( chunk );
			module.addToChunk( intoChunk );
		} );
	}

	// recursively call this same function, supplying the correct intoChunk
	chunk.chunks.forEach( function ( c ) {
		if ( c.initial ) return;
		this.mergeModulesToInitialChunks( c, checkedChunks, intoChunk || chunk );
	}, this );

};

module.exports = I18nPlugin;