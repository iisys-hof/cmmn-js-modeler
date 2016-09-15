# cmmn-js modeler

## About
This is a fully usable implementation of a CMMN modeler using cmmn-js and further modules from [bpmn.io](https://github.com/bpmn-io). This modeler has a properties panel and has a integration with Camunda BPM to load and upload cases from and to the bpm engine.

This modeler is part of the project [Social Collaboration Hub](https://www.sc-hub.de).

## Install
* Download or clone this git repository.
* You need npm. Get it here: https://nodejs.org/en/download/
* Install grunt and grunt-cli (globally)
```
npm install -g grunt grunt-cli
```
* Go to the root of the project and install
```
npm install
```

## Run
In project root:
```
grunt auto-build
```

## Development
For production this app uses uglify to create a minified app.js. But if you use `grunt auto-build` and want to see live-changes, you have to load `<script src="./app.js"></script>` in app/index.html. Why? Because our grunt watcher doesn't use uglify for speed reasons. If you want to use uglify when auto-building, just add it in your Gruntfile (look for `watch`).

**Production environment**:

Don't forget to change the script src back in your app/index.html to use the minified version:
```
<script src="./app.min.js"></script>
```

## Modules we use
* [bpmn-js](https://github.com/bpmn-io/bpmn-js)
* [cmmn-js](https://github.com/bpmn-io/cmmn-js)
* [cmmn-js-properties-panel](https://github.com/bpmn-io/cmmn-js-properties-panel)
* [diagram-js](https://github.com/bpmn-io/diagram-js)
* [cmmn-moddle](https://github.com/bpmn-io/cmmn-moddle)

## Update these Modules
* Find outdated modules:
```
npm outdated
```
* Change the versions in `package.json` to the new ones.
* Update versions (as administrator):
```
npm install
```
* Check everything. (even CSS classes)
