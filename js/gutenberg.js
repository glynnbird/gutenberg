

var ebooksdb = new PouchDB("ebooks");
var ebooks = []
var stub = "https://54a13c72-3351-4bb4-a93c-79a723b29443-bluemix.cloudant.com"
var BY_TITLE = "BY_TITLE";
var BY_YEAR = "BY_YEAR";
var BY_AUTHOR = "BY_AUTHOR";
var BY_DEVICE = "BY_DEVICE";
var sortMethod = BY_TITLE;


var progressBar = function(p) {
  var html = '<div class="progress">';
  html += '<div class="progress-bar" role="progressbar" aria-valuenow="'+ p + '" aria-valuemin="0" aria-valuemax="100" style="width: ' + p + '%;">'+p+'%';
  html += '</div></div>';
  return html;
}
var download = function(db_name, num_docs) {
  console.log("Downloading",db_name, num_docs)
  $("#book_" + db_name + "_status").html(progressBar(0));
  var pdb = new PouchDB(db_name);  
  pdb.replicate.from(stub + "/" + db_name)
    .on('complete', function (info) {
      // handle complete
      renderEbooksList();
    })
    .on('change', function (info) {
      // handle change
      var p = Math.round(100 * info.docs_read/ num_docs);
      $("#book_" + db_name + "_status").html(progressBar(p));
      //console.log(info);
    })
};

var stopReading = function() {
  $('#thebook').html("");
  $('#thebook').hide();
  $('#readbar').hide();
  location.href = "#top";
  return false;
}

var read = function(db_name) {
  
  // show the book
  $('#thebook').show(); 
  
  // get book title
  var map = function(doc) {
    emit(doc.db_name,null);
  };
  ebooksdb.query(map, {key:db_name,include_docs:true}, function(err,data) {
    var d = data.rows[0].doc;
    $('#booktitle').html(d.title);
    $('#readbar').show();  
  });
  
  var pdb = new PouchDB(db_name);  
  $('#thebook').html("<p>");
  var x = 0;
  
  pdb.allDocs({include_docs:true}).then(function(data) {
    for(var i in data.rows) {
      var paras =  data.rows[i].doc.txt.split("\n");
      var html = "";
      for(var j in paras) {
        var p = paras[j];
        html += "<p>";
        if (p.match(/[a-z]/)) {
          html += p
        } else {
          html += '<a class="anchor" name="' + x++ +  '"></a>\n';
          html += "<h2>" + p + "</h2>";
        }
        html += "</p>";
      }
      $('#thebook').append(html);
      if (i==0) {
        location.href = "#thebook";
      }

    }
  });
};

var deleteEbook = function(db) {
  var db = new PouchDB(db);
  db.destroy(function(err, data) {
    renderEbooksList();
  });
};

var switchSort = function(m) {
  sortMethod = m;
  renderEbooksList();
}

var renderEbooksList = function() {
  var map = null;
  switch(sortMethod) {
    case BY_TITLE:
      map = function(doc) {
        var t = doc.title.replace(/^A /,"").replace(/^THE/,"");
        emit(t,null);
      };
      break;
    case BY_AUTHOR:
      map = function(doc) {
        var bits = doc.author.split(" ");
        var lastname = bits[bits.length-1];
        emit([lastname,doc.title],null);
      };
      break;
    case BY_YEAR:
      map = function(doc) {
        emit([doc.year, doc.title],null);
      };
      break;
    case BY_DEVICE:
      map = function(doc) {
        emit(doc.title,null);
      };
      break;
  }
  ebooksdb.query(map, {include_docs:true}, function(err,data) {
    var tasks = [];
    console.log(data);
    for(var i in data.rows) {
      (function(book){
        tasks.push(function(cb) {
          var pdb = new PouchDB(book.db_name);
          pdb.info(function(err, res) {
            book.on_device = (res.doc_count > 0)?true:false;
            cb(null, book);
          });
        });
      })(data.rows[i].doc);
    //  ebooks.push(data.rows[i].doc);
    }
    
    async.parallelLimit(tasks,5,function(err, data) {
      // final sort
      if (sortMethod == BY_DEVICE) {
        data.sort(function(a,b) {
          if(a.on_device==true && b.on_device==false) {
            return -1
          } if(a.on_device==false && b.on_device==true) {
            return 1
          } else {
            return 0;
          }
        })
      }

      
      
      var html = "";
      html += '<div class="row">';
      for(var i in data) {
        if(i>0 && i%6==0) {
          html += '</div><div class="row">';
        }
        var book = data[i];
        html += '<div class="col-md-2">';
        html += '<div class="alert alert-book">';
        html += '<h4 class="text-center">' + book.title  + '</h4>';
        html += '<p class="text-center">' + book.author + '</p>';
        html += '<p class="text-center">' + book.year + '</p>';
        html += '<span class="foot" id="book_' + book.db_name + '_status">';
        if (book.on_device) {
          html += '<a href="Javascript:read(\'' + book.db_name + '\')" title="Read">';
          html += '<span class="glyphicon glyphicon-play" aria-hidden="true"></span>';
          html += '</a>';  
          html += " &nbsp; &nbsp; &nbsp; "
          html += '<a href="Javascript:deleteEbook(\'' + book.db_name + '\')" title="Delete">';
          html += '<span class="glyphicon glyphicon-trash" aria-hidden="true"></span>';
          html += '</a>';  
        } else {
          html += '<a href="Javascript:download(\'' + book.db_name + '\',' + book.num_docs + ')" title="Download">';
          html += '<span class="glyphicon glyphicon-cloud-download" aria-hidden="true"></span>'; 
          html += '</a>';         
        }
        html += '</span>'
        html += '</div>';
        html += '</div>';

      }
      html += '</div>';
      $('#bookslist').html(html);
    })
    

  });
};

var clearout = function() {
  ebooksdb.allDocs( {include_docs:true}, function(err,data) {
    for(var i in data.rows) {
      var db = new PouchDB(data.rows[i].doc.db_name);
      db.destroy();
    }
    ebooksdb.destroy();
  });
  
}

$(function () {
    var currentHash = "#initial_hash"
    $(document).scroll(function () {
        $('.anchor').each(function () {
            var top = window.pageYOffset;
            var distance = top - $(this).offset().top;
            var hash = $(this).attr('name');
            // 30 is an arbitrary padding choice, 
            // if you want a precise check then use distance===0
            if (distance < 30 && distance > -30 && currentHash != hash) {
                window.location.hash = (hash);
                currentHash = hash;
            }
        });
    });
});

ebooksdb.replicate.from(stub + "/ebooks").
on("complete", function() {
  renderEbooksList();
});
renderEbooksList();

