'use strict';
const postsHandler = require('./posts-handler');
const util = require('./handler-util');

/**
 * ルーティングを行う
 * @param {object}} req 
 * @param {object} res 
 */
function route(req, res) {
  switch (req.url) {
    case '/posts':
      postsHandler.handle(req, res);
      break;
    case '/posts?delete=1':
      postsHandler.handleDelete(req, res);
      break;
    case '/logout':
      util.handleLogout(req, res);
      break;
    default:
      util.handleNotFound(req, res);
      break;
  }
}

module.exports = {
  route
};