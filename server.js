var express = require("express");
var exphbs = require("express-handlebars");
var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));


// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/newsscraper";
mongoose.connect(MONGODB_URI, { useNewUrlParser: true });
mongoose.set('useCreateIndex', true)

// Handlebars
app.engine(
  "handlebars",
  exphbs({
    defaultLayout: "main"
  })
);
app.set("view engine", "handlebars");

// Routes
app.get("/", (req, res) => {
  res.render("home");
});

// A GET route for scraping the echoJS website
app.post("/scrape", function(req, res) {
  console.log("req body is", req.body)
  console.log("reqbody stringified is is", JSON.stringify(req.body))
  // First, we grab the body of the html with axios
  axios.get("https://thatdrop.com/upcoming-edm-events").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);
    // Now, we grab every h2 within an article tag, and do the following:
    $('.ai1ec-event').each(function(i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this).find('.ai1ec-event-title').contents();
      result.date = $(this).find('.ai1ec-event-time').text();
      result.image = $(this).find('img').attr('src');
      result.eventid = $(this).attr('class').slice(35,40);
      result.dataend = $(this).attr('data-end')
      console.log(result.eventid)

      // Create a new Article using the `result` object built from scraping
      if(!req.body.eventids || !req.body.eventids.includes(result.eventid)) {
        db.Article.create(result)
        .then(function(dbArticle) {
          // View the added result in the console
          res.end()
        })
        .catch(function(err) {
          // If an error occurred, log it
          console.log(err);
          res.end()
        })
      }
      else{
        res.end()
      }
    });
    // Send a message to the client
  });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // TODO: Finish the route so it grabs all of the articles
  db.Article.find({}).then(function(dbArticle) {
    res.json(dbArticle)
  })
});

// Route for displaying multiple notes
app.get("/api/notes/:id", function(req, res) {
  db.Note.find({_eventId:req.params.id})
  .then(function(data) {
    res.json(data)
  })
})


//Route for Adding Note

app.post("/api/notes", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function(dbNote) {

      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
// app.get("/articles/:id", function(req, res) {
//   db.Article.findOne({_id:req.params.id})
//   .populate("note")
//   .then(function(Note) {
//     res.json(Note)
//   })
  // TODO
  // ====
  // Finish the route so it finds one article using the req.params.id,
  // and run the populate method with "note",
  // then responds with the article with the note included
// });

// Route for saving/updating an Article's associated Note
// app.post("/articles/:id", function(req, res) {
  // TODO
  // ====
  // save the new note that gets posted to the Notes collection
  // then find an article from the req.params.id
  // and update it's "note" property with the _id of the new note
// });

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
