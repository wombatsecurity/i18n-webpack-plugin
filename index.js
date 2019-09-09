// @ts-check
'use strict';

// node builtin
const { realpathSync } = require( 'fs' );

// package dependencies
const _ = require( 'lodash' );

// local dependencies
const Loader = require.resolve( './loader' );

// package-level variables
const NS = realpathSync( __dirname );
let nextId = 0;

module.exports = class I18nPlugin {
	/**
	 * @param {Object} options
	 * @param {string} options.file_name_pattern
	 * @param {string} options.root
	 * @param {string} options.shared_text_key
	 * @param {string[]} [options.locales]
	 * @param {Function} options.getTextGen
	 * @param {Function} options.keyFn
	 * @param {string} [options.id]
	 */
	constructor( options ) {
		this.options = Object.assign( {
			root: process.cwd(),
			file_name_pattern: 'i18n/[locale].i18n',
			shared_text_key: null,
			id: nextId++
		}, options );

		this.id = options.id;
	}

	/**
	 * Main plugin method
	 * @param {import('webpack/lib/Compiler').default} compiler
	 */
	apply( compiler ) {
		const { options } = this;

		// Attach to a compilation to modify stuff
		compiler.hooks.thisCompilation.tap(
			I18nPlugin.name,

			/** @param {import('webpack/lib/Compilation').default} compilation */
			( compilation ) => {
				const textByLocale = {};

				// Attach to the normal-module-loader (runs before specific loaders)
				compilation.hooks.normalModuleLoader.tap(
					I18nPlugin.name,

					/** @param {import('webpack/lib/NormalModule').default} module */
					( loaderContext, module ) => {
						// Set up a namespace for the plugin on the loaderContext.
						loaderContext[NS] = {
							/**
							 * Function which loader uses to populate the text cache
							 * @param {string} key
							 * @param {{ [locale: string]: object }} text
							 */
							setPluginContent( key, text ) {
								const sharedText = text[options.shared_text_key] || {};

								_.forEach( text, ( localeText, locale ) => {
									if ( locale === options.shared_text_key ) {
										return;
									}

									if ( options.locales && !options.locales.includes( locale ) ) {
										return;
									}

									// If there isn't already text for this locale, initialize to an empty object
									textByLocale[locale] = textByLocale[locale] || {};

									// Set text for this locale/key
									textByLocale[locale][key] = _.merge( {}, sharedText, localeText );
								} );
							}
						};
					}
				);

				// Add the output files as additional assets
				compilation.hooks.additionalAssets.tap(
					I18nPlugin.name,
					() => {
						_.forEach( textByLocale, ( text, locale ) => {
							const file = compilation.getPath( options.file_name_pattern ).replace( '[locale]', locale );
							const source = JSON.stringify( text );

							compilation.assets[file] = {
								source: () => source,
								size: () => source.length
							};
						} );
					}
				);
			}
		);
	}

	/**
	 * Static method to retrieve loader
	 */
	static loader( options ) {
		return { loader: Loader, options: options };
	}

	/**
	 * Instance method to retrieve a loader for this specific plugin instance (copies options)
	 */
	loader( options ) {
		return I18nPlugin.loader( Object.assign( { id: this.id }, this.options, options ) );
	}
};
