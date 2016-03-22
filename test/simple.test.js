/********************************************************************************
 * (C) 2016 Wombat Security Technologies, Inc.
 * Description:	Simple test of the i18n extraction code
 * Author:		Jason R Brubaker
 * Date:        3/22/2016
 *******************************************************************************/

// require jquery
var $ = require( 'jquery' );

// retrieve fixtures
var units = [
	require( 'fixtures/unit1/text.i18n.json' ),
	require( 'fixtures/unit2/text.i18n.json' )
];


describe("i18n-webpack-plugin's basic feature set", function( ) {
	it( 'pulls all en-us text into a single file', function( done ) {
		$.ajax( 'en-us.i18n.json')
			.done( function( data ) {
				expect( data['fixtures/unit1.text']['foo'] ).to.equal( 'bar' );
				expect( data['fixtures/unit2.text']['hello'] ).to.equal( 'Hello, world!' );
				done();
			} );
	} );
});
