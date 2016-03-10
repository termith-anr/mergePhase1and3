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

var xmlJson = JSON.parse(fs.readFileSync("input.json", "utf8"));

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
        var sil = {};
        $('keywords[scheme="inist-francis"][xml\\:lang="fr"] term').each(function(index, element){
          sil[$(this).text()] = $(this).attr("xml:id");
        });

        Object.keys(grouped).forEach(function(methode,index){
          var xmlJsonC = JSON.parse(JSON.stringify(xmlJson));
          var nbMethod = (methode == "lina-1:notice:tfidf:sequences_nom_adj") ? 1 : 2;

          xmlJsonC["set"]["ns:stdf"]["xml:id"] = "mi" + nbMethod;
          xmlJsonC["set"]["ns:stdf"]["ns:soHeader"]["encodingDesc"]["appInfo"]["application"]["ident"] = methode;
          xmlJsonC["set"]["ns:stdf"]["ns:soHeader"]["encodingDesc"]["appInfo"]["application"]["label"]["$t"] = methode;

          // pour chaque méthode 
          Object.keys(grouped[methode]).forEach(function(type,index){
            var nn = (type === "Silence") ? "ikwfr" : "mi";

            // Pour chaque mot noté
            grouped[methode][type].forEach(function(val,i){

              var annGRPNb, xmlid;
              var comment = val.note ? val.note : null;

              // Si c'est pertinences , on doit dresser la liste des mot d'abord Puis leurs score
              if(type === "Pertinence"){
                xmlid = "mi" + nbMethod + "kw" + (i + 1);
                annGRPNb = 0;
                var obj = {
                  "xml:ns"  : "http://www.tbx.org", 
                  "xml:id" : xmlid, 
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
                xmlJsonC["set"]["ns:stdf"]["ns:annotations"]["termEntry"].push(obj);
              }
              else{
                xmlid = sil[val.motcle] ? sil[val.motcle] : "#NotFound" ;
                annGRPNb = 1;
              }
              var notedObj = {
                "from" : xmlid,
                "num" : {
                  "type" : "pertinence",
                  "$t" : val.score
                },
                "note" : comment,
                "link" : [] 
              };
              // Gestion preferredForm
              if(val.pref && (val.pref != "-")){
                for (var i = 0; i < grouped[methode][type].length; i++) {
                  if(grouped[methode][type][i].motcle == val.pref){
                    notedObj.link.push({"type" : "preferredForm" , "target" : "mi" + nbMethod + "kw" + (i+1) });
                  }
                };  
              }
              //Gestion Corresp
              if(val.corresp && (val.corresp != "-")){
                console.log("corresp : " , val.corresp);
                for (var i = 0; i < grouped[methode].Pertinence.length; i++) {
                  if(grouped[methode].Pertinence[i].motcle == val.corresp){
                    notedObj.link.push({"type" : "TermithForm" , "target" : "mi" + nbMethod + "kw" + (i+1) });
                    // Ajout lien retour pertinences
                    xmlJsonC["set"]["ns:stdf"]["ns:stdf"]["ns:annotations"]["ns:annotationGrp"][0]["span"][i].link.push({"type" : "INISTForm" , "target" : xmlid });
                  }
                };  
              }
              xmlJsonC["set"]["ns:stdf"]["ns:stdf"]["ns:annotations"]["ns:annotationGrp"][annGRPNb]["span"].push(notedObj);
            });
          });

          JBJ.render(xmlJsonC , function(err, out) {
            console.log(filename);
            console.log(out);
          });
          console.log("=====")
        });
      });

      //Go to next file
      next();
    },
    function(err, files){
        if (err) throw err;
    }
  );
});