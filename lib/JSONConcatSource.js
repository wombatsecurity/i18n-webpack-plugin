/********************************************************************************
 * (C) 2016 Wombat Security Technologies, Inc.
 * Description:    Concatenate multiple JSON sources
 * Author:        Jason R Brubaker
 * Date:        3/21/2016
 *******************************************************************************/
var _ = require( 'lodash' );
var Source = require( "webpack-sources" ).Source;

function JSONConcatSource() {
	Source.call( this );
	this.children = Array.prototype.slice.call( arguments );
	this.default = {};
}

JSONConcatSource.prototype = Object.create( Source.prototype );
JSONConcatSource.prototype.constructor = JSONConcatSource;

JSONConcatSource.prototype.addDefault = function ( key, text ) {
	this.default[key] = text;
};

JSONConcatSource.prototype.add = function ( item ) {
	this.children.push( item );
};

JSONConcatSource.prototype.source = function () {
	var combined = _.merge( {}, this.default );

	this.children.forEach( function ( item ) {
		var key = item.key();

		if (!combined[key]) {
			combined[key] = {};
		}

		_.merge( combined[key], item.json() );
	} );

	return JSON.stringify( combined );
};

JSONConcatSource.prototype.size = function () {
	return this.children.map( function ( item ) {
		return typeof item === "string" ? item.length : item.size();
	} ).reduce( function ( sum, s ) {
		return sum + s;
	}, 0 );
};

JSONConcatSource.prototype.updateHash = function ( hash ) {
	this.children.forEach( function ( item ) {
		item.updateHash( hash );
	} );
};


module.exports = JSONConcatSource;