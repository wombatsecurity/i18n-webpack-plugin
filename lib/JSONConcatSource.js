/********************************************************************************
 * (C) 2016 Wombat Security Technologies, Inc.
 * Description:    Concatenate multiple JSON sources
 * Author:        Jason R Brubaker
 * Date:        3/21/2016
 *******************************************************************************/

var Source = require( "webpack-sources" ).Source;

function JSONConcatSource() {
	Source.call( this );
	this.children = Array.prototype.slice.call( arguments );
}

JSONConcatSource.prototype = Object.create( Source.prototype );
JSONConcatSource.prototype.constructor = JSONConcatSource;

JSONConcatSource.prototype.add = function ( item ) {
	this.children.push( item );
};

JSONConcatSource.prototype.source = function () {
	var combined = {};

	this.children.forEach( function ( item ) {
		combined[item.key()] = item.json();
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