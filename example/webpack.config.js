var path = require( 'path' );
var i18nPlugin = require( '../index' );

module.exports = {
	resolve: {
		root: path.join( __dirname, 'test' ),
		extensions: ['', '.webpack.js', '.web.js', '.js', '.i18n.json'],
	},

	module: {
		loaders: [
			{
				test: /\.i18n\.json$/,
				loader: i18nPlugin.loader( )
			}
		]
	},
	
	plugins: [
		new i18nPlugin( )
	],
	
	'i18n-webpack-plugin-loader': {
		root: 'example/src'
	},
	
	entry: './example/src/entry.js',
	output: {
		path: path.join( __dirname, 'dest' ),
		filename: "bundle.js"
	}
};