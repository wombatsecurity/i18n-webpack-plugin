/********************************************************************************
 * (C) 2016 Wombat Security Technologies, Inc.
 * Description:    Type of Source for webpack that has its information stored in JSON
 * Author:        Jason R Brubaker
 * Date:        3/22/2016
 *******************************************************************************/

var Source = require( "webpack-sources" ).Source;

/**
 * An object for holding the value of a source of JSON
 * @param value
 * @param key
 * @constructor
 */
function JSONSource( value, key ) {
	Source.call( this );
	this._key = key;
	this._value = JSON.stringify( value );
	this._json = value;
}

JSONSource.prototype = Object.create( Source.prototype );
JSONSource.prototype.constructor = JSONSource;

JSONSource.prototype.source = function () {
	return this._value;
};

JSONSource.prototype.json = function() {
	return this._json;
}

JSONSource.prototype.key = function() {
	return this._key;
}

JSONSource.prototype.updateHash = function ( hash ) {
	hash.update( this._value );
};

module.exports = JSONSource;