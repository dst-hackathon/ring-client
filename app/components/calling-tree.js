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
    var svgGroup = svg.append("g");
    var nodes;
    var links;
    var translateCoords;
    // panning variables
    var panTimer;
    var panSpeed = 200;
    var panBoundary = 20; // Within 20px from edges will pan when dragging.
    var scale;
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

    // Define the zoom function for the zoomable tree
    var zoom = function() {
      svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }
    // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
    var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

    var initiateDrag = function(d, domNode) {
      var nodePaths;
      var nodesExit;
      draggingNode = d;
      d3.select(domNode).select('.ghostCircle').attr('pointer-events', 'none');
      d3.selectAll('.ghostCircle').attr('class', 'ghostCircle show');
      d3.select(domNode).attr('class', 'node activeDrag');

      svgGroup.selectAll("g.node").sort(function(a, b) { // select the parent and sort the path's
        if (a.id != draggingNode.id) return 1; // a is not the hovered element, send "a" to the back
        else return -1; // a is the hovered element, bring "a" to the front
      });
      // if nodes has children, remove the links and nodes
      if (nodes.length > 1) {
        // remove link paths
        links = tree.links(nodes);
        nodePaths = svgGroup.selectAll("path.link")
          .data(links, function(d) {
            return d.target.id;
          }).remove();
        // remove child nodes
        nodesExit = svgGroup.selectAll("g.node")
          .data(nodes, function(d) {
            return d.id;
          }).filter(function(d, i) {
            if (d.id == draggingNode.id) {
              return false;
            }
            return true;
          }).remove();
      }
    };

    var endDrag = function() {
      selectedNode = null;
      d3.selectAll('.ghostCircle').attr('class', 'ghostCircle');
      d3.select(domNode).attr('class', 'node');
      // now restore the mouseover event or we won't be able to drag a 2nd time
      d3.select(domNode).select('.ghostCircle').attr('pointer-events', '');
      updateTempConnector();
      if (draggingNode !== null) {
        // centerNode(draggingNode);
        update(data);
        draggingNode = null;
      }
    };

    var centerNode = function(source) {
        scale = zoomListener.scale();
        var x = -source.y0;
        var y = -source.x0;
        x = x * scale + width / 2;
        y = y * scale + height / 2;
        d3.select('g').transition()
          .duration(duration)
          .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
        zoomListener.scale(scale);
        zoomListener.translate([x, y]);
    }

    var expand = function(d) {
      if (d._children) {
        d.children = d._children;
        d.children.forEach(expand);
        d._children = null;
      }
    };

    var pan = function(domNode, direction) {
      var speed = panSpeed;
      if (panTimer) {
        clearTimeout(panTimer);
        translateCoords = d3.transform(svgGroup.attr("transform"));
        if (direction == 'left' || direction == 'right') {
          translateX = direction == 'left' ? translateCoords.translate[0] + speed : translateCoords.translate[0] - speed;
          translateY = translateCoords.translate[1];
        } else if (direction == 'up' || direction == 'down') {
          translateX = translateCoords.translate[0];
          translateY = direction == 'up' ? translateCoords.translate[1] + speed : translateCoords.translate[1] - speed;
        }
        scaleX = translateCoords.scale[0];
        scaleY = translateCoords.scale[1];
        scale = zoomListener.scale();
        svgGroup.transition().attr("transform", "translate(" + translateX + "," + translateY + ")scale(" + scale + ")");
        d3.select(domNode).select('g.node').attr("transform", "translate(" + translateX + "," + translateY + ")");
        zoomListener.scale(zoomListener.scale());
        zoomListener.translate([translateX, translateY]);
        panTimer = setTimeout(function() {
          pan(domNode, speed, direction);
        }, 50);
      }
    }

    var overCircle = function(d) {
        selectedNode = d;
        updateTempConnector();
    };
    var outCircle = function(d) {
        selectedNode = null;
        updateTempConnector();
    };

    var updateTempConnector = function() {
      var data = [];
      if (draggingNode !== null && selectedNode !== null) {
        // have to flip the source coordinates since we did this for the existing connectors on the original tree
        data = [{
          source: {
            x: selectedNode.x0,
            y: selectedNode.y0
          },
          target: {
            x: draggingNode.x0,
            y: draggingNode.y0
          }
        }];
      }
      var link = svgGroup.selectAll(".templink").data(data);

      link.enter().append("path")
        .attr("class", "templink")
        .attr("d", d3.svg.diagonal())
        .attr('pointer-events', 'none');

      link.attr("d", d3.svg.diagonal());

      link.exit().remove();
    };

    var ui = {
      layerHeight: 100,
      circle: {
        type: 'circle',
        radius: 20
      }
    };

    var update = function(source) {
      nodes = tree.nodes(data).reverse();
      links = tree.links(nodes);
      nodes.forEach(function(d) {
        d.y = (d.depth + 1) * ui.layerHeight;
      });

      var node = svg.selectAll("g.node").data(nodes, function(d) {
        return d.id || (d.id = ++i);
      });

      var nodeEnter = node.enter().append("g")
        .call(dragListener)
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

      nodeEnter.append("circle")
        .attr('class', 'ghostCircle')
        .attr("r", ui.circle.radius)
        .attr("opacity", 0.2) // change this to zero to hide the target area
        .style("fill", "red")
        .attr('pointer-events', 'mouseover')
        .on("mouseover", function(node) {
          overCircle(node);
        })
        .on("mouseout", function(node) {
          outCircle(node);
        });

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

    // Define the drag listeners for drag/drop behaviour of nodes.
    // variables for drag/drop
    var selectedNode = null;
    var draggingNode = null;
    var domNode;
    var dragStarted;
    var dragListener = d3.behavior.drag()
      .on("dragstart", function(d) {
        if (d == data) {
          return;
        }
        dragStarted = true;
        var nodes = tree.nodes(d);
        d3.event.sourceEvent.stopPropagation();
        // it's important that we suppress the mouseover event on the node being dragged. Otherwise it will absorb the mouseover event and the underlying node will not detect it d3.select(this).attr('pointer-events', 'none');
      })
      .on("drag", function(d) {
        if (d == data) {
          return;
        }
        if (dragStarted) {
          domNode = this;
          initiateDrag(d, domNode);
        }

        // get coords of mouseEvent relative to svg container to allow for panning
        var relCoords = d3.mouse($('svg').get(0));
        if (relCoords[0] < panBoundary) {
          panTimer = true;
          pan(this, 'left');
        } else if (relCoords[0] > ($('svg').width() - panBoundary)) {

          panTimer = true;
          pan(this, 'right');
        } else if (relCoords[1] < panBoundary) {
          panTimer = true;
          pan(this, 'up');
        } else if (relCoords[1] > ($('svg').height() - panBoundary)) {
          panTimer = true;
          pan(this, 'down');
        } else {
          try {
            clearTimeout(panTimer);
          } catch (e) {

          }
        }

        d.x0 += d3.event.dy;
        d.y0 += d3.event.dx;
        var node = d3.select(this);
        node.attr("transform", "translate(" + d.y0 + "," + d.x0 + ")");
        updateTempConnector();
      }).on("dragend", function(d) {
        if (d == data) {
          return;
        }
        domNode = this;
        if (selectedNode) {
          // now remove the element from the parent, and insert it into the new elements children
          var index = draggingNode.parent.children.indexOf(draggingNode);
          if (index > -1) {
            draggingNode.parent.children.splice(index, 1);
          }
          if (typeof selectedNode.children !== 'undefined' && typeof selectedNode._children !== 'undefined') {
            if (typeof selectedNode.children !== 'undefined') {
              selectedNode.children.push(draggingNode);
            } else {
              selectedNode._children.push(draggingNode);
            }
          } else {
            selectedNode.children = [];
            selectedNode.children.push(draggingNode);
          }
          // Make sure that the node being added to is expanded so user can see added node is correctly moved
          expand(selectedNode);
          // sortTree();
          endDrag();
        } else {
          endDrag();
        }
      });

    data.children.forEach(collapse);
    update(data);

  }.on('didInsertElement')
});