var request = require('request')
var base64 = require('base64-js')

module.exports = function (cb) {
  var options = {
    uri: 'https://api.github.com/repos/vbud/auth0-hacking-time/contents/CHANGELOG.md',
    method: 'GET',
    headers: {
      'User-Agent': 'vbud'
    }
  }
  request(options, function(err, response, body) {
    if(err) {
      return cb(null, err);
    }
    var body = JSON.parse(body);

    var contentByteArray = base64.toByteArray(body.content.replace('\n', ''));
    
    var content = '';
    Object.keys(contentByteArray).forEach(function(key) { content = content.concat(String.fromCharCode(contentByteArray[key])); })

    cb(null, content);
  })
}
