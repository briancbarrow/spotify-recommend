var unirest = require('unirest');
var express = require('express');
var events = require('events');
var app = express();
app.use(express.static('public'));

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

var getRelatedArtists = function(id) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/artists/' + id + '/related-artists/')
        .end(function(response) {
            if (response.ok) {
                emitter.emit('end', response.body);
            } else {
                emitter.emit('error', response.code);
            }
        });
    return emitter;
};

var getTopTracks = function(id) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/artists/' + id + '/top-tracks')
        .qs({country: 'US'})
        .end(function(response) {
            if (response.ok) {
                emitter.emit('end', response.body);
            } else {
                emitter.emit('error', response.code);
            }
        });
    return emitter;
};

app.get('/search/:name', function(req, res) {
    var searchReq = getFromApi('search', {
        q: req.params.name,
        limit: 1,
        type: 'artist'
    });

    searchReq.on('end', function(item) {
        var relatedComplete = false;
        var topComplete = false;
        var complete = 0;
        var count = 0;
        var checkComplete = function() {
            if (relatedComplete && topComplete) {
                res.json(artist);
            }
        };
        var checkTopComplete = function() {
            if (complete === count) {
                topComplete = true;
                checkComplete();
            }
        };
        var artist = item.artists.items[0];
        var id = artist.id;
        // var relatedReq = getFromApi('artists/' + id + '/related-artists/');
        var relatedReq = getRelatedArtists(id);
        relatedReq.on('end', function(item) {
            artist.related = item.artists;
            count = artist.related.length;
            artist.related.forEach(function(artist) {
                var relId = artist.id;
                var topReq = getTopTracks(relId);
                topReq.on('end', function(item) {
                    artist.tracks = item.tracks;
                    complete++;
                    checkTopComplete();
                });
                topReq.on('error', function(code) {
                    res.sendStatus(code);
                });
            });
            relatedComplete = true;
            checkComplete();
        });
        relatedReq.on('error', function(code) {
            res.sendStatus(code);
        });
    });

    searchReq.on('error', function(code) {
        res.sendStatus(code);
    });
    
    
});

app.listen(process.env.PORT || 8080);