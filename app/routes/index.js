import Ember from 'ember';

export default Ember.Route.extend({
  model() {
    var treeData = [];
    return this.store.findAll('employee').then(function(data) {
      var nodes = [];
      data.forEach(function(d) {
        nodes.push({
          id: d.id,
          name: d.get('firstName') + ' ' + d.get('lastName'),
          phone: d.get('phone'),
          parent: d.get('supervisor')
        });
      });

      var dataMap = nodes.reduce(function(map, node) {
        map[node.id] = node;
        return map;
      }, {});

      nodes.forEach(function(node) {
        var parent = dataMap[node.parent];
        if (parent) {
          (parent.children || (parent.children = [])).push(node);
        } else { // parent is null or missing
          treeData.push(node);
        }
      });

      return treeData[0];
    });
  }
});