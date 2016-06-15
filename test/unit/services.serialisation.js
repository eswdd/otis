'use strict';

describe('AardvarkServices.serialisation', function() {
    
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
    
    it('expects the serialisation factory to exist', inject(function(serialisation) {
        expect(serialisation).toBeDefined();
    }));
    
    it('expects the string paths to be correct', inject(function(serialisation) {
        expect(serialisation.stringPaths).toEqualData([
            {path:"graphs.title.",sep:" "},
            {path:"graphs.gnuplot.yAxisLabel.",sep:" "},
            {path:"graphs.gnuplot.y2AxisLabel.",sep:" "},
            {path:"graphs.gnuplot.yAxisFormat.",sep:" "},
            {path:"graphs.gnuplot.y2AxisFormat.",sep:" "},
            {path:"graphs.gnuplot.yAxisRange.",sep:":"},
            {path:"graphs.gnuplot.y2AxisRange.",sep:":"},
            {path:"metrics.name.",sep:"."},
            {path:"metrics.tags.name.",sep:"."},
            {path:"metrics.tags.value.",sep:"."}
        ]);
    }));
    
    it('expects the serialisation module to be able to round trip a fully populated model with 5 metrics on 5 graphs in a small amount of space', inject(function(serialisation) {
        var model = {
            global: {
                absoluteTimeSpecification: false,
                autoReload: false,
                autoGraphHeight: true,
                relativePeriod: "2h",
                minGraphHeight: 300
            },
            graphs: [
                {
                    id: "1462986273911",
                    type: "debug",
                    title: "Graph 1"
                },
                {
                    id: "1462986273912",
                    type: "gnuplot",
                    title: "Graph 2",
                    gnuplot: {
                        yAxisLabel: "",
                        y2AxisLabel: "",
                        yAxisFormat: "lines",
                        y2AxisFormat: "linespoints",
                        yAxisRange: "[0:]",
                        y2AxisRange: "[1:]",
                        yAxisLogScale: true,
                        y2AxisLogScale: false,
                        showKey: true,
                        keyBox: false,
                        lineSmoothing: true,
                        keyAlignment: "horizontal",
                        keyLocation: "bottom right"
                    }
                },
                {
                    id: "1462986273913",
                    type: "horizon",
                    title: "Graph 3",
                    horizon: {
                        interpolateGaps: true,
                        squashNegative: true
                    }
                },
                {
                    id: "1462986273914",
                    type: "dygraph",
                    title: "Graph 4",
                    dygraph: {
                        interpolateGaps: true,
                        highlightLines: true,
                        stackedLines: true,
                        squashNegative: true,
                        autoScale: true,
                        ylog: false,
                        meanAdjusted: true,
                        countFilter: {
                            end: "top",
                            count: "5",
                            measure: "max"
                        },
                        valueFilter: {
                            lowerBound: "200",
                            upperBound: "500",
                            measure: "any"
                        }
                    }
                },
                {
                    id: "1462986273915",
                    type: "scatter",
                    title: "Graph 5",
                    scatter: {
                        excludeNegative: true
                    }
                }
                
            ],
            metrics: [
                {
                    id: "1462986273911",
                    name: "cpu.percent",
                    tags: [],
                    graphOptions: {
                        graphId: "1462986273911",
                        rate: true,
                        rateCounter: false,
                        rateCounterReset: "",
                        rateCounterMax: "",
                        rightAxis: true,
                        aggregator: "sum",
                        downsample: true,
                        downsampleBy: "avg",
                        downsampleTo: "2m",
                        scatter: null
                    }
                },
                {
                    id: "1462986273912",
                    name: "cpu.interrupts",
                    tags: [{name:"host",value:"*"}],
                    graphOptions: {
                        graphId: "1462986273912",
                        rate: true,
                        rateCounter: true,
                        rateCounterReset: 1234,
                        rateCounterMax: 12345,
                        rightAxis: false,
                        aggregator: "sum",
                        downsample: false,
                        downsampleBy: "",
                        downsampleTo: "",
                        scatter: null
                    }
                },
                {
                    id: "1462986273913",
                    name: "some.app.metric1",
                    tags: [{name:"host",value:"host1|host2"}],
                    graphOptions: {
                        graphId: "1462986273913",
                        rate: false,
                        rateCounter: false,
                        rateCounterReset: "",
                        rateCounterMax: "",
                        rightAxis: false,
                        aggregator: "sum",
                        downsample: false,
                        downsampleBy: "",
                        downsampleTo: "",
                        scatter: null
                    }
                },
                {
                    id: "1462986273914",
                    name: "some.app.metric2",
                    tags: [{name:"host",value:"host1"},{name:"type",value:"in|out"}],
                    graphOptions: {
                        graphId: "1462986273914",
                        rate: false,
                        rateCounter: false,
                        rateCounterReset: "",
                        rateCounterMax: "",
                        rightAxis: false,
                        aggregator: "sum",
                        downsample: false,
                        downsampleBy: "",
                        downsampleTo: "",
                        scatter: null
                    }
                },
                {
                    id: "1462986273915",
                    name: "some.app.metric3",
                    tags: [{name:"host",value:""}],
                    graphOptions: {
                        graphId: "1462986273915",
                        rate: true,
                        rateCounter: true,
                        rateCounterReset: 1234,
                        rateCounterMax: 12345,
                        rightAxis: false,
                        aggregator: "sum",
                        downsample: false,
                        downsampleBy: "",
                        downsampleTo: "",
                        scatter: {
                            axis: "y"
                        }
                    }
                }
            ]
        };
        var serialised = serialisation.serialise(model);
        expect(serialised.length).toBeLessThan(600); // http://aardvark/# = 23 bytes - allow 17 for fqdn suffix 
        var deserialised = serialisation.deserialise(serialised);
        
        // fix the model to what we expect
        serialisation.compactIds(model);
        model.metrics[4].tags = []; // tag had value "" which won't be serialised
        
        // don't care about any other component, plus it's easier to debug individual bits
        expect(deserialised.global).toEqualData(model.global);
        expect(deserialised.graphs.length).toEqualData(model.graphs.length);
        for (var g=0; g<model.graphs.length; g++) {
            expect(deserialised.graphs[g]).toEqualData(model.graphs[g]);
        }
        expect(deserialised.metrics.length).toEqualData(model.metrics.length);
        for (var m=0; m<model.metrics.length; m++) {
            expect(deserialised.metrics[m]).toEqualData(model.metrics[m]);
        }
    }));
    
    it('expects the serialisation module to be able to round trip a fully populated model with 5 metrics on 2 graphs in a small amount of space', inject(function(serialisation) {
        var model = {
            global: {
                absoluteTimeSpecification: false,
                autoReload: false,
                autoGraphHeight: true,
                relativePeriod: "2h",
                minGraphHeight: 300
            },
            graphs: [
                {
                    id: "1462986273912",
                    type: "gnuplot",
                    title: "Graph 2",
                    gnuplot: {
                        yAxisLabel: "",
                        y2AxisLabel: "",
                        yAxisFormat: "lines",
                        y2AxisFormat: "linespoints",
                        yAxisRange: "[0:]",
                        y2AxisRange: "[1:]",
                        yAxisLogScale: true,
                        y2AxisLogScale: false,
                        showKey: true,
                        keyBox: false,
                        lineSmoothing: true,
                        keyAlignment: "horizontal",
                        keyLocation: "bottom right"
                    }
                },
                {
                    id: "1462986273914",
                    type: "dygraph",
                    title: "Graph 4",
                    dygraph: {
                        interpolateGaps: true,
                        highlightLines: true,
                        stackedLines: true,
                        squashNegative: true,
                        autoScale: true,
                        ylog: false,
                        meanAdjusted: true,
                        countFilter: {
                            end: "top",
                            count: "5",
                            measure: "max"
                        },
                        valueFilter: {
                            lowerBound: "200",
                            upperBound: "500",
                            measure: "any"
                        }
                    }
                },
                {
                    id: "1462986273915",
                    type: "scatter",
                    title: "Graph 5",
                    scatter: {
                        excludeNegative: true
                    }
                }
                
            ],
            metrics: [
                {
                    id: "1462986273911",
                    name: "cpu.percent",
                    tags: [],
                    graphOptions: {
                        graphId: "1462986273912",
                        rate: true,
                        rateCounter: false,
                        rateCounterReset: "",
                        rateCounterMax: "",
                        rightAxis: true,
                        aggregator: "sum",
                        downsample: true,
                        downsampleBy: "avg",
                        downsampleTo: "2m",
                        scatter: null
                    }
                },
                {
                    id: "1462986273912",
                    name: "cpu.interrupts",
                    tags: [{name:"host",value:"*"}],
                    graphOptions: {
                        graphId: "1462986273912",
                        rate: true,
                        rateCounter: true,
                        rateCounterReset: 1234,
                        rateCounterMax: 12345,
                        rightAxis: false,
                        aggregator: "sum",
                        downsample: false,
                        downsampleBy: "",
                        downsampleTo: "",
                        scatter: null
                    }
                },
                {
                    id: "1462986273913",
                    name: "some.app.metric1",
                    tags: [{name:"host",value:"host1|host2"}],
                    graphOptions: {
                        graphId: "1462986273912",
                        rate: false,
                        rateCounter: false,
                        rateCounterReset: "",
                        rateCounterMax: "",
                        rightAxis: false,
                        aggregator: "sum",
                        downsample: false,
                        downsampleBy: "",
                        downsampleTo: "",
                        scatter: null
                    }
                },
                {
                    id: "1462986273914",
                    name: "some.app.metric2",
                    tags: [{name:"host",value:"host1"},{name:"type",value:"in|out"}],
                    graphOptions: {
                        graphId: "1462986273914",
                        rate: false,
                        rateCounter: false,
                        rateCounterReset: "",
                        rateCounterMax: "",
                        rightAxis: false,
                        aggregator: "sum",
                        downsample: false,
                        downsampleBy: "",
                        downsampleTo: "",
                        scatter: null
                    }
                },
                {
                    id: "1462986273915",
                    name: "some.app.metric3",
                    tags: [{name:"host",value:""}],
                    graphOptions: {
                        graphId: "1462986273914",
                        rate: true,
                        rateCounter: true,
                        rateCounterReset: 1234,
                        rateCounterMax: 12345,
                        rightAxis: false,
                        aggregator: "sum",
                        downsample: false,
                        downsampleBy: "",
                        downsampleTo: "",
                        scatter: {
                            axis: "y"
                        }
                    }
                }
            ]
        };
        var serialised = serialisation.serialise(model);
        expect(serialised.length).toBeLessThan(501); // http://aardvark/# = 23 bytes - allow 17 for fqdn suffix 
        var deserialised = serialisation.deserialise(serialised);
        
        // fix the model to what we expect
        serialisation.compactIds(model);
        model.metrics[4].tags = []; // tag had value "" which won't be serialised
        
        // don't care about any other component, plus it's easier to debug individual bits
        expect(deserialised.global).toEqualData(model.global);
        expect(deserialised.graphs.length).toEqualData(model.graphs.length);
        for (var g=0; g<model.graphs.length; g++) {
            expect(deserialised.graphs[g]).toEqualData(model.graphs[g]);
        }
        expect(deserialised.metrics.length).toEqualData(model.metrics.length);
        for (var m=0; m<model.metrics.length; m++) {
            expect(deserialised.metrics[m]).toEqualData(model.metrics[m]);
        }
    }));

});