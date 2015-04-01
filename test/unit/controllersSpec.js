'use strict';

/* jasmine specs for controllers go here */
describe('Otis controllers', function () {

    beforeEach(function () {
        this.addMatchers({
            toEqualData: function (expected) {
                return angular.equals(this.actual, expected);
            }
        });
    });

    beforeEach(module('Otis'));

    describe('OtisCtrl', function () {
        var rootScope, scope, ctrl, $httpBackend, browser, location, controllerCreator;

        beforeEach(inject(function ($rootScope, _$httpBackend_, $browser, $location, $controller) {
            $httpBackend = _$httpBackend_;
            $httpBackend.expectGET('/otis/config').respond({key: "value"});
            browser = $browser;
            location = $location;
            controllerCreator = $controller;

            // hmm
            rootScope = $rootScope;
            scope = $rootScope.$new();
            ctrl = $controller('OtisCtrl', {$scope: scope, $rootScope: rootScope});
        }));


        it('should create a default model and initialise the config on initialisation', function () {
            expect(rootScope.model).toEqualData({
                graphs: [],
                metrics: []
            });
            $httpBackend.flush();

            expect(rootScope.config).toEqualData({
                key: "value"
            });
        });


        it('should create re-request the config and call listeners when config update is requested', function () {
            $httpBackend.flush();

            expect(rootScope.config).toEqualData({
                key: "value"
            });

            var configReceived = false;
            rootScope.onConfigUpdate(function () {
                configReceived = true;
            });

            // we should get a second get call when we ask the config to update
            $httpBackend.expectGET('/otis/config').respond({key: "value"});
            rootScope.updateConfig();
            $httpBackend.flush();
            expect(configReceived).toEqualData(true);
        });


        it('should save the model to the location hash when requested', function () {

            expect(rootScope.model).toEqualData({
                graphs: [],
                metrics: []
            });

            rootScope.model = {
                graphs: [],
                metrics: [
                    {
                        id: "1",
                        name: "fred"
                    }
                ]
            };
            rootScope.saveModel();

//            browser.poll();
            expect(location.url()).toEqualData('#'+encodeURI('{"graphs":[],"metrics":[{"id":"1","name":"fred"}]}'));
        });


        it('should should correctly rehydrate the model from the hash', function () {
            // recreate the controller now we've changed the hash
            location.hash(encodeURI('{"metrics":[{"id":"1","name": "fred"}]}'));
//            browser.poll();
            ctrl = controllerCreator('OtisCtrl', {$scope: scope, $rootScope: rootScope});

            expect(rootScope.model).toEqualData(
                { metrics : [ { id : '1', name : 'fred' } ] }
            );
        });


    });

    describe('GraphControlCtrl', function() {
        var rootScope, scope;
        var configUpdateFunc;
        var saveModelCalled, saveModelRenderArg;

        beforeEach(inject(function ($rootScope, $controller) {
            // hmm
            rootScope = $rootScope;
            scope = $rootScope.$new();

            rootScope.onConfigUpdate = function(func) {
                configUpdateFunc = func;
            }
            rootScope.saveModel = function(render) {
                saveModelCalled = true;
                saveModelRenderArg = render;
            }
            saveModelCalled = false;
            saveModelRenderArg = false;
            rootScope.model = { graphs: [], metrics: [] };
            rootScope.graphTypes = [ "unittest1", "unittest2" ];

            $controller('GraphControlCtrl', {$scope: scope, $rootScope: rootScope});
        }));

        it('should create a single graph on initialisation if none exist', function () {
            configUpdateFunc();

            expect(rootScope.model.graphs).toEqualData([
                {
                    id: scope.lastGraphId+"",
                    title: "Graph 1",
                    type: null,
                    showTitle: false
                }
            ]);
        });

        it('should set the graph type when creating a graph on initialisation if only one type is defined', function () {
            rootScope.graphTypes = [ "unittest1" ];

            configUpdateFunc();

            expect(rootScope.model.graphs).toEqualData([
                {
                    id: scope.lastGraphId+"",
                    title: "Graph 1",
                    type: "unittest1",
                    showTitle: false
                }
            ]);
        });

        it('should load the existing model on initialisation', function () {


            rootScope.model.graphs = [
                {
                    id: "1234",
                    title: "Graph 1",
                    type: null,
                    showTitle: true
                }
            ];

            configUpdateFunc();

            expect(scope.lastGraphId).toEqualData(1234);
        });

        it('should add a new graph to the model with a default title when the addGraph() function is called', function () {

            scope.addGraph();

            var firstId = scope.lastGraphId+"";
            expect(rootScope.model.graphs).toEqualData([
                {
                    id: firstId,
                    title: "Graph 1",
                    type: null,
                    showTitle: true
                }
            ]);

            scope.addGraph();

            var secondId = scope.lastGraphId+"";
            expect(rootScope.model.graphs).toEqualData([
                {
                    id: firstId,
                    title: "Graph 1",
                    type: null,
                    showTitle: true
                },
                {
                    id: secondId,
                    title: "Graph 2",
                    type: null,
                    showTitle: true
                }
            ]);
        });

        it('should set the graph type on new graphs if there is only one type defined', function () {
            rootScope.graphTypes = [ "unittest1" ];

            scope.addGraph();

            var firstId = scope.lastGraphId+"";
            expect(rootScope.model.graphs).toEqualData([
                {
                    id: firstId,
                    title: "Graph 1",
                    type: "unittest1",
                    showTitle: true
                }
            ]);

            scope.addGraph();

            var secondId = scope.lastGraphId+"";
            expect(rootScope.model.graphs).toEqualData([
                {
                    id: firstId,
                    title: "Graph 1",
                    type: "unittest1",
                    showTitle: true
                },
                {
                    id: secondId,
                    title: "Graph 2",
                    type: "unittest1",
                    showTitle: true
                }
            ]);
        });

        it('should request rendering when saving changes', function () {
            scope.renderGraphs();
            expect(saveModelCalled).toEqualData(true);
            expect(saveModelRenderArg).toEqualData(true);
        });

        it('should remove a graph from the model when requested', function () {
            scope.addGraph();

            var firstId = scope.lastGraphId+"";
            expect(rootScope.model.graphs).toEqualData([
                {
                    id: firstId,
                    title: "Graph 1",
                    type: null,
                    showTitle: true
                }
            ]);

            scope.deleteGraph(firstId);

            expect(rootScope.model.graphs).toEqualData([]);
        });

        it("should not remove a graph if it can't be found", function () {
            scope.addGraph();

            var firstId = scope.lastGraphId+"";
            expect(rootScope.model.graphs).toEqualData([
                {
                    id: firstId,
                    title: "Graph 1",
                    type: null,
                    showTitle: true
                }
            ]);

            scope.deleteGraph("0");
            expect(rootScope.model.graphs).toEqualData([
                {
                    id: firstId,
                    title: "Graph 1",
                    type: null,
                    showTitle: true
                }
            ]);
        });

        it('should not create new graphs with an existing id', function () {
            scope.addGraph();

            var firstId = scope.lastGraphId+"";

            scope.addGraph();

            var secondId = scope.lastGraphId+"";

            expect(firstId == secondId).toEqualData(false);
        });

        //todo: move id generation to a service
        it('should generate unique ids', function () {
            scope.timeInMillis = function() {
                return 0;
            }

            var firstId = scope.nextId();
            var secondId = scope.nextId();
            expect(firstId == secondId).toEqualData(false);
        });

    });

    describe('GraphCtrl', function() {
        var rootScope, scope;
        var graphs, metricss;

        beforeEach(inject(function ($rootScope, $controller) {
            // hmm
            rootScope = $rootScope;
            scope = $rootScope.$new();
            graphs = [];
            metricss = [];

            scope.renderers = {};
            scope.renderers["unittest"] = function(graph,metrics) {
                graphs.push(graph);
                metricss.push(metrics);
            }

            rootScope.model = {
                graphs: [],
                metrics: []
            }

            $controller('GraphCtrl', {$scope: scope, $rootScope: rootScope});
        }));

        it('should define the renderGraphs function on the rootScope', function() {
            var defined = false;
            if (rootScope.renderGraphs) {
                defined = true;
            }
            expect(defined).toEqualData(true);
        });

        it('should call the correct renderer when a graph with the correct type is defined', function() {
            var graph = { id: "abc", type: "unittest" };
            var notGraph = { id: "def", type: "something" };
            var incMetric = { id: "123", graphOptions: { graphId: "abc" }};
            var excMetric = { id: "456", graphOptions: { graphId: "def" }};
            rootScope.model.graphs = [ graph, notGraph ];
            rootScope.model.metrics = [ incMetric, excMetric ];

            rootScope.renderGraphs();

            expect(graphs).toEqualData([graph]);
            expect(metricss).toEqualData([[incMetric]]);
        });

        // todo: tests for specific renderers when we have them (not incl debug)
    });

    describe('MetricControlCtrl', function() {
        var rootScope, scope, ctrl, $httpBackend, controllerCreator;
        var configUpdateFunc;
        var saveModelCalled = false;

        beforeEach(inject(function ($rootScope, _$httpBackend_, $browser, $location, $controller) {
            $httpBackend = _$httpBackend_;
            controllerCreator = $controller;

            // hmm
            rootScope = $rootScope;

            rootScope.onConfigUpdate = function(func) {
                configUpdateFunc = func;
            }
            rootScope.saveModel = function() {
                saveModelCalled = true;
            }
            saveModelCalled = false;
            rootScope.model = { graphs: [], metrics: [] };

            scope = $rootScope.$new();
            ctrl = $controller('MetricControlCtrl', {$scope: scope, $rootScope: rootScope});
        }));

        it('should register for config loads on start', function () {
            expect(configUpdateFunc).not.toEqual(null);
        });

        it('should load data for the tree on config update', function() {
            $httpBackend.expectGET('/api/suggest?type=metrics&max=1000000').respond(
                [
                    "flob",
                    "name.baldrick",
                    "name.blackadder",
                    "wibble",
                    "wibble.wobble"
                ]
            );

            configUpdateFunc();
            $httpBackend.flush();

            var expectedDataForTheTree = [
                {id: "flob", name: "flob", isMetric: true, children: []},
                {id: "name", name: "name", isMetric: false, children: [
                    {id: "name.baldrick", name: "baldrick", isMetric: true, children: []},
                    {id: "name.blackadder", name: "blackadder", isMetric: true, children: []}
                ]},
                {id: "wibble", name: "wibble", isMetric: true, children: [
                    {id: "wibble.wobble", name: "wobble", isMetric: true, children: []}
                ]}
            ];

            expect(scope.dataForTheTree).toEqualData(expectedDataForTheTree);
            expect(scope.allParentNodes).toEqualData([
                expectedDataForTheTree[1], expectedDataForTheTree[2]
            ]);
        });

        // todo: test should not load data for the tree if already loading
        it('should not load data for the tree if already loading', function() {
        });

        it('should correctly process a selected node in the tree', function() {
            var node = {id: "name.baldrick", name: "baldrick", isMetric: true, children: []};

            var response = {
                key1: [ "value1", "value2" ],
                key2: [ "value3" ]
            };

            $httpBackend.expectGET('/otis/tags?metric=name.baldrick').respond(response);

            scope.nodeSelectedForAddition(node, true);
            $httpBackend.flush();

            // simple results
            expect(scope.addButtonVisible()).toEqualData(true);
            expect(scope.clearButtonEnabled()).toEqualData(true);
            expect(scope.selectedMetric).toEqualData("name.baldrick");
            expect(scope.tagNames).toEqualData(["key1","key2"]);
            expect(scope.tagValues).toEqualData(response);
            expect(scope.re).toEqualData({key1: true, key2: true});

            // tag options are a little more complex
            expect(scope.tagOptions.key1.suggest('')).toEqualData([{label:"value1",value:"value1"},{label:"value2",value:"value2"}]);
            expect(scope.tagOptions.key2.suggest('')).toEqualData([{label:"value3",value:"value3"}]);

        })

        it('should cleanup when a node is deselected and not try to get tag values', function() {
            var node = {id: "name.baldrick", name: "baldrick", isMetric: true, children: []};

            scope.nodeSelectedForAddition(node, false);
            // no calls should be made
            $httpBackend.verifyNoOutstandingRequest();

            // simple results
            expect(scope.addButtonVisible()).toEqualData(false);
            expect(scope.clearButtonEnabled()).toEqualData(false);
            expect(scope.selectedMetricId).toEqualData("0");
            expect(scope.selectedMetric).toEqualData("");
            expect(scope.tagNames).toEqualData([]);
            expect(scope.tagValues).toEqualData({});
            expect(scope.re).toEqualData({});
            expect(scope.tagOptions).toEqualData({});
        })

        it('should suggest correct tag values', function() {
            scope.tagValues = { key1: ["value1","something2","value2"] };

            var ret_value1 = {label:"value1",value:"value1"};
            var ret_something2 = {label:"something2",value:"something2"};
            var ret_value2 = {label:"value2",value:"value2"};

            scope.re = { key1: false };
            expect(scope.suggestTagValues('','key1')).toEqualData([ret_value1,ret_something2,ret_value2]);
            expect(scope.suggestTagValues('value','key1')).toEqualData([ret_value1,ret_value2]);
            expect(scope.suggestTagValues('value1','key1')).toEqualData([ret_value1]);
            expect(scope.suggestTagValues('value12','key1')).toEqualData([]);
            expect(scope.suggestTagValues('*','key1')).toEqualData([]);

            // todo: would you expect suggested tag values to change because you ticked RE?
            scope.re = { key1: true };
            expect(scope.suggestTagValues('','key1')).toEqualData([ret_value1,ret_something2,ret_value2]);
            expect(scope.suggestTagValues('value','key1')).toEqualData([ret_value1,ret_value2]);
            expect(scope.suggestTagValues('value1','key1')).toEqualData([ret_value1]);
            expect(scope.suggestTagValues('2','key1')).toEqualData([ret_something2, ret_value2]);
            expect(scope.suggestTagValues('th','key1')).toEqualData([ret_something2]);
            expect(scope.suggestTagValues('.*','key1')).toEqualData([ret_value1,ret_something2,ret_value2]);
        });

        it('should correctly count matching tag values', function() {
            scope.tagValues = { key1: ["value1","something2","value2"] };

            scope.re = { key1: false };
            scope.tag = { key1: '' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("");
            scope.tag = { key1: 'value' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(0)");
            scope.tag = { key1: 'value1' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(1)");
            scope.tag = { key1: 'value12' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(0)");
            scope.tag = { key1: '*' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(3)");
            scope.tag = { key1: '.*' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(0)");

            scope.re = { key1: true };
            scope.tag = { key1: '' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("");
            scope.tag = { key1: 'value' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(2)");
            scope.tag = { key1: 'value1' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(1)");
            scope.tag = { key1: '2' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(2)");
            scope.tag = { key1: 'th' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(1)");
            scope.tag = { key1: '.*' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(3)");
            scope.tag = { key1: '*' };
            expect(scope.tagValuesMatchCount('key1')).toEqualData("(0)");
        });

        it('should add the metric to the model when addMetric() is called', function() {
            scope.tagNames = ["tag1","tag2","tag3"];
            scope.tag = {tag1: '', tag2: '*', tag3: 'value'};
            scope.re = {tag1:false,tag2:false,tag3:true};
            scope.selectedMetric = "some.metric.name";
            scope.rate = false;
            scope.downsample = true;
            scope.downsampleBy = "10m";

            scope.addMetric();

            expect(saveModelCalled).toEqualData(true);
            var newMetricId = scope.lastId+"";
            expect(rootScope.model.metrics).toEqualData([
                {
                    id: newMetricId,
                    name: 'some.metric.name',
                    tags: [
                        {
                            name: "tag1",
                            value: "",
                            re: false
                        },
                        {
                            name: "tag2",
                            value: "*",
                            re: false
                        },
                        {
                            name: "tag3",
                            value: "value",
                            re: true
                        }
                    ],
                    graphOptions: {
                        graphId: '0',
                        rate: false,
                        downsample: true,
                        downsampleBy: '10m'
                    }
                }
            ]);
            expect(scope.selectedMetric).toEqualData("");
            expect(scope.selectedMetricId).toEqualData(newMetricId);
            expect(scope.saveButtonVisible()).toEqualData(true);
            expect(scope.clearButtonEnabled()).toEqualData(true);
            expect(scope.addButtonVisible()).toEqualData(false);
        })

        it('should clear the form when a user cancels adding a new metric', function() {
            scope.tagNames = ["tag1","tag2","tag3"];
            scope.tag = {tag1: '', tag2: '*', tag3: 'value'};
            scope.re = {tag1:false,tag2:false,tag3:true};
            scope.selectedMetric = "some.metric.name";
            scope.rate = false;
            scope.downsample = true;
            scope.downsampleBy = "10m";

            scope.clearMetric();

            expect(saveModelCalled).toEqualData(false);
            expect(scope.tagNames).toEqualData([]);
            expect(scope.tag).toEqualData({});
            expect(scope.re).toEqualData({});
            expect(scope.selectedMetric).toEqualData('');
            expect(scope.rate).toEqualData(false);
            expect(scope.downsample).toEqualData(false);
            expect(scope.downsampleBy).toEqualData('');
            expect(scope.clearButtonEnabled()).toEqualData(false);
            expect(scope.addButtonVisible()).toEqualData(false);
            expect(scope.saveButtonVisible()).toEqualData(false);
        });

        it('should not generate new metrics with the ids of ones from an existing model', function() {
            rootScope.model = { metrics : [ { id : "1", name : 'fred' } ] };
            configUpdateFunc();
            expect(scope.lastId).toEqualData(1);

            scope.tagNames = [];
            scope.tag = {};
            scope.re = {};
            scope.selectedMetric = "some.metric.name";
            scope.rate = false;
            scope.downsample = false;
            scope.downsampleBy = "";


            scope.addMetric();

            expect(saveModelCalled).toEqualData(true);
            expect(rootScope.model.metrics).toEqualData([
                {
                    id: "1",
                    name: 'fred'
                },
                {
                    id: scope.lastId + "",
                    name: 'some.metric.name',
                    tags: [],
                    graphOptions: {
                        graphId: '0',
                        rate: false,
                        downsample: false,
                        downsampleBy: ''
                    }
                }
            ]);

            expect(rootScope.model.metrics[0].id == rootScope.model.metrics[1].id).toEqualData(false);
        });

        it('should populate the metric form when an existing metric is selected', function() {
            rootScope.model = {
                graphs: [
                    {
                        id: "abc",
                        type: "debug",
                        title: "Title1",
                        showTitle: true
                    }
                ],
                metrics: [
                    {
                        id: "123",
                        name: 'some.metric.name',
                        tags: [
                            {
                                name: "tag1",
                                value: "",
                                re: false
                            },
                            {
                                name: "tag2",
                                value: "*",
                                re: false
                            },
                            {
                                name: "tag3",
                                value: "value",
                                re: true
                            }
                        ],
                        graphOptions: {
                            graphId: 'abc',
                            rate: true,
                            downsample: true,
                            downsampleBy: '10m'
                        }
                    }
                ]
            }

            scope.selectedMetricId = "123";


            var response = {
                tag1: [ "value1", "value2" ],
                tag2: [ "value3" ],
                tag3: [ "value"]
            };

            $httpBackend.expectGET('/otis/tags?metric=some.metric.name').respond(response);

            scope.nodeSelectedForEditing();
            $httpBackend.flush();

            expect(scope.tagNames).toEqualData(["tag1","tag2","tag3"]);
            expect(scope.tag).toEqualData({tag1:"",tag2:"*",tag3:"value"});
            expect(scope.re).toEqualData({tag1:false,tag2:false,tag3:true});
            expect(scope.selectedMetric).toEqualData('');
            expect(scope.rate).toEqualData(true);
            expect(scope.downsample).toEqualData(true);
            expect(scope.downsampleBy).toEqualData('10m');
            expect(scope.clearButtonEnabled()).toEqualData(true);
            expect(scope.addButtonVisible()).toEqualData(false);
            expect(scope.saveButtonVisible()).toEqualData(true);
        });

        it('should update the model when a user clicks save from an existing metric being edited', function() {
            rootScope.model = {
                graphs: [],
                    metrics: [
                    {
                        id: "123",
                        name: 'some.metric.name',
                        tags: [
                            {
                                name: "tag1",
                                value: "abc",
                                re: true
                            },
                            {
                                name: "tag2",
                                value: "zab",
                                re: true
                            },
                            {
                                name: "tag3",
                                value: "",
                                re: false
                            }
                        ],
                        graphOptions: {
                            graphId: 'abc',
                            rate: true,
                            downsample: false,
                            downsampleBy: ''
                        }
                    }
                ]
                };

            scope.tagNames = ["tag1","tag2","tag3"];
            scope.tag = {tag1: '', tag2: '*', tag3: 'value'};
            scope.re = {tag1:false,tag2:false,tag3:true};
            scope.selectedMetricId = "123";
            scope.rate = false;
            scope.downsample = true;
            scope.downsampleBy = "10m";

            scope.saveMetric();

            expect(saveModelCalled).toEqualData(true);
            expect(scope.tagNames).toEqualData(["tag1","tag2","tag3"]);
            expect(scope.tag).toEqualData({tag1: '', tag2: '*', tag3: 'value'});
            expect(scope.re).toEqualData({tag1:false,tag2:false,tag3:true});
            expect(scope.selectedMetricId).toEqualData('123');
            expect(scope.selectedMetric).toEqualData('');
            expect(scope.rate).toEqualData(false);
            expect(scope.downsample).toEqualData(true);
            expect(scope.downsampleBy).toEqualData('10m');
            expect(scope.clearButtonEnabled()).toEqualData(true);
            expect(scope.addButtonVisible()).toEqualData(false);
            expect(scope.saveButtonVisible()).toEqualData(true);

            expect(rootScope.model).toEqualData(
                {
                    graphs: [],
                    metrics: [
                        {
                            id: "123",
                            name: 'some.metric.name',
                            tags: [
                                {
                                    name: "tag1",
                                    value: "",
                                    re: false
                                },
                                {
                                    name: "tag2",
                                    value: "*",
                                    re: false
                                },
                                {
                                    name: "tag3",
                                    value: "value",
                                    re: true
                                }
                            ],
                            graphOptions: {
                                graphId: '0',
                                rate: false,
                                downsample: true,
                                downsampleBy: '10m'
                            }
                        }
                    ]
                }
            );
        });

        it('should clear the form when a user cancels editing an existing metric', function() {
            scope.tagNames = ["tag1","tag2","tag3"];
            scope.tag = {tag1: '', tag2: '*', tag3: 'value'};
            scope.re = {tag1:false,tag2:false,tag3:true};
            scope.selectedMetricId = "123";
            scope.rate = false;
            scope.downsample = true;
            scope.downsampleBy = "10m";

            scope.clearMetric();

            expect(saveModelCalled).toEqualData(false);
            expect(scope.tagNames).toEqualData([]);
            expect(scope.tag).toEqualData({});
            expect(scope.re).toEqualData({});
            expect(scope.selectedMetricId).toEqualData('0');
            expect(scope.rate).toEqualData(false);
            expect(scope.downsample).toEqualData(false);
            expect(scope.downsampleBy).toEqualData('');
            expect(scope.clearButtonEnabled()).toEqualData(false);
            expect(scope.addButtonVisible()).toEqualData(false);
            expect(scope.saveButtonVisible()).toEqualData(false);
        });
    });
});