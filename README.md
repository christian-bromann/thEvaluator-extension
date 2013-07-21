thEvaluator-extension
=====================

chrome extension of thEvaluator project.

Deployment
----------

First, download all dependencies via

```
$ npm install grunt -g    // if not already installed
$ npm install
```

Define path to API in the package.json at socketURI. Then, build the `.crx` file using Grunt. You'll find the generated file in a `builds` directory.

```
$ grunt build
```