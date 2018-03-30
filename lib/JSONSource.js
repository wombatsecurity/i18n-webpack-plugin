// @ts-check
'use-strict';

// dependencies
const { Source } = require( 'webpack-sources' );

/**
 * An object for holding the value of a source of JSON
 */
class JSONSource extends Source {
	constructor( value, key ) {
		super();
		this._key = key;
		this._value = JSON.stringify( value );
		this._json = value;
	}

	source() {
		return this._value;
	}
	
	json() {
		return this._json;
	}
	
	key() {
		return this._key;
	}
	
	updateHash( hash ) {
		hash.update( this._value );
	}
}

module.exports = JSONSource;
