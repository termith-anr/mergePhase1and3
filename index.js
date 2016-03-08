'use strict';

var cheerio = require('cheerio'),
	kuler = require("kuler"),
	args = require("args"),
	async = require("async"),
	argv = process.argv,
	fs = require('fs'),
	path = require('path');

/* ------------- */
/*  CLI OPTIONS  */
/* ------------- */
var options = args.Options.parse([
  {
    name: 'help',
    shortName: 'h',
    help: 'Get Help',
    defaultValue : null,
    type : "bool",
    required : false
  },
  {
    name: 'input',
    shortName: 'i',
    help: 'Input folder or XML PHASE 3 file',
    defaultValue : null,
    required : true
  },
  {
    name: 'csv',
    shortName: 'c',
    help: 'Input CSV PHASE 1 file',
    defaultValue : null,
    required : true
  }
]);

// Parse cli options
var parsed = args.parser(argv).parse(options);

/* ----------- */
/*  CHECK ARGS */
/* ----------- */

if(parsed.help){
  // Affichage aide
  console.info(options.getHelp());
  return;
}

if(!parsed.input){
  console.info(kuler("Please indicate XML PHASE 3 File/Folder , see help" , "red"));
  return;
}

if(!parsed.list){
  console.info(kuler("Please indicate CSV PHASE 1 file , see help" , "red"));
  return;
}

/* ------------- */
/* PATH 2 STRING */
/* ------------- */
parsed.input = (parsed.input).toString();
parsed.list = (parsed.list).toString();
