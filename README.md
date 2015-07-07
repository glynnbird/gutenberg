# Gutenberg - Offline-first Ebook Reader

## Introduction

This project is a demo of an [Offline First](http://offlinefirst.org/) web application that allows the user to:

* browse a library of Victorian fiction, imported from [Project Gutenberg](https://www.gutenberg.org/)
* choose which books you would like on your device and download them
* read each book, even when not connected to the internet

![screenshot](https://github.com/glynnbird/gutenberg/raw/master/img/screenshot.png "screenshot")

![mobile screenshot](https://github.com/glynnbird/gutenberg/raw/master/img/screenshot2.png "mobile screenshot")

## Demo

You can try it for yourself at [http://glynnbird.github.io/gutenberg/](http://glynnbird.github.io/gutenberg/).

## Architecture

This application is a simple web application using the following technologies

* [PouchDB](http://pouchdb.com/) to store data in the browser and replicate it from the cloud
* [Cloudant](https://cloudant.com/) to store data in the cloud
* [Bootstrap](http://getbootstrap.com/) for responsive HTML
* [jQuery](https://jquery.com/) for DOM manipulation

A publicly readable database, [ebooks](https://54a13c72-3351-4bb4-a93c-79a723b29443-bluemix.cloudant.com/ebooks/_all_docs?include_docs=true&limit=5), contains a list of the available books. The documents in the database look like this:

```
{
    "_id": "1023",
    "_rev": "1-e61d156a503cd4d9ae73debd9bc2b035",
    "url": "https://www.gutenberg.org/ebooks/1023",
    "title": "Bleak House",
    "author": "Charles Dickens",
    "year": 1853,
    "db_name": "ebook_1023",
    "download_url": "http://www.gutenberg.org/cache/epub/1023/pg1023.txt",
    "num_docs": 369
}
```

storing meta data about the book, and where it was downloaded from.

Separately, the text of each book is stored in a separate database - one per book. So "Bleak House"" is stored in the database [ebook_1023](https://54a13c72-3351-4bb4-a93c-79a723b29443-bluemix.cloudant.com/ebook_1023), with each document in that database containing around 20 paragraphs of text.

```
{
    "_id": "1005",
    "_rev": "1-ec2e18e806164bf900489c965a67da22",
    "txt": "Dinner was over, and my godmother and I were ...."
}
```

When the web app is first visited, the `ebooks` database is replicated to an in-browser copy using PouchDB:

```
var ebooksdb = new PouchDB("ebooks");
var stub = "https://54a13c72-3351-4bb4-a93c-79a723b29443-bluemix.cloudant.com";
ebooksdb.replicate.from(stub + "/ebooks");
```

When a used elects to download a book, that book's database is replicated to an in-browser copy in the same way:

```
  var db_name = "ebook_1023";
  var pdb = new PouchDB(db_name);  
  pdb.replicate.from(stub + "/" + db_name)
    .on('complete', function (info) {
      // re-render the ebook list
    })
    .on('change', function (info) {
      // update the progress bar
    })
```

## To do

* this isn't a true "offline first" app yet, because the html, js & css needed to render the page are not cached offline. 
* your place in the book is not stored yet


    
