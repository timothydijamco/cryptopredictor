var request = require('request');
var Twitter = require('twitter');
var RedditApi = require('reddit-oauth');

/*
   Twitter API
*/
var client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

var retweetWeight = 1.5;
var favoriteWeight = 1.0;

client.get('search/tweets', {
   q: "buy ethereum",
   count: 100,
   result_type: "popular"
}, function(error, tweets, response) {
   var statuses = tweets.statuses;

   var scores = [];
   for (var i = 0; i < statuses.length; i++) {
      console.log("Retweets: " + statuses[i].retweet_count + " Favorites: " + statuses[i].favorite_count);
      var score = (statuses[i].retweet_count)*retweetWeight + (statuses[i].favorite_count)*favoriteWeight;
      scores.push(score);
   }
   console.log(scores);
});


/*
   Reddit API
*/
var reddit = new RedditApi({
    app_id: process.env.REDDIT_APP_ID,
    app_secret: process.env.REDDIT_APP_SECRET,
    redirect_uri: 'http://127.0.0.1:7717/authorize_callback'
});

reddit.passAuth(
   process.env.REDDIT_USERNAME,
   process.env.REDDIT_PASSWORD,
   function (success) {
      if (success) {
         console.log(reddit.access_token);

         reddit.get(
            '/r/ethtrader/new',
            {},
            function (error, response, body) {
               body = JSON.parse(body);
               var children = body.data.children;
               for (var i = 0; i < children.length; i++) {
                  console.log("Title: " + children[i].data.title + " Score: " + children[i].data.score)
               }
            }
         );

      }
   }
)
