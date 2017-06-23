var path = require( 'path' );
var i18nPlugin = require( '../index' );

// create a new i18nPlugin object
var i18n = new i18nPlugin( {
	shared_text_key: 'shared',
	root: 'example'
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
		],
	},

	plugins: [
		i18n
	],

	output: {
		path: path.join( __dirname, 'dest' ),
		filename: "bundle.js"
	}
};