var path = require( 'path' );
var i18nPlugin = require( '../index' );

// create a new i18nPlugin object
var i18n = new i18nPlugin( {
	shared_text_key: 'shared',
	root: 'example',
	getTextGen: function ( path, key ) {
		return "function ( ) { alert( window.getText(" + JSON.stringify( key ) + ") ); }";
	},
	keyFn: function ( relativePath ) {
		return relativePath.replace( /\//g, '-' ).replace( '.i18n', '' );
	}
} );

module.exports = {
	entry: './example/src/entry.js',

	resolve: {
		modules: [
			path.join( __dirname, 'src' ),
			'node_modules'
		],
		extensions: ['.js']
	},

	module: {
		rules: [
			{
				test: /\.i18n$/,
				use: i18n.loader( {
					root: 'example/src'
				} )
			}
		]
	},

	plugins: [
		i18n
	],

	output: {
		path: path.join( __dirname, 'dest' ),
		filename: "bundle.js"
	}
};