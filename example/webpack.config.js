var path = require( 'path' );
var i18nPlugin = require( '../index' );

// create a new i18nPlugin object
var i18n = new i18nPlugin( {
	shared_text_key: 'shared',
	root: 'example'
} );

module.exports = {
	resolve: {
		root: path.join( __dirname, 'test' ),
		extensions: ['', '.webpack.js', '.web.js', '.js', '.i18n.json'],
	},

	module: {
		loaders: [
			{
				test: /\.i18n\.json$/,
				loader: i18n.loader()
			}
		]
	},

	plugins: [
		i18n
	],

	entry: './example/src/entry.js',
	output: {
		path: path.join( __dirname, 'dest' ),
		filename: "bundle.js"
	},

	i18nRootPath: 'example/src'
};