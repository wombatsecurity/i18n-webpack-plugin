'use strict';

const JSONSource = require( './JSONSource' ),
	JSONConcatSource = require( './JSONConcatSource' );

/**
 * The Module class refers to a single required i18n asset.
 * @param identifier
 * @param info
 * @param originalModule
 * @constructor
 */
function Module( identifier, info, originalModule ) {
	this._identifier = identifier;
	this._originalModule = originalModule;
	this._key = info.key;
	this._json = info.json;
	this.chunks = [];
}

/**
 * Add this module to a chunk (also adds the chunk to the module's chunks array)
 * @param chunk
 * @returns {boolean}
 */
Module.prototype.addToChunk = function ( chunk ) {
	return this._manageChunks( 'add', chunk );
};

/**
 * Remove this module as a child of a chunk (also removes the chunk from the module's chunks array)
 * @param chunk
 * @returns {boolean}
 */
Module.prototype.removeFromChunk = function ( chunk ) {
	return this._manageChunks( 'remove', chunk );
};

/**
 * Extract locale text from this module's json, and add it under the correct path (<locale>.<_key>) in the locales object
 * @param locales
 */
Module.prototype.extractLocales = function ( locales, shared_key ) {
	// get shared data
	let shared_data = shared_key && this._json[shared_key];

	for ( let locale in this._json ) {
		if ( locale !== shared_key && this._json.hasOwnProperty( locale ) ) {
			// create concat source for this locale if it doesn't exist
			if ( !locales[locale] ) {
				locales[locale] = new JSONConcatSource();
			}

			// add the locale data from this module to the concat source
			locales[locale].add( new JSONSource( this._json[locale], this._key ) );

			// add shared data (to each locale) if it exists
			if ( shared_data ) {
				locales[locale].addDefault( this._key, shared_data );
			}
		}
	}

	return locales;
};

/**
 * Manage chunks (add/remove)
 * @param {string} action
 * @param chunk
 * @returns {boolean}
 * @private
 */
Module.prototype._manageChunks = function ( action, chunk ) {
	var idx = this.chunks.indexOf( chunk ),
		result = false;

	switch ( action ) {
		case 'add':
			if ( idx < 0 ) {
				this.chunks.push( chunk );
				chunk.addModule( this );
				result = true;
			}
			break;
		case 'remove':
			if ( idx >= 0 ) {
				this.chunks.splice( idx, 1 );
				chunk.removeModule( this );
				result = true;
			}
			break;
	}

	return result;
}

Module.prototype.rewriteChunkInReasons = function ( oldChunk, newChunks ) {
};

Module.prototype.identifier = function () {
	return this._identifier;
};

Module.prototype.key = function () {
	return this._key;
};

Module.prototype.source = function () {
	return new RawSource( JSON.stringify( this._json ) );
};

Module.prototype.getOriginalModule = function () {
	return this._originalModule;
};

Module.prototype.setOriginalModule = function ( originalModule ) {
	this._originalModule = originalModule;
};

module.exports = Module;