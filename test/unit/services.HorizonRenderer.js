'use strict';

/* jasmine specs for controllers go here */
describe('Aardvark renderers', function () {

    beforeEach(function () {
        jasmine.addMatchers({
            toEqualData: function(util, customEqualityTesters) {
                return {
                    compare: function(actual, expected) {
                        var passed = angular.equals(actual, expected);
                        return {
                            pass: passed,
                            message: 'Expected ' + JSON.stringify(actual) + '\nto equal ' + JSON.stringify(expected)
                        };
                    }
                };
            }
        });
    });

    beforeEach(module('Aardvark'));

    describe('HorizonRenderer', function() {

        var graphServices, $httpBackend;
        var renderer, rendererInstance;
        var renderContext, config;
        var renderDiv, graphPanel;
        
        var d3render_orig;
        var d3render_renderContext;
        var d3render_graph;
        var d3render_context;
        var d3render_cMetrics;
        var d3render_divSelector;

        beforeEach(inject(function (HorizonRenderer, GraphServices, _$httpBackend_) {
            // hmm
            renderer = HorizonRenderer;
            graphServices = GraphServices;
            $httpBackend = _$httpBackend_;

            renderContext = {};
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};
            renderContext.renderMessages = {};
            renderContext.graphRendered = function() {};
            renderContext.addGraphRenderListener = function() {};

            config = {
                tsdbBaseReadUrl: "http://tsdb:4242"
            };

            renderDiv = document.createElement("div");
            renderDiv.setAttribute("id","horizonDiv_abc");
            document.body.appendChild(renderDiv);
            graphPanel = document.createElement("div");
            graphPanel.setAttribute("id","graph-content-panel");
            document.body.appendChild(graphPanel);

            rendererInstance = renderer.create();
            // defaults
            expect(rendererInstance.supports_tsdb_export).toEqualData(true);
            expect(rendererInstance.tsdb_export_link).toEqualData("");
            // memory from a previous query
            rendererInstance.tsdb_export_link = "http://tsdb:4242/oldquery";
            d3render_orig = rendererInstance.d3render;
            rendererInstance.d3render = function(renderContext, graph, context, cMetrics, divSelector) {
                d3render_renderContext = renderContext;
                d3render_graph = graph;
                d3render_context = context;
                d3render_cMetrics = cMetrics;
                d3render_divSelector = divSelector;
            }
        }));
        
        var mockContext;
        var mockUpContext = function() {
            mockContext = {
                _serverDelay: null,
                _stepSize: null,
                _size: null,
                _metricKeys: [],
                _metrics: {}
            };
            mockContext.serverDelay = function(diff) {
                mockContext._serverDelay = diff;
                return mockContext;
            }
            mockContext.step = function(stepSize) {
                mockContext._step = stepSize;
                return mockContext;
            }
            mockContext.size = function(width) {
                mockContext._size = width;
                return mockContext;
            }
            mockContext.stop = function() {
                return mockContext;
            }
            // getDataFn(start, stop, step, callback)
            mockContext.metric = function(getDataFn, name) {
                var m = {
                    fn: getDataFn,
                    name: name,
                    toString: function() { return name; }
                };
                mockContext._metricKeys.push(name);
                mockContext._metrics[name] = m;
                return m;
            }
            mockContext.metricData = function(name) {
                var d;
                var callback = function(_, data) {
                    d = data;
                }
                mockContext._metrics[name].fn(0/*start*/, 0/*stop*/, mockContext._step, callback);
                return d;
            }
            rendererInstance.context = function() {
                return mockContext;
            };
        }
        
        afterEach(function() {
            renderDiv.remove();
            renderDiv = null;
            graphPanel.remove();
            graphPanel = null;
        });
        
        it('should render correctly when using a mocked cubism library', function() {
            mockUpContext();
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};
//
            var global = { absoluteTimeSpecification: true, fromDate: "2017/01/01", fromTime: "00:00:00", toDate: "2017/01/01", toTime: "00:05:00", autoReload: false };
            var graph = { id: "abc", graphWidth: 25, graphHeight: 100 };
            var metrics = [ { id: "123", type: "metric", name:"metric1", graphOptions: {aggregator: "sum"}, tags: [] } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            $httpBackend.expectGET("http://tsdb:4242/api/query?start=2017/01/01 00:00:00&end=2017/01/01 00:05:00&m=sum:20s-avg:metric1&no_annotations=true&ms=true&arrays=true&show_query=true").respond([
                {metric: "metric1", tags: {}, dps:[
                    [1483228800000,  10],
                    [1483228820000,  20],
                    [1483228840000,  30],
                    [1483228860000,  40],
                    [1483228880000,  50],
                    [1483228900000,  60],
                    [1483228920000,  70],
                    [1483228940000,  80],
                    [1483229100000, 100]
                ]}
            ]);
            $httpBackend.flush();
            
            expect(mockContext._step).toEqualData(20000);
            expect(mockContext._size).toEqualData(15);
            expect(mockContext._metricKeys).toEqualData(["metric1"]);
            expect(mockContext._metrics.hasOwnProperty("metric1")).toEqualData(true);
            expect(mockContext.metricData("metric1")).toEqualData([10,20,30,40,50,60,70,80,null,null,null,null,null,null,null,100]);
        });
        
        it('should order metrics by name by default', function() {
            mockUpContext();
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};
//
            var global = { absoluteTimeSpecification: true, fromDate: "2017/01/01", fromTime: "00:00:00", toDate: "2017/01/01", toTime: "00:05:00", autoReload: false };
            var graph = { id: "abc", graphWidth: 25, graphHeight: 100 };
            var metrics = [ { id: "123", type: "metric", name:"metric1", graphOptions: {aggregator: "sum"}, tags: [] }
                           ,{ id: "123", type: "metric", name:"metric2", graphOptions: {aggregator: "sum"}, tags: [{name:"host",value:"*",groupBy:true}] }
                           ,{ id: "123", type: "metric", name:"metric3", graphOptions: {aggregator: "sum"}, tags: [] }];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            $httpBackend.expectGET("http://tsdb:4242/api/query?start=2017/01/01 00:00:00&end=2017/01/01 00:05:00&m=sum:20s-avg:metric1&m=sum:20s-avg:metric2{host=*}&m=sum:20s-avg:metric3&no_annotations=true&ms=true&arrays=true&show_query=true").respond([
                {metric: "metric1", tags: {}, dps:[
                    [1483228800000,  10],
                    [1483229100000, 100]
                ]}
                ,{metric: "metric3", tags: {}, dps:[
                    [1483228800000,  10],
                    [1483229100000, 100]
                ]}
                ,{metric: "metric2", tags: {host:"host2"}, dps:[
                    [1483228800000,  10],
                    [1483229100000, 100]
                ]}
                ,{metric: "metric2", tags: {host:"host1"}, dps:[
                    [1483228800000,  10],
                    [1483229100000, 100]
                ]}
            ]);
            $httpBackend.flush();
            
            expect(d3render_cMetrics.length).toEqualData(4);
            expect(d3render_cMetrics[0].name).toEqualData("metric1");
            expect(d3render_cMetrics[1].name).toEqualData("metric2{host=host1}");
            expect(d3render_cMetrics[2].name).toEqualData("metric2{host=host2}");
            expect(d3render_cMetrics[3].name).toEqualData("metric3");
        });
        
        it('should order metrics by min value', function() {
            mockUpContext();
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};
//
            var global = { absoluteTimeSpecification: true, fromDate: "2017/01/01", fromTime: "00:00:00", toDate: "2017/01/01", toTime: "00:05:00", autoReload: false };
            var graph = { id: "abc", graphWidth: 25, graphHeight: 100, horizon: { sortMethod: "min" } };
            var metrics = [ { id: "123", type: "metric", name:"metric1", graphOptions: {aggregator: "sum"}, tags: [] }
                           ,{ id: "123", type: "metric", name:"metric2", graphOptions: {aggregator: "sum"}, tags: [{name:"host",value:"*",groupBy:true}] }
                           ,{ id: "123", type: "metric", name:"metric3", graphOptions: {aggregator: "sum"}, tags: [] }];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            $httpBackend.expectGET("http://tsdb:4242/api/query?start=2017/01/01 00:00:00&end=2017/01/01 00:05:00&m=sum:20s-avg:metric1&m=sum:20s-avg:metric2{host=*}&m=sum:20s-avg:metric3&no_annotations=true&ms=true&arrays=true&show_query=true").respond([
                {metric: "metric1", tags: {}, dps:[
                    [1483228800000,  40],
                    [1483229100000, 100]
                ]}
                ,{metric: "metric2", tags: {host:"host1"}, dps:[
                    [1483228800000,  20],
                    [1483229100000, 100]
                ]}
                ,{metric: "metric2", tags: {host:"host2"}, dps:[
                    [1483228800000,  30],
                    [1483229100000, 100]
                ]}
                ,{metric: "metric3", tags: {}, dps:[
                    [1483228800000,  10],
                    [1483229100000, 100]
                ]}
            ]);
            $httpBackend.flush();
            
            expect(d3render_cMetrics.length).toEqualData(4);
            expect(d3render_cMetrics[0].name).toEqualData("metric3");
            expect(d3render_cMetrics[1].name).toEqualData("metric2{host=host1}");
            expect(d3render_cMetrics[2].name).toEqualData("metric2{host=host2}");
            expect(d3render_cMetrics[3].name).toEqualData("metric1");
        });
        
        it('should order metrics by max value', function() {
            mockUpContext();
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};
//
            var global = { absoluteTimeSpecification: true, fromDate: "2017/01/01", fromTime: "00:00:00", toDate: "2017/01/01", toTime: "00:05:00", autoReload: false };
            var graph = { id: "abc", graphWidth: 25, graphHeight: 100, horizon: { sortMethod: "max" } };
            var metrics = [ { id: "123", type: "metric", name:"metric1", graphOptions: {aggregator: "sum"}, tags: [] }
                           ,{ id: "123", type: "metric", name:"metric2", graphOptions: {aggregator: "sum"}, tags: [{name:"host",value:"*",groupBy:true}] }
                           ,{ id: "123", type: "metric", name:"metric3", graphOptions: {aggregator: "sum"}, tags: [] }];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            $httpBackend.expectGET("http://tsdb:4242/api/query?start=2017/01/01 00:00:00&end=2017/01/01 00:05:00&m=sum:20s-avg:metric1&m=sum:20s-avg:metric2{host=*}&m=sum:20s-avg:metric3&no_annotations=true&ms=true&arrays=true&show_query=true").respond([
                {metric: "metric1", tags: {}, dps:[
                    [1483228800000,  10],
                    [1483229100000, 150]
                ]}
                ,{metric: "metric2", tags: {host:"host1"}, dps:[
                    [1483228800000,  10],
                    [1483229100000, 100]
                ]}
                ,{metric: "metric2", tags: {host:"host2"}, dps:[
                    [1483228800000,  10],
                    [1483229100000, 130]
                ]}
                ,{metric: "metric3", tags: {}, dps:[
                    [1483228800000,  10],
                    [1483229100000, 110]
                ]}
            ]);
            $httpBackend.flush();
            
            expect(d3render_cMetrics.length).toEqualData(4);
            expect(d3render_cMetrics[0].name).toEqualData("metric2{host=host1}");
            expect(d3render_cMetrics[1].name).toEqualData("metric3");
            expect(d3render_cMetrics[2].name).toEqualData("metric2{host=host2}");
            expect(d3render_cMetrics[3].name).toEqualData("metric1");
        });
        
        it('should order metrics by avg value', function() {
            mockUpContext();
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};
//
            var global = { absoluteTimeSpecification: true, fromDate: "2017/01/01", fromTime: "00:00:00", toDate: "2017/01/01", toTime: "00:05:00", autoReload: false };
            var graph = { id: "abc", graphWidth: 25, graphHeight: 100, horizon: { sortMethod: "avg" } };
            var metrics = [ { id: "123", type: "metric", name:"metric1", graphOptions: {aggregator: "sum"}, tags: [] }
                           ,{ id: "123", type: "metric", name:"metric2", graphOptions: {aggregator: "sum"}, tags: [{name:"host",value:"*",groupBy:true}] }
                           ,{ id: "123", type: "metric", name:"metric3", graphOptions: {aggregator: "sum"}, tags: [] }];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            $httpBackend.expectGET("http://tsdb:4242/api/query?start=2017/01/01 00:00:00&end=2017/01/01 00:05:00&m=sum:20s-avg:metric1&m=sum:20s-avg:metric2{host=*}&m=sum:20s-avg:metric3&no_annotations=true&ms=true&arrays=true&show_query=true").respond([
                {metric: "metric1", tags: {}, dps:[
                    [1483228800000, 10],
                    [1483229100000, 90] // 40
                ]}
                ,{metric: "metric2", tags: {host:"host1"}, dps:[
                    [1483228800000, 30],
                    [1483229100000, 90] // 60 
                ]}
                ,{metric: "metric2", tags: {host:"host2"}, dps:[
                    [1483228800000, 20],
                    [1483229100000, 40] // 30
                ]}
                ,{metric: "metric3", tags: {}, dps:[
                    [1483228800000, 40],
                    [1483229100000, 60] // 50
                ]}
            ]);
            $httpBackend.flush();
            
            expect(d3render_cMetrics.length).toEqualData(4);
            expect(d3render_cMetrics[0].name).toEqualData("metric2{host=host2}");
            expect(d3render_cMetrics[1].name).toEqualData("metric1");
            expect(d3render_cMetrics[2].name).toEqualData("metric3");
            expect(d3render_cMetrics[3].name).toEqualData("metric2{host=host1}");
        });

        it('should report an error when trying to render with horizon and no start time', function() {
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};

            var global = { relativePeriod: "", autoReload: false };
            var graph = { id: "abc", graphWidth: 640, graphHeight: 100 };
            var metrics = [ { id: "123", graphOptions: {} } ];

            rendererInstance.render(renderContext, config, global, graph, metrics);

            expect(rendererInstance.tsdb_export_link).toEqualData("");
            expect(renderContext.renderErrors).toEqualData({abc:"No start date specified"});
            expect(renderContext.renderWarnings).toEqualData({});
        });

        it('should render a single line for a simple query', function() {
            renderContext.renderedContent = {};
            renderContext.renderErrors = {};
            renderContext.renderWarnings = {};
//
            var global = { relativePeriod: "2h", autoReload: false };
            var graph = { id: "abc", graphWidth: 640, graphHeight: 100 };
            var metrics = [ { id: "123", type: "metric", name:"metric1", graphOptions: {aggregator: "sum"}, tags: [] } ];
//
            rendererInstance.render(renderContext, config, global, graph, metrics);
            
            $httpBackend.expectGET("http://tsdb:4242/api/query?start=2h-ago&ignore=1&m=sum:20s-avg:metric1&no_annotations=true&ms=true&arrays=true&show_query=true").respond([
                {metric: "metric1", tags: {}, dps:[
                    [1234567811000, 10],
                    [1234567812000, 20],
                    [1234567813000, 30],
                    [1234567814000, 40],
                    [1234567815000, 50]
                ]}
            ]);
            $httpBackend.flush();

            expect(rendererInstance.tsdb_export_link).toEqualData("http://tsdb:4242/#start=2h-ago&m=sum:20s-avg:metric1&o=axis+x1y1&key=top+left");
//
//            expect(renderDivId).toEqualData(null);
//            expect(renderGraphId).toEqualData(null);
//            expect(renderData).toEqualData(null);
//            expect(renderConfig).toEqualData(null);
//            expect(renderContext.renderErrors).toEqualData({abc:"No start date specified"});
//            expect(renderContext.renderWarnings).toEqualData({});
        });

        // ---------- rendering helper functions -----

        it('should return an empty array when parsing for cubism and an empty reponse is received', function() {
            var json = [];

            var parsed = renderer.cubism_parser(json, 1365966000, 1, 1365966010, false, false);

            expect(parsed).toEqualData([[]]);
        });

        it('should return an empty array when parsing for cubism and no datapoints are received', function() {
            var json = [
                {
                    "metric": "tsd.hbase.puts",
                    "tags": {},
                    "dps": []

                }
            ];

            var parsed = renderer.cubism_parser(json, 1365966000, 1, 1365966010, false, false);

            expect(parsed).toEqualData([[]]);
        });

        it('should parse for cubism fine when response is exactly as expected', function() {
            var json = [
                {
                    "metric": "tsd.hbase.puts",
                    "tags": {},
                    "dps": [
                        [ 1365966000, 1 ],
                        [ 1365966001, 1 ],
                        [ 1365966002, 2 ],
                        [ 1365966003, 5 ],
                        [ 1365966004, 3 ],
                        [ 1365966005, 2 ],
                        [ 1365966006, 1 ],
                        [ 1365966007, 4 ],
                        [ 1365966008, 10 ],
                        [ 1365966009, 9 ],
                        [ 1365966010, 4 ]
                    ]

                }
            ];

            var parsed = renderer.cubism_parser(json, 1365966000, 1, 1365966010, false, false);

            expect(parsed).toEqualData([[1,1,2,5,3,2,1,4,10,9,4]]);
        });

        it('should squash negatives when parsing for cubism when requested', function() {
            var json = [
                {
                    "metric": "tsd.hbase.puts",
                    "tags": {},
                    "dps": [
                        [ 1365966000, 1 ],
                        [ 1365966001, 1 ],
                        [ 1365966002, 2 ],
                        [ 1365966003, -5 ],
                        [ 1365966004, 3 ],
                        [ 1365966005, 2 ],
                        [ 1365966006, 1 ],
                        [ 1365966007, 4 ],
                        [ 1365966008, -10 ],
                        [ 1365966009, 9 ],
                        [ 1365966010, 4 ]
                    ]

                }
            ];

            var parsed = renderer.cubism_parser(json, 1365966000, 1, 1365966010, false, true);

            expect(parsed).toEqualData([[1,1,2,0,3,2,1,4,0,9,4]]);
        });

        it('should leave gaps when parsing for cubism when interpolation not requested', function() {
            var json = [
                {
                    "metric": "tsd.hbase.puts",
                    "tags": {},
                    "dps": [
                        [ 1365966000, 1 ],
                        [ 1365966010, 1 ],
                        [ 1365966020, 2 ],
                        [ 1365966030, -5 ],
                        [ 1365966050, 3 ],
                        [ 1365966060, 2 ],
                        [ 1365966080, -10 ],
                        [ 1365966090, 9 ],
                        [ 1365966100, 4 ]
                    ]

                }
            ];

            var parsed = renderer.cubism_parser(json, 1365966000, 10, 1365966100, false, false);

            expect(parsed).toEqualData([[1,1,2,-5,null,3,2,null,-10,9,4]]);
        });

        it('should interpolate when parsing for cubism when requested', function() {
            var json = [
                {
                    "metric": "tsd.hbase.puts",
                    "tags": {},
                    "dps": [
                        [ 1365966000, 1 ],
                        [ 1365966010, 1 ],
                        [ 1365966020, 2 ],
                        [ 1365966030, -5 ],
                        [ 1365966050, 3 ],
                        [ 1365966060, 2 ],
                        [ 1365966080, -10 ],
                        [ 1365966090, 9 ],
                        [ 1365966100, 4 ]
                    ]

                }
            ];

            var parsed = renderer.cubism_parser(json, 1365966000, 10, 1365966100, true, false);

            expect(parsed).toEqualData([[1,1,2,-5,-1,3,2,-4,-10,9,4]]);
        });

        it('should interpolate & squash when parsing for cubism when requested', function() {
            var json = [
                {
                    "metric": "tsd.hbase.puts",
                    "tags": {},
                    "dps": [
                        [ 1365966000, 1 ],
                        [ 1365966010, 1 ],
                        [ 1365966020, 2 ],
                        [ 1365966030, -5 ],
                        [ 1365966050, 3 ],
                        [ 1365966060, 2 ],
                        [ 1365966080, -10 ],
                        [ 1365966090, 9 ],
                        [ 1365966100, 4 ]
                    ]
                }
            ];

            var parsed = renderer.cubism_parser(json, 1365966000, 10, 1365966100, true, true);

            expect(parsed).toEqualData([[1,1,2,0,0,3,2,0,0,9,4]]);

            var json2 = [
                {
                    "metric": "tsd.hbase.puts",
                    "tags": {},
                    "dps": [
                        [ 1365966000, 1 ],
                        [ 1365966010, 1 ],
                        [ 1365966020, 2 ],
                        [ 1365966030, -5 ],
                        [ 1365966050, 9 ],
                        [ 1365966060, 12 ],
                        [ 1365966080, -10 ],
                        [ 1365966090, 9 ],
                        [ 1365966100, 4 ]
                    ]
                }
            ];

            var parsed2 = renderer.cubism_parser(json2, 1365966000, 10, 1365966100, true, true);

            expect(parsed2).toEqualData([[1,1,2,0,2,9,12,1,0,9,4]]);
        });

        it('should return empty array when interpolating response for different time range', function() {
            var json = [
                {
                    "metric": "tsd.hbase.puts",
                    "tags": {},
                    "dps": [
                        [ 1365966001, 1 ],
                        [ 1365966002, 2 ],
                        [ 1365966003, 5 ],
                        [ 1365966004, 3 ],
                        [ 1365966005, 2 ],
                        [ 1365966006, 1 ],
                        [ 1365966007, 4 ],
                        [ 1365966008, 10 ],
                        [ 1365966009, 9 ],
                        [ 1365966010, 4 ],
                        [ 1365966011, 3 ],
                        [ 1365966012, 7 ],
                        [ 1365966013, 1 ],
                        [ 1365966014, 8 ],
                        [ 1365966015, 6 ],
                        [ 1365966016, 7 ],
                        [ 1365966017, 9 ],
                        [ 1365966018, 2 ],
                        [ 1365966019, 3 ],
                        [ 1365966020, 4 ],
                        [ 1365966021, 3 ],
                        [ 1365966022, 7 ],
                        [ 1365966023, 1 ],
                        [ 1365966024, 8 ],
                        [ 1365966025, 6 ],
                        [ 1365966026, 7 ],
                        [ 1365966027, 9 ],
                        [ 1365966028, 2 ],
                        [ 1365966029, 3 ],
                        [ 1365966030, 4 ],
                        [ 1365966031, 3 ],
                        [ 1365966032, 7 ],
                        [ 1365966033, 1 ],
                        [ 1365966034, 8 ],
                        [ 1365966035, 6 ],
                        [ 1365966036, 7 ],
                        [ 1365966037, 9 ],
                        [ 1365966038, 2 ],
                        [ 1365966039, 3 ],
                        [ 1365966040, 4 ],
                        [ 1365966041, 3 ],
                        [ 1365966042, 7 ],
                        [ 1365966043, 1 ],
                        [ 1365966044, 8 ],
                        [ 1365966045, 6 ],
                        [ 1365966046, 7 ],
                        [ 1365966047, 9 ],
                        [ 1365966048, 2 ],
                        [ 1365966049, 3 ],
                        [ 1365966050, 4 ],
                        [ 1365966051, 3 ],
                        [ 1365966052, 7 ],
                        [ 1365966053, 1 ],
                        [ 1365966054, 8 ],
                        [ 1365966055, 6 ],
                        [ 1365966056, 7 ],
                        [ 1365966057, 9 ],
                        [ 1365966058, 2 ],
                        [ 1365966059, 3 ],
                        [ 1365966060, 4 ],
                        [ 1365966061, 3 ],
                        [ 1365966062, 7 ],
                        [ 1365966063, 1 ],
                        [ 1365966064, 8 ],
                        [ 1365966065, 6 ],
                        [ 1365966066, 7 ],
                        [ 1365966067, 9 ],
                        [ 1365966068, 2 ],
                        [ 1365966069, 3 ],
                        [ 1365966070, 4 ],
                        [ 1365966071, 3 ],
                        [ 1365966072, 7 ],
                        [ 1365966073, 1 ],
                        [ 1365966074, 8 ],
                        [ 1365966075, 6 ],
                        [ 1365966076, 7 ],
                        [ 1365966077, 9 ],
                        [ 1365966078, 2 ],
                        [ 1365966079, 3 ],
                        [ 1365966080, 4 ],
                        [ 1365966081, 3 ],
                        [ 1365966082, 7 ],
                        [ 1365966083, 1 ],
                        [ 1365966084, 8 ],
                        [ 1365966085, 6 ],
                        [ 1365966086, 7 ],
                        [ 1365966087, 9 ],
                        [ 1365966088, 2 ],
                        [ 1365966089, 3 ],
                        [ 1365966090, 4 ],
                        [ 1365966091, 3 ],
                        [ 1365966092, 7 ],
                        [ 1365966093, 1 ],
                        [ 1365966094, 8 ],
                        [ 1365966095, 6 ],
                        [ 1365966096, 7 ],
                        [ 1365966097, 9 ],
                        [ 1365966098, 2 ],
                        [ 1365966099, 3 ],
                        [ 1365966100, 1 ],
                        [ 1365966101, 1 ],
                        [ 1365966102, 2 ],
                        [ 1365966103, 5 ],
                        [ 1365966104, 3 ],
                        [ 1365966105, 2 ],
                        [ 1365966106, 1 ],
                        [ 1365966107, 4 ],
                        [ 1365966108, 10 ],
                        [ 1365966109, 9 ],
                        [ 1365966110, 4 ],
                        [ 1365966111, 3 ],
                        [ 1365966112, 7 ],
                        [ 1365966113, 1 ],
                        [ 1365966114, 8 ],
                        [ 1365966115, 6 ],
                        [ 1365966116, 7 ],
                        [ 1365966117, 9 ],
                        [ 1365966118, 2 ],
                        [ 1365966119, 3 ],
                        [ 1365966120, 4 ],
                        [ 1365966121, 3 ],
                        [ 1365966122, 7 ],
                        [ 1365966123, 1 ],
                        [ 1365966124, 8 ],
                        [ 1365966125, 6 ],
                        [ 1365966126, 7 ],
                        [ 1365966127, 9 ],
                        [ 1365966128, 2 ],
                        [ 1365966129, 3 ],
                        [ 1365966130, 4 ],
                        [ 1365966131, 3 ],
                        [ 1365966132, 7 ],
                        [ 1365966133, 1 ],
                        [ 1365966134, 8 ],
                        [ 1365966135, 6 ],
                        [ 1365966136, 7 ],
                        [ 1365966137, 9 ],
                        [ 1365966138, 2 ],
                        [ 1365966139, 3 ],
                        [ 1365966140, 4 ],
                        [ 1365966141, 3 ],
                        [ 1365966142, 7 ],
                        [ 1365966143, 1 ],
                        [ 1365966144, 8 ],
                        [ 1365966145, 6 ],
                        [ 1365966146, 7 ],
                        [ 1365966147, 9 ],
                        [ 1365966148, 2 ],
                        [ 1365966149, 3 ],
                        [ 1365966150, 4 ],
                        [ 1365966151, 3 ],
                        [ 1365966152, 7 ],
                        [ 1365966153, 1 ],
                        [ 1365966154, 8 ],
                        [ 1365966155, 6 ],
                        [ 1365966156, 7 ],
                        [ 1365966157, 9 ],
                        [ 1365966158, 2 ],
                        [ 1365966159, 3 ],
                        [ 1365966160, 4 ],
                        [ 1365966161, 3 ],
                        [ 1365966162, 7 ],
                        [ 1365966163, 1 ],
                        [ 1365966164, 8 ],
                        [ 1365966165, 6 ],
                        [ 1365966166, 7 ],
                        [ 1365966167, 9 ],
                        [ 1365966168, 2 ],
                        [ 1365966169, 3 ],
                        [ 1365966170, 4 ],
                        [ 1365966171, 3 ],
                        [ 1365966172, 7 ],
                        [ 1365966173, 1 ],
                        [ 1365966174, 8 ],
                        [ 1365966175, 6 ],
                        [ 1365966176, 7 ],
                        [ 1365966177, 9 ],
                        [ 1365966178, 2 ],
                        [ 1365966179, 3 ],
                        [ 1365966180, 4 ],
                        [ 1365966181, 3 ],
                        [ 1365966182, 7 ],
                        [ 1365966183, 1 ],
                        [ 1365966184, 8 ],
                        [ 1365966185, 6 ],
                        [ 1365966186, 7 ],
                        [ 1365966187, 9 ],
                        [ 1365966188, 2 ],
                        [ 1365966189, 3 ],
                        [ 1365966190, 4 ],
                        [ 1365966191, 3 ],
                        [ 1365966192, 7 ],
                        [ 1365966193, 1 ],
                        [ 1365966194, 8 ],
                        [ 1365966195, 6 ],
                        [ 1365966196, 7 ],
                        [ 1365966197, 9 ],
                        [ 1365966198, 2 ],
                        [ 1365966199, 3 ]
                            [ 1365966200, 1 ],
                        [ 1365966201, 1 ],
                        [ 1365966202, 2 ],
                        [ 1365966203, 5 ],
                        [ 1365966204, 3 ],
                        [ 1365966205, 2 ],
                        [ 1365966206, 1 ],
                        [ 1365966207, 4 ],
                        [ 1365966208, 10 ],
                        [ 1365966209, 9 ],
                        [ 1365966210, 4 ],
                        [ 1365966211, 3 ],
                        [ 1365966212, 7 ],
                        [ 1365966213, 1 ],
                        [ 1365966214, 8 ],
                        [ 1365966215, 6 ],
                        [ 1365966216, 7 ],
                        [ 1365966217, 9 ],
                        [ 1365966218, 2 ],
                        [ 1365966219, 3 ],
                        [ 1365966220, 4 ],
                        [ 1365966221, 3 ],
                        [ 1365966222, 7 ],
                        [ 1365966223, 1 ],
                        [ 1365966224, 8 ],
                        [ 1365966225, 6 ],
                        [ 1365966226, 7 ],
                        [ 1365966227, 9 ],
                        [ 1365966228, 2 ],
                        [ 1365966229, 3 ],
                        [ 1365966230, 4 ],
                        [ 1365966231, 3 ],
                        [ 1365966232, 7 ],
                        [ 1365966233, 1 ],
                        [ 1365966234, 8 ],
                        [ 1365966235, 6 ],
                        [ 1365966236, 7 ],
                        [ 1365966237, 9 ],
                        [ 1365966238, 2 ],
                        [ 1365966239, 3 ],
                        [ 1365966240, 4 ],
                        [ 1365966241, 3 ],
                        [ 1365966242, 7 ],
                        [ 1365966243, 1 ],
                        [ 1365966244, 8 ],
                        [ 1365966245, 6 ],
                        [ 1365966246, 7 ],
                        [ 1365966247, 9 ],
                        [ 1365966248, 2 ],
                        [ 1365966249, 3 ],
                        [ 1365966250, 4 ],
                        [ 1365966251, 3 ],
                        [ 1365966252, 7 ],
                        [ 1365966253, 1 ],
                        [ 1365966254, 8 ],
                        [ 1365966255, 6 ],
                        [ 1365966256, 7 ],
                        [ 1365966257, 9 ],
                        [ 1365966258, 2 ],
                        [ 1365966259, 3 ],
                        [ 1365966260, 4 ],
                        [ 1365966261, 3 ],
                        [ 1365966262, 7 ],
                        [ 1365966263, 1 ],
                        [ 1365966264, 8 ],
                        [ 1365966265, 6 ],
                        [ 1365966266, 7 ],
                        [ 1365966267, 9 ],
                        [ 1365966268, 2 ],
                        [ 1365966269, 3 ],
                        [ 1365966270, 4 ],
                        [ 1365966271, 3 ],
                        [ 1365966272, 7 ],
                        [ 1365966273, 1 ],
                        [ 1365966274, 8 ],
                        [ 1365966275, 6 ],
                        [ 1365966276, 7 ],
                        [ 1365966277, 9 ],
                        [ 1365966278, 2 ],
                        [ 1365966279, 3 ],
                        [ 1365966280, 4 ],
                        [ 1365966281, 3 ],
                        [ 1365966282, 7 ],
                        [ 1365966283, 1 ],
                        [ 1365966284, 8 ],
                        [ 1365966285, 6 ],
                        [ 1365966286, 7 ],
                        [ 1365966287, 9 ],
                        [ 1365966288, 2 ],
                        [ 1365966289, 3 ],
                        [ 1365966290, 4 ],
                        [ 1365966291, 3 ],
                        [ 1365966292, 7 ],
                        [ 1365966293, 1 ],
                        [ 1365966294, 8 ],
                        [ 1365966295, 6 ],
                        [ 1365966296, 7 ],
                        [ 1365966297, 9 ],
                        [ 1365966298, 2 ],
                        [ 1365966299, 3 ]
                            [ 1365966300, 1 ],
                        [ 1365966301, 1 ],
                        [ 1365966302, 2 ],
                        [ 1365966303, 5 ],
                        [ 1365966304, 3 ],
                        [ 1365966305, 2 ],
                        [ 1365966306, 1 ],
                        [ 1365966307, 4 ],
                        [ 1365966308, 10 ],
                        [ 1365966309, 9 ],
                        [ 1365966310, 4 ],
                        [ 1365966311, 3 ],
                        [ 1365966312, 7 ],
                        [ 1365966313, 1 ],
                        [ 1365966314, 8 ],
                        [ 1365966315, 6 ],
                        [ 1365966316, 7 ],
                        [ 1365966317, 9 ],
                        [ 1365966318, 2 ],
                        [ 1365966319, 3 ],
                        [ 1365966320, 4 ],
                        [ 1365966321, 3 ],
                        [ 1365966322, 7 ],
                        [ 1365966323, 1 ],
                        [ 1365966324, 8 ],
                        [ 1365966325, 6 ],
                        [ 1365966326, 7 ],
                        [ 1365966327, 9 ],
                        [ 1365966328, 2 ],
                        [ 1365966329, 3 ],
                        [ 1365966330, 4 ],
                        [ 1365966331, 3 ],
                        [ 1365966332, 7 ],
                        [ 1365966333, 1 ],
                        [ 1365966334, 8 ],
                        [ 1365966335, 6 ],
                        [ 1365966336, 7 ],
                        [ 1365966337, 9 ],
                        [ 1365966338, 2 ],
                        [ 1365966339, 3 ],
                        [ 1365966340, 4 ],
                        [ 1365966341, 3 ],
                        [ 1365966342, 7 ],
                        [ 1365966343, 1 ],
                        [ 1365966344, 8 ],
                        [ 1365966345, 6 ],
                        [ 1365966346, 7 ],
                        [ 1365966347, 9 ],
                        [ 1365966348, 2 ],
                        [ 1365966349, 3 ],
                        [ 1365966350, 4 ],
                        [ 1365966351, 3 ],
                        [ 1365966352, 7 ],
                        [ 1365966353, 1 ],
                        [ 1365966354, 8 ],
                        [ 1365966355, 6 ],
                        [ 1365966356, 7 ],
                        [ 1365966357, 9 ],
                        [ 1365966358, 2 ],
                        [ 1365966359, 3 ],
                        [ 1365966360, 4 ],
                        [ 1365966361, 3 ],
                        [ 1365966362, 7 ],
                        [ 1365966363, 1 ],
                        [ 1365966364, 8 ],
                        [ 1365966365, 6 ],
                        [ 1365966366, 7 ],
                        [ 1365966367, 9 ],
                        [ 1365966368, 2 ],
                        [ 1365966369, 3 ],
                        [ 1365966370, 4 ],
                        [ 1365966371, 3 ],
                        [ 1365966372, 7 ],
                        [ 1365966373, 1 ],
                        [ 1365966374, 8 ],
                        [ 1365966375, 6 ],
                        [ 1365966376, 7 ],
                        [ 1365966377, 9 ],
                        [ 1365966378, 2 ],
                        [ 1365966379, 3 ],
                        [ 1365966380, 4 ],
                        [ 1365966381, 3 ],
                        [ 1365966382, 7 ],
                        [ 1365966383, 1 ],
                        [ 1365966384, 8 ],
                        [ 1365966385, 6 ],
                        [ 1365966386, 7 ],
                        [ 1365966387, 9 ],
                        [ 1365966388, 2 ],
                        [ 1365966389, 3 ],
                        [ 1365966390, 4 ],
                        [ 1365966391, 3 ],
                        [ 1365966392, 7 ],
                        [ 1365966393, 1 ],
                        [ 1365966394, 8 ],
                        [ 1365966395, 6 ],
                        [ 1365966396, 7 ],
                        [ 1365966397, 9 ],
                        [ 1365966398, 2 ],
                        [ 1365966399, 3 ]
                            [ 1365966400, 1 ],
                        [ 1365966401, 1 ],
                        [ 1365966402, 2 ],
                        [ 1365966403, 5 ],
                        [ 1365966404, 3 ],
                        [ 1365966405, 2 ],
                        [ 1365966406, 1 ],
                        [ 1365966407, 4 ],
                        [ 1365966408, 10 ],
                        [ 1365966409, 9 ],
                        [ 1365966410, 4 ],
                        [ 1365966411, 3 ],
                        [ 1365966412, 7 ],
                        [ 1365966413, 1 ],
                        [ 1365966414, 8 ],
                        [ 1365966415, 6 ],
                        [ 1365966416, 7 ],
                        [ 1365966417, 9 ],
                        [ 1365966418, 2 ],
                        [ 1365966419, 3 ],
                        [ 1365966420, 4 ],
                        [ 1365966421, 3 ],
                        [ 1365966422, 7 ],
                        [ 1365966423, 1 ],
                        [ 1365966424, 8 ],
                        [ 1365966425, 6 ],
                        [ 1365966426, 7 ],
                        [ 1365966427, 9 ],
                        [ 1365966428, 2 ],
                        [ 1365966429, 3 ],
                        [ 1365966430, 4 ],
                        [ 1365966431, 3 ],
                        [ 1365966432, 7 ],
                        [ 1365966433, 1 ],
                        [ 1365966434, 8 ],
                        [ 1365966435, 6 ],
                        [ 1365966436, 7 ],
                        [ 1365966437, 9 ],
                        [ 1365966438, 2 ],
                        [ 1365966439, 3 ],
                        [ 1365966440, 4 ],
                        [ 1365966441, 3 ],
                        [ 1365966442, 7 ],
                        [ 1365966443, 1 ],
                        [ 1365966444, 8 ],
                        [ 1365966445, 6 ],
                        [ 1365966446, 7 ],
                        [ 1365966447, 9 ],
                        [ 1365966448, 2 ],
                        [ 1365966449, 3 ],
                        [ 1365966450, 4 ],
                        [ 1365966451, 3 ],
                        [ 1365966452, 7 ],
                        [ 1365966453, 1 ],
                        [ 1365966454, 8 ],
                        [ 1365966455, 6 ],
                        [ 1365966456, 7 ],
                        [ 1365966457, 9 ],
                        [ 1365966458, 2 ],
                        [ 1365966459, 3 ],
                        [ 1365966460, 4 ],
                        [ 1365966461, 3 ],
                        [ 1365966462, 7 ],
                        [ 1365966463, 1 ],
                        [ 1365966464, 8 ],
                        [ 1365966465, 6 ],
                        [ 1365966466, 7 ],
                        [ 1365966467, 9 ],
                        [ 1365966468, 2 ],
                        [ 1365966469, 3 ],
                        [ 1365966470, 4 ],
                        [ 1365966471, 3 ],
                        [ 1365966472, 7 ],
                        [ 1365966473, 1 ],
                        [ 1365966474, 8 ],
                        [ 1365966475, 6 ],
                        [ 1365966476, 7 ],
                        [ 1365966477, 9 ],
                        [ 1365966478, 2 ],
                        [ 1365966479, 3 ],
                        [ 1365966480, 4 ],
                        [ 1365966481, 3 ],
                        [ 1365966482, 7 ],
                        [ 1365966483, 1 ],
                        [ 1365966484, 8 ],
                        [ 1365966485, 6 ],
                        [ 1365966486, 7 ],
                        [ 1365966487, 9 ],
                        [ 1365966488, 2 ],
                        [ 1365966489, 3 ],
                        [ 1365966490, 4 ],
                        [ 1365966491, 3 ],
                        [ 1365966492, 7 ],
                        [ 1365966493, 1 ],
                        [ 1365966494, 8 ],
                        [ 1365966495, 6 ],
                        [ 1365966496, 7 ],
                        [ 1365966497, 9 ],
                        [ 1365966498, 2 ],
                        [ 1365966499, 3 ]
                            [ 1365966500, 1 ],
                        [ 1365966501, 1 ],
                        [ 1365966502, 2 ],
                        [ 1365966503, 5 ],
                        [ 1365966504, 3 ],
                        [ 1365966505, 2 ],
                        [ 1365966506, 1 ],
                        [ 1365966507, 4 ],
                        [ 1365966508, 10 ],
                        [ 1365966509, 9 ],
                        [ 1365966510, 4 ],
                        [ 1365966511, 3 ],
                        [ 1365966512, 7 ],
                        [ 1365966513, 1 ],
                        [ 1365966514, 8 ],
                        [ 1365966515, 6 ],
                        [ 1365966516, 7 ],
                        [ 1365966517, 9 ],
                        [ 1365966518, 2 ],
                        [ 1365966519, 3 ],
                        [ 1365966520, 4 ],
                        [ 1365966521, 3 ],
                        [ 1365966522, 7 ],
                        [ 1365966523, 1 ],
                        [ 1365966524, 8 ],
                        [ 1365966525, 6 ],
                        [ 1365966526, 7 ],
                        [ 1365966527, 9 ],
                        [ 1365966528, 2 ],
                        [ 1365966529, 3 ],
                        [ 1365966530, 4 ],
                        [ 1365966531, 3 ],
                        [ 1365966532, 7 ],
                        [ 1365966533, 1 ],
                        [ 1365966534, 8 ],
                        [ 1365966535, 6 ],
                        [ 1365966536, 7 ],
                        [ 1365966537, 9 ],
                        [ 1365966538, 2 ],
                        [ 1365966539, 3 ],
                        [ 1365966540, 4 ],
                        [ 1365966541, 3 ],
                        [ 1365966542, 7 ],
                        [ 1365966543, 1 ],
                        [ 1365966544, 8 ],
                        [ 1365966545, 6 ],
                        [ 1365966546, 7 ],
                        [ 1365966547, 9 ],
                        [ 1365966548, 2 ],
                        [ 1365966549, 3 ],
                        [ 1365966550, 4 ],
                        [ 1365966551, 3 ],
                        [ 1365966552, 7 ],
                        [ 1365966553, 1 ],
                        [ 1365966554, 8 ],
                        [ 1365966555, 6 ],
                        [ 1365966556, 7 ],
                        [ 1365966557, 9 ],
                        [ 1365966558, 2 ],
                        [ 1365966559, 3 ],
                        [ 1365966560, 4 ],
                        [ 1365966561, 3 ],
                        [ 1365966562, 7 ],
                        [ 1365966563, 1 ],
                        [ 1365966564, 8 ],
                        [ 1365966565, 6 ],
                        [ 1365966566, 7 ],
                        [ 1365966567, 9 ],
                        [ 1365966568, 2 ],
                        [ 1365966569, 3 ],
                        [ 1365966570, 4 ],
                        [ 1365966571, 3 ],
                        [ 1365966572, 7 ],
                        [ 1365966573, 1 ],
                        [ 1365966574, 8 ],
                        [ 1365966575, 6 ],
                        [ 1365966576, 7 ],
                        [ 1365966577, 9 ],
                        [ 1365966578, 2 ],
                        [ 1365966579, 3 ],
                        [ 1365966580, 4 ],
                        [ 1365966581, 3 ],
                        [ 1365966582, 7 ],
                        [ 1365966583, 1 ],
                        [ 1365966584, 8 ],
                        [ 1365966585, 6 ],
                        [ 1365966586, 7 ],
                        [ 1365966587, 9 ],
                        [ 1365966588, 2 ],
                        [ 1365966589, 3 ],
                        [ 1365966590, 4 ],
                        [ 1365966591, 3 ],
                        [ 1365966592, 7 ],
                        [ 1365966593, 1 ],
                        [ 1365966594, 8 ],
                        [ 1365966595, 6 ],
                        [ 1365966596, 7 ],
                        [ 1365966597, 9 ],
                        [ 1365966598, 2 ],
                        [ 1365966599, 3 ]
                            [ 1365966600, 1 ],
                        [ 1365966601, 1 ],
                        [ 1365966602, 2 ],
                        [ 1365966603, 5 ],
                        [ 1365966604, 3 ],
                        [ 1365966605, 2 ],
                        [ 1365966606, 1 ],
                        [ 1365966607, 4 ],
                        [ 1365966608, 10 ],
                        [ 1365966609, 9 ],
                        [ 1365966610, 4 ],
                        [ 1365966611, 3 ],
                        [ 1365966612, 7 ],
                        [ 1365966613, 1 ],
                        [ 1365966614, 8 ],
                        [ 1365966615, 6 ],
                        [ 1365966616, 7 ],
                        [ 1365966617, 9 ],
                        [ 1365966618, 2 ],
                        [ 1365966619, 3 ],
                        [ 1365966620, 4 ],
                        [ 1365966621, 3 ],
                        [ 1365966622, 7 ],
                        [ 1365966623, 1 ],
                        [ 1365966624, 8 ],
                        [ 1365966625, 6 ],
                        [ 1365966626, 7 ],
                        [ 1365966627, 9 ],
                        [ 1365966628, 2 ],
                        [ 1365966629, 3 ],
                        [ 1365966630, 4 ],
                        [ 1365966631, 3 ],
                        [ 1365966632, 7 ],
                        [ 1365966633, 1 ],
                        [ 1365966634, 8 ],
                        [ 1365966635, 6 ],
                        [ 1365966636, 7 ],
                        [ 1365966637, 9 ],
                        [ 1365966638, 2 ],
                        [ 1365966639, 3 ],
                        [ 1365966640, 4 ],
                        [ 1365966641, 3 ],
                        [ 1365966642, 7 ],
                        [ 1365966643, 1 ],
                        [ 1365966644, 8 ],
                        [ 1365966645, 6 ],
                        [ 1365966646, 7 ],
                        [ 1365966647, 9 ],
                        [ 1365966648, 2 ],
                        [ 1365966649, 3 ],
                        [ 1365966650, 4 ],
                        [ 1365966651, 3 ],
                        [ 1365966652, 7 ],
                        [ 1365966653, 1 ],
                        [ 1365966654, 8 ],
                        [ 1365966655, 6 ],
                        [ 1365966656, 7 ],
                        [ 1365966657, 9 ],
                        [ 1365966658, 2 ],
                        [ 1365966659, 3 ],
                        [ 1365966660, 4 ],
                        [ 1365966661, 3 ],
                        [ 1365966662, 7 ],
                        [ 1365966663, 1 ],
                        [ 1365966664, 8 ],
                        [ 1365966665, 6 ],
                        [ 1365966666, 7 ],
                        [ 1365966667, 9 ],
                        [ 1365966668, 2 ],
                        [ 1365966669, 3 ],
                        [ 1365966670, 4 ],
                        [ 1365966671, 3 ],
                        [ 1365966672, 7 ],
                        [ 1365966673, 1 ],
                        [ 1365966674, 8 ],
                        [ 1365966675, 6 ],
                        [ 1365966676, 7 ],
                        [ 1365966677, 9 ],
                        [ 1365966678, 2 ],
                        [ 1365966679, 3 ],
                        [ 1365966680, 4 ],
                        [ 1365966681, 3 ],
                        [ 1365966682, 7 ],
                        [ 1365966683, 1 ],
                        [ 1365966684, 8 ],
                        [ 1365966685, 6 ],
                        [ 1365966686, 7 ],
                        [ 1365966687, 9 ],
                        [ 1365966688, 2 ],
                        [ 1365966689, 3 ],
                        [ 1365966690, 4 ],
                        [ 1365966691, 3 ],
                        [ 1365966692, 7 ],
                        [ 1365966693, 1 ],
                        [ 1365966694, 8 ],
                        [ 1365966695, 6 ],
                        [ 1365966696, 7 ],
                        [ 1365966697, 9 ],
                        [ 1365966698, 2 ],
                        [ 1365966699, 3 ]
                            [ 1365966700, 1 ],
                        [ 1365966701, 1 ],
                        [ 1365966702, 2 ],
                        [ 1365966703, 5 ],
                        [ 1365966704, 3 ],
                        [ 1365966705, 2 ],
                        [ 1365966706, 1 ],
                        [ 1365966707, 4 ],
                        [ 1365966708, 10 ],
                        [ 1365966709, 9 ],
                        [ 1365966710, 4 ],
                        [ 1365966711, 3 ],
                        [ 1365966712, 7 ],
                        [ 1365966713, 1 ],
                        [ 1365966714, 8 ],
                        [ 1365966715, 6 ],
                        [ 1365966716, 7 ],
                        [ 1365966717, 9 ],
                        [ 1365966718, 2 ],
                        [ 1365966719, 3 ],
                        [ 1365966720, 4 ],
                        [ 1365966721, 3 ],
                        [ 1365966722, 7 ],
                        [ 1365966723, 1 ],
                        [ 1365966724, 8 ],
                        [ 1365966725, 6 ],
                        [ 1365966726, 7 ],
                        [ 1365966727, 9 ],
                        [ 1365966728, 2 ],
                        [ 1365966729, 3 ],
                        [ 1365966730, 4 ],
                        [ 1365966731, 3 ],
                        [ 1365966732, 7 ],
                        [ 1365966733, 1 ],
                        [ 1365966734, 8 ],
                        [ 1365966735, 6 ],
                        [ 1365966736, 7 ],
                        [ 1365966737, 9 ],
                        [ 1365966738, 2 ],
                        [ 1365966739, 3 ],
                        [ 1365966740, 4 ],
                        [ 1365966741, 3 ],
                        [ 1365966742, 7 ],
                        [ 1365966743, 1 ],
                        [ 1365966744, 8 ],
                        [ 1365966745, 6 ],
                        [ 1365966746, 7 ],
                        [ 1365966747, 9 ],
                        [ 1365966748, 2 ],
                        [ 1365966749, 3 ],
                        [ 1365966750, 4 ],
                        [ 1365966751, 3 ],
                        [ 1365966752, 7 ],
                        [ 1365966753, 1 ],
                        [ 1365966754, 8 ],
                        [ 1365966755, 6 ],
                        [ 1365966756, 7 ],
                        [ 1365966757, 9 ],
                        [ 1365966758, 2 ],
                        [ 1365966759, 3 ],
                        [ 1365966760, 4 ],
                        [ 1365966761, 3 ],
                        [ 1365966762, 7 ],
                        [ 1365966763, 1 ],
                        [ 1365966764, 8 ],
                        [ 1365966765, 6 ],
                        [ 1365966766, 7 ],
                        [ 1365966767, 9 ],
                        [ 1365966768, 2 ],
                        [ 1365966769, 3 ],
                        [ 1365966770, 4 ],
                        [ 1365966771, 3 ],
                        [ 1365966772, 7 ],
                        [ 1365966773, 1 ],
                        [ 1365966774, 8 ],
                        [ 1365966775, 6 ],
                        [ 1365966776, 7 ],
                        [ 1365966777, 9 ],
                        [ 1365966778, 2 ],
                        [ 1365966779, 3 ],
                        [ 1365966780, 4 ],
                        [ 1365966781, 3 ],
                        [ 1365966782, 7 ],
                        [ 1365966783, 1 ],
                        [ 1365966784, 8 ],
                        [ 1365966785, 6 ],
                        [ 1365966786, 7 ],
                        [ 1365966787, 9 ],
                        [ 1365966788, 2 ],
                        [ 1365966789, 3 ],
                        [ 1365966790, 4 ],
                        [ 1365966791, 3 ],
                        [ 1365966792, 7 ],
                        [ 1365966793, 1 ],
                        [ 1365966794, 8 ],
                        [ 1365966795, 6 ],
                        [ 1365966796, 7 ],
                        [ 1365966797, 9 ],
                        [ 1365966798, 2 ],
                        [ 1365966799, 3 ]
                            [ 1365966800, 1 ],
                        [ 1365966801, 1 ],
                        [ 1365966802, 2 ],
                        [ 1365966803, 5 ],
                        [ 1365966804, 3 ],
                        [ 1365966805, 2 ],
                        [ 1365966806, 1 ],
                        [ 1365966807, 4 ],
                        [ 1365966808, 10 ],
                        [ 1365966809, 9 ],
                        [ 1365966810, 4 ],
                        [ 1365966811, 3 ],
                        [ 1365966812, 7 ],
                        [ 1365966813, 1 ],
                        [ 1365966814, 8 ],
                        [ 1365966815, 6 ],
                        [ 1365966816, 7 ],
                        [ 1365966817, 9 ],
                        [ 1365966818, 2 ],
                        [ 1365966819, 3 ],
                        [ 1365966820, 4 ],
                        [ 1365966821, 3 ],
                        [ 1365966822, 7 ],
                        [ 1365966823, 1 ],
                        [ 1365966824, 8 ],
                        [ 1365966825, 6 ],
                        [ 1365966826, 7 ],
                        [ 1365966827, 9 ],
                        [ 1365966828, 2 ],
                        [ 1365966829, 3 ],
                        [ 1365966830, 4 ],
                        [ 1365966831, 3 ],
                        [ 1365966832, 7 ],
                        [ 1365966833, 1 ],
                        [ 1365966834, 8 ],
                        [ 1365966835, 6 ],
                        [ 1365966836, 7 ],
                        [ 1365966837, 9 ],
                        [ 1365966838, 2 ],
                        [ 1365966839, 3 ],
                        [ 1365966840, 4 ],
                        [ 1365966841, 3 ],
                        [ 1365966842, 7 ],
                        [ 1365966843, 1 ],
                        [ 1365966844, 8 ],
                        [ 1365966845, 6 ],
                        [ 1365966846, 7 ],
                        [ 1365966847, 9 ],
                        [ 1365966848, 2 ],
                        [ 1365966849, 3 ],
                        [ 1365966850, 4 ],
                        [ 1365966851, 3 ],
                        [ 1365966852, 7 ],
                        [ 1365966853, 1 ],
                        [ 1365966854, 8 ],
                        [ 1365966855, 6 ],
                        [ 1365966856, 7 ],
                        [ 1365966857, 9 ],
                        [ 1365966858, 2 ],
                        [ 1365966859, 3 ],
                        [ 1365966860, 4 ],
                        [ 1365966861, 3 ],
                        [ 1365966862, 7 ],
                        [ 1365966863, 1 ],
                        [ 1365966864, 8 ],
                        [ 1365966865, 6 ],
                        [ 1365966866, 7 ],
                        [ 1365966867, 9 ],
                        [ 1365966868, 2 ],
                        [ 1365966869, 3 ],
                        [ 1365966870, 4 ],
                        [ 1365966871, 3 ],
                        [ 1365966872, 7 ],
                        [ 1365966873, 1 ],
                        [ 1365966874, 8 ],
                        [ 1365966875, 6 ],
                        [ 1365966876, 7 ],
                        [ 1365966877, 9 ],
                        [ 1365966878, 2 ],
                        [ 1365966879, 3 ],
                        [ 1365966880, 4 ],
                        [ 1365966881, 3 ],
                        [ 1365966882, 7 ],
                        [ 1365966883, 1 ],
                        [ 1365966884, 8 ],
                        [ 1365966885, 6 ],
                        [ 1365966886, 7 ],
                        [ 1365966887, 9 ],
                        [ 1365966888, 2 ],
                        [ 1365966889, 3 ],
                        [ 1365966890, 4 ],
                        [ 1365966891, 3 ],
                        [ 1365966892, 7 ],
                        [ 1365966893, 1 ],
                        [ 1365966894, 8 ],
                        [ 1365966895, 6 ],
                        [ 1365966896, 7 ],
                        [ 1365966897, 9 ],
                        [ 1365966898, 2 ],
                        [ 1365966899, 3 ]
                    ]
                }
            ];

            var parsed = renderer.cubism_parser(json, 1365967000, 1000, 1366067000, true, false);

            expect(parsed).toEqualData([[]]);
        });

        it('should skip datapoints not on step boundary when parsing for cubism', function() {
            var json = [
                {
                    "metric": "tsd.hbase.puts",
                    "tags": {},
                    "dps": [
                        [ 1365966000, 1 ],
                        [ 1365966001, 1 ],
                        [ 1365966002, 2 ],
                        [ 1365966003, 5 ],
                        [ 1365966004, 3 ],
                        [ 1365966005, 2 ],
                        [ 1365966006, 1 ],
                        [ 1365966007, 4 ],
                        [ 1365966008, 10 ],
                        [ 1365966009, 9 ],
                        [ 1365966010, 4 ]
                    ]

                }
            ];

            var parsed = renderer.cubism_parser(json, 1365966000, 10, 1365966010, false, false);

            expect(parsed).toEqualData([[1,4]]);
        });
    });
});

