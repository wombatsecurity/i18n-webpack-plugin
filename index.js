'use strict';

// node module dependencies
const fs = require( 'fs' ),
    async = require( "async" ),
    Chunk = require( "webpack/lib/Chunk" ),
    _ = require( 'lodash' );

// package dependencies
const Loader = require.resolve( "./loader" ),
    Dictionary = require( './lib/i18nDictionary' );

// package-level consts/vars
const NS = fs.realpathSync( __dirname );
let nextId = 0;

/**
 * Main class for plugin
 */
function I18nPlugin( options ) {
    this.options = _.assign( {
        file_name_pattern: 'i18n/[locale].i18n',
        root: process.cwd(),
        shared_text_key: null,
        id: nextId++
    }, options );

    this.id = options.id;
}

/**
 * Main plugin method
 */
I18nPlugin.prototype.apply = function ( compiler ) {
    const options = this.options;

    /**
     * Attach to a compilation to modify stuff
     */
    compiler.plugin( "this-compilation", ( compilation ) => {

        // the dictionary holds all of the extracted text
        const dictionary = new Dictionary( options.file_name_pattern, options.shared_text_key );

        // this array will hold a copy of all of the chunks in the compilation
        let chunkCopyList;

        // Attach to the normal-module-loader (runs before specific loaders)
        compilation.plugin( "normal-module-loader", setUpNamespace );

        /**
         * In optimize step, we need to figure out whether this module is one of the ones we
         * want to combine/extract.
         */
        compilation.plugin( "optimize-tree", ( originalChunkList, modules, callback ) => {
            // Make a copy of each chunk in the list
            chunkCopyList = copyChunks( originalChunkList );

            // Process each chunk
            async.forEach( originalChunkList,
                // iteratee
                processChunk.bind( this, originalChunkList, chunkCopyList, dictionary ),
                // callback
                postProcessChunks.bind( this, compilation, chunkCopyList, callback )
            );
        } );

        // Build the output files and add them as additional assets
        compilation.plugin( "additional-assets", dictionary.buildAndAddAssets.bind( dictionary, compilation ) );

    } );
};

/**
 * Static method to retrieve loader
 */
I18nPlugin.loader = function ( options ) {
    return { loader: Loader, options: options };
};

/**
 * Instance method to retrieve a loader for this specific plugin instance (copies options)
 */
I18nPlugin.prototype.loader = function ( options ) {
    return I18nPlugin.loader( _.assign( { id: this.id }, options ) );
};

/**
 * Set up a namespace for the plugin on the loaderContext. This lets the loader set
 * meta-information on the module itself.
 */
function setUpNamespace( loaderContext, module ) {
    loaderContext[NS] = {
        setPluginContent: function ( content ) {
            if ( !module[NS] ) {
                module[NS] = {};
            }
            module[NS].content = content;
        }
    }
}

/**
 * Process a chunk during the optimize-tree phase. If loader has set content on the plugin 
 * namespace, add the module's content to the dictionary.
 * 
 * NOTE: the context is bound to the plugin & first 3 params are bound as well
 */
function processChunk( originalChunkList, chunkCopyList, dictionary, chunk, callback ) {
    // look up the copy of the chunk
    let chunkCopy = chunkCopyList[originalChunkList.indexOf( chunk )];

    // loop through each module in the chunk
    async.forEach( chunk.modules.slice(), function ( module, callback ) {
        // get plugin metadata from plugin namespace
        let meta = module[NS];

        // make sure plugin data was set (means this module was handled by loader)
        if ( meta && meta.content ) {
            dictionary.addModule( module.identifier(), meta.content, module, chunkCopy );
        }

        // call the callback
        callback();
    }, function ( err ) {
        if ( err ) return callback( err );
        callback();
    } );
}

/**
 * After we process each chunk, we need to do some post-processing
 */
function postProcessChunks( compilation, chunkCopyList, callback, err ) {
    if ( err ) return callback( err );

    // once all content has been added to the extracted chunks....
    //   1. merge non-initial chunks
    chunkCopyList.forEach( function ( extractedChunk ) {
        if ( isInitialOrHasNoParents( extractedChunk ) )
            mergeNonInitialChunks( extractedChunk );
    }, this );

    //   2. remove all modules that have been merged
    chunkCopyList.forEach( function ( extractedChunk ) {
        if ( !isInitialOrHasNoParents( extractedChunk ) ) {
            extractedChunk.modules.slice().forEach( function ( module ) {
                extractedChunk.removeModule( module );
            } );
        }
    } );

    // optimize the extracted chunks
    compilation.applyPlugins( "optimize-extracted-chunks", chunkCopyList );

    callback();
}

/**
 * Merge all modules to the initial chunks
 */
function mergeNonInitialChunks( chunk, intoChunk, checkedChunks ) {
    if ( !intoChunk ) {
        checkedChunks = [];
        chunk.chunks.forEach( function ( c ) {
            if ( isInitialOrHasNoParents( c ) ) return;
            mergeNonInitialChunks( c, chunk, checkedChunks );
        } );
    } else if ( checkedChunks.indexOf( chunk ) < 0 ) {
        checkedChunks.push( chunk );
        chunk.modules.slice().forEach( function ( module ) {
            intoChunk.addModule( module );
            module.addChunk( intoChunk );
        } );
        chunk.chunks.forEach( function ( c ) {
            if ( isInitialOrHasNoParents( c ) ) return;
            mergeNonInitialChunks( c, intoChunk, checkedChunks );
        } );
    }
};


/**
 * Is a chunk an initial or leaf chunk?
 * @param {Chunk} chunk 
 */
function isInitialOrHasNoParents( chunk ) {
    return chunk.isInitial() || chunk.parents.length === 0;
}

/**
 * Make a copy of a list of chunks
 * @param {Chunk[]} originalChunkList 
 * @param {Chunk[]} chunkCopyList 
 */
function copyChunks( originalChunkList ) {
    // create a new list of chunks to hold information identical to the original list of chunks
    let chunkCopyList = originalChunkList.map( function ( original ) {
        let copy = new Chunk( original.name );
        copy.originalChunk = original;
        copy.entrypoints = original.entrypoints;
        return copy;
    } );

    // update copied chunks with links to other chunks
    originalChunkList.forEach( function ( original, i ) {
        let copy = chunkCopyList[i];
        copy.index = i;
        original.chunks.forEach( function ( i ) {
            copy.addChunk( chunkCopyList[originalChunkList.indexOf( i )] );
        } );
        original.parents.forEach( function ( i ) {
            copy.addParent( chunkCopyList[originalChunkList.indexOf( i )] );
        } );
    } );

    return chunkCopyList;
}

// Export I18nPlugin
module.exports = I18nPlugin;