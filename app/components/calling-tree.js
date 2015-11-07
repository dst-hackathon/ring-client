import Ember from 'ember';

export default Ember.Component.extend({
  tagName: 'svg',
  attributeBindings: 'width height'.w(),
  margin: {
    top: 50,
    right: 20,
    bottom: 30,
    left: 40
  },

  transform: function() {
    return 'translate(' + this.get('margin').left + ',' + this.get('margin').top + ')';
  }.property('width', 'height'),

  draw: function() {
    var data = this.get('data');
    data.x0 = this.get('width') / 2;
    data.y0 = 0;

    var width = this.get('width') - this.get('margin').left - this.get('margin').right;
    var height = this.get('height') - this.get('margin').top - this.get('margin').bottom;
    var duration = 400;
    var i = 0;
    var svg = d3.select('#' + this.get('elementId')).select('g');
    var tree = d3.layout.tree().size([height, width]);
    var collapse = function(d) {
      if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
      }
    };

    var click = function(d) {
      if (d.children) {
        d._children = d.children;
        d.children = null;
      } else {
        d.children = d._children;
        d._children = null;
      }
      update(d);
    };

    var ui = {
      layerHeight: 100,
      circle: {
        type: 'circle',
        radius: 20
      }
    };

    var update = function(source) {
      var nodes = tree.nodes(data).reverse();
      var links = tree.links(nodes);
      nodes.forEach(function(d) {
        console.log(d.depth);
        console.log(d.depth);
        d.y = (d.depth + 1) * ui.layerHeight;
      });

      var node = svg.selectAll("g.node").data(nodes, function(d) {
        return d.id || (d.id = ++i);
      });

      var nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", function() {
          return "translate(" + source.x0 + "," + source.y0 + ")";
        })
        .on("click", click);

      nodeEnter.append("circle")
        .attr("r", ui.circle.radius)
        .style("fill", "#fff");

      nodeEnter.append("text")
        .attr("y", function(d) {
          return d.children || d._children ? -28 : 28;
        })
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .text(function(d) {
          return d.name;
        })
        .style("fill-opacity", 1);

      // Transition nodes to their new position.
      var nodeUpdate = node.transition()
        .duration(duration)
        .attr("transform", function(d) {
          return "translate(" + d.x + "," + d.y + ")";
        });

      nodeUpdate.select("circle")
        .attr("r", ui.circle.radius)
        .style("fill", function(d) {
          return d._children ? "lightsteelblue" : "#fff";
        });

      nodeUpdate.select("text")
        .style("fill-opacity", 1);

      // Transition exiting nodes to the parent's new position.
      var nodeExit = node.exit().transition()
        .duration(duration)
        .attr("transform", function() {
          return "translate(" + source.x + "," + source.y + ")";
        })
        .remove();

      nodeExit.select("circle")
        .attr("r", ui.circle.radius);

      nodeExit.select("text")
        .style("fill-opacity", ui.circle.radius);

      var diagonal = d3.svg.line().interpolate('step-before')
        .x(function(d) {
          return d.x;
        })
        .y(function(d) {
          return d.y;
        });

      var link = svg.selectAll("path.link").data(links, function(d) {
        return d.target.id;
      });

      link.enter().insert("path", "g")
        .attr("class", "link")
        .attr('d', function(d) {
          return diagonal([{
            x: d.source.x0,
            y: d.source.y0 + ui.circle.radius
          }, {
            x: d.source.x0,
            y: d.source.y0 - ui.circle.radius
          }]);
        });

      // Transition links to their new position.
      link.transition()
        .duration(duration)
        .attr("d", function(d) {
          return diagonal([{
            x: d.source.x,
            y: d.source.y + ui.circle.radius
          }, {
            x: d.target.x,
            y: d.target.y - ui.layerHeight / 2
          }, {
            x: d.target.x,
            y: d.target.y - ui.circle.radius
          }]);
        });

      // Transition exiting nodes to the parent's new position.
      link.exit().transition()
        .duration(duration)
        .attr("d", function() {
          return diagonal([{
            x: source.x,
            y: source.y
          }, {
            x: source.x,
            y: source.y
          }, {
            x: source.x,
            y: source.y
          }]);
        })
        .remove();

      // Stash the old positions for transition.
      nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    };

    data.children.forEach(collapse);
    update(data);

  }.on('didInsertElement')
});