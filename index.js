/* eslint-disable eqeqeq */
const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 4000

const cors = require("cors");
const axios = require("axios");
const jsdom = require("jsdom");
const yaml = require("yaml");

const url = (packageName) => "https://pub.dartlang.org/packages/" + packageName;

function parseData(html){
  console.log("parseData called");
    const {JSDOM} = jsdom;
    const dom = new JSDOM(html);
    const $ = (require('jquery'))(dom.window);
    var data = $("h2.title");
    console.log("should return " + $(data[0]).text().split(" ")[1]);
    return $(data[0]).text().split(" ")[1];
}

function getPackageVersion(packageName, oVersion) {
    return axios.get(url(packageName)).then((result) => {
        // console.log("Result is:\n");
        // console.log(result);
        // console.log("\n\n\n");
        return {
            name: packageName,
            oldVersion: oVersion,
            version: parseData(result.data)
        };
    }).catch((err) => ({
      error: err,
      name: packageName
    }));
}
function getPackagesVersions(packages) {
    req = [];
    let names = Object.keys(packages);
    console.log("names are");
    console.log(JSON.stringify(names));
    for(var i = 0; i < names.length; i++) {
        var key = names[i], value = packages[key];
        if(key == "flutter") continue;
        // console.log(i + " -> " + key + ", " + value);
        req.push(getPackageVersion(key, value));
    }
    // eslint-disable-next-line promise/catch-or-return
    return Promise.all(req).then((data) => {
        dep = {};
        upgrades = [];
        for(var i = 0; i < data.length; i++) {
          if("error" in data[i]) {
            console.error("Error in getting package " + data[i].name + ": ");
            console.error(data[i].error);
            throw Error("Error in getting package " + data[i].name + ": " + data[i].error);
            }
          var v = "^" + data[i].version;
            dep[data[i].name] = data[i].version != data[i].oldVersion ? "<b>" + v + "</b>" : v;
            upgrades.push(data[i].name + ": " + data[i].oldVersion + " -> ^" + data[i].version);
        }
        console.log(yaml.stringify({ dependencies: dep }));
        console.log("\nupgrades:");
        for(i = 0; i < upgrades.length; i++) {
            console.log(upgrades[i]);
        }
        return { "dependencies": dep, "upgrades": upgrades };
    }).catch((err) => err);
}

function parseYaml(y) {
    let obj = yaml.parse(y);
    if('dependencies' in obj) {
        return getPackagesVersions(obj['dependencies']);
    } else return getPackagesVersions(obj);
}
const bodyParser = require("body-parser");

const app = express()
  .use(cors({origin: true}))
  .use(express.static(path.join(__dirname, 'public')))
  // .use(bodyParser.urlencoded({extended: false}))
  // .use(bodyParser.text())
  .use(bodyParser.urlencoded({extended: false}))
  .get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')))
  .post('/p', (request, response) => {
    try {
      console.log("request is ");
      console.log(request);
      console.log("\n\n\nbody is");
      console.log(request.body.src);
      console.log("\n\n\n");
      // response.send("is this thing even working??");
      parseYaml(request.body.src).then((data) => {
        response.json(data);
        console.log("data is\n");
        console.log(data);
        return data;
      }).catch((e) => response.send(e));
    } catch(e) {
      response.send(e);
    }
  }).listen(PORT, () => console.log(`Listening on ${ PORT }`))

// exports.app = functions.https.onRequest(app);