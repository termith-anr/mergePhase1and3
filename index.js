'use strict';

var cheerio = require('cheerio'),
	kuler = require("kuler"),
	args = require("args"),
	async = require("async"),
	argv = process.argv,
	fs = require('fs'),
  dir = require('node-dir'),
  groupArray = require('group-array'),
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

// Lecture du fichier CSV
JBJ.render(stylesheet, function(err, out) {
  var csvFile = out;
  // Pour chaque fichier XML (non caché) du dossier
  dir.readFiles(parsed.input,
    {
      match: /.xml$/,
      exclude: /^\./
    },
    function(err, content, filename ,next) {
      if (err) throw err;

      // Select all root objects that match nom : filename
      var stylesheet2 = {
        set : csvFile,
        select : ':has(:root > .nom:val("'+ path.basename(filename) +'"))'
      };
      // > return array of Objects
      JBJ.render(stylesheet2, function(err, out) {
        var grouped = groupArray(out, "methode" , "evaluation");

        // Chargement du fichier XML par cheerio
        var $ = cheerio.load(content, {normalizeWhitespace: true,xmlMode: true});

        // Pointe la premiere méthode
        var stylesheet3 = {
          "set" : {
            "ns:annotations" : {
              "termEntry" : []
            }
          },
          "xml" : {
            "indent": false
          }
          
        };

        // console.log("grouped : " ,grouped);
        // Pointe la premiere méthode
        grouped["lina-1:notice:tfidf:sequences_nom_adj"]["Pertinence"].forEach(function(val,i){
          var obj = {
              "xml:ns"  : "http://www.tbx.org", 
              "xml:id" : "mi1kw" + (i+1), 
              "langSet" : {
                "xml:lang" : "fr",
                "tig" : {
                  "term" : {
                    "xml:ns" : "http://www.tei-c.org/ns/1.0",
                    "$t" : val.motcle
                  }
                }
              }
            };
          stylesheet3["set"]["ns:annotations"]["termEntry"].push(obj);
        });

        // var stylesheet3 = {
        //   "ns:annotations" : {
        //     "termEntry" : [
        //       {"xml:ns"  : "http://www.tbx.org", 
        //         "xml:id" : "123", 
        //         "langSet" : {
        //           "xml:lang" : "fr",
        //           "tig" : {
        //             "term" : {
        //               "xml:ns" : "http://www.tei-c.org/ns/1.0",
        //               "$t" : "professionnel"
        //             }
        //           }
        //         }
        //       }
        //     ]
        //   }
        // };

        JBJ.render(stylesheet3 , function(err, out) {
          console.log(out.toString());
        });
        console.log("=====")

        
      });

      //Go to next file
      next();
    },
    function(err, files){
        if (err) throw err;
    }
  );
});

