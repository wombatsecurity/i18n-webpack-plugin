# i18n-webpack-plugin
This plugin uses its built-in loader to extract text from json files with locale-keyed text objects and exports them into the 
destination directory, collated by locale.

## Testing
Run `npm test` to do a test compilation in the "example" directory.

## Options

### root
Sets the root directory from which relative paths are computed. By default, the relative path from root to the file becomes the template's name (this is configurable via the keyFn option).

### file_name_pattern
Define a pattern for the exported text files. The default is `i18n/[locale].i18n`. The file_name_pattern includes a path relative to the root of the webpack export directory.

### shared_text_key
If supplied, this option will designate a special key in your JSON file to use as a shared text repository. Any text strings inside this object will be exported as part of _each_ locale.

### id
Use this option if you different text sources to go into different text export files. By default, this is an auto-incrementing value.

### getTextGen
This option should be passed a method that accepts two parameters (the relative path of the source file and the generated key) and returns a string which is a method that will return the text for that source file. You should supply your own way of loading the individual locale text files and then supply this method to return the values once loaded. The default is:
```javascript
  function defaultGetTextGenerator( path, key ) {
	  return "function ( ) { return window.getText(" + JSON.stringify( key ) + "); }";
  }
```

### keyFn
This option should be passed a method that accepts the relative path of the source file and outputs a key to uniquely identify the source file. The default is to simply return the path (including filename & extension).