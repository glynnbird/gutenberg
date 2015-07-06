var linereader = require('line-reader'),
  http = require('http'),
  fs = require('fs'),
  async = require('async'),
  argv = require('minimist')(process.argv.slice(2)),
  cloudant = require('cloudant')(process.env.COUCH_URL || "http://127.0.0.1:5984");

if(!argv.title || !argv.author || !argv.year || !argv.id) {
  console.error("Mandatory command-line parameters:");
  console.error("  -title : the book's title");
  console.error("  -author : the book's author");
  console.error("  -year : the year of publication");
  console.error("  -id : the Project Gutenberg book id")
  process.exit();
}
var meta = {
  _id: "" + argv.id,
  url: "https://www.gutenberg.org/ebooks/" + argv.id,
  title: argv.title,
  author: argv.author,
  year: parseInt(argv.year),
  db_name: "ebook_" + argv.id,
  download_url: "http://www.gutenberg.org/cache/epub/" + argv.id + "/pg" + argv.id + ".txt",
  num_docs: 0
};






var download = function(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = http.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);
    });
  });
};


var db = null,
  dl = 0,
  paras = [],
  filename = "./tmp/" + meta._id + ".txt";


async.series([
  
  // delete book database
  function(cb) {
    console.log("Deleting any pre-existing database for this ebook");
    cloudant.db.destroy(meta.db_name, function(err, data) {
      cb(null,null);
    });
  },
  
  // create and use book database
  function(cb) {
    console.log("Creating new database for this ebook");
    cloudant.db.create(meta.db_name, function(err, data) {
      db = cloudant.db.use(meta.db_name);
      cb(null,null);
    });
  },
  
  // download the book text
  function(cb) {
    console.log("Downloading ebook text");
    fs.exists(filename, function (exists) {
      if (!exists) {
        download(meta.download_url, filename, function() {
          cb(null,null);
        });
      } else {
        cb(null, null);
      }
    });
  },
  
  // create document per paragraph
  function(cb) {
    console.log("Creating paragraphs");
    var para = "";

    linereader.eachLine(filename, function(line, last) {
      line = line.replace("\r","");
      if (line.length == 0 && para.length>0) {
        paras.push(para);
        para = "";
      } else {
        if (para.length>0) {
          para += " ";
        }
        para += line;
      }
      if (last) {
        if(paras.length == 0) {
          console.log("ERROR! Empty file", meta);
          process.exit();
        }
        cb(null,null);
      }
    });
  },
  
  // save the data
  function(cb) {
    console.log("Wrting data in bulk");
    
    var p = 1000;
    var docs = [];
    var txt = "";
    for(var i in paras) {
      txt += paras[i] + "\n";
      if(i!=0 && i%20==0 || i == paras.length - 1) {
        var obj = {
          _id : "" + p++,
          txt: txt
        };                
        docs.push(obj);
        txt = ""
      }
    }
    db.bulk({docs: docs}, function(err, data) {
      console.log("Saved",paras.length, "paragraphs in",docs.length,"documents");
      dl = docs.length;
      cb(null,null);
    })
  },
  
  // setting the security object for this datbase
  function(cb) {
    console.log("Making the database readable");
    var obj = { };
    obj.nobody = ["_reader","_replicator"];
    db.set_security(obj, function(err,data) {
      console.log(data);
      cb(null,null);
    });
  },
  
  // create meta data
  function(cb) {
    console.log("Creating new meta data");
    meta.num_docs = dl;
    console.log(meta);
    cloudant.db.create("ebooks", function(err, data) {
      var ebooksdb = cloudant.db.use("ebooks");
      ebooksdb.insert(meta, function(err, data) {
        cb(null, null);
      });
    });
  }
  
], function() {
  console.log("done");
  process.exit();
});



