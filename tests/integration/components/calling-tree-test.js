import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('calling-tree', 'Integration | Component | calling tree', {
  integration: true
});

test('it renders', function(assert) {
  assert.expect(5);

  this.set('width', 800);
  this.set('height', 800);
  this.set('data', { name: 'Root', phone: 3345, children: [{ name: 'First Child', phone: 3453 }] });

  this.render(hbs`{{calling-tree width=width height=height data=data}}`);

  assert.equal(this.$('svg').attr('width'), '800', 'width is configured');
  assert.equal(this.$('svg').attr('height'), '800', 'height is configured');
  assert.equal(this.$('g.node > circle').length, 2, '2 nodes should be rendered');

  // Tree is reversely rendered
  assert.equal(this.$($('g.node > text')[0]).text().trim(), 'First Child');
  assert.equal(this.$($('g.node > text')[1]).text().trim(), 'Root');
});
