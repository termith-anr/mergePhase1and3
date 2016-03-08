'use strict';

var cheerio = require('cheerio'),
	kuler = require("kuler"),
	args = require("args"),
	async = require("async"),
	argv = process.argv,
	fs = require('fs'),
  dir = require('node-dir'),
  JBJ = require('jbj'),
	path = require('path');

JBJ.use(require('jbj-parse'));
JBJ.use(require('jbj-array'));

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

if(!parsed.csv){
  console.info(kuler("Please indicate CSV PHASE 1 file , see help" , "red"));
  return;
}

if(!parsed.input){
  console.info(kuler("Please indicate XML PHASE 3 File/Folder , see help" , "red"));
  return;
}


/* ------------- */
/* PATH 2 STRING */
/* ------------- */
parsed.input = (parsed.input).toString();
parsed.csv = (parsed.csv).toString();

/* --------------------*/
/*  Load CSV FILE      */
/* --------------------*/

var stylesheet = {
  "$?" : "file://" + parsed.csv ,
  "parseCSVFile": ";",
  "arrays2objects": ["nom", "titre", "methode" , "evaluation" , "motcle" , "score", "pref" , "corresp" , "note"]
};

JBJ.render(stylesheet, function(err, out) {
  var csvFile = out;
  // console.log(out);
  // Pour chaque fichier XML du dossier
  dir.readFiles(parsed.input,
    {
      match: /.xml$/,
      exclude: /^\./
    },
    // For each document
    function(err, content, filename ,next) {
      if (err) throw err;

      // Select all root objects that match nom : filename
      var stylesheet2 = {
        set : csvFile,
        select : ':has(:root > .nom:val("'+ path.basename(filename) +'"))'
      };

      JBJ.render(stylesheet2, function(err, out) {
        console.log("For file  :" , filename , " out : " , out);
      });

      // console.log("fn : " , path.basename(filename));

      //Go to next file
      next();
    },
    function(err, files){
        if (err) throw err;
        // console.log('finished reading files:', files);
    }
  );
});

