'use strict';

var pug = require('pug');

var Cookies = require('cookies');

var util = require('./handler-util');

var Post = require('./post');

var trackingIdKey = 'tracking_id';

function handle(req, res) {
  var cookies = new Cookies(req, res);
  addTrackingCookie(cookies);

  switch (req.method) {
    case 'GET':
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
      });
      Post.findAll({
        order: [['id', 'DESC']]
      }).then(function (posts) {
        res.end(pug.renderFile('./views/posts.pug', {
          posts: posts,
          user: req.user
        }));
        console.info("\u95B2\u89A7\u3055\u308C\u307E\u3057\u305F: user: ".concat(req.user, ", ") + "trackinId: ".concat(cookies.get(trackingIdKey), ",") + "remoteAddress: ".concat(req.connection.remoteAddress, ", ") + "userAgent: ".concat(req.headers['user-agent'], " "));
      });
      break;

    case 'POST':
      var body = [];
      req.on('data', function (chunk) {
        body.push(chunk);
      }).on('end', function () {
        body = Buffer.concat(body).toString();
        var decoded = decodeURIComponent(body);
        var content = decoded.split('content=')[1];
        console.info('投稿されました: ' + content);
        Post.create({
          content: content,
          trackingCookie: cookies.get(trackingIdKey),
          postedBy: req.user
        }).then(function () {
          handleRedirectPosts(req, res);
        });
      });
      break;

    default:
      util.handleBadRequest(req, res);
      break;
  }
}

function handleDelete(req, res) {
  switch (req.method) {
    case 'POST':
      var body = [];
      req.on('data', function (chunk) {
        body.push(chunk);
      }).on('end', function () {
        body = Buffer.concat(body).toString();
        var decoded = decodeURIComponent(body);
        var id = decoded.split('id=')[1];
        Post.findByPk(id).then(function (post) {
          if (req.user === post.postedBy) {
            post.destroy().then(function () {
              console.info("\u524A\u9664\u3055\u308C\u307E\u3057\u305F: user: ".concat(req.user, ", ") + "remoteAddress: ".concat(req.connection.remoteAddress, ", ") + "userAgent: ".concat(req.headers['user-agent'], " "));
              handleRedirectPosts(req, res);
            });
          }
        });
      });
      break;

    default:
      util.handleBadRequest(req, res);
      break;
  }
}

function addTrackingCookie(cookies) {
  if (!cookies.get(trackingIdKey)) {
    var trackingId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    var tomorrow = new Date(new Date().getTime() + 1000 * 60 * 60 * 24);
    cookies.set(trackingIdKey, trackingId, {
      expires: tomorrow
    });
  }
}

function handleRedirectPosts(req, res) {
  res.writeHead(303, {
    'Location': '/posts'
  });
  res.end();
}

module.exports = {
  handle: handle,
  handleDelete: handleDelete
};