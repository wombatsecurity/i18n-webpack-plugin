// @ts-check
'use-strict';

// dependencies
const _          = require( 'lodash' );
const { Source } = require( 'webpack-sources' );

class JSONConcatSource extends Source {
	constructor() {
		super();
		this.children = Array.prototype.slice.call( arguments );
		this.default = {};
	}

	add( item ) {
		this.children.push( item );
	}

	addDefault( key, text ) {
		this.default[key] = text;
	}

	size() {
		return this.children
			.map(    ( item )   => typeof item === "string" ? item.length : item.size() )
			.reduce( ( sum, s ) => sum + s, 0 );
	}

	source() {
		const combined = _.merge( {}, this.default );
	
		this.children.forEach( ( item ) => {
			const key = item.key();
	
			if (!combined[key]) combined[key] = {};
	
			_.merge( combined[key], item.json() );
		} );
	
		return JSON.stringify( combined );
	};

	updateHash( hash ) {
		this.children.forEach( ( item ) => {
			item.updateHash( hash );
		} );
	}
}

module.exports = JSONConcatSource;
