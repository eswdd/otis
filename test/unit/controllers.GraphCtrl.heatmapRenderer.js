'use strict';

/* jasmine specs for controllers go here */
describe('Aardvark controllers', function () {

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

    describe('GraphCtrl.heatmapRenderer', function() {
        var rootScope, $httpBackend, scope;
        var configUpdateFunc;
        var heatmapMock;
        var globalHeatmap = null;

        var heatmap = function() {
            if (globalHeatmap != null) {
                return globalHeatmap;
            }

            var ret = {};

            ret._dps = null;
            ret._scale = null;
            ret._cellSize = null;
            ret._width = null;
            ret._height = null;

            ret.tearDown = function() {
                globalHeatmap = null;
            }

            ret.dps = function(_) {
                if (!arguments.length) {
                    return ret._dps;
                }
                ret._dps = _;
                return ret;
            };

            ret.scale = function(_) {
                if (!arguments.length) {
                    return ret._scale;
                }
                ret._scale = _;
                return ret;
            };

            ret.cellSize = function(_) {
                if (!arguments.length) {
                    return ret._cellSize;
                }
                ret._cellSize = _;
                return ret;
            }

            ret.width = function(_) {
                if (!arguments.length) {
                    return ret._width;
                }
                ret._width = _;
                return ret;
            }

            ret.height = function(_) {
                if (!arguments.length) {
                    return ret._height;
                }
                ret._height = _;
                return ret;
            }

            ret.weekDayRender = function(divSelector, fromYear, toYear) {
                ret.weekDayRenderParams = [divSelector, fromYear, toYear];
            }

            ret.dayHourRender = function(divSelector, fromMonth, toMonth) {
                ret.dayHourRenderParams = [divSelector, fromMonth, toMonth];
            }

            globalHeatmap = ret;

            return ret;
        }

        beforeEach(inject(function ($rootScope, _$httpBackend_, $controller) {
            // hmm
            rootScope = $rootScope;
            $httpBackend = _$httpBackend_;
            scope = $rootScope.$new();

            scope.renderers = {};

            rootScope.model = {
                graphs: [],
                metrics: []
            }

            rootScope.config = {
                tsdbHost: "tsdb",
                tsdbPort: 4242, 
                tsdbProtocol: "http"
            }

            rootScope.formEncode = function(val) {
                var ret = val.replace(" ","+");
                if (ret != val) {
                    return rootScope.formEncode(ret);
                }
                return ret;
            }

            rootScope.onConfigUpdate = function(func) {
                configUpdateFunc = func;
            }

            $controller('GraphCtrl', {$scope: scope, $rootScope: rootScope});

            scope.heatmap = heatmap;
            heatmapMock = heatmap();
        }));
        
        afterEach(function() {
            heatmapMock.tearDown();
        })

        it('should report an error when trying to render with heatmap and no start time', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};

            var global = { relativePeriod: "", autoReload: false };
            var graph = { id: "abc", graphWidth: 640, graphHeight: 100 };
            var metrics = [ { id: "123", graphOptions: {} } ];

            scope.renderers.heatmap(global, graph, metrics);

            expect(scope.renderErrors).toEqualData({abc:"No start date specified"});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render when day/hour style requested', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
//
            var global = { fromDate: "2016/09/02", fromTime: "00:00:00", toDate: "2016/09/12", toTime: "00:00:00", absoluteTimeSpecification: true };
            var graph = { id: "abc", graphWidth: 10, graphHeight: 10, heatmap: { style: "day_hour" } };
            var metrics = [ { id: "123", name:"metric1", graphOptions: {aggregator: "sum"}, tags: [] } ];
//
            scope.renderers.heatmap(global, graph, metrics);
            
            $httpBackend.expectGET("http://tsdb:4242/api/query?start=2016/09/02 00:00:00&end=2016/09/12 00:00:00&m=sum:1h-avg:metric1&ms=true&arrays=true").respond([
                {metric: "metric1", tags: {}, dps:[
                    [1472783200000, 10],
                    [1472786800000, 20],
                    [1472790400000, 30],
                    [1473136000000, 40],
                    [1473568000000, 50]
                ]}
            ]);
            $httpBackend.flush();
            
            expect(heatmapMock.cellSize()).toEqualData(5);
            
            expect(heatmapMock.dayHourRenderParams).toEqualData([
                "#heatmapDiv_abc",
                24200,
                24200
            ]);
            
            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });

        it('should render when week/day style requested', function() {
            scope.renderedContent = {};
            scope.renderErrors = {};
            scope.renderWarnings = {};
//
            var global = { relativePeriod: "2w", autoReload: false };
            var graph = { id: "abc", graphWidth: 10, graphHeight: 10, heatmap: { style: "week_day" } };
            var metrics = [ { id: "123", name:"metric1", graphOptions: {aggregator: "sum"}, tags: [] } ];
//
            scope.renderers.heatmap(global, graph, metrics);
            
            $httpBackend.expectGET("http://tsdb:4242/api/query?start=2w-ago&ignore=1&m=sum:1d-avg:metric1&ms=true&arrays=true").respond([
                {metric: "metric1", tags: {}, dps:[
                    [1234483200000, 10],
                    [1234569600000, 20],
                    [1234656000000, 30],
                    [1235001600000, 40],
                    [1235433600000, 50]
                ]}
            ]);
            $httpBackend.flush();


            expect(heatmapMock.cellSize()).toEqualData(5);

            expect(heatmapMock.weekDayRenderParams).toEqualData([
                "#heatmapDiv_abc",
                2016,
                2016
            ]);

            expect(scope.renderErrors).toEqualData({});
            expect(scope.renderWarnings).toEqualData({});
        });
    });
});

//            expect(renderDiv.innerHTML).toEqualData("z");
// svg
// -> g
//   -> text
//   -> rect.cell (1 per hour)
//     -> text
/*
 var svg = renderDiv.childNodes[0];
 expect(svg.nodeName).toEqualData("svg");
 expect(svg.attributes.width.value).toEqualData("175");
 expect(svg.attributes.height.value).toEqualData("125");
 expect(svg.attributes.class.value).toEqualData("RdYlGn");
 var g = svg.childNodes[0];
 expect(g.nodeName).toEqualData("g");
 expect(g.attributes.transform != null).toEqualData(true);
 var text = g.childNodes[0];
 expect(text.nodeName).toEqualData("text");
 expect(text.attributes.transform.value).toEqualData("translate(-6,60)rotate(-90)");
 expect(text.textContent).toEqualData("9/2016");
 expect(g.childNodes.length).toEqualData(721); // 30d + 1
 for (var i=1; i< g.childNodes.length; i++) {
 var rect = g.childNodes[i];
 expect(rect.nodeName).toEqualData("rect");
 var rect_text = rect.childNodes[0];
 expect(rect_text.nodeName).toEqualData("title");
 }
 for (var d=1; d<=30; d++) {
 for (var h=0; h<24; h++) {
 var i = ((d-1)*24) + h + 1;
 // <rect y=\"85\" x=\"150\" height=\"5\" width=\"5\" class=\"cell\"><title>2016-08-31 @ 17</title></rect>
 var rect = g.childNodes[i];
 if (rect == null) {
 fail("off the end, went looking for "+i);
 break;
 }
 else {
 expect(rect.attributes.height.value).toEqualData("5");
 expect(rect.attributes.width.value).toEqualData("5");
 var rect_text = rect.childNodes[0];
 var d_string = d<10 ? "0"+d : d;
 var h_string = h<10 ? "0"+h : h;
 var expectedValue = null;
 var expectedClass = null;
 if (d==2 && h==3) {
 expectedValue = "10";
 expectedClass = "q0-11";
 }
 else if (d==2 && h == 4) {
 expectedValue = "20";
 expectedClass = "q2-11";
 }
 else if (d==2 && h == 5) {
 expectedValue = "30";
 expectedClass = "q5-11";
 }
 else if (d==6 && h == 5) {
 expectedValue = "40";
 expectedClass = "q8-11";
 }
 else if (d==11 && h == 5) {
 expectedValue = "50";
 expectedClass = "q10-11";
 }
 if (expectedValue != null) {
 expect(rect.attributes.class.value).toEqualData("cell "+expectedClass);
 expect(rect_text.textContent).toEqualData("2016-09-"+d_string+" @ "+h_string+": "+expectedValue);
 }
 else {
 expect(rect.attributes.class.value).toEqualData("cell");
 expect(rect_text.textContent).toEqualData("2016-09-"+d_string+" @ "+h_string);
 }
 }
 }
 }*/
