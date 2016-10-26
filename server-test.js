var unirest = require('unirest');
var express = require('express');
var events = require('events');

var getFromApi = function(endpoint, args) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/' + endpoint)
           .qs(args)
           .end(function(response) {
                if (response.ok) {
                    emitter.emit('end', response.body);
                }
                else {
                    emitter.emit('error', response.code);
                }
            });
    return emitter;
};

var app = express();
app.use(express.static('public'));

app.get('/search/:name', function(req, res) {
    var searchReq = getFromApi('search', {
        q: req.params.name,
        limit: 1,
        type: 'artist'
    });

    searchReq.on('end', function(item) {
        var artist = item.artists.items[0];
        var id = artist.id;
        var artists = {};
        var relatedReq = getFromApi('/artists/' + id + '/related-artists', {});
        relatedReq.on('end', function(list) {
            artists = list.artists;
            res.json(artists);
        });
        // app.get('/artists/' + id + '/related-artists', function(req, res) {
        //     var relatedReq = getFromApi()
        // });
        res.json(artists);
    });

    searchReq.on('error', function(code) {
        res.sendStatus(code);
    });
});

app.listen(process.env.PORT || 8080);