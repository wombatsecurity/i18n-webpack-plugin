const { join }   = require( 'path' );
const i18nPlugin = require( '../index' );

// create a new i18nPlugin object
const i18n = new i18nPlugin( {
	shared_text_key: 'shared',
	root: 'example',
	// omits the `should-be-omitted-by-locales` locale
	locales: [ 'en-us', 'es-mx' ], // comment out this line to see default behavior
	getTextGen: function ( path, key ) {
		return `function ( ) { alert( window.getText( "${key}" ) ); }`;
	},
	keyFn: function ( relativePath ) {
		return relativePath.replace( /\//g, '-' ).replace( '.i18n', '' );
	}
} );

module.exports = {
	entry: join( __dirname, 'src', 'entry' ),

	resolve: {
		modules: [
			join( __dirname, 'src' ),
			'node_modules'
		],
		extensions: [ '.js' ]
	},

	module: {
		rules: [ {
			test: /\.i18n$/,
			use: i18n.loader( { root: 'example/src' } )
		} ]
	},

	plugins: [ i18n ],

	output: {
		path: join( __dirname, 'dist' ),
		filename: 'bundle.js'
	}
};
