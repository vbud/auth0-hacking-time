'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var requestOriginal = require('request');
//requestOriginal.debug = true;

/*
 how to commit a change to a file in the repo
 https://developer.github.com/v3/git/
 - get the current commit object
 - retrieve the tree it points to
 - retrieve the content of the blob object that tree has for that particular file path
 - change the content somehow and post a new blob object with that new content, getting a blob SHA back
 - post a new tree object with that file path pointer replaced with your new blob SHA getting a tree SHA back
 - create a new commit object with the current commit SHA as the parent and the new tree SHA, getting a commit SHA back
 - update the reference of your branch to point to the new commit SHA
 */

module.exports = function (ctx, cb) {

	var request = Promise.promisify(requestOriginal.defaults({
		headers: {
			'User-Agent': ctx.data.GITHUB_USER,
			'Authorization': 'token ' + ctx.data.GITHUB_TOKEN
		},
		json: true
	}));

	var filename = 'CHANGELOG.md';
	var branch = 'master';
	var changelog = ''; //changelog
	var currentCommit; //current commit

	//retrieve the content of the blob object for CHANGELOG.md
	//TODO: This assumes there is only one branch; it does not do the first two steps in the how-to block above. A production version of this would need to do that.
	request({
		uri: 'https://api.github.com/repos/vbud/auth0-hacking-time/contents/' + filename + '?ref=' + branch,
		headers: {
			'Accept': 'application/vnd.github.v3.raw'
		},
		json: false
	})
		.then(function (results) {
			changelog = results[1];

			//get the reference to HEAD
			return request({
				uri: 'https://api.github.com/repos/vbud/auth0-hacking-time/git/refs/heads/' + branch
			});
		})
		.then(function (results) {
			console.log('get ref to HEAD successful', results[1]);
			var ref = results[1];

			//get more information about the commit using its SHA
			return request({
				uri: 'https://api.github.com/repos/vbud/auth0-hacking-time/git/commits/' + ref.object.sha
			});
		})
		.then(function (results) {
			console.log('get HEAD commit info successful', results[1]);
			currentCommit = results[1];
			changelog = '- ' + currentCommit.message + '\n' + changelog;

			//post a blob with the new changelog
			return request({
				uri: 'https://api.github.com/repos/vbud/auth0-hacking-time/git/blobs',
				method: 'POST',
				body: {
					content: changelog,
					encoding: 'utf-8'
				}
			});
		})
		.then(function (results) {
			console.log('create changelog blob successful', results[1]);
			var blob = results[1];

			//create a tree for the new blob
			return request({
				uri: 'https://api.github.com/repos/vbud/auth0-hacking-time/git/trees',
				method: 'POST',
				body: {
					base_tree: currentCommit.tree.sha,
					tree: [{
						'path': filename,
						'mode': '100644',
						'type': 'blob',
						'sha': blob.sha
					}]
				}
			});

		})
		.then(function (results) {
			console.log('create new tree successful', results[1]);
			var tree = results[1];

			//create a commit pointing to the new tree
			return request({
				uri: 'https://api.github.com/repos/vbud/auth0-hacking-time/git/commits',
				method: 'POST',
				body: {
					message: 'WEBTASK: update changelog with most recent commit message',
					parents: [currentCommit.sha],
					tree: tree.sha
				}
			});
		})
		.then(function (results) {
			console.log('create commit pointing to new tree successful', results[1]);
			var commit = results[1];

			//update branch HEAD
			return request({
				uri: 'https://api.github.com/repos/vbud/auth0-hacking-time/git/refs/heads/' + branch,
				method: 'PATCH',
				body: {
					sha: commit.sha
				}
			});

		})
		.then(function (results) {
			console.log('update branch HEAD successful', results[1]);

			console.log('changelog updated successfully!');
			cb(null, changelog);
		})
		.catch(function (err) {
			//console.log(err);
			return cb(err);
		});

};
