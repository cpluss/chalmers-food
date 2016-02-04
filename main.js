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
                var o = {
                    name: feed.name,
                    title: scrub(item.title),
                    descr: scrub(item.description)
                };

                items.push(o);
            }
        });

        feedparser.on('end', function() {
            resolve(items);
        });
    });
}

function scrub(text) {
    if (text.indexOf('@') > 1) {
        return text.substr(0, text.indexOf('@'));
    } else {
        return text;
    }
}

var app = express();

var feeds = [
    { name: 'Kåren', url: 'http://intern.chalmerskonferens.se/view/restaurant/karrestaurangen/Veckomeny.rss?today=true' },
    { name: 'Linsen', url: 'http://intern.chalmerskonferens.se/view/restaurant/linsen/RSS%20Feed.rss?today=true' },
    { name: 'Express', url: 'http://intern.chalmerskonferens.se/view/restaurant/express/V%C3%A4nster.rss?today=true' }
];

app.get('/', function(_req, res) {
    var promises = feeds.map(process_feed);

    Promise.all(promises).then(function(items) {
        var out = '';

        items.forEach(function(rs) {
            out += '<h2>' + rs[0].name + '</h2>';

            rs.forEach(function(r) {
                out += '<h4>' + r.title + '</h4>';
                out += '<p>' + r.descr + '</p>';
            });
        });

        res.send(out);
    });
});

app.get('/v1/food', function(_req, res) {
    var promises = feeds.map(process_feed);

    Promise.all(promises).then(function(a) {
        res.send(a);
    });
});

app.listen(3000, function() {
    console.log('Serving food at :3000');
});
