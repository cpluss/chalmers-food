var FeedParser = require('feedparser');
var request = require('request');
var express = require('express');

// Async promise
function process_feed(feed) {
    return new Promise(function(resolve, reject) {
        var req = request(feed.url);
        var feedparser = new FeedParser();

        var items = [];

        req.on('error', function(error) {
            console.log('Request error: ' + error);
            reject('Request error: ' + error);
        });

        req.on('response', function(res) {
            var stream = this;

            if (res.statusCode != 200) {
                return this.emit('error', new Error('Bad status code!'));
            }

            stream.pipe(feedparser);
        });

        feedparser.on('error', function(error) {
            console.log('Feedparser error: ' + error);
            reject('Feedparser error: ' + error);
        });

        feedparser.on('readable', function() {
            var stream = this;
            // var meta = this.meta;
            var item;

            while (item = stream.read()) {
                if (feed.only_include_parts && !item.title.startsWith(feed.only_include_parts)) {
                  continue;
                }

                var o = {
                    name: feed.name,
                    title: scrub(item.title),
                    descr: scrub(item.description)
                };

                items.push(o);
            }
        });

        feedparser.on('end', function() {
            if (items.length == 0) {
                items = [ { name: feed.name, title: 'Ingen mat idag', descr: '' } ];
            }
            resolve(items);
        });
    });
}

function scrub(text) {
    if (text !== null && text !== undefined && text.indexOf('@') > 1) {
        return text.substr(0, text.indexOf('@'));
    } else {
        return text;
    }
}

var app = express();

app.set('view engine', 'jade');
app.use(express.static('public'));

var feeds = [
    { name: 'Kåren', url: 'http://intern.chalmerskonferens.se/view/restaurant/karrestaurangen/Veckomeny.rss?today=true' },
    { name: 'Linsen', url: 'http://intern.chalmerskonferens.se/view/restaurant/linsen/RSS%20Feed.rss?today=true' },
    { name: 'Express', url: 'http://intern.chalmerskonferens.se/view/restaurant/express/V%C3%A4nster.rss?today=true' },
    { name: 'J.A. Pripps', url: 'http://intern.chalmerskonferens.se/view/restaurant/j-a-pripps-pub-cafe/RSS%20Feed.rss?today=true', only_include_parts: 'Kockens' }
];

app.get('/', function(_req, res) {
    var promises = feeds.map(process_feed);

    Promise.all(promises).then(function(items) {
        var out = '';

        var rss = items.map(function(rs) {
            return { name: rs[0].name,
                     vals: rs };
        });

        res.render('index', { rss: rss });
    });
});

app.get('/v1/food', function(_req, res) {
    var promises = feeds.map(process_feed);

    Promise.all(promises).then(function(a) {
        res.send(a);
    });
});

app.listen(9797, function() {
    console.log('Serving food at :9797');
});
