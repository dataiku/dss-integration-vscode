//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';
import { canEditWebApp } from '../api/utils';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as vscode from 'vscode';
// import * as myExtension from '../extension';

// Defines a Mocha test suite to group tests of similar kind together
suite("dss version tests", function () {

    // Defines a Mocha unit test
    test("canEditWebapp tests", function() {
        assert.equal(canEditWebApp("5.1.4"), true);
        assert.equal(canEditWebApp("5.2.4"), true);
        assert.equal(canEditWebApp("5.0.4"), false);
        assert.equal(canEditWebApp("5.1.3"), false);
        assert.equal(canEditWebApp("10.10.4"), true);
        assert.equal(canEditWebApp("4.1.4"), false);
    });
});