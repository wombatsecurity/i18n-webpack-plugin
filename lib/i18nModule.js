// @ts-check
'use strict';

// dependencies
const JSONSource = require( './JSONSource' );
const JSONConcatSource = require( './JSONConcatSource' );
const { RawSource } = require( 'webpack-sources' );

// only needed for types
const Chunk        = require( 'webpack/lib/Chunk' );
const NormalModule = require( 'webpack/lib/NormalModule' );

/**
 * The Module class refers to a single required i18n asset.
 */
class I18nModule {
	/**
	 * Creates a new Module (for one i18n asset)
	 * @param {string} identifier
	 * @param {object} info
	 * @param {string} info.key
	 * @param {Object.<string, object>} info.json
	 * @param {NormalModule} originalModule
	 */
	constructor( identifier, info, originalModule ) {
		this._identifier = identifier;
		this._originalModule = originalModule;
		this._key = info.key;
		this._json = info.json;
		/** @type {Chunk[]} */
		this.chunks = [];
	}

	identifier() {
		return this._identifier;
	}

	key() {
		return this._key;
	}

	source() {
		return new RawSource( JSON.stringify( this._json ) );
	}
	
	getOriginalModule() {
		return this._originalModule;
	}
	
	setOriginalModule( originalModule ) {
		this._originalModule = originalModule;
	}

	/**
	 * Add this module to a chunk (also adds the chunk to the module's chunks array)
	 * @param {Chunk} chunk
	 */
	addToChunk( chunk ) {
		return this._manageChunks( 'add', chunk );
	}

	/**
	 * Remove this module as a child of a chunk (also removes the chunk from the module's chunks array)
	 * @param {Chunk} chunk
	 */
	removeChunk( chunk ) {
		return this._manageChunks( 'remove', chunk );
	}

	/**
	 * Manage chunks (add/remove)
	 * @param {string} action
	 * @param {Chunk} chunk
	 * @private
	 */
	_manageChunks( action, chunk ) {
		const idx = this.chunks.indexOf( chunk );
		let result = false;
	
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

	/**
	 * Extract locale text from this module's json, and add it under the correct path (<locale>.<_key>) in the locales object
	 * @param {Object.<string, JSONConcatSource>} locales
	 * @param {string} shared_key
	 */
	extractLocales( locales, shared_key ) {

		// get shared data
		const shared_data = shared_key && this._json[shared_key];
	
		for ( const locale in this._json ) {
			if ( locale !== shared_key && this._json.hasOwnProperty( locale ) ) {

				// create concat source for this locale if it doesn't exist
				if ( !locales[locale] ) locales[locale] = new JSONConcatSource();

				// add the locale data from this module to the concat source
				locales[locale].add( new JSONSource( this._json[locale], this._key ) );
	
				// add shared data (to each locale) if it exists
				if ( shared_data ) locales[locale].addDefault( this._key, shared_data );
			}
		}
	
		return locales;
	}
}

module.exports = I18nModule;
