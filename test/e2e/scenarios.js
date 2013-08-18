/**
 * Created by: Terrence C. Watson
 * Date: 8/18/13
 * Time: 9:51 AM
 */

var util = require('util');
var webdriver = require('selenium-webdriver');
var protractor = require('protractor');
describe("constitution explorer", function(){
    var driver = new webdriver.Builder().
        usingServer('http://localhost:4444/wd/hub').
        withCapabilities(webdriver.Capabilities.chrome()).build();

    driver.manage().timeouts().setScriptTimeout(10000);
    var ptor = protractor.wrapDriver(driver);

    //var ptor = protractor.wrapDriver(webdriver);
    //console.log(ptor);
    describe("basic test", function(){
        ptor.get('http://localhost:5000');
        console.log(protractor.By);
        var header = ptor.findElement(protractor.By.class("h3"));
    })
})