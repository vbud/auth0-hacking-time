'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var requestOriginal = require('request');
//requestOriginal.debug = true;
var base64 = require('base64-js');

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
			'User-Agent': ctx.data.githubUser,
			'Authorization': 'token ' + ctx.data.githubToken
		}
	}));

	var changelog = ''; //changelog
	var currentCommit; //current commit

	//retrieve the content of the blob object for CHANGELOG.md
	//TODO: This assumes there is only one branch; it does not do the first two steps in the how-to block above. A production version of this would need to do that.
	request({uri: 'https://api.github.com/repos/vbud/auth0-hacking-time/contents/CHANGELOG.md'})
		.then(function (results) {
			var content = JSON.parse(results[1]).content;

			var changelogByteArray = base64.toByteArray(content.replace('\n', ''));

			Object.keys(changelogByteArray).forEach(function (key) {
				changelog = changelog.concat(String.fromCharCode(changelogByteArray[key]));
			});

			//get the most recent commit message
			return request({uri: 'https://api.github.com/repos/vbud/auth0-hacking-time/commits'});
		})
		.then(function (results) {
			var commits = JSON.parse(results[1]);
			commits.sort(function (a, b) {
				a = new Date(a.commit.author.date);
				b = new Date(b.commit.author.date);
				if (a > b) {
					return 1;
				} else if (a < b) {
					return -1;
				}
				return 0;
			});
			currentCommit = commits[0];
			changelog = '- ' + currentCommit.commit.message + '\n' + changelog;

			//post a blob with the new changelog
			return request({
				uri: 'https://api.github.com/repos/vbud/auth0-hacking-time/git/blobs',
				method: 'POST',
				json: true,
				body: {
					content: changelog,
					encoding: 'utf-8'
				}
			});
		})
		.then(function (results) {
			console.log(results[1])

			cb(null, changelog);
		})
		.catch(function (err) {
			console.error(err);
			return cb(null, err);
		});

};
