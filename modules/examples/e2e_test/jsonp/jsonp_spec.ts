/// <reference path="../../../angular2/typings/jasmine/jasmine.d.ts" />

import {verifyNoBrowserErrors} from 'angular2/src/test_lib/e2e_util';

describe('jsonp', function() {

  afterEach(verifyNoBrowserErrors);

  describe('fetching', function() {
    var URL = 'examples/src/jsonp/index.html';

    it('should fetch and display people', function() {
      browser.get(URL);
      browser.sleep(200);
      expect(getComponentText('jsonp-app', '.people')).toEqual('hello, caitp');
    });
  });
});

function getComponentText(selector, innerSelector) {
  return browser.executeScript('return document.querySelector("' + selector + '").querySelector("' +
                               innerSelector + '").textContent.trim()');
}
